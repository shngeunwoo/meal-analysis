import type { FoodItem } from "@/types";

/** 매칭·영양 수치 옆에 짧게 보여 줄 DB 근거 */
export function foodEvidenceLine(food: FoodItem | null | undefined): string | null {
  if (!food) return null;

  const meta = food.meta;
  if (!meta || typeof meta !== "object") {
    return "내부 DB(1인분 근사)";
  }

  const parts: string[] = [];
  const source = meta.source;
  if (typeof source === "string" && source) parts.push(source);

  const basis = meta.basis;
  if (typeof basis === "string" && basis) {
    parts.push(basis === "100g" ? "100g 기준" : basis);
  } else {
    parts.push("1인분 근사");
  }

  const date = meta["기준일자"];
  if (typeof date === "string" && date) parts.push(`기준 ${date}`);

  return parts.length > 0 ? parts.join(" · ") : "내부 DB";
}
