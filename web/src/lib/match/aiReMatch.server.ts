import "server-only";

import type { FoodItem, FoodMatchRow } from "@/types";
import { stringSimilarity, MIN_MATCH_CONFIDENCE, AUTO_CONFIRM_CONFIDENCE } from "@/lib/match";

/** AI가 반환하는 후보 형태 */
type AiMatchCandidate = { query: string; suggestion: string };

/**
 * AI에게 food DB 이름 목록을 보여주고,
 * 저신뢰도 쿼리들에 대해 "가장 가까운 DB 항목 이름"을 한 번에 제안받는다.
 */
async function askAiForMatches(
  queries: string[],
  dbNames: string[],
): Promise<AiMatchCandidate[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey || queries.length === 0 || dbNames.length === 0) return [];

  // 쿼리별로 문자 유사도 상위 30개씩 추려서 전달 (토큰 절약)
  const topN = 30;
  const seen = new Set<string>();
  for (const q of queries) {
    const qn = q.replace(/\s+/g, "").toLowerCase();
    const scored = dbNames.map((name) => {
      const nn = name.replace(/\s+/g, "").toLowerCase();
      // 공통 글자 수 / 최대 길이
      let common = 0;
      for (const ch of qn) if (nn.includes(ch)) common++;
      return { name, score: common / Math.max(qn.length, nn.length) };
    });
    scored.sort((a, b) => b.score - a.score);
    scored.slice(0, topN).forEach((s) => seen.add(s.name));
  }
  const dbSample = Array.from(seen).join(", ");

  const prompt =
    "아래 [DB 목록]에서 각 [입력 음식명]과 가장 의미가 가까운 항목 이름을 골라라. " +
    "반드시 DB 목록에 있는 이름만 써야 한다. 적당한 것이 없으면 null. " +
    '반드시 JSON 객체 하나만 출력: {"matches":[{"query":"입력명","suggestion":"DB이름 또는 null"},...]}';


  const userContent =
    `[입력 음식명]\n${queries.join(", ")}\n\n[DB 목록]\n${dbSample}`;

  console.error("[aiReMatch] askAiForMatches 호출 queries:", queries);

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

    // JSON 파싱: {"matches":[...]} 또는 배열 모두 처리
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
 * AI가 제안한 이름으로 DB를 재탐색해 더 높은 신뢰도가 나오면 교체한다.
 *
 * @param rows       matchFoods() 결과
 * @param database   전체 FoodItem DB
 * @param threshold  이 값 미만의 신뢰도만 AI 재매칭 대상 (기본 0.9)
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

  // 재시도 대상: food가 있고 신뢰도 < threshold, 또는 food가 null(DB 없음)
  const targets = rows.filter(
    (r) => r.food === null || r.confidence < threshold,
  );
  console.error("[aiReMatch] 재매칭 대상:", targets.map((r) => r.query));
  if (targets.length === 0) return rows;

  const queries = targets.map((r) => r.query);
  const dbNames = database.map((f) => f.name);
  const suggestions = await askAiForMatches(queries, dbNames);
  console.error("[aiReMatch] AI 제안 결과:", suggestions);
  if (suggestions.length === 0) return rows;

  // 제안 맵 빌드
  const suggMap = new Map(suggestions.map((s) => [s.query, s.suggestion]));

  return rows.map((row) => {
    if (row.food !== null && row.confidence >= threshold) return row;

    const suggestion = suggMap.get(row.query);
    if (!suggestion || suggestion === "null") return row;

    // DB에서 제안 이름으로 재탐색 (exact match 우선, 그 다음 부분 포함)
    const matched =
      database.find((f) => f.name === suggestion) ??
      database.find((f) => (f.aliases ?? []).includes(suggestion)) ??
      database.find((f) =>
        f.name.includes(suggestion) || suggestion.includes(f.name),
      );
    if (!matched) return row;

    // AI가 의미적으로 선택한 항목이므로 신뢰도 비교 없이 교체한다.
    // 표시용 confidence는 문자열 유사도 대신 고정값(0.85)을 부여해
    // 사용자 확인 없이 합산에 포함되도록 한다.
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
  });
}
