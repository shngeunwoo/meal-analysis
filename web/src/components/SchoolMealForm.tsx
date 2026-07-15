"use client";

import {
  analyzeSchoolMealAction,
  searchSchoolsAction,
  type SchoolSearchState,
} from "@/app/neis-actions";
import { AnalyzeResults } from "@/components/AnalyzeResults";
import {
  SchoolMealHistory,
  SchoolSearchHistory,
} from "@/components/SearchHistory";
import { MEAL_LABEL } from "@/lib/analysis";
import { useUserHistory } from "@/lib/history/useUserHistory";
import type { SchoolMealEntry, SchoolSearchEntry } from "@/lib/history/userHistory";
import { NEIS_MEAL_OPTIONS } from "@/lib/neis/types";
import type { NeisSchool } from "@/lib/neis/types";
import { useSubmitCooldown } from "@/lib/useSubmitCooldown";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function schoolKey(s: NeisSchool): string {
  return `${s.atptOfcdcScCode}:${s.sdSchulCode}`;
}

type AnalyzeSubmitPayload = Omit<SchoolMealEntry, "id" | "usedAt">;

type SchoolMealFormProps = {
  embedded?: boolean;
};

export function SchoolMealForm({ embedded = false }: SchoolMealFormProps) {
  const [searchState, searchAction, searchPending] = useActionState(
    searchSchoolsAction,
    null as SchoolSearchState | null,
  );
  const [analyzeState, runAnalyze, analyzePending] = useActionState(
    analyzeSchoolMealAction,
    null,
  );
  const {
    history,
    recordSchoolSearch,
    recordSchoolMeal,
    deleteSchoolSearch,
    deleteSchoolMeal,
  } = useUserHistory();

  const lastSearchRef = useRef<{ query: string; region: string } | null>(null);
  const lastAnalyzeRef = useRef<AnalyzeSubmitPayload | null>(null);
  const searchCooldown = useSubmitCooldown();
  const analyzeCooldown = useSubmitCooldown();

  const [schoolQuery, setSchoolQuery] = useState("");
  const [region, setRegion] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [mlsvYmd, setMlsvYmd] = useState(todayYmd);
  const [mmealScCode, setMmealScCode] = useState("2");

  const schools = useMemo(
    () => (searchState?.ok ? searchState.schools : []),
    [searchState],
  );

  const selected = schools.find((s) => schoolKey(s) === selectedKey) ?? null;

  function runSearch(query: string, regionValue: string) {
    searchCooldown.tryRun(() => {
      const fd = new FormData();
      fd.set("schoolQuery", query);
      fd.set("region", regionValue);
      lastSearchRef.current = { query, region: regionValue };
      startTransition(() => {
        searchAction(fd);
      });
    });
  }

  function submitAnalyzePayload(payload: AnalyzeSubmitPayload) {
    analyzeCooldown.tryRun(() => {
      lastAnalyzeRef.current = payload;
      setMlsvYmd(payload.mlsvYmd);
      setMmealScCode(payload.mmealScCode);
      const fd = new FormData();
      fd.set("atptCode", payload.atptCode);
      fd.set("sdSchulCode", payload.sdSchulCode);
      fd.set("schoolName", payload.schoolName);
      fd.set("mlsvYmd", payload.mlsvYmd);
      fd.set("mmealScCode", payload.mmealScCode);
      startTransition(() => {
        runAnalyze(fd);
      });
    });
  }

  function submitAnalyze() {
    if (!selected) return;
    submitAnalyzePayload({
      atptCode: selected.atptOfcdcScCode,
      sdSchulCode: selected.sdSchulCode,
      schoolName: selected.schulNm,
      schoolKind: selected.schulKndScNm,
      location: selected.lctnScNm,
      mlsvYmd,
      mmealScCode,
      mealLabel: MEAL_LABEL[mmealScCode] ?? mmealScCode,
    });
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    runSearch(schoolQuery, region);
  }

  function handlePickSearch(item: SchoolSearchEntry) {
    setSchoolQuery(item.query);
    setRegion(item.region);
    runSearch(item.query, item.region);
  }

  function handlePickMeal(item: SchoolMealEntry) {
    submitAnalyzePayload(item);
  }

  useEffect(() => {
    if (!analyzeState?.ok) return;
    if (analyzeState.data.mealCode) {
      setMmealScCode(analyzeState.data.mealCode);
    }
    if (lastAnalyzeRef.current) {
      recordSchoolMeal(lastAnalyzeRef.current);
      lastAnalyzeRef.current = null;
    }
  }, [analyzeState, recordSchoolMeal]);

  useEffect(() => {
    if (searchState?.ok && lastSearchRef.current) {
      recordSchoolSearch(lastSearchRef.current.query, lastSearchRef.current.region);
      lastSearchRef.current = null;
    }
  }, [searchState, recordSchoolSearch]);

  useEffect(() => {
    if (schools.length > 0) {
      setSelectedKey(schoolKey(schools[0]));
    } else {
      setSelectedKey("");
    }
  }, [schools]);

  const content = (
    <>
      {!embedded && (
        <div>
          <h2 className="section-title">학교 급식</h2>
          <p className="section-desc">나이스에서 급식을 불러와 분석합니다.</p>
        </div>
      )}

      <SchoolMealHistory
        items={history.schoolMeals}
        onPick={handlePickMeal}
        onRemove={deleteSchoolMeal}
      />

      <SchoolSearchHistory
        items={history.schoolSearches}
        onPick={handlePickSearch}
        onRemove={deleteSchoolSearch}
      />

      <form onSubmit={handleSearchSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="schoolQuery" className="field-label">
              학교 이름
            </label>
            <input
              id="schoolQuery"
              name="schoolQuery"
              type="search"
              required
              minLength={2}
              value={schoolQuery}
              onChange={(e) => setSchoolQuery(e.target.value)}
              placeholder="예: 배재고, ○○초"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="region" className="field-label">
              지역 (선택)
            </label>
            <input
              id="region"
              name="region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="서울, 부산 등"
              className="input-field"
            />
          </div>
        </div>
        <button type="submit" disabled={searchPending} className="btn-secondary w-full sm:w-auto">
          {searchPending ? (
            <>
              <span className="spinner" />
              검색 중…
            </>
          ) : (
            "학교 검색"
          )}
        </button>
      </form>

      {searchCooldown.blockedSec > 0 && (
        <div role="status" className="alert-warn">
          검색 요청이 너무 빠릅니다. {searchCooldown.blockedSec}초 후 다시 시도해 주세요.
        </div>
      )}

      {searchState && !searchState.ok && (
        <div role="alert" className="alert-warn">
          {searchState.message}
        </div>
      )}

      {searchState?.ok && schools.length > 0 && (
        <div className="alert-success">{schools.length}개 학교를 찾았습니다.</div>
      )}

      <div className="space-y-4 border-t border-stone-200/80 pt-5 dark:border-stone-800">
        {schools.length > 0 ? (
          <div>
            <label htmlFor="schoolSelect" className="field-label">
              학교 선택
            </label>
            <select
              id="schoolSelect"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="input-field"
            >
              {schools.map((s) => (
                <option key={schoolKey(s)} value={schoolKey(s)}>
                  {s.schulNm} · {s.schulKndScNm} · {s.lctnScNm}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="empty-state">학교를 검색하면 목록이 표시됩니다.</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mlsvYmd" className="field-label">
              급식 날짜
            </label>
            <input
              id="mlsvYmd"
              name="mlsvYmd"
              type="date"
              value={mlsvYmd}
              onChange={(e) => setMlsvYmd(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="mmealScCode" className="field-label">
              끼니
            </label>
            <select
              id="mmealScCode"
              name="mmealScCode"
              value={mmealScCode}
              onChange={(e) => setMmealScCode(e.target.value)}
              className="input-field"
            >
              {NEIS_MEAL_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selected ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">
            선택:{" "}
            <span className="font-medium text-stone-900 dark:text-stone-100">
              {selected.schulNm}
            </span>
          </p>
        ) : null}

        <button
          type="button"
          disabled={analyzePending || !selected}
          onClick={submitAnalyze}
          className="btn-primary w-full"
        >
          {analyzePending ? (
            <>
              <span className="spinner-on-primary" />
              급식 불러오는 중…
            </>
          ) : (
            "급식 분석"
          )}
        </button>
      </div>

      {analyzeCooldown.blockedSec > 0 && (
        <div role="status" className="alert-warn">
          분석 요청이 너무 빠릅니다. {analyzeCooldown.blockedSec}초 후 다시 시도해 주세요.
        </div>
      )}

      {analyzePending && (
        <div className="alert-info flex items-center gap-3">
          <span className="spinner" />
          나이스에서 급식을 가져와 영양을 계산하고 있습니다…
        </div>
      )}

      {analyzeState && !analyzeState.ok && (
        <div role="alert" className="alert-warn">
          {analyzeState.message}
        </div>
      )}

      {analyzeState?.ok && <AnalyzeResults data={analyzeState.data} />}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return <section className="card space-y-6 p-6">{content}</section>;
}
