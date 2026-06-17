import { describe, it, expect } from "vitest";

/** client.server.ts와 동일한 파싱 규칙 */
function extractNeisRows<T extends Record<string, string>>(
  blocks: Array<{ head?: unknown[]; row?: T[] }>,
): T[] {
  const rows: T[] = [];
  for (const block of blocks) {
    if (block.row?.length) rows.push(...block.row);
  }
  return rows;
}

describe("NEIS 응답 파싱", () => {
  it("row 블록이 분리돼 있어도 row를 모은다", () => {
    const blocks = [
      { head: [{ list_total_count: 1 }, { RESULT: { CODE: "INFO-000" } }] },
      {
        row: [{ SCHUL_NM: "테스트초", SD_SCHUL_CODE: "1" } as Record<string, string>],
      },
    ];
    const rows = extractNeisRows(blocks);
    expect(rows).toHaveLength(1);
    expect(rows[0].SCHUL_NM).toBe("테스트초");
  });
});
