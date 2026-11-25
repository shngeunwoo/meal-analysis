"use client";

import type { MealAnalysisPayload } from "@/lib/pipeline/runMealAnalysis";
import { NEIS_ALLERGEN_LABEL, parseNeisCalories } from "@/lib/neis/parseMealInfo";

type NeisMeal = NonNullable<MealAnalysisPayload["neisMeal"]>;

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export function formatMealDate(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${Number(m[2])}월 ${Number(m[3])}일 (${WEEKDAY[d.getDay()]})`;
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function NeisMealCard({
  meal,
  estimatedKcal,
}: {
  meal: NeisMeal;
  estimatedKcal: number;
}) {
  const dishes = meal.dishes ?? [];
  const neisKcal = meal.kcal ?? parseNeisCalories(meal.calInfo);
  const nutrients = meal.nutrients ?? [];
  const origins = meal.origins ?? [];
  const allAllergens = [...new Set(dishes.flatMap((d) => d.allergens))].sort(
    (a, b) => a - b,
  );
  const diffPct =
    neisKcal && estimatedKcal > 0
      ? Math.round(((estimatedKcal - neisKcal) / neisKcal) * 100)
      : null;

  return (
    <div className="result-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-stone-900 dark:text-stone-100">
            {meal.schoolName}
          </p>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
            {formatMealDate(meal.date)}
          </p>
        </div>
        {meal.mealName && <span className="badge-brand">{meal.mealName}</span>}
      </div>

      {dishes.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {dishes.map((d) => (
            <li
              key={d.name}
              className="rounded-xl border border-stone-200/80 bg-white/70 px-3 py-2 dark:border-stone-700/70 dark:bg-stone-900/50"
            >
              <p className="break-keep font-medium text-stone-800 dark:text-stone-100">
                {d.name}
              </p>
              {d.allergens.length > 0 && (
                <p
                  className="mt-0.5 text-[11px] leading-snug text-stone-500 dark:text-stone-400"
                  title={`알레르기 번호 ${d.allergens.join(".")}`}
                >
                  {d.allergens.map((n) => NEIS_ALLERGEN_LABEL[n] ?? n).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {allAllergens.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
            알레르기 유발 식품
          </span>
          {allAllergens.map((n) => (
            <span key={n} className="badge-warm">
              {NEIS_ALLERGEN_LABEL[n] ?? n}
            </span>
          ))}
        </div>
      )}

      {neisKcal != null && (
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-3 text-sm dark:bg-stone-900/60">
          <div>
            <p className="text-xs text-stone-500">학교 제공 열량 (나이스)</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-100">
              {Math.round(neisKcal)} <span className="text-xs font-medium">kcal</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">앱 추정 합산</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-100">
              {Math.round(estimatedKcal)} <span className="text-xs font-medium">kcal</span>
              {diffPct != null && diffPct !== 0 && (
                <span
                  className={`ml-1.5 text-xs font-medium ${
                    Math.abs(diffPct) >= 25
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-stone-500"
                  }`}
                >
                  ({diffPct > 0 ? "+" : ""}
                  {diffPct}%)
                </span>
              )}
            </p>
          </div>
          {diffPct != null && Math.abs(diffPct) >= 25 && (
            <p className="col-span-2 text-xs text-amber-800 dark:text-amber-200">
              학교 제공 열량과 차이가 큽니다. 아래에서 매칭이나 분량(g)을 확인해 보세요.
            </p>
          )}
        </div>
      )}

      {nutrients.length > 0 && (
        <details className="history-details">
          <summary>나이스 영양정보 ({nutrients.length}개)</summary>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            {nutrients.map((n) => (
              <div key={n.label} className="flex justify-between gap-2">
                <dt className="text-stone-600 dark:text-stone-400">{n.label}</dt>
                <dd className="tabular-nums text-stone-800 dark:text-stone-200">
                  {formatNumber(n.value)}
                  <span className="ml-0.5 text-xs text-stone-500">{n.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {origins.length > 0 && (
        <details className="history-details">
          <summary>원산지 ({origins.length}개)</summary>
          <ul className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {origins.map((o) => (
              <li key={`${o.item}-${o.origin}`} className="flex justify-between gap-2">
                <span className="text-stone-600 dark:text-stone-400">{o.item}</span>
                <span className="text-right text-stone-800 dark:text-stone-200">
                  {o.origin}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-stone-500">
        출처: {meal.source} · 아래 영양 합산은 내부 DB 추정치입니다.
      </p>
    </div>
  );
}
