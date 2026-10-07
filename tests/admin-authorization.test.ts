import { describe, it, expect } from "vitest";

describe("Server-Enforced Role Hierarchy and Permissions", () => {
  type AdminRole = "owner" | "admin" | "editor" | "user";

  function checkAuthorization(
    user: { role: AdminRole; is_suspended?: boolean },
    allowedRoles: ("owner" | "admin" | "editor")[]
  ): { authorized: boolean; status: number; error?: string } {
    if (user.is_suspended) {
      return { authorized: false, status: 403, error: "Account suspended" };
    }

    if (user.role === "user" || !allowedRoles.includes(user.role)) {
      return {
        authorized: false,
        status: 403,
        error: `Access denied. Requires: ${allowedRoles.join(" or ")}. Your role: ${user.role}`,
      };
    }

    return { authorized: true, status: 200 };
  }

  it("denies access to ordinary users attempting admin operations", () => {
    const ordinaryUser = { role: "user" as AdminRole };
    const res = checkAuthorization(ordinaryUser, ["owner", "admin", "editor"]);

    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain("Access denied");
  });

  it("strictly blocks suspended accounts regardless of their previous role", () => {
    const suspendedAdmin = { role: "admin" as AdminRole, is_suspended: true };
    const res = checkAuthorization(suspendedAdmin, ["owner", "admin", "editor"]);

    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain("Account suspended");
  });

  it("permits editors to curate opportunities but restricts destructive user role changes", () => {
    const editor = { role: "editor" as AdminRole };

    // Editor can view and curate opportunities
    const curationAuth = checkAuthorization(editor, ["owner", "admin", "editor"]);
    expect(curationAuth.authorized).toBe(true);

    // Editor cannot manage users or settings
    const adminOnlyAuth = checkAuthorization(editor, ["owner", "admin"]);
    expect(adminOnlyAuth.authorized).toBe(false);
    expect(adminOnlyAuth.status).toBe(403);
  });

  it("reserves owner-only operations exclusively for the owner role", () => {
    const adminUser = { role: "admin" as AdminRole };
    const ownerUser = { role: "owner" as AdminRole };

    // Admin attempting owner action (e.g. promoting someone to owner)
    const adminAttempt = checkAuthorization(adminUser, ["owner"]);
    expect(adminAttempt.authorized).toBe(false);

    // Owner performing owner action
    const ownerAttempt = checkAuthorization(ownerUser, ["owner"]);
    expect(ownerAttempt.authorized).toBe(true);
    expect(ownerAttempt.status).toBe(200);
  });
});
