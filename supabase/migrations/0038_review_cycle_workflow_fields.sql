-- The review-cycle UI and service already write/read these workflow fields.
alter table public.review_cycles
  add column if not exists status text not null default 'UPCOMING',
  add column if not exists active_competencies jsonb not null default '[]'::jsonb;

alter table public.review_cycles
  drop constraint if exists review_cycles_status_check;

alter table public.review_cycles
  add constraint review_cycles_status_check
  check (status in ('UPCOMING', 'OPEN', 'CLOSED', 'ARCHIVED'));