import { describe, it, expect } from "vitest";
import type { FoodItem } from "@/types";
import {
  AUTO_CONFIRM_CONFIDENCE,
  expandMatchedFoods,
  matchFoods,
  matchNeedsConfirmation,
  stringSimilarity,
} from "./index";

const NUTRIENTS = {
  energy_kcal: 100,
  protein_g: 5,
  fat_g: 2,
  carb_g: 15,
  sodium_mg: 200,
  fiber_g: 1,
};

function food(
  id: string,
  name: string,
  aliases: string[] = [],
): FoodItem {
  return { id, name, aliases, nutrientsPerServing: NUTRIENTS };
}

describe("stringSimilarity", () => {
  it("동일 문자열은 1", () => {
    expect(stringSimilarity("alpha", "alpha")).toBe(1);
  });

  it("짧은 부분 포함만으로는 높은 점수를 주지 않는다", () => {
    expect(stringSimilarity("alphalong", "alpha")).toBeLessThan(0.75);
  });

  it("짧은 문자열의 약한 퍼지 유사도는 0으로 처리한다", () => {
    expect(stringSimilarity("ab", "ax")).toBe(0);
  });

  it("복합명 토큰과 입력이 같으면 높은 점수를 준다", () => {
    expect(stringSimilarity("foo", "foo_bar")).toBe(0.95);
  });
});

describe("matchFoods", () => {
  const coreDb = [
    food("item_a", "alpha", ["a", "alpha_full"]),
    food("item_b", "beta_side", ["b"]),
  ];

  it("별칭으로 매칭한다", () => {
    const rows = matchFoods(["a", "b"], coreDb, coreDb);
    expect(rows[0].food?.id).toBe("item_a");
    expect(rows[1].food?.id).toBe("item_b");
  });

  it("유사하지만 다른 이름은 자동 확정하지 않는다", () => {
    const rows = matchFoods(["alphalong"], coreDb, coreDb);
    const conf = rows[0].confidence ?? 0;
    expect(conf).toBeLessThan(AUTO_CONFIRM_CONFIDENCE);
  });

  it("낮은 신뢰도는 확인 전 합산하지 않는다", () => {
    const rows = matchFoods(["a"], coreDb, coreDb);
    if ((rows[0].confidence ?? 0) < AUTO_CONFIRM_CONFIDENCE) {
      expect(matchNeedsConfirmation(rows[0])).toBe(true);
      expect(expandMatchedFoods(rows)).toHaveLength(0);
      expect(expandMatchedFoods(rows, new Set(["a"]))).toHaveLength(1);
    }
  });

  it("짧은 퍼지 유사도만 있는 후보는 매칭하지 않는다", () => {
    const db = [food("near", "ax")];
    const rows = matchFoods(["ab"], db);
    expect(rows[0].food).toBeNull();
    expect(rows[0].confidence).toBe(0);
  });

  it("복합 DB명의 토큰과 정확히 일치하면 매칭한다", () => {
    const db = [
      food("compound", "foo_bar"),
      food("near", "ax"),
    ];
    const rows = matchFoods(["foo"], db);
    expect(rows[0].food?.id).toBe("compound");
    expect(rows[0].confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("DB에 같은 이름이 여러 행이어도 매칭을 거부하지 않는다", () => {
    const db = [
      food("dup_a", "target_item", ["target"]),
      food("dup_b", "target_item", ["target"]),
      food("other", "other_item"),
    ];
    const rows = matchFoods(["target"], db);
    expect(rows[0].food?.name).toBe("target_item");
    expect(rows[0].confidence).toBe(1);
  });

  it("이름이 다른 근접 후보만 있으면 모호함으로 거부한다", () => {
    const db = [food("a", "abce"), food("b", "abcf")];
    const rows = matchFoods(["abcd"], db);
    expect(rows[0].food).toBeNull();
  });

  it("상세 DB에만 있는 항목은 상세 DB에서 매칭한다", () => {
    const detailDb = [food("detail_only", "unique_item", ["unique_item"])];
    const rows = matchFoods(["unique_item"], detailDb, coreDb);
    expect(rows[0].food?.id).toBe("detail_only");
    expect(rows[0].confidence).toBe(1);
  });

  it("코어·상세 DB 동점이면 서로 다른 음식은 매칭하지 않는다", () => {
    const detailDb = [food("detail_x", "token", ["token"])];
    const ambiguousCore = [food("core_x", "token", ["token"])];
    const rows = matchFoods(["token"], detailDb, ambiguousCore);
    expect(rows[0].food).toBeNull();
  });
});
