// ============================================================
// DEMO STORE — in-memory state for demo mode
// All mutations are local only; nothing persists across page reloads.
// ============================================================
import {
  DEMO_PROFILE,
  DEMO_OPPORTUNITIES,
  DEMO_APPLICATIONS,
  DEMO_TASKS,
  DEMO_ANSWERS,
  DEMO_EVIDENCE,
  DEMO_USER_ID,
  DEMO_REAL_OPPORTUNITIES,
} from "./data";
import type {
  Profile,
  ProfileEvidence,
  Opportunity,
  Application,
  ApplicationTask,
  ApplicationAnswer,
  ImportedOpportunity,
  OpportunityAnalysis,
  ProfileInsight,
  ScoutRun,
  SavedSearch,
  RecommendationFeedback,
  ApplicationEvidenceLink,
} from "@/types/database";
import type {
  NotificationItem,
  NotificationPreference,
  PushSubscriptionRecord,
} from "@/lib/notifications/types";

// Convert ImportedOpportunity to canonical Opportunity format
export function importedToOpportunity(imp: ImportedOpportunity): Opportunity {
  const metadata = imp as ImportedOpportunity & Partial<Pick<Opportunity, "topics" | "skills" | "education_stages">>;
  return {
    id: imp.id,
    created_by: imp.created_by,
    title: imp.title,
    organizer: imp.organizer,
    category: imp.category,
    summary: imp.summary,
    source_url: imp.source_url,
    location: imp.location,
    participation_mode: imp.participation_mode,
    funding_description: imp.funding_description,
    funding_kind: imp.funding_kind,
    deadline: imp.deadline,
    timezone_known: imp.deadline_timezone_known,
    source_content: imp.source_content,
    retrieved_at: imp.extracted_at,
    source_status: imp.source_status,
    requirements: imp.requirements && imp.requirements.length > 0 ? {
      items: imp.requirements,
      application_questions: imp.application_questions,
      required_documents: imp.required_documents,
      application_steps: imp.application_steps,
    } : null,
    status: imp.status,
    is_demo: imp.is_demo ?? false,
    updated_at: imp.updated_at,
    source_label: imp.source_label,
    deadline_timezone: imp.deadline_timezone,
    deadline_timezone_known: imp.deadline_timezone_known,
    deadline_raw_text: imp.deadline_raw_text,
    funding_amount_min: imp.funding_amount_min,
    funding_amount_max: imp.funding_amount_max,
    funding_currency: imp.funding_currency,
    funding_conditional: imp.funding_conditional,
    application_questions: imp.application_questions,
    required_documents: imp.required_documents,
    application_steps: imp.application_steps,
    topics: metadata.topics || [imp.category || "internship"],
    skills: metadata.skills || imp.requirements?.filter((r) => r.type === "skill").map((r) => r.comparison_rule?.value ? String(r.comparison_rule.value) : r.text) || [],
    education_stages: metadata.education_stages || ["undergraduate"],
    created_at: imp.created_at,
  };
}

// State — unified canonical opportunity collection
let _profile: Profile = { ...DEMO_PROFILE };
let _evidence: ProfileEvidence[] = [...DEMO_EVIDENCE];
const _opportunities: Opportunity[] = [
  ...DEMO_OPPORTUNITIES,
  ...DEMO_REAL_OPPORTUNITIES.map(importedToOpportunity),
];
const _realOpportunities: ImportedOpportunity[] = [...DEMO_REAL_OPPORTUNITIES];
let _applications: Application[] = [...DEMO_APPLICATIONS];
let _tasks: ApplicationTask[] = [...DEMO_TASKS];
let _answers: ApplicationAnswer[] = [...DEMO_ANSWERS];
const _analyses: OpportunityAnalysis[] = [];
let _profileInsight: ProfileInsight | null = null;
const _scoutRuns: ScoutRun[] = [];
let _savedSearches: SavedSearch[] = [];
const _feedback: RecommendationFeedback[] = [];
let _evidenceLinks: ApplicationEvidenceLink[] = [];
let _notifications: NotificationItem[] = [
  {
    id: "demo-notif-1",
    user_id: DEMO_USER_ID,
    title: "New Exceptional Match: Google Summer of Code",
    message: "Scout matched GSoC with 94% fit based on your Python and Open Source profile facts.",
    type: "new_match",
    link_url: "/opportunities/c1000000-0000-4000-8000-000000000001",
    is_read: false,
    metadata: { match_tier: "exceptional", days_remaining: 20 },
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "demo-notif-2",
    user_id: DEMO_USER_ID,
    title: "Deadline Alert: Mitacs Globalink in 7 days",
    message: "Application deadline is approaching on September 22. Your project proposal is still in draft.",
    type: "deadline",
    link_url: "/workspace",
    is_read: false,
    metadata: { urgency: "high", days_remaining: 7 },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];
let _notificationPreferences: NotificationPreference = {
  user_id: DEMO_USER_ID,
  in_app_enabled: true,
  email_enabled: true,
  push_enabled: false,
      frequency: "instant",
      digest_day: 0,
      digest_time: '09:00',
  timezone: "UTC",
  deadline_reminder_days: [7, 3, 1],
  updated_at: new Date().toISOString(),
};
let _pushSubscriptions: PushSubscriptionRecord[] = [];

function uid() {
  return `demo-gen-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// Profile
export const demoStore = {
  getProfile: () => ({ ...structuredClone(_profile) }),
  updateProfile: (updates: Partial<Profile>) => {
    _profile = { ..._profile, ...updates, updated_at: new Date().toISOString() };
    return { ..._profile };
  },

  // Evidence
  getEvidence: () => structuredClone(_evidence),
  addEvidence: (ev: Omit<ProfileEvidence, "id" | "user_id" | "created_at" | "updated_at">) => {
    const item: ProfileEvidence = {
      ...ev,
      id: uid(),
      user_id: DEMO_USER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    _evidence = [item, ..._evidence];
    return item;
  },
  updateEvidence: (id: string, updates: Partial<ProfileEvidence>) => {
    _evidence = _evidence.map((e) =>
      e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
    );
    return _evidence.find((e) => e.id === id);
  },
  deleteEvidence: (id: string) => {
    _evidence = _evidence.filter((e) => e.id !== id);
  },

  // Canonical Opportunities
  getOpportunities: (): Opportunity[] => structuredClone(_opportunities),
  getOpportunity: (id: string): Opportunity | null => {
    const found = _opportunities.find((o) => o.id === id);
    if (found) return found;
    const real = _realOpportunities.find((o) => o.id === id);
    if (real) return importedToOpportunity(real);
    return null;
  },
  addOpportunity: (opp: Partial<Opportunity> & { title: string }) => {
    const fullOpp: Opportunity = {
      id: opp.id ?? uid(),
      created_by: opp.created_by ?? null,
      title: opp.title,
      organizer: opp.organizer ?? null,
      category: opp.category ?? "other",
      summary: opp.summary ?? null,
      location: opp.location ?? null,
      participation_mode: opp.participation_mode ?? "remote",
      deadline: opp.deadline ?? null,
      timezone_known: opp.timezone_known ?? false,
      source_content: opp.source_content ?? null,
      retrieved_at: opp.retrieved_at ?? new Date().toISOString(),
      source_status: opp.source_status ?? "unknown",
      requirements: opp.requirements ?? null,
      status: opp.status ?? "published",
      is_demo: opp.is_demo ?? false,
      updated_at: opp.updated_at ?? new Date().toISOString(),
      source_label: opp.source_label ?? "user_provided",
      source_url: opp.source_url ?? null,
      deadline_timezone: opp.deadline_timezone ?? null,
      deadline_timezone_known: opp.deadline_timezone_known ?? false,
      deadline_raw_text: opp.deadline_raw_text ?? null,
      funding_kind: opp.funding_kind ?? "unknown",
      funding_description: opp.funding_description ?? null,
      funding_amount_min: opp.funding_amount_min ?? null,
      funding_amount_max: opp.funding_amount_max ?? null,
      funding_currency: opp.funding_currency ?? null,
      funding_conditional: opp.funding_conditional ?? false,
      application_questions: opp.application_questions ?? [],
      required_documents: opp.required_documents ?? [],
      application_steps: opp.application_steps ?? [],
      created_at: opp.created_at ?? new Date().toISOString(),
    };
    _opportunities.unshift(fullOpp);
    return fullOpp;
  },

  // Applications
  getApplications: () => structuredClone(_applications),
  getApplication: (id: string) => _applications.find((a) => a.id === id) ?? null,
  getApplicationByOpportunity: (oppId: string) =>
    _applications.find((a) => a.opportunity_id === oppId) ?? null,
  createApplication: (oppId: string) => {
    const existing = _applications.find((a) => a.opportunity_id === oppId);
    if (existing) return existing;
    const app: Application = {
      id: uid(),
      user_id: DEMO_USER_ID,
      opportunity_id: oppId,
      stage: "saved",
      next_action: null,
      target_date: null,
      notes: null,
      submitted_at: null,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    _applications = [app, ..._applications];
    return app;
  },
  updateApplication: (id: string, updates: Partial<Application>) => {
    _applications = _applications.map((a) =>
      a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a
    );
    return _applications.find((a) => a.id === id);
  },
  deleteApplication: (id: string) => {
    _applications = _applications.filter((a) => a.id !== id);
    _tasks = _tasks.filter((t) => t.application_id !== id);
    _answers = _answers.filter((an) => an.application_id !== id);
  },

  // Tasks
  getTasks: (applicationId: string) => structuredClone(_tasks.filter((t) => t.application_id === applicationId)),
  addTask: (applicationId: string, title: string, dueDate?: string) => {
    const task: ApplicationTask = {
      id: uid(),
      application_id: applicationId,
      user_id: DEMO_USER_ID,
      title,
      completed: false,
      due_date: dueDate ?? null,
      sort_order: Date.now(),
      pinned_to_today: false,
      source_required: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    _tasks = [..._tasks, task];
    return task;
  },
  toggleTask: (id: string) => {
    _tasks = _tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed, updated_at: new Date().toISOString() } : t
    );
    return _tasks.find((t) => t.id === id);
  },
  updateTask: (id: string, updates: Partial<ApplicationTask>) => {
    _tasks = _tasks.map((task) => task.id === id ? { ...task, ...updates, updated_at: new Date().toISOString() } : task);
    return _tasks.find((task) => task.id === id);
  },
  deleteTask: (id: string) => {
    _tasks = _tasks.filter((t) => t.id !== id);
  },

  // Answers
  getAnswers: (applicationId: string) => structuredClone(_answers.filter((a) => a.application_id === applicationId)),
  upsertAnswer: (applicationId: string, question: string, answerDraft: string, answerIdOrNew?: string) => {
    const existing = _answers.find((a) => a.id === answerIdOrNew && a.application_id === applicationId);
    if (existing) {
      _answers = _answers.map((a) =>
        a.id === existing.id
          ? { ...a, answer_draft: answerDraft, revised_at: new Date().toISOString() }
          : a
      );
      return _answers.find((a) => a.id === existing.id);
    }
    const answer: ApplicationAnswer = {
      id: uid(),
      application_id: applicationId,
      user_id: DEMO_USER_ID,
      question,
      answer_draft: answerDraft,
      evidence_ids: [],
      revised_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    _answers = [..._answers, answer];
    return answer;
  },
  deleteAnswer: (id: string) => {
    _answers = _answers.filter((a) => a.id !== id);
  },

  // Imported Opportunities (Prompt 2 compatibility layer)
  getImportedOpportunities: () => structuredClone(_realOpportunities),
  getImportedOpportunity: (id: string) =>
    _realOpportunities.find((o) => o.id === id) ??
    (_opportunities.find((o) => o.id === id) as unknown as ImportedOpportunity) ??
    null,
  addImportedOpportunity: (opp: Omit<ImportedOpportunity, "id" | "created_at" | "updated_at">) => {
    const createdId = uid();
    const now = new Date().toISOString();
    const item: ImportedOpportunity = {
      ...opp,
      id: createdId,
      created_at: now,
      updated_at: now,
    };
    _realOpportunities.push(item);
    _opportunities.unshift(importedToOpportunity(item));
    return item;
  },
  updateImportedOpportunity: (id: string, updates: Partial<ImportedOpportunity>) => {
    const idx = _realOpportunities.findIndex((o) => o.id === id);
    if (idx >= 0) {
      _realOpportunities[idx] = {
        ..._realOpportunities[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      const canonicalIdx = _opportunities.findIndex((o) => o.id === id);
      if (canonicalIdx >= 0) {
        _opportunities[canonicalIdx] = importedToOpportunity(_realOpportunities[idx]);
      }
      return _realOpportunities[idx];
    }
    const canonicalIdx = _opportunities.findIndex((o) => o.id === id);
    if (canonicalIdx >= 0) {
      const existing = _opportunities[canonicalIdx];
      const reqUpdates = updates.requirements
        ? (Array.isArray(updates.requirements) ? { items: updates.requirements } : updates.requirements as Record<string, unknown>)
        : existing.requirements;

      _opportunities[canonicalIdx] = {
        ...existing,
        ...updates,
        requirements: reqUpdates,
        updated_at: new Date().toISOString(),
      };
      return _opportunities[canonicalIdx] as unknown as ImportedOpportunity;
    }
    return null;
  },

  // All opportunities for discover feed
  getAllOpportunities: () => structuredClone(_opportunities),

  // Analyses
  getAnalyses: (opportunityId: string) =>
    structuredClone(_analyses.filter((a) => a.opportunity_id === opportunityId)),
  getAnalysisForUser: (opportunityId: string) =>
    _analyses.find((a) => a.opportunity_id === opportunityId) ?? null,
  saveAnalysis: (analysis: Omit<OpportunityAnalysis, "id" | "created_at">) => {
    const existing = _analyses.findIndex(
      (a) => a.opportunity_id === analysis.opportunity_id && a.user_id === analysis.user_id
    );
    const item: OpportunityAnalysis = {
      ...analysis,
      id: uid(),
      created_at: new Date().toISOString(),
    };
    if (existing >= 0) {
      _analyses[existing] = item;
    } else {
      _analyses.push(item);
    }
    return item;
  },

  // Profile Insights
  getProfileInsight: () => _profileInsight ? structuredClone(_profileInsight) : null,
  saveProfileInsight: (insight: Omit<ProfileInsight, "id" | "created_at">) => {
    _profileInsight = {
      ...insight,
      id: uid(),
      created_at: new Date().toISOString(),
    };
    return structuredClone(_profileInsight);
  },

  // Scout Runs
  getScoutRuns: () => structuredClone(_scoutRuns),
  addScoutRun: (run: Omit<ScoutRun, "id" | "created_at">) => {
    const item: ScoutRun = {
      ...run,
      id: uid(),
      created_at: new Date().toISOString(),
    };
    _scoutRuns.unshift(item);
    return structuredClone(item);
  },

  // Saved Searches
  getSavedSearches: () => structuredClone(_savedSearches),
  addSavedSearch: (search: Omit<SavedSearch, "id" | "created_at">) => {
    const item: SavedSearch = {
      ...search,
      id: uid(),
      created_at: new Date().toISOString(),
    };
    _savedSearches.unshift(item);
    return structuredClone(item);
  },
  deleteSavedSearch: (id: string) => {
    _savedSearches = _savedSearches.filter((s) => s.id !== id);
  },

  // Recommendation Feedback
  getFeedback: () => structuredClone(_feedback),
  addFeedback: (fb: Omit<RecommendationFeedback, "id" | "created_at">) => {
    const item: RecommendationFeedback = {
      ...fb,
      id: uid(),
      created_at: new Date().toISOString(),
    };
    _feedback.push(item);
    return structuredClone(item);
  },

  // Evidence Links
  getEvidenceLinks: (applicationId?: string) => {
    if (!applicationId) return structuredClone(_evidenceLinks);
    return structuredClone(_evidenceLinks.filter((l) => l.application_id === applicationId));
  },
  addEvidenceLink: (link: Omit<ApplicationEvidenceLink, "id" | "created_at">) => {
    const item: ApplicationEvidenceLink = {
      ...link,
      id: uid(),
      created_at: new Date().toISOString(),
    };
    _evidenceLinks.push(item);
    return structuredClone(item);
  },
  deleteEvidenceLink: (id: string) => {
    _evidenceLinks = _evidenceLinks.filter((l) => l.id !== id);
  },

  // Notifications Inbox
  getNotifications: (userId?: string) => structuredClone(_notifications),
  addNotification: (notif: Omit<NotificationItem, "id" | "created_at" | "is_read">) => {
    const item: NotificationItem = {
      ...notif,
      id: uid(),
      is_read: false,
      created_at: new Date().toISOString(),
    };
    _notifications.unshift(item);
    return structuredClone(item);
  },
  markNotificationAsRead: (id: string) => {
    _notifications = _notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
  },
  markAllNotificationsAsRead: (userId?: string) => {
    _notifications = _notifications.map((n) => ({ ...n, is_read: true }));
  },

  // Notification Preferences
  getNotificationPreferences: (userId?: string) => structuredClone(_notificationPreferences),
  updateNotificationPreferences: (updates: Partial<NotificationPreference>) => {
    _notificationPreferences = {
      ..._notificationPreferences,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return structuredClone(_notificationPreferences);
  },

  // Web Push Subscriptions
  getPushSubscriptions: (userId?: string) => structuredClone(_pushSubscriptions),
  addPushSubscription: (sub: Omit<PushSubscriptionRecord, "id" | "created_at">) => {
    const item: PushSubscriptionRecord = {
      ...sub,
      id: uid(),
      created_at: new Date().toISOString(),
    };
    _pushSubscriptions.push(item);
    return structuredClone(item);
  },
  removePushSubscription: (endpoint: string) => {
    _pushSubscriptions = _pushSubscriptions.filter((s) => s.endpoint !== endpoint);
  },
};
