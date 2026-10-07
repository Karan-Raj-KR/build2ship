// ============================================================
// ONBOARDING PARSERS & EXTRACTORS
// Handles Resume/CV parsing, GitHub public profile extraction,
// Paste profile extraction, and AI Bridge schema validation.
// All facts require explicit user confirmation before persisting.
// ============================================================

import { EvidenceKind, Profile, ProfileEvidence } from "@/types/database";

export interface CandidateFact {
  id: string;
  kind: EvidenceKind | "education" | "skill" | "interest" | "preference";
  category: "Education" | "Skills" | "Projects" | "Experience" | "Achievements" | "Preferences";
  title: string;
  description: string | null;
  tags: string[];
  evidence_url?: string | null;
  inferred_confidence: number; // 0 to 1
  status: "confirmed" | "edited" | "ignored";
  original_raw_text?: string;
  // Field mappings to Profile if applicable
  profile_field?: keyof Profile;
  profile_value?: string;
}

export interface ExtractionResult {
  source_type: "resume" | "github" | "paste" | "ai_bridge";
  total_found: number;
  facts: CandidateFact[];
  raw_summary?: string;
  warnings: string[];
}

/**
 * Parses freeform resume/CV text into candidate profile facts.
 */
export function parseResumeText(rawText: string): ExtractionResult {
  const warnings: string[] = [];
  const facts: CandidateFact[] = [];
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  if (rawText.length < 50) {
    warnings.push("Input text is very brief. Extracted items may be incomplete.");
  }

  // 1. Detect Education
  const eduRegex = /(bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?tech|m\.?tech|undergraduate|degree|university|institute|college)/i;
  for (const line of lines) {
    if (eduRegex.test(line) && line.length < 120) {
      facts.push({
        id: `fact-edu-${facts.length + 1}`,
        kind: "education",
        category: "Education",
        title: line,
        description: "Inferred from resume education history",
        tags: ["Education"],
        inferred_confidence: 0.85,
        status: "confirmed",
        profile_field: "university",
        profile_value: line,
      });
      break; // Pick primary
    }
  }

  // 2. Detect Common Technical Skills
  const knownSkills = [
    "Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Rust", "Go",
    "C++", "PyTorch", "TensorFlow", "PostgreSQL", "TailwindCSS", "Git", "Docker", "AWS",
    "Machine Learning", "Deep Learning", "LLMs", "Data Analysis", "Figma", "Product Design"
  ];
  const detectedSkills: string[] = [];
  for (const skill of knownSkills) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(rawText) && !detectedSkills.includes(skill)) {
      detectedSkills.push(skill);
      facts.push({
        id: `fact-skill-${facts.length + 1}`,
        kind: "skill",
        category: "Skills",
        title: skill,
        description: "Technical skill mentioned in CV",
        tags: [skill],
        inferred_confidence: 0.9,
        status: "confirmed",
      });
    }
  }

  // 3. Detect Projects & Experience
  let inProjectSection = false;
  let inExpSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(projects|technical projects|key projects)/i.test(line)) {
      inProjectSection = true;
      inExpSection = false;
      continue;
    }
    if (/^(experience|work experience|employment|internships)/i.test(line)) {
      inExpSection = true;
      inProjectSection = false;
      continue;
    }
    if (/^(education|skills|certifications|awards|honors|publications)/i.test(line)) {
      inProjectSection = false;
      inExpSection = false;
      continue;
    }

    if (inProjectSection && line.length > 5 && line.length < 90 && !line.startsWith("•") && !line.startsWith("-")) {
      const descLine = lines[i + 1] && (lines[i + 1].startsWith("•") || lines[i + 1].startsWith("-")) ? lines[i + 1].replace(/^[•\-]\s*/, "") : null;
      facts.push({
        id: `fact-proj-${facts.length + 1}`,
        kind: "project",
        category: "Projects",
        title: line,
        description: descLine,
        tags: ["Project"],
        inferred_confidence: 0.8,
        status: "confirmed",
      });
      if (descLine) i++;
    }

    if (inExpSection && line.length > 5 && line.length < 90 && !line.startsWith("•") && !line.startsWith("-")) {
      const descLine = lines[i + 1] && (lines[i + 1].startsWith("•") || lines[i + 1].startsWith("-")) ? lines[i + 1].replace(/^[•\-]\s*/, "") : null;
      facts.push({
        id: `fact-exp-${facts.length + 1}`,
        kind: "experience",
        category: "Experience",
        title: line,
        description: descLine,
        tags: ["Experience"],
        inferred_confidence: 0.8,
        status: "confirmed",
      });
      if (descLine) i++;
    }
  }

  // 4. Detect Achievements / Awards
  for (const line of lines) {
    if (/(hackathon winner|1st place|finalist|fellow|scholar|grant recipient|dean'?s list|published in)/i.test(line) && line.length < 140) {
      facts.push({
        id: `fact-achieve-${facts.length + 1}`,
        kind: "achievement",
        category: "Achievements",
        title: line.replace(/^[•\-]\s*/, ""),
        description: "Competitive achievement or recognition from resume",
        tags: ["Achievement"],
        inferred_confidence: 0.88,
        status: "confirmed",
      });
    }
  }

  return {
    source_type: "resume",
    total_found: facts.length,
    facts,
    warnings,
  };
}

/**
 * Public GitHub profile extractor.
 * Fetches public user info and top non-fork public repositories.
 */
export async function parseGitHubProfile(usernameOrUrl: string): Promise<ExtractionResult> {
  const warnings: string[] = [];
  const facts: CandidateFact[] = [];

  // Extract clean username
  const cleanUser = usernameOrUrl
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  if (!cleanUser) {
    throw new Error("Invalid GitHub username or profile URL.");
  }

  let userProfile: { bio?: string; name?: string; html_url?: string } = {};
  let repos: { language: string | null; fork: boolean; description: string | null; name: string; html_url: string; stargazers_count: number }[] = [];

  try {
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`, {
      headers: { "User-Agent": "OpportunityOS-Scout" },
    });
    if (!userRes.ok) {
      throw new Error(`GitHub user "${cleanUser}" not found (HTTP ${userRes.status}).`);
    }
    userProfile = await userRes.json();

    const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=pushed&per_page=15`, {
      headers: { "User-Agent": "OpportunityOS-Scout" },
    });
    if (reposRes.ok) {
      repos = await reposRes.json();
    }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "Failed to fetch GitHub public profile.");
  }

  // 1. User Bio / Title
  if (userProfile.bio) {
    facts.push({
      id: `fact-gh-bio`,
      kind: "preference",
      category: "Education",
      title: userProfile.name || cleanUser,
      description: userProfile.bio,
      tags: ["GitHub Profile"],
      evidence_url: userProfile.html_url,
      inferred_confidence: 0.95,
      status: "confirmed",
      profile_field: "github_url",
      profile_value: userProfile.html_url,
    });
  }

  // 2. Primary Languages -> Skills
  const languagesCount: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.language) {
      languagesCount[repo.language] = (languagesCount[repo.language] || 0) + 1;
    }
  }
  for (const [lang, count] of Object.entries(languagesCount)) {
    facts.push({
      id: `fact-gh-lang-${lang.toLowerCase()}`,
      kind: "skill",
      category: "Skills",
      title: lang,
      description: `Active in ${count} public repos on GitHub`,
      tags: [lang, "GitHub"],
      inferred_confidence: 0.9,
      status: "confirmed",
    });
  }

  // 3. Highlighted Projects (Non-forks with stars or meaningful description)
  const nonForks = repos.filter((r) => !r.fork && r.description);
  const selectedRepos = nonForks.slice(0, 5);

  for (const repo of selectedRepos) {
    facts.push({
      id: `fact-gh-repo-${repo.name}`,
      kind: "project",
      category: "Projects",
      title: repo.name,
      description: repo.description ? `${repo.description} (${repo.stargazers_count} stars)` : `Public repository: ${repo.html_url}`,
      tags: [repo.language || "Code", "GitHub Project"].filter(Boolean),
      evidence_url: repo.html_url,
      inferred_confidence: repo.stargazers_count > 5 ? 0.95 : 0.85,
      status: "confirmed",
    });
  }

  if (facts.length === 0) {
    warnings.push("No public repositories or bio found on this GitHub account.");
  }

  return {
    source_type: "github",
    total_found: facts.length,
    facts,
    raw_summary: `Fetched public profile for ${cleanUser} with ${repos.length} public repositories.`,
    warnings,
  };
}

/**
 * Parses freeform pasted text (LinkedIn, portfolio, bio, or previous AI summaries)
 */
export function parsePastedProfileText(text: string): ExtractionResult {
  return parseResumeText(text); // Shared robust entity extraction
}

/**
 * Schema template for portable AI Bridge prompt.
 */
export const AI_BRIDGE_PORTABLE_PROMPT = `
You are helping me structure my Opportunity Profile for Elara.
Please interview me or summarize my background, and output the result STRICTLY using the format below.
Include BOTH a human explanation AND the structured JSON inside markers.

===OPPORTUNITY_PROFILE_START===
{
  "display_name": "<Full Name or Preferred Name>",
  "education_stage": "<undergraduate | masters | phd | other>",
  "university": "<University/College name>",
  "field_of_study": "<Major or focus area, e.g. Computer Science>",
  "expected_graduation": "<YYYY-MM-DD or YYYY>",
  "country_of_residence": "<Country where you live right now, e.g. India>",
  "nationalities": ["<Citizenship countries, e.g. India>"],
  "skills": ["<Key technical or research skills>"],
  "interests": ["<Topic interests, e.g. AI, Climate Tech, Open Source>"],
  "opportunity_types": ["<internship | fellowship | hackathon | grant | scholarship>"],
  "participation_preference": "<remote | in-person | both>",
  "willing_to_travel": true,
  "paid_only_preference": true,
  "evidence_items": [
    {
      "kind": "project",
      "title": "<Project Title>",
      "description": "<What you built and impact>",
      "tags": ["<Skill or tech>"],
      "evidence_url": "<URL or null>"
    },
    {
      "kind": "achievement",
      "title": "<Award / Hackathon / Honor>",
      "description": "<Placement, date, or recognition>",
      "tags": ["<Tag>"]
    }
  ]
}
===OPPORTUNITY_PROFILE_END===
`.trim();

/**
 * Validates and extracts JSON from AI Bridge response.
 */
export function parseAiBridgeResponse(response: string): { profile: Partial<Profile>; evidence: Partial<ProfileEvidence>[]; facts: CandidateFact[] } {
  const match = response.match(/===OPPORTUNITY_PROFILE_START===([\s\S]*?)===OPPORTUNITY_PROFILE_END===/);
  let jsonString = "";
  if (match && match[1]) {
    jsonString = match[1].trim();
  } else {
    // Fallback search for bare JSON block
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonString = codeBlockMatch[1].trim();
    } else {
      jsonString = response.trim();
    }
  }

  let parsed: Partial<Profile> & { evidence_items?: Partial<ProfileEvidence>[] };
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error("Could not parse valid JSON from AI Bridge response. Make sure to copy the entire response including ===OPPORTUNITY_PROFILE_START=== and ===OPPORTUNITY_PROFILE_END===.");
  }

  const profile: Partial<Profile> = {
    display_name: parsed.display_name || null,
    education_stage: parsed.education_stage || "undergraduate",
    university: parsed.university || null,
    field_of_study: parsed.field_of_study || null,
    expected_graduation: parsed.expected_graduation || null,
    country_of_residence: parsed.country_of_residence || null,
    nationalities: Array.isArray(parsed.nationalities) ? parsed.nationalities : [],
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    interests: Array.isArray(parsed.interests) ? parsed.interests : [],
    opportunity_types: Array.isArray(parsed.opportunity_types) ? parsed.opportunity_types : [],
    participation_preference: parsed.participation_preference || "both",
    willing_to_travel: parsed.willing_to_travel ?? true,
    paid_only_preference: parsed.paid_only_preference ?? false,
  };

  const evidence: Partial<ProfileEvidence>[] = [];
  const facts: CandidateFact[] = [];

  if (Array.isArray(parsed.evidence_items)) {
    for (let i = 0; i < parsed.evidence_items.length; i++) {
      const item = parsed.evidence_items[i];
      if (item.title) {
        evidence.push({
          kind: (item.kind === "achievement" || item.kind === "experience" || item.kind === "fact") ? item.kind : "project",
          title: item.title,
          description: item.description || null,
          tags: Array.isArray(item.tags) ? item.tags : [],
          evidence_url: item.evidence_url || null,
          confirmed: true,
        });

        facts.push({
          id: `fact-aibridge-${i + 1}`,
          kind: (item.kind === "achievement" || item.kind === "experience" || item.kind === "fact") ? item.kind : "project",
          category: item.kind === "achievement" ? "Achievements" : item.kind === "experience" ? "Experience" : "Projects",
          title: item.title,
          description: item.description || null,
          tags: Array.isArray(item.tags) ? item.tags : [],
          evidence_url: item.evidence_url || null,
          inferred_confidence: 0.95,
          status: "confirmed",
        });
      }
    }
  }

  // Also convert skills to candidate facts for review
  if (profile.skills && profile.skills.length > 0) {
    for (const skill of profile.skills) {
      facts.push({
        id: `fact-skill-${skill}`,
        kind: "skill",
        category: "Skills",
        title: skill,
        description: "Skill confirmed via AI Bridge",
        tags: [skill],
        inferred_confidence: 0.95,
        status: "confirmed",
      });
    }
  }

  return { profile, evidence, facts };
}
