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

/** 복합명(구분자로 이어진 이름)을 토큰 단위로 분리 */
function foodNameTokens(s: string): string[] {
  return norm(s).split(/[_\s()/,-]+/).filter(Boolean);
}

/** 0~1, 높을수록 유사 */
export function stringSimilarity(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na.length || !nb.length) return 0;
  if (na === nb) return 1;

  // 복합명 토큰과 입력이 정확히 같으면 높은 점수 (예: foo ↔ foo_bar)
  if (foodNameTokens(a).some((t) => t === nb) || foodNameTokens(b).some((t) => t === na)) {
    return 0.95;
  }

  if (na.includes(nb) || nb.includes(na)) {
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length > nb.length ? na : nb;
    const overlap = shorter.length / longer.length;
    // 짧은 별칭이 긴 메뉴명에만 걸리는 오매칭 방지
    if (overlap >= 0.75 && shorter.length >= 3) return 0.92;
  }

  const d = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const minLen = Math.min(na.length, nb.length);
  const sim = Math.max(0, 1 - d / maxLen);
  // 짧은 문자열의 약한 퍼지 유사도는 오매칭으로 이어지므로 차단
  if (d > 0 && minLen <= 3 && sim < 0.85) return 0;
  // 양념간장↔양념치킨 처럼 앞만 같고 뒤가 다른 오매칭 완화
  if (d >= 2 && minLen <= 5 && sim < 0.75) return 0;
  return sim;
}

/** 급식 부재료·차는 카테고리 오매칭을 막기 위해 강제 힌트 */
const QUERY_MATCH_HINTS: Record<string, string[]> = {
  숭늉: ["숭늉", "음료", "차"],
  보리차: ["보리차", "음료", "차"],
  양념간장: ["양념간장", "양념초장", "초간장", "간장"],
  양념장: ["양념장", "양념초장", "초장"],
};

function hintBoost(query: string, candidate: string): number {
  const hints = QUERY_MATCH_HINTS[norm(query)];
  if (!hints?.length) return 0;
  const nc = norm(candidate);
  if (hints.some((h) => norm(h) === nc)) return 0.2;
  if (hints.some((h) => nc.includes(norm(h)) || norm(h).includes(nc))) return 0.1;
  return 0;
}

function foodNamesEqual(a: FoodItem, b: FoodItem): boolean {
  return norm(a.name) === norm(b.name);
}

function bestFoodForQuery(
  query: string,
  database: FoodItem[],
): { food: FoodItem; confidence: number } | null {
  let best: { food: FoodItem; confidence: number } | null = null;
  let secondBest: { food: FoodItem; confidence: number } | null = null;

  for (const food of database) {
    const candidates = [food.name, ...(food.aliases ?? [])];
    for (const c of candidates) {
      const conf = Math.min(1, stringSimilarity(query, c) + hintBoost(query, c));
      // 짧은 카테고리명(밥·국)은 질의에 그 글자가 있을 때만 허용
      if (
        food.name.length <= 2 &&
        !norm(query).includes(norm(food.name)) &&
        !(food.aliases ?? []).some((a) => norm(a) === norm(query))
      ) {
        continue;
      }
      if (!best || conf > best.confidence) {
        if (
          best &&
          best.food.id !== food.id &&
          !foodNamesEqual(best.food, food)
        ) {
          secondBest = best;
        }
        best = { food, confidence: conf };
      } else if (
        best.food.id !== food.id &&
        !foodNamesEqual(best.food, food) &&
        (!secondBest || conf > secondBest.confidence)
      ) {
        secondBest = { food, confidence: conf };
      }
    }
  }

  if (!best || best.confidence < MIN_MATCH_CONFIDENCE) return null;

  // 이름이 다른 상위 후보끼리만 모호함으로 본다 (MFDS 중복 행은 제외)
  const AMBIGUITY_MARGIN = 0.15;
  if (
    secondBest &&
    !foodNamesEqual(best.food, secondBest.food) &&
    secondBest.confidence >= MIN_MATCH_CONFIDENCE &&
    best.confidence - secondBest.confidence < AMBIGUITY_MARGIN
  ) {
    return null;
  }

  return best;
}

/** DB에서 이름·별칭·유사도로 음식을 찾는다 (AI 제안·수동 매핑 공용) */
export function resolveFoodInDatabase(
  name: string,
  database: FoodItem[],
): { food: FoodItem; confidence: number } | null {
  return bestFoodForQuery(name, database);
}

function pickBetterHit(
  coreHit: { food: FoodItem; confidence: number } | null,
  dbHit: { food: FoodItem; confidence: number } | null,
): { food: FoodItem; confidence: number } | null {
  if (!coreHit) return dbHit;
  if (!dbHit) return coreHit;
  if (coreHit.confidence > dbHit.confidence) return coreHit;
  if (dbHit.confidence > coreHit.confidence) return dbHit;
  if (coreHit.food.id !== dbHit.food.id) return null;
  return coreHit;
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
 * coreDatabase와 database를 모두 탐색해 더 높은 신뢰도를 선택한다.
 * 동점이면서 서로 다른 음식이면 매칭하지 않는다.
 */
export function matchFoods(
  names: string[],
  database: FoodItem[],
  coreDatabase?: FoodItem[],
): FoodMatchRow[] {
  const core = coreDatabase ?? [];
  const rows: FoodMatchRow[] = [];
  for (const query of names) {
    const coreHit = core.length > 0 ? bestFoodForQuery(query, core) : null;
    const dbHit = bestFoodForQuery(query, database);
    rows.push(toMatchRow(query, pickBetterHit(coreHit, dbHit)));
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
