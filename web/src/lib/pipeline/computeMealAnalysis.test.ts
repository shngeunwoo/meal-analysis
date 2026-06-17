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
    const bulgogi = FOODS.find((f) => f.id === "bulgogi")!;
    const rows: FoodMatchRow[] = [
      {
        query: "추정메뉴",
        food: bulgogi,
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
});
