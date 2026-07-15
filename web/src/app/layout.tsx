import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
});

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
    <html lang="ko" className={notoSansKr.variable}>
      <body className="min-h-screen font-sans antialiased selection:bg-brand-200/60 selection:text-stone-900 dark:selection:bg-brand-900/50 dark:selection:text-stone-50">
        {children}
      </body>
    </html>
  );
}