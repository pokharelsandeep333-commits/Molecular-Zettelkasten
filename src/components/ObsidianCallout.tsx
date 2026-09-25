'use client';

import React, { useState } from 'react';

/* ── Callout theme map ───────────────────────────────────────────── */

interface CalloutTheme {
  icon: string;
  color: string;       // accent color (border + title text)
  bgColor: string;     // tinted background
}

const CALLOUT_THEMES: Record<string, CalloutTheme> = {
  // ── Informational (Cyan — app signature) ──
  NOTE:     { icon: 'ℹ️',  color: '#00F0FF', bgColor: 'rgba(0, 240, 255, 0.08)' },
  INFO:     { icon: 'ℹ️',  color: '#00F0FF', bgColor: 'rgba(0, 240, 255, 0.08)' },

  // ── Tips (Emerald green) ──
  TIP:      { icon: '💡', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.08)' },
  HINT:     { icon: '💡', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.08)' },

  // ── Important (Violet) ──
  IMPORTANT:{ icon: '🔥', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.08)' },

  // ── Warning (Amber) ──
  WARNING:  { icon: '⚠️',  color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.08)' },
  CAUTION:  { icon: '⚠️',  color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.08)' },
  ATTENTION:{ icon: '⚠️',  color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.08)' },

  // ── Danger / Error (Red) ──
  DANGER:   { icon: '🛑', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.08)' },
  ERROR:    { icon: '🛑', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.08)' },
  FAILURE:  { icon: '❌', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.08)' },
  FAIL:     { icon: '❌', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.08)' },
  MISSING:  { icon: '❌', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.08)' },

  // ── Bug (Red-orange) ──
  BUG:      { icon: '🐛', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.08)' },

  // ── Example (Indigo) ──
  EXAMPLE:  { icon: '📝', color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.08)' },

  // ── Quote (Muted steel) ──
  QUOTE:    { icon: '💬', color: 'rgba(180, 220, 255, 0.7)', bgColor: 'rgba(180, 220, 255, 0.05)' },
  CITE:     { icon: '💬', color: 'rgba(180, 220, 255, 0.7)', bgColor: 'rgba(180, 220, 255, 0.05)' },

  // ── Abstract / Summary (Teal) ──
  ABSTRACT: { icon: '📋', color: '#14B8A6', bgColor: 'rgba(20, 184, 166, 0.08)' },
  SUMMARY:  { icon: '📋', color: '#14B8A6', bgColor: 'rgba(20, 184, 166, 0.08)' },
  TLDR:     { icon: '📋', color: '#14B8A6', bgColor: 'rgba(20, 184, 166, 0.08)' },

  // ── Todo (Cyan) ──
  TODO:     { icon: '☑️',  color: '#00F0FF', bgColor: 'rgba(0, 240, 255, 0.08)' },

  // ── Success (Green) ──
  SUCCESS:  { icon: '✅', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.08)' },
  CHECK:    { icon: '✅', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.08)' },
  DONE:     { icon: '✅', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.08)' },

  // ── Question (Amber) ──
  QUESTION: { icon: '❓', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.08)' },
  FAQ:      { icon: '❓', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.08)' },
  HELP:     { icon: '❓', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.08)' },
};

const DEFAULT_THEME: CalloutTheme = {
  icon: '📌',
  color: '#00F0FF',
  bgColor: 'rgba(0, 240, 255, 0.08)',
};

/* ── Component ───────────────────────────────────────────────────── */

interface ObsidianCalloutProps {
  calloutType?: string;
  title?: string;
  isFoldable?: string;
  defaultCollapsed?: string;
  children?: React.ReactNode;
}

export const ObsidianCallout: React.FC<ObsidianCalloutProps> = ({
  calloutType = 'NOTE',
  title = 'Note',
  isFoldable = 'false',
  defaultCollapsed = 'false',
  children,
}) => {
  const foldable = isFoldable === 'true';
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed === 'true');

  const theme = CALLOUT_THEMES[calloutType.toUpperCase()] || DEFAULT_THEME;

  const toggleCollapsed = () => {
    if (foldable) setIsCollapsed((prev) => !prev);
  };

  return (
    <div
      className="callout-wrapper my-4 rounded-lg overflow-hidden backdrop-blur-sm"
      style={{
        borderLeft: `3px solid ${theme.color}`,
        backgroundColor: theme.bgColor,
      }}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-4 py-2.5 select-none ${
          foldable ? 'cursor-pointer hover:brightness-110 transition-all' : ''
        }`}
        onClick={toggleCollapsed}
        role={foldable ? 'button' : undefined}
        tabIndex={foldable ? 0 : undefined}
        aria-expanded={foldable ? !isCollapsed : undefined}
        onKeyDown={
          foldable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleCollapsed();
                }
              }
            : undefined
        }
      >
        {/* Icon */}
        <span className="text-base leading-none" aria-hidden="true">
          {theme.icon}
        </span>

        {/* Title */}
        <span
          className="text-sm font-semibold tracking-wide uppercase font-tech"
          style={{ color: theme.color }}
        >
          {title}
        </span>

        {/* Fold chevron */}
        {foldable && (
          <span
            className="ml-auto text-xs transition-transform duration-200"
            style={{
              color: theme.color,
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </span>
        )}
      </div>

      {/* Body */}
      <div
        className={`callout-content ${isCollapsed ? 'callout-collapsed' : ''}`}
      >
        <div>
          <div className="px-4 pb-3 text-sm text-on-surface/90 leading-relaxed [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
