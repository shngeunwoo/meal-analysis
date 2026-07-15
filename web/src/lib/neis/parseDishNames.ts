import { dedupeFoodNames } from "@/lib/parse";

/** NEIS·UI에서 쓰이는 요리명 구분자를 `*` 로 통일 */
function normalizeDishSeparators(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "*")
    .replace(/\r?\n/g, "*")
    .replace(/\s*\|\s*/g, "*")
    .trim();
}

/**
 * NEIS `DDISH_NM` (요리명) 문자열을 음식명 목록으로 변환한다.
 * 예: "북어미역국* (16) …" 또는 "우동 <br/>김치무침 <br/>…"
 */
export function parseNeisDishNames(ddishNm: string): string[] {
  const text = normalizeDishSeparators(ddishNm);
  if (!text) return [];

  const parts = text.split("*");
  const names: string[] = [];

  for (const part of parts) {
    const name = part
      .replace(/^\s*\([^)]*\)\s*/g, "")
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .trim();
    if (name.length >= 2) names.push(name);
  }

  return dedupeFoodNames(names);
}
