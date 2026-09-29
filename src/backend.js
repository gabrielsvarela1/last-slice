// Ligação ao Supabase: sessão anónima, perfil, compras, pontuações e ranking.
// Sem as variáveis VITE_SUPABASE_* o jogo funciona offline (tudo fica só no browser).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const sb = url && key ? createClient(url, key) : null;

let userPromise = null;
// Cada browser recebe um jogador anónimo; a sessão fica guardada e é reutilizada.
export function ensureUser() {
  if (!sb) return Promise.resolve(null);
  if (!userPromise) {
    userPromise = (async () => {
      const { data } = await sb.auth.getSession();
      if (data.session) return data.session.user;
      const res = await sb.auth.signInAnonymously();
      if (res.error) throw res.error;
      return res.data.user;
    })().catch(err => { userPromise = null; throw err; });
  }
  return userPromise;
}

export async function loadProfile() {
  const user = await ensureUser();
  if (!user) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}

// Só os campos que o jogador pode mudar diretamente; estrelas, compras e recorde passam pelo servidor.
export async function saveProfile(fields) {
  const user = await ensureUser();
  if (!user) return;
  const { error } = await sb.from('profiles').update(fields).eq('id', user.id);
  if (error) throw error;
}

export async function submitGame({ score, wave, duration, mode, won, sd }) {
  await ensureUser();
  const { data, error } = await sb.rpc('submit_game', {
    p_score: Math.floor(score), p_wave: wave, p_duration: Math.floor(duration), p_mode: mode, p_won: !!won, p_sd: !!sd,
  });
  if (error) throw error;
  return data;
}

export async function buyCosmetic(id) {
  await ensureUser();
  const { data, error } = await sb.rpc('buy_cosmetic', { p_id: id });
  if (error) throw error;
  return data;
}

export async function fetchLeaderboard(mode = 'solo') {
  await ensureUser();
  const { data, error } = await sb.rpc('leaderboard', { p_mode: mode, p_limit: 20 });
  if (error) throw error;
  return data || [];
}
