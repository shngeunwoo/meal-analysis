import type { FoodItem, FoodMatchRow } from "@/types";

/** 후보로 인정하는 최소 유사도 */
export const MIN_MATCH_CONFIDENCE = 0.38;
/** 이 값 미만이면 사용자 확인 후에만 합산 */
export const AUTO_CONFIRM_CONFIDENCE = 0.7;

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function norm(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** 0~1, 높을수록 유사 */
export function stringSimilarity(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na.length || !nb.length) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length > nb.length ? na : nb;
    const overlap = shorter.length / longer.length;
    // 짧은 별칭(예: "김치")이 긴 메뉴명(예: "김치무침")에만 걸리는 오매칭 방지
    if (overlap >= 0.75 && shorter.length >= 3) return 0.92;
  }
  const d = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return Math.max(0, 1 - d / maxLen);
}

function bestFoodForQuery(
  query: string,
  database: FoodItem[],
): { food: FoodItem; confidence: number } | null {
  let best: { food: FoodItem; confidence: number } | null = null;
  for (const food of database) {
    const candidates = [food.name, ...(food.aliases ?? [])];
    for (const c of candidates) {
      const conf = stringSimilarity(query, c);
      if (!best || conf > best.confidence) {
        best = { food, confidence: conf };
      }
    }
  }
  if (!best || best.confidence < MIN_MATCH_CONFIDENCE) return null;
  return best;
}

function toMatchRow(
  query: string,
  hit: { food: FoodItem; confidence: number } | null,
): FoodMatchRow {
  if (!hit) {
    return { query, food: null, confidence: 0, needsConfirmation: false };
  }
  const needsConfirmation =
    hit.confidence >= MIN_MATCH_CONFIDENCE &&
    hit.confidence < AUTO_CONFIRM_CONFIDENCE;
  return {
    query,
    food: hit.food,
    confidence: hit.confidence,
    needsConfirmation,
  };
}

export function matchNeedsConfirmation(row: FoodMatchRow): boolean {
  if (row.needsConfirmation !== undefined) return row.needsConfirmation;
  return (
    !!row.food &&
    row.confidence >= MIN_MATCH_CONFIDENCE &&
    row.confidence < AUTO_CONFIRM_CONFIDENCE
  );
}

/**
 * 각 입력 문자열에 대해 DB에서 가장 가까운 음식을 찾는다.
 * coreDatabase가 있으면 먼저 탐색해 급식용 소규모 DB를 우선한다.
 */
export function matchFoods(
  names: string[],
  database: FoodItem[],
  coreDatabase?: FoodItem[],
): FoodMatchRow[] {
  const core = coreDatabase ?? [];
  const rows: FoodMatchRow[] = [];
  for (const query of names) {
    let hit = core.length > 0 ? bestFoodForQuery(query, core) : null;
    if (!hit) {
      hit = bestFoodForQuery(query, database);
    }
    rows.push(toMatchRow(query, hit));
  }
  return rows;
}

/**
 * 합산에 포함할 음식 목록.
 * - 신뢰도 ≥ AUTO_CONFIRM_CONFIDENCE: 자동 포함
 * - 그 미만: userConfirmedQueries에 query가 있을 때만 포함
 */
export function expandMatchedFoods(
  rows: FoodMatchRow[],
  userConfirmedQueries: ReadonlySet<string> = new Set(),
): FoodItem[] {
  const list: FoodItem[] = [];
  for (const row of rows) {
    if (!row.food || row.confidence < MIN_MATCH_CONFIDENCE) continue;
    if (row.confidence >= AUTO_CONFIRM_CONFIDENCE) {
      list.push(row.food);
    } else if (userConfirmedQueries.has(row.query)) {
      list.push(row.food);
    }
  }
  return list;
}

/** 매칭 후보가 하나라도 있는지 */
export function hasMatchableFood(rows: FoodMatchRow[]): boolean {
  return rows.some((r) => r.food && r.confidence >= MIN_MATCH_CONFIDENCE);
}
