import { describe, it, expect } from "vitest";
import { parseNeisDishNames } from "./parseDishNames";

describe("parseNeisDishNames", () => {
  it("NEIS 요리명에서 음식명을 뽑는다", () => {
    const raw =
      "북어미역국* (16) 돈육강정* (1.2.5.6) 배추김치* (9) 하이라이스*";
    expect(parseNeisDishNames(raw)).toEqual([
      "북어미역국",
      "돈육강정",
      "배추김치",
      "하이라이스",
    ]);
  });

  it("<br/> 구분 요리명을 항목별로 나눈다", () => {
    const raw =
      "우동 <br/>김치무침 <br/>왕새우꼬치 <br/>방울토마토 <br/>야채샐러드핫도그";
    expect(parseNeisDishNames(raw)).toEqual([
      "우동",
      "김치무침",
      "왕새우꼬치",
      "방울토마토",
      "야채샐러드핫도그",
    ]);
  });
});
