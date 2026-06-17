import { describe, it, expect } from "vitest";
import { FOODS } from "@/data/foods";
import { foodEvidenceLine } from "./foodEvidence";

describe("foodEvidenceLine", () => {
  it("메타 없으면 내부 DB 문구", () => {
    expect(foodEvidenceLine(FOODS[0])).toBe("내부 DB(1인분 근사)");
  });

  it("MFDS 스타일 메타를 요약한다", () => {
    const line = foodEvidenceLine({
      id: "x",
      name: "테스트",
      nutrientsPerServing: {},
      meta: { source: "식품의약품안전처", basis: "100g", 기준일자: "2025-01-01" },
    });
    expect(line).toContain("식품의약품안전처");
    expect(line).toContain("100g");
  });
});
