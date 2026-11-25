import { dedupeFoodNames } from "@/lib/parse";
import { parseNeisDishes } from "./parseMealInfo";

/**
 * NEIS `DDISH_NM` (요리명) 문자열을 음식명 목록으로 변환한다.
 * 예: "북어미역국* (16) …" 또는 "우동 <br/>김치무침 <br/>…"
 */
export function parseNeisDishNames(ddishNm: string): string[] {
  return dedupeFoodNames(parseNeisDishes(ddishNm).map((d) => d.name));
}
