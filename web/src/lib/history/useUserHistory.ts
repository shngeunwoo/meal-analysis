"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addManualMeal,
  addSchoolMeal,
  addSchoolSearch,
  loadUserHistory,
  removeManualMeal,
  removeSchoolMeal,
  removeSchoolSearch,
  saveUserHistory,
  type ManualMealEntry,
  type SchoolMealEntry,
  type UserHistory,
} from "./userHistory";

export function useUserHistory() {
  const [history, setHistory] = useState<UserHistory>(() => loadUserHistory());

  useEffect(() => {
    setHistory(loadUserHistory());
  }, []);

  const persist = useCallback((updater: (prev: UserHistory) => UserHistory) => {
    setHistory((prev) => {
      const next = updater(prev);
      saveUserHistory(next);
      return next;
    });
  }, []);

  const recordSchoolSearch = useCallback(
    (query: string, region: string) => {
      persist((prev) => addSchoolSearch(prev, query, region));
    },
    [persist],
  );

  const recordSchoolMeal = useCallback(
    (entry: Omit<SchoolMealEntry, "id" | "usedAt">) => {
      persist((prev) => addSchoolMeal(prev, entry));
    },
    [persist],
  );

  const recordManualMeal = useCallback(
    (text: string, mealCode: string, mealLabel: string) => {
      persist((prev) => addManualMeal(prev, text, mealCode, mealLabel));
    },
    [persist],
  );

  const deleteSchoolSearch = useCallback(
    (id: string) => persist((prev) => removeSchoolSearch(prev, id)),
    [persist],
  );

  const deleteSchoolMeal = useCallback(
    (id: string) => persist((prev) => removeSchoolMeal(prev, id)),
    [persist],
  );

  const deleteManualMeal = useCallback(
    (id: string) => persist((prev) => removeManualMeal(prev, id)),
    [persist],
  );

  return {
    history,
    recordSchoolSearch,
    recordSchoolMeal,
    recordManualMeal,
    deleteSchoolSearch,
    deleteSchoolMeal,
    deleteManualMeal,
  };
}

export type { ManualMealEntry, SchoolMealEntry };
