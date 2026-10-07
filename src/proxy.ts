import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/db/middleware";
import { IS_DEMO_MODE } from "@/config/app";

export async function proxy(request: NextRequest) {
  // In demo mode, skip auth middleware entirely
  if (IS_DEMO_MODE) {
    return;
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
