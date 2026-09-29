-- Pizzaria Sitiada: perfis dos jogadores, cosméticos, pontuações e as funções que os alteram.
-- Regra geral: o jogador só edita diretamente campos inofensivos (nome, cores, teclas).
-- Estrelas, compras e pontuações passam sempre por funções do servidor, que as validam.

-- ---------- perfis ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 16),
  shop text not null default '' check (char_length(shop) <= 24),
  team text not null default 'tomate' check (team ~ '^[a-z]{1,16}$'),
  stars integer not null default 30 check (stars >= 0),
  owned text[] not null default '{}',
  sel jsonb not null default '{}'::jsonb check (jsonb_typeof(sel) = 'object' and pg_column_size(sel) < 4096),
  keys jsonb not null default '{}'::jsonb check (jsonb_typeof(keys) = 'object' and pg_column_size(keys) < 8192),
  key_names jsonb not null default '{}'::jsonb check (jsonb_typeof(key_names) = 'object' and pg_column_size(key_names) < 8192),
  muted boolean not null default false,
  best integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Cada jogador lê o seu perfil" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Cada jogador edita o seu perfil" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, shop, team, sel, keys, key_names, muted) on public.profiles to authenticated;

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Cada utilizador novo (incluindo convidados anónimos) recebe um perfil com 30 estrelas.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- cosméticos (preços em estrelas; têm de coincidir com a lista CUSTOM em src/main.js) ----------
create table public.cosmetics (
  id text primary key,
  price integer not null check (price >= 0)
);
alter table public.cosmetics enable row level security;
create policy "Todos veem os preços" on public.cosmetics for select to anon, authenticated using (true);
revoke all on public.cosmetics from anon, authenticated;
grant select on public.cosmetics to anon, authenticated;

insert into public.cosmetics (id, price) values
  ('p-creme', 0), ('p-menta', 10), ('p-tijolo', 15), ('p-rosa', 15), ('p-azul', 20), ('p-xadrez', 25),
  ('b-madeira', 0), ('b-carvao', 10), ('b-retro', 15), ('b-marmore', 20), ('b-neon', 35),
  ('c-tijoleira', 0), ('c-soalho', 10), ('c-verde', 15), ('c-xadrez', 20),
  ('f-tijolo', 0), ('f-pedra', 15), ('f-preto', 20), ('f-azulejo', 25), ('f-ouro', 60),
  ('t-clara', 0), ('t-escura', 10), ('t-ardosia', 15), ('t-marmore', 20),
  ('pr-branco', 0), ('pr-azul', 10), ('pr-verde', 10), ('pr-preto', 10),
  ('k-aco', 0), ('k-rubi', 25), ('k-ouro', 30), ('k-arco', 50),
  ('r-verao', 0), ('r-outono', 15), ('r-neve', 25), ('r-praia', 30), ('r-noite', 35),
  ('a-verde', 0), ('a-preta', 10), ('a-kalamata', 15), ('a-ouro', 40),
  ('m-classica', 0), ('m-integral', 10), ('m-beterraba', 20), ('m-espinafre', 20),
  ('q-flamengo', 0), ('q-cheddar', 10), ('q-gorgonzola', 20), ('q-serra', 25),
  ('pi-vermelho', 0), ('pi-verde', 10), ('pi-amarelo', 15), ('pi-roxo', 30);

-- ---------- pontuações ----------
create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null check (score >= 0),
  wave integer not null check (wave >= 0),
  duration integer not null check (duration > 0),
  mode text not null check (mode in ('solo', 'mp')),
  won boolean not null default false,
  created_at timestamptz not null default now()
);
create index scores_mode_score_idx on public.scores (mode, score desc);
create index scores_user_created_idx on public.scores (user_id, created_at desc);
alter table public.scores enable row level security;
revoke all on public.scores from anon, authenticated;
-- Sem políticas de propósito: só as funções abaixo leem e escrevem nesta tabela.

-- ---------- funções ----------
-- Regista uma partida e dá as estrelas. Os limites travam pontuações impossíveis:
-- mais de 250 pontos por segundo, ondas a mais, ou partidas mais seguidas do que o tempo que dizem durar.
create function public.submit_game(
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
  if p_mode not in ('solo', 'mp') then raise exception 'Modo inválido' using errcode = '22023'; end if;
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

-- Compra um cosmético com estrelas (o preço vem da tabela, nunca do jogo).
create function public.buy_cosmetic(p_id text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  item_price integer;
  prof public.profiles;
begin
  if uid is null then raise exception 'Sem sessão' using errcode = '28000'; end if;
  select c.price into item_price from public.cosmetics c where c.id = p_id;
  if not found then raise exception 'Item inexistente' using errcode = '22023'; end if;

  select * into prof from public.profiles where id = uid for update;
  if not found then raise exception 'Perfil inexistente' using errcode = '22023'; end if;

  if item_price > 0 and not (p_id = any (prof.owned)) then
    if prof.stars < item_price then raise exception 'Estrelas insuficientes' using errcode = '22023'; end if;
    update public.profiles
       set stars = stars - item_price, owned = array_append(owned, p_id)
     where id = uid
    returning * into prof;
  end if;

  return json_build_object('stars', prof.stars, 'owned', to_json(prof.owned));
end $$;

-- Ranking: a melhor pontuação de cada jogador num modo.
create function public.leaderboard(p_mode text default 'solo', p_limit integer default 20)
returns table (name text, shop text, team text, score integer, wave integer, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select p.name, p.shop, p.team, b.score, b.wave, b.user_id = auth.uid()
  from (
    select distinct on (s.user_id) s.user_id, s.score, s.wave
    from public.scores s
    where s.mode = p_mode
    order by s.user_id, s.score desc, s.created_at
  ) b
  join public.profiles p on p.id = b.user_id
  order by b.score desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.submit_game(integer, integer, integer, text, boolean, boolean) from public, anon;
revoke execute on function public.buy_cosmetic(text) from public, anon;
revoke execute on function public.leaderboard(text, integer) from public, anon;
grant execute on function public.submit_game(integer, integer, integer, text, boolean, boolean) to authenticated;
grant execute on function public.buy_cosmetic(text) to authenticated;
grant execute on function public.leaderboard(text, integer) to authenticated;
