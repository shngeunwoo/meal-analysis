import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "식사 분석 AI",
  description: "급식표·텍스트 기반 영양 분석 및 식사 추천 (참고용)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
