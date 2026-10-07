"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GripVertical, LayoutList, Rows3, X } from "lucide-react";
import { formatDeadline } from "@/lib/utils";
import type { ApplicationStage, ApplicationWithOpportunity } from "@/types/database";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

type BoardStage = "saved" | "preparing" | "submitted" | "results";
const columns: { id: BoardStage; title: string; hint: string }[] = [
  { id: "saved", title: "Saved", hint: "Worth considering" },
  { id: "preparing", title: "Preparing", hint: "Work in progress" },
  { id: "submitted", title: "Submitted", hint: "Waiting or following up" },
  { id: "results", title: "Results", hint: "Selected, rejected, withdrawn" },
];
const actualStage = (stage: ApplicationStage): BoardStage => ["selected", "rejected", "withdrawn"].includes(stage) ? "results" : stage as BoardStage;

export default function WorkspacePage() {
  const [apps, setApps] = useState<ApplicationWithOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "list">("board");
  const [mobileStage, setMobileStage] = useState<BoardStage>("saved");
  const [dragging, setDragging] = useState<string | null>(null);
  const [pending, setPending] = useState<{ app: ApplicationWithOpportunity; stage: BoardStage } | null>(null);
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [outcome, setOutcome] = useState<ApplicationStage>("selected");
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useRef<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      try {
        const { createClient } = await import("@/lib/db/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from("applications").select("*, opportunities(*)").eq("user_id", user.id).order("sort_order", { ascending: true });
          setApps((data ?? []) as ApplicationWithOpportunity[]);
        }
      } catch (error) { console.error("Error loading workspace page:", error); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  function requestMove(app: ApplicationWithOpportunity, stage: BoardStage) {
    if (stage === "submitted" || stage === "results") { setPending({ app, stage }); return; }
    commitMove(app, stage);
  }

  async function commitMove(app: ApplicationWithOpportunity, destination: BoardStage, result?: ApplicationStage, targetId?: string) {
    const stage: ApplicationStage = result ?? (destination === "results" ? app.stage : destination);
    const previous = app;
    const nextOrder = targetId ? (apps.find((item) => item.id === targetId)?.sort_order ?? Date.now()) - 1 : Date.now();
    const seq = (mutation.current[app.id] ?? 0) + 1;
    mutation.current[app.id] = seq;
    setApps((items) => items.map((item) => item.id === app.id ? { ...item, stage, sort_order: nextOrder, submitted_at: stage === "submitted" ? `${submissionDate}T12:00:00.000Z` : item.submitted_at } : item));
    setNotice(stage === "submitted" ? "Marked submitted." : `Moved to ${destination}.`);
    try {
      const { createClient } = await import("@/lib/db/client");
      const { error } = await createClient().from("applications").update({ stage, sort_order: nextOrder, submitted_at: stage === "submitted" ? `${submissionDate}T12:00:00.000Z` : app.submitted_at }).eq("id", app.id).eq("user_id", app.user_id);
      if (error) throw error;
    } catch {
      if (mutation.current[app.id] === seq) { setApps((items) => items.map((item) => item.id === app.id ? previous : item)); setNotice("Couldn’t save that move. Your card was restored."); }
    }
  }

  function drop(event: DragEvent, stage: BoardStage, targetId?: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("application-id") || dragging;
    const app = apps.find((item) => item.id === id);
    if (app && targetId && actualStage(app.stage) === stage) commitMove(app, stage, undefined, targetId);
    else if (app) requestMove(app, stage);
    setDragging(null);
  }

  if (loading) return <PageLoader />;
  const sorted = apps.slice().sort((a, b) => a.sort_order - b.sort_order);
  const cardsFor = (stage: BoardStage) => sorted.filter((app) => actualStage(app.stage) === stage);

  return <div className="page-frame">
    <header className="page-header"><div><p className="eyebrow">Applications</p><h1 className="page-title mt-1">Make every application finishable.</h1><p className="mt-2 text-sm text-gray-500">Move cards by drag, or use the stage control.</p></div><div className="action-row"><Link href="/library" className="btn btn-secondary btn-sm">Library</Link><Link href="/compare" className="btn btn-secondary btn-sm">Compare</Link><button className={`btn btn-sm ${view === "board" ? "btn-primary" : "btn-secondary"}`} onClick={() => setView("board")}><Rows3 size={15} /> Board</button><button className={`btn btn-sm ${view === "list" ? "btn-primary" : "btn-secondary"}`} onClick={() => setView("list")}><LayoutList size={15} /> List</button><Link href="/scout" className="btn btn-primary btn-sm">Find opportunities</Link></div></header>
    {notice && <div role="status" className="alert alert-success flex justify-between gap-3"><span>{notice}</span><button className="underline text-sm" onClick={() => setNotice(null)}>Dismiss</button></div>}
    {apps.length === 0 ? <EmptyState icon="folder" title="Start with one opportunity you want to pursue." description="Save an opportunity and it will appear here as a focused application workspace." action={<Link href="/scout" className="btn btn-primary btn-sm">Find opportunities</Link>} /> : view === "list" ? <div className="card divide-y divide-gray-100">{sorted.map((app) => <ApplicationRow key={app.id} app={app} onMove={(stage) => requestMove(app, stage)} />)}</div> : <>
      <div className="md:hidden"><div className="workspace-stage-tabs" role="tablist" aria-label="Application stage">{columns.map((column) => <button key={column.id} role="tab" aria-selected={mobileStage === column.id} className={mobileStage === column.id ? "is-active" : ""} onClick={() => setMobileStage(column.id)}>{column.title}<span>{cardsFor(column.id).length}</span></button>)}</div><div className="mt-4 space-y-3">{cardsFor(mobileStage).map((app) => <ApplicationCard key={app.id} app={app} onMove={(stage) => requestMove(app, stage)} />)}{cardsFor(mobileStage).length === 0 && <p className="card p-5 text-center text-sm text-gray-400">Nothing in {columns.find((column) => column.id === mobileStage)?.title.toLowerCase()} yet.</p>}</div></div>
      <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-4 gap-4">{columns.map((column) => <BoardColumn key={column.id} column={column} apps={cardsFor(column.id)} dragging={dragging} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, column.id)} onDragStart={(event, app) => { event.dataTransfer.setData("application-id", app.id); setDragging(app.id); }} onDragEnd={() => setDragging(null)} onMove={requestMove} onCardDrop={(event, id) => drop(event, column.id, id)} />)}</div>
    </>}
    {pending && <MoveDialog pending={pending} submissionDate={submissionDate} outcome={outcome} onDate={setSubmissionDate} onOutcome={setOutcome} onClose={() => setPending(null)} onConfirm={() => { commitMove(pending.app, pending.stage, pending.stage === "results" ? outcome : undefined); setPending(null); }} />}
  </div>;
}

function BoardColumn({ column, apps, dragging, onDragOver, onDrop, onDragStart, onDragEnd, onMove, onCardDrop }: { column: typeof columns[number]; apps: ApplicationWithOpportunity[]; dragging: string | null; onDragOver: (event: DragEvent) => void; onDrop: (event: DragEvent) => void; onDragStart: (event: DragEvent, app: ApplicationWithOpportunity) => void; onDragEnd: () => void; onMove: (app: ApplicationWithOpportunity, stage: BoardStage) => void; onCardDrop: (event: DragEvent, id: string) => void }) {
  return <section onDragOver={onDragOver} onDrop={onDrop} className={`workspace-column border-2 border-[var(--line)] rounded-2xl bg-white shadow-[0_4px_0_#E3E7EA] ${dragging ? "is-dragging" : ""}`}><header className="pb-3 mb-3 border-b-2 border-[var(--line)]"><h2 className="text-base font-black text-[var(--ink)] flex items-center justify-between">{column.title} <span className="w-6 h-6 rounded-full bg-[var(--canvas)] text-xs font-black text-[var(--muted)] border border-[var(--line)] inline-flex items-center justify-center">{apps.length}</span></h2><p className="text-xs font-semibold text-[var(--muted)] mt-0.5">{column.hint}</p></header><div className="space-y-3">{apps.map((app) => <div key={app.id} draggable onDragStart={(event) => onDragStart(event, app)} onDragEnd={onDragEnd} onDrop={(event) => onCardDrop(event, app.id)}><ApplicationCard app={app} draggableCard onMove={(stage) => onMove(app, stage)} /></div>)}</div>{apps.length === 0 && <p className="workspace-empty text-xs font-bold text-[var(--muted)] border-2 border-dashed border-[var(--line)] rounded-xl p-6 text-center">Drop a card here</p>}</section>;
}

function ApplicationCard({ app, onMove, draggableCard = false }: { app: ApplicationWithOpportunity; onMove: (stage: BoardStage) => void; draggableCard?: boolean }) {
  return <article className={`card p-4 border-2 border-[var(--line)] rounded-xl shadow-[0_3px_0_#E3E7EA] hover:border-[#1CB0F6] hover:shadow-[0_3px_0_#1CB0F6] transition-all bg-white ${draggableCard ? "cursor-grab active:cursor-grabbing" : ""}`}><div className="flex gap-2.5">{draggableCard && <GripVertical size={16} className="text-[var(--subtle)] shrink-0 mt-0.5" aria-hidden /> }<Link href={`/workspace/${app.id}`} className="min-w-0 flex-1"><span className="font-extrabold text-[var(--ink)] text-sm block leading-snug line-clamp-2 hover:text-[#1CB0F6] transition-colors">{app.opportunities.title}</span><span className="text-xs font-semibold text-[var(--muted)] block mt-1 truncate">{app.opportunities.organizer || "Organizer not specified"}</span>{app.next_action && <span className="text-xs font-extrabold text-[#287300] bg-[#EEFFD9] px-2 py-0.5 rounded-md inline-block mt-2 truncate">Next: {app.next_action}</span>}<span className="text-xs font-bold text-[var(--subtle)] block mt-1.5">{formatDeadline(app.opportunities.deadline)}</span></Link></div><div className="flex items-center gap-2 mt-3.5 pt-3 border-t-2 border-[var(--line)]"><label className="sr-only" htmlFor={`move-${app.id}`}>Move {app.opportunities.title} to</label><select id={`move-${app.id}`} value={actualStage(app.stage)} onChange={(event) => onMove(event.target.value as BoardStage)} className="input py-1 text-xs font-bold flex-1 cursor-pointer"><option value="saved">Saved</option><option value="preparing">Preparing</option><option value="submitted">Submitted</option><option value="results">Results</option></select><Link href={`/compare?ids=${app.opportunities.id}`} className="btn btn-secondary py-1 px-2.5 text-xs font-bold shrink-0" title="Compare this opportunity">Compare</Link></div></article>;
}

function ApplicationRow({ app, onMove }: { app: ApplicationWithOpportunity; onMove: (stage: BoardStage) => void }) { return <div className="p-4 flex items-center gap-4 flex-wrap hover:bg-[var(--canvas)] transition-colors"><div className="min-w-0 flex-1"><Link href={`/workspace/${app.id}`} className="font-extrabold text-sm text-[var(--ink)] hover:text-[#1CB0F6] transition-colors">{app.opportunities.title}</Link><p className="text-xs font-semibold text-[var(--muted)] mt-1">{app.opportunities.organizer || "Organizer not specified"} · {formatDeadline(app.opportunities.deadline)}</p>{app.next_action && <p className="text-xs font-bold text-[#287300] mt-1">Next: {app.next_action}</p>}</div><span className="badge font-bold capitalize">{app.stage}</span><select aria-label={`Move ${app.opportunities.title}`} className="input w-36 text-xs py-1.5 font-bold cursor-pointer" value={actualStage(app.stage)} onChange={(event) => onMove(event.target.value as BoardStage)}><option value="saved">Saved</option><option value="preparing">Preparing</option><option value="submitted">Submitted</option><option value="results">Results</option></select><Link href={`/compare?ids=${app.opportunities.id}`} className="btn btn-secondary py-1 px-2.5 text-xs font-bold shrink-0">Compare</Link></div>; }

function MoveDialog({ pending, submissionDate, outcome, onDate, onOutcome, onClose, onConfirm }: { pending: { app: ApplicationWithOpportunity; stage: BoardStage }; submissionDate: string; outcome: ApplicationStage; onDate: (date: string) => void; onOutcome: (outcome: ApplicationStage) => void; onClose: () => void; onConfirm: () => void }) { return <div role="dialog" aria-modal="true" aria-labelledby="move-dialog-title" className="fixed inset-0 z-50 bg-[rgba(28,25,41,0.45)] backdrop-blur-xs grid place-items-center p-4"><div className="card p-6 w-full max-w-md shadow-lift"><button onClick={onClose} className="float-right text-[var(--ink-muted)] hover:text-[var(--ink)]" aria-label="Close"><X size={18} /></button><h2 id="move-dialog-title" className="text-lg font-bold text-[var(--ink)]">{pending.stage === "submitted" ? "Confirm submission" : "Record an outcome"}</h2>{pending.stage === "submitted" ? <><p className="text-sm text-[var(--ink-muted)] mt-2 leading-relaxed">Only mark this submitted if you completed the external application. Elara never submits it for you.</p><label className="label mt-4" htmlFor="submission-date">Submission date</label><input id="submission-date" type="date" className="input" value={submissionDate} onChange={(event) => onDate(event.target.value)} /></> : <><p className="text-sm text-[var(--ink-muted)] mt-2 leading-relaxed">Choose the actual result.</p><label className="label mt-4" htmlFor="outcome">Outcome</label><select id="outcome" className="input" value={outcome} onChange={(event) => onOutcome(event.target.value as ApplicationStage)}><option value="selected">Selected</option><option value="rejected">Rejected</option><option value="withdrawn">Withdrawn</option></select></>}<div className="action-row mt-5"><button className="btn btn-primary" onClick={onConfirm}>{pending.stage === "submitted" ? "Mark submitted" : "Save outcome"}</button><button className="btn btn-secondary" onClick={onClose}>Cancel</button></div></div></div>; }
