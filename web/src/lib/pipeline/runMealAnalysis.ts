import { getCoreFoods, getFoods } from "@/data/getFoods.server";
import { getUserAliasMap } from "@/lib/aliases/userAliases.server";
import { MEAL_LABEL } from "@/lib/analysis";
import { hasMatchableFood, matchFoods } from "@/lib/match";
import { aiReMatchLowConfidence } from "@/lib/match/aiReMatch.server";
import { computeMealAnalysis } from "@/lib/pipeline/computeMealAnalysis";
import {
  neisNutrientTotals,
  type NeisDish,
  type NeisNutrientInfo,
  type NeisOriginInfo,
} from "@/lib/neis/parseMealInfo";
import type { Recommendation } from "@/lib/recommend";
import type { FoodItem, FoodMatchRow, NutrientId, NutrientMap } from "@/types";

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
  /** NEIS·직접입력 끼니 코드 (1~4). 있으면 한 끼 목표로 비교 */
  mealCode?: string;
  neisMeal?: {
    schoolName: string;
    date: string;
    mealName: string;
    calInfo?: string;
    ntrInfo?: string;
    /** 나이스 원문 요리 목록 (알레르기 번호 포함) */
    dishes?: NeisDish[];
    /** 나이스 제공 열량 (kcal) */
    kcal?: number | null;
    nutrients?: NeisNutrientInfo[];
    origins?: NeisOriginInfo[];
    source: string;
  };
};

function applyUserAliases(
  matches: FoodMatchRow[],
  aliasMap: Record<string, string>,
  foodsById: Map<string, FoodItem>,
): FoodMatchRow[] {
  if (Object.keys(aliasMap).length === 0) return matches;

  return matches.map((row) => {
    const foodId = aliasMap[row.query];
    if (!foodId) return row;
    const food = foodsById.get(foodId);
    if (!food) return row;
    return {
      query: row.query,
      food,
      confidence: 1,
      needsConfirmation: false,
      aiMatched: false,
    };
  });
}

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

  const fallbackFoods = getCoreFoods(); // foods.json (급식 코어 종류)
  const mfdsFoods = await getFoods(); // mfds-food.json (상세 DB)
  // 코어·MFDS 양쪽 탐색 후 최고 신뢰도 선택
  const rawMatches = matchFoods(candidates, mfdsFoods, fallbackFoods);
  // AI 재매칭은 코어+MFDS 통합 DB 사용 (코어 우선 조회)
  const allFoods = [...fallbackFoods, ...mfdsFoods];
  const rematched = await aiReMatchLowConfidence(rawMatches, allFoods, 0.9);

  const foodsById = new Map(allFoods.map((f) => [f.id, f]));
  for (const f of fallbackFoods) foodsById.set(f.id, f);
  const aliasMap = await getUserAliasMap();
  const matches = applyUserAliases(rematched, aliasMap, foodsById);

  const officialTotals = options?.neisMeal
    ? neisNutrientTotals(options.neisMeal.kcal, options.neisMeal.nutrients)
    : {};
  const hasOfficial = Object.keys(officialTotals).length > 0;

  if (!hasMatchableFood(matches) && !hasOfficial) {
    return {
      ok: false,
      message:
        "등록된 음식과 매칭되지 않았습니다. 메뉴 이름을 더 구체적으로 적어 주세요.",
    };
  }

  const analysis = computeMealAnalysis(
    matches,
    new Set(),
    fallbackFoods,
    options?.mealCode,
    {},
    officialTotals,
  );

  const mealLabel = MEAL_LABEL;
  const targetLabel = options?.mealCode
    ? `한 끼 목표(${mealLabel[options.mealCode] ?? options.mealCode})`
    : "일일 목표";
  const totalsEvidence = hasOfficial
    ? "열량·탄수화물·단백질·지방: 나이스 제공 영양정보 · 그 외: 신뢰도 70% 이상 또는 확인한 매칭의 DB 추정"
    : "합산: 신뢰도 70% 이상 또는 확인한 매칭만";
  const baseEvidence =
    `${targetLabel}: 성인 일반 근사치 · ${totalsEvidence} · 영양 DB: 식품의약품안전처(MFDS) · DB 없음 항목: AI 재매칭 시도`;
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
      // 수동 매핑 UI는 코어 종류(밥·국·고기류 등)만 노출
      foodOptions: fallbackFoods.map((f) => ({ id: f.id, name: f.name })),
      pendingConfirmationCount: analysis.pendingConfirmationCount,
      analysisEvidence,
      mealCode: options?.mealCode,
      neisMeal: options?.neisMeal,
    },
  };
}
