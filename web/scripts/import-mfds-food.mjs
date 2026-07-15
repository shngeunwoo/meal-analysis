import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

/**
 * 식품의약품안전처_통합식품영양성분정보(음식) CSV → 우리 형식 JSON 변환
 *
 * 사용:
 *   node scripts/import-mfds-food.mjs "C:\path\file.csv"
 * 또는
 *   npm run data:import:mfds -- "C:\path\file.csv"
 *
 * 출력:
 *   src/data/mfds-food.json
 */

const OUT_PATH = path.join(process.cwd(), "src", "data", "mfds-food.json");

function toNumber(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function safeStr(v) {
  return String(v ?? "").trim();
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("CSV 경로를 인자로 넘겨주세요.");
    process.exit(1);
  }
  if (!fs.existsSync(inputPath)) {
    console.error("파일을 찾지 못했습니다:", inputPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true });

  // 일부 CSV는 첫 컬럼 헤더에 BOM(﻿)이 붙음: "﻿식품코드"
  const FOOD_CODE_KEY = rows.length && Object.prototype.hasOwnProperty.call(rows[0], "﻿식품코드")
    ? "﻿식품코드"
    : "식품코드";

  const out = [];
  for (const r of rows) {
    const id = safeStr(r[FOOD_CODE_KEY]);
    const name = safeStr(r["식품명"]);
    if (!id || !name) continue;

    const basis = safeStr(r["영양성분함량기준량"]); // 예: 100g, 100ml

    const energy = toNumber(r["에너지(kcal)"]);
    const protein = toNumber(r["단백질(g)"]);
    const fat = toNumber(r["지방(g)"]);
    const carb = toNumber(r["탄수화물(g)"]);
    const fiber = toNumber(r["식이섬유(g)"]);
    const sodium = toNumber(r["나트륨(mg)"]);

    // 최소한의 핵심 영양소가 하나도 없으면 제외
    if (
      energy === undefined &&
      protein === undefined &&
      fat === undefined &&
      carb === undefined &&
      fiber === undefined &&
      sodium === undefined
    ) {
      continue;
    }

    out.push({
      id,
      name,
      aliases: [],
      nutrientsPerServing: {
        ...(energy !== undefined ? { energy_kcal: energy } : {}),
        ...(protein !== undefined ? { protein_g: protein } : {}),
        ...(fat !== undefined ? { fat_g: fat } : {}),
        ...(carb !== undefined ? { carb_g: carb } : {}),
        ...(fiber !== undefined ? { fiber_g: fiber } : {}),
        ...(sodium !== undefined ? { sodium_mg: sodium } : {}),
      },
      meta: {
        source: safeStr(r["출처명"]) || "식품의약품안전처",
        categoryLarge: safeStr(r["식품대분류명"]),
        categoryMid: safeStr(r["식품중분류명"]),
        origin: safeStr(r["식품기원명"]),
        basis,
        dataType: safeStr(r["데이터구분명"]),
        기준일자: safeStr(r["데이터기준일자"]),
      },
    });
  }

  out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf-8");
  console.log("완료:", OUT_PATH, `(items: ${out.length})`);
}

main();

