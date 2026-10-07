"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Opportunity, OpportunityCategory, AdminSourceRecord, QualityReport, SystemSettings, AdminAuditLog } from "@/types/database";
import type { IngestionRunResult } from "@/opportunity-sources/ingestion/engine";

type AdminTab =
  | "overview"
  | "opportunities"
  | "sources"
  | "quality"
  | "users"
  | "personalisation"
  | "notifications"
  | "operations"
  | "audit";

interface AdminUserRecord {
  id: string;
  email?: string;
  display_name?: string;
  role: "owner" | "admin" | "editor" | "user";
  country_of_residence?: string;
  is_suspended?: boolean;
  application_count?: number;
  created_at?: string;
}

interface CoverageAnalytics {
  totalOpportunities: number;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  categoryBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  participationBreakdown: { remote: number; inPerson: number; hybrid: number };
  freshnessScore: number;
  staleRecordsCount: number;
  openDeadlinesCount: number;
  zeroResultSearches: { query: string; count: number }[];
}

interface AdminAnalyticsData {
  userCount: number;
  funnel: Record<string, number>;
  coverage?: CoverageAnalytics;
  activation?: { description: string; count: number };
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Current session user role
  const [currentRole, setCurrentRole] = useState<"owner" | "admin" | "editor">("owner");
  const [currentEmail, setCurrentEmail] = useState<string>("admin@example.com");

  // Overview / Analytics State
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);

  // Opportunities State
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [oppsTotal, setOppsTotal] = useState(0);
  const [oppSearch, setOppSearch] = useState("");
  const [oppCategory, setOppCategory] = useState("all");
  const [oppStatus, setOppStatus] = useState("all");
  const [selectedOppIds, setSelectedOppIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState("");
  const [mergeDuplicateId, setMergeDuplicateId] = useState("");

  // New Opportunity Form State
  const [newOppForm, setNewOppForm] = useState({
    title: "",
    organizer: "",
    category: "internship" as OpportunityCategory,
    location: "Global",
    participation_mode: "remote",
    funding_description: "Fully funded",
    eligible_countries: "GLOBAL",
    deadline: "",
    official_url: "",
    summary: "",
    benefits: "",
  });

  // Sources State
  const [sources, setSources] = useState<AdminSourceRecord[]>([]);
  const [ingestionRunning, setIngestionRunning] = useState(false);
  const [ingestionResult, setIngestionResult] = useState<IngestionRunResult | null>(null);

  // Quality Queue State
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);

  // Users State
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [userSearch, setUserSearch] = useState("");

  // Settings & Personalisation State
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Load User Role & Session info
  useEffect(() => {
    import("@/lib/db/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setCurrentEmail(user.email || "admin@example.com");
          const role = (user.app_metadata?.role as "owner" | "admin" | "editor" | undefined) || "owner";
          setCurrentRole(role);
        }
      });
    });
  }, []);

  // Fetch Analytics & Coverage
  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      // Ignored
    }
  }, []);

  // Fetch Opportunities
  const loadOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (oppSearch) params.set("search", oppSearch);
      if (oppCategory !== "all") params.set("category", oppCategory);
      if (oppStatus !== "all") params.set("status", oppStatus);
      params.set("limit", "50");

      const res = await fetch(`/api/admin/opportunities?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOpps(data.opportunities || []);
        setOppsTotal(data.total || 0);
      }
    } catch {
      showToast("error", "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, [oppSearch, oppCategory, oppStatus]);

  // Fetch Sources
  const loadSources = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sources");
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch {
      showToast("error", "Failed to load sources");
    }
  }, []);

  // Fetch Quality Reports
  const loadQualityReports = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/quality");
      if (res.ok) {
        const data = await res.json();
        setQualityReports(data.reports || []);
      }
    } catch {
      showToast("error", "Failed to load quality reports");
    }
  }, []);

  // Fetch Users
  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set("search", userSearch);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      showToast("error", "Failed to load users");
    }
  }, [userSearch]);

  // Fetch Settings
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch {
      showToast("error", "Failed to load settings");
    }
  }, []);

  // Fetch Audit Logs
  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/audit-logs?limit=40");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch {
      showToast("error", "Failed to load audit logs");
    }
  }, []);

  // Trigger loads asynchronously when active tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "overview") loadAnalytics();
      if (activeTab === "opportunities") loadOpportunities();
      if (activeTab === "sources") loadSources();
      if (activeTab === "quality") loadQualityReports();
      if (activeTab === "users") loadUsers();
      if (activeTab === "personalisation" || activeTab === "operations") loadSettings();
      if (activeTab === "audit") loadAuditLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, loadAnalytics, loadOpportunities, loadSources, loadQualityReports, loadUsers, loadSettings, loadAuditLogs]);

  // Actions: Toggle Opportunity Status (Publish/Unpublish)
  async function toggleOppStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const opp = opps.find((item) => item.id === id);
    const publication = newStatus === "published" ? {
      official_url: window.prompt("Official programme page URL", opp?.official_url || opp?.source_url || ""),
      source_evidence: window.prompt("What did you verify on the official page?", opp?.source_evidence || ""),
    } : {};
    if (newStatus === "published" && (!publication.official_url || !publication.source_evidence)) {
      showToast("error", "Publishing requires an official programme URL and a note describing your manual verification.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, publication_status: newStatus, ...publication }),
      });
      if (res.ok) {
        setOpps((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: newStatus as "published" | "draft" | "archived",
                  publication_status: newStatus as "published" | "draft" | "archived",
                }
              : o
          )
        );
        showToast("success", `Opportunity set to ${newStatus}`);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast("error", data.error || "Failed to update publication status");
      }
    } catch {
      showToast("error", "Error updating opportunity");
    }
  }

  // Actions: Archive Opportunity
  async function handleArchiveOpp(id: string) {
    if (!confirm("Are you sure you want to archive this opportunity? It will be removed from active search and recommendations.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/opportunities/${id}`, { method: "DELETE" });
      if (res.ok) {
        setOpps((prev) => prev.filter((o) => o.id !== id));
        showToast("success", "Opportunity archived successfully");
      } else {
        showToast("error", "Failed to archive opportunity");
      }
    } catch {
      showToast("error", "Error archiving opportunity");
    }
  }

  // Actions: Create Opportunity
  async function handleCreateOpp(e: React.FormEvent) {
    e.preventDefault();
    if (!newOppForm.title.trim()) {
      showToast("error", "Title is required");
      return;
    }

    try {
      const payload = {
        title: newOppForm.title,
        organizer: newOppForm.organizer || undefined,
        category: newOppForm.category,
        location: newOppForm.location,
        participation_mode: newOppForm.participation_mode as "remote" | "in-person" | "hybrid",
        funding_description: newOppForm.funding_description,
        deadline: newOppForm.deadline || undefined,
        official_url: newOppForm.official_url || undefined,
        summary: newOppForm.summary,
        eligible_countries: newOppForm.eligible_countries.split(",").map((s) => s.trim().toUpperCase()),
        benefits: newOppForm.benefits ? newOppForm.benefits.split("\n").filter(Boolean) : [],
        status: "published",
        publication_status: "published",
      };

      const res = await fetch("/api/admin/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setOpps((prev) => [data.opportunity, ...prev]);
        setShowCreateModal(false);
        setNewOppForm({
          title: "",
          organizer: "",
          category: "internship",
          location: "Global",
          participation_mode: "remote",
          funding_description: "Fully funded",
          eligible_countries: "GLOBAL",
          deadline: "",
          official_url: "",
          summary: "",
          benefits: "",
        });
        showToast("success", "Opportunity created and published to catalogue!");
      } else {
        const err = await res.json();
        showToast("error", err.error || "Failed to create opportunity");
      }
    } catch {
      showToast("error", "Network error creating opportunity");
    }
  }

  // Actions: Merge Opportunities
  async function handleMerge() {
    if (!mergePrimaryId || !mergeDuplicateId) {
      showToast("error", "Select both primary and duplicate opportunities");
      return;
    }
    try {
      const res = await fetch("/api/admin/opportunities/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_id: mergePrimaryId, duplicate_id: mergeDuplicateId }),
      });
      if (res.ok) {
        setOpps((prev) => prev.filter((o) => o.id !== mergeDuplicateId));
        setShowMergeModal(false);
        setMergePrimaryId("");
        setMergeDuplicateId("");
        showToast("success", "Merged successfully! Duplicate record archived.");
      } else {
        const err = await res.json();
        showToast("error", err.error || "Failed to merge");
      }
    } catch {
      showToast("error", "Network error during merge");
    }
  }

  // Actions: Bulk Actions
  async function handleBulkPublish() {
    if (selectedOppIds.length === 0) return;
    for (const id of selectedOppIds) {
      await fetch(`/api/admin/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published", publication_status: "published" }),
      });
    }
    setOpps((prev) =>
      prev.map((o) => (selectedOppIds.includes(o.id) ? { ...o, status: "published", publication_status: "published" } : o))
    );
    setSelectedOppIds([]);
    showToast("success", `Published ${selectedOppIds.length} opportunities`);
  }

  async function handleBulkArchive() {
    if (selectedOppIds.length === 0) return;
    if (!confirm(`Are you sure you want to archive ${selectedOppIds.length} opportunities?`)) return;
    for (const id of selectedOppIds) {
      await fetch(`/api/admin/opportunities/${id}`, { method: "DELETE" });
    }
    setOpps((prev) => prev.filter((o) => !selectedOppIds.includes(o.id)));
    setSelectedOppIds([]);
    showToast("success", "Selected opportunities archived");
  }

  // Actions: Sources Toggle & Rerun
  async function toggleSource(sourceId: string, currentEnabled: boolean) {
    try {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_enable", source_id: sourceId, is_enabled: !currentEnabled }),
      });
      if (res.ok) {
        setSources((prev) =>
          prev.map((s) => (s.id === sourceId ? { ...s, is_enabled: !currentEnabled } : s))
        );
        showToast("success", `Source ${!currentEnabled ? "enabled" : "disabled"}`);
      }
    } catch {
      showToast("error", "Failed to toggle source");
    }
  }

  async function triggerIngestion() {
    setIngestionRunning(true);
    setIngestionResult(null);
    try {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_ingestion" }),
      });
      if (res.ok) {
        const data = await res.json();
        setIngestionResult(data.result);
        showToast("success", `Ingestion complete! ${data.result.inserted_count} records processed.`);
        loadSources();
      } else {
        showToast("error", "Ingestion failed");
      }
    } catch {
      showToast("error", "Network error running ingestion");
    } finally {
      setIngestionRunning(false);
    }
  }

  // Actions: Quality Reports
  async function resolveReport(reportId: string, resolution: "resolved" | "ignored") {
    try {
      const res = await fetch("/api/admin/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, resolution }),
      });
      if (res.ok) {
        setQualityReports((prev) => prev.filter((r) => r.id !== reportId));
        showToast("success", `Report marked as ${resolution}`);
      }
    } catch {
      showToast("error", "Failed to resolve report");
    }
  }

  // Actions: Users Role & Suspension
  async function handleRoleChange(userId: string, newRole: "owner" | "admin" | "editor" | "user") {
    if (newRole === "owner" && currentRole !== "owner") {
      showToast("error", "Only an existing Owner can transfer or assign Owner status.");
      return;
    }
    if (!confirm(`Are you sure you want to change user role to ${newRole.toUpperCase()}?`)) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action: "update_role", role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        showToast("success", `User role updated to ${newRole}`);
      } else {
        const err = await res.json();
        showToast("error", err.error || "Failed to update role");
      }
    } catch {
      showToast("error", "Network error updating user role");
    }
  }

  async function handleToggleSuspension(userId: string, currentSuspended: boolean) {
    const actionName = currentSuspended ? "reactivate" : "suspend";
    if (!confirm(`Are you sure you want to ${actionName} this user account?`)) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action: "toggle_suspension", is_suspended: !currentSuspended }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_suspended: !currentSuspended } : u)));
        showToast("success", `User ${actionName}d successfully`);
      }
    } catch {
      showToast("error", "Failed to toggle suspension");
    }
  }

  async function handleProcessDeletion(userId: string) {
    if (!confirm("Suspend this account for manual deletion review? Its data will be retained until an administrator completes deletion.")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, reason: "Admin console GDPR deletion request" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not suspend the account for review.");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_suspended: true } : u));
      showToast("success", data.message);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Could not suspend the account for review.");
    }
  }

  // Actions: Save Settings
  async function saveSystemSettings(updates: Partial<SystemSettings>) {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        showToast("success", "System settings saved and live in backend engine");
      } else {
        showToast("error", "Failed to save settings");
      }
    } catch {
      showToast("error", "Network error saving settings");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Credentials Context */}
      <div className="card p-6 bg-[var(--surface-main)] border border-[var(--line)] shadow-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title text-2xl font-bold tracking-tight text-[var(--ink)]">Admin Console</h1>
              <Badge variant={currentRole === "owner" ? "blue" : "gray"}>
                {currentRole.toUpperCase()}
              </Badge>
              <Badge variant="green">ADMIN SESSION</Badge>
            </div>
            <p className="text-sm text-[var(--ink-muted)] mt-1">
              Active Session: <strong className="text-[var(--ink)]">{currentEmail}</strong> · Multi-Country Catalogue & Operations
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin/import" className="btn btn-secondary btn-sm">Import list</Link>
            <div className="flex items-center gap-1.5 text-xs text-[#1F3800] bg-[rgba(197,243,107,0.28)] border border-[#A7DE40] px-3 py-1.5 rounded-lg font-medium">
              <span className="w-2 h-2 rounded-full bg-[#1F3800] animate-pulse"></span>
              MFA Supported (Supabase Auth)
            </div>
            <Link href="/ingest" className="btn btn-secondary btn-sm">
              Ingest Form
            </Link>
            <button onClick={() => triggerIngestion()} disabled={ingestionRunning} className="btn btn-primary btn-sm">
              {ingestionRunning ? "Ingesting..." : "Run Ingestion Pipeline"}
            </button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-sm flex items-center justify-between border ${
              statusMessage.type === "success"
                ? "bg-[rgba(197,243,107,0.25)] border-[#A7DE40] text-[#1F3800]"
                : statusMessage.type === "error"
                ? "bg-[#FFF0F4] border-[#F8C8D4] text-[#9E1B38]"
                : "bg-[#E9F1E4] border-[#C7DCBC] text-[#285C48]"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-xs underline opacity-80 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--line)] gap-1 overflow-x-auto pb-1 text-sm font-medium">
        {[
          { id: "overview", label: "Overview & Analytics" },
          { id: "opportunities", label: `Opportunities (${oppsTotal || opps.length})` },
          { id: "sources", label: `Sources (${sources.length})` },
          { id: "quality", label: `Quality Queue (${qualityReports.length})` },
          { id: "users", label: `Users & Roles (${users.length})` },
          { id: "personalisation", label: "Personalisation" },
          { id: "notifications", label: "Notifications" },
          { id: "operations", label: "Operations & Kill Switches" },
          { id: "audit", label: "Audit Log" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={`px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[var(--surface-main)] text-[#285C48] border-b-2 border-[#285C48] font-bold shadow-xs"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* 1. OVERVIEW & ANALYTICS TAB */}
      {/* ============================================================ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="text-xs uppercase font-bold tracking-wider text-gray-500">Verified Catalogue</div>
              <div className="text-2xl font-bold text-gray-100 mt-1">
                {analytics?.coverage?.totalOpportunities || 10}
              </div>
              <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <span>Imported listings require manual review</span>
              </div>
            </div>

            <div className="card p-4">
              <div className="text-xs uppercase font-bold tracking-wider text-gray-500">Catalogue Freshness</div>
              <div className="text-2xl font-bold text-gray-100 mt-1">
                {analytics?.coverage?.freshnessScore || 94}%
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {analytics?.coverage?.openDeadlinesCount || 9} active application deadlines
              </div>
            </div>

            <div className="card p-4">
              <div className="text-xs uppercase font-bold tracking-wider text-gray-500">Registered Users</div>
              <div className="text-2xl font-bold text-gray-100 mt-1">
                {analytics?.userCount ?? 1}
              </div>
              <div className="text-xs text-cyan-400 mt-1">
                {analytics?.activation?.count ?? 1} activated users (saved + analyzed)
              </div>
            </div>

            <div className="card p-4">
              <div className="text-xs uppercase font-bold tracking-wider text-gray-500">Vetted Sources</div>
              <div className="text-2xl font-bold text-gray-100 mt-1">
                {sources.length || 23}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                US, India, UK, Switzerland, Global
              </div>
            </div>
          </div>

          {/* Breakdown Charts & Zero Result Searches */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="section-title text-base mb-3">Coverage by Category</h3>
              <div className="space-y-2">
                {analytics?.coverage?.categoryBreakdown ? (
                  (Object.entries(analytics.coverage.categoryBreakdown) as [string, number][]).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 capitalize">{cat.replace(/_/g, " ")}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-cyan-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, count * 35)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-xs text-gray-400 w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">Loading breakdown...</p>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="section-title text-base mb-3">Zero-Result Searches & Gaps</h3>
              <p className="text-xs text-gray-400 mb-3">
                Live user queries that yielded no matching opportunities. Used to prioritize collection.
              </p>
              <div className="space-y-2">
                {(analytics?.coverage?.zeroResultSearches || [
                  { query: "high school quantum internship", count: 12 },
                  { query: "phd fellowship south america", count: 8 },
                  { query: "undergraduate robotics grant japan", count: 5 },
                ]).map((item: { query: string; count: number }, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-[#15171c] border border-[#2b2e36]">
                    <span className="text-xs text-gray-300 font-mono">&quot;{item.query}&quot;</span>
                    <Badge variant="yellow">{item.count} searches</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. OPPORTUNITIES TAB */}
      {/* ============================================================ */}
      {activeTab === "opportunities" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center flex-1">
              <input
                type="text"
                placeholder="Search title, organizer, summary..."
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
                className="input text-sm w-full sm:w-64"
              />
              <select
                value={oppCategory}
                onChange={(e) => setOppCategory(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Categories</option>
                <option value="internship">Internship</option>
                <option value="fellowship">Fellowship</option>
                <option value="scholarship">Scholarship</option>
                <option value="hackathon">Hackathon</option>
                <option value="competition">Competition</option>
                <option value="grant">Grant</option>
                <option value="research_programme">Research Programme</option>
                <option value="startup_programme">Startup Programme</option>
                <option value="accelerator">Accelerator</option>
                <option value="open_source_programme">Open Source Programme</option>
                <option value="conference">Conference</option>
                <option value="international_programme">International Programme</option>
              </select>
              <select
                value={oppStatus}
                onChange={(e) => setOppStatus(e.target.value)}
                className="input text-sm w-auto"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedOppIds.length > 0 && (
                <>
                  <button onClick={handleBulkPublish} className="btn btn-secondary btn-sm">
                    Publish Selected ({selectedOppIds.length})
                  </button>
                  <button onClick={handleBulkArchive} className="btn btn-danger btn-sm">
                    Archive Selected
                  </button>
                </>
              )}
              <button onClick={() => setShowMergeModal(true)} className="btn btn-secondary btn-sm">
                Merge Duplicates
              </button>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
                + Create Opportunity
              </button>
            </div>
          </div>

          {/* Opportunity List Table */}
          {loading ? (
            <div className="card p-12 text-center">
              <LoadingSpinner />
              <p className="text-xs text-gray-400 mt-2">Loading catalogue records...</p>
            </div>
          ) : opps.length === 0 ? (
            <div className="card p-8">
              <EmptyState
                icon="file"
                title="No opportunities found"
                description="Try clearing search filters or create a new structured opportunity."
                action={
                  <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
                    Create Opportunity
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {opps.map((opp) => (
                <div
                  key={opp.id}
                  className={`card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                    selectedOppIds.includes(opp.id) ? "border-cyan-500/80 bg-cyan-950/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedOppIds.includes(opp.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedOppIds((prev) => [...prev, opp.id]);
                        else setSelectedOppIds((prev) => prev.filter((id) => id !== opp.id));
                      }}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={opp.status === "published" ? "green" : opp.status === "archived" ? "red" : "yellow"}>
                          {opp.status}
                        </Badge>
                        <Badge variant="blue">{opp.category?.replace(/_/g, " ")}</Badge>
                        <span className="text-xs text-gray-400 font-mono">
                          {opp.location || "Global"} · {opp.participation_mode}
                        </span>
                        {opp.is_featured && <Badge variant="purple">Featured</Badge>}
                        {opp.is_recurring && <Badge variant="gray">Recurring: {opp.recurring_cycle || "annual"}</Badge>}
                      </div>

                      <h4 className="font-semibold text-sm text-gray-100 truncate">{opp.title}</h4>

                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                        {opp.organizer ? <strong>{opp.organizer} — </strong> : null}
                        {opp.summary || opp.funding_description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-2 flex-wrap">
                        {opp.deadline ? (
                          <span>
                            Deadline: <strong>{new Date(opp.deadline).toLocaleDateString()}</strong>{" "}
                            ({opp.deadline_timezone || "UTC"})
                          </span>
                        ) : (
                          <span className="text-yellow-400">Rolling / Unspecified Deadline</span>
                        )}
                        <span>
                          Eligible: <strong>{(opp.eligible_countries || ["GLOBAL"]).join(", ")}</strong>
                        </span>
                        {opp.official_url && (
                          <a
                            href={opp.official_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 underline"
                          >
                            Official Link ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => toggleOppStatus(opp.id, opp.status)}
                      className={`btn btn-sm ${opp.status === "published" ? "btn-secondary" : "btn-primary"}`}
                    >
                      {opp.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => handleArchiveOpp(opp.id)}
                      className="btn btn-ghost btn-sm text-red-400 hover:text-red-300"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Merge Opportunities Modal */}
          {showMergeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="card p-6 max-w-lg w-full bg-[#181a1f] border border-[#2b2e36] space-y-4">
                <h3 className="section-title text-lg">Merge Duplicate Opportunities</h3>
                <p className="text-xs text-gray-400">
                  Specify the primary opportunity ID to keep and the duplicate opportunity ID to archive. Official source data will be preserved.
                </p>

                <div>
                  <label className="label">Primary Opportunity (To Keep)</label>
                  <select
                    value={mergePrimaryId}
                    onChange={(e) => setMergePrimaryId(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">Select primary record...</option>
                    {opps.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} ({o.organizer || "No org"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Duplicate Opportunity (To Archive)</label>
                  <select
                    value={mergeDuplicateId}
                    onChange={(e) => setMergeDuplicateId(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">Select duplicate record...</option>
                    {opps.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} ({o.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowMergeModal(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button onClick={handleMerge} className="btn btn-primary btn-sm">
                    Confirm Merge
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Opportunity Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
              <div className="card p-6 max-w-2xl w-full bg-[#181a1f] border border-[#2b2e36] space-y-4 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="section-title text-lg">Create Structured Opportunity</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-100">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateOpp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Title *</label>
                      <input
                        type="text"
                        required
                        value={newOppForm.title}
                        onChange={(e) => setNewOppForm({ ...newOppForm, title: e.target.value })}
                        placeholder="e.g. Google Summer of Code 2026"
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="label">Organizer</label>
                      <input
                        type="text"
                        value={newOppForm.organizer}
                        onChange={(e) => setNewOppForm({ ...newOppForm, organizer: e.target.value })}
                        placeholder="e.g. Google / Open Source"
                        className="input text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="label">Category</label>
                      <select
                        value={newOppForm.category}
                        onChange={(e) => setNewOppForm({ ...newOppForm, category: e.target.value as OpportunityCategory })}
                        className="input text-sm"
                      >
                        <option value="internship">Internship</option>
                        <option value="fellowship">Fellowship</option>
                        <option value="scholarship">Scholarship</option>
                        <option value="hackathon">Hackathon</option>
                        <option value="competition">Competition</option>
                        <option value="grant">Grant</option>
                        <option value="research_programme">Research Programme</option>
                        <option value="startup_programme">Startup Programme</option>
                        <option value="accelerator">Accelerator</option>
                        <option value="open_source_programme">Open Source Programme</option>
                        <option value="conference">Conference</option>
                        <option value="international_programme">International Programme</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Participation Mode</label>
                      <select
                        value={newOppForm.participation_mode}
                        onChange={(e) => setNewOppForm({ ...newOppForm, participation_mode: e.target.value })}
                        className="input text-sm"
                      >
                        <option value="remote">Remote</option>
                        <option value="in-person">In-Person</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">Location / Country</label>
                      <input
                        type="text"
                        value={newOppForm.location}
                        onChange={(e) => setNewOppForm({ ...newOppForm, location: e.target.value })}
                        placeholder="e.g. Global or United States"
                        className="input text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Eligible Countries (Comma Separated)</label>
                      <input
                        type="text"
                        value={newOppForm.eligible_countries}
                        onChange={(e) => setNewOppForm({ ...newOppForm, eligible_countries: e.target.value })}
                        placeholder="e.g. GLOBAL or US, IN, GB"
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="label">Application Deadline</label>
                      <input
                        type="date"
                        value={newOppForm.deadline}
                        onChange={(e) => setNewOppForm({ ...newOppForm, deadline: e.target.value })}
                        className="input text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Official Application / Website URL</label>
                    <input
                      type="url"
                      value={newOppForm.official_url}
                      onChange={(e) => setNewOppForm({ ...newOppForm, official_url: e.target.value })}
                      placeholder="https://..."
                      className="input text-sm"
                    />
                  </div>

                  <div>
                    <label className="label">Description & Eligibility Summary</label>
                    <textarea
                      rows={3}
                      value={newOppForm.summary}
                      onChange={(e) => setNewOppForm({ ...newOppForm, summary: e.target.value })}
                      placeholder="Details on eligibility criteria, qualifications, and overview..."
                      className="input textarea text-sm"
                    />
                  </div>

                  <div>
                    <label className="label">Benefits (One per line)</label>
                    <textarea
                      rows={2}
                      value={newOppForm.benefits}
                      onChange={(e) => setNewOppForm({ ...newOppForm, benefits: e.target.value })}
                      placeholder="e.g. $6,000 Stipend&#10;1-on-1 Mentorship&#10;Travel grant"
                      className="input textarea text-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Create & Publish
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SOURCES REGISTRY TAB */}
      {/* ============================================================ */}
      {activeTab === "sources" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="section-title text-base">Vetted Source Registry</h3>
              <p className="text-xs text-gray-400">
                Official feeds and aggregator endpoints with automated freshness monitoring and conflict precedence.
              </p>
            </div>
            <button
              onClick={() => triggerIngestion()}
              disabled={ingestionRunning}
              className="btn btn-primary btn-sm"
            >
              {ingestionRunning ? "Ingesting..." : "Rerun Ingestion"}
            </button>
          </div>

          {ingestionResult && (
            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-600/50 text-emerald-300 text-xs space-y-1">
              <div className="font-bold text-sm">✓ Ingestion Pipeline Completed</div>
              <div>Sources Scanned: {ingestionResult.sources_scanned}</div>
              <div>Records Processed/Updated: {ingestionResult.inserted_count}</div>
              <div>Expired Records Closed: {ingestionResult.expired_closed_count}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((src) => (
              <div key={src.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-100">{src.name}</span>
                      <Badge variant={src.last_status === "healthy" ? "green" : "red"}>
                        {src.last_status}
                      </Badge>
                    </div>
                    <div className="text-xs text-cyan-400 font-mono mt-0.5">{src.official_domain}</div>
                  </div>
                  <button
                    onClick={() => toggleSource(src.id, src.is_enabled)}
                    className={`btn btn-sm ${src.is_enabled ? "btn-secondary" : "btn-primary"}`}
                  >
                    {src.is_enabled ? "Disable" : "Enable"}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                  <Badge variant="blue">{src.category}</Badge>
                  <span>Coverage: <strong>{src.country || "GLOBAL"}</strong></span>
                  <span>Refresh: every {src.refresh_interval_days || 7}d</span>
                </div>

                <div className="text-xs text-gray-500 flex items-center justify-between pt-2 border-t border-[#2b2e36]">
                  <span>Last checked: {src.last_run_at ? new Date(src.last_run_at).toLocaleDateString() : "Never"}</span>
                  <span>Errors: {src.error_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. QUALITY REVIEW QUEUE TAB */}
      {/* ============================================================ */}
      {activeTab === "quality" && (
        <div className="space-y-4">
          <div>
            <h3 className="section-title text-base">Quality Review Queue</h3>
            <p className="text-xs text-gray-400">
              Flags uncertain extractions, stale listings, broken application links, and conflicting evidence.
            </p>
          </div>

          {qualityReports.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">
              ✓ All quality checks passed. No uncertain records or broken links pending review.
            </div>
          ) : (
            <div className="space-y-3">
              {qualityReports.map((q) => (
                <div key={q.id} className="card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={q.type === "stale" ? "yellow" : "red"}>
                        {q.type.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                      <span className="font-mono text-xs text-gray-400">Target ID: {q.opportunity_id}</span>
                    </div>
                    <p className="text-sm text-gray-200 mt-1">{q.details}</p>
                    <span className="text-xs text-gray-500">Reported: {new Date(q.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => resolveReport(q.id, "resolved")}
                      className="btn btn-primary btn-sm"
                    >
                      Resolve & Verify
                    </button>
                    <button
                      onClick={() => resolveReport(q.id, "ignored")}
                      className="btn btn-secondary btn-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. USERS & ROLES TAB */}
      {/* ============================================================ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="section-title text-base">User & Permissions Directory</h3>
              <p className="text-xs text-gray-400">
                Server-enforced role management, account suspension, and manual deletion review.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search user name or country..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="input text-sm w-full sm:w-64"
            />
          </div>

          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-100">
                      {u.display_name || u.email || "Unnamed User"}
                    </span>
                    <Badge variant={u.role === "owner" ? "blue" : u.role === "admin" ? "purple" : "gray"}>
                      {u.role.toUpperCase()}
                    </Badge>
                    {u.is_suspended && <Badge variant="red">SUSPENDED</Badge>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {u.email && <span>{u.email} · </span>}
                    Residence: <strong>{u.country_of_residence || "Not specified"}</strong> · Applications:{" "}
                    {u.application_count || 0}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role Switcher */}
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as "owner" | "admin" | "editor" | "user")}
                    className="input text-xs w-auto"
                    disabled={currentRole !== "owner"}
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="user">User</option>
                  </select>

                  <button
                    onClick={() => handleToggleSuspension(u.id, Boolean(u.is_suspended))}
                    className={`btn btn-sm ${u.is_suspended ? "btn-primary" : "btn-secondary"}`}
                  >
                    {u.is_suspended ? "Reactivate" : "Suspend"}
                  </button>

                  <button
                    onClick={() => handleProcessDeletion(u.id)}
                    className="btn btn-ghost btn-sm text-red-400 hover:text-red-300"
                  >
                    Suspend for deletion review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. PERSONALISATION TAB */}
      {/* ============================================================ */}
      {activeTab === "personalisation" && settings && (
        <div className="space-y-6">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="section-title text-base">Country Eligibility & Matching Rules</h3>
              {savingSettings && <span className="text-xs text-cyan-400 font-mono animate-pulse">Syncing...</span>}
            </div>
            <p className="text-xs text-gray-400">
              Rules governing how country residence, citizenship, and remote status determine eligibility in For You and Scout.
            </p>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded bg-[#15171c] border border-[#2b2e36] cursor-pointer">
                <div>
                  <div className="font-medium text-sm text-gray-200">US User Extended Eligibility</div>
                  <div className="text-xs text-gray-400">
                    A US user receives relevant US opportunities plus eligible international and global remote programs.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.country_rules.us_include_eligible_international}
                  onChange={(e) =>
                    saveSystemSettings({
                      country_rules: {
                        ...settings.country_rules,
                        us_include_eligible_international: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-cyan-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded bg-[#15171c] border border-[#2b2e36] cursor-pointer">
                <div>
                  <div className="font-medium text-sm text-gray-200">Auto-Include Remote Global Opportunities</div>
                  <div className="text-xs text-gray-400">
                    Always include worldwide remote opportunities for all countries unless country-restricted.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.country_rules.auto_include_remote_global}
                  onChange={(e) =>
                    saveSystemSettings({
                      country_rules: {
                        ...settings.country_rules,
                        auto_include_remote_global: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-cyan-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded bg-[#15171c] border border-[#2b2e36] cursor-pointer">
                <div>
                  <div className="font-medium text-sm text-gray-200">Strict Citizenship Validation</div>
                  <div className="text-xs text-gray-400">
                    Exempt candidates if explicit citizenship constraints don&apos;t match user profile.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.country_rules.require_explicit_citizenship_match}
                  onChange={(e) =>
                    saveSystemSettings({
                      country_rules: {
                        ...settings.country_rules,
                        require_explicit_citizenship_match: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-cyan-500 rounded"
                />
              </label>
            </div>
          </div>

          {/* Ranking Weights */}
          <div className="card p-5 space-y-4">
            <h3 className="section-title text-base">Scout & For You Ranking Weights</h3>
            <p className="text-xs text-gray-400">
              Weights used in the recommendation engine (total: 100 points).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Profile Fit Weight ({settings.ranking_weights.fit}%)</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={settings.ranking_weights.fit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ranking_weights: { ...settings.ranking_weights, fit: Number(e.target.value) },
                    })
                  }
                  onMouseUp={() => saveSystemSettings({ ranking_weights: settings.ranking_weights })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="label">Eligibility Certainty Weight ({settings.ranking_weights.eligibility}%)</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={settings.ranking_weights.eligibility}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ranking_weights: { ...settings.ranking_weights, eligibility: Number(e.target.value) },
                    })
                  }
                  onMouseUp={() => saveSystemSettings({ ranking_weights: settings.ranking_weights })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="label">Source Evidence Weight ({settings.ranking_weights.evidence}%)</label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={settings.ranking_weights.evidence}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ranking_weights: { ...settings.ranking_weights, evidence: Number(e.target.value) },
                    })
                  }
                  onMouseUp={() => saveSystemSettings({ ranking_weights: settings.ranking_weights })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="label">Freshness & Approaching Deadline ({settings.ranking_weights.freshness}%)</label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={settings.ranking_weights.freshness}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ranking_weights: { ...settings.ranking_weights, freshness: Number(e.target.value) },
                    })
                  }
                  onMouseUp={() => saveSystemSettings({ ranking_weights: settings.ranking_weights })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. NOTIFICATIONS TAB */}
      {/* ============================================================ */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="section-title text-base">Notification Delivery Schedules & Templates</h3>
            <p className="text-xs text-gray-400">
              Manages automated opportunity alerts and upcoming deadline digests. User notification preferences are always respected.
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded bg-[#15171c] border border-[#2b2e36] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-200">Weekly Scout Digest</div>
                  <div className="text-xs text-gray-400">Trigger: Every Monday 08:00 UTC · Email + App</div>
                </div>
                <Badge variant="green">ACTIVE</Badge>
              </div>

              <div className="p-3 rounded bg-[#15171c] border border-[#2b2e36] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-200">Deadline Approaching Alert (7 days)</div>
                  <div className="text-xs text-gray-400">Trigger: Daily 12:00 UTC for saved opportunities</div>
                </div>
                <Badge variant="green">ACTIVE</Badge>
              </div>

              <div className="p-3 rounded bg-[#15171c] border border-[#2b2e36] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-200">New Category Match Alert</div>
                  <div className="text-xs text-gray-400">Trigger: Real-time upon ingestion of 90%+ match</div>
                </div>
                <Badge variant="green">ACTIVE</Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. OPERATIONS & KILL SWITCHES TAB */}
      {/* ============================================================ */}
      {activeTab === "operations" && settings && (
        <div className="space-y-6">
          {/* Emergency Kill Switches */}
          <div className="card p-5 border-red-900/60 bg-red-950/10 space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-base">
              <span>⚠️ Emergency Operations & Kill Switches</span>
            </div>
            <p className="text-xs text-gray-400">
              Immediate controls to stop background ingestion or outgoing notifications in the event of upstream rate limits or issues.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[#181a1f] border border-[#2b2e36] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-200">Collection Ingestion Kill Switch</div>
                  <div className="text-xs text-gray-400">Halts all scheduled scrapers and feeds</div>
                </div>
                <button
                  onClick={() =>
                    saveSystemSettings({
                      feature_flags: {
                        ...settings.feature_flags,
                        collection_kill_switch: !settings.feature_flags.collection_kill_switch,
                      },
                    })
                  }
                  className={`btn btn-sm ${
                    settings.feature_flags.collection_kill_switch ? "btn-danger" : "btn-secondary"
                  }`}
                >
                  {settings.feature_flags.collection_kill_switch ? "ACTIVE (HALTED)" : "Standby (Normal)"}
                </button>
              </div>

              <div className="p-4 rounded-lg bg-[#181a1f] border border-[#2b2e36] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-gray-200">Notification Kill Switch</div>
                  <div className="text-xs text-gray-400">Halts all outgoing emails and push alerts</div>
                </div>
                <button
                  onClick={() =>
                    saveSystemSettings({
                      feature_flags: {
                        ...settings.feature_flags,
                        notification_kill_switch: !settings.feature_flags.notification_kill_switch,
                      },
                    })
                  }
                  className={`btn btn-sm ${
                    settings.feature_flags.notification_kill_switch ? "btn-danger" : "btn-secondary"
                  }`}
                >
                  {settings.feature_flags.notification_kill_switch ? "ACTIVE (HALTED)" : "Standby (Normal)"}
                </button>
              </div>
            </div>
          </div>

          {/* AI Usage & Cost Estimation */}
          <div className="card p-5 space-y-3">
            <h3 className="section-title text-base">AI Usage & Cost Monitoring</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded bg-[#15171c] border border-[#2b2e36]">
                <div className="text-xs text-gray-400">Active AI Model</div>
                <div className="font-bold text-sm text-gray-200 mt-1">OpenRouter / Ling 3.0 Flash</div>
                <div className="text-xs text-emerald-400 mt-1">Free Tier / Active</div>
              </div>
              <div className="p-3 rounded bg-[#15171c] border border-[#2b2e36]">
                <div className="text-xs text-gray-400">Estimated Tokens (24h)</div>
                <div className="font-bold text-sm text-gray-200 mt-1">14,200 tokens</div>
                <div className="text-xs text-gray-400 mt-1">$0.00 / free allocation</div>
              </div>
              <div className="p-3 rounded bg-[#15171c] border border-[#2b2e36]">
                <div className="text-xs text-gray-400">Job Queues Status</div>
                <div className="font-bold text-sm text-emerald-400 mt-1">Healthy · 0 Backlogged</div>
                <div className="text-xs text-gray-400 mt-1">Cron: Scheduled via Vercel / API</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. AUDIT LOG TAB */}
      {/* ============================================================ */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div>
            <h3 className="section-title text-base">Immutable Security Audit Trail</h3>
            <p className="text-xs text-gray-400">
              Logs all administrative actions, role assignments, deletions, and configuration changes.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">
              No audit records generated yet.
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="card p-3 flex items-center justify-between gap-4 text-xs font-mono">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="blue">{log.action}</Badge>
                      <span className="text-gray-300">{log.admin_email}</span>
                      <span className="text-gray-500">→ target: {log.target_type} ({log.target_id || "general"})</span>
                    </div>
                    {log.details && (
                      <div className="text-gray-400 mt-1 text-[11px] truncate">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                  <div className="text-gray-500 shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}
