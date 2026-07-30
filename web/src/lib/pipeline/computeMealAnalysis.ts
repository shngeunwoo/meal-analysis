import {
  excessVsTarget,
  getMealTargets,
  scaleFoodByGrams,
  servingBasisGrams,
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
  totals: NutrientMap;
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
    const base = servingBasisGrams(row.food);
    const grams = gramsByQuery[row.query] ?? base;
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
): MealAnalysisResult {
  const included = includedFoodsScaled(
    matches,
    userConfirmedQueries,
    gramsByQuery,
  );
  const totals = sumNutrientsFromFoods(included);
  const targets = getMealTargets(mealCode);
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
    short,
    over,
    recommendations,
    includedCount: included.length,
    pendingConfirmationCount,
  };
}
