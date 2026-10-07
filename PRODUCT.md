# OpportunityOS — AI Opportunity Agent

## 1. Product Definition
OpportunityOS is not a static directory, job board, or Kanban clone.
It is an active **Personal AI Opportunity Agent**.

**Core Emotional Promise:**
> *"Never miss an opportunity you could have won."*

**Core Functional Promise:**
> *"Your AI scout learns who you are, finds opportunities worth pursuing, checks whether you qualify, and helps you act on them."*

---

## 2. Target User
Ambitious 18–27-year-olds pursuing non-standard career trajectories:
- University students & early-career builders
- Open-source contributors & software engineers
- Researchers, founders, and competitive applicants

They actively pursue fellowships, hackathons, grants, residencies, funded travel programs, and selective builder programs.

---

## 3. Product Principles
1. **Profile First**: Every search, recommendation, and eligibility verdict improves as the system learns the user's verified background.
2. **Personalization Must Be Explainable**: Transparent multi-dimensional reasoning ("Why this is recommended" and "Why you may skip") replaces opaque magic scores.
3. **Relevance != Eligibility**: An opportunity can align with technical interests while having strict citizenship or student constraints.
4. **Unknown Stays Unknown**: Missing profile facts or missing opportunity deadlines are never assumed to be eligible or open.
5. **Real User Evidence**: Answers and plans are grounded in verified user facts and selected projects—never fabricated achievements.
6. **User In Control**: AI-inferred profile updates require explicit user confirmation.

---

## 4. Core Product Experiences

### 1. Scout (`/scout`)
The primary natural-language opportunity search agent. Supports complex multi-constraint queries (e.g. *"Find paid AI opportunities outside India for second-year Indian students"*), automatically merges stored profile context, queries the discovery engine, and returns results grouped by match tiers with explainable factors.

### 2. For You (`/for-you`)
Personalized opportunity feed ranked across profile fit, verified eligibility, and personal evidence strength. Features closed-loop recommendation feedback (*Interested*, *Not relevant*, *Hide*).

### 3. Applications & Workbench (`/workspace`)
Decision panel ("Should I Apply?"), intelligent application plan generation, evidence drawer linking stored user projects to specific application questions, and answer assistant with word-limit controls.

### 4. Profile Intelligence (`/profile`)
Five-pillar opportunity profile:
- AI Intelligence & actionable gap analysis
- Verified Identity & Education
- Goals, Target Roles & Preferences
- Public Evidence & Projects
- Portable AI Context Export

### 5. Ask Agent (`/ask`)
Tool-aware conversational agent grounded in database opportunities, active applications, upcoming deadlines, and user profile gaps.

### 6. AI Bridge (`/ai-bridge`)
First-class interoperability with external LLMs (ChatGPT, Claude, Gemini, Perplexity):
- **Copy for AI**: Generates precision context-loaded prompt templates.
- **Import AI Response**: Parses external LLM responses, extracts structured candidate opportunities, evaluates deduplication, and allows selective database saving.

### 7. Opportunity Comparison (`/compare`)
Side-by-side comparison of up to 3 opportunities across fit, eligibility, effort, funding, and deadline, with an AI synthesis for *"If you only have time for one..."*
