// ============================================================
// API AUTH HELPER — verify authenticated user on server routes
// Returns the authenticated user or null + error response.
// ============================================================
import { NextRequest, NextResponse } from "next/server";

import { IS_DEMO_MODE } from "@/config/app";

interface AuthResult {
  userId: string | null;
  error: NextResponse | null;
  profile?: import("@/types/database").Profile | null;
}

export async function requireAuth(request?: NextRequest): Promise<AuthResult> {
  // In demo mode, use a fixed demo user ID
  if (IS_DEMO_MODE) {
    return {
      userId: "demo-user-00000000-0000-0000-0000-000000000001",
      error: null,
    };
  }

  try {
    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user || !user.email_confirmed_at) {
      return {
        userId: null,
        error: NextResponse.json(
          { error: "Authentication required. Please sign in." },
          { status: 401 }
        ),
      };
    }

    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.is_suspended) return { userId: null, error: NextResponse.json({ error: 'Account suspended.' }, { status: 403 }) };
    return { userId: user.id, error: null, profile };
  } catch {
    return {
      userId: null,
      error: NextResponse.json(
        { error: "Failed to verify authentication." },
        { status: 500 }
      ),
    };
  }
}

export interface AdminAuthResult {
  userId: string | null;
  email: string | null;
  role: "owner" | "admin" | "editor" | "user";
  error: NextResponse | null;
}

export async function requireAdminRole(
  allowedRoles: ("owner" | "admin" | "editor")[] = ["owner", "admin"]
): Promise<AdminAuthResult> {
  if (IS_DEMO_MODE) {
    return {
      userId: "demo-user-00000000-0000-0000-0000-000000000001",
      email: "demo-admin@opportunityos.local",
      role: "owner",
      error: null,
    };
  }

  try {
    const { createClient } = await import("@/lib/db/server");
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email_confirmed_at) {
      return {
        userId: null,
        email: null,
        role: "user",
        error: NextResponse.json(
          { error: "Authentication required. Please sign in." },
          { status: 401 }
        ),
      };
    }

    // Check profile role & status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile?.is_suspended) {
      return {
        userId: user.id,
        email: user.email || null,
        role: "user",
        error: NextResponse.json(
          { error: "Your account has been suspended. Please contact support." },
          { status: 403 }
        ),
      };
    }

    const appRole = (user.app_metadata?.role as "owner" | "admin" | "editor" | undefined) || null;
    const effectiveRole: "owner" | "admin" | "editor" | "user" =
      appRole || profile?.role || (user.app_metadata?.is_admin || profile?.is_admin ? "admin" : "user");

    if (effectiveRole === "user" || !allowedRoles.includes(effectiveRole as ("owner" | "admin" | "editor"))) {
      return {
        userId: user.id,
        email: user.email || null,
        role: effectiveRole,
        error: NextResponse.json(
          {
            error: `Access denied. Requires role: ${allowedRoles.join(" or ")}. Your role: ${effectiveRole}`,
          },
          { status: 403 }
        ),
      };
    }

    return {
      userId: user.id,
      email: user.email || null,
      role: effectiveRole,
      error: null,
    };
  } catch {
    return {
      userId: null,
      email: null,
      role: "user",
      error: NextResponse.json(
        { error: "Failed to verify admin privileges." },
        { status: 500 }
      ),
    };
  }
}

export async function requireOwner(): Promise<AdminAuthResult> {
  return requireAdminRole(["owner"]);
}

export async function requireAdmin(): Promise<AuthResult> {
  const res = await requireAdminRole(["owner", "admin", "editor"]);
  return {
    userId: res.userId,
    error: res.error,
  };
}

// Input sanitization: strip potentially dangerous content
export function sanitizeInput(input: string, maxLength: number = 10000): string {
  return input
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

// Rate limit check (simple in-memory per-user)
const _rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

export function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = _rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    _rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}
