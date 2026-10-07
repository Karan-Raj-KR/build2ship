"use client";

import { useState } from "react";
import { CandidateFact } from "@/lib/onboarding/parsers";
import { Check, Edit2, EyeOff, Sparkles, X } from "lucide-react";

interface ExtractionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  facts: CandidateFact[];
  onConfirmAll: (confirmedFacts: CandidateFact[]) => void;
  sourceTitle: string;
}

export function ExtractionReviewModal({
  isOpen,
  onClose,
  facts: initialFacts,
  onConfirmAll,
  sourceTitle,
}: ExtractionReviewModalProps) {
  const [facts, setFacts] = useState<CandidateFact[]>(initialFacts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  if (!isOpen) return null;

  const categories = ["Education", "Skills", "Projects", "Experience", "Achievements"] as const;

  const confirmedCount = facts.filter((f) => f.status === "confirmed").length;

  function setStatus(id: string, status: "confirmed" | "ignored") {
    setFacts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status } : f))
    );
  }

  function startEdit(fact: CandidateFact) {
    setEditingId(fact.id);
    setEditTitle(fact.title);
    setEditDesc(fact.description || "");
  }

  function saveEdit(id: string) {
    setFacts((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              title: editTitle,
              description: editDesc || null,
              status: "confirmed",
            }
          : f
      )
    );
    setEditingId(null);
  }

  function handleFinish() {
    const activeConfirmed = facts.filter((f) => f.status === "confirmed");
    onConfirmAll(activeConfirmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden my-8 text-[var(--ink)]">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)]">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--ink)]">
                  We found {facts.length} things from {sourceTitle}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  Review and confirm. Nothing is added to your permanent profile until you say so.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content list grouped by category */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {categories.map((cat) => {
            const catFacts = facts.filter((f) => f.category === cat);
            if (catFacts.length === 0) return null;

            return (
              <div key={cat} className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)] flex items-center gap-2">
                  <span>{cat}</span>
                  <span className="text-[var(--muted)] font-normal">({catFacts.length})</span>
                </h4>

                <div className="space-y-2">
                  {catFacts.map((fact) => {
                    const isEditing = editingId === fact.id;
                    const isIgnored = fact.status === "ignored";

                    return (
                      <div
                        key={fact.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isIgnored
                            ? "bg-[var(--surface-subtle)] border-[var(--border)] opacity-50"
                            : "bg-white border-[var(--border)] hover:border-[var(--primary-border)] shadow-xs"
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="input w-full"
                              placeholder="Title"
                            />
                            <textarea
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="input w-full text-xs"
                              rows={2}
                              placeholder="Description or context"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingId(null)}
                                className="btn btn-secondary btn-sm"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEdit(fact.id)}
                                className="btn btn-primary btn-sm"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-semibold ${isIgnored ? "line-through text-[var(--muted)]" : "text-[var(--ink)]"}`}>
                                  {fact.title}
                                </span>
                                {fact.tags?.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--surface-subtle)] text-[var(--muted)] border border-[var(--border)]"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                              {fact.description && (
                                <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
                                  {fact.description}
                                </p>
                              )}
                            </div>

                            {/* Actions: Confirm, Edit, Ignore */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {fact.status !== "confirmed" ? (
                                <button
                                  onClick={() => setStatus(fact.id, "confirmed")}
                                  className="px-2.5 py-1 text-xs rounded-lg bg-[var(--surface-subtle)] text-[var(--ink)] border border-[var(--border)] hover:border-[var(--primary-border)] hover:text-[var(--primary)] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Confirm this fact"
                                >
                                  <Check size={13} />
                                  <span>Confirm</span>
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 text-xs rounded-lg bg-[#F4FCE3] text-[#1F3800] border border-[#C5F36B] font-medium flex items-center gap-1">
                                  <Check size={12} />
                                  <span>Confirmed</span>
                                </span>
                              )}

                              <button
                                onClick={() => startEdit(fact)}
                                className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors cursor-pointer"
                                title="Edit item"
                              >
                                <Edit2 size={13} />
                              </button>

                              {fact.status !== "ignored" ? (
                                <button
                                  onClick={() => setStatus(fact.id, "ignored")}
                                  className="p-1.5 text-[var(--muted)] hover:text-[var(--error-text)] hover:bg-[var(--error-surface)] rounded-lg transition-colors cursor-pointer"
                                  title="Ignore item"
                                >
                                  <EyeOff size={13} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setStatus(fact.id, "confirmed")}
                                  className="px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                                >
                                  Restore
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-between">
          <div className="text-xs text-[var(--muted)]">
            <span className="font-semibold text-[var(--ink)]">{confirmedCount}</span> of {facts.length} facts will be saved to your profile.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleFinish}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              <Check size={15} />
              <span>Confirm & Save Facts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
