// ============================================================
// AI PROFILE ANALYSIS ENGINE
// Analyzes user profile & evidence to produce grounded intelligence:
// strongest signals, differentiators, weak signals, unlocks, and actionable gaps.
// ============================================================
import type { Profile, ProfileEvidence, ProfileInsight } from "@/types/database";
import { isAIConfigured } from './client';

export interface ProfileAnalysisResult {
  strongest_signals: string[];
  differentiators: string[];
  weak_signals: string[];
  likely_unlocks: string[];
  suggested_actions: string[];
  actionable_gaps: {
    gap: string;
    affected_count: number | null;
    action: string;
    category: "missing_info" | "addressable_gap" | "fixed_constraint";
  }[];
  summary: string;
}

/**
 * Deterministic baseline analysis that runs instantly without external API dependencies.
 * Ensures the system never fails or invents facts.
 */
export function computeDeterministicProfileInsights(
  profile: Profile,
  evidence: ProfileEvidence[]
): ProfileAnalysisResult {
  const confirmedProjects = evidence.filter((e) => e.kind === "project");
  const confirmedAchievements = evidence.filter((e) => e.kind === "achievement");
  const confirmedExperience = evidence.filter((e) => e.kind === "experience");

  const strongest_signals: string[] = [];
  const differentiators: string[] = [];
  const weak_signals: string[] = [];
  const likely_unlocks: string[] = [];
  const suggested_actions: string[] = [];
  const actionable_gaps: ProfileAnalysisResult["actionable_gaps"] = [];

  // 1. Analyze Strong Signals
  if (confirmedProjects.length > 0) {
    strongest_signals.push(
      `Profile includes ${confirmedProjects.length} project${confirmedProjects.length > 1 ? "s" : ""}`
    );
  }
  if (profile.skills && profile.skills.length > 0) {
    const topSkills = profile.skills.slice(0, 4).join(", ");
    strongest_signals.push(`Demonstrated skill stack: ${topSkills}`);
  }
  if (confirmedAchievements.length > 0) {
    strongest_signals.push(
      `Profile includes ${confirmedAchievements.length} achievement${confirmedAchievements.length > 1 ? "s" : ""} (self-reported)`
    );
  }
  if (profile.github_url || profile.portfolio_url) {
    strongest_signals.push("Public proof-of-work linkable directly to reviewers");
  }

  // 2. Differentiators
  if (confirmedProjects.length >= 2 && profile.skills.some((s) => /ai|ml|machine learning|agent/i.test(s))) {
    differentiators.push("Hands-on AI/ML project builder portfolio");
  }
  if (profile.nationalities && profile.nationalities.length > 1) {
    differentiators.push("Dual/multi-citizenship eligibility across international borders");
  }
  if (confirmedExperience.length > 0) {
    differentiators.push("Early professional / team experience beyond academic coursework");
  }
  if (differentiators.length === 0 && strongest_signals.length > 0) {
    differentiators.push("Focused technical background ready for targeted fellowship & grant proposals");
  }

  // 3. Weak Signals & Gaps
  if (!profile.expected_graduation && profile.education_stage === "undergraduate") {
    actionable_gaps.push({
      gap: "Graduation year missing — some programme checks may need this information",
      affected_count: null,
      action: "Set your expected graduation date in Identity & Background",
      category: "missing_info",
    });
    weak_signals.push("Missing graduation year may limit checks for cohort-based programs");
  }

  if (!profile.preferred_countries || profile.preferred_countries.length === 0) {
    actionable_gaps.push({
      gap: "No preferred regions selected",
      affected_count: null,
      action: "Select target regions or countries in Goals & Preferences",
      category: "missing_info",
    });
  }

  if (profile.github_url && confirmedProjects.length === 0) {
    actionable_gaps.push({
      gap: "Your GitHub is connected, but no project has been marked as application evidence",
      affected_count: null,
      action: "Star or add a top repo from your GitHub into Evidence Library",
      category: "addressable_gap",
    });
  }

  if (!profile.country_of_residence) {
    actionable_gaps.push({
      gap: "Country of residence is unconfirmed",
      affected_count: null,
      action: "Specify your current country of residence",
      category: "missing_info",
    });
    weak_signals.push("Residence unverified; regional eligibility cannot be calculated");
  }

  if (!profile.nationalities || profile.nationalities.length === 0) {
    actionable_gaps.push({
      gap: "Citizenship / nationality is unconfirmed",
      affected_count: null,
      action: "Add your citizenship(s) to verify travel and visa requirements",
      category: "missing_info",
    });
  }

  if (evidence.length === 0) {
    actionable_gaps.push({
      gap: "No projects or achievements added to your profile yet",
      affected_count: null,
      action: "Add at least 1 project or achievement to support application answers",
      category: "addressable_gap",
    });
    weak_signals.push("Applications cannot cite concrete personal evidence without profile items");
  }

  if (!profile.github_url && !profile.portfolio_url) {
    actionable_gaps.push({
      gap: "No public proof link (GitHub or portfolio)",
      affected_count: null,
      action: "Link your GitHub or personal website to boost credibility",
      category: "addressable_gap",
    });
  }

  // 4. Likely Unlocks
  if (evidence.length === 0) {
    likely_unlocks.push(
      "Adding 1 documented project with links and metrics unlocks credible application drafting for hackathons and builder grants."
    );
    suggested_actions.push("Add your best open-source or academic project in Projects & Evidence");
  } else if (confirmedAchievements.length === 0) {
    likely_unlocks.push(
      "Documenting a competition result, hackathon submission, or published paper will increase readiness for prestigious fellowships like Thiel, MLH, and Mitacs."
    );
    suggested_actions.push("Add any past hackathon win, certification, or published article to your achievements");
  } else {
    likely_unlocks.push(
      "Your evidence supports competitive submissions for international student fellowships and paid summer programs."
    );
    suggested_actions.push("Search Scout for international fellowships with travel and stipend funding");
  }

  if (profile.education_stage && (!profile.target_roles || profile.target_roles.length === 0)) {
    suggested_actions.push("Specify your target roles (e.g., AI Engineer, Founder) in Goals & Preferences to sharpen Scout recommendations");
  }

  const summary =
    strongest_signals.length > 0
      ? `Profile highlights ${strongest_signals.length} clear strengths with ${actionable_gaps.length} addressable gap${actionable_gaps.length === 1 ? "" : "s"} affecting discovery.`
      : "Profile has foundational information. Adding projects, skills, and target goals will significantly increase opportunity match quality.";

  return {
    strongest_signals: strongest_signals.length > 0 ? strongest_signals : ["Foundational academic profile"],
    differentiators: differentiators.length > 0 ? differentiators : ["Early-stage applicant with growing profile"],
    weak_signals: weak_signals.length > 0 ? weak_signals : ["Profile is well-rounded for general applications"],
    likely_unlocks,
    suggested_actions,
    actionable_gaps,
    summary,
  };
}

/**
 * Model-assisted profile intelligence.
 * Prompts LLM to analyze the stored profile + evidence, strictly grounding its reasoning
 * in the user's actual stored facts without fabricating accomplishments.
 */
export async function analyzeProfileWithLLM(
  profile: Profile,
  evidence: ProfileEvidence[]
): Promise<ProfileAnalysisResult> {
  const fallback = computeDeterministicProfileInsights(profile, evidence);

  if (!isAIConfigured()) {
    return fallback;
  }

  try {
    const prompt = `
You are an expert talent scout and fellowship advisor evaluating an opportunity applicant's profile.
Analyze the following user profile and user-provided evidence.
RULES:
1. Ground every claim STRICTLY in the provided profile and evidence. NEVER invent or hallucinate achievements, skills, or affiliations.
2. Highlight genuine strongest signals and differentiators.
3. Identify real gaps that limit opportunity eligibility or application competitiveness.
4. Distinguish between addressable gaps (e.g. adding a project) and missing basic info (e.g. graduation year).
5. Suggest high-agency, concrete actions that directly unlock more programs.

USER PROFILE:
${JSON.stringify(
  {
    display_name: profile.display_name,
    university: profile.university,
    degree: profile.degree,
    field_of_study: profile.field_of_study,
    education_stage: profile.education_stage,
    expected_graduation: profile.expected_graduation,
    country_of_residence: profile.country_of_residence,
    nationalities: profile.nationalities,
    skills: profile.skills,
    interests: profile.interests,
    target_roles: profile.target_roles,
    target_industries: profile.target_industries,
    preferred_countries: profile.preferred_countries,
    github_url: profile.github_url,
    portfolio_url: profile.portfolio_url,
  },
  null,
  2
)}

VERIFIED EVIDENCE:
${JSON.stringify(
  evidence.map((e) => ({
    kind: e.kind,
    title: e.title,
    description: e.description,
    tags: e.tags,
    evidence_url: e.evidence_url,
  })),
  null,
  2
)}

Return a strict JSON object with this exact schema:
{
  "strongest_signals": string[],
  "differentiators": string[],
  "weak_signals": string[],
  "likely_unlocks": string[],
  "suggested_actions": string[],
  "actionable_gaps": [
    {
      "gap": string,
      "affected_count": number | null,
      "action": string,
      "category": "missing_info" | "addressable_gap" | "fixed_constraint"
    }
  ],
  "summary": string
}
`;

    const { chatCompletion } = await import("@/lib/ai/client");
    const content = await chatCompletion({
      userId: profile.id,
      messages: [
        {
          role: "system",
          content: "You are an AI Opportunity Agent profile analyst. Respond with pure JSON only.",
        },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
      temperature: 0.2,
      maxTokens: 1500,
    });

    if (!content) return fallback;

    const parsed = JSON.parse(content) as ProfileAnalysisResult;

    return {
      strongest_signals: Array.isArray(parsed.strongest_signals) && parsed.strongest_signals.length > 0
        ? parsed.strongest_signals
        : fallback.strongest_signals,
      differentiators: Array.isArray(parsed.differentiators) && parsed.differentiators.length > 0
        ? parsed.differentiators
        : fallback.differentiators,
      weak_signals: Array.isArray(parsed.weak_signals) ? parsed.weak_signals : fallback.weak_signals,
      likely_unlocks: Array.isArray(parsed.likely_unlocks) && parsed.likely_unlocks.length > 0
        ? parsed.likely_unlocks
        : fallback.likely_unlocks,
      suggested_actions: Array.isArray(parsed.suggested_actions) && parsed.suggested_actions.length > 0
        ? parsed.suggested_actions
        : fallback.suggested_actions,
      actionable_gaps: Array.isArray(parsed.actionable_gaps) ? parsed.actionable_gaps : fallback.actionable_gaps,
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
    };
  } catch (err) {
    console.error("LLM profile analysis error, falling back to deterministic:", err);
    return fallback;
  }
}
