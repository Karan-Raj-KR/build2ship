import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingHero } from "@/components/landing/LandingHero";
import { LiveCatalogPreview } from "@/components/landing/LiveCatalogPreview";

// Keep illustrative recommendations visibly separate from eligibility and live data.
describe("landing preview", () => {
  it("labels example data and exposes selectable controls without invented match scores", () => {
    const hero = renderToStaticMarkup(createElement(LandingHero));
    const catalogue = renderToStaticMarkup(createElement(LiveCatalogPreview));
    expect(hero).toContain("Example only");
    expect(hero).toContain("Eligibility is a separate check");
    expect(hero).toContain('aria-pressed="true"');
    expect(hero).not.toContain("98%");
    expect(catalogue).toContain("not live recommendations");
    expect(catalogue).toContain('aria-label="Search programme examples"');
    expect(catalogue).toContain('aria-labelledby="example-title"');
    expect(catalogue).toContain("<dialog");
    expect(catalogue).toContain("Save Google Summer of Code 2026 in this preview");
  });
});
