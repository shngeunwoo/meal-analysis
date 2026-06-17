"use client";

import {
  analyzeSchoolMealAction,
  searchSchoolsAction,
  type SchoolSearchState,
} from "@/app/neis-actions";
import { AnalyzeResults } from "@/components/AnalyzeResults";
import { NEIS_MEAL_OPTIONS } from "@/lib/neis/types";
import type { NeisSchool } from "@/lib/neis/types";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
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

export function SchoolMealForm() {
  const [searchState, searchAction, searchPending] = useActionState(
    searchSchoolsAction,
    null as SchoolSearchState | null,
  );
  const [analyzeState, runAnalyze, analyzePending] = useActionState(
    analyzeSchoolMealAction,
    null,
  );

  function submitAnalyze() {
    if (!selected) return;
    const fd = new FormData();
    fd.set("atptCode", selected.atptOfcdcScCode);
    fd.set("sdSchulCode", selected.sdSchulCode);
    fd.set("schoolName", selected.schulNm);
    fd.set("mlsvYmd", mlsvYmd);
    fd.set("mmealScCode", mmealScCode);
    startTransition(() => {
      runAnalyze(fd);
    });
  }

  const schools = useMemo(
    () => (searchState?.ok ? searchState.schools : []),
    [searchState],
  );

  const [selectedKey, setSelectedKey] = useState("");
  const [mlsvYmd, setMlsvYmd] = useState(todayYmd);
  const [mmealScCode, setMmealScCode] = useState("2");

  const selected = schools.find((s) => schoolKey(s) === selectedKey) ?? null;

  useEffect(() => {
    if (schools.length > 0) {
      setSelectedKey(schoolKey(schools[0]));
    } else {
      setSelectedKey("");
    }
  }, [schools]);

  return (
    <div className="space-y-6 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
      <div>
        <h2 className="text-lg font-semibold">학교 급식 (나이스)</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          학교를 검색해 날짜·끼니별 급식을 불러온 뒤 영양을 분석합니다. 데이터 출처:
          나이스 교육정보 개방 포털.
        </p>
      </div>

      <form action={searchAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="schoolQuery" className="mb-1 block text-sm font-medium">
              학교 이름
            </label>
            <input
              id="schoolQuery"
              name="schoolQuery"
              type="search"
              required
              minLength={2}
              placeholder="예: 배재고, ○○초"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>
          <div>
            <label htmlFor="region" className="mb-1 block text-sm font-medium">
              지역 (선택)
            </label>
            <input
              id="region"
              name="region"
              type="text"
              placeholder="비워 두거나 서울, 부산"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={searchPending}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          {searchPending ? "검색 중…" : "학교 검색"}
        </button>
      </form>

      {searchState && !searchState.ok && (
        <p role="alert" className="text-sm text-amber-800 dark:text-amber-200">
          {searchState.message}
        </p>
      )}

      {searchState?.ok && schools.length > 0 && (
        <p className="text-sm text-green-800 dark:text-green-200">
          {schools.length}개 학교를 찾았습니다. 아래에서 선택하세요.
        </p>
      )}

      <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        {schools.length > 0 ? (
          <div>
            <label htmlFor="schoolSelect" className="mb-1 block text-sm font-medium">
              학교 선택
            </label>
            <select
              id="schoolSelect"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            >
              {schools.map((s) => (
                <option key={schoolKey(s)} value={schoolKey(s)}>
                  {s.schulNm} · {s.schulKndScNm} · {s.lctnScNm}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            학교 검색 후 목록이 여기에 표시됩니다.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="mlsvYmd" className="mb-1 block text-sm font-medium">
              급식 날짜
            </label>
            <input
              id="mlsvYmd"
              name="mlsvYmd"
              type="date"
              value={mlsvYmd}
              onChange={(e) => setMlsvYmd(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>
          <div>
            <label htmlFor="mmealScCode" className="mb-1 block text-sm font-medium">
              끼니
            </label>
            <select
              id="mmealScCode"
              name="mmealScCode"
              value={mmealScCode}
              onChange={(e) => setMmealScCode(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
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
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            선택: <strong>{selected.schulNm}</strong>
          </p>
        ) : null}

        <button
          type="button"
          disabled={analyzePending || !selected}
          onClick={submitAnalyze}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {analyzePending ? "급식 불러오는 중… (잠시만요)" : "급식 불러와 분석하기"}
        </button>
      </div>

      {analyzePending && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          나이스에서 급식을 가져와 영양을 계산하고 있습니다…
        </p>
      )}

      {analyzeState && !analyzeState.ok && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        >
          {analyzeState.message}
        </div>
      )}

      {analyzeState?.ok && <AnalyzeResults data={analyzeState.data} />}
    </div>
  );
}
