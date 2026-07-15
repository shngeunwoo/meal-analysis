import type { FoodItem, NutrientId, NutrientMap } from "@/types";
import { DEFAULT_DAILY_TARGETS } from "@/lib/analysis";

export type Recommendation = {
  title: string;
  reason: string;
  items: string[];
};

const NUTRIENT_LABEL: Record<NutrientId, { label: string; unit: string }> = {
  energy_kcal: { label: "열량", unit: "kcal" },
  protein_g: { label: "단백질", unit: "g" },
  fat_g: { label: "지방", unit: "g" },
  carb_g: { label: "탄수화물", unit: "g" },
  sodium_mg: { label: "나트륨", unit: "mg" },
  fiber_g: { label: "식이섬유", unit: "g" },
};

const DEFICIT_RECIPES: Partial<
  Record<NutrientId, { title: string; reason: (gap: number, unit: string) => string }>
> = {
  protein_g: {
    title: "단백질 보충 메뉴",
    reason: (gap, unit) => `단백질이 약 ${gap}${unit} 부족합니다. 아래 메뉴 1인분 기준입니다.`,
  },
  fiber_g: {
    title: "식이섬유 보충 메뉴",
    reason: (gap, unit) => `식이섬유가 약 ${gap}${unit} 부족합니다. 채소·과일 위주 메뉴입니다.`,
  },
  energy_kcal: {
    title: "열량 보충 메뉴",
    reason: (gap, unit) => `열량이 약 ${gap}${unit} 부족합니다.`,
  },
  carb_g: {
    title: "탄수화물 보충 메뉴",
    reason: (gap, unit) => `탄수화물이 약 ${gap}${unit} 부족합니다.`,
  },
  fat_g: {
    title: "지방 보충 메뉴",
    reason: (gap, unit) => `지방이 약 ${gap}${unit} 부족합니다.`,
  },
};

function topDeficits(short: Partial<Record<NutrientId, number>>): [NutrientId, number][] {
  return (Object.entries(short) as [NutrientId, number][])
    .filter(([, v]) => typeof v === "number" && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function uniq(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const k = x.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/** 카테고리명(밥·국·고기류) 대신 구체 메뉴명을 고른다 */
export function pickDisplayName(food: FoodItem): string {
  const aliases = food.aliases ?? [];
  const isCategory =
    food.name.length <= 2 || food.name.endsWith("류") || food.name === "간식";
  if (!isCategory) return food.name;

  const concrete = aliases
    .filter((a) => a.length > food.name.length)
    .sort((a, b) => b.length - a.length);
  return concrete[0] ?? food.name;
}

function formatFoodLine(food: FoodItem, nutrient: NutrientId): string {
  const meta = NUTRIENT_LABEL[nutrient];
  const v = food.nutrientsPerServing[nutrient] ?? 0;
  const rounded = Math.round(v * 10) / 10;
  return `${pickDisplayName(food)} (${meta.label} ${rounded}${meta.unit}/1인분)`;
}

function rankFoods(
  foods: FoodItem[],
  nutrient: NutrientId,
  excludedIds: ReadonlySet<string>,
  direction: "high" | "low",
  limit: number,
): FoodItem[] {
  return foods
    .filter((f) => !excludedIds.has(f.id))
    .map((f) => ({ food: f, value: f.nutrientsPerServing[nutrient] ?? 0 }))
    .filter((x) => x.value > 0)
    .sort((a, b) => (direction === "high" ? b.value - a.value : a.value - b.value))
    .slice(0, limit)
    .map((x) => x.food);
}

/**
 * 부족 영양소·DB 항목을 기준으로 다음 끼니에 넣을 만한 구체 메뉴를 추천한다.
 */
export function recommendNextMeal(
  short: Partial<Record<NutrientId, number>>,
  foods: FoodItem[],
  currentTotals: NutrientMap,
  targets: Record<NutrientId, number> = DEFAULT_DAILY_TARGETS,
  excludedFoodIds: ReadonlySet<string> = new Set(),
): Recommendation[] {
  if (foods.length === 0) return [];

  const deficits = topDeficits(short);
  const recs: Recommendation[] = [];
  const addedTitles = new Set<string>();
  const usedDisplayNames = new Set<string>();

  function pushRec(rec: Recommendation) {
    if (addedTitles.has(rec.title)) return;
    addedTitles.add(rec.title);
    recs.push(rec);
  }

  const sodiumRatio = (currentTotals.sodium_mg ?? 0) / Math.max(targets.sodium_mg, 1);
  if (sodiumRatio > 0.75) {
    const lowSodium = rankFoods(foods, "sodium_mg", excludedFoodIds, "low", 4);
    const items = uniq(
      lowSodium.map((f) => formatFoodLine(f, "sodium_mg")),
    ).filter((name) => {
      const base = name.split(" (")[0];
      if (usedDisplayNames.has(base)) return false;
      usedDisplayNames.add(base);
      return true;
    });
    if (items.length > 0) {
      pushRec({
        title: "나트륨 낮은 메뉴",
        reason: `이번 끼니 나트륨이 목표의 ${Math.round(sodiumRatio * 100)}%입니다. 다음 끼니는 아래처럼 낮은 나트륨 메뉴를 고려해 보세요.`,
        items,
      });
    }
  }

  let addedEnergyCarb = false;

  for (const [nutrient, gap] of deficits) {
    if ((nutrient === "carb_g" || nutrient === "energy_kcal") && addedEnergyCarb) {
      continue;
    }
    if (nutrient === "carb_g" || nutrient === "energy_kcal") {
      addedEnergyCarb = true;
    }

    const meta = DEFICIT_RECIPES[nutrient];
    if (!meta) continue;

    const ranked = rankFoods(foods, nutrient, excludedFoodIds, "high", 5);
    const items = uniq(
      ranked.map((f) => formatFoodLine(f, nutrient)),
    ).filter((line) => {
      const base = line.split(" (")[0];
      if (usedDisplayNames.has(base)) return false;
      usedDisplayNames.add(base);
      return true;
    });

    if (items.length === 0) continue;

    const unit = NUTRIENT_LABEL[nutrient].unit;
    const roundedGap = Math.round(gap * 10) / 10;
    pushRec({
      title: meta.title,
      reason: meta.reason(roundedGap, unit),
      items: items.slice(0, 4),
    });
  }

  return recs.slice(0, 5);
}
