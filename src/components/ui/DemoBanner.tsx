"use client";
import { APP_NAME } from "@/config/app";

export function DemoBanner() {
  return (
    <div className="demo-banner" role="alert">
      <strong>Demo mode</strong> — {APP_NAME} is using local sample data, which resets when this session ends.
    </div>
  );
}
