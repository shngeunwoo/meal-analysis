import { describe, it, expect } from "vitest";
import { FOODS } from "@/data/foods";
import {
  AUTO_CONFIRM_CONFIDENCE,
  expandMatchedFoods,
  matchFoods,
  matchNeedsConfirmation,
  stringSimilarity,
} from "./index";

describe("stringSimilarity", () => {
  it("동일 문자열은 1", () => {
    expect(stringSimilarity("백미밥", "백미밥")).toBe(1);
  });

  it("짧은 별칭이 긴 메뉴명에만 포함될 때 92%로 올리지 않는다", () => {
    expect(stringSimilarity("김치무침", "김치")).toBeLessThan(0.75);
  });
});

describe("matchFoods", () => {
  it("별칭으로 매칭한다", () => {
    const rows = matchFoods(["밥", "김치"], FOODS, FOODS);
    expect(rows[0].food?.name).toBe("백미밥");
    expect(rows[1].food?.name).toBe("배추김치");
  });

  it("김치무침은 배추김치로 자동 확정하지 않는다", () => {
    const rows = matchFoods(["김치무침"], FOODS, FOODS);
    const conf = rows[0].confidence ?? 0;
    expect(conf).toBeLessThan(AUTO_CONFIRM_CONFIDENCE);
  });

  it("짧은 별칭은 확인이 필요할 수 있다", () => {
    const rows = matchFoods(["밥"], FOODS, FOODS);
    expect(rows[0].food?.id).toBe("rice_white");
    if ((rows[0].confidence ?? 0) < AUTO_CONFIRM_CONFIDENCE) {
      expect(matchNeedsConfirmation(rows[0])).toBe(true);
      expect(expandMatchedFoods(rows)).toHaveLength(0);
      expect(expandMatchedFoods(rows, new Set(["밥"]))).toHaveLength(1);
    }
  });
});
