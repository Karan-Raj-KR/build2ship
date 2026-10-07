import { describe, it, expect } from "vitest";
import { resolveSourceConflict } from "@/opportunity-sources/ingestion/engine";
import { checkDuplicateOpportunity, normalizeTitleForComparison } from "@/opportunity-sources/dedupe/deduplicator";
import { mergeOpportunities } from "@/lib/admin/store";
import type { Opportunity } from "@/types/database";
import type { RawOpportunityCandidate } from "@/opportunity-sources/types";

describe("Opportunity Deduplication and Conflict Resolution", () => {
  const existingOfficialOpp: Opportunity = {
    id: "gsoc-2026",
    title: "Google Summer of Code 2026",
    organizer: "Google",
    category: "internship",
    deadline: "2026-04-08T18:00:00Z",
    deadline_timezone: "UTC",
    funding_description: "Stipend ($3,000 - $6,600 USD)",
    funding_amount_min: 3000,
    funding_amount_max: 6600,
    source_label: "curated",
    source_type: "curated",
    summary: "Official Google Summer of Code program details.",
    benefits: ["Stipend", "Global Mentorship"],
    eligible_countries: ["GLOBAL"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as Opportunity;

  it("prioritizes official source fields when conflicting aggregator data arrives", () => {
    // Inaccurate aggregator candidate with wrong deadline and lower stipend
    const aggregatorCandidate: RawOpportunityCandidate = {
      title: "Google Summer of Code",
      organizer: "Google LLC",
      source_type: "search_provider",
      deadline: "2026-03-31T00:00:00Z", // Wrong deadline
      funding_amount: 1500, // Inaccurate amount
      funding_description: "$1,500 stipend",
      summary: "Aggregator scraped summary",
    };

    // Incoming candidate is an aggregator (incomingIsOfficial = false)
    const resolved = resolveSourceConflict(existingOfficialOpp, aggregatorCandidate, false);

    // Official data must be preserved!
    expect(resolved.deadline).toBe("2026-04-08T18:00:00Z");
    expect(resolved.funding_amount_min).toBe(3000);
    expect(resolved.title).toBe("Google Summer of Code 2026");
  });

  it("updates existing records when an official source provides fresh verified information", () => {
    const freshOfficialUpdate: RawOpportunityCandidate = {
      title: "Google Summer of Code 2026 — Expanded Contributor Track",
      organizer: "Google Open Source",
      source_type: "official_feed",
      deadline: "2026-04-10T18:00:00Z", // Extended deadline confirmed by official source
      funding_amount: 3500,
      benefits: ["Increased Stipend ($3,500 - $7,000 USD)", "Global Mentorship", "Certificate of Completion"],
      eligible_countries: ["GLOBAL"],
    };

    // Incoming candidate is official (incomingIsOfficial = true)
    const resolved = resolveSourceConflict(existingOfficialOpp, freshOfficialUpdate, true);

    expect(resolved.title).toBe("Google Summer of Code 2026 — Expanded Contributor Track");
    expect(resolved.deadline).toBe("2026-04-10T18:00:00Z");
    expect(resolved.benefits).toContain("Certificate of Completion");
  });

  it("normalizes and flags duplicate opportunities across sources", () => {
    expect(normalizeTitleForComparison("Google Summer of Code 2026!")).toBe("google summer of code");

    const duplicateCandidate = {
      title: "Google Summer of Code 2026",
      organizer: "Google",
      official_url: "https://summerofcode.withgoogle.com",
    };

    const match = checkDuplicateOpportunity(duplicateCandidate, [existingOfficialOpp]);
    expect(match.isDuplicate).toBe(true);
    expect(match.matchedOpportunityId).toBe("gsoc-2026");
  });

  it("holds merges to preserve existing application work", async () => {
    await expect(mergeOpportunities(
      "gsoc-2026",
      "duplicate-opp-id-123",
      "admin-test-id",
      "admin@opportunityos.local"
    )).rejects.toThrow("Merge is disabled");
  });
});
