import "server-only";

import fallbackFoods from "@/data/foods.json";
import type { FoodItem } from "@/types";
import fs from "node:fs/promises";
import path from "node:path";

let cache: FoodItem[] | null = null;

/** 음식 DB가 바뀐 뒤 호출 */
export function invalidateFoodsCache(): void {
  cache = null;
}

/**
 * fallback(foods.json)을 코어 DB로 사용.
 * MFDS에서 못 찾은 항목을 여기서 찾는다.
 */
export function getCoreFoods(): FoodItem[] {
  return fallbackFoods as FoodItem[];
}

async function loadMfds(): Promise<FoodItem[]> {
  const p = path.join(process.cwd(), "src", "data", "mfds-food.json");
  try {
    const raw = await fs.readFile(p, "utf-8");
    const list = JSON.parse(raw) as FoodItem[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * MFDS DB를 메인으로 로드한다.
 * matchFoods()는 coreDatabase(foods.json)를 먼저 탐색하고,
 * 없으면 이 database(MFDS)에서 찾는다.
 */
export async function getFoods(): Promise<FoodItem[]> {
  if (cache) return cache;
  cache = await loadMfds();
  return cache;
}

