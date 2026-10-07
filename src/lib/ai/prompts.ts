// ============================================================
// PROMPTS — structured extraction and eligibility analysis
// ============================================================

export const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured information from opportunity listings (hackathons, fellowships, scholarships, internships, grants).

Given raw text from an opportunity page, extract every meaningful detail into the JSON schema below. Be precise, conservative, and cite the original text.

Rules:
- Only extract information explicitly stated or strongly implied by the text.
- If a field is not mentioned, use null/empty.
- For requirements, produce a comparison_rule when the requirement can be objectively checked (e.g., "must be 18+" → {field:"age", operator:"gte", value:18}).
- For deadlines, attempt to parse the date. If timezone is ambiguous, set timezone_known=false.
- For funding, detect if the opportunity costs money (application fee, tuition, etc.).
- Return valid JSON only. No markdown.`;

export function buildExtractionUserPrompt(content: string, sourceUrl: string | null): string {
  return `Source URL: ${sourceUrl ?? "User-provided text (no URL)"}

--- BEGIN OPPORTUNITY TEXT ---
${content.slice(0, 15000)}
--- END OPPORTUNITY TEXT ---

Extract into this JSON schema:
{
  "title": "string",
  "organizer": "string | null",
  "category": "hackathon | fellowship | scholarship | internship | grant | other",
  "summary": "2-4 sentence summary",
  "location": "string | null",
  "participation_mode": "remote | in-person | hybrid",
  "deadline": {
    "date": "ISO 8601 string or null",
    "timezone": "string or null",
    "timezone_known": boolean,
    "raw_text": "original deadline text"
  },
  "funding": {
    "kind": "prize | stipend | reimbursement | cost | none | unknown",
    "description": "string",
    "amount_min": number | null,
    "amount_max": number | null,
    "currency": "string | null",
    "conditional": boolean
  },
  "requirements": [
    {
      "text": "requirement description",
      "type": "nationality | residence | education_stage | field_of_study | graduation_window | age | location_restriction | skill | experience | team_size | document | application_step | other",
      "mandatory": "mandatory | preferred | uncertain",
      "excerpt": "original text excerpt containing this requirement",
      "source_ref": "section or context where found",
      "comparison_rule": { "field": "string", "operator": "includes | equals | gte | lte | between | matches_regex | in_list", "value": "any", "unit": "string or undefined" } | null,
      "uncertainty": "string explaining why uncertain, or null"
    }
  ],
  "application_questions": ["list of essay/short-answer questions mentioned"],
  "required_documents": ["list of documents required (CV, transcript, etc.)"],
  "application_steps": ["ordered application steps if mentioned"],
  "source_url": "${sourceUrl ?? ""}"
}`;
}

export const ELIGIBILITY_SYSTEM_PROMPT = `You are an expert at evaluating whether a person qualifies for an opportunity based on their profile.

Given an extracted opportunity (with requirements) and a user profile, produce a detailed eligibility report.

For each requirement:
- Compare the user profile against the comparison_rule (if available) or interpret the requirement text.
- Return verdict: "met", "unmet", "partially_met", or "unknown".
- Include a human-readable explanation.
- Use "unknown" when the profile doesn't contain enough information (not "unmet").

Rules:
- Be strict but fair. "Preferred" requirements that are unmet should not block eligibility.
- Mandatory requirements that are unmet should flag as blockers.
- Always return valid JSON. No markdown.`;

export function buildEligibilityUserPrompt(
  opportunity: {
    title: string;
    requirements: Array<{
      text: string;
      type: string;
      mandatory: string;
      comparison_rule: unknown;
    }>;
    application_questions: string[];
    required_documents: string[];
  },
  profile: {
    display_name: string | null;
    nationality: string | null;
    residence: string | null;
    education_level: string | null;
    field_of_study: string | null;
    expected_graduation: string | null;
    skills: string[];
    interests: string[];
    has_cv: boolean;
    has_transcript: boolean;
    has_reference_letters: boolean;
  }
): string {
  return `OPPORTUNITY:
Title: ${opportunity.title}
Requirements:
${opportunity.requirements.map((r, i) => `${i + 1}. [${r.mandatory}] (${r.type}) ${r.text}`).join("\n")}
Application questions: ${opportunity.application_questions.join("; ") || "None listed"}
Required documents: ${opportunity.required_documents.join("; ") || "None listed"}

USER PROFILE:
Name: ${profile.display_name ?? "Unknown"}
Nationality: ${profile.nationality ?? "Not specified"}
Residence: ${profile.residence ?? "Not specified"}
Education: ${profile.education_level ?? "Not specified"}
Field: ${profile.field_of_study ?? "Not specified"}
Expected graduation: ${profile.expected_graduation ?? "Not specified"}
Skills: ${profile.skills.join(", ") || "None listed"}
Interests: ${profile.interests.join(", ") || "None listed"}
Has CV: ${profile.has_cv}
Has transcript: ${profile.has_transcript}
Has reference letters: ${profile.has_reference_letters}

Return JSON:
{
  "overall_verdict": "likely_eligible | possibly_eligible | likely_ineligible | unknown",
  "confidence": 0.0 to 1.0,
  "blockers": ["list of unmet mandatory requirements that prevent application"],
  "gaps": ["list of unmet preferred requirements or missing information"],
  "ready_documents": ["documents the user already has that are required"],
  "missing_documents": ["required documents the user doesn't have"],
  "readiness_score": 0 to 100,
  "report_items": [
    {
      "requirement_text": "string",
      "requirement_type": "string",
      "mandatory": "string",
      "verdict": "met | unmet | partially_met | unknown",
      "explanation": "human-readable explanation",
      "evidence": "what in the profile supports this verdict"
    }
  ]
}`;
}

export const ANSWER_DRAFT_SYSTEM_PROMPT = `You are an expert at drafting application answers for competitive opportunities.

Given a user's profile and an application question, produce a concise first-draft answer.
- Match the tone requested (default: professional but personable).
- Use details from the profile. Do not fabricate achievements.
- If the profile lacks relevant info, draft a placeholder with [FILL IN: description of what to add].
- Stay under 300 words unless told otherwise.
- Output the draft answer text only. No JSON, no markdown formatting.`;

export function buildAnswerDraftUserPrompt(
  question: string,
  profile: {
    display_name: string | null;
    nationality: string | null;
    education_level: string | null;
    field_of_study: string | null;
    skills: string[];
    interests: string[];
    bio: string | null;
  },
  contextNotes: string | null
): string {
  return `QUESTION: ${question}

USER PROFILE:
Name: ${profile.display_name ?? "Unknown"}
Nationality: ${profile.nationality ?? "Not specified"}
Education: ${profile.education_level ?? "Not specified"} in ${profile.field_of_study ?? "N/A"}
Skills: ${profile.skills.join(", ") || "None listed"}
Interests: ${profile.interests.join(", ") || "None listed"}
Bio: ${profile.bio ?? "Not provided"}

${contextNotes ? `ADDITIONAL CONTEXT FROM USER:\n${contextNotes}\n` : ""}
Draft an answer to the question above.`;
}
