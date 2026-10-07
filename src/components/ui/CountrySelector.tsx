"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { searchCountries, countryName, type Country } from "@/lib/countries";

interface CountrySelectorProps {
  value: string | null;
  onChange: (code: string) => void;
  placeholder?: string;
  id?: string;
  label?: string;
}

export function CountrySelector({
  value,
  onChange,
  placeholder = "Search countries…",
  id,
  label,
}: CountrySelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = searchCountries(query);
  const displayValue = value ? countryName(value) : "";

  const select = useCallback(
    (country: Country) => {
      onChange(country.code);
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange],
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[highlightedIndex]) select(results[highlightedIndex]);
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="input"
        value={open ? query : displayValue}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlightedIndex(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlightedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
      />
      {open && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-[var(--line)] bg-[var(--surface-main)] shadow-lg text-sm text-[var(--ink)]"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-[var(--ink-muted)]">No countries found</li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.code}
                role="option"
                aria-selected={c.code === value?.toUpperCase()}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                  i === highlightedIndex ? "bg-[#E9F1E4] text-[#285C48] font-medium" : "text-[var(--ink)] hover:bg-[var(--surface-interactive)]"
                }`}
                onMouseDown={() => select(c)}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                <span>{c.name}</span>
                <span className="text-[var(--ink-muted)] text-xs">{c.code}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

interface NationalitySelectorProps {
  value: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
  id?: string;
  label?: string;
}

export function NationalitySelector({
  value,
  onChange,
  placeholder = "Search countries…",
  id,
  label,
}: NationalitySelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = searchCountries(query);

  const remove = useCallback(
    (code: string) => {
      onChange(value.filter((v) => v !== code));
    },
    [value, onChange],
  );

  const add = useCallback(
    (country: Country) => {
      if (!value.includes(country.code)) {
        onChange([...value, country.code]);
      }
      setQuery("");
      setHighlightedIndex(0);
    },
    [value, onChange],
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[highlightedIndex]) add(results[highlightedIndex]);
        break;
      case "Escape":
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
        break;
      case "Backspace":
        if (!query && value.length > 0) {
          remove(value[value.length - 1]);
        }
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <div
        className="input min-h-[38px] flex flex-wrap gap-1 items-center cursor-text"
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {value.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md"
          >
            {countryName(code)}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(code);
              }}
              className="text-blue-400 hover:text-blue-600"
              aria-label={`Remove ${countryName(code)}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
          value={open ? query : ""}
          placeholder={value.length === 0 ? placeholder : ""}
          autoComplete="off"
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
        />
      </div>
      {open && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-gray-400">No countries found</li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.code}
                role="option"
                aria-selected={value.includes(c.code)}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                  i === highlightedIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                } ${value.includes(c.code) ? "font-medium" : ""}`}
                onMouseDown={() => add(c)}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                <span>
                  {value.includes(c.code) && "✓ "}
                  {c.name}
                </span>
                <span className="text-gray-400 text-xs">{c.code}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
