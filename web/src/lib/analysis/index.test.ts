import { describe, it, expect } from "vitest";
import { DEFAULT_DAILY_TARGETS, getMealTargets } from "./index";

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
