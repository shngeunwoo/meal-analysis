"use server";

import { getFoods } from "@/data/getFoods.server";
import { extractFoodNamesWithAi } from "@/lib/ai/extractFoods";
import { buildFoodCandidates } from "@/lib/parse";
import { runMealAnalysis, type MealAnalysisPayload } from "@/lib/pipeline/runMealAnalysis";
import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";

export type AnalyzeResultPayload = MealAnalysisPayload;

export type AnalyzeState =
  | { ok: true; data: AnalyzeResultPayload }
  | { ok: false; message: string };

export async function analyzeMealAction(
  _prev: AnalyzeState | null,
  formData: FormData,
): Promise<AnalyzeState> {
  const userText = String(formData.get("text") ?? "").trim();
  const mealCode = String(formData.get("mealCode") ?? "").trim() || undefined;

  const ai = await extractFoodNamesWithAi(userText);

  let candidates: string[] = [];
  let extractionSource: AnalyzeResultPayload["extractionSource"] = "rules";

  if (ai.foods.length > 0) {
    candidates = ai.foods;
    extractionSource = ai.source === "override" ? "ai_override" : "ai_openai";
  } else {
    candidates = buildFoodCandidates(userText);
    extractionSource = "rules";
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      message: "먹은 음식을 입력해 주세요.",
    };
  }

  const mealLabel: Record<string, string> = { "1": "조식", "2": "중식", "3": "석식", "4": "간식" };
  return await runMealAnalysis(candidates, extractionSource, {
    evidenceExtra: `입력: 직접 입력 텍스트${mealCode ? ` · ${mealLabel[mealCode] ?? ""}` : ""}`,
    mealCode,
  });
}

export type AliasState =
  | { ok: true; message: string }
  | { ok: false; message: string };

async function persistAlias(query: string, foodId: string): Promise<AliasState> {
  if (!query || !foodId) {
    return { ok: false, message: "별칭 또는 대상 음식이 비어 있습니다." };
  }

  const aliasPath = path.join(process.cwd(), "src", "data", "user-aliases.json");

  try {
    const foods = await getFoods();
    const target = foods.find((f) => f.id === foodId);
    if (!target) return { ok: false, message: "대상 음식을 찾지 못했습니다." };

    // { "아로니아쥬스": "MFDS_ID", ... }
    let map: Record<string, string> = {};
    try {
      const raw = await fs.readFile(aliasPath, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        map = parsed as Record<string, string>;
      }
    } catch {
      map = {};
    }

    map[query] = foodId;
    await fs.writeFile(aliasPath, JSON.stringify(map, null, 2) + "\n", "utf-8");
    revalidatePath("/");
    return { ok: true, message: `저장됨: "${query}" → ${target.name}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "저장 실패";
    return { ok: false, message: `저장에 실패했습니다: ${msg}` };
  }
}

export async function addAliasAction(
  _prev: AliasState | null,
  formData: FormData,
): Promise<AliasState> {
  const query = String(formData.get("query") ?? "").trim();
  const foodId = String(formData.get("foodId") ?? "").trim();
  return await persistAlias(query, foodId);
}

export async function addAliasFormAction(formData: FormData): Promise<void> {
  const query = String(formData.get("query") ?? "").trim();
  const foodId = String(formData.get("foodId") ?? "").trim();
  await persistAlias(query, foodId);
}
