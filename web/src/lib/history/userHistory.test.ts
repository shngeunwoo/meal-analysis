import { describe, it, expect } from "vitest";
import {
  addManualMeal,
  addSchoolMeal,
  addSchoolSearch,
  parseUserHistory,
  serializeUserHistory,
  EMPTY_USER_HISTORY,
} from "./userHistory";

describe("userHistory", () => {
  it("학교 검색 기록을 중복 없이 저장한다", () => {
    let h = addSchoolSearch(EMPTY_USER_HISTORY, "배재고", "서울");
    h = addSchoolSearch(h, "배재고", "서울");
    expect(h.schoolSearches).toHaveLength(1);
    expect(h.schoolSearches[0]?.query).toBe("배재고");
  });

  it("급식 분석 기록을 저장한다", () => {
    const h = addSchoolMeal(EMPTY_USER_HISTORY, {
      atptCode: "B10",
      sdSchulCode: "123",
      schoolName: "배재고",
      schoolKind: "고등학교",
      location: "서울",
      mlsvYmd: "2026-07-15",
      mmealScCode: "2",
      mealLabel: "중식",
    });
    expect(h.schoolMeals[0]?.schoolName).toBe("배재고");
  });

  it("직접 입력 기록을 저장한다", () => {
    const h = addManualMeal(EMPTY_USER_HISTORY, "밥, 국", "2", "중식");
    expect(h.manualMeals[0]?.text).toBe("밥, 국");
  });

  it("직렬화·파싱이 유지된다", () => {
    const h = addManualMeal(EMPTY_USER_HISTORY, "사과", "4", "간식");
    const raw = serializeUserHistory(h);
    const parsed = parseUserHistory(raw);
    expect(parsed.manualMeals[0]?.text).toBe("사과");
  });
});
