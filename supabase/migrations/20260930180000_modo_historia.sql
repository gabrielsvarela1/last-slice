-- Modo história: progresso por fase (fatias ganhas, 1 a 3) no perfil, e partidas do modo 'story'.

alter table public.profiles
  add column story jsonb not null default '{}'::jsonb
  check (jsonb_typeof(story) = 'object' and pg_column_size(story) < 4096);
grant update (story) on public.profiles to authenticated;

alter table public.scores drop constraint scores_mode_check;
alter table public.scores add constraint scores_mode_check check (mode in ('solo', 'mp', 'story'));

create or replace function public.submit_game(
  p_score integer, p_wave integer, p_duration integer, p_mode text, p_won boolean, p_sd boolean
) returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  last_at timestamptz;
  earned integer;
  prof public.profiles;
begin
  if uid is null then raise exception 'Sem sessão' using errcode = '28000'; end if;
  if p_mode not in ('solo', 'mp', 'story') then raise exception 'Modo inválido' using errcode = '22023'; end if;
  if p_duration < 5 or p_duration > 14400 then raise exception 'Duração inválida' using errcode = '22023'; end if;
  if p_score < 0 or p_score > p_duration * 250 + 2000 then raise exception 'Pontuação inválida' using errcode = '22023'; end if;
  if p_wave < 0 or p_wave > p_duration / 10 + 2 then raise exception 'Onda inválida' using errcode = '22023'; end if;

  select max(s.created_at) into last_at from public.scores s where s.user_id = uid;
  if last_at is not null and now() - last_at < make_interval(secs => (p_duration * 0.8)::double precision) then
    raise exception 'Partidas demasiado seguidas' using errcode = '22023';
  end if;

  earned := least(80, p_score / 250
    + case when p_won then 15 else 0 end
    + case when p_sd then 5 else 0 end
    + case when p_mode = 'mp' then 3 else 0 end);

  insert into public.scores (user_id, score, wave, duration, mode, won)
  values (uid, p_score, p_wave, p_duration, p_mode, p_won);

  update public.profiles
     set stars = stars + earned,
         best = case when p_mode = 'solo' then greatest(best, p_score) else best end
   where id = uid
  returning * into prof;

  return json_build_object('earned', earned, 'stars', prof.stars, 'best', prof.best);
end $$;

revoke execute on function public.submit_game(integer, integer, integer, text, boolean, boolean) from public, anon;
grant execute on function public.submit_game(integer, integer, integer, text, boolean, boolean) to authenticated;
