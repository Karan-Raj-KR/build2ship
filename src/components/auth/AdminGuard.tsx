"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/LoadingSpinner";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    import("@/lib/db/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (!isMounted) return;
        if (error || !user) {
          router.push("/login");
          return;
        }

        const appRole = (user.app_metadata?.role as string) || (user.app_metadata?.is_admin ? "admin" : null);

        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()
          .then(
            ({ data: profile }) => {
              if (!isMounted) return;

              if (profile?.is_suspended) {
                router.push("/home");
                return;
              }

              const effectiveRole = appRole || profile?.role || (profile?.is_admin ? "admin" : "user");
              const hasAdminAccess = ["owner", "admin", "editor"].includes(effectiveRole);

              if (!hasAdminAccess) {
                router.push("/home");
                return;
              }

              setAuthorized(true);
              setChecking(false);
            },
            () => {
              if (!isMounted) return;
              if (appRole && ["owner", "admin", "editor"].includes(appRole)) {
                setAuthorized(true);
              } else {
                router.push("/home");
              }
              setChecking(false);
            }
          );
      });
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checking || !authorized) return <PageLoader />;
  return <>{children}</>;
}
