import { describe, it, expect } from "vitest";
import {
  parseResumeText,
  parsePastedProfileText,
  parseAiBridgeResponse,
  AI_BRIDGE_PORTABLE_PROMPT,
} from "@/lib/onboarding/parsers";

describe("Onboarding Parsers & AI Bridge", () => {
  describe("1. Resume / CV Parser", () => {
    it("extracts education, technical skills, projects, and achievements from plain text", () => {
      const sampleCV = `
John Doe
B.Tech in Computer Science, Stanford University, Class of 2026

Skills:
Python, React, TypeScript, PyTorch, Docker, Git

Projects:
Autonomous Drone Navigation System
• Built an end-to-end vision pipeline in PyTorch and ROS2 deployed to edge drone.

Experience:
Summer Research Intern at Robotics Lab
• Designed trajectory optimization algorithms for multi-agent systems.

Achievements:
• 1st place at HackMIT 2025 AI Track
• Recipient of National Merit Scholar Grant
      `.trim();

      const result = parseResumeText(sampleCV);

      expect(result.facts.length).toBeGreaterThan(5);

      // Verify categories
      const categories = result.facts.map((f) => f.category);
      expect(categories).toContain("Education");
      expect(categories).toContain("Skills");
      expect(categories).toContain("Projects");
      expect(categories).toContain("Experience");
      expect(categories).toContain("Achievements");

      // Verify specific extractions
      const skills = result.facts.filter((f) => f.category === "Skills").map((f) => f.title);
      expect(skills).toContain("Python");
      expect(skills).toContain("React");
      expect(skills).toContain("PyTorch");

      const achievement = result.facts.find((f) => f.category === "Achievements");
      expect(achievement?.title).toContain("HackMIT");
    });

    it("handles short text gracefully with informative warnings", () => {
      const result = parseResumeText("Just a student");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.facts.length).toBe(0);
    });
  });

  describe("2. Paste Profile Text Parser", () => {
    it("parses LinkedIn / bio text into structured candidate facts", () => {
      const sampleBio = `
Passionate fullstack builder. Currently studying B.S. in Computer Science.
Experienced in TypeScript, Next.js, and Machine Learning.
Hackathon winner at Cal Hacks 2025.
      `;
      const result = parsePastedProfileText(sampleBio);
      expect(result.facts.length).toBeGreaterThan(0);
      const skills = result.facts.filter((f) => f.category === "Skills").map((f) => f.title);
      expect(skills).toContain("TypeScript");
      expect(skills).toContain("Next.js");
    });
  });

  describe("3. AI Bridge Parser & Schema Validation", () => {
    it("includes required template markers in portable prompt", () => {
      expect(AI_BRIDGE_PORTABLE_PROMPT).toContain("===OPPORTUNITY_PROFILE_START===");
      expect(AI_BRIDGE_PORTABLE_PROMPT).toContain("===OPPORTUNITY_PROFILE_END===");
      expect(AI_BRIDGE_PORTABLE_PROMPT).toContain("display_name");
      expect(AI_BRIDGE_PORTABLE_PROMPT).toContain("evidence_items");
    });

    it("successfully parses valid response with markers", () => {
      const validResponse = `
Here is your structured opportunity profile!

===OPPORTUNITY_PROFILE_START===
{
  "display_name": "Aarav Sharma",
  "education_stage": "undergraduate",
  "university": "IIT Bombay",
  "field_of_study": "Computer Science",
  "expected_graduation": "2026-06-01",
  "country_of_residence": "India",
  "nationalities": ["India"],
  "skills": ["Python", "Rust", "LLMs"],
  "interests": ["AI Safety", "Open Source"],
  "opportunity_types": ["fellowship", "internship"],
  "participation_preference": "both",
  "willing_to_travel": true,
  "paid_only_preference": true,
  "evidence_items": [
    {
      "kind": "project",
      "title": "OpenLLM Bench",
      "description": "Benchmarking harness for local LLMs",
      "tags": ["Python", "LLMs"]
    }
  ]
}
===OPPORTUNITY_PROFILE_END===

Let me know if you need any edits!
      `;

      const { profile, evidence, facts } = parseAiBridgeResponse(validResponse);

      expect(profile.display_name).toBe("Aarav Sharma");
      expect(profile.university).toBe("IIT Bombay");
      expect(profile.skills).toContain("Rust");
      expect(evidence.length).toBe(1);
      expect(evidence[0].title).toBe("OpenLLM Bench");
      expect(facts.length).toBeGreaterThan(0);
    });

    it("throws clear schema validation error on malformed JSON", () => {
      const invalidResponse = `
===OPPORTUNITY_PROFILE_START===
{ not valid json }
===OPPORTUNITY_PROFILE_END===
      `;
      expect(() => parseAiBridgeResponse(invalidResponse)).toThrow();
    });
  });
});
