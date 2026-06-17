import "server-only";

function stripMarkdownFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "");
    t = t.replace(/\s*```$/i, "");
  }
  return t.trim();
}

function parseFoodsJson(content: string): string[] {
  const raw = stripMarkdownFence(content);
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "foods" in parsed &&
    Array.isArray((parsed as { foods: unknown }).foods)
  ) {
    return (parsed as { foods: unknown[] }).foods.filter(
      (x): x is string => typeof x === "string",
    );
  }
  return [];
}

/**
 * OpenAI 호환 Chat Completions (POST .../chat/completions)
 */
export async function extractFoodNamesOpenAiCompatible(rawText: string): Promise<string[]> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return [];

  const base = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  const url = `${base}/chat/completions`;

  const system =
    "너는 한국 학교 급식표·식단 텍스트에서 음식 이름만 뽑는 도우미다. " +
    "날짜, 요일, 열량, 알레르기 표기 등은 무시하고 음식명만 배열에 넣는다. " +
    '반드시 JSON 한 개만 출력한다: {"foods":["음식1","음식2",...]}';

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: rawText.slice(0, 32000) },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AI API 오류 ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  return parseFoodsJson(content);
}
