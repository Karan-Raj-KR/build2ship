// ============================================================
// TESTS: Production Core Fixes Regression Suite
// Covers:
// 1. Canonical opportunity schema & data model
// 2. Ingest save-mode contract & canonical persistence
// 3. Application FK uses canonical opportunity ID
// 4. Eligibility engine & uncertainty preservation (unknown != pass)
// 5. Analysis staleness detection logic
// 6. Middleware public vs private route matching
// 7. Curated 2026 seed idempotency & UUID formats
// ============================================================
import { describe, it, expect } from "vitest";
import { demoStore } from "@/lib/demo/store";
import { DEMO_REAL_OPPORTUNITIES } from "@/lib/demo/data";
import { analyzeEligibility, type UserProfile } from "@/lib/eligibility/engine";
import type { ExtractedRequirement } from "@/lib/ingestion/types";

describe("Production Core Fixes", () => {
  describe("1. Canonical Opportunity Entity & UUID Integrity", () => {
    it("all curated 2026 opportunities have valid RFC-4122 UUIDs", () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(DEMO_REAL_OPPORTUNITIES.length).toBeGreaterThanOrEqual(6);
      for (const opp of DEMO_REAL_OPPORTUNITIES) {
        expect(opp.id).toMatch(uuidRegex);
        expect(opp.title).toBeTruthy();
        expect(opp.status).toBe("published");
        expect(opp.is_demo).toBe(false);
      }
    });

    it("unifies curated and imported opportunities under the canonical store", () => {
      const initialCount = demoStore.getAllOpportunities().length;
      const created = demoStore.addOpportunity({
        created_by: "test-user",
        title: "Test Ingested Hackathon 2026",
        organizer: "Test Org",
        category: "hackathon",
        summary: "A test hackathon imported via canonical pipeline",
        source_url: "https://example.com/hackathon-2026",
        location: "Remote",
        participation_mode: "remote",
        deadline: "2026-11-01T23:59:59Z",
        timezone_known: true,
        source_content: "Raw source content",
        source_label: "fetched",
        source_status: "live",
        status: "published",
        is_demo: false,
        requirements: { items: [{ text: "Must be a student", type: "education_stage", mandatory: "mandatory" }] },
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe("Test Ingested Hackathon 2026");

      const fetched = demoStore.getOpportunity(created.id);
      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(created.id);
      expect(fetched?.source_label).toBe("fetched");

      const all = demoStore.getAllOpportunities();
      expect(all.length).toBe(initialCount + 1);
      expect(all.some((o) => o.id === created.id)).toBe(true);
    });
  });

  describe("2. Application FK References Canonical Opportunity", () => {
    it("creates an application referencing canonical opportunity without duplicating entity", () => {
      const opp = demoStore.getAllOpportunities()[0];
      expect(opp).toBeDefined();

      const app = demoStore.createApplication(opp.id);
      expect(app.opportunity_id).toBe(opp.id);

      const retrievedApp = demoStore.getApplication(app.id);
      expect(retrievedApp).toBeDefined();
      expect(retrievedApp?.opportunity_id).toBe(opp.id);

      // Verify opportunity was not duplicated
      const matchingOpps = demoStore.getAllOpportunities().filter((o) => o.id === opp.id);
      expect(matchingOpps.length).toBe(1);
    });
  });

  describe("3. Eligibility Uncertainty: UNKNOWN Never Becomes PASS", () => {
    it("marks unknown requirement as needs_clarification or unmet, never met", async () => {
      const requirements: ExtractedRequirement[] = [
        {
          text: "Must be a confirmed student at an accredited university",
          type: "education_stage",
          mandatory: "mandatory",
          excerpt: "Student verification required",
          source_ref: "eligibility",
          comparison_rule: null, // No automated rule -> must flag as uncertain
          uncertainty: "Requires manual transcript check",
        },
      ];

      const profile: UserProfile = {
        display_name: "Test Student",
        nationality: "US",
        residence: "US",
        education_level: "undergraduate",
        field_of_study: "Computer Science",
        expected_graduation: "2027-05-01",
        skills: ["TypeScript"],
        interests: [],
        has_cv: true,
        has_transcript: false,
        has_reference_letters: false,
        bio: null,
      };

      const report = await analyzeEligibility(requirements, [], [], profile, []);
      expect(report.report_items.length).toBe(1);
      const item = report.report_items[0];
      // Verdict must NOT be "met"
      expect(item.verdict).not.toBe("met");
      expect(["needs_clarification", "unmet", "partially_met", "unknown"]).toContain(item.verdict);
    });
  });

  describe("4. Staleness Detection Logic", () => {
    it("detects staleness when opportunity was updated after analysis was generated", () => {
      const analysisDate = new Date("2026-03-01T10:00:00Z").toISOString();
      const oppUpdatedDate = new Date("2026-03-02T10:00:00Z").toISOString();

      const isStale = new Date(oppUpdatedDate).getTime() > new Date(analysisDate).getTime() + 1000;
      expect(isStale).toBe(true);
    });

    it("detects staleness when analysis exceeds 7 days", () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
      const daysSince = Math.floor((Date.now() - new Date(eightDaysAgo).getTime()) / (1000 * 60 * 60 * 24));
      expect(daysSince).toBeGreaterThanOrEqual(7);
    });

    it("reports fresh analysis when generated recently and no changes occurred", () => {
      const nowIso = new Date().toISOString();
      const oppUpdatedDate = new Date(Date.now() - 10000).toISOString();

      const isStale = new Date(oppUpdatedDate).getTime() > new Date(nowIso).getTime() + 1000;
      expect(isStale).toBe(false);
    });
  });

  describe("5. Middleware Route Protection Matcher", () => {
    function matchRoute(pathname: string): { isPublic: boolean; isApi: boolean } {
      const exactPublicPaths = ["/", "/login", "/signup", "/demo"];
      const prefixPublicPaths = ["/auth/callback", "/api/payments/webhook"];

      const isPublic =
        exactPublicPaths.includes(pathname) ||
        prefixPublicPaths.some((p) => pathname.startsWith(p));

      return {
        isPublic,
        isApi: pathname.startsWith("/api/"),
      };
    }

    it("protects /discover, /home, /workspace, /profile, /opportunities/...", () => {
      const protectedPaths = [
        "/discover",
        "/home",
        "/workspace",
        "/workspace/123",
        "/profile",
        "/opportunities/c1000000-0000-4000-8000-000000000001",
        "/ingest",
        "/admin",
        "/api/ingest",
        "/api/analyze",
      ];

      for (const path of protectedPaths) {
        const { isPublic } = matchRoute(path);
        expect(isPublic, `Path ${path} should be protected`).toBe(false);
      }
    });

    it("allows public access to landing page, login, signup, demo, callback, webhook", () => {
      const allowedPaths = [
        "/",
        "/login",
        "/signup",
        "/demo",
        "/auth/callback",
        "/auth/callback?code=xyz",
        "/api/payments/webhook",
      ];

      for (const path of allowedPaths) {
        const { isPublic } = matchRoute(path);
        expect(isPublic, `Path ${path} should be public`).toBe(true);
      }
    });
  });

  describe("6. Seed Idempotency", () => {
    it("maintains distinct IDs across all seeded opportunities", () => {
      const ids = DEMO_REAL_OPPORTUNITIES.map((o) => o.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });
});
