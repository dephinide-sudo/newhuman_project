-- Supabase SQL Editor에 그대로 붙여넣어 실행하세요.
-- 기존 테이블/데이터를 지우고 완전히 새로 만든다 (재실행해도 안전하도록 idempotent).
drop table if exists funnel_events;
drop table if exists judgments;

-- 판단이 완료된 순간(result_view)의 입력값+결과값 원본
create table judgments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,          -- 브라우저 세션당 crypto.randomUUID() 1개, funnel_events와 연결 키
  relation text not null,            -- close | ambiguous | work
  nextchance text not null,          -- yes | no
  time_hours smallint not null,
  cost_manwon smallint not null,
  condition smallint not null,
  recipient_name text,               -- nullable, 원문 그대로
  outcome text not null,             -- attend | decline
  confidence smallint not null,
  score smallint not null,           -- clamp 이전 내부 스코어 (룰 튜닝용 진단값)
  top_factors jsonb not null         -- [{ "key": "...", "weight": 16 }, ...]
);

-- 퍼널 4단계 + 날짜별 사용량을 위한 이벤트 로그 (GA 이벤트와 1:1 대응)
create table funnel_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  event_type text not null,          -- form_submit | result_view | copy_message | feedback_click
  judgment_id uuid references judgments(id),  -- form_submit 시점엔 null, 이후 채워짐
  event_detail jsonb                 -- copy_message: {tone}, feedback_click: {rating} 등
);

alter table judgments enable row level security;
alter table funnel_events enable row level security;

create policy "anon can insert judgments" on judgments
  for insert to anon with check (true);
create policy "anon can insert funnel_events" on funnel_events
  for insert to anon with check (true);
-- select/update/delete 정책을 만들지 않으면 anon 키는 기본적으로 읽기/수정 전부 차단됨


-- ============ 분석용 예시 쿼리 (SQL Editor에서 그대로 실행) ============

-- 날짜별 서비스 사용량 (일별 입력 제출 수)
-- select date_trunc('day', created_at) as day, count(*) as submits
-- from funnel_events
-- where event_type = 'form_submit'
-- group by 1 order by 1;

-- 클릭 퍼널 (단계별 순유입 사용자 수)
-- select event_type, count(distinct session_id) as users
-- from funnel_events
-- group by event_type
-- order by case event_type
--   when 'form_submit' then 1 when 'result_view' then 2
--   when 'copy_message' then 3 when 'feedback_click' then 4 end;

-- 피드백-입력값 상관 분석 (어떤 조합에서 부정 피드백이 많은지)
-- select j.relation, j.nextchance, fe.event_detail->>'rating' as rating, count(*)
-- from funnel_events fe
-- join judgments j on j.id = fe.judgment_id
-- where fe.event_type = 'feedback_click'
-- group by 1, 2, 3
-- order by count(*) desc;
