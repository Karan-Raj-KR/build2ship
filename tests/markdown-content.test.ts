import { describe, it, expect } from "vitest";
import { isValidElement } from "react";
import { renderInlineMarkdown } from "@/components/ui/MarkdownContent";

describe("MarkdownContent Inline Parser", () => {
  it("converts bold text surrounded by double asterisks into strong tags without raw asterisks", () => {
    const input = "**Apply to this week:**";
    const nodes = renderInlineMarkdown(input);

    expect(nodes.length).toBeGreaterThan(0);
    // Find the bold element
    const boldNode = nodes.filter(isValidElement<{ className: string }>).find(n => n.type === "strong");
    expect(boldNode).toBeDefined();
    expect(boldNode?.props.className).toContain("font-bold");
    expect(JSON.stringify(nodes)).not.toContain("**");
  });

  it("handles mixed inline markdown with bold opportunity titles and deadlines", () => {
    const input = "1. **Mitacs Globalink Research Internship 2026** — 8 days left";
    const nodes = renderInlineMarkdown(input);

    const json = JSON.stringify(nodes);
    expect(json).not.toContain("**");
    expect(json).toContain("Mitacs Globalink Research Internship 2026");
    expect(json).toContain("8 days left");
  });

  it("handles inline code wrapped in backticks", () => {
    const input = "Run `npm run test` to verify";
    const nodes = renderInlineMarkdown(input);

    const codeNode = nodes.filter(isValidElement<{ children: string }>).find(n => n.type === "code");
    expect(codeNode).toBeDefined();
    expect(codeNode?.props.children).toBe("npm run test");
  });
});
