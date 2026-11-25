import type { NutrientId } from "@/types";

/**
 * 나이스 급식식단정보(mealServiceDietInfo) 응답 필드 파서.
 * - DDISH_NM: 요리명 (+ 알레르기 번호)
 * - CAL_INFO: 칼로리 ("812.4 Kcal")
 * - NTR_INFO: 영양정보 ("탄수화물(g) : 112.3<br/>…")
 * - ORPLC_INFO: 원산지 ("쌀 : 국내산<br/>…")
 */

export type NeisDish = {
  /** 표시·매칭용 음식명 (알레르기 번호·기호 제거) */
  name: string;
  /** 알레르기 유발 식품 번호 (1~19) */
  allergens: number[];
};

export type NeisNutrientInfo = {
  label: string;
  unit: string;
  value: number;
};

export type NeisOriginInfo = {
  item: string;
  origin: string;
};

/** 식품의약품안전처 고시 알레르기 유발 식품 번호 */
export const NEIS_ALLERGEN_LABEL: Record<number, string> = {
  1: "난류",
  2: "우유",
  3: "메밀",
  4: "땅콩",
  5: "대두",
  6: "밀",
  7: "고등어",
  8: "게",
  9: "새우",
  10: "돼지고기",
  11: "복숭아",
  12: "토마토",
  13: "아황산류",
  14: "호두",
  15: "닭고기",
  16: "쇠고기",
  17: "오징어",
  18: "조개류",
  19: "잣",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ");
}

/** <br/>·줄바꿈·`*`·`|` 를 줄 구분으로 통일한 줄 목록 */
function splitLines(raw: string, extraSeparators = false): string[] {
  let text = decodeEntities(raw).replace(/<br\s*\/?>/gi, "\n").replace(/\r/g, "");
  if (extraSeparators) text = text.replace(/[*|]/g, "\n");
  return text.split("\n");
}

const ALLERGEN_GROUP = /\(\s*(\d{1,2}(?:\s*\.\s*\d{1,2})*)\s*\.?\s*\)/g;
/** 구형 표기: "쇠고기미역국5.6.16." 처럼 이름 뒤에 바로 붙은 번호 */
const TRAILING_BARE_ALLERGENS = /(?<=[가-힣A-Za-z)\]])\s*(\d{1,2}(?:\.\d{1,2})*)\.?\s*$/;
/** 식단 표기 기호 (고열량·수제·선택 메뉴 표시 등) */
const MARKERS = /[★☆※#@♥♡◎●○◆◇■□▶▷◀◁▲△▼▽ⓢⓒⓗⓝⓡⓣⓘⓚ✔✓☞→]/g;

function toAllergenNumbers(group: string): number[] {
  return group
    .split(".")
    .map((x) => Number.parseInt(x.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 19);
}

function cleanDishName(s: string): string {
  return s
    .replace(MARKERS, " ")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/^\s*[-~·.,/]+/, "")
    .replace(/[-~·.,/]+\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 앞뒤에 붙은 비(非)알레르기 괄호 표기 제거: "(완)닭갈비", "닭갈비(고)" */
function stripEdgeTags(s: string): string {
  let out = s;
  for (let i = 0; i < 3; i++) {
    const next = out
      .replace(/^\s*[([][^)\]]{1,6}[)\]]\s*/, "")
      .replace(/\s*[([][^)\]]{1,6}[)\]]\s*$/, "")
      .trim();
    if (next === out || next.length < 2) break;
    out = next;
  }
  return out;
}

/**
 * DDISH_NM 문자열을 요리 목록(이름 + 알레르기 번호)으로 변환한다.
 * 지원 형식:
 *  - "현미밥 <br/>쇠고기미역국 (5.6.16)<br/>…"   (현행)
 *  - "쌀밥<br/>된장국5.6.13.<br/>…"             (구형)
 *  - "북어미역국* (16) 돈육강정* (1.2.5.6) …"    (`*` 구분)
 */
export function parseNeisDishes(ddishNm: string): NeisDish[] {
  const dishes: NeisDish[] = [];
  const byName = new Map<string, NeisDish>();

  for (const line of splitLines(ddishNm ?? "", true)) {
    let rest = line.trim();
    if (!rest) continue;

    // `*` 구분 형식에서는 다음 조각 앞에 이전 요리의 번호가 붙어 온다.
    const leading = rest.match(/^\s*\(\s*(\d{1,2}(?:\s*\.\s*\d{1,2})*)\s*\.?\s*\)/);
    if (leading && dishes.length > 0) {
      const prev = dishes[dishes.length - 1];
      prev.allergens = mergeNumbers(prev.allergens, toAllergenNumbers(leading[1]));
      rest = rest.slice(leading[0].length);
    }

    const allergens: number[] = [];
    rest = rest.replace(ALLERGEN_GROUP, (_m, g: string) => {
      allergens.push(...toAllergenNumbers(g));
      return " ";
    });
    const bare = rest.match(TRAILING_BARE_ALLERGENS);
    if (bare && (bare[1].includes(".") || /\.\s*$/.test(rest))) {
      allergens.push(...toAllergenNumbers(bare[1]));
      rest = rest.slice(0, bare.index);
    }

    const name = cleanDishName(stripEdgeTags(cleanDishName(rest)));
    if (name.length < 2) continue;

    const existing = byName.get(name);
    if (existing) {
      existing.allergens = mergeNumbers(existing.allergens, allergens);
      continue;
    }
    const dish: NeisDish = { name, allergens: mergeNumbers([], allergens) };
    byName.set(name, dish);
    dishes.push(dish);
  }

  return dishes;
}

function mergeNumbers(a: number[], b: number[]): number[] {
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}

/** "812.4 Kcal" → 812.4 */
export function parseNeisCalories(calInfo: string | undefined): number | null {
  if (!calInfo) return null;
  const m = calInfo.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "탄수화물(g) : 112.3<br/>비타민A(R.E) : 210.5" → [{ label, unit, value }] */
export function parseNeisNutrients(ntrInfo: string | undefined): NeisNutrientInfo[] {
  if (!ntrInfo) return [];
  const out: NeisNutrientInfo[] = [];
  for (const line of splitLines(ntrInfo)) {
    const m = line.trim().match(/^(.+?)\s*\(([^)]*)\)\s*:\s*([\d.,]+)/);
    if (!m) continue;
    const value = Number.parseFloat(m[3].replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;
    out.push({ label: m[1].trim(), unit: m[2].trim(), value });
  }
  return out;
}

/** "쌀 : 국내산<br/>김치류 : 국내산" → [{ item, origin }] */
export function parseNeisOrigins(orplcInfo: string | undefined): NeisOriginInfo[] {
  if (!orplcInfo) return [];
  const out: NeisOriginInfo[] = [];
  for (const line of splitLines(orplcInfo)) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const item = line.slice(0, idx).trim();
    const origin = line.slice(idx + 1).trim();
    if (item && origin) out.push({ item, origin });
  }
  return out;
}

/** 나이스 영양정보 항목 → 앱 영양소 ID (단위가 맞는 것만) */
const NEIS_TO_NUTRIENT: { label: string; unit: string; id: NutrientId }[] = [
  { label: "탄수화물", unit: "g", id: "carb_g" },
  { label: "단백질", unit: "g", id: "protein_g" },
  { label: "지방", unit: "g", id: "fat_g" },
  { label: "나트륨", unit: "mg", id: "sodium_mg" },
  { label: "식이섬유", unit: "g", id: "fiber_g" },
];

/**
 * 나이스 제공 열량·영양정보를 앱 영양소 맵으로 바꾼다.
 * 나이스에 없는 항목(보통 나트륨·식이섬유)은 빠진다.
 */
export function neisNutrientTotals(
  kcal: number | null | undefined,
  nutrients: NeisNutrientInfo[] | undefined,
): Partial<Record<NutrientId, number>> {
  const out: Partial<Record<NutrientId, number>> = {};
  if (typeof kcal === "number" && kcal > 0) out.energy_kcal = kcal;
  for (const n of nutrients ?? []) {
    const hit = NEIS_TO_NUTRIENT.find(
      (m) => n.label.replace(/\s/g, "") === m.label && n.unit.toLowerCase() === m.unit,
    );
    if (hit && Number.isFinite(n.value) && n.value >= 0) out[hit.id] = n.value;
  }
  return out;
}
