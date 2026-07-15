import type { FoodItem, NutrientId, NutrientMap } from "@/types";

/** 성인 일반 기준 하루 목표 근사치(참고용) */
export const DEFAULT_DAILY_TARGETS: Record<NutrientId, number> = {
  energy_kcal: 2000,
  protein_g: 50,
  fat_g: 65,
  carb_g: 300,
  sodium_mg: 2000,
  fiber_g: 25,
};

/** 끼니별 하루 목표 비율 */
export const MEAL_RATIO: Record<string, number> = {
  "1": 0.25, // 조식
  "2": 0.35, // 중식
  "3": 0.35, // 석식
  "4": 0.05, // 간식
};

export const MEAL_LABEL: Record<string, string> = {
  "1": "조식 25%",
  "2": "중식 35%",
  "3": "석식 35%",
  "4": "간식 5%",
};

/**
 * 끼니 코드(mmealScCode)에 맞게 비율을 적용한 한 끼 목표를 반환한다.
 * 코드가 없으면 하루 전체 목표를 반환한다.
 */
export function getMealTargets(
  mealCode?: string,
): Record<NutrientId, number> {
  const code = typeof mealCode === "string" ? mealCode.trim() : "";
  const ratio = code ? (MEAL_RATIO[code] ?? 1) : 1;
  if (ratio === 1) return DEFAULT_DAILY_TARGETS;
  return Object.fromEntries(
    Object.entries(DEFAULT_DAILY_TARGETS).map(([k, v]) => [k, Math.round(v * ratio * 10) / 10]),
  ) as Record<NutrientId, number>;
}

export function sumNutrientsFromFoods(foods: FoodItem[]): NutrientMap {
  const totals: NutrientMap = {};
  for (const food of foods) {
    const m = food.nutrientsPerServing;
    for (const key of Object.keys(m)) {
      const v = m[key];
      if (typeof v === "number") {
        totals[key] = (totals[key] ?? 0) + v;
      }
    }
  }
  return totals;
}

/** 목표보다 부족한 양(양수), 목표보다 많으면 short에는 넣지 않음 */
export function shortageVsTarget(
  totals: NutrientMap,
  targets: Record<NutrientId, number> = DEFAULT_DAILY_TARGETS,
): Partial<Record<NutrientId, number>> {
  const short: Partial<Record<NutrientId, number>> = {};
  for (const id of Object.keys(targets) as NutrientId[]) {
    const t = targets[id];
    const v = totals[id] ?? 0;
    if (v < t) short[id] = t - v;
  }
  return short;
}

/** 목표보다 초과한 양(양수) */
export function excessVsTarget(
  totals: NutrientMap,
  targets: Record<NutrientId, number> = DEFAULT_DAILY_TARGETS,
): Partial<Record<NutrientId, number>> {
  const over: Partial<Record<NutrientId, number>> = {};
  for (const id of Object.keys(targets) as NutrientId[]) {
    const t = targets[id];
    const v = totals[id] ?? 0;
    if (v > t) over[id] = v - t;
  }
  return over;
}
