"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Application, Opportunity, ApplicationTask, ApplicationAnswer, ImportedOpportunity, ProfileEvidence, Profile
} from "@/types/database";
import { formatDeadline, stageLabel, stageColor, formatDate } from "@/lib/utils";
import { generateOpportunityContext } from "@/lib/contextExport";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { PreparationChecklist } from '@/components/adventure/PreparationChecklist';
import { createAutosave } from '@/lib/autosave';
import { FolderOpen } from "lucide-react";

const STAGES = ["saved", "preparing", "submitted", "selected", "rejected", "withdrawn"];
const TABS = ["Overview", "Checklist", "Answers", "Notes"];

function convertImportedToOpp(imp: ImportedOpportunity): Opportunity {
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
    requirements: imp.requirements.length > 0 ? { items: imp.requirements } : null,
    status: imp.status,
    is_demo: false,
    updated_at: imp.updated_at,
  };
}

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [answers, setAnswers] = useState<ApplicationAnswer[]>([]);
  const [evidence, setEvidence] = useState<ProfileEvidence[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [saving, setSaving] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editingAnswerText, setEditingAnswerText] = useState("");
  const [exportFormat, setExportFormat] = useState<"markdown" | "json">("markdown");
  const [exportText, setExportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [notesStatus, setNotesStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const applicationId = app?.id;
  const notesSave = useMemo(() => createAutosave<{ notes: string }>(async updates => {
    if (!applicationId) throw new Error('Application unavailable.');
    const { createClient } = await import('@/lib/db/client');
    const { data, error } = await createClient().from('applications').update(updates).eq('id', applicationId).select('id').maybeSingle();
    if (error || !data) throw new Error('Notes could not be saved.');
  }, setNotesStatus), [applicationId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (notesSave.hasPending()) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); void notesSave.flush(); };
  }, [notesSave]);

  useEffect(() => {
    if (!id) return;
    import("@/lib/db/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) {
          setLoading(false);
          return;
        }
        try {
          const results = await Promise.all([
            supabase.from("applications").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
            supabase.from("application_tasks").select("*").eq("application_id", id).eq("user_id", user.id),
            supabase.from("application_answers").select("*").eq("application_id", id).eq("user_id", user.id),
            supabase.from("profile_evidence").select("*").eq("user_id", user.id),
            supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          ]);
          for (const result of results) if (result.error) throw result.error;
          const [{ data: appData }, { data: tasksData }, { data: answersData }, { data: evidenceData }, { data: profileData }] = results;
          setProfile(profileData);
          if (!appData) {
            setLoading(false);
            return;
          }
          setApp(appData);
          setNotes(appData.notes ?? "");
          setNextAction(appData.next_action ?? "");
          setTargetDate(appData.target_date ?? "");

          const { data: oppData } = await supabase.from("opportunities").select("*").eq("id", appData.opportunity_id).maybeSingle();
          setOpp(oppData);
          setTasks(tasksData ?? []);
          setAnswers(answersData ?? []);
          setEvidence(evidenceData ?? []);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Your application could not be loaded.");
        } finally {
          setLoading(false);
        }
      });
    });
  }, [id]);

  function handleNotesChange(val: string) {
    setNotes(val);
    notesSave.update({ notes: val });
  }

  async function saveMetadata() {
    if (!app) return;
    setSaving(true);
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("applications")
      .update({ next_action: nextAction || null, target_date: targetDate || null })
      .eq("id", app.id)
      .select()
      .single();
    if (data) setApp(data);
    setSaving(false);
  }

  async function changeStage(stage: string) {
    if (!app) return;
    if (stage === "submitted" && !window.confirm("Mark this submitted only if you completed the external application. This does not submit anything for you.")) return;
    if (["selected", "rejected", "withdrawn"].includes(stage) && !window.confirm(`Record this application as ${stage}?`)) return;
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("applications")
      .update({
        stage,
        submitted_at: stage === "submitted" ? new Date().toISOString() : app.submitted_at,
      })
      .eq("id", app.id)
      .select()
      .single();
    if (data) setApp(data);
  }

  async function addTask() {
    if (!newTaskTitle.trim() || !app) return;
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("application_tasks")
      .insert({ application_id: app.id, user_id: user.id, title: newTaskTitle.trim(), due_date: newTaskDue || null })
      .select()
      .single();
    if (data) { setTasks((prev) => [...prev, data]); setNewTaskTitle(""); setNewTaskDue(""); }
  }

  async function toggleTask(taskId: string) {
    const task = tasks.find(item => item.id === taskId); if (!task) return;
    const response = await fetch('/api/applications/progress', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_id: taskId, completed: !task.completed }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || 'Checklist could not be saved.'); throw new Error(result.error || 'Checklist could not be saved.'); }
    setTasks(previous => previous.map(item => item.id === taskId ? result.task : item));
    setError(null); window.dispatchEvent(new Event('elara:progress'));
  }

  async function deleteTask(taskId: string) {
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();
    await supabase.from("application_tasks").delete().eq("id", taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function addAnswer() {
    if (!newQuestion.trim() || !app) return;
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("application_answers")
      .insert({ application_id: app.id, user_id: user.id, question: newQuestion.trim(), answer_draft: "" })
      .select()
      .single();
    if (data) { setAnswers((prev) => [...prev, data]); setNewQuestion(""); }
  }

  async function saveAnswer(answerId: string, text: string) {
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();
    await supabase.from("application_answers").update({ answer_draft: text, revised_at: new Date().toISOString() }).eq("id", answerId);
    setAnswers((prev) => prev.map((a) => a.id === answerId ? { ...a, answer_draft: text, revised_at: new Date().toISOString() } : a));
    setEditingAnswerId(null);
    if (text.length > 10) {
      const { trackEvent } = await import("@/lib/analytics");
      if (profile) await trackEvent(profile.id, "first_draft_saved");
    }
  }

  async function deleteAnswer(answerId: string) {
    const { createClient } = await import("@/lib/db/client");
    const supabase = createClient();
    await supabase.from("application_answers").delete().eq("id", answerId);
    setAnswers((prev) => prev.filter((a) => a.id !== answerId));
  }

  async function toggleEvidence(answer: ApplicationAnswer, evidenceId: string) {
    const evidenceIds = answer.evidence_ids.includes(evidenceId) ? answer.evidence_ids.filter((id) => id !== evidenceId) : [...answer.evidence_ids, evidenceId];
    setAnswers((prev) => prev.map((item) => item.id === answer.id ? { ...item, evidence_ids: evidenceIds } : item));
    const { createClient } = await import("@/lib/db/client");
    const { error } = await createClient().from("application_answers").update({ evidence_ids: evidenceIds, revised_at: new Date().toISOString() }).eq("id", answer.id).eq("user_id", answer.user_id);
    if (error) setAnswers((prev) => prev.map((item) => item.id === answer.id ? answer : item));
  }

  async function togglePinnedTask(task: ApplicationTask) {
    const pinned_to_today = !task.pinned_to_today;
    setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, pinned_to_today } : item));
    const { createClient } = await import("@/lib/db/client");
    const { error } = await createClient().from("application_tasks").update({ pinned_to_today }).eq("id", task.id).eq("user_id", task.user_id);
    if (error) setTasks((prev) => prev.map((item) => item.id === task.id ? task : item));
  }

  function generateExport() {
    if (!opp || !app || !profile) return;
    const text = generateOpportunityContext(opp, profile, [], answers, null, {
      includeOpportunityDetails: true,
      includeRequirements: true,
      includeProfile: true,
      includeEvidence: false,
      includeAnswers: true,
      includeEligibility: false,
      format: exportFormat,
    });
    setExportText(text);
  }

  async function handleCopyExport() {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (!profile) return;
    const { trackEvent } = await import("@/lib/analytics");
    await trackEvent(profile.id, "context_exported");
  }

  function handleDownloadExport() {
    if (!exportText) return;
    const blob = new Blob([exportText], { type: exportFormat === "json" ? "application/json" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `application-context-${opp?.title?.replace(/\s+/g, "-").toLowerCase() ?? "unknown"}.${exportFormat === "json" ? "json" : "md"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <PageLoader />;
  if (!app || !opp) {
    return (
      <div className="text-center py-16">
        <FolderOpen size={40} strokeWidth={1.25} className="mx-auto mb-3 text-gray-300" />
        <h1 className="text-xl font-semibold text-gray-700">{error ? 'Your application could not be loaded' : 'Application not found'}</h1>{error && <p role="alert">{error}</p>}
        <Link href="/workspace" className="btn btn-secondary btn-sm mt-4">← Back to workspace</Link>
      </div>
    );
  }

  const completedTasks = tasks.filter((t) => t.completed).length;

  return (
    <div className="page-frame">
      {/* Header */}
      <div>
        <Link href="/workspace" className="text-sm font-medium text-[var(--primary)] hover:underline mb-2 inline-block">← Back to workspace</Link>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`badge text-xs ${stageColor(app.stage)}`}>{stageLabel(app.stage)}</span>
              {opp.is_demo && <span className="badge bg-yellow-50 text-yellow-700 text-xs">Demo</span>}
            </div>
            <h1 className="page-title text-xl leading-snug">{opp.title}</h1>
            {opp.organizer && <p className="text-sm text-[var(--muted)]">{opp.organizer}</p>}
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 min-w-0 sm:shrink-0">
            <div className="text-sm text-[var(--muted)]">Deadline: <span className="font-medium text-[var(--ink)]">{formatDeadline(opp.deadline)}</span></div>
            {opp.source_url && (
              <a href={opp.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                Original source ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {tab === "Overview" && <PreparationChecklist opportunity={opp} tasks={tasks} onStarted={updated => { setTasks(updated); setApp(previous => previous && previous.stage === 'saved' ? { ...previous, stage: 'preparing' } : previous); }} onToggle={toggleTask}/>}
      {/* Stage changer */}
      <div className="card p-5 border-2 border-[var(--line)] rounded-2xl shadow-[0_3px_0_#E3E7EA] bg-white">
        <div className="text-xs font-black text-[var(--muted)] uppercase tracking-wider mb-2.5">Update Stage</div>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => changeStage(s)}
              className={`btn btn-sm font-black capitalize ${app.stage === s ? "btn-primary" : "btn-secondary"}`}
            >
              {stageLabel(s)}
            </button>
          ))}
        </div>
        {app.submitted_at && (
          <div className="text-xs font-semibold text-[var(--muted)] mt-2.5">Submitted: {formatDate(app.submitted_at)}</div>
        )}
      </div>

      {/* Tabs */}
      <div className="p-1.5 rounded-2xl bg-[var(--canvas)] border-2 border-[var(--line)] inline-flex gap-1.5 overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer border-2 ${
              tab === t
                ? "bg-[#EEFFD9] text-[#287300] border-[#58CC02] shadow-[0_2px_0_#58CC02]"
                : "bg-white text-[var(--muted)] border-transparent hover:border-[var(--line)]"
            }`}
          >
            {t}
            {t === "Checklist" && tasks.length > 0 && (
              <span className="ml-1.5 text-xs font-black px-1.5 py-0.5 rounded-full bg-white text-[var(--ink)] border border-[var(--line)]">{completedTasks}/{tasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "Overview" && (
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div>
              <label className="label" htmlFor="next-action">Next Action</label>
              <input
                id="next-action"
                type="text"
                className="input"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="What do you need to do next?"
              />
            </div>
            <div>
              <label className="label" htmlFor="target-date">Personal Target Date</label>
              <input
                id="target-date"
                type="date"
                className="input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
              <p className="form-hint">Optional personal target date (different from the official deadline).</p>
            </div>
            <button onClick={saveMetadata} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{tasks.length}</div>
              <div className="text-xs text-gray-500">Total tasks</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{answers.length}</div>
              <div className="text-xs text-gray-500">Answers</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{answers.filter((a) => a.answer_draft && a.answer_draft.length > 10).length}</div>
              <div className="text-xs text-gray-500">Drafted</div>
            </div>
          </div>

          {/* Export Context */}
          <div className="card p-4 space-y-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Export Context</div>
            <p className="text-xs text-gray-500">Generate a portable context pack for this application to paste into any AI assistant.</p>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => { setExportFormat("markdown"); setExportText(""); }}
                  className={`btn btn-sm ${exportFormat === "markdown" ? "btn-primary" : "btn-secondary"}`}
                >
                  Markdown
                </button>
                <button
                  onClick={() => { setExportFormat("json"); setExportText(""); }}
                  className={`btn btn-sm ${exportFormat === "json" ? "btn-primary" : "btn-secondary"}`}
                >
                  JSON
                </button>
              </div>
              <button onClick={generateExport} className="btn btn-primary btn-sm">Generate</button>
            </div>
            {exportText && (
              <div className="space-y-2">
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap border border-gray-200">
                  {exportText}
                </pre>
                <div className="flex gap-2">
                  <button onClick={handleCopyExport} className="btn btn-primary btn-sm">{copied ? "Copied!" : "Copy"}</button>
                  <button onClick={handleDownloadExport} className="btn btn-secondary btn-sm">Download</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Checklist */}
      {tab === "Checklist" && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-sm text-gray-400 italic mb-3">No tasks yet. Add one below or generate from application steps.</div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="card p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onChange={() => { void toggleTask(task.id).catch(() => {}); }}
                    className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)] text-[var(--primary)]"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={`task-${task.id}`}
                      className={`text-sm cursor-pointer ${task.completed ? "line-through text-[var(--muted)]" : "text-[var(--ink)]"}`}
                    >
                      {task.title}
                    </label>
                    {task.due_date && (
                      <div className="text-xs text-[var(--muted)]">Due {formatDate(task.due_date)}</div>
                    )}
                    {task.source_required && <div className="text-xs font-medium text-[var(--primary)]">Source-required task</div>}
                  </div>
                  <button onClick={() => togglePinnedTask(task)} className={`btn btn-sm ${task.pinned_to_today ? "btn-primary" : "btn-secondary"}`}>{task.pinned_to_today ? "On Today" : "Pin to Today"}</button>
                  <button onClick={() => deleteTask(task.id)} className="text-[var(--muted)] hover:text-red-500 text-lg" aria-label="Delete task">×</button>
                </li>
              ))}
            </ul>
          )}

          {/* Auto-generate from application steps */}
          {opp && (() => {
            const steps = getApplicationSteps(opp);
            if (steps.length === 0) return null;
            const existingTitles = new Set(tasks.map((t) => t.title.toLowerCase()));
            const missingSteps = steps.filter((s) => !existingTitles.has(s.toLowerCase()));
            if (missingSteps.length === 0) return null;
            return (
              <div className="card p-4 border-[var(--primary-border)] bg-[var(--primary-subtle)]">
                <div className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide mb-2">Suggested tasks from application steps</div>
                <div className="space-y-1.5">
                  {missingSteps.map((step, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--ink)]">{step}</span>
                      <button
                        onClick={async () => {
                          const { createClient } = await import("@/lib/db/client");
                          const supabase = createClient();
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;
                          const { data } = await supabase
                            .from("application_tasks")
                            .insert({ application_id: app!.id, user_id: user.id, title: step, source_required: true })
                            .select()
                            .single();
                          if (data) setTasks((prev) => [...prev, data]);
                        }}
                        className="btn btn-sm btn-primary"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={async () => {
                      for (const step of missingSteps) {
                          const { createClient } = await import("@/lib/db/client");
                          const supabase = createClient();
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;
                          const { data } = await supabase
                            .from("application_tasks")
                            .insert({ application_id: app!.id, user_id: user.id, title: step, source_required: true })
                            .select()
                            .single();
                          if (data) setTasks((prev) => [...prev, data]);
                      }
                    }}
                    className="btn btn-secondary btn-sm mt-2"
                  >
                    Add all steps as tasks
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="card p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Task</div>
            <input
              id="new-task-title"
              type="text"
              className="input"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title"
              onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
            />
            <input
              id="new-task-due"
              type="date"
              className="input"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
            />
            <button onClick={addTask} className="btn btn-primary btn-sm">Add task</button>
          </div>
        </div>
      )}

      {/* Tab: Answers */}
      {tab === "Answers" && (
        <div className="space-y-4">
          {answers.length === 0 ? (
            <div className="text-sm text-gray-400 italic">No questions yet. Add one below.</div>
          ) : (
            answers.map((ans) => (
              <div key={ans.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-gray-800">{ans.question}</div>
                  <button onClick={() => deleteAnswer(ans.id)} className="text-gray-300 hover:text-red-500 text-lg shrink-0" aria-label="Delete answer">×</button>
                </div>
                {editingAnswerId === ans.id ? (
                  <div className="space-y-2">
                    <textarea
                      id={`answer-edit-${ans.id}`}
                      className="input textarea"
                      value={editingAnswerText}
                      onChange={(e) => setEditingAnswerText(e.target.value)}
                      rows={5}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveAnswer(ans.id, editingAnswerText)} className="btn btn-primary btn-sm">Save</button>
                      <button onClick={() => setEditingAnswerId(null)} className="btn btn-secondary btn-sm">Cancel</button>
                    </div>
                    <div className="soft-panel p-3">
                      <div className="text-xs font-medium text-gray-700">Supporting profile evidence</div>
                      <p className="text-xs text-gray-500 mt-1">Attaching evidence is a reference; it never overwrites your draft or guarantees correctness.</p>
                      <div className="flex flex-wrap gap-2 mt-2">{evidence.map((item) => <button key={item.id} onClick={() => toggleEvidence(ans, item.id)} className={`tag ${ans.evidence_ids.includes(item.id) ? "bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary-border)] font-medium" : ""}`}>{ans.evidence_ids.includes(item.id) ? "✓ " : ""}{item.title}</button>)}</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {ans.answer_draft || <em className="text-gray-400">No draft yet.</em>}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => { setEditingAnswerId(ans.id); setEditingAnswerText(ans.answer_draft ?? ""); }}
                        className="btn btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                      {ans.revised_at && (
                        <span className="text-xs text-gray-400">Revised {formatDate(ans.revised_at)}</span>
                      )}
                    </div>
                    {ans.evidence_ids.length > 0 && <div className="text-xs text-gray-500 mt-2">Evidence: {ans.evidence_ids.map((id) => evidence.find((item) => item.id === id)?.title).filter(Boolean).join(", ")}</div>}
                  </div>
                )}
              </div>
            ))
          )}
          <div className="card p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Question</div>
            <input
              id="new-question"
              type="text"
              className="input"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="e.g. Why do you want to join this program?"
              onKeyDown={(e) => { if (e.key === "Enter") addAnswer(); }}
            />
            <button onClick={addAnswer} className="btn btn-primary btn-sm">Add question</button>
          </div>
        </div>
      )}

      {/* Tab: Notes */}
      {tab === "Notes" && (
        <div className="space-y-3">
          <p role={notesStatus === 'error' ? 'alert' : 'status'} className="adventure-note">
            {notesStatus === 'saving' ? 'Saving notes…' : notesStatus === 'error' ? 'Notes could not be saved. Your edits are still here.' : 'Notes saved automatically.'}
            {notesStatus === 'error' && <button className="btn btn-secondary btn-sm ml-2" onClick={() => notesSave.retry()}>Retry saving</button>}
          </p>
          <textarea
            id="application-notes"
            className="input textarea w-full"
            rows={12}
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Jot down your research, thoughts, contacts, or anything relevant to this application…"
          />
        </div>
      )}
    </div>
  );
}

function getApplicationSteps(opp: Opportunity): string[] {
  if (opp.requirements && typeof opp.requirements === "object") {
    const reqs = opp.requirements as Record<string, unknown>;
    if (Array.isArray(reqs.application_steps)) return reqs.application_steps as string[];
  }
  return [];
}
