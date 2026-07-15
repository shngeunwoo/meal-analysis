import { describe, it, expect } from "vitest";
import {
  buildFoodCandidates,
  dedupeFoodNames,
  parseMenuLines,
  splitMenuTokens,
} from "./index";

describe("parseMenuLines", () => {
  it("줄 단위로 분리하고 빈 줄을 제거한다", () => {
    expect(parseMenuLines("밥\n\n된장찌개\n")).toEqual(["밥", "된장찌개"]);
  });
});

describe("splitMenuTokens", () => {
  it("쉼표·줄바꿈으로 나눈다", () => {
    expect(splitMenuTokens("백미밥, 김치\n불고기")).toEqual(["백미밥", "김치", "불고기"]);
  });
});

describe("buildFoodCandidates", () => {
  it("입력 텍스트에서 토큰을 만든다", () => {
    expect(buildFoodCandidates("우유, 사과")).toEqual(["우유", "사과"]);
  });
});

describe("dedupeFoodNames", () => {
  it("중복을 제거한다", () => {
    expect(dedupeFoodNames(["밥", "밥", "김치"])).toEqual(["밥", "김치"]);
  });
});
