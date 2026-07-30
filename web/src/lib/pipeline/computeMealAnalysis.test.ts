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
    const base = computeMealAnalysis(rows, new Set(), FOODS);
    const double = computeMealAnalysis(rows, new Set(), FOODS, undefined, {
      밥: 200,
    });
    expect(double.totals.energy_kcal).toBeCloseTo(
      (base.totals.energy_kcal ?? 0) * 2,
      5,
    );
  });
});
