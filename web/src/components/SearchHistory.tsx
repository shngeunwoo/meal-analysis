"use client";

import type { ReactNode } from "react";
import type { ManualMealEntry, SchoolMealEntry, SchoolSearchEntry } from "@/lib/history/userHistory";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryChip({
  label,
  sub,
  onPick,
  onRemove,
}: {
  label: string;
  sub?: string;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="history-chip">
      <button
        type="button"
        onClick={onPick}
        className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm transition hover:bg-brand-50/80 dark:hover:bg-brand-950/30"
      >
        <span className="block truncate font-medium text-stone-800 dark:text-stone-100">
          {label}
        </span>
        {sub ? (
          <span className="mt-0.5 block truncate text-xs text-stone-500">{sub}</span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="border-l border-stone-200 px-2.5 text-sm text-stone-400 transition hover:bg-stone-50 hover:text-stone-600 dark:border-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300"
        aria-label="기록 삭제"
      >
        ×
      </button>
    </div>
  );
}

function HistoryBlock({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <details className="history-details">
      <summary>
        {title} ({count})
      </summary>
      {children}
    </details>
  );
}

export function SchoolSearchHistory({
  items,
  onPick,
  onRemove,
}: {
  items: SchoolSearchEntry[];
  onPick: (item: SchoolSearchEntry) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <HistoryBlock title="최근 학교 검색" count={items.length}>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <HistoryChip
            key={item.id}
            label={item.query}
            sub={[item.region, formatWhen(item.usedAt)].filter(Boolean).join(" · ")}
            onPick={() => onPick(item)}
            onRemove={() => onRemove(item.id)}
          />
        ))}
      </div>
    </HistoryBlock>
  );
}

export function SchoolMealHistory({
  items,
  onPick,
  onRemove,
}: {
  items: SchoolMealEntry[];
  onPick: (item: SchoolMealEntry) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <HistoryBlock title="최근 급식 분석" count={items.length}>
      <div className="grid gap-2">
        {items.map((item) => (
          <HistoryChip
            key={item.id}
            label={`${item.schoolName} · ${item.mealLabel}`}
            sub={`${item.mlsvYmd} · ${formatWhen(item.usedAt)}`}
            onPick={() => onPick(item)}
            onRemove={() => onRemove(item.id)}
          />
        ))}
      </div>
    </HistoryBlock>
  );
}

export function ManualMealHistory({
  items,
  onPick,
  onRemove,
}: {
  items: ManualMealEntry[];
  onPick: (item: ManualMealEntry) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <HistoryBlock title="최근 입력" count={items.length}>
      <div className="grid gap-2">
        {items.map((item) => (
          <HistoryChip
            key={item.id}
            label={item.text.length > 48 ? `${item.text.slice(0, 48)}…` : item.text}
            sub={`${item.mealLabel} · ${formatWhen(item.usedAt)}`}
            onPick={() => onPick(item)}
            onRemove={() => onRemove(item.id)}
          />
        ))}
      </div>
    </HistoryBlock>
  );
}
