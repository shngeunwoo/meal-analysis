import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Noto Sans KR 은 브라우저에서 Google Fonts 로 불러온다.
 * next/font/google 은 빌드 때 한글 서브셋 파일 수백 개를 내려받는데,
 * 하나라도 실패하면 Vercel 빌드가 module-not-found 로 깨진다.
 */
const NOTO_SANS_KR_CSS =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap";

export const metadata: Metadata = {
  title: "식사 분석",
  description: "급식표·텍스트 기반 영양 분석 및 식사 추천 (참고용)",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4fbf6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a120e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={NOTO_SANS_KR_CSS} />
      </head>
      <body className="min-h-screen font-sans antialiased selection:bg-brand-200/60 selection:text-stone-900 dark:selection:bg-brand-900/50 dark:selection:text-stone-50">
        {children}
      </body>
    </html>
  );
}