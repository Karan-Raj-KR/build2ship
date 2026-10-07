"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ShieldAlert, Sparkles, PlusCircle } from "lucide-react";
import { Profile, ProfileEvidence } from "@/types/database";

interface InlineGapUpdaterProps {
  isOpen: boolean;
  onClose: () => void;
  gapText: string;
  profile?: Partial<Profile>;
  opportunityId: string;
  opportunityTitle: string;
  onProfileUpdated: (updatedProfile: Partial<Profile>, newEvidence?: ProfileEvidence) => void;
}

export function InlineGapUpdater({
  isOpen,
  onClose,
  gapText,
  profile,
  opportunityTitle,
  onProfileUpdated,
}: InlineGapUpdaterProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field values
  const [educationStage, setEducationStage] = useState(profile?.education_stage || "undergraduate");
  const [graduationYear, setGraduationYear] = useState(profile?.expected_graduation || "2027");
  const [residence, setResidence] = useState(profile?.country_of_residence || "");
  const [nationalitiesText, setNationalitiesText] = useState((profile?.nationalities || []).join(", "));
  const [newSkill, setNewSkill] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectTags, setProjectTags] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  if (!isOpen) return null;

  const gapLower = gapText.toLowerCase();
  const isEducationGap = gapLower.includes("education") || gapLower.includes("undergraduate") || gapLower.includes("year") || gapLower.includes("standing");
  const isCitizenshipGap = gapLower.includes("citizenship") || gapLower.includes("nationalit") || gapLower.includes("country") || gapLower.includes("residence");
  const isSkillOrEvidenceGap = gapLower.includes("evidence") || gapLower.includes("project") || gapLower.includes("skill") || gapLower.includes("document");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const nationalitiesArray = nationalitiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedProfileFields: Partial<Profile> = {
      education_stage: educationStage as Profile["education_stage"],
      expected_graduation: graduationYear,
      country_of_residence: residence || profile?.country_of_residence,
      nationalities: nationalitiesArray.length > 0 ? nationalitiesArray : profile?.nationalities,
      updated_at: new Date().toISOString(),
    };

    let createdEvidence: ProfileEvidence | undefined = undefined;

    if (projectTitle.trim()) {
      createdEvidence = {
        id: crypto.randomUUID(),
        user_id: profile?.id || "",
        kind: "project",
        title: projectTitle.trim(),
        description: "Added to satisfy opportunity prerequisites",
        tags: projectTags.split(",").map((t) => t.trim()).filter(Boolean),
        evidence_url: evidenceUrl.trim() || null,
        confirmed: true,
        start_date: null,
        end_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    try {
      const { createClient } = await import("@/lib/db/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to update your profile.");
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedProfileFields) });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || "Profile could not be saved");
      Object.assign(updatedProfileFields, saved.profile);

      if (createdEvidence) {
        const { data, error: evidenceError } = await supabase.from("profile_evidence").insert({
          ...createdEvidence,
          user_id: user.id,
        }).select().single();
        if (evidenceError) throw evidenceError;
        createdEvidence = data;
      }

      onProfileUpdated({ ...profile, ...updatedProfileFields }, createdEvidence);
      onClose();
    } catch (err) {
      console.error("Failed to update profile gap:", err);
      setError(err instanceof Error ? err.message : "Failed to save updates.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(24,20,38,0.6)] backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gap-updater-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-main)] p-6 shadow-lift text-[var(--ink)] space-y-5 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8A4306] mb-1">
              <ShieldAlert className="w-4 h-4 text-[#8A4306]" />
              <span>Address Eligibility Gap</span>
            </div>
            <h2 id="gap-updater-title" className="text-base font-bold text-[var(--ink)] leading-snug">
              Update Profile for {opportunityTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[var(--line)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gap Context Box */}
        <div className="p-3 rounded-xl bg-[#FEF7E6] border border-[#F6DDA5] text-xs text-[#8A4306] space-y-1">
          <span className="font-semibold block">Highlighted Requirement to Verify:</span>
          <p className="leading-relaxed">{gapText}</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#FFF0F4] border border-[#F8C8D4] text-xs text-[#9E1B38]">
            {error}
          </div>
        )}

        {/* Update Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Education Stage & Graduation */}
          {(isEducationGap || (!isCitizenshipGap && !isSkillOrEvidenceGap)) && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)]">
              <label className="font-semibold block text-[var(--ink)]">Academic Standing</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[var(--ink-muted)] block mb-1">Stage</span>
                  <select
                    value={educationStage}
                    onChange={(e) => setEducationStage(e.target.value as NonNullable<Profile["education_stage"]>)}
                    className="w-full bg-white border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--ink)]"
                  >
                    <option value="undergraduate">Undergraduate (Bachelor)</option>
                    <option value="masters">Master&apos;s</option>
                    <option value="phd">PhD / Doctorate</option>
                    <option value="other">Other / High School</option>
                  </select>
                </div>
                <div>
                  <span className="text-[var(--ink-muted)] block mb-1">Expected Graduation</span>
                  <input
                    type="text"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    placeholder="e.g. 2027 or 2028"
                    className="w-full bg-white border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--ink)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Citizenship & Residence */}
          {(isCitizenshipGap || (!isEducationGap && !isSkillOrEvidenceGap)) && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)]">
              <label className="font-semibold block text-[var(--ink)]">Location & Nationality</label>
              <div>
                <span className="text-[var(--ink-muted)] block mb-1">Country of Residence</span>
                <input
                  type="text"
                  value={residence}
                  onChange={(e) => setResidence(e.target.value)}
                  placeholder="e.g. India, United States, Germany"
                  className="w-full bg-white border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--ink)] mb-2"
                />
              </div>
              <div>
                <span className="text-[var(--ink-muted)] block mb-1">Nationalities / Citizenships (comma-separated)</span>
                <input
                  type="text"
                  value={nationalitiesText}
                  onChange={(e) => setNationalitiesText(e.target.value)}
                  placeholder="e.g. India, Canada"
                  className="w-full bg-white border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--ink)]"
                />
              </div>
            </div>
          )}

          {/* Supporting Evidence or Project */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)]">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[var(--ink)] flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5 text-[#285C48]" /> Add Supporting Evidence / Project
              </label>
              <span className="text-[10px] text-[var(--ink-muted)]">Optional</span>
            </div>
            <div>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Project title (e.g. Autonomous Drone, PyTorch NLP Model)"
                className="w-full bg-white border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--ink)] mb-2"
              />
              <input
                type="text"
                value={projectTags}
                onChange={(e) => setProjectTags(e.target.value)}
                placeholder="Tags / skills (e.g. Python, AI, Open Source)"
                className="w-full bg-white border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--ink)] mb-2"
              />
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="URL proof (e.g. GitHub repo, publication link)"
                className="w-full bg-white border border-[var(--line)] rounded-lg p-2 text-xs text-[var(--ink)]"
              />
            </div>
          </div>

          <p className="text-[10px] text-[var(--ink-muted)] leading-relaxed">
            Your facts are self-reported. Recommendations will be checked again; unclear provider requirements remain uncertain.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary py-2 px-3 text-xs"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating & Re-evaluating…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save & Re-evaluate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
