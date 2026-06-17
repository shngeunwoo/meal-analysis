"use client";

import { addAliasFormAction, type AnalyzeResultPayload } from "@/app/actions";
import { FOODS } from "@/data/foods";
import { foodEvidenceLine } from "@/lib/foodEvidence";
import { NUTRIENT_LABEL_KO } from "@/lib/nutrientLabels";
import { matchNeedsConfirmation } from "@/lib/match";
import { computeMealAnalysis } from "@/lib/pipeline/computeMealAnalysis";
import type { FoodMatchRow, NutrientId, NutrientMap } from "@/types";
import { useEffect, useMemo, useState } from "react";

const NUTRIENT_ORDER: NutrientId[] = [
  "energy_kcal",
  "protein_g",
  "fat_g",
  "carb_g",
  "sodium_mg",
  "fiber_g",
];

function formatValue(id: NutrientId, value: number): string {
  if (id === "energy_kcal") return `${Math.round(value)} kcal`;
  if (id === "sodium_mg") return `${Math.round(value)} mg`;
  return `${value.toFixed(1)} g`;
}

function TotalsTable({ totals }: { totals: NutrientMap }) {
  return (
    <ul className="space-y-1 text-sm">
      {NUTRIENT_ORDER.map((id) => {
        const v = totals[id] ?? 0;
        return (
          <li key={id} className="flex justify-between gap-4">
            <span>{NUTRIENT_LABEL_KO[id]}</span>
            <span className="tabular-nums">{formatValue(id, v)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PartialNutrientList({
  record,
}: {
  record: Partial<Record<NutrientId, number>>;
}) {
  const ids = Object.keys(record) as NutrientId[];
  if (ids.length === 0) return <p className="text-sm text-neutral-500">없음</p>;
  return (
    <ul className="space-y-1 text-sm">
      {ids.map((id) => (
        <li key={id} className="flex justify-between gap-4">
          <span>{NUTRIENT_LABEL_KO[id]}</span>
          <span className="tabular-nums">{formatValue(id, record[id] ?? 0)}</span>
        </li>
      ))}
    </ul>
  );
}

function MatchRow({
  row,
  foodOptions,
  confirmed,
  excluded,
  onConfirm,
  onExclude,
}: {
  row: FoodMatchRow;
  foodOptions: { id: string; name: string }[];
  confirmed: boolean;
  excluded: boolean;
  onConfirm: () => void;
  onExclude: () => void;
}) {
  const pending = matchNeedsConfirmation(row);
  const evidence = foodEvidenceLine(row.food);

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="font-medium">{row.query}</span>
        {row.food ? (
          <div className="text-right text-sm">
            <span className="text-neutral-700 dark:text-neutral-300">
              → {row.food.name}{" "}
              <span className="tabular-nums text-neutral-500">
                ({Math.round(row.confidence * 100)}%)
              </span>
              {row.aiMatched && (
                <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  AI 매칭
                </span>
              )}
            </span>
            {evidence && (
              <p className="mt-0.5 text-xs text-neutral-500">근거: {evidence}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-amber-700 dark:text-amber-300">DB 없음</span>
            <form action={addAliasFormAction} className="flex items-center gap-2">
              <input type="hidden" name="query" value={row.query} />
              <select
                name="foodId"
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950"
                defaultValue=""
              >
                <option value="" disabled>
                  매핑할 음식 선택
                </option>
                {foodOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded bg-neutral-200 px-2 py-1 text-xs hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                별칭 저장
              </button>
            </form>
          </div>
        )}
      </div>

      {row.food && pending && !excluded && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950">
          <p className="text-amber-900 dark:text-amber-100">
            신뢰도가 낮아 합산에서 제외되었습니다. 맞으면 확인해 주세요.
          </p>
          <div className="mt-2 flex gap-2">
            {confirmed ? (
              <span className="text-green-800 dark:text-green-200">✓ 합산에 포함됨</span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded bg-neutral-900 px-2 py-1 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  맞음 · 합산 포함
                </button>
                <button
                  type="button"
                  onClick={onExclude}
                  className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-900"
                >
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

  useEffect(() => {
    setConfirmedQueries(new Set());
    setExcludedQueries(new Set());
  }, [data.matches, data.tokenCount, data.extractionSource]);

  const analysis = useMemo(
    () => computeMealAnalysis(data.matches, confirmedQueries, FOODS),
    [data.matches, confirmedQueries],
  );

  const extractionLabel =
    data.extractionSource === "neis"
      ? "음식명 추출: 나이스 급식식단"
      : data.extractionSource === "ai_override"
        ? "음식명 추출: 사용자 정의 AI"
        : data.extractionSource === "ai_openai"
          ? "음식명 추출: AI (OpenAI 호환)"
          : "음식명 추출: 규칙(쉼표·줄바꿈)";

  return (
    <section className="space-y-6 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
      <h2 className="text-lg font-semibold">분석 결과 (참고용)</h2>

      {data.neisMeal && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="font-medium">
            {data.neisMeal.schoolName} · {data.neisMeal.date} · {data.neisMeal.mealName}
          </p>
          {data.neisMeal.calInfo && (
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              급식 제공 열량(나이스): {data.neisMeal.calInfo}
            </p>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            출처: {data.neisMeal.source} · 아래 합산은 내부 DB 추정치입니다.
          </p>
        </div>
      )}

      {analysis.pendingConfirmationCount > 0 && (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          확인이 필요한 매칭 {analysis.pendingConfirmationCount}건이 있습니다. 확인한
          항목만 합산·추천에 반영됩니다.
        </p>
      )}

      {analysis.includedCount === 0 && analysis.pendingConfirmationCount > 0 && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          아직 합산에 포함된 음식이 없습니다. 아래에서 「맞음 · 합산 포함」을 눌러 주세요.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          매칭된 음식
        </h3>
        <ul className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          {data.matches.map((m, i) => (
            <MatchRow
              key={`${m.query}-${i}`}
              row={m}
              foodOptions={data.foodOptions}
              confirmed={confirmedQueries.has(m.query)}
              excluded={excludedQueries.has(m.query)}
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
            />
          ))}
        </ul>
        <p className="mt-2 text-xs text-neutral-500">
          토큰 {data.tokenCount}개 · {extractionLabel}
        </p>
        <p className="mt-1 text-xs text-neutral-500">근거: {data.analysisEvidence}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">합산 섭취 (추정)</h3>
          <TotalsTable totals={analysis.totals} />
          <p className="mt-1 text-xs text-neutral-500">
            포함 {analysis.includedCount}개 항목
          </p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium">목표 대비 부족</h3>
          <PartialNutrientList record={analysis.short} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">목표 대비 과다</h3>
        <PartialNutrientList record={analysis.over} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">다음 끼니 추천 (아이디어)</h3>
        <div className="space-y-3">
          {analysis.recommendations.map((r, i) => (
            <div
              key={`${i}-${r.title}`}
              className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-neutral-500">{r.reason}</p>
              </div>
              <ul className="mt-2 list-inside list-disc">
                {r.items.map((x, j) => (
                  <li key={`${i}-${j}-${x}`}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
