"use client";

import { AnalyzeForm } from "@/components/AnalyzeForm";
import { SchoolMealForm } from "@/components/SchoolMealForm";
import { useState } from "react";

type TabId = "school" | "manual";

const TABS: { id: TabId; label: string; hint: string; icon: string; iconBg: string }[] = [
  {
    id: "school",
    label: "학교 급식",
    hint: "나이스 연동",
    icon: "🏫",
    iconBg: "bg-sky-100 dark:bg-sky-950/60",
  },
  {
    id: "manual",
    label: "직접 입력",
    hint: "텍스트 입력",
    icon: "✏️",
    iconBg: "bg-brand-100 dark:bg-brand-950/60",
  },
];

export function AppShell() {
  const [tab, setTab] = useState<TabId>("school");

  return (
    <section className="card overflow-hidden p-0">
      <div
        role="tablist"
        aria-label="분석 방식 선택"
        className="grid grid-cols-2 border-b border-brand-100/80 bg-gradient-to-r from-sky-50/50 via-white to-brand-50/50 dark:border-brand-900/30 dark:from-sky-950/20 dark:via-stone-900/50 dark:to-brand-950/20"
      >
        {TABS.map(({ id, label, hint, icon, iconBg }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`tab-btn ${active ? `tab-btn-active tab-${id}` : ""}`}
            >
              <span className={`tab-icon ${iconBg}`}>{icon}</span>
              <span className="block text-sm font-bold">{label}</span>
              <span className="mt-0.5 block text-xs font-normal opacity-75">{hint}</span>
            </button>
          );
        })}
      </div>

      <div className="p-6 sm:p-7" role="tabpanel">
        {tab === "school" ? <SchoolMealForm embedded /> : <AnalyzeForm embedded />}
      </div>
    </section>
  );
}
