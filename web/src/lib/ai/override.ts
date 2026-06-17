/**
 * 본인 AI API 코드를 여기에 넣으면 OpenAI 호환 호출보다 우선합니다.
 * `null`을 반환하면 기본(OpenAI 호환) 또는 규칙 기반으로 넘어갑니다.
 *
 * 예: 사내 게이트웨이, Gemini SDK, Azure 등
 */
export async function extractFoodNamesWithAiOverride(
  rawText: string,
): Promise<string[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Gemini API key는 코드에 하드코딩하지 말고 .env.local에만 둔다.
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt =
    "아래 텍스트는 급식표/식단 입력이다. 날짜/요일/알레르기/열량/원산지/표기 등은 무시하고 " +
    "음식명만 한국어 그대로 뽑아라. 반드시 JSON 한 개만 출력: {\"foods\":[\"음식1\",\"음식2\",...]}";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${prompt}\n\n[TEXT]\n${rawText.slice(0, 32000)}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as unknown;
    const foods = (parsed as { foods?: unknown }).foods;
    if (Array.isArray(foods)) {
      return foods.filter((x): x is string => typeof x === "string");
    }
    return null;
  } catch {
    return null;
  }
}
