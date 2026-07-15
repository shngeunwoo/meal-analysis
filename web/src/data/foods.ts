import type { FoodItem } from "@/types";
import foodsJson from "./foods.json";

/**
 * 로컬 영양 DB(근사치). 자동 임포트/확장을 위해 JSON으로 관리한다.
 */
export const FOODS = foodsJson as FoodItem[];
