"use client";

import { analyzeMealAction, type AnalyzeState } from "@/app/actions";
import { AnalyzeResults } from "@/components/AnalyzeResults";
import { useActionState } from "react";
import { useState } from "react";

export function AnalyzeForm() {
  const initial: AnalyzeState | null = null;
  const [state, formAction, isPending] = useActionState(analyzeMealAction, initial);
  const [mealCode, setMealCode] = useState<string>("2");

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-4">
        <div className="flex gap-2">
          {[
            { code: "1", label: "조식" },
            { code: "2", label: "중식" },
            { code: "3", label: "석식" },
            { code: "4", label: "간식" },
          ].map(({ code, label }) => (
            <label key={code} className="flex items-center gap-1 cursor-pointer text-sm">
              <input
                type="radio"
                name="mealCode"
                value={code}
                checked={mealCode === code}
                onChange={() => setMealCode(code)}
                className="accent-neutral-800 dark:accent-neutral-100"
              />
              {label}
            </label>
          ))}
        </div>
        <div>
          <label htmlFor="text" className="mb-1 block text-sm font-medium">
            먹은 음식 (직접 입력)
          </label>
          <textarea
            id="text"
            name="text"
            rows={5}
            placeholder={`예: 백미밥, 김치찌개, 불고기\n또는 급식 메뉴만 한 줄씩 적어도 됩니다.`}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {isPending ? "분석 중…" : "영양 분석하기"}
        </button>
      </form>

      {state && !state.ok && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          {state.message}
        </div>
      )}

      {state && state.ok && <AnalyzeResults data={state.data} />}
    </div>
  );
}
