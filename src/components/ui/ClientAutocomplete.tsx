/**
 * CLIENT AUTOCOMPLETE
 * 
 * As the user types a client name, shows matching clients from existing matters.
 * Selecting a suggestion fills in company and email automatically.
 * Typing a new name creates a fresh client.
 *
 * SaaS NOTES:
 * - In production, this queries the org-scoped clients or matters table.
 * - Could be enhanced with a dedicated clients table for CRM-style management.
 */
"use client";

import { useEffect, useState, useRef } from "react";

interface ClientSuggestion {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
}

interface ClientAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
  onSelect: (client: ClientSuggestion) => void;
  placeholder?: string;
}

export function ClientAutocomplete({ value, onChange, onSelect, placeholder }: ClientAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  //const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/clients?q=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then((data) => {
          // Filter out exact match (don't suggest what's already typed)
          const filtered = data.filter((c: ClientSuggestion) =>
            c.clientName.toLowerCase() !== value.toLowerCase()
          );
          setSuggestions(filtered);
          setShowDropdown(filtered.length > 0);
          setHighlightIdx(-1);
        })
        .catch(() => setSuggestions([]));
    }, 200);
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (client: ClientSuggestion) => {
    onSelect(client);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIdx]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        className="input-field py-2.5"
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Client name"}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[12px] overflow-hidden z-50"
          style={{ boxShadow: "0 10px 20px rgba(0,0,0,0.1), 0 0 0 0.5px rgba(0,0,0,0.05)" }}>
          {suggestions.map((client, i) => (
            <button
              key={`${client.clientName}-${i}`}
              className="w-full text-left px-4 py-3 border-none bg-transparent cursor-pointer transition-colors"
              style={{ background: i === highlightIdx ? "var(--color-surface-dim)" : "transparent" }}
              onMouseEnter={() => setHighlightIdx(i)}
              onClick={() => handleSelect(client)}
            >
              <p className="text-[14px] font-medium text-[var(--color-text-primary)] m-0">{client.clientName}</p>
              {(client.clientCompany || client.clientEmail) && (
                <p className="text-[12px] text-[var(--color-text-muted)] m-0 mt-0.5">
                  {[client.clientCompany, client.clientEmail].filter(Boolean).join(" · ")}
                </p>
              )}
            </button>
          ))}
          <div className="px-4 py-2 border-t border-[var(--color-border)]">
            <p className="text-[11px] text-[var(--color-text-muted)] m-0">
              Type to search existing clients or enter a new name
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
