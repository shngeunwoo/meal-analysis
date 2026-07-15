import "server-only";

import type { FoodItem, FoodMatchRow } from "@/types";
import {
  resolveFoodInDatabase,
  MIN_MATCH_CONFIDENCE,
  AUTO_CONFIRM_CONFIDENCE,
} from "@/lib/match";

/** AI가 반환하는 후보 형태 */
type AiMatchCandidate = { query: string; suggestion: string | null };

function buildDbSample(queries: string[], database: FoodItem[]): string[] {
  const topN = 40;
  const seen = new Set<string>();

  for (const food of database) {
    seen.add(food.name);
    for (const alias of food.aliases ?? []) seen.add(alias);
  }

  const ranked = new Set<string>();
  for (const q of queries) {
    const qn = q.replace(/\s+/g, "").toLowerCase();
    const scored = [...seen].map((name) => {
      const nn = name.replace(/\s+/g, "").toLowerCase();
      let common = 0;
      for (const ch of qn) if (nn.includes(ch)) common++;
      return { name, score: common / Math.max(qn.length, nn.length, 1) };
    });
    scored.sort((a, b) => b.score - a.score);
    scored.slice(0, topN).forEach((s) => ranked.add(s.name));
  }

  return [...ranked];
}

function findFoodInDatabase(label: string, database: FoodItem[]): FoodItem | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const exact =
    database.find((f) => f.name === trimmed) ??
    database.find((f) => (f.aliases ?? []).includes(trimmed));
  if (exact) return exact;

  return resolveFoodInDatabase(trimmed, database)?.food ?? null;
}

function applyAiSuggestion(
  row: FoodMatchRow,
  suggestion: string | null | undefined,
  database: FoodItem[],
): FoodMatchRow {
  if (!suggestion || suggestion === "null") return row;

  const matched = findFoodInDatabase(suggestion, database);
  if (!matched) return row;

  const aiConfidence = 0.85;
  const needsConfirmation =
    aiConfidence >= MIN_MATCH_CONFIDENCE && aiConfidence < AUTO_CONFIRM_CONFIDENCE;

  return {
    ...row,
    food: matched,
    confidence: aiConfidence,
    needsConfirmation,
    aiMatched: true,
  };
}

/**
 * AI에게 food DB 이름 목록을 보여주고,
 * 각 입력 음식명에 가장 가까운 DB 항목 이름을 제안받는다.
 */
async function askAiForMatches(
  queries: string[],
  database: FoodItem[],
  options?: { unmatchedOnly?: boolean },
): Promise<AiMatchCandidate[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey || queries.length === 0 || database.length === 0) return [];

  const dbSample = buildDbSample(queries, database).join(", ");
  const prompt = options?.unmatchedOnly
    ? "아래 [DB 목록]에서 각 [입력 음식명]과 의미상 가장 가까운 항목 이름을 골라라. " +
      "DB에 정확한 이름이 없어도 유사·동의어·부분 일치 메뉴를 고른다. " +
      "반드시 DB 목록에 있는 이름만 써야 한다. 완전히 관련 없을 때만 null. " +
      '반드시 JSON 객체 하나만 출력: {"matches":[{"query":"입력명","suggestion":"DB이름 또는 null"},...]}'
    : "아래 [DB 목록]에서 각 [입력 음식명]과 가장 의미가 가까운 항목 이름을 골라라. " +
      "반드시 DB 목록에 있는 이름만 써야 한다. 적당한 것이 없으면 null. " +
      '반드시 JSON 객체 하나만 출력: {"matches":[{"query":"입력명","suggestion":"DB이름 또는 null"},...]}';

  const userContent =
    `[입력 음식명]\n${queries.join(", ")}\n\n[DB 목록]\n${dbSample}`;

  console.error(
    "[aiReMatch] askAiForMatches",
    options?.unmatchedOnly ? "(DB 없음 전용)" : "",
    "queries:",
    queries,
  );

  try {
    let text: string | null = null;

    if (process.env.GEMINI_API_KEY) {
      const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${prompt}\n\n${userContent}` }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) {
        console.error("[aiReMatch] Gemini 오류", res.status, await res.text().catch(() => ""));
        return [];
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
      console.error("[aiReMatch] Gemini 응답 text:", text?.slice(0, 300));
    } else if (process.env.AI_API_KEY) {
      const base = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
      const model = process.env.AI_MODEL ?? "gpt-4o-mini";
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: userContent },
          ],
        }),
      });
      if (!res.ok) {
        console.error("[aiReMatch] OpenAI 오류", res.status, await res.text().catch(() => ""));
        return [];
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      text = data.choices?.[0]?.message?.content?.trim() ?? null;
      console.error("[aiReMatch] OpenAI 응답 text:", text?.slice(0, 300));
    }

    if (!text) return [];

    let t = text;
    if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(t) as unknown;
    const arr = Array.isArray((parsed as { matches?: unknown }).matches)
      ? (parsed as { matches: unknown[] }).matches
      : Array.isArray(parsed)
        ? parsed
        : [];

    return arr.filter(
      (x): x is AiMatchCandidate =>
        typeof (x as AiMatchCandidate).query === "string" &&
        ((x as AiMatchCandidate).suggestion === null ||
          typeof (x as AiMatchCandidate).suggestion === "string"),
    );
  } catch {
    return [];
  }
}

/**
 * 신뢰도 < threshold 인 매칭 행들을 AI 제안으로 재시도한다.
 * food가 null(DB 없음)인 항목은 별도 AI 패스로 반드시 시도한다.
 */
export async function aiReMatchLowConfidence(
  rows: FoodMatchRow[],
  database: FoodItem[],
  threshold = 0.9,
): Promise<FoodMatchRow[]> {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAi = !!process.env.AI_API_KEY;
  console.error("[aiReMatch] GEMINI_API_KEY 있음:", hasGemini, "| AI_API_KEY 있음:", hasOpenAi);

  if (process.env.AI_DISABLED === "1" || process.env.AI_DISABLED === "true") {
    console.error("[aiReMatch] AI_DISABLED=true → 건너뜀");
    return rows;
  }

  if (!hasGemini && !hasOpenAi) {
    console.error("[aiReMatch] API 키 없음 → 건너뜀");
    return rows;
  }

  let result = [...rows];

  const lowConfidence = result.filter(
    (r) => r.food !== null && r.confidence < threshold,
  );
  if (lowConfidence.length > 0) {
    const suggestions = await askAiForMatches(
      lowConfidence.map((r) => r.query),
      database,
    );
    const suggMap = new Map(suggestions.map((s) => [s.query, s.suggestion]));
    result = result.map((row) => {
      if (row.food === null || row.confidence >= threshold) return row;
      return applyAiSuggestion(row, suggMap.get(row.query), database);
    });
  }

  const unmatched = result.filter((r) => r.food === null);
  console.error("[aiReMatch] DB 없음 재매칭 대상:", unmatched.map((r) => r.query));
  if (unmatched.length > 0) {
    const suggestions = await askAiForMatches(
      unmatched.map((r) => r.query),
      database,
      { unmatchedOnly: true },
    );
    console.error("[aiReMatch] DB 없음 AI 제안:", suggestions);
    const suggMap = new Map(suggestions.map((s) => [s.query, s.suggestion]));
    result = result.map((row) => {
      if (row.food !== null) return row;
      return applyAiSuggestion(row, suggMap.get(row.query), database);
    });
  }

  return result;
}
