import { AnalyzeForm } from "@/components/AnalyzeForm";
import { SchoolMealForm } from "@/components/SchoolMealForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">식사 분석 AI</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          학교 급식(나이스) 또는 직접 입력한 음식으로 영양을 추정하고, 부족한 부분을 바탕으로
          다음 끼니 아이디어를 제안합니다.{" "}
          <strong className="font-medium text-neutral-800 dark:text-neutral-200">
            참고용 정보
          </strong>
          이며 의료 진단을 대체하지 않습니다.
        </p>
      </header>

      <SchoolMealForm />

      <AnalyzeForm />

      <footer className="border-t border-neutral-200 pt-6 text-xs text-neutral-500 dark:border-neutral-800">
        영양 수치는 내부 DB 근사치이며, 실제 조리·섭취량과 다를 수 있습니다.
      </footer>
    </main>
  );
}
