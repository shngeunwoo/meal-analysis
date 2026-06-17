import type { FoodItem, NutrientId, NutrientMap } from "@/types";
import { DEFAULT_DAILY_TARGETS } from "@/lib/analysis";

export type Recommendation = {
  title: string;
  reason: string;
  items: string[];
};

function topDeficits(short: Partial<Record<NutrientId, number>>): NutrientId[] {
  const entries = Object.entries(short) as [NutrientId, number][];
  return entries
    .filter(([, v]) => typeof v === "number" && v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .slice(0, 3);
}

function uniq(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const k = x.trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/**
 * 부족 영양소를 "음식명"으로 억지로 점수화하지 않고,
 * 부족 → 식품군/예시 메뉴(한국어)로 설명 가능한 추천을 만든다.
 */
export function recommendNextMeal(
  short: Partial<Record<NutrientId, number>>,
  foods: FoodItem[],
  currentTotals: NutrientMap,
  targets: Record<NutrientId, number> = DEFAULT_DAILY_TARGETS,
): Recommendation[] {
  const sodiumHigh =
    (currentTotals.sodium_mg ?? 0) > targets.sodium_mg * 0.75;

  const deficits = topDeficits(short);
  const recs: Recommendation[] = [];
  const addedTitles = new Set<string>();

  function pushRec(rec: Recommendation) {
    if (addedTitles.has(rec.title)) return;
    addedTitles.add(rec.title);
    recs.push(rec);
  }

  // 공통: 나트륨 경고
  if (sodiumHigh) {
    pushRec({
      title: "저염 쪽으로 선택",
      reason: "나트륨이 이미 높은 편이라 다음 끼니는 국물/가공식품을 줄이는 게 좋아요.",
      items: ["국물 적게(건더기 위주)", "소스/양념 반만", "김치/젓갈은 소량"],
    });
  }

  let addedEnergyCarb = false;

  for (const d of deficits) {
    if (d === "protein_g") {
      pushRec({
        title: "단백질 보충",
        reason: "단백질이 부족하면 포만감·회복에 불리할 수 있어요.",
        items: uniq([
          "닭가슴살/닭다리살 구이",
          "두부(두부구이·두부조림)",
          "계란(삶은계란·계란찜)",
          "생선구이",
          "불고기/제육(양념은 덜)",
        ]),
      });
    }
    if (d === "fiber_g") {
      pushRec({
        title: "식이섬유 보충",
        reason: "식이섬유가 부족하면 장 건강·포만감에 불리할 수 있어요.",
        items: uniq(["샐러드", "과일 1회", "나물/채소반찬 2가지", "잡곡밥(가능하면)"]),
      });
    }
    if ((d === "carb_g" || d === "energy_kcal") && !addedEnergyCarb) {
      addedEnergyCarb = true;
      pushRec({
        title: "에너지(탄수화물) 보충",
        reason: "에너지가 부족하면 집중력·활동량이 떨어질 수 있어요.",
        items: uniq(["밥/잡곡밥", "고구마/감자", "바나나", "우유"]),
      });
    }
    if (d === "fat_g") {
      pushRec({
        title: "지방(좋은 지방) 보충",
        reason: "지방도 적정량은 필요해요. 튀김보단 '좋은 지방' 위주로요.",
        items: uniq(["생선(등푸른 생선)", "견과류 한 줌", "계란", "우유/요거트"]),
      });
    }
  }

  // 마지막: 내부 DB에서 무난한 예시 3개(있으면)
  const safeFallback = foods
    .filter((f) => ["salad", "fruit", "milk", "egg", "grilled_fish"].includes(f.id))
    .map((f) => f.name)
    .slice(0, 4);
  if (safeFallback.length > 0) {
    pushRec({
      title: "가벼운 균형 옵션",
      reason: "부족이 크지 않다면 가볍게 균형을 맞추면 됩니다.",
      items: safeFallback,
    });
  }

  return recs.slice(0, 5);
}
