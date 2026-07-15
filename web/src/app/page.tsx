import { AppShell } from "@/components/AppShell";

const FEATURES = [
  { icon: "🏫", label: "나이스 급식", tint: "from-sky-100 to-sky-50 text-sky-800" },
  { icon: "✏️", label: "직접 입력", tint: "from-brand-100 to-emerald-50 text-brand-800" },
  { icon: "📊", label: "영양 합산", tint: "from-warm-100 to-orange-50 text-warm-500" },
  { icon: "💡", label: "식사 추천", tint: "from-violet-100 to-purple-50 text-violet-800" },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="page-header">
        <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-12">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-emerald-500 text-2xl shadow-lg shadow-brand-500/30">
              🥗
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="badge-brand">영양 분석</span>
                <span className="badge-warm">참고용</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
                식사 분석
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
                급식표나 먹은 음식을 입력하면 영양을 추정하고, 부족한 영양소를 바탕으로 다음 끼니
                아이디어를 제안합니다.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {FEATURES.map(({ icon, label, tint }) => (
              <span
                key={label}
                className={`feature-chip bg-gradient-to-r ${tint} dark:from-stone-800 dark:to-stone-900 dark:text-stone-200`}
              >
                <span>{icon}</span>
                {label}
              </span>
            ))}
          </div>

          <p className="mt-5 text-xs text-stone-500 dark:text-stone-500">
            모든 결과는 참고용이며{" "}
            <span className="font-medium text-brand-700 dark:text-brand-400">
              의료 진단을 대체하지 않습니다.
            </span>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16 sm:px-6">
        <AppShell />

        <footer className="mt-10 rounded-xl border border-brand-100/80 bg-white/60 px-4 py-4 text-xs leading-relaxed text-stone-500 backdrop-blur-sm dark:border-brand-900/30 dark:bg-stone-900/40 dark:text-stone-500">
          <p>
            영양 수치는 내부 DB 근사치이며 실제 조리·섭취량과 다를 수 있습니다. 급식 데이터
            출처: 나이스 교육정보 개방 포털.
          </p>
        </footer>
      </main>
    </div>
  );
}
