-- ViewNow · vídeos que o player não consegue tocar
-- O player relata o erro (100/101/150) e a API esconde o vídeo quando:
--   a) o oEmbed do YouTube confirma que ele não toca fora do YouTube; ou
--   b) 3 visitantes diferentes relatam o erro em 24h (bloqueios que só aparecem no player).
-- A marca fica em `unplayable_at`, separada da curadoria manual (`visible`).

alter table public.videos add column unplayable_at timestamptz;

comment on column public.videos.unplayable_at is
  'Escondido automaticamente porque o player não tocou. A sync limpa a marca depois de 7 dias para tentar de novo.';

-- Relatos do player. Só o hash do visitante (HMAC do IP), nunca o IP.
create table internal.playback_reports (
  youtube_id     text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  reporter_hash  text not null check (reporter_hash ~ '^[0-9a-f]{64}$'),
  error_code     integer not null check (error_code in (100, 101, 150)),
  created_at     timestamptz not null default now(),
  primary key (youtube_id, reporter_hash)
);

alter table internal.playback_reports enable row level security;
revoke all on internal.playback_reports from public, anon, authenticated;

create policy playback_reports_select_bloqueado on internal.playback_reports
  for select to anon, authenticated using (false);
create policy playback_reports_insert_bloqueado on internal.playback_reports
  for insert to anon, authenticated with check (false);
create policy playback_reports_update_bloqueado on internal.playback_reports
  for update to anon, authenticated using (false) with check (false);
create policy playback_reports_delete_bloqueado on internal.playback_reports
  for delete to anon, authenticated using (false);

-- Registra um relato e esconde o vídeo ao atingir o limite de visitantes distintos na janela.
-- `is_new` é false quando o mesmo visitante já relatou este vídeo dentro da janela:
-- relatos repetidos não contam de novo e a API não reconsulta o YouTube.
create or replace function public.record_playback_report(
  p_youtube_id     text,
  p_reporter_hash  text,
  p_error_code     integer,
  p_threshold      integer default 3,
  p_window         interval default interval '24 hours'
) returns table (is_new boolean, reporters integer, hidden boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new        boolean;
  v_reporters  integer;
  v_hidden     boolean;
begin
  -- Relatos antigos não servem para nada: limpeza a cada chamada (a tabela fica pequena).
  delete from internal.playback_reports where created_at < now() - interval '7 days';

  insert into internal.playback_reports as r (youtube_id, reporter_hash, error_code)
  values (p_youtube_id, p_reporter_hash, p_error_code)
  on conflict (youtube_id, reporter_hash) do update
    set created_at = now(), error_code = excluded.error_code
    where r.created_at < now() - p_window;
  v_new := found;

  select count(*)::integer into v_reporters
  from internal.playback_reports
  where youtube_id = p_youtube_id and created_at >= now() - p_window;

  if v_reporters >= p_threshold then
    update public.videos set unplayable_at = now()
    where youtube_id = p_youtube_id and unplayable_at is null;
  end if;

  select v.unplayable_at is not null into v_hidden
  from public.videos v where v.youtube_id = p_youtube_id;

  return query select v_new, v_reporters, coalesce(v_hidden, false);
end;
$$;

revoke execute on function public.record_playback_report(text, text, integer, integer, interval)
  from public, anon, authenticated;
grant execute on function public.record_playback_report(text, text, integer, integer, interval)
  to service_role;

-- A listagem pública filtra também por unplayable_at.
drop index if exists public.videos_playlist_visible_position_idx;
create index videos_listable_position_idx
  on public.videos (position) where visible and unplayable_at is null;
