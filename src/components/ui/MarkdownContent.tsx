"use client";

import React from "react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Parses inline markdown: **bold**, *italic*, `code`, [link](url)
 */
export function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Regex to split by bold (**...**), italic (*...* or _..._), code (`...`), or link ([...](...))
  const regex = /(\*\*.*?\*\*|\*.*?\*|_.*?_|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Bold **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-[var(--ink)]">
          {renderInlineMarkdown(part.slice(2, -2))}
        </strong>
      );
    }

    // Inline Code `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--line)] text-[#285C48] font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic *text* or _text_
    if (
      ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) &&
      part.length >= 2
    ) {
      return (
        <em key={idx} className="italic text-[var(--ink)]">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Link [label](url)
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        return (
          <a
            key={idx}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#285C48] hover:underline font-semibold"
          >
            {match[1]}
          </a>
        );
      }
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Clean, lightweight Markdown component that renders bold, italic, lists, and headings
 * without leaving raw asterisks or broken layout.
 */
export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  if (!content) return null;

  // Split into lines to parse list items and paragraphs
  const rawLines = content.split("\n");
  const nodes: React.ReactNode[] = [];

  let currentListType: "bullet" | "number" | null = null;
  let currentListItems: React.ReactNode[] = [];

  function flushList() {
    if (currentListType === "bullet" && currentListItems.length > 0) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="my-2 pl-4 list-disc marker:text-[#285C48] space-y-1">
          {currentListItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
    } else if (currentListType === "number" && currentListItems.length > 0) {
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="my-2 pl-4 list-decimal marker:font-bold marker:text-[#285C48] space-y-1">
          {currentListItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ol>
      );
    }
    currentListType = null;
    currentListItems = [];
  }

  rawLines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    // Empty line separates blocks
    if (!trimmed) {
      flushList();
      return;
    }

    // Heading: ### or ## or #
    if (trimmed.startsWith("### ")) {
      flushList();
      nodes.push(
        <h4 key={`h4-${lineIndex}`} className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] mt-3 mb-1">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      nodes.push(
        <h3 key={`h3-${lineIndex}`} className="font-bold text-sm text-[var(--ink)] mt-3 mb-1">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      nodes.push(
        <h2 key={`h2-${lineIndex}`} className="font-extrabold text-base text-[var(--ink)] mt-3 mb-1">
          {renderInlineMarkdown(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Bullet List Item: "- " or "* "
    if (trimmed.startsWith("- ") || (trimmed.startsWith("* ") && !trimmed.startsWith("**"))) {
      const itemContent = trimmed.slice(2);
      if (currentListType !== "bullet") {
        flushList();
        currentListType = "bullet";
      }
      currentListItems.push(renderInlineMarkdown(itemContent));
      return;
    }

    // Numbered List Item: "1. ", "2. ", etc.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const itemContent = numMatch[2];
      if (currentListType !== "number") {
        flushList();
        currentListType = "number";
      }
      currentListItems.push(renderInlineMarkdown(itemContent));
      return;
    }

    // Regular text line
    flushList();

    // If the line starts and ends with ** (e.g., "**Apply to this week:**"), render as a bold subheading
    if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("**")) {
      nodes.push(
        <p key={`p-${lineIndex}`} className="font-bold text-[var(--ink)] mt-2.5 mb-1 leading-snug">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    } else {
      nodes.push(
        <p key={`p-${lineIndex}`} className="leading-relaxed mb-2 last:mb-0">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  flushList();

  return <div className={`space-y-1 ${className}`}>{nodes}</div>;
}
