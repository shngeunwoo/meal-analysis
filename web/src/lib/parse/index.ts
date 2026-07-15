/**
 * 추출 텍스트에서 음식 후보 문자열을 만든다.
 */

function cleanChunk(s: string): string {
  return s
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/^\*\s*/, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/kcal|Kcal|열량/gi, "")
    .replace(/^\d{1,2}[\/\-]\d{1,2}/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function dedupeCaseInsensitive(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = x.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

/** 줄 단위 분리 (테스트·단순 파이프라인용) */
export function parseMenuLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * 쉼표·슬래시·불릿·줄바꿈 기준으로 토큰화하고 노이즈를 제거한다.
 */
export function splitMenuTokens(raw: string): string[] {
  const text = raw.replace(/\r/g, "\n").replace(/[·•]/g, ",");
  const chunks = text.split(/[\n,\/]+/);
  const out: string[] = [];
  for (const chunk of chunks) {
    const cleaned = cleanChunk(chunk);
    if (cleaned.length >= 1) out.push(cleaned);
  }
  return dedupeCaseInsensitive(out);
}

/** 음식명 후보 목록에서 중복·너무 짧은 항목 제거 */
export function dedupeFoodNames(names: string[]): string[] {
  return dedupeCaseInsensitive(
    names.map((s) => s.trim()).filter((s) => s.length >= 1),
  );
}

/** 사용자 입력 텍스트에서 음식명 후보 토큰 목록을 만든다. */
export function buildFoodCandidates(userText: string): string[] {
  return splitMenuTokens(userText.trim());
}
