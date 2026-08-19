# 갈까말까 AI

애매한 약속의 참석/거절을 관계·리소스·컨디션 기반으로 AI가 대신 판단해주고, 거절이 필요할 땐 문구까지 함께 제안하는 서비스.

- **서비스**: https://newhuman-project.vercel.app/
- **발표 슬라이드**: https://claude.ai/code/artifact/1d73b271-5efd-4061-a02a-05dd24f97417?org=8f70ca4e-3b76-4563-8e9b-119d8e6fd301

## 구성

- `index.html` — 서비스 프론트엔드
- `api/config.js` — Supabase/GA 설정값을 환경변수에서 읽어 내려주는 Vercel 서버리스 함수
- `api/generate-message.js` — OpenRouter 무료 모델로 상황별 거절 문구(normal/polite/casual)를 생성하는 서버리스 함수
- `supabase/schema.sql` — 이벤트·판단 로그 스키마 (`funnel_events`, `judgments`)
- `PRD_갈까말까AI.md` — 문제 정의 · 타겟 · 목표 · MVP 스펙
- `KPI_검증개선_가이드라인.md` — KPI 설정과 측정 기반 개선 프로세스 가이드

## 환경변수 (Vercel)

`api/config.js`, `api/generate-message.js` 주석 참고 — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GA_MEASUREMENT_ID`, `OPENROUTER_API_KEY`, (선택) `OPENROUTER_MODEL`, `PUBLIC_SITE_URL`. 모두 Vercel 프로젝트의 Environment Variables로 관리하며 코드에는 하드코딩하지 않는다.
