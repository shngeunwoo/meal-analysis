"use server";

import { fetchNeisMeal, searchNeisSchools } from "@/lib/neis/client.server";
import { parseNeisDishNames } from "@/lib/neis/parseDishNames";
import type { NeisSchool } from "@/lib/neis/types";
import { enforceRateLimits } from "@/lib/rateLimit/server";
import { runMealAnalysis } from "@/lib/pipeline/runMealAnalysis";
import type { AnalyzeState } from "@/app/actions";

export type SchoolSearchState =
  | { ok: true; schools: NeisSchool[] }
  | { ok: false; message: string };

export async function searchSchoolsAction(
  _prev: SchoolSearchState | null,
  formData: FormData,
): Promise<SchoolSearchState> {
  const query = String(formData.get("schoolQuery") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();

  if (query.length < 2) {
    return { ok: false, message: "학교 이름을 2글자 이상 입력해 주세요." };
  }

  const limited = await enforceRateLimits("neis");
  if (!limited.allowed) {
    return { ok: false, message: limited.message };
  }

  try {
    let schools = await searchNeisSchools(query, region || undefined);
    if (schools.length === 0 && region) {
      schools = await searchNeisSchools(query);
    }
    if (schools.length === 0) {
      return {
        ok: false,
        message:
          "검색 결과가 없습니다. 학교 이름만 입력해 보세요. (지역은 ‘서울’처럼 짧게, 또는 비워 두기)",
      };
    }
    return { ok: true, schools };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "학교 검색에 실패했습니다.";
    return { ok: false, message: msg };
  }
}

export async function analyzeSchoolMealAction(
  _prev: AnalyzeState | null,
  formData: FormData,
): Promise<AnalyzeState> {
  const atptCode = String(formData.get("atptCode") ?? "").trim();
  const sdSchulCode = String(formData.get("sdSchulCode") ?? "").trim();
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const mlsvYmd = String(formData.get("mlsvYmd") ?? "").trim();
  const mmealScCode = String(formData.get("mmealScCode") ?? "2").trim();

  if (!atptCode || !sdSchulCode || !schoolName) {
    return { ok: false, message: "학교를 검색해서 선택해 주세요." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mlsvYmd)) {
    return { ok: false, message: "급식 날짜를 선택해 주세요." };
  }

  const limited = await enforceRateLimits("neis", "analyze", "ai");
  if (!limited.allowed) {
    return { ok: false, message: limited.message };
  }

  try {
    const row = await fetchNeisMeal(atptCode, sdSchulCode, mlsvYmd, mmealScCode);
    if (!row?.DDISH_NM) {
      return {
        ok: false,
        message:
          "해당 날짜·끼니에 급식 정보가 없습니다. (주말·방학·미제공일일 수 있습니다)",
      };
    }

    const candidates = parseNeisDishNames(row.DDISH_NM);
    if (candidates.length === 0) {
      return {
        ok: false,
        message: `급식 메뉴에서 음식명을 읽지 못했습니다. (원문: ${row.DDISH_NM.slice(0, 80)}…)`,
      };
    }

    const dateLabel = `${mlsvYmd} (${row.MMEAL_SC_NM ?? "급식"})`;

    const result = await runMealAnalysis(candidates, "neis", {
      neisMeal: {
        schoolName: row.SCHUL_NM || schoolName,
        date: mlsvYmd,
        mealName: row.MMEAL_SC_NM ?? "",
        calInfo: row.CAL_INFO,
        ntrInfo: row.NTR_INFO,
        source: "나이스 교육정보 개방 포털",
      },
      evidenceExtra: `입력: ${schoolName} ${dateLabel} 급식식단정보 · 메뉴 ${candidates.length}개`,
      mealCode: mmealScCode,
    });

    if (!result.ok) {
      return {
        ok: false,
        message: `${result.message} (인식된 메뉴: ${candidates.join(", ")})`,
      };
    }
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "급식 조회에 실패했습니다.";
    return { ok: false, message: msg };
  }
}
