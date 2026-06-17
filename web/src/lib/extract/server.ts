import "server-only";

export async function extractTextFromBuffer(
  mimeType: string,
  buffer: ArrayBuffer,
): Promise<string> {
  const buf = Buffer.from(buffer);

  if (mimeType.startsWith("text/")) {
    return buf.toString("utf-8");
  }

  if (mimeType === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buf);
    return typeof data.text === "string" ? data.text : "";
  }

  if (mimeType.startsWith("image/")) {
    const Tesseract = (await import("tesseract.js")).default;
    const {
      data: { text },
    } = await Tesseract.recognize(buf, "kor+eng", {
      logger: () => undefined,
    });
    return text ?? "";
  }

  throw new Error("지원하지 않는 파일 형식입니다. (텍스트, PDF, 이미지)");
}
