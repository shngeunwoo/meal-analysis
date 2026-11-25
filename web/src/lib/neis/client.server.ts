import "server-only";

import type { NeisMealRow, NeisSchool } from "./types";

const NEIS_BASE = "https://open.neis.go.kr/hub";

type NeisResult = { CODE: string; MESSAGE: string };

type NeisHead = { list_total_count?: number } | { RESULT: NeisResult };

function getNeisApiKey(): string {
  const key = process.env.NEIS_API_KEY?.trim();
  if (!key) {
    const hint =
      process.env.NEXT_PUBLIC_APP_NAME &&
      /^[a-f0-9]{32}$/i.test(process.env.NEXT_PUBLIC_APP_NAME.trim())
        ? " 인증키가 NEXT_PUBLIC_APP_NAME에 들어가 있으면 NEIS_API_KEY로 옮기세요."
        : "";
    throw new Error(
      `NEIS_API_KEY가 없습니다. web/.env.local에 NEIS_API_KEY=인증키 형태로 넣고 개발 서버를 재시작하세요.${hint}`,
    );
  }
  return key;
}

function parseHead(
  head: NeisHead[] | undefined,
): { total: number; code: string; message: string } {
  let total = 0;
  let code = "";
  let message = "";
  for (const h of head ?? []) {
    if ("list_total_count" in h) total = h.list_total_count ?? 0;
    if ("RESULT" in h) {
      code = h.RESULT.CODE;
      message = h.RESULT.MESSAGE;
    }
  }
  return { total, code, message };
}

async function neisGet<T extends Record<string, string>>(
  endpoint: string,
  params: Record<string, string | number | undefined>,
): Promise<{ rows: T[]; total: number }> {
  const url = new URL(`${NEIS_BASE}/${endpoint}`);
  url.searchParams.set("KEY", getNeisApiKey());
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", "1");
  url.searchParams.set("pSize", "100");

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`나이스 API 오류 (HTTP ${res.status})`);
  }

  const data = (await res.json()) as Record<string, unknown> & {
    RESULT?: NeisResult;
  };

  if (data.RESULT?.CODE?.startsWith("ERROR")) {
    throw new Error(data.RESULT.MESSAGE || `나이스 API: ${data.RESULT.CODE}`);
  }

  /** NEIS는 [{ head }, { row }] 처럼 head·row를 분리한 객체 배열로 준다. */
  const blocks =
    (data[endpoint] as Array<{ head?: NeisHead[]; row?: T[] }> | undefined) ??
    [];
  let head: NeisHead[] | undefined;
  const rows: T[] = [];
  for (const block of blocks) {
    if (block.head) head = block.head;
    if (block.row?.length) rows.push(...block.row);
  }

  const { total, code, message } = parseHead(head);

  if (code === "INFO-200") {
    return { rows: [], total: 0 };
  }
  if (code && !code.startsWith("INFO")) {
    throw new Error(message || `나이스 API: ${code}`);
  }

  return { rows, total: total || rows.length };
}

export async function searchNeisSchools(
  schulNm: string,
  lctnScNm?: string,
): Promise<NeisSchool[]> {
  const q = schulNm.trim();
  if (q.length < 2) return [];

  const { rows } = await neisGet<{
    ATPT_OFCDC_SC_CODE: string;
    ATPT_OFCDC_SC_NM: string;
    SD_SCHUL_CODE: string;
    SCHUL_NM: string;
    SCHUL_KND_SC_NM: string;
    LCTN_SC_NM: string;
  }>("schoolInfo", {
    SCHUL_NM: q,
    LCTN_SC_NM: lctnScNm?.trim() || undefined,
  });

  return rows.map((r) => ({
    atptOfcdcScCode: r.ATPT_OFCDC_SC_CODE,
    atptOfcdcScNm: r.ATPT_OFCDC_SC_NM,
    sdSchulCode: r.SD_SCHUL_CODE,
    schulNm: r.SCHUL_NM,
    schulKndScNm: r.SCHUL_KND_SC_NM,
    lctnScNm: r.LCTN_SC_NM,
  }));
}

export async function fetchNeisMeal(
  atptCode: string,
  sdSchulCode: string,
  mlsvYmd: string,
  mmealScCode: string,
): Promise<NeisMealRow | null> {
  const { rows } = await neisGet<NeisMealRow>("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: atptCode,
    SD_SCHUL_CODE: sdSchulCode,
    MLSV_YMD: mlsvYmd.replace(/-/g, ""),
    MMEAL_SC_CODE: mmealScCode,
  });

  return rows[0] ?? null;
}

/** 해당 날짜의 모든 끼니 (조식·중식·석식…) */
export async function fetchNeisMealsForDate(
  atptCode: string,
  sdSchulCode: string,
  mlsvYmd: string,
): Promise<NeisMealRow[]> {
  const { rows } = await neisGet<NeisMealRow>("mealServiceDietInfo", {
    ATPT_OFCDC_SC_CODE: atptCode,
    SD_SCHUL_CODE: sdSchulCode,
    MLSV_YMD: mlsvYmd.replace(/-/g, ""),
  });
  return rows;
}
