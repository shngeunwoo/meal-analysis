import { describe, it, expect } from "vitest";
import { FOODS } from "@/data/foods";
import {
  DEFAULT_DAILY_TARGETS,
  defaultIntakeGrams,
  getMealTargets,
  scaleFoodByGrams,
  servingBasisGrams,
} from "./index";

describe("getMealTargets", () => {
  it("끼니 코드 없으면 일일 목표를 반환한다", () => {
    expect(getMealTargets()).toEqual(DEFAULT_DAILY_TARGETS);
  });

  it("중식(35%)은 일일 목표의 35%를 반환한다", () => {
    const targets = getMealTargets("2");
    expect(targets.energy_kcal).toBe(700);
    expect(targets.protein_g).toBe(17.5);
    expect(targets.sodium_mg).toBe(700);
  });
});

describe("defaultIntakeGrams", () => {
  it("코어 밥은 1인분 대표 중량을 쓴다", () => {
    const rice = FOODS.find((f) => f.id === "rice")!;
    expect(defaultIntakeGrams(rice)).toBe(210);
    expect(servingBasisGrams(rice)).toBe(210);
  });

  it("분량을 절반으로 하면 열량도 절반이다", () => {
    const soup = FOODS.find((f) => f.id === "soup")!;
    const half = scaleFoodByGrams(soup, servingBasisGrams(soup) / 2);
    expect(half.nutrientsPerServing.energy_kcal).toBeCloseTo(
      (soup.nutrientsPerServing.energy_kcal ?? 0) / 2,
      5,
    );
  });
});
