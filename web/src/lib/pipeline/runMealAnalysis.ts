import { getCoreFoods, getFoods } from "@/data/getFoods.server";
import { hasMatchableFood, matchFoods } from "@/lib/match";
import { aiReMatchLowConfidence } from "@/lib/match/aiReMatch.server";
import { computeMealAnalysis } from "@/lib/pipeline/computeMealAnalysis";
import type { Recommendation } from "@/lib/recommend";
import type { FoodMatchRow, NutrientId, NutrientMap } from "@/types";

export type ExtractionSource = "neis" | "ai_override" | "ai_openai" | "rules";

export type MealAnalysisPayload = {
  matches: FoodMatchRow[];
  totals: NutrientMap;
  short: Partial<Record<NutrientId, number>>;
  over: Partial<Record<NutrientId, number>>;
  recommendations: Recommendation[];
  tokenCount: number;
  extractionSource: ExtractionSource;
  foodOptions: { id: string; name: string }[];
  pendingConfirmationCount: number;
  analysisEvidence: string;
  neisMeal?: {
    schoolName: string;
    date: string;
    mealName: string;
    calInfo?: string;
    ntrInfo?: string;
    source: string;
  };
};

export async function runMealAnalysis(
  candidates: string[],
  extractionSource: ExtractionSource,
  options?: {
    neisMeal?: MealAnalysisPayload["neisMeal"];
    evidenceExtra?: string;
    mealCode?: string;
  },
): Promise<
  | { ok: true; data: MealAnalysisPayload }
  | { ok: false; message: string }
> {
  if (candidates.length === 0) {
    return { ok: false, message: "분석할 음식 목록이 비어 있습니다." };
  }

  const fallbackFoods = getCoreFoods();   // foods.json (카테고리 평균 포함)
  const mfdsFoods = await getFoods();      // mfds-food.json (메인 DB)
  // MFDS 우선 탐색, 없으면 fallback foods.json
  const rawMatches = matchFoods(candidates, fallbackFoods, mfdsFoods);
  // 신뢰도 90% 미만 항목을 AI로 재매칭 시도 (MFDS + fallback 통합 DB 사용)
  const allFoods = mfdsFoods.length > 0 ? mfdsFoods : fallbackFoods;
  const matches = await aiReMatchLowConfidence(rawMatches, allFoods, 0.9);

  if (!hasMatchableFood(matches)) {
    return {
      ok: false,
      message:
        "등록된 음식과 매칭되지 않았습니다. 메뉴 이름을 더 구체적으로 적어 주세요.",
    };
  }

  const analysis = computeMealAnalysis(matches, new Set(), fallbackFoods, options?.mealCode);

  const mealLabel: Record<string, string> = { "1": "조식(25%)", "2": "중식(35%)", "3": "석식(35%)", "4": "간식(5%)" };
  const targetLabel = options?.mealCode ? `한 끼 목표(${mealLabel[options.mealCode] ?? options.mealCode})` : "일일 목표";
  const baseEvidence =
    `${targetLabel}: 성인 일반 근사치 · 합산: 신뢰도 70% 이상 또는 확인한 매칭만 · 영양 DB: 식품의약품안전처(MFDS)`;
  const analysisEvidence = options?.evidenceExtra
    ? `${baseEvidence} · ${options.evidenceExtra}`
    : baseEvidence;

  return {
    ok: true,
    data: {
      matches,
      totals: analysis.totals,
      short: analysis.short,
      over: analysis.over,
      recommendations: analysis.recommendations,
      tokenCount: candidates.length,
      extractionSource,
      foodOptions: allFoods.map((f) => ({ id: f.id, name: f.name })),
      pendingConfirmationCount: analysis.pendingConfirmationCount,
      analysisEvidence,
      neisMeal: options?.neisMeal,
    },
  };
}
