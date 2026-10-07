"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronDown, ChevronUp, ClipboardList, Sparkles, ArrowRight, FolderKanban, UserCheck, Compass } from "lucide-react";
import { daysUntilDeadline, formatDeadline } from "@/lib/utils";
import type { ApplicationTask, ApplicationWithOpportunity, WorkspacePreferences, Profile } from "@/types/database";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

type TodayTask = ApplicationTask & { application: ApplicationWithOpportunity };

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string | null>(null);
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [apps, setApps] = useState<ApplicationWithOpportunity[]>([]);
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [focus, setFocus] = useState("");
  const [savingFocus, setSavingFocus] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { createClient } = await import("@/lib/db/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const [
          { data: profileData },
          { data: applicationData },
          { data: taskData },
          { data: preferences },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("applications").select("*, opportunities(*)").eq("user_id", user.id),
          supabase.from("application_tasks").select("*").eq("user_id", user.id),
          supabase.from("workspace_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        ]);

        const records = (applicationData ?? []) as ApplicationWithOpportunity[];
        setName(profileData?.display_name ?? null);
        setProfile(profileData ?? null);
        setApps(records);
        setFocus((preferences as WorkspacePreferences | null)?.weekly_focus ?? "");
        setTasks(
          (taskData ?? []).flatMap((task) => {
            const application = records.find((item) => item.id === task.application_id);
            return application ? [{ ...task, application } as TodayTask] : [];
          })
        );
      } catch (err) {
        console.error("Error loading home page:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const nextTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.pinned_to_today || (!task.completed && task.due_date))
        .sort((a, b) => a.sort_order - b.sort_order),
    [tasks]
  );

  const activeApps = useMemo(
    () => apps.filter((app) => ["saved", "preparing", "submitted"].includes(app.stage)),
    [apps]
  );

  const preparingApps = useMemo(
    () => apps.filter((app) => app.stage === "preparing"),
    [apps]
  );

  const deadlines = useMemo(
    () =>
      activeApps
        .filter((app) => app.opportunities?.deadline)
        .sort(
          (a, b) =>
            new Date(a.opportunities.deadline!).getTime() -
            new Date(b.opportunities.deadline!).getTime()
        )
        .slice(0, 4),
    [activeApps]
  );

  const completed = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  // Real profile completion calculation
  const missingProfileFields = useMemo(() => {
    if (!profile) return [];
    const fields: string[] = [];
    if (!profile.discovery_goal) fields.push("Discovery goal");
    if (!profile.education_stage) fields.push("Education stage");
    if (!profile.country_of_residence) fields.push("Country of residence");
    if (!profile.skills?.length) fields.push("Key skills");
    if (!profile.experience_summary) fields.push("Experience summary");
    return fields;
  }, [profile]);

  async function changeTask(task: TodayTask, updates: Partial<ApplicationTask>) {
    const { createClient } = await import("@/lib/db/client");
    const { error } = await createClient()
      .from("application_tasks")
      .update(updates)
      .eq("id", task.id)
      .eq("user_id", task.user_id);
    if (error) throw error;
  }

  async function toggleTask(task: TodayTask) {
    const previous = task.completed;
    setTasks((items) =>
      items.map((item) => (item.id === task.id ? { ...item, completed: !previous } : item))
    );
    setNotice(previous ? "Task reopened." : "Task completed!");
    try {
      await changeTask(task, { completed: !previous });
    } catch {
      setTasks((items) =>
        items.map((item) => (item.id === task.id ? { ...item, completed: previous } : item))
      );
      setNotice("Couldn’t save that change. Try again.");
    }
  }

  async function moveTask(task: TodayTask, direction: -1 | 1) {
    const index = nextTasks.findIndex((item) => item.id === task.id);
    const other = nextTasks[index + direction];
    if (!other) return;
    const oldOrder = task.sort_order;
    setTasks((items) =>
      items.map((item) =>
        item.id === task.id
          ? { ...item, sort_order: other.sort_order }
          : item.id === other.id
          ? { ...item, sort_order: oldOrder }
          : item
      )
    );
    try {
      await Promise.all([
        changeTask(task, { sort_order: other.sort_order }),
        changeTask(other, { sort_order: oldOrder }),
      ]);
    } catch {
      setTasks((items) =>
        items.map((item) =>
          item.id === task.id
            ? { ...item, sort_order: oldOrder }
            : item.id === other.id
            ? { ...item, sort_order: other.sort_order }
            : item
        )
      );
      setNotice("Couldn’t save the new order. Try again.");
    }
  }

  async function saveFocus() {
    setSavingFocus(true);
    try {
      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("workspace_preferences").upsert({
        user_id: user.id,
        weekly_focus: focus || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setNotice("Weekly focus saved.");
    } catch {
      setNotice("Couldn’t save focus. Try again.");
    } finally {
      setSavingFocus(false);
    }
  }

  if (loading) return <PageLoader />;

  // Prioritize primary action candidate:
  const primaryApp = preparingApps[0] || activeApps[0];

  return (
    <div className="page-frame max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <header className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b-2 border-[var(--line)]">
        <div>
          <span className="eyebrow">Today</span>
          <h1 className="page-title mt-1">
            {name ? `Welcome back, ${name.split(" ")[0]}.` : "Make the next step clear."}
          </h1>
          <p className="text-sm font-semibold text-[var(--muted)] mt-1">
            Your real application priorities, deadlines, and active tasks.
          </p>
        </div>

        <div className="action-row">
          <Link href="/discover" className="btn btn-primary">
            <Compass size={18} />
            <span>Discover Feed</span>
          </Link>
          <Link href="/workspace" className="btn btn-secondary">
            <FolderKanban size={18} />
            <span>Applications</span>
          </Link>
        </div>
      </header>

      {notice && (
        <div role="status" className="alert alert-success flex justify-between gap-3">
          <span>{notice}</span>
          <button className="text-sm underline font-bold" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* 1. HERO ACTION CARD — Immediate Next Step */}
      <section className="card p-6 sm:p-7 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#EEFFD9] text-[#287300] border-2 border-[#B7E885]">
              <Sparkles size={13} />
              <span>Recommended Next Action</span>
            </div>

            {primaryApp ? (
              <>
                <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">
                  Continue {primaryApp.opportunities.title}
                </h2>
                <p className="text-sm font-semibold text-[var(--muted)] leading-relaxed">
                  {primaryApp.next_action
                    ? `Next: ${primaryApp.next_action}`
                    : primaryApp.stage === "preparing"
                    ? "Complete your preparation checklist and review requirements before official submission."
                    : "Review opportunity details and prepare your application materials."}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-[var(--ink)] tracking-tight">
                  Discover opportunities that match your profile
                </h2>
                <p className="text-sm font-semibold text-[var(--muted)] leading-relaxed">
                  Explore scholarships, fellowships, and internships with requirement-level eligibility checks.
                </p>
              </>
            )}
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {primaryApp ? (
              <Link
                href={`/workspace/${primaryApp.id}`}
                className="btn btn-primary w-full sm:w-auto px-6 py-3.5 text-base tracking-wide flex items-center justify-center gap-2"
              >
                <span>Continue Application</span>
                <ArrowRight size={18} />
              </Link>
            ) : (
              <Link
                href="/discover"
                className="btn btn-primary w-full sm:w-auto px-6 py-3.5 text-base tracking-wide flex items-center justify-center gap-2"
              >
                <span>Browse Opportunities</span>
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 2. MAIN 2-COLUMN WORKSPACE: Tasks & Planning */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)] gap-6">
        {/* Left Column: Pinned Tasks & Next Steps */}
        <div className="card p-6 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--line)]">
            <div>
              <h2 className="section-title text-lg font-black">Today’s Preparation Tasks</h2>
              <p className="text-xs font-semibold text-[var(--muted)]">
                {tasks.length > 0
                  ? `${completed} of ${tasks.length} total tasks completed`
                  : "No active tasks yet"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--canvas)] border-2 border-[var(--line)] flex items-center justify-center text-[var(--primary)] font-bold shadow-[0_2px_0_#E3E7EA]">
              <ClipboardList size={20} />
            </div>
          </div>

          {nextTasks.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title="No tasks pinned for today."
              description="Save an opportunity and open its workspace checklist to pin preparation tasks here."
              action={
                <Link href="/discover" className="btn btn-primary btn-sm">
                  Find Opportunities
                </Link>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {nextTasks.slice(0, 6).map((task, index) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    task.completed
                      ? "bg-[#F7F9FA] border-[var(--line)] opacity-75"
                      : "bg-white border-[var(--line)] shadow-[0_2px_0_#E3E7EA] hover:border-[#1CB0F6]"
                  }`}
                >
                  <button
                    aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`}
                    onClick={() => toggleTask(task)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                      task.completed
                        ? "bg-[#58CC02] border-[#58CC02] text-white shadow-[0_1px_0_#46A302]"
                        : "border-[var(--line-strong)] bg-white hover:border-[#58CC02]"
                    }`}
                  >
                    {task.completed && <Check size={14} strokeWidth={3} />}
                  </button>

                  <Link
                    href={`/workspace/${task.application.id}`}
                    className={`min-w-0 flex-1 ${
                      task.completed
                        ? "line-through text-[var(--muted)]"
                        : "text-[var(--ink)] font-extrabold"
                    }`}
                  >
                    <span className="block text-sm truncate">{task.title}</span>
                    <span className="block text-xs font-semibold text-[var(--muted)] no-underline truncate mt-0.5">
                      {task.application.opportunities.title}
                      {task.due_date ? ` · due ${formatDeadline(task.due_date)}` : ""}
                    </span>
                  </Link>

                  <div className="flex flex-col">
                    <button
                      className="p-1 text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-20 cursor-pointer"
                      aria-label="Move task up"
                      disabled={!index}
                      onClick={() => moveTask(task, -1)}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="p-1 text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-20 cursor-pointer"
                      aria-label="Move task down"
                      disabled={index === nextTasks.length - 1}
                      onClick={() => moveTask(task, 1)}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Focus & Progress */}
        <aside className="space-y-6">
          {/* Weekly Focus & Real Checklist Meter */}
          <div className="card p-6 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-4">
            <h2 className="panel-title text-base font-black">Your Focus</h2>
            <div className="space-y-2">
              <input
                id="weekly-focus"
                className="input text-sm font-bold"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. submit research proposal, finalize CV"
              />
              <button
                className="btn btn-secondary btn-sm w-full font-bold"
                disabled={savingFocus}
                onClick={saveFocus}
              >
                {savingFocus ? "Saving…" : "Save focus"}
              </button>
            </div>

            <div className="pt-4 border-t-2 border-[var(--line)] space-y-2">
              <div className="flex justify-between items-center text-xs font-extrabold">
                <span className="text-[var(--ink)]">Checklist Completion</span>
                <span className="text-[#58CC02]">{progress}%</span>
              </div>
              <div className="adventure-meter" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs font-semibold text-[var(--muted)]">
                Calculated from actual completed tasks across your active applications.
              </p>
            </div>
          </div>

          {/* Profile Health / Missing Information */}
          {missingProfileFields.length > 0 && (
            <div className="card p-5 border-2 border-[var(--line)] rounded-2xl shadow-[0_3px_0_#E3E7EA] bg-white space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                <UserCheck size={18} />
                <h3 className="font-extrabold text-sm text-[var(--ink)]">Complete Profile Details</h3>
              </div>
              <p className="text-xs font-semibold text-[var(--muted)]">
                Adding missing details improves eligibility accuracy:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingProfileFields.map((field) => (
                  <span
                    key={field}
                    className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFF5E0] text-[#966100] border border-[#FCD68A]"
                  >
                    + {field}
                  </span>
                ))}
              </div>
              <Link href="/profile" className="btn btn-secondary btn-sm w-full font-bold">
                Update Profile →
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* 3. DEADLINES & PIPELINE PREVIEWS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deadlines Card */}
        <div className="card p-6 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-3">
          <div className="flex justify-between items-center pb-3 border-b-2 border-[var(--line)]">
            <h2 className="section-title text-base font-black">Upcoming Deadlines</h2>
            <CalendarDays className="text-[#FFB020]" size={20} />
          </div>

          {deadlines.length === 0 ? (
            <p className="text-sm font-semibold text-[var(--muted)] py-4 text-center">
              No confirmed application deadlines to watch yet.
            </p>
          ) : (
            <div className="space-y-2">
              {deadlines.map((app) => {
                const days = daysUntilDeadline(app.opportunities.deadline);
                const isUrgent = days !== null && days < 7;
                return (
                  <Link
                    key={app.id}
                    href={`/workspace/${app.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border-2 border-[var(--line)] bg-[var(--canvas)] hover:border-[#1CB0F6] transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <span className="block text-sm font-extrabold text-[var(--ink)] truncate">
                        {app.opportunities.title}
                      </span>
                      <span className="block text-xs font-semibold text-[var(--muted)] mt-0.5">
                        {formatDeadline(app.opportunities.deadline)}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                        isUrgent
                          ? "bg-[#FEEAEA] text-[#9E1616] border-[#F8B4B4]"
                          : "bg-white text-[var(--ink)] border-[var(--line)]"
                      }`}
                    >
                      {days !== null ? `${days}d left` : "Date set"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Pipeline Card */}
        <div className="card p-6 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white space-y-3">
          <div className="flex justify-between items-center pb-3 border-b-2 border-[var(--line)]">
            <h2 className="section-title text-base font-black">Active Pipeline</h2>
            <Link
              href="/workspace"
              className="text-xs font-extrabold text-[#58CC02] hover:underline"
            >
              Open board →
            </Link>
          </div>

          {activeApps.length === 0 ? (
            <p className="text-sm font-semibold text-[var(--muted)] py-4 text-center">
              Save an opportunity to begin tracking your preparation.
            </p>
          ) : (
            <div className="space-y-2">
              {activeApps.slice(0, 4).map((app) => (
                <Link
                  key={app.id}
                  href={`/workspace/${app.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border-2 border-[var(--line)] bg-[var(--canvas)] hover:border-[#58CC02] transition-all"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <span className="block text-sm font-extrabold text-[var(--ink)] truncate">
                      {app.opportunities.title}
                    </span>
                    <span className="block text-xs font-semibold text-[var(--muted)] mt-0.5 truncate">
                      {app.next_action || "Ready to prepare"}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#EEFFD9] text-[#287300] border border-[#B7E885] capitalize">
                    {app.stage}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
