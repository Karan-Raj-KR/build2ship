import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "blue" | "green" | "yellow" | "red" | "gray" | "purple";
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: "bg-[var(--surface-subtle)] text-[var(--ink)] border-[var(--line)]",
  blue: "bg-[#DDF4FF] text-[#0E74A6] border-[#99DAFC]",
  green: "bg-[#EEFFD9] text-[#287300] border-[#B7E885]",
  yellow: "bg-[#FFF5E0] text-[#966100] border-[#FCD68A]",
  red: "bg-[#FEEAEA] text-[#9E1616] border-[#F8B4B4]",
  gray: "bg-[var(--surface-interactive)] text-[var(--muted)] border-[var(--line)]",
  purple: "bg-[#F3E8FA] text-[#69328C] border-[#D8BCEE]",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide border-2 ${variantClasses[variant] || variantClasses.default} ${className}`}
    >
      {children}
    </span>
  );
}
