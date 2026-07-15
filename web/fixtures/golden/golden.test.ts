import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { FOODS } from "@/data/foods";
import { AUTO_CONFIRM_CONFIDENCE, matchFoods } from "@/lib/match";
import { buildFoodCandidates } from "@/lib/parse";
import { computeMealAnalysis } from "@/lib/pipeline/computeMealAnalysis";

const GOLDEN_ROOT = join(process.cwd(), "fixtures", "golden");

type GoldenExpected = {
  candidates: string[];
  matches: { query: string; foodId: string; minConfidence?: number }[];
  needsConfirmation?: string[];
};

function loadCase(name: string) {
  const dir = join(GOLDEN_ROOT, name);
  const input = readFileSync(join(dir, "input.txt"), "utf-8");
  const expected = JSON.parse(
    readFileSync(join(dir, "expected.json"), "utf-8"),
  ) as GoldenExpected;
  return { input, expected };
}

describe("golden fixtures", () => {
  it("typical-lunch: 파싱·매칭", () => {
    const { input, expected } = loadCase("typical-lunch");
    const candidates = buildFoodCandidates(input);
    expect(candidates).toEqual(expected.candidates);

    const rows = matchFoods(candidates, FOODS, FOODS);
    for (const exp of expected.matches) {
      const row = rows.find((r) => r.query === exp.query);
      expect(row?.food?.id, exp.query).toBe(exp.foodId);
      expect(row?.confidence ?? 0).toBeGreaterThanOrEqual(
        exp.minConfidence ?? 0.38,
      );
      expect(row?.confidence ?? 0).toBeGreaterThanOrEqual(AUTO_CONFIRM_CONFIDENCE);
    }

    const analysis = computeMealAnalysis(rows, new Set(), FOODS);
    expect(analysis.includedCount).toBe(3);
    expect(analysis.pendingConfirmationCount).toBe(0);
  });

});
