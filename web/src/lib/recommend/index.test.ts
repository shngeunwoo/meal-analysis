import { describe, it, expect } from "vitest";
import { FOODS } from "@/data/foods";
import { getMealTargets } from "@/lib/analysis";
import { pickDisplayName, recommendNextMeal } from "./index";

describe("pickDisplayName", () => {
  it("카테고리명 대신 구체 별칭을 쓴다", () => {
    const meat = FOODS.find((f) => f.id === "main_meat")!;
    expect(pickDisplayName(meat)).not.toBe("고기류");
    expect(pickDisplayName(meat).length).toBeGreaterThan(2);
  });
});

describe("recommendNextMeal", () => {
  it("탄수화물·열량 부족이 같아도 에너지 추천은 한 번만", () => {
    const recs = recommendNextMeal(
      { carb_g: 100, energy_kcal: 500 },
      FOODS,
      {},
    );
    const energyLike = recs.filter(
      (r) => r.title.includes("열량") || r.title.includes("탄수화물"),
    );
    expect(energyLike.length).toBeLessThanOrEqual(1);
  });

  it("추천에 밥·국·고기류 같은 카테고리명만 나오지 않는다", () => {
    const targets = getMealTargets("2");
    const recs = recommendNextMeal(
      { protein_g: 10, fiber_g: 5, energy_kcal: 200 },
      FOODS,
      { sodium_mg: targets.sodium_mg * 0.8 },
      targets,
    );
    const items = recs.flatMap((r) => r.items.map((x) => x.split(" (")[0]));
    expect(items).not.toContain("밥");
    expect(items).not.toContain("국");
    expect(items).not.toContain("고기류");
    expect(items.length).toBeGreaterThan(0);
  });

  it("이미 먹은 음식은 추천하지 않는다", () => {
    const rice = FOODS.find((f) => f.id === "rice")!;
    const recs = recommendNextMeal(
      { carb_g: 50 },
      FOODS,
      {},
      undefined,
      new Set([rice.id]),
    );
    const items = recs.flatMap((r) => r.items.map((x) => x.split(" (")[0]));
    expect(items.some((name) => name.includes("밥") && name === "밥")).toBe(false);
  });

  it("가벼운 균형 옵션 같은 뭉뚱그린 추천은 넣지 않는다", () => {
    const recs = recommendNextMeal({}, FOODS, { sodium_mg: 100 });
    expect(recs.some((r) => r.title.includes("가벼운 균형"))).toBe(false);
  });
});
