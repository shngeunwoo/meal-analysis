import {
  excessVsTarget,
  getMealTargets,
  scaleFoodByGrams,
  defaultIntakeGrams,
  shortageVsTarget,
  sumNutrientsFromFoods,
} from "@/lib/analysis";
import {
  AUTO_CONFIRM_CONFIDENCE,
  matchNeedsConfirmation,
  MIN_MATCH_CONFIDENCE,
} from "@/lib/match";
import { recommendNextMeal, type Recommendation } from "@/lib/recommend";
import type { FoodItem, FoodMatchRow, NutrientId, NutrientMap } from "@/types";

export type MealAnalysisResult = {
  /** 비교·추천에 쓰는 합산 (공식 영양정보가 있으면 그 값만 사용) */
  totals: NutrientMap;
  /** 공식(나이스) 값으로 계산한 영양소. 비어 있으면 DB 추정 */
  officialIds: NutrientId[];
  /** 목표와 비교한 영양소 */
  comparedIds: NutrientId[];
  short: Partial<Record<NutrientId, number>>;
  over: Partial<Record<NutrientId, number>>;
  recommendations: Recommendation[];
  includedCount: number;
  pendingConfirmationCount: number;
};

function catalogForRecommend(
  matches: FoodMatchRow[],
  extra: FoodItem[],
): FoodItem[] {
  const byId = new Map<string, FoodItem>();
  for (const f of extra) byId.set(f.id, f);
  for (const row of matches) {
    if (row.food) byId.set(row.food.id, row.food);
  }
  return [...byId.values()];
}

function includedFoodsScaled(
  matches: FoodMatchRow[],
  userConfirmedQueries: ReadonlySet<string>,
  gramsByQuery: Readonly<Record<string, number>>,
): FoodItem[] {
  const list: FoodItem[] = [];
  for (const row of matches) {
    if (!row.food || row.confidence < MIN_MATCH_CONFIDENCE) continue;
    const included =
      row.confidence >= AUTO_CONFIRM_CONFIDENCE ||
      userConfirmedQueries.has(row.query);
    if (!included) continue;
    const grams = gramsByQuery[row.query] ?? defaultIntakeGrams(row.food);
    list.push(scaleFoodByGrams(row.food, grams));
  }
  return list;
}

export function computeMealAnalysis(
  matches: FoodMatchRow[],
  userConfirmedQueries: ReadonlySet<string>,
  recommendCatalog: FoodItem[],
  mealCode?: string,
  gramsByQuery: Readonly<Record<string, number>> = {},
  officialTotals: Partial<Record<NutrientId, number>> = {},
): MealAnalysisResult {
  const included = includedFoodsScaled(
    matches,
    userConfirmedQueries,
    gramsByQuery,
  );
  const officialIds = (Object.keys(officialTotals) as NutrientId[]).filter(
    (id) => typeof officialTotals[id] === "number",
  );
  // 공식 영양정보가 있으면 그 값만 쓰고, 공식 값이 없는 항목은 비교하지 않는다.
  const useOfficial = officialIds.length > 0;
  const totals: NutrientMap = useOfficial
    ? Object.fromEntries(officialIds.map((id) => [id, officialTotals[id]]))
    : sumNutrientsFromFoods(included);
  const allTargets = getMealTargets(mealCode);
  const targets = useOfficial
    ? (Object.fromEntries(officialIds.map((id) => [id, allTargets[id]])) as Record<
        NutrientId,
        number
      >)
    : allTargets;
  const comparedIds = Object.keys(targets) as NutrientId[];
  const short = shortageVsTarget(totals, targets);
  const over = excessVsTarget(totals, targets);
  const catalog = catalogForRecommend(matches, recommendCatalog);
  const recommendations = recommendNextMeal(
    short,
    catalog,
    totals,
    targets,
    new Set(included.map((f) => f.id)),
  );

  const pendingConfirmationCount = matches.filter(
    (m) => matchNeedsConfirmation(m) && !userConfirmedQueries.has(m.query),
  ).length;

  return {
    totals,
    officialIds,
    comparedIds,
    short,
    over,
    recommendations,
    includedCount: included.length,
    pendingConfirmationCount,
  };
}
