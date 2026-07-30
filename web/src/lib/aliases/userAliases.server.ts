import "server-only";

import { cookies } from "next/headers";

const COOKIE_NAME = "meal_user_aliases";
const MAX_ENTRIES = 80;
const MAX_AGE_SEC = 60 * 60 * 24 * 365;

export type UserAliasMap = Record<string, string>;

function parseAliasMap(raw: string | undefined): UserAliasMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: UserAliasMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === "string" && k.trim() && typeof v === "string" && v.trim()) {
        out[k.trim()] = v.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** 사용자 수동 매핑(메뉴명 → foodId). Vercel에서는 파일 쓰기가 불가해 쿠키로 유지한다. */
export async function getUserAliasMap(): Promise<UserAliasMap> {
  const jar = await cookies();
  return parseAliasMap(jar.get(COOKIE_NAME)?.value);
}

export async function upsertUserAlias(
  query: string,
  foodId: string,
): Promise<UserAliasMap> {
  const q = query.trim();
  const id = foodId.trim();
  if (!q || !id) return await getUserAliasMap();

  const map = await getUserAliasMap();
  map[q] = id;

  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) {
      delete map[key];
    }
  }

  const jar = await cookies();
  jar.set(COOKIE_NAME, JSON.stringify(map), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });

  return map;
}
