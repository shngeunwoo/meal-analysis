"use client";

import { analyzeMealAction, type AnalyzeState } from "@/app/actions";
import { AnalyzeResults } from "@/components/AnalyzeResults";
import { ManualMealHistory } from "@/components/SearchHistory";
import { MEAL_LABEL } from "@/lib/analysis";
import { useUserHistory } from "@/lib/history/useUserHistory";
import type { ManualMealEntry } from "@/lib/history/userHistory";
import { useSubmitCooldown } from "@/lib/useSubmitCooldown";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

const MEAL_OPTIONS = [
  { code: "1", label: "조식", icon: "🌅" },
  { code: "2", label: "중식", icon: "☀️" },
  { code: "3", label: "석식", icon: "🌙" },
  { code: "4", label: "간식", icon: "🍎" },
] as const;

type AnalyzeFormProps = {
  embedded?: boolean;
};

export function AnalyzeForm({ embedded = false }: AnalyzeFormProps) {
  const initial: AnalyzeState | null = null;
  const [state, formAction, isPending] = useActionState(analyzeMealAction, initial);
  const [mealCode, setMealCode] = useState<string>("2");
  const [text, setText] = useState("");
  const { history, recordManualMeal, deleteManualMeal } = useUserHistory();
  const lastSubmitRef = useRef<{ text: string; mealCode: string } | null>(null);
  const { tryRun, blockedSec } = useSubmitCooldown();

  useEffect(() => {
    if (state?.ok && state.data.mealCode) {
      setMealCode(state.data.mealCode);
    }
    if (state?.ok && lastSubmitRef.current) {
      const { text: savedText, mealCode: savedMeal } = lastSubmitRef.current;
      recordManualMeal(savedText, savedMeal, MEAL_LABEL[savedMeal] ?? savedMeal);
      lastSubmitRef.current = null;
    }
  }, [state, recordManualMeal]);

  function submitText(value: string, code: string) {
    tryRun(() => {
      lastSubmitRef.current = { text: value, mealCode: code };
      setText(value);
      setMealCode(code);
      const fd = new FormData();
      fd.set("text", value);
      fd.set("mealCode", code);
      startTransition(() => {
        formAction(fd);
      });
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitText(text, mealCode);
  }

  function handlePickHistory(item: ManualMealEntry) {
    submitText(item.text, item.mealCode);
  }

  const content = (
    <>
      {!embedded && (
        <div>
          <h2 className="section-title">직접 입력</h2>
          <p className="section-desc">먹은 음식을 자유 형식으로 입력하세요.</p>
        </div>
      )}

      <ManualMealHistory
        items={history.manualMeals}
        onPick={handlePickHistory}
        onRemove={deleteManualMeal}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="mealCode" value={mealCode} readOnly />

        <div>
          <p className="field-label">끼니</p>
          <div className="flex flex-wrap gap-2">
            {MEAL_OPTIONS.map(({ code, label, icon }) => (
              <button
                key={code}
                type="button"
                onClick={() => setMealCode(code)}
                className={`meal-pill inline-flex items-center gap-1.5 ${
                  mealCode === code ? "meal-pill-active" : ""
                }`}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="text" className="field-label">
            먹은 음식
          </label>
          <textarea
            id="text"
            name="text"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`백미밥, 김치찌개, 불고기\n쉼표나 줄바꿈으로 구분해도 됩니다.`}
            className="input-field resize-y"
          />
        </div>

        <button type="submit" disabled={isPending || !text.trim()} className="btn-primary w-full">
          {isPending ? (
            <>
              <span className="spinner-on-primary" />
              분석 중…
            </>
          ) : (
            "영양 분석"
          )}
        </button>
      </form>

      {blockedSec > 0 && (
        <div role="status" className="alert-warn">
          잠시 후 다시 시도해 주세요. ({blockedSec}초)
        </div>
      )}

      {state && !state.ok && (
        <div role="alert" className="alert-warn">
          {state.message}
        </div>
      )}

      {state?.ok && <AnalyzeResults data={state.data} />}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return <section className="card space-y-6 p-6">{content}</section>;
}
