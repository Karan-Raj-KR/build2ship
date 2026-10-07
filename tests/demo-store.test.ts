// ============================================================
// TESTS — Demo store ownership and data integrity
// ============================================================
import { describe, it, expect } from "vitest";
import { demoStore } from "@/lib/demo/store";

describe("Demo Store", () => {
  describe("Profile", () => {
    it("returns a profile with required fields", () => {
      const profile = demoStore.getProfile();
      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.display_name).toBeDefined();
    });

    it("returns a copy (immutable)", () => {
      const profile1 = demoStore.getProfile();
      const profile2 = demoStore.getProfile();
      expect(profile1).not.toBe(profile2);
      expect(profile1).toEqual(profile2);
    });

    it("updates profile fields", () => {
      const original = demoStore.getProfile();
      const updated = demoStore.updateProfile({ display_name: "Updated Name" });
      expect(updated.display_name).toBe("Updated Name");
      expect(updated.id).toBe(original.id);
      // Restore
      demoStore.updateProfile({ display_name: original.display_name });
    });
  });

  describe("Opportunities", () => {
    it("returns demo opportunities", () => {
      const opps = demoStore.getOpportunities();
      expect(opps.length).toBeGreaterThan(0);
    });

    it("returns all opportunities (demo + imported)", () => {
      const allOpps = demoStore.getAllOpportunities();
      expect(allOpps.length).toBeGreaterThanOrEqual(demoStore.getOpportunities().length);
    });

    it("gets opportunity by id", () => {
      const opps = demoStore.getOpportunities();
      const first = opps[0];
      const found = demoStore.getOpportunity(first.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(first.id);
    });

    it("returns null for non-existent opportunity", () => {
      const found = demoStore.getOpportunity("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("Applications", () => {
    it("creates application for opportunity", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      const app = demoStore.createApplication(opp.id);
      expect(app).toBeDefined();
      expect(app.opportunity_id).toBe(opp.id);
      expect(app.stage).toBe("saved");
    });

    it("returns existing application if already exists", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      const app1 = demoStore.createApplication(opp.id);
      const app2 = demoStore.createApplication(opp.id);
      expect(app1.id).toBe(app2.id);
    });

    it("gets application by opportunity id", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      demoStore.createApplication(opp.id);
      const found = demoStore.getApplicationByOpportunity(opp.id);
      expect(found).toBeDefined();
      expect(found?.opportunity_id).toBe(opp.id);
    });

    it("updates application", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      const app = demoStore.createApplication(opp.id);
      const updated = demoStore.updateApplication(app.id, { stage: "preparing" });
      expect(updated?.stage).toBe("preparing");
    });
  });

  describe("Tasks", () => {
    it("creates and retrieves tasks", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      const app = demoStore.createApplication(opp.id);
      const task = demoStore.addTask(app.id, "Write personal statement");
      expect(task).toBeDefined();
      expect(task.title).toBe("Write personal statement");
      expect(task.completed).toBe(false);

      const tasks = demoStore.getTasks(app.id);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it("toggles task completion", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      const app = demoStore.createApplication(opp.id);
      const task = demoStore.addTask(app.id, "Test task");
      const toggled = demoStore.toggleTask(task.id);
      expect(toggled?.completed).toBe(true);
    });
  });

  describe("Answers", () => {
    it("creates and retrieves answers", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      const app = demoStore.createApplication(opp.id);
      const answer = demoStore.upsertAnswer(app.id, "Why this opportunity?", "Draft answer");
      expect(answer).toBeDefined();
      expect(answer?.question).toBe("Why this opportunity?");
      expect(answer?.answer_draft).toBe("Draft answer");

      const answers = demoStore.getAnswers(app.id);
      expect(answers.length).toBeGreaterThan(0);
    });

    it("updates existing answer", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      const app = demoStore.createApplication(opp.id);
      const answer = demoStore.upsertAnswer(app.id, "Question?", "Original");
      const updated = demoStore.upsertAnswer(app.id, "Question?", "Updated", answer?.id);
      expect(updated?.answer_draft).toBe("Updated");
    });
  });

  describe("Imported Opportunities", () => {
    it("adds imported opportunity", () => {
      const count1 = demoStore.getImportedOpportunities().length;
      const imported = demoStore.addImportedOpportunity({
        created_by: "test",
        title: "Test Opportunity",
        organizer: "Test Org",
        category: "hackathon",
        summary: "Test summary",
        location: "Remote",
        participation_mode: "remote",
        deadline: null,
        deadline_timezone: null,
        deadline_timezone_known: false,
        deadline_raw_text: null,
        funding_kind: "none",
        funding_description: "",
        funding_amount_min: null,
        funding_amount_max: null,
        funding_currency: null,
        funding_conditional: false,
        requirements: [],
        application_questions: [],
        required_documents: [],
        application_steps: [],
        source_url: null,
        source_content: "Test content",
        source_label: "user_provided",
        source_status: "unknown",
        extracted_at: new Date().toISOString(),
        status: "published",
        is_demo: false,
      });
      expect(imported).toBeDefined();
      expect(imported.title).toBe("Test Opportunity");
      expect(imported.id).toBeDefined();

      const count2 = demoStore.getImportedOpportunities().length;
      expect(count2).toBe(count1 + 1);
    });

    it("updates imported opportunity", () => {
      const imported = demoStore.addImportedOpportunity({
        created_by: "test",
        title: "To Update",
        organizer: null,
        category: "other",
        summary: "",
        location: null,
        participation_mode: "remote",
        deadline: null,
        deadline_timezone: null,
        deadline_timezone_known: false,
        deadline_raw_text: null,
        funding_kind: "none",
        funding_description: "",
        funding_amount_min: null,
        funding_amount_max: null,
        funding_currency: null,
        funding_conditional: false,
        requirements: [],
        application_questions: [],
        required_documents: [],
        application_steps: [],
        source_url: null,
        source_content: "",
        source_label: "user_provided",
        source_status: "unknown",
        extracted_at: new Date().toISOString(),
        status: "draft",
        is_demo: false,
      });
      const updated = demoStore.updateImportedOpportunity(imported.id, { status: "published" });
      expect(updated?.status).toBe("published");
    });

    it("gets imported opportunity by id", () => {
      const imported = demoStore.addImportedOpportunity({
        created_by: "test",
        title: "Findable",
        organizer: null,
        category: "other",
        summary: "",
        location: null,
        participation_mode: "remote",
        deadline: null,
        deadline_timezone: null,
        deadline_timezone_known: false,
        deadline_raw_text: null,
        funding_kind: "none",
        funding_description: "",
        funding_amount_min: null,
        funding_amount_max: null,
        funding_currency: null,
        funding_conditional: false,
        requirements: [],
        application_questions: [],
        required_documents: [],
        application_steps: [],
        source_url: null,
        source_content: "",
        source_label: "user_provided",
        source_status: "unknown",
        extracted_at: new Date().toISOString(),
        status: "published",
        is_demo: false,
      });
      const found = demoStore.getImportedOpportunity(imported.id);
      expect(found).toBeDefined();
      expect(found?.title).toBe("Findable");
    });
  });

  describe("Analyses", () => {
    it("saves and retrieves analysis", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      const analysis = demoStore.saveAnalysis({
        user_id: "test-user",
        opportunity_id: opp.id,
        overall_verdict: "likely_eligible",
        confidence: 0.8,
        blockers: [],
        gaps: [],
        ready_documents: [],
        missing_documents: [],
        readiness_score: 85,
        report_items: [],
        source_snapshot: "deterministic",
        computed_at: new Date().toISOString(),
      });
      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();

      const found = demoStore.getAnalysisForUser(opp.id);
      expect(found).toBeDefined();
      expect(found?.overall_verdict).toBe("likely_eligible");
    });

    it("updates existing analysis", () => {
      const opps = demoStore.getOpportunities();
      const opp = opps[0];
      demoStore.saveAnalysis({
        user_id: "test-user",
        opportunity_id: opp.id,
        overall_verdict: "possibly_eligible",
        confidence: 0.5,
        blockers: [],
        gaps: [],
        ready_documents: [],
        missing_documents: [],
        readiness_score: 50,
        report_items: [],
        source_snapshot: "deterministic",
        computed_at: new Date().toISOString(),
      });
      const updated = demoStore.saveAnalysis({
        user_id: "test-user",
        opportunity_id: opp.id,
        overall_verdict: "likely_eligible",
        confidence: 0.9,
        blockers: [],
        gaps: [],
        ready_documents: [],
        missing_documents: [],
        readiness_score: 90,
        report_items: [],
        source_snapshot: "deterministic+model",
        computed_at: new Date().toISOString(),
      });
      expect(updated.overall_verdict).toBe("likely_eligible");

      const all = demoStore.getAnalyses(opp.id);
      expect(all.length).toBe(1);
    });
  });

  describe("Ownership", () => {
    it("all records have user_id matching demo user", () => {
      const DEMO_USER_ID = "demo-user-00000000-0000-0000-0000-000000000001";
      const profile = demoStore.getProfile();
      expect(profile.id).toBe(DEMO_USER_ID);

      const evidence = demoStore.getEvidence();
      for (const ev of evidence) {
        expect(ev.user_id).toBe(DEMO_USER_ID);
      }

      const applications = demoStore.getApplications();
      for (const app of applications) {
        expect(app.user_id).toBe(DEMO_USER_ID);
      }
    });

    it("application ownership is consistent", () => {
      const applications = demoStore.getApplications();
      for (const app of applications) {
        const opp = demoStore.getOpportunity(app.opportunity_id);
        expect(opp).toBeDefined();
      }
    });
  });
});
