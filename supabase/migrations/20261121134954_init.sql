-- ViewNow · migration inicial
-- Tabelas de vídeos e de log de sincronização, com RLS negando tudo para anon/authenticated.
-- A API acessa com a secret key (papel service_role), que ignora o RLS.

create extension if not exists pgcrypto with schema extensions;

-- Regra 6: dados internos fora da API pública (schema não exposto no Data API)
create schema if not exists internal;
revoke all on schema internal from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.videos (
  id             uuid primary key default extensions.gen_random_uuid(),
  youtube_id     text not null unique check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  playlist_id    text not null,
  title          text not null,
  description    text not null default '',
  thumbnail_url  text,
  channel_title  text,
  position       integer not null,
  published_at   timestamptz,
  visible        boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column public.videos.visible is 'Curadoria manual: false esconde o vídeo sem apagá-lo. A sync nunca altera esta coluna.';

create index videos_playlist_visible_position_idx
  on public.videos (playlist_id, visible, position);

create table internal.sync_runs (
  id              bigint generated always as identity primary key,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null check (status in ('success', 'error')),
  videos_fetched  integer not null default 0,
  videos_removed  integer not null default 0,
  trigger         text not null default 'manual' check (trigger in ('manual', 'cron', 'cli')),
  error           text
);

-- ---------------------------------------------------------------------------
-- updated_at automático (Regra 3: search_path fixo)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Regra 1: RLS em todas as tabelas, com políticas explícitas
-- ---------------------------------------------------------------------------

alter table public.videos enable row level security;
alter table internal.sync_runs enable row level security;

revoke all on public.videos from anon, authenticated;
revoke all on internal.sync_runs from public, anon, authenticated;

create policy videos_select_bloqueado on public.videos
  for select to anon, authenticated using (false);
create policy videos_insert_bloqueado on public.videos
  for insert to anon, authenticated with check (false);
create policy videos_update_bloqueado on public.videos
  for update to anon, authenticated using (false) with check (false);
create policy videos_delete_bloqueado on public.videos
  for delete to anon, authenticated using (false);

create policy sync_runs_select_bloqueado on internal.sync_runs
  for select to anon, authenticated using (false);
create policy sync_runs_insert_bloqueado on internal.sync_runs
  for insert to anon, authenticated with check (false);
create policy sync_runs_update_bloqueado on internal.sync_runs
  for update to anon, authenticated using (false) with check (false);
create policy sync_runs_delete_bloqueado on internal.sync_runs
  for delete to anon, authenticated using (false);

-- service_role (secret key) lê e grava vídeos; o log só é escrito pela função abaixo
grant select, insert, update, delete on public.videos to service_role;

-- ---------------------------------------------------------------------------
-- Regra 3: função SECURITY DEFINER com search_path fixo e EXECUTE só para service_role
-- ---------------------------------------------------------------------------

create or replace function public.log_sync_run(
  p_status          text,
  p_trigger         text,
  p_videos_fetched  integer,
  p_videos_removed  integer,
  p_started_at      timestamptz,
  p_error           text default null
) returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  insert into internal.sync_runs (status, trigger, videos_fetched, videos_removed, started_at, finished_at, error)
  values (p_status, p_trigger, p_videos_fetched, p_videos_removed, p_started_at, now(), left(p_error, 2000))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.log_sync_run(text, text, integer, integer, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.log_sync_run(text, text, integer, integer, timestamptz, text)
  to service_role;
