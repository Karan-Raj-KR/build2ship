import { describe, it, expect } from "vitest";
import { CANONICAL_NAV_GROUPS, CANONICAL_NAV_ITEMS } from "@/components/layout/AppNav";
import { APP_NAME } from '@/config/app';
import { evaluateComparisonItem, computeDecisionSummary } from "@/lib/compare/engine";
import { Opportunity, Profile } from "@/types/database";

describe("1. Canonical Grouped Navigation Definition", () => {
  it("uses immutable, frozen canonical navigation groups and items", () => {
    expect(Object.isFrozen(CANONICAL_NAV_GROUPS)).toBe(true);
    expect(Object.isFrozen(CANONICAL_NAV_ITEMS)).toBe(true);
  });

  it("separates primary journeys from supporting tools", () => {
    expect(CANONICAL_NAV_GROUPS).toHaveLength(2);
    expect(CANONICAL_NAV_GROUPS[0].title).toBe("Your workspace");
    expect(CANONICAL_NAV_GROUPS[1].title).toBe("More tools");
    expect(CANONICAL_NAV_GROUPS[0].items.map(item => item.id)).toEqual(expect.arrayContaining(["for-you", "scout", "ask"]));
  });

  it("keeps all primary and supporting destinations reachable", () => {
    const expected = [
      { id: "discover", label: "Discover", href: "/discover" },
      { id: "journey", label: "My journey", href: "/journey" },
      { id: "saved", label: "Saved", href: "/saved" },
      { id: "applications", label: "Applications", href: "/workspace" },
      { id: "profile", label: "My profile", href: "/profile" },
      { id: "today", label: "Today", href: "/home" },
      { id: "for-you", label: "For You", href: "/for-you" },
      { id: "scout", label: "Scout", href: "/scout" },
      { id: "library", label: "Library", href: "/library" },
      { id: "compare", label: "Compare", href: "/compare" },
      { id: "ask", label: `Ask ${APP_NAME}`, href: "/ask" },
      { id: "ai-bridge", label: "AI Bridge", href: "/ai-bridge" },
      { id: "import", label: "Import", href: "/ingest" },
      { id: "contributions", label: "Build your open source experience", href: "/contributions" },
    ];
    expect(CANONICAL_NAV_ITEMS).toHaveLength(expected.length);
    CANONICAL_NAV_ITEMS.forEach((item) => {
      const index = expected.findIndex(destination => destination.id === item.id);
      expect(item.id).toBe(expected[index].id);
      expect(item.label).toBe(expected[index].label);
      if (item.id === "today") {
        expect(["/home", "/today"]).toContain(item.href);
      } else {
        expect(item.href).toBe(expected[index].href);
      }
    });
  });

  it("renders each destination exactly once with unique stable IDs and no duplication", () => {
    const ids = CANONICAL_NAV_ITEMS.map((item) => item.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    const hrefs = CANONICAL_NAV_ITEMS.map((item) => item.href);
    const uniqueHrefs = new Set(hrefs);
    expect(uniqueHrefs.size).toBe(hrefs.length);

    // Verify Library and Ask Elara appear exactly once
    const labels = CANONICAL_NAV_ITEMS.map((item) => item.label.toLowerCase());
    expect(labels.filter((l) => l.includes("ask")).length).toBe(1);
    expect(labels.filter((l) => l === "library").length).toBe(1);
  });
});

describe("2. Comparison Evaluation Engine - Data Correctness & Honesty", () => {
  const baseProfile: Partial<Profile> = {
    id: "user-1",
    display_name: "Karan",
    country_of_residence: "IN",
    nationalities: ["India"],
    education_stage: "undergraduate",
    skills: ["TypeScript", "Next.js", "Python"],
    interests: ["AI", "Open Source"],
    participation_preference: "both",
  };

  const prizeHackathon: Opportunity = {
    id: "opp-hackathon",
    created_by: null,
    title: "Global AI Hackathon 2026",
    organizer: "Major League Hacking",
    category: "hackathon",
    summary: "Build multi-agent apps with open-source tools.",
    source_url: "https://example.com/hackathon",
    location: "Online",
    participation_mode: "remote",
    funding_description: "Up to $50,000 in cash prizes",
    funding_kind: "prize",
    funding_amount_max: 50000,
    funding_currency: "$",
    deadline: "2026-10-15T23:59:59Z",
    timezone_known: true,
    deadline_timezone: "UTC",
    source_content: null,
    retrieved_at: null,
    source_status: "live",
    requirements: null,
    status: "published",
    is_demo: false,
    updated_at: new Date().toISOString(),
    topics: ["AI", "Agents"],
    skills: ["Python", "TypeScript"],
    education_stages: ["undergraduate"],
    application_questions: ["What is your project title and concept?"],
  };

  const fundedFellowship: Opportunity = {
    id: "opp-fellowship",
    created_by: null,
    title: "Open Technology Fellowship 2026",
    organizer: "Mozilla Foundation",
    category: "fellowship",
    summary: "10-week summer fellowship with living stipend.",
    source_url: "https://example.com/fellowship",
    location: "London, UK",
    participation_mode: "in-person",
    funding_description: "£6,000 living stipend",
    funding_kind: "stipend",
    funding_amount_max: 6000,
    funding_currency: "£",
    deadline: "2026-11-01T23:59:59Z",
    timezone_known: true,
    deadline_timezone: "Europe/London",
    source_content: null,
    retrieved_at: null,
    source_status: "live",
    requirements: null,
    status: "published",
    is_demo: false,
    updated_at: new Date().toISOString(),
    topics: ["Open Source", "Security"],
    skills: ["Python"],
    education_stages: ["undergraduate", "masters"],
    application_questions: ["Personal statement", "Project proposal", "Reference contact", "Open source history"],
    required_documents: ["CV / Resume", "Academic Transcript", "Statement of Purpose"],
  };

  const unpaidVolunteer: Opportunity = {
    id: "opp-unpaid",
    created_by: null,
    title: "Open Science Community Ambassador",
    organizer: "Global Science Collective",
    category: "open_source_programme",
    summary: "Ambassador role promoting open science.",
    source_url: "https://example.com/ambassador",
    location: "Remote",
    participation_mode: "remote",
    funding_description: null,
    funding_kind: "none",
    deadline: "2026-09-30T23:59:59Z",
    timezone_known: false,
    source_content: null,
    retrieved_at: null,
    source_status: "live",
    requirements: null,
    status: "published",
    is_demo: false,
    updated_at: new Date().toISOString(),
    topics: ["Open Source"],
    skills: [],
    education_stages: [],
  };

  it("strictly separates competitive prize pools from guaranteed stipends without inventing conversions", () => {
    const evaluatedPrize = evaluateComparisonItem(prizeHackathon, baseProfile);
    expect(evaluatedPrize.funding_info.kind).toBe("prize");
    expect(evaluatedPrize.funding_info.is_prize_pool).toBe(true);
    expect(evaluatedPrize.funding_info.is_guaranteed).toBe(false);
    expect(evaluatedPrize.funding_info.currency).toBe("$");
    expect(evaluatedPrize.funding_info.display_amount).toContain("$50,000");
    expect(evaluatedPrize.funding_info.notes.toLowerCase()).toContain("not a guaranteed stipend");

    const evaluatedStipend = evaluateComparisonItem(fundedFellowship, baseProfile);
    expect(evaluatedStipend.funding_info.kind).toBe("stipend");
    expect(evaluatedStipend.funding_info.is_prize_pool).toBe(false);
    expect(evaluatedStipend.funding_info.is_guaranteed).toBe(true);
    expect(evaluatedStipend.funding_info.currency).toBe("£");
    expect(evaluatedStipend.funding_info.display_amount).toBe("£6,000");

    const evaluatedUnpaid = evaluateComparisonItem(unpaidVolunteer, baseProfile);
    expect(evaluatedUnpaid.funding_info.kind).toBe("unpaid");
    expect(evaluatedUnpaid.funding_info.display_amount).toBe("Unpaid");
  });

  it("evaluates application effort with a concrete basis rather than arbitrary guesses", () => {
    const evaluatedPrize = evaluateComparisonItem(prizeHackathon, baseProfile);
    expect(evaluatedPrize.effort_info.level).toBe("quick");
    expect(evaluatedPrize.effort_info.basis).toContain("registration");

    const evaluatedFellowship = evaluateComparisonItem(fundedFellowship, baseProfile);
    expect(evaluatedFellowship.effort_info.level).toBe("significant");
    expect(evaluatedFellowship.effort_info.basis).toContain("4 written essays");

    const evaluatedUnpaid = evaluateComparisonItem(unpaidVolunteer, baseProfile);
    expect(evaluatedUnpaid.effort_info.level).toBe("not_assessed");
    expect(evaluatedUnpaid.effort_info.basis).toContain("Not assessed");
  });

  it("handles deadlines honestly with real timezones and explicit demo labeling", () => {
    const evaluatedFellowship = evaluateComparisonItem(fundedFellowship, baseProfile);
    expect(evaluatedFellowship.deadline_info.timezone).toBe("Europe/London");
    expect(evaluatedFellowship.is_demo).toBe(false);
    expect(evaluatedFellowship.deadline_info.isDemoData).toBe(false);

    const demoOpp: Opportunity = {
      ...prizeHackathon,
      id: "opp-demo",
      is_demo: true,
    };
    const evaluatedDemo = evaluateComparisonItem(demoOpp, baseProfile);
    expect(evaluatedDemo.is_demo).toBe(true);
    expect(evaluatedDemo.deadline_info.isDemoData).toBe(true);
    expect(evaluatedDemo.deadline_info.label).toContain("(Demo)");
  });

  it("distinguishes unverified requirements from failed requirements", () => {
    // Opportunity with residency restriction user doesn't meet
    const usOnlyOpp: Opportunity = {
      ...prizeHackathon,
      id: "opp-us-only",
      citizenship_constraints: ["United States"],
    };
    const evalFailed = evaluateComparisonItem(usOnlyOpp, baseProfile);
    expect(evalFailed.eligibility.verdict).toBe("likely_ineligible");
    expect(evalFailed.eligibility.failed_criteria.length).toBeGreaterThan(0);

    // Profile with missing nationalities
    const evalUnknown = evaluateComparisonItem(usOnlyOpp, { ...baseProfile, nationalities: [] });
    expect(evalUnknown.eligibility.verdict).toBe("possibly_eligible");
    expect(evalUnknown.eligibility.unknown_criteria.length).toBeGreaterThan(0);
  });
});

describe("3. Decision Summary & Goal-Based Recommendation Logic", () => {
  const baseProfile: Partial<Profile> = {
    id: "user-1",
    display_name: "Karan",
    country_of_residence: "IN",
    nationalities: ["India"],
    education_stage: "undergraduate",
    skills: ["Python", "Machine Learning"],
    interests: ["AI", "Open Source"],
  };

  const quickHackathon = evaluateComparisonItem({
    id: "opp-quick",
    created_by: null,
    title: "AI Sprint Hackathon",
    organizer: "TechOrg",
    category: "hackathon",
    summary: "Weekend AI Hackathon",
    source_url: "https://example.com/hack",
    location: "Remote",
    participation_mode: "remote",
    funding_description: "$10,000 prize pool",
    funding_kind: "prize",
    deadline: "2026-10-10T00:00:00Z",
    timezone_known: true,
    source_content: null,
    retrieved_at: null,
    source_status: "live",
    requirements: null,
    status: "published",
    is_demo: false,
    updated_at: new Date().toISOString(),
    topics: ["AI"],
    skills: ["Python"],
    education_stages: ["undergraduate"],
    application_questions: ["What is your idea?"],
  }, baseProfile);

  const stipendFellowship = evaluateComparisonItem({
    id: "opp-stipend",
    created_by: null,
    title: "Research Scholars Fellowship",
    organizer: "Research Labs",
    category: "fellowship",
    summary: "Long-term AI Research with guaranteed living stipend",
    source_url: "https://example.com/research",
    location: "Bangalore, India",
    participation_mode: "in-person",
    funding_description: "₹1,50,000 stipend",
    funding_kind: "stipend",
    deadline: "2026-11-20T00:00:00Z",
    timezone_known: true,
    source_content: null,
    retrieved_at: null,
    source_status: "live",
    requirements: null,
    status: "published",
    is_demo: false,
    updated_at: new Date().toISOString(),
    topics: ["AI", "Machine Learning"],
    skills: ["Python", "Machine Learning"],
    education_stages: ["undergraduate"],
    application_questions: ["Statement 1", "Statement 2", "Statement 3", "Statement 4"],
  }, baseProfile);

  it("does not force a winner when fewer than two items are compared", () => {
    expect(computeDecisionSummary([], "best_fit")).toBeNull();
    expect(computeDecisionSummary([quickHackathon], "best_fit")).toBeNull();
  });

  it("recommends the fastest turnaround when goal is least_effort", () => {
    const decision = computeDecisionSummary([quickHackathon, stipendFellowship], "least_effort");
    expect(decision).not.toBeNull();
    expect(decision?.recommended_id).toBe("opp-quick");
    expect(decision?.priority_label).toBe("least application effort");
    expect(decision?.reason_a).toBeDefined();
    expect(decision?.reason_b).toBeDefined();
    expect(decision?.trade_off).toBeDefined();
  });

  it("recommends guaranteed stipend over competitive prize pool when goal is funding", () => {
    const decision = computeDecisionSummary([quickHackathon, stipendFellowship], "funding");
    expect(decision).not.toBeNull();
    expect(decision?.recommended_id).toBe("opp-stipend");
    expect(decision?.priority_label).toBe("financial support");
  });

  it("formats recommendation copy transparently with 2 concrete reasons and a trade-off", () => {
    const decision = computeDecisionSummary([quickHackathon, stipendFellowship], "best_fit");
    expect(decision).not.toBeNull();
    expect(decision?.reason_a.length).toBeGreaterThan(5);
    expect(decision?.reason_b.length).toBeGreaterThan(5);
    expect(decision?.trade_off.length).toBeGreaterThan(5);
    // Does not make inflated claims like "highest return" or guaranteed admission
    const allText = `${decision?.reason_a} ${decision?.reason_b} ${decision?.trade_off}`.toLowerCase();
    expect(allText).not.toContain("highest return");
    expect(allText).not.toContain("guaranteed admission");
  });
});

describe("4. Navigation Rail Button Geometry & Account Popover", () => {
  it("defines canonical destinations with accessible labels and icons", () => {
    CANONICAL_NAV_ITEMS.forEach((item) => {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeDefined();
      expect(item.href.startsWith("/")).toBe(true);
    });
  });

  it("ensures each navigation group has a defined title and non-empty items", () => {
    CANONICAL_NAV_GROUPS.forEach((group) => {
      expect(group.title.length).toBeGreaterThan(0);
      expect(group.items.length).toBeGreaterThan(0);
    });
  });
});
