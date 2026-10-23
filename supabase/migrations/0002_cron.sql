-- Recordatorios push cada 15 minutos con pg_cron + pg_net.
--
-- 1) Habilitá pg_cron y pg_net desde Database > Extensions en Supabase
--    (o descomentá las dos líneas de abajo).
-- 2) Cargá la URL pública y el secreto:
--      insert into public.app_config (key, value)
--      values ('app_url', 'https://tu-app.vercel.app'),
--             ('cron_secret', 'el-mismo-CRON_SECRET-de-Vercel')
--      on conflict (key) do update set value = excluded.value;
-- 3) Ejecutá esta migración. El job llama a /api/cron/reminders.
--
-- El endpoint manda recordatorios de 24 h y 2 h, y registra cada envío en
-- notification_log para no duplicar.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.ping_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_url text;
  v_secret text;
begin
  select value into v_app_url from public.app_config where key = 'app_url';
  select value into v_secret from public.app_config where key = 'cron_secret';

  if coalesce(v_app_url, '') = '' or coalesce(v_secret, '') = '' then
    raise notice 'ping_reminders: faltan app_url/cron_secret en app_config';
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_app_url, '/') || '/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
end;
$$;

revoke all on function public.ping_reminders() from public;
grant execute on function public.ping_reminders() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('que-sale-reminders')
      where exists (
        select 1 from cron.job where jobname = 'que-sale-reminders'
      );
    exception when others then
      null;
    end;

    perform cron.schedule(
      'que-sale-reminders',
      '*/15 * * * *',
      'select public.ping_reminders();'
    );
  end if;
end;
$$;
