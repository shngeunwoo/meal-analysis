export type NeisSchool = {
  atptOfcdcScCode: string;
  atptOfcdcScNm: string;
  sdSchulCode: string;
  schulNm: string;
  schulKndScNm: string;
  lctnScNm: string;
};

export type NeisMealRow = {
  ATPT_OFCDC_SC_CODE: string;
  ATPT_OFCDC_SC_NM: string;
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;
  MMEAL_SC_CODE: string;
  MMEAL_SC_NM: string;
  MLSV_YMD: string;
  DDISH_NM: string;
  CAL_INFO?: string;
  NTR_INFO?: string;
  ORPLC_INFO?: string;
};

export type NeisMealSummary = {
  schoolName: string;
  date: string;
  mealCode: string;
  mealName: string;
  dishNames: string[];
  calInfo?: string;
  ntrInfo?: string;
};

/** 1=조식, 2=중식, 3=석식, 4=간식 */
export const NEIS_MEAL_OPTIONS = [
  { code: "1", label: "조식" },
  { code: "2", label: "중식" },
  { code: "3", label: "석식" },
  { code: "4", label: "간식" },
] as const;
