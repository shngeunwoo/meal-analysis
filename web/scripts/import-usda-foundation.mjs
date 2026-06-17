import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

/**
 * USDA FoodData Central Foundation Foods CSV ZIP을 다운로드해
 * 우리 형식(`src/data/usda-foundation.json`)으로 변환한다.
 *
 * 라이선스/출처: USDA FoodData Central (공개 데이터)
 *
 * 주의: 영문 데이터라 한국 급식명 매칭은 별칭/번역이 필요.
 */

const OUT_PATH = path.join(process.cwd(), "src", "data", "usda-foundation.json");

const NUTRIENT_IDS = {
  energy_kcal: 1008, // Energy (kcal)
  protein_g: 1003, // Protein
  fat_g: 1004, // Total lipid (fat)
  carb_g: 1005, // Carbohydrate, by difference
  fiber_g: 1079, // Fiber, total dietary
  sodium_mg: 1093, // Sodium, Na
};

function pickLatestFoundationZipName(html) {
  // 예: FoodData_Central_foundation_food_csv_2025-12-18.zip
  const re = /FoodData_Central_foundation_food_csv_\d{4}-\d{2}-\d{2}\.zip/g;
  const matches = html.match(re) ?? [];
  matches.sort(); // 날짜 문자열이라 정렬로 최신이 뒤로 감
  return matches[matches.length - 1] ?? null;
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status} ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

function parseCsv(buf) {
  return parse(buf, {
    columns: true,
    skip_empty_lines: true,
  });
}

function main() {
  const base = "https://fdc.nal.usda.gov/fdc-datasets/";
  const indexUrl = "https://fdc.nal.usda.gov/download-datasets";

  console.log("USDA 다운로드 페이지 확인 중...");
  return download(indexUrl)
    .then((buf) => buf.toString("utf-8"))
    .then(async (html) => {
      const zipName = pickLatestFoundationZipName(html);
      if (!zipName) {
        throw new Error("Foundation Foods ZIP 파일명을 찾지 못했습니다.");
      }
      const zipUrl = `${base}${zipName}`;
      console.log("다운로드:", zipUrl);
      const zipBuf = await download(zipUrl);

      const zip = new AdmZip(zipBuf);
      const foodEntry = zip.getEntry("food.csv");
      const nutrientEntry = zip.getEntry("food_nutrient.csv");

      if (!foodEntry || !nutrientEntry) {
        throw new Error("ZIP 안에서 food.csv / food_nutrient.csv를 찾지 못했습니다.");
      }

      console.log("CSV 파싱 중...");
      const foods = parseCsv(foodEntry.getData());
      const foodNutrients = parseCsv(nutrientEntry.getData());

      // fdc_id -> 이름
      const idToName = new Map();
      for (const row of foods) {
        const id = Number(row.fdc_id);
        const desc = String(row.description ?? "").trim();
        if (Number.isFinite(id) && desc) idToName.set(id, desc);
      }

      // fdc_id별 주요 영양소 수집
      const idToNutrients = new Map();
      for (const row of foodNutrients) {
        const fdcId = Number(row.fdc_id);
        const nutrientId = Number(row.nutrient_id);
        const amount = Number(row.amount);
        if (!Number.isFinite(fdcId) || !Number.isFinite(nutrientId) || !Number.isFinite(amount)) continue;

        const bucket = idToNutrients.get(fdcId) ?? {};
        if (nutrientId === NUTRIENT_IDS.energy_kcal) bucket.energy_kcal = amount;
        if (nutrientId === NUTRIENT_IDS.protein_g) bucket.protein_g = amount;
        if (nutrientId === NUTRIENT_IDS.fat_g) bucket.fat_g = amount;
        if (nutrientId === NUTRIENT_IDS.carb_g) bucket.carb_g = amount;
        if (nutrientId === NUTRIENT_IDS.fiber_g) bucket.fiber_g = amount;
        if (nutrientId === NUTRIENT_IDS.sodium_mg) bucket.sodium_mg = amount;
        idToNutrients.set(fdcId, bucket);
      }

      const out = [];
      for (const [fdcId, name] of idToName.entries()) {
        const n = idToNutrients.get(fdcId);
        if (!n) continue;
        out.push({
          id: `usda_fdc_${fdcId}`,
          name,
          aliases: [],
          // USDA 값은 보통 100g 기준.
          nutrientsPerServing: n,
          meta: { source: "USDA FoodData Central - Foundation Foods", basis: "per_100g" },
        });
      }

      out.sort((a, b) => a.name.localeCompare(b.name));
      fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
      fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf-8");
      console.log("완료:", OUT_PATH, `(items: ${out.length})`);
    });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

