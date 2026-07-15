# 식사 분석 AI — 에이전트 참고

## 프로젝트 루트

- `식사분석AI-가이드.md`: 기획·매뉴얼·규칙·참고 (단일 소스).
- `web/`: Next.js 15 앱 (TypeScript, Tailwind, Vitest).

## 실행 (Node 설치 후)

```bash
cd web
npm install
npm run dev
```

- 린트: `npm run lint`
- 테스트: `npm run test`

## 도메인 코드 위치

| 단계 | 디렉터리 |
|------|----------|
| 텍스트 추출 | `web/src/lib/extract/server.ts` (서버 전용) |
| 메뉴 파싱 | `web/src/lib/parse/` |
| DB 매칭 | `web/src/lib/match/` |
| 영양 합산·부족 | `web/src/lib/analysis/` |
| 추천 | `web/src/lib/recommend/` |
| 서버 액션 | `web/src/app/actions.ts` |

`web/fixtures/golden/`에 샘플 급식 입력·기대 결과를 저장한다.
