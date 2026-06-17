import { describe, it, expect } from "vitest";
import { recommendNextMeal } from "./index";

describe("recommendNextMeal", () => {
  it("탄수화물·열량 부족이 같아도 에너지 추천은 한 번만", () => {
    const recs = recommendNextMeal(
      { carb_g: 100, energy_kcal: 500 },
      [],
      {},
    );
    const energyTitles = recs.filter((r) => r.title === "에너지(탄수화물) 보충");
    expect(energyTitles).toHaveLength(1);
    expect(new Set(recs.map((r) => r.title)).size).toBe(recs.length);
  });
});
