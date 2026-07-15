import "server-only";

import { dedupeFoodNames } from "@/lib/parse";
import { extractFoodNamesOpenAiCompatible } from "@/lib/ai/openaiCompatible";
import { extractFoodNamesWithAiOverride } from "@/lib/ai/override";

export type AiExtractionSource = "override" | "openai" | "none";

export type AiExtractionResult = {
  foods: string[];
  source: AiExtractionSource;
};

/**
 * 1) override.ts 사용자 코드
 * 2) AI_API_KEY + OpenAI 호환 엔드포인트
 * 둘 다 실패하면 foods 빈 배열 → 호출부에서 규칙 기반 파싱 사용
 */
export async function extractFoodNamesWithAi(rawText: string): Promise<AiExtractionResult> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { foods: [], source: "none" };
  }

  if (process.env.AI_DISABLED === "1" || process.env.AI_DISABLED === "true") {
    return { foods: [], source: "none" };
  }

  const fromOverride = await extractFoodNamesWithAiOverride(trimmed);
  if (fromOverride && fromOverride.length > 0) {
    return { foods: dedupeFoodNames(fromOverride), source: "override" };
  }

  if (process.env.AI_API_KEY) {
    try {
      const foods = await extractFoodNamesOpenAiCompatible(trimmed);
      if (foods.length > 0) {
        return { foods: dedupeFoodNames(foods), source: "openai" };
      }
    } catch {
      return { foods: [], source: "none" };
    }
  }

  return { foods: [], source: "none" };
}
