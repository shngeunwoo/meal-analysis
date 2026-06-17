/** 도메인 공통 타입 (구현 시 확장) */

export type NutrientId =
  | "energy_kcal"
  | "protein_g"
  | "fat_g"
  | "carb_g"
  | "sodium_mg"
  | "fiber_g";

export interface NutrientMap {
  [key: string]: number | undefined;
}

export interface FoodItem {
  id: string;
  name: string;
  /** 매칭용 별칭(오타·짧은 이름) */
  aliases?: string[];
  /** 1인분(또는 급식 1그릇) 기준 근사치 */
  nutrientsPerServing: NutrientMap;
  /** 선택: 출처/단위 등 메타데이터 */
  meta?: Record<string, unknown>;
}

export interface FoodMatchRow {
  query: string;
  food: FoodItem | null;
  /** 0~1 */
  confidence: number;
  /** 신뢰도가 낮아 사용자 확인 전에는 합산에서 제외 */
  needsConfirmation?: boolean;
  /** AI 재매칭으로 교체된 항목 */
  aiMatched?: boolean;
}

export interface AnalysisInput {
  /** 사용자가 입력한 원문 또는 파싱된 음식명 목록 */
  foodNames: string[];
  /** 추후: 섭취량, 끼니, 사용자 프로필 */
  meta?: Record<string, unknown>;
}
