-- Set app.cron_secret globally
SELECT set_config('app.cron_secret', 'yjcGrWhT7IrolOcFLq4jFdTX0GdhqGDr+OcpG/JMs9k=', false);

-- Set search path
SET search_path TO public, extensions, cron;

-- ============================================================
-- auto_close_sessions — every 5 min (offset to :03)
-- ============================================================
SELECT cron.schedule(
  'auto-close-sessions',
  '3-59/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dawiaauzphzbgslbsbua.supabase.co/functions/v1/cron-auto-close-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer yjcGrWhT7IrolOcFLq4jFdTX0GdhqGDr+OcpG/JMs9k='
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- auto_expire_trials — daily midnight UTC
-- ============================================================
SELECT cron.schedule(
  'auto-expire-trials',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dawiaauzphzbgslbsbua.supabase.co/functions/v1/cron-expire-trials',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer yjcGrWhT7IrolOcFLq4jFdTX0GdhqGDr+OcpG/JMs9k='
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- auto_absent_check — every minute
-- ============================================================
SELECT cron.schedule(
  'auto-absent-check',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dawiaauzphzbgslbsbua.supabase.co/functions/v1/cron-auto-absent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer yjcGrWhT7IrolOcFLq4jFdTX0GdhqGDr+OcpG/JMs9k='
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- daily_attendance_report — daily 11 PM UTC
-- ============================================================
SELECT cron.schedule(
  'daily-attendance-report',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dawiaauzphzbgslbsbua.supabase.co/functions/v1/cron-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer yjcGrWhT7IrolOcFLq4jFdTX0GdhqGDr+OcpG/JMs9k='
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- attendance_reminders — every 5 min (offset to :03)
-- ============================================================
SELECT cron.schedule(
  'attendance-reminders',
  '3-59/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dawiaauzphzbgslbsbua.supabase.co/functions/v1/cron-attendance-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer yjcGrWhT7IrolOcFLq4jFdTX0GdhqGDr+OcpG/JMs9k='
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- review_cycle_transition — daily midnight UTC
-- ============================================================
SELECT cron.schedule(
  'review-cycle-transition',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dawiaauzphzbgslbsbua.supabase.co/functions/v1/cron-review-transitions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer yjcGrWhT7IrolOcFLq4jFdTX0GdhqGDr+OcpG/JMs9k='
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- push_checkin_reminder — every minute
-- ============================================================
SELECT cron.schedule(
  'push-checkin-reminder',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dawiaauzphzbgslbsbua.supabase.co/functions/v1/cron-push-checkin-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer yjcGrWhT7IrolOcFLq4jFdTX0GdhqGDr+OcpG/JMs9k='
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- demo_reset — daily midnight UTC
-- ============================================================
SELECT cron.schedule(
  'demo-reset',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dawiaauzphzbgslbsbua.supabase.co/functions/v1/demo-reset',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer yjcGrWhT7IrolOcFLq4jFdTX0GdhqGDr+OcpG/JMs9k='
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verification des taches enregistrees
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;