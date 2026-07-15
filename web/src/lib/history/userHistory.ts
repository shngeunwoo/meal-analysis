export type SchoolSearchEntry = {
  id: string;
  query: string;
  region: string;
  usedAt: string;
};

export type SchoolMealEntry = {
  id: string;
  atptCode: string;
  sdSchulCode: string;
  schoolName: string;
  schoolKind: string;
  location: string;
  mlsvYmd: string;
  mmealScCode: string;
  mealLabel: string;
  usedAt: string;
};

export type ManualMealEntry = {
  id: string;
  text: string;
  mealCode: string;
  mealLabel: string;
  usedAt: string;
};

export type UserHistory = {
  schoolSearches: SchoolSearchEntry[];
  schoolMeals: SchoolMealEntry[];
  manualMeals: ManualMealEntry[];
};

export const HISTORY_STORAGE_KEY = "meal-analysis-ai:user-history:v1";
export const MAX_HISTORY_ITEMS = 12;

export const EMPTY_USER_HISTORY: UserHistory = {
  schoolSearches: [],
  schoolMeals: [],
  manualMeals: [],
};

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function dedupePrepend<T extends { id: string }>(
  list: T[],
  item: T,
  key: (x: T) => string,
  max: number,
): T[] {
  const k = key(item);
  const rest = list.filter((x) => key(x) !== k);
  return [item, ...rest].slice(0, max);
}

export function parseUserHistory(raw: string | null): UserHistory {
  if (!raw) return { ...EMPTY_USER_HISTORY };
  try {
    const parsed = JSON.parse(raw) as Partial<UserHistory>;
    return {
      schoolSearches: Array.isArray(parsed.schoolSearches)
        ? parsed.schoolSearches
        : [],
      schoolMeals: Array.isArray(parsed.schoolMeals) ? parsed.schoolMeals : [],
      manualMeals: Array.isArray(parsed.manualMeals) ? parsed.manualMeals : [],
    };
  } catch {
    return { ...EMPTY_USER_HISTORY };
  }
}

export function serializeUserHistory(history: UserHistory): string {
  return JSON.stringify(history);
}

export function addSchoolSearch(
  history: UserHistory,
  query: string,
  region: string,
): UserHistory {
  const trimmed = query.trim();
  if (trimmed.length < 2) return history;
  const entry: SchoolSearchEntry = {
    id: makeId(),
    query: trimmed,
    region: region.trim(),
    usedAt: nowIso(),
  };
  return {
    ...history,
    schoolSearches: dedupePrepend(
      history.schoolSearches,
      entry,
      (x) => `${x.query}\0${x.region}`,
      MAX_HISTORY_ITEMS,
    ),
  };
}

export function addSchoolMeal(
  history: UserHistory,
  entry: Omit<SchoolMealEntry, "id" | "usedAt">,
): UserHistory {
  const item: SchoolMealEntry = {
    ...entry,
    id: makeId(),
    usedAt: nowIso(),
  };
  return {
    ...history,
    schoolMeals: dedupePrepend(
      history.schoolMeals,
      item,
      (x) =>
        `${x.atptCode}:${x.sdSchulCode}:${x.mlsvYmd}:${x.mmealScCode}`,
      MAX_HISTORY_ITEMS,
    ),
  };
}

export function addManualMeal(
  history: UserHistory,
  text: string,
  mealCode: string,
  mealLabel: string,
): UserHistory {
  const trimmed = text.trim();
  if (!trimmed) return history;
  const item: ManualMealEntry = {
    id: makeId(),
    text: trimmed,
    mealCode,
    mealLabel,
    usedAt: nowIso(),
  };
  return {
    ...history,
    manualMeals: dedupePrepend(
      history.manualMeals,
      item,
      (x) => `${x.text}\0${x.mealCode}`,
      MAX_HISTORY_ITEMS,
    ),
  };
}

export function removeSchoolSearch(history: UserHistory, id: string): UserHistory {
  return {
    ...history,
    schoolSearches: history.schoolSearches.filter((x) => x.id !== id),
  };
}

export function removeSchoolMeal(history: UserHistory, id: string): UserHistory {
  return {
    ...history,
    schoolMeals: history.schoolMeals.filter((x) => x.id !== id),
  };
}

export function removeManualMeal(history: UserHistory, id: string): UserHistory {
  return {
    ...history,
    manualMeals: history.manualMeals.filter((x) => x.id !== id),
  };
}

export function loadUserHistory(): UserHistory {
  if (typeof window === "undefined") return { ...EMPTY_USER_HISTORY };
  return parseUserHistory(window.localStorage.getItem(HISTORY_STORAGE_KEY));
}

export function saveUserHistory(history: UserHistory): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, serializeUserHistory(history));
}
