import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rankAndExplainOpportunities } from "@/lib/scout/engine";
import { fetchUserNotifications, createUserNotification } from "@/lib/notifications/inbox";
import { SavedSearch, Opportunity, Profile } from "@/types/database";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/db/server", () => ({ createClient: mocks.createClient }));

const userId = "recurring-test-user";
const savedSearch: SavedSearch = {
  id: "saved-search-1",
  user_id: userId,
  name: "AI Internships Abroad",
  query_text: "AI internships international funded",
  structured_query: {
    categories: ["internship"],
    topics: ["ai"],
    paid_only: true,
  },
  notify_new_matches: true,
  created_at: "2026-09-16T12:00:00Z",
};
const profile: Partial<Profile> = {
  id: userId,
  field_of_study: "Computer Science",
  skills: ["Python", "Git", "Machine Learning"],
  interests: ["Open Source", "Software"],
  education_stage: "undergraduate",
};
const opportunity: Opportunity = {
  id: "internship-1",
  created_by: null,
  title: "AI Open Source Software Internship",
  organizer: "Research Institute",
  category: "internship",
  summary: "Paid Python and Machine Learning research internship",
  source_url: null,
  location: "Remote",
  participation_mode: "remote",
  funding_description: "Paid stipend",
  funding_kind: "stipend",
  deadline: "2026-10-16T12:00:00Z",
  timezone_known: true,
  source_content: null,
  retrieved_at: "2026-09-16T12:00:00Z",
  source_status: "live",
  requirements: null,
  status: "published",
  is_demo: false,
  updated_at: "2026-09-16T12:00:00Z",
  topics: ["ai", "Open Source", "Software"],
  skills: ["Python", "Git", "Machine Learning"],
  education_stages: ["undergraduate"],
};

function queryResult(data: unknown, error: unknown = null) {
  const result = Promise.resolve({ data, error });
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: result.then.bind(result),
  };
  mocks.from.mockReturnValueOnce(query);
  return query;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
  mocks.createClient.mockResolvedValue({ from: mocks.from });
});

afterEach(() => {
  vi.useRealTimers();
});

it('matches onboarding interest labels against actual catalogue topics', () => {
  const result = rankAndExplainOpportunities([opportunity], profile, { topics: ['AI & software'] });
  expect(result.rankedItems.map(item => item.opportunity.id)).toContain(opportunity.id);
});

describe("Saved Searches & Recurring Scout Infrastructure", () => {
  it("evaluates an ordinary saved-query fixture without seeding opportunities", () => {
    const empty = rankAndExplainOpportunities([], profile, savedSearch.structured_query);
    expect(empty.totalEvaluated).toBe(0);
    expect(empty.rankedItems).toEqual([]);
    const ranking = rankAndExplainOpportunities([opportunity], profile, savedSearch.structured_query);
    expect(ranking.totalEvaluated).toBe(1);
    expect(ranking.rankedItems[0].opportunity.id).toBe(opportunity.id);
  });

  it("discovers high matches and deduplicates only persisted database alerts", async () => {
    const ranking = rankAndExplainOpportunities([opportunity], profile, savedSearch.structured_query);
    const highMatches = ranking.rankedItems.filter(
      (item) => item.explanation.match_tier === "exceptional" || item.explanation.match_tier === "strong"
    );
    expect(highMatches).toHaveLength(1);
    const topOpp = highMatches[0].opportunity;

    const read = queryResult([]);
    const existing = await fetchUserNotifications(userId);
    expect(existing).toEqual([]);
    expect(read.eq).toHaveBeenCalledWith("user_id", userId);

    const payload = {
      title: `New Match: ${topOpp.title}`,
      message: "Scout found a match!",
      type: "new_match" as const,
      metadata: { opportunity_id: topOpp.id, saved_search_id: savedSearch.id },
    };
    const persisted = { ...payload, id: "notification-1", user_id: userId, is_read: false, created_at: new Date().toISOString() };
    const insert = queryResult(persisted);
    expect(await createUserNotification(userId, payload)).toEqual(persisted);
    expect(insert.insert).toHaveBeenCalledWith({ ...payload, user_id: userId, is_read: false, link_url: null });

    queryResult([persisted]);
    const updated = await fetchUserNotifications(userId);
    expect(updated.some((n) => n.metadata?.opportunity_id === topOpp.id)).toBe(true);
    expect(mocks.from.mock.calls).toEqual(Array.from({ length: 3 }, () => ["user_notifications"]));
  });

  it("does not create a local recurring alert after a failed database insert", async () => {
    queryResult(null, { code: "42P01", message: "Missing table" });
    await expect(createUserNotification(userId, {
      title: "New Match",
      message: "Scout found a match!",
      type: "new_match",
      metadata: { opportunity_id: opportunity.id },
    })).rejects.toThrow("Failed to create notification");
    queryResult([]);
    expect(await fetchUserNotifications(userId)).toEqual([]);
  });

  it("does not substitute seeded alerts when the deduplication read fails", async () => {
    queryResult(null, { code: "PGRST205", message: "Missing table" });
    await expect(fetchUserNotifications(userId)).rejects.toThrow("Failed to fetch notifications");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});
