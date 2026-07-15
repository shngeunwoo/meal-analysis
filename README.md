# 식사 분석 AI (준비 완료 스캐폴드)

급식표·텍스트 기반 영양 분석 및 다음 식사 추천 웹 앱을 위한 저장소입니다.  
상세 기획·규칙은 [`식사분석AI-가이드.md`](./식사분석AI-가이드.md)를 따릅니다.

## 사전 요구

- **Node.js** 20 이상 (LTS 권장) — [nodejs.org](https://nodejs.org/)
- 패키지 매니저: npm (기본)

현재 PC에 Node가 없으면 위 링크에서 설치한 뒤 아래 명령을 실행합니다.

### Windows에서 Node·npm 설치

- **winget**(Windows 10/11 기본): 터미널에서  
  `winget install OpenJS.NodeJS.LTS --source winget --accept-package-agreements`  
  설치 후 **새 터미널**을 열면 `node`, `npm`이 PATH에 잡힙니다.  
  같은 창에서 바로 쓰려면:  
  `$env:Path = "C:\Program Files\nodejs;" + $env:Path`
- 설치 직후 `npm install`이 `node를 찾을 수 없습니다`로 실패하면, 위처럼 PATH에 `C:\Program Files\nodejs`가 들어갔는지 확인합니다.

### PowerShell에서 `npm`이 안 될 때

| 증상 | 해결 |
|------|------|
| `npm`을 찾을 수 없음 | `$env:Path = "C:\Program Files\nodejs;" + $env:Path` 후 **`npm.cmd`** 사용 |
| `npm.ps1` 실행 정책 오류 | `npm run dev` 대신 **`npm.cmd run dev`** 또는 아래 `dev.cmd` |

```powershell
cd web
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm.cmd install
npm.cmd run dev
```

또는 탐색기에서 `web\dev.cmd` 더블클릭(개발 서버 실행).

## 빠른 시작

```powershell
cd web
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 을 엽니다.

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run test` | Vitest 단위 테스트 |

## 폴더 구조 (요약)

```
meal-analysis-ai/
  식사분석AI-가이드.md   # 기획·매뉴얼·규칙
  AGENTS.md              # Cursor/에이전트용 요약
  .cursor/rules/         # 프로젝트 규칙 (.mdc)
  web/                   # Next.js 15 앱
    src/app/             # App Router UI
    src/lib/             # 추출·파싱·매칭·분석·추천
    fixtures/golden/     # 급식 샘플(골든 파일)용
```

## 환경 변수

- 예시: `web/.env.local.example` → 복사 후 `web/.env.local` 로 저장하고 값 입력.
- 루트 `.env.example` 참고 (OCR 등 공통 이름 정리용).

### AI로 음식명 자동 추출 (선택)

- `AI_API_KEY` + (선택) `AI_BASE_URL`, `AI_MODEL` — OpenAI 호환 Chat Completions 사용.
- `AI_DISABLED=true` 이면 규칙 기반(쉼표·줄바꿈)만 사용.
- 본인 API는 `web/src/lib/ai/override.ts` 의 `extractFoodNamesWithAiOverride` 에 `string[]` 반환 코드를 넣으면 **기본 OpenAI 호보다 우선**합니다.
- Gemini 키(형식이 `AIza...`)를 쓸 경우 `web/.env.local`에 `GEMINI_API_KEY`, (선택) `GEMINI_MODEL`을 넣으면 override가 자동 사용됩니다.

## 구현 상태 (1차+)

- **UI + Server Action**: 텍스트·파일 업로드 후 분석 (`AnalyzeForm`, `AnalyzeResults`).
- **추출**: 텍스트, PDF, 이미지 OCR.
- **매칭**: 유사도 + **신뢰도 70% 미만은 사용자 확인 후 합산** · `foods.json` 우선 매칭.
- **근거**: 매칭별 DB 출처·합산 기준 문구 표시.
- **골든 샘플**: `web/fixtures/golden/` + Vitest (`npm run test`).
- **영양 DB**: `foods.json` + 선택 `mfds-food.json`.

## 다음에 다듬을 것

- 파싱 결과 전체 편집 UI, MFDS 100g vs 1인분 단위 정합.
- 대용량 PDF·서버리스 타임아웃 시 청크/비동기 처리.
- 별칭 저장을 배포 환경 DB로 이전.

## 오픈 데이터 가져오기(임포트)

현재 앱의 기본 영양 DB는 `web/src/data/foods.json` 입니다.  
추가로 **USDA FoodData Central(Foundation Foods)** 공개 데이터를 내려받아 JSON으로 변환하는 스크립트를 넣어두었습니다.

```powershell
cd web
npm run data:import:usda:foundation
```

결과 파일: `web/src/data/usda-foundation.json`  
주의: 영문 데이터라 한국 급식명과 자동 매칭하려면 별칭/번역 테이블이 추가로 필요합니다.
