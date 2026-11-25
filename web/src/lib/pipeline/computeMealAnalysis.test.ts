import { describe, it, expect } from "vitest";
import { FOODS } from "@/data/foods";
import { matchFoods } from "@/lib/match";
import type { FoodMatchRow } from "@/types";
import { computeMealAnalysis } from "./computeMealAnalysis";

describe("computeMealAnalysis", () => {
  it("확정된 매칭만 합산한다", () => {
    const rows = matchFoods(["백미밥", "밥"], FOODS, FOODS);
    const withoutConfirm = computeMealAnalysis(rows, new Set(), FOODS);
    const withConfirm = computeMealAnalysis(rows, new Set(["밥"]), FOODS);
    expect(withConfirm.includedCount).toBeGreaterThanOrEqual(
      withoutConfirm.includedCount,
    );
  });

  it("낮은 신뢰도는 확인 전 합산·대기 건수에 반영", () => {
    const mainMeat = FOODS.find((f) => f.id === "main_meat")!;
    const rows: FoodMatchRow[] = [
      {
        query: "추정메뉴",
        food: mainMeat,
        confidence: 0.55,
        needsConfirmation: true,
      },
    ];
    const pending = computeMealAnalysis(rows, new Set(), FOODS);
    expect(pending.includedCount).toBe(0);
    expect(pending.pendingConfirmationCount).toBe(1);

    const confirmed = computeMealAnalysis(rows, new Set(["추정메뉴"]), FOODS);
    expect(confirmed.includedCount).toBe(1);
    expect(confirmed.pendingConfirmationCount).toBe(0);
  });

  it("분량(g)을 바꾸면 합산 열량이 비례한다", () => {
    const rice = FOODS.find((f) => f.id === "rice")!;
    const rows: FoodMatchRow[] = [
      { query: "밥", food: rice, confidence: 1, needsConfirmation: false },
    ];
    const base = computeMealAnalysis(rows, new Set(), FOODS, undefined, {
      밥: 210,
    });
    const double = computeMealAnalysis(rows, new Set(), FOODS, undefined, {
      밥: 420,
    });
    expect(double.totals.energy_kcal).toBeCloseTo(
      (base.totals.energy_kcal ?? 0) * 2,
      5,
    );
  });

  it("공식(나이스) 영양값이 있으면 그 값만 쓰고 없는 항목은 비교하지 않는다", () => {
    const rows = matchFoods(["밥", "김치"], FOODS, FOODS);
    const official = { energy_kcal: 812.4, carb_g: 112.3, protein_g: 35.2, fat_g: 22.1 };
    const r = computeMealAnalysis(rows, new Set(["밥", "김치"]), FOODS, "2", {}, official);
    expect(r.totals).toEqual(official);
    expect(r.comparedIds.sort()).toEqual(["carb_g", "energy_kcal", "fat_g", "protein_g"]);
    expect(r.short.sodium_mg).toBeUndefined();
    expect(r.over.sodium_mg).toBeUndefined();
    // 열량 812 kcal 은 중식 목표(700 kcal)를 넘는다
    expect(r.over.energy_kcal).toBeCloseTo(112.4, 1);
  });

  it("공식 영양값은 분량(g) 조정과 무관하다", () => {
    const rows = matchFoods(["밥"], FOODS, FOODS);
    const official = { energy_kcal: 650 };
    const a = computeMealAnalysis(rows, new Set(["밥"]), FOODS, "2", { 밥: 100 }, official);
    const b = computeMealAnalysis(rows, new Set(["밥"]), FOODS, "2", { 밥: 400 }, official);
    expect(a.totals.energy_kcal).toBe(650);
    expect(b.totals.energy_kcal).toBe(650);
  });
});
