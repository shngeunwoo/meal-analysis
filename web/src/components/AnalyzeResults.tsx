"use client";

import { addAliasAction, type AliasState, type AnalyzeResultPayload } from "@/app/actions";
import { FOODS } from "@/data/foods";
import { getMealTargets, MEAL_LABEL, defaultIntakeGrams, servingBasisGrams } from "@/lib/analysis";
import { NeisMealCard } from "@/components/NeisMealCard";
import { foodEvidenceLine } from "@/lib/foodEvidence";
import { neisNutrientTotals } from "@/lib/neis/parseMealInfo";
import { NUTRIENT_LABEL_KO } from "@/lib/nutrientLabels";
import { matchNeedsConfirmation } from "@/lib/match";
import { computeMealAnalysis } from "@/lib/pipeline/computeMealAnalysis";
import type { FoodItem, FoodMatchRow, NutrientId, NutrientMap } from "@/types";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

const NUTRIENT_ORDER: NutrientId[] = [
  "energy_kcal",
  "protein_g",
  "fat_g",
  "carb_g",
  "sodium_mg",
  "fiber_g",
];

const NUTRIENT_COLORS: Record<NutrientId, string> = {
  energy_kcal: "bg-warm-400",
  protein_g: "bg-brand-500",
  fat_g: "bg-amber-400",
  carb_g: "bg-sky-400",
  sodium_mg: "bg-rose-400",
  fiber_g: "bg-lime-500",
};

function formatValue(id: NutrientId, value: number): string {
  if (id === "energy_kcal") return `${Math.round(value)} kcal`;
  if (id === "sodium_mg") return `${Math.round(value)} mg`;
  return `${value.toFixed(1)} g`;
}

function NutrientBar({
  id,
  value,
  target,
}: {
  id: NutrientId;
  value: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const over = value > target;
  const ratio = target > 0 ? Math.round((value / target) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-stone-700 dark:text-stone-300">
          {NUTRIENT_LABEL_KO[id]}
        </span>
        <span className="tabular-nums text-stone-600 dark:text-stone-400">
          {formatValue(id, value)}
          <span className="text-xs text-stone-400 dark:text-stone-500">
            {" "}
            / {formatValue(id, target)}
          </span>
        </span>
      </div>
      <div className="nutrient-bar-track">
        <div
          className={`nutrient-bar-fill ${over ? "bg-rose-500" : NUTRIENT_COLORS[id]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-stone-500">
        {over ? (
          <span className="text-rose-600 dark:text-rose-400">
            목표 대비 {ratio}% · +{formatValue(id, value - target)} 초과
          </span>
        ) : (
          <span>목표 대비 {ratio}%</span>
        )}
      </p>
    </div>
  );
}

function TotalsTable({
  totals,
  targets,
  ids,
}: {
  totals: NutrientMap;
  targets: Record<NutrientId, number>;
  ids: readonly NutrientId[];
}) {
  return (
    <div className="space-y-4">
      {NUTRIENT_ORDER.filter((id) => ids.includes(id)).map((id) => (
        <NutrientBar
          key={id}
          id={id}
          value={totals[id] ?? 0}
          target={targets[id]}
        />
      ))}
    </div>
  );
}

function PartialNutrientList({
  record,
  variant = "short",
}: {
  record: Partial<Record<NutrientId, number>>;
  variant?: "short" | "over";
}) {
  const ids = Object.keys(record) as NutrientId[];
  if (ids.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-500">
        {variant === "short" ? "부족한 항목 없음 ✓" : "과다 항목 없음 ✓"}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {ids.map((id) => (
        <li
          key={id}
          className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
            variant === "short"
              ? "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
              : "bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-100"
          }`}
        >
          <span className="font-medium">{NUTRIENT_LABEL_KO[id]}</span>
          <span className="tabular-nums font-semibold">
            {variant === "short" ? "−" : "+"}
            {formatValue(id, record[id] ?? 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AliasMapForm({
  query,
  foodOptions,
  onMapped,
}: {
  query: string;
  foodOptions: { id: string; name: string }[];
  onMapped: (food: FoodItem) => void;
}) {
  const [state, formAction, pending] = useActionState(
    addAliasAction,
    null as AliasState | null,
  );
  const appliedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!state?.ok) return;
    const key = `${state.query}:${state.foodId}`;
    if (appliedKey.current === key) return;
    appliedKey.current = key;
    const food = FOODS.find((f) => f.id === state.foodId);
    if (food) onMapped(food);
  }, [state, onMapped]);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="query" value={query} />
        <select
          name="foodId"
          required
          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-950"
          defaultValue=""
        >
          <option value="" disabled>
            종류 선택
          </option>
          {foodOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="btn-secondary px-2 py-1 text-xs disabled:opacity-60"
        >
          {pending ? "저장 중…" : "별칭 저장"}
        </button>
      </form>
      {state && (
        <p
          className={`text-[11px] ${
            state.ok
              ? "text-brand-700 dark:text-brand-300"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}

function MatchRow({
  row,
  foodOptions,
  confirmed,
  excluded,
  grams,
  onConfirm,
  onExclude,
  onMapped,
  onGramsChange,
}: {
  row: FoodMatchRow;
  foodOptions: { id: string; name: string }[];
  confirmed: boolean;
  excluded: boolean;
  grams: number;
  onConfirm: () => void;
  onExclude: () => void;
  onMapped: (food: FoodItem) => void;
  onGramsChange: (grams: number) => void;
}) {
  const pending = matchNeedsConfirmation(row);
  const evidence = foodEvidenceLine(row.food);
  const basis = row.food ? servingBasisGrams(row.food) : 100;

  return (
    <li className="rounded-xl border border-brand-100/80 bg-gradient-to-r from-white to-brand-50/30 px-4 py-3 dark:border-brand-900/30 dark:from-stone-900/50 dark:to-brand-950/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="font-semibold text-stone-800 dark:text-stone-200">{row.query}</span>
        {row.food ? (
          <div className="text-right text-sm">
            <span className="text-stone-700 dark:text-stone-300">
              → {row.food.name}{" "}
              <span
                className={`tabular-nums ${
                  row.confidence >= 0.7
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                ({Math.round(row.confidence * 100)}%)
              </span>
              {row.aiMatched && (
                <span className="ml-1.5 badge bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  AI 매칭
                </span>
              )}
            </span>
            {evidence && (
              <p className="mt-0.5 text-xs text-stone-500">근거: {evidence}</p>
            )}
            <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
              <span className="font-medium">분량</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={2000}
                step={1}
                value={grams}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  onGramsChange(Math.min(2000, Math.max(1, Math.round(n))));
                }}
                className="w-20 rounded-lg border border-stone-200 bg-white px-2 py-1 text-right tabular-nums text-stone-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
              <span>g</span>
              <span className="text-[11px] text-stone-400">(기준 {basis}g)</span>
            </label>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-warm">DB 없음</span>
            <AliasMapForm
              query={row.query}
              foodOptions={foodOptions}
              onMapped={onMapped}
            />
          </div>
        )}
      </div>

      {row.food && pending && !excluded && (
        <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-xs dark:border-amber-900/60 dark:bg-amber-950/40">
          <p className="text-amber-900 dark:text-amber-100">
            신뢰도가 낮아 합산에서 제외되었습니다. 맞으면 확인해 주세요.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {confirmed ? (
              <span className="inline-flex items-center gap-1 font-medium text-brand-700 dark:text-brand-300">
                ✓ 합산에 포함됨
              </span>
            ) : (
              <>
                <button type="button" onClick={onConfirm} className="btn-primary px-3 py-1 text-xs">
                  맞음 · 합산 포함
                </button>
                <button type="button" onClick={onExclude} className="btn-secondary px-3 py-1 text-xs">
                  제외
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function AnalyzeResults({ data }: { data: AnalyzeResultPayload }) {
  const [confirmedQueries, setConfirmedQueries] = useState<Set<string>>(new Set());
  const [excludedQueries, setExcludedQueries] = useState<Set<string>>(new Set());
  const [manualFoods, setManualFoods] = useState<Record<string, FoodItem>>({});
  const [gramsByQuery, setGramsByQuery] = useState<Record<string, number>>({});

  useEffect(() => {
    setConfirmedQueries(new Set());
    setExcludedQueries(new Set());
    setManualFoods({});
    const next: Record<string, number> = {};
    for (const m of data.matches) {
      if (m.food) next[m.query] = defaultIntakeGrams(m.food);
    }
    setGramsByQuery(next);
  }, [data.matches, data.tokenCount, data.extractionSource]);

  const matches = useMemo(
    () =>
      data.matches.map((m) => {
        const food = manualFoods[m.query];
        if (!food) return m;
        return {
          query: m.query,
          food,
          confidence: 1,
          needsConfirmation: false,
          aiMatched: false,
        };
      }),
    [data.matches, manualFoods],
  );

  const neisTotals = useMemo(
    () =>
      data.neisMeal
        ? neisNutrientTotals(data.neisMeal.kcal, data.neisMeal.nutrients)
        : {},
    [data.neisMeal],
  );
  const applyNeis = Object.keys(neisTotals).length > 0;

  const analysis = useMemo(
    () =>
      computeMealAnalysis(
        matches,
        confirmedQueries,
        FOODS,
        data.mealCode,
        gramsByQuery,
        applyNeis ? neisTotals : {},
      ),
    [matches, confirmedQueries, data.mealCode, gramsByQuery, applyNeis, neisTotals],
  );

  const targets = useMemo(() => getMealTargets(data.mealCode), [data.mealCode]);
  const targetBasisLabel = data.mealCode
    ? `한 끼 목표 · ${MEAL_LABEL[data.mealCode] ?? data.mealCode}`
    : "성인 일반 일일 기준";

  const extractionLabel =
    data.extractionSource === "neis"
      ? "나이스 급식식단"
      : data.extractionSource === "ai_override"
        ? "사용자 정의 AI"
        : data.extractionSource === "ai_openai"
          ? "AI (OpenAI 호환)"
          : "규칙(쉼표·줄바꿈)";

  const shortCount = Object.keys(analysis.short).length;
  const overCount = Object.keys(analysis.over).length;

  return (
    <section className="results-shell animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title text-lg">분석 결과</h2>
          <p className="mt-1 text-xs font-medium text-brand-700/80 dark:text-brand-400/90">
            {targetBasisLabel}
          </p>
        </div>
        <span className="badge-brand">참고용</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="kpi-tile-green">
          <p className="text-xs font-medium text-brand-700/80 dark:text-brand-300/80">
            {applyNeis ? "메뉴" : "합산 음식"}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-800 dark:text-brand-200">
            {applyNeis ? (data.neisMeal?.dishes?.length ?? data.tokenCount) : analysis.includedCount}
          </p>
        </div>
        <div className="kpi-tile-warm">
          <p className="text-xs font-medium text-warm-500/90">열량</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-warm-500">
            {Math.round(analysis.totals.energy_kcal ?? 0)}
            <span className="ml-0.5 text-sm font-semibold opacity-80">kcal</span>
          </p>
        </div>
        <div className="kpi-tile-amber">
          <p className="text-xs font-medium text-amber-700/80 dark:text-amber-300/80">부족 항목</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {shortCount}
          </p>
        </div>
        <div className="kpi-tile-rose">
          <p className="text-xs font-medium text-rose-700/80 dark:text-rose-300/80">과다 항목</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
            {overCount}
          </p>
        </div>
      </div>

      {data.neisMeal && (
        <NeisMealCard meal={data.neisMeal} />
      )}

      {!applyNeis && (
        <>
        {analysis.pendingConfirmationCount > 0 && (
          <div role="status" className="alert-warn">
            확인이 필요한 매칭 <strong>{analysis.pendingConfirmationCount}건</strong>이 있습니다.
            확인한 항목만 합산·추천에 반영됩니다.
          </div>
        )}

        {analysis.includedCount === 0 && analysis.pendingConfirmationCount > 0 && (
          <p className="text-sm text-stone-600 dark:text-stone-400">
            아직 합산에 포함된 음식이 없습니다. 아래에서 「맞음 · 합산 포함」을 눌러 주세요.
          </p>
        )}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
            매칭된 음식
          </h3>
          <ul className="space-y-2">
            {matches.map((m, i) => (
              <MatchRow
                key={`${m.query}-${i}`}
                row={m}
                foodOptions={data.foodOptions}
                confirmed={confirmedQueries.has(m.query)}
                excluded={excludedQueries.has(m.query)}
                grams={
                  gramsByQuery[m.query] ??
                  (m.food ? defaultIntakeGrams(m.food) : 100)
                }
                onConfirm={() => {
                  setConfirmedQueries((prev) => new Set(prev).add(m.query));
                  setExcludedQueries((prev) => {
                    const next = new Set(prev);
                    next.delete(m.query);
                    return next;
                  });
                }}
                onExclude={() => {
                  setExcludedQueries((prev) => new Set(prev).add(m.query));
                  setConfirmedQueries((prev) => {
                    const next = new Set(prev);
                    next.delete(m.query);
                    return next;
                  });
                }}
                onMapped={(food) => {
                  setManualFoods((prev) => ({ ...prev, [m.query]: food }));
                  setConfirmedQueries((prev) => new Set(prev).add(m.query));
                  setGramsByQuery((prev) => ({
                    ...prev,
                    [m.query]: defaultIntakeGrams(food),
                  }));
                }}
                onGramsChange={(grams) => {
                  setGramsByQuery((prev) => ({ ...prev, [m.query]: grams }));
                }}
              />
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            <span>토큰 {data.tokenCount}개</span>
            <span>추출: {extractionLabel}</span>
          </div>
          <p className="mt-1 text-xs text-stone-500">근거: {data.analysisEvidence}</p>
        </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="result-panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              {applyNeis ? "합산 섭취 (나이스 영양정보)" : "합산 섭취 (추정)"}
            </h3>
          </div>
          <TotalsTable
            totals={analysis.totals}
            targets={targets}
            ids={analysis.comparedIds}
          />
          {applyNeis && (
            <p className="mt-3 text-xs leading-relaxed text-stone-500">
              학교가 나이스에 공개한 1인분 제공량입니다.
            </p>
          )}
          {!applyNeis && (
            <p className="mt-4 text-xs text-stone-500">
              포함 {analysis.includedCount}개 항목
            </p>
          )}
          {(analysis.over.sodium_mg ?? 0) > (targets.sodium_mg ?? 0) && (
            <p className="mt-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
              나트륨이 크게 초과했다면 김치·국·조림 분량(g)을 줄여 보세요. 한식
              급식은 중식 목표(하루의 약 35%)를 넘기기 쉽고, DB는 참고용
              근사치입니다.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="result-panel border-amber-200/60 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/15">
            <h3 className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-200">
              목표 대비 부족
            </h3>
            <PartialNutrientList record={analysis.short} variant="short" />
          </div>

          <div className="result-panel border-rose-200/60 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/15">
            <h3 className="mb-3 text-sm font-semibold text-rose-900 dark:text-rose-200">
              목표 대비 과다
            </h3>
            <PartialNutrientList record={analysis.over} variant="over" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
          다음 끼니 추천
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {analysis.recommendations.map((r, i) => (
            <div key={`${i}-${r.title}`} className="recommend-card">
              <p className="font-semibold text-stone-800 dark:text-stone-100">{r.title}</p>
              <p className="mt-1 text-xs text-stone-500">{r.reason}</p>
              <ul className="mt-3 space-y-1.5">
                {r.items.map((x, j) => (
                  <li
                    key={`${i}-${j}-${x}`}
                    className="flex gap-2 text-sm text-stone-700 before:text-stone-400 before:content-['·'] dark:text-stone-300"
                  >
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
