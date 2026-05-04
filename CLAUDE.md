# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

KBrain-AX는 AI·데이터 전문인재 선발 통합 플랫폼이다. 기존에 분리 운영되던 서면평가(evalu-lens)와 온라인 시험(aicapa.kr)을 하나의 웹 플랫폼으로 통합한다. 자세한 배경·문제 의식은 `README.md`와 `기존운영_분석_및_인수요구사항.md` 참고. 200명+ 동시 응시 환경에서의 안정성이 핵심 설계 제약이다.

## 디렉터리 구성 (3-tier)

```
frontend/    Next.js 14 App Router (UI 전체)
backend/     FastAPI — Supabase 게이트웨이 + 자동 채점
ai-service/  FastAPI — Claude API 기반 루브릭 채점 (포트 8001)
load-test/   k6 시나리오
```

`frontend → backend → ai-service` 단방향 호출. Frontend는 Supabase에 직접 인증·일부 조회를 하기도 한다(`@/lib/supabase`).

## 개발 명령

### Frontend (`frontend/`)

```bash
npm run dev      # rm -rf .next && next dev (포트 3000)
npm run build    # next build
npm run start    # 프로덕션 서버
npm run lint     # next lint
```

타입 체크는 빌드에 포함된다 (`tsconfig.json`의 `noEmit: true`, `strict: true`). 별도 단위 테스트는 없다.

### Backend (`backend/`) — uv 가상환경

```bash
cd backend
uv venv && uv pip install -r requirements.txt   # 최초 1회
uv run uvicorn main:app --reload --port 8000
```

### AI Service (`ai-service/`) — uv 가상환경

```bash
cd ai-service
uv venv && uv pip install -r requirements.txt   # 최초 1회
uv run uvicorn main:app --reload --port 8001
```

`.venv/`는 각 서비스 폴더에 격리된다. 시스템 파이썬에 직접 설치하지 않는다.

### 부하 테스트

```bash
k6 run --env BACKEND_URL=... --env SUPABASE_URL=... \
       --env SUPABASE_ANON_KEY=... --env EXAM_ID=... \
       load-test/exam_load_test.js
```

기본 시나리오: 2분에 걸쳐 200 VU 램프업 → 시험 진행 → 1분 종료. SLA: p95 < 3s, 에러율 < 1%.

## 아키텍처 핵심

### 인증 흐름

- 인증은 Supabase Auth + Google OAuth. 프런트엔드가 access token을 들고 백엔드를 호출하면, 백엔드는 토큰을 `sb.auth.get_user(token)`으로 검증하고 `profiles.role`을 조회해 `admin`/`applicant`을 구분한다.
- 백엔드는 `SUPABASE_SERVICE_ROLE_KEY`로 동작하므로 RLS를 우회한다 — 모든 권한 검사는 라우터 코드에서 직접 한다 (예: `routers/applications.py`의 owner/admin 분기). 새 라우터를 추가할 때 이 패턴을 그대로 따른다.
- 최초 로그인 시 `app/profile/setup/`에서 실명을 받아 `profiles`에 채운다. 사이드바 등 표시 이름은 `profiles.full_name` 우선.

### 시험 응시 시스템 (가장 무거운 도메인)

`frontend/app/exam/[id]/page.tsx`가 단일 페이지로 다음을 모두 관리한다:

- **Phase**: `loading → waiting → taking → submitted` 상태 머신
- **대기실**: 환경 점검(웹캠/마이크/화면), 유의사항, 보안 서약. `MediaPipe Tasks Vision`(`@mediapipe/tasks-vision`)으로 얼굴 검출.
- **타이머**: 클라이언트 카운트다운이 아니라 **서버 시작 시각 기준 경과시간**으로 계산해야 한다 (기존 시스템 장애 원인이었던 브라우저 스로틀링 회피). 변경 시 이 원칙을 깨지 않도록 주의.
- **자동저장**: 30초 주기로 `PUT /exams/attempts/{id}/autosave`. 더 짧은 주기는 DB 포화를 일으켰던 원인이므로 변경 금지.
- **부정행위 감지**: 탭 전환·웹캠/마이크 차단 등을 클라이언트가 누적해 제출 시 일괄 로그.
- **에디터**: 코딩 문항은 `@monaco-editor/react`(dynamic import, SSR 비활성).

자동 채점은 백엔드(`backend/routers/exams.py`의 `submit_exam_direct`)에서 `객관식`/`OX`/`단답형`만 처리한다. `서술형`/`코딩`은 수동 채점 표기로 두고 점수에서 제외한다 — 신규 타입 추가 시 동일 규약을 따른다.

### 서면평가 (AI 루브릭 채점)

호출 체인: `Frontend → POST /evaluations/ (backend) → POST /evaluate (ai-service) → Anthropic Claude`.

- 루브릭은 `ai-service/rubrics/*.yaml`에 선언적으로 정의(`ax_training.yaml` 기본). 신규 루브릭은 파일 추가만으로 노출된다.
- AI 서비스 파이프라인 (`ai-service/main.py`):
  1. `rubric_loader.load_rubric` + `validate_rubric`
  2. `blind_processor.mask_pii` — 이름·대학·연락처 등 마스킹 (`config.yaml`의 `blind.mask_patterns`로 정의)
  3. `evaluator.evaluate` — Claude 호출, 일관성 검증을 위해 다회 호출(`consistency_default_runs: 3`)
  4. `feedback_generator.generate_feedback` — 강점/개선/후속질문 생성
- 모델·토큰·동시성·재시도 정책은 모두 `ai-service/config.yaml` 한 곳에서 관리. 코드에 하드코딩하지 않는다.

### Supabase 스키마 (운영 DB)

테이블: `profiles`, `selections`, `applications`, `evaluations`, `exams`, `exam_questions`, `question_bank`, `exam_attempts`. ERD나 마이그레이션 파일은 레포에 없다 (Supabase 대시보드에서 관리). 스키마 변경이 필요하면 사용자에게 확인하고 진행한다.

## 환경변수

3개 서비스가 각자 `.env`/`.env.local`을 가진다. `.env.example` 참조.

- `frontend/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL`
- `backend/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_SERVICE_URL`, `FRONTEND_URL`
- `ai-service/.env`: `ANTHROPIC_API_KEY`

## 코딩 규약

- 한국어 우선. 식별자·UI 문구·에러 메시지·커밋 메시지·라우트 의미 모두 한국어를 그대로 둔다 (예: `q_type == "객관식"`, `detail="관리자 권한 필요"`).
- TypeScript path alias `@/*` (frontend 루트 기준).
- UI는 `shadcn/ui` + Tailwind. 새 컴포넌트는 `frontend/components/ui/`의 기존 패턴을 따른다 (`components.json` 설정).
- 다크 모드는 비활성(`enableSystem={false}`, `defaultTheme="light"`).
- 백엔드 라우터: `prefix=...`, `tags=[...]` 명시. Supabase 클라이언트는 함수마다 `get_supabase()`로 생성 (모듈 전역 캐싱 X).
