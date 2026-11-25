import { describe, expect, it } from "vitest";
import {
  parseNeisCalories,
  parseNeisDishes,
  parseNeisNutrients,
  parseNeisOrigins,
} from "./parseMealInfo";

describe("parseNeisDishes", () => {
  it("현행 형식: <br/> 구분 + 괄호 알레르기 번호", () => {
    const raw =
      "현미밥 <br/>쇠고기미역국 (5.6.16)<br/>닭갈비 (5.6.13.15)<br/>배추김치 (9)<br/>요구르트 (2)";
    expect(parseNeisDishes(raw)).toEqual([
      { name: "현미밥", allergens: [] },
      { name: "쇠고기미역국", allergens: [5, 6, 16] },
      { name: "닭갈비", allergens: [5, 6, 13, 15] },
      { name: "배추김치", allergens: [9] },
      { name: "요구르트", allergens: [2] },
    ]);
  });

  it("구형 형식: 이름 뒤에 붙은 번호", () => {
    const raw = "쌀밥<br/>된장국5.6.13.<br/>깍두기9.13.";
    expect(parseNeisDishes(raw)).toEqual([
      { name: "쌀밥", allergens: [] },
      { name: "된장국", allergens: [5, 6, 13] },
      { name: "깍두기", allergens: [9, 13] },
    ]);
  });

  it("`*` 구분 형식: 다음 조각 앞 번호를 이전 요리에 붙인다", () => {
    const raw = "북어미역국* (16) 돈육강정* (1.2.5.6) 배추김치* (9) 하이라이스*";
    expect(parseNeisDishes(raw)).toEqual([
      { name: "북어미역국", allergens: [16] },
      { name: "돈육강정", allergens: [1, 2, 5, 6] },
      { name: "배추김치", allergens: [9] },
      { name: "하이라이스", allergens: [] },
    ]);
  });

  it("기호·태그·HTML 엔티티를 지운다", () => {
    const raw =
      "★스파게티&amp;미트볼 (1.2.6)<br/>(완)닭강정(고) (5.6.15)<br/>#수제피클<br/>-<br/>ⓢ찹쌀떡";
    expect(parseNeisDishes(raw).map((d) => d.name)).toEqual([
      "스파게티&미트볼",
      "닭강정",
      "수제피클",
      "찹쌀떡",
    ]);
  });

  it("이름에 붙은 숫자 하나는 알레르기로 보지 않는다", () => {
    expect(parseNeisDishes("3색나물<br/>오미자차").map((d) => d.name)).toEqual([
      "3색나물",
      "오미자차",
    ]);
  });

  it("같은 요리가 반복되면 하나로 합친다", () => {
    expect(parseNeisDishes("우유 (2)<br/>우유")).toEqual([
      { name: "우유", allergens: [2] },
    ]);
  });
});

describe("NEIS 부가 정보", () => {
  it("칼로리를 숫자로 읽는다", () => {
    expect(parseNeisCalories("812.4 Kcal")).toBe(812.4);
    expect(parseNeisCalories("1,024 Kcal")).toBe(1024);
    expect(parseNeisCalories("")).toBeNull();
  });

  it("영양정보를 항목별로 읽는다", () => {
    const raw = "탄수화물(g) : 112.3<br/>단백질(g) : 35.2<br/>비타민A(R.E) : 210.5";
    expect(parseNeisNutrients(raw)).toEqual([
      { label: "탄수화물", unit: "g", value: 112.3 },
      { label: "단백질", unit: "g", value: 35.2 },
      { label: "비타민A", unit: "R.E", value: 210.5 },
    ]);
  });

  it("원산지를 항목별로 읽는다", () => {
    expect(parseNeisOrigins("쌀 : 국내산<br/>쇠고기(종류) : 국내산(한우)")).toEqual([
      { item: "쌀", origin: "국내산" },
      { item: "쇠고기(종류)", origin: "국내산(한우)" },
    ]);
  });
});
