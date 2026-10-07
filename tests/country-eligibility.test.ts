import { describe, it, expect } from "vitest";
import { evaluateCountryEligibility } from "@/lib/personalisation/countryRules";
import type { Opportunity, Profile } from "@/types/database";

describe("Country-Aware Eligibility Personalisation", () => {
  const baseOpportunity: Opportunity = {
    id: "opp-sample-1",
    title: "US Tech Internship",
    category: "internship",
    location: "United States",
    participation_mode: "in-person",
    eligible_countries: ["United States"],
    citizenship_constraints: ["United States"],
    residency_constraints: ["United States"],
    summary: "US domestic tech internship",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as Opportunity;

  const globalRemoteOpp: Opportunity = {
    id: "opp-global-1",
    title: "Global Open Source Fellowship",
    category: "fellowship",
    location: "Global",
    participation_mode: "remote",
    eligible_countries: ["GLOBAL"],
    citizenship_constraints: [],
    residency_constraints: [],
    summary: "Worldwide remote fellowship open to all nationalities",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as Opportunity;

  const internationalExchangeOpp: Opportunity = {
    id: "opp-mitacs-1",
    title: "Mitacs Globalink Research Internship",
    category: "research_programme",
    location: "Canada",
    participation_mode: "in-person",
    eligible_countries: ["India", "United Kingdom", "France", "Germany", "Brazil", "Australia"],
    citizenship_constraints: [],
    residency_constraints: [],
    visa_requirements: "Canadian J-1 / Research work permit fully sponsored",
    summary: "12-week research internship at Canadian universities",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as Opportunity;

  it("identifies local opportunities for a US resident with known geographic requirements", () => {
    const usProfile: Partial<Profile> = {
      country_of_residence: "United States",
      nationalities: ["United States"],
    };

    const result = evaluateCountryEligibility(baseOpportunity, usProfile);
    expect(result.verdict).toBe("eligible");
    expect(result.is_local_match).toBe(true);
    expect(result.is_international_eligible).toBe(false);
    expect(result.country_fit_score).toBe(85);
  });

  it("marks US-only opportunity as ineligible for an Indian resident", () => {
    const inProfile: Partial<Profile> = {
      country_of_residence: "India",
      nationalities: ["India"],
    };

    const result = evaluateCountryEligibility(baseOpportunity, inProfile);
    expect(result.verdict).toBe("ineligible");
    expect(result.is_local_match).toBe(false);
    expect(result.country_fit_score).toBeLessThanOrEqual(20);
    expect(result.reason).toContain("Stated applicant countries restriction: United States");
  });

  it("provides symmetrical eligibility for global remote opportunities across all countries", () => {
    const usProfile: Partial<Profile> = { country_of_residence: "United States" };
    const inProfile: Partial<Profile> = { country_of_residence: "India" };
    const ukProfile: Partial<Profile> = { country_of_residence: "United Kingdom" };

    const resUS = evaluateCountryEligibility(globalRemoteOpp, usProfile);
    const resIN = evaluateCountryEligibility(globalRemoteOpp, inProfile);
    const resUK = evaluateCountryEligibility(globalRemoteOpp, ukProfile);

    expect(resUS.verdict).toBe("eligible");
    expect(resIN.verdict).toBe("eligible");
    expect(resUK.verdict).toBe("eligible");

    expect(resUS.country_fit_score).toBe(85);
    expect(resIN.country_fit_score).toBe(85);
    expect(resUK.country_fit_score).toBe(85);
  });

  it("evaluates eligible international programs for partner countries", () => {
    const inProfile: Partial<Profile> = { country_of_residence: "India", nationalities: ["India"] };
    const result = evaluateCountryEligibility(internationalExchangeOpp, inProfile);

    expect(result.verdict).toBe("eligible");
    expect(result.is_local_match).toBe(false);
    expect(result.is_international_eligible).toBe(true);
    expect(result.country_fit_score).toBeGreaterThanOrEqual(85);
  });

  it("does not infer citizenship eligibility from work authorization", () => {
    const oppWithWorkAuthReq: Opportunity = {
      id: "opp-uk-grad",
      title: "London FinTech Graduate Scheme",
      category: "internship",
      location: "United Kingdom",
      participation_mode: "in-person",
      eligible_countries: ["United Kingdom"],
      citizenship_constraints: [],
      residency_constraints: [],
      visa_requirements: "Must hold valid UK Youth Mobility or Graduate Visa",
      summary: "UK graduate scheme",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Opportunity;

    // User is Indian resident but holds UK Youth Mobility visa
    const indianUserWithUKVisa: Partial<Profile> = {
      country_of_residence: "India",
      work_authorizations: ["United Kingdom", "uk youth mobility"],
    };

    const result = evaluateCountryEligibility(oppWithWorkAuthReq, indianUserWithUKVisa);
    expect(result.verdict).toBe("uncertain");
    expect(result.missing_profile_field).toBe("nationalities");
  });
});
