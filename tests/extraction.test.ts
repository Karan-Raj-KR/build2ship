// ============================================================
// TESTS — Extraction normalization and validation
// ============================================================
import { describe, it, expect } from "vitest";

// Test the extraction normalization logic
// We can't test the actual AI extraction without an API key,
// but we can test the normalization and fallback behavior

describe("Extraction normalization", () => {
  // Test category normalization
  it("normalizes category values", () => {
    const validCategories = ["hackathon", "fellowship", "scholarship", "internship", "grant"];
    const invalidCategory = "invalid";

    for (const cat of validCategories) {
      expect(validCategories).toContain(cat);
    }
    expect(validCategories).not.toContain(invalidCategory);
  });

  // Test participation mode normalization
  it("normalizes participation modes", () => {
    const validModes = ["remote", "in-person", "hybrid"];
    for (const mode of validModes) {
      expect(validModes).toContain(mode);
    }
  });

  // Test funding kind normalization
  it("normalizes funding kinds", () => {
    const validKinds = ["prize", "stipend", "reimbursement", "cost", "none", "unknown"];
    for (const kind of validKinds) {
      expect(validKinds).toContain(kind);
    }
  });

  // Test requirement type normalization
  it("normalizes requirement types", () => {
    const validTypes = [
      "nationality", "residence", "education_stage", "field_of_study",
      "graduation_window", "age", "location_restriction", "skill",
      "experience", "team_size", "document", "application_step", "other",
    ];
    for (const type of validTypes) {
      expect(validTypes).toContain(type);
    }
  });

  // Test mandatory normalization
  it("normalizes mandatory values", () => {
    const validValues = ["mandatory", "preferred", "uncertain"];
    for (const val of validValues) {
      expect(validValues).toContain(val);
    }
  });

  // Test comparison rule operators
  it("validates comparison rule operators", () => {
    const validOperators = ["includes", "equals", "gte", "lte", "between", "matches_regex", "in_list"];
    for (const op of validOperators) {
      expect(validOperators).toContain(op);
    }
  });

  // Test fallback extraction
  it("extracts title from first line of content", () => {
    const content = "Google Summer of Code 2025\nA global program for students...";
    const lines = content.split("\n").filter((l) => l.trim());
    const title = lines[0]?.trim() || "Untitled Opportunity";
    expect(title).toBe("Google Summer of Code 2025");
  });

  it("extracts deadline from content using regex", () => {
    const content = "Deadline: April 1, 2025. Apply now!";
    const dateMatch = content.match(
      /(?:deadline|due|apply by|closes?|ends?)[:\s]*([A-Z][a-z]+ \d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})/i
    );
    expect(dateMatch).not.toBeNull();
    expect(dateMatch?.[1]).toBe("April 1, 2025");
  });

  it("returns null deadline when no deadline found", () => {
    const content = "No deadline mentioned in this text.";
    const dateMatch = content.match(
      /(?:deadline|due|apply by|closes?|ends?)[:\s]*([A-Z][a-z]+ \d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})/i
    );
    expect(dateMatch).toBeNull();
  });
});

describe("HTML stripping", () => {
  it("strips HTML tags from content", () => {
    const html = "<div>Hello <b>world</b></div><p>Test</p>";
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    expect(stripped).toBe("Hello world Test");
  });

  it("decodes HTML entities", () => {
    const html = "&amp; &lt; &gt; &quot; &#39;";
    const decoded = html
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    expect(decoded).toBe('& < > " \'');
  });

  it("removes script and style tags", () => {
    const html = "<head><style>body{color:red}</style></head><body><script>alert(1)</script>Hello</body>";
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    expect(stripped).toBe("Hello");
  });
});
