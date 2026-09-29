// Salas multijogador sobre o Supabase Realtime (presença).
// Mantém a mesma forma que o jogo já usava: peers(), presence(patch), onPeers(fn) e join(nome).
// Cada separador é um "peer" com uma chave aleatória; o estado de cada um é um objeto que os outros leem.

const MIN_GAP_MS = 250; // no máximo 4 atualizações de presença por segundo, para poupar mensagens

const randomId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function createChannel(sb, name, myPeer) {
  const ch = sb.channel(name, { config: { presence: { key: myPeer } } });
  let state = {};
  let snap = [];
  let subscribed = false;
  let lastSent = 0;
  let timer = null;
  let closed = false;
  const listeners = new Set();

  function rebuild() {
    const raw = ch.presenceState();
    const others = [];
    for (const [peer, metas] of Object.entries(raw)) {
      if (peer === myPeer) continue;
      const meta = metas[metas.length - 1] || {};
      others.push({ peer, kind: 'viewer', isMe: false, sameTab: false, guest: false, by: null, presence: meta.p || {} });
    }
    snap = [{ peer: myPeer, kind: 'viewer', isMe: true, sameTab: true, guest: false, by: null, presence: state }, ...others];
    for (const fn of listeners) fn({ peers: snap });
  }
  function flush() {
    if (!subscribed || closed) return;
    const wait = MIN_GAP_MS - (Date.now() - lastSent);
    if (wait > 0) { if (!timer) timer = setTimeout(() => { timer = null; flush(); }, wait); return; }
    lastSent = Date.now();
    ch.track({ p: state }).catch(() => {});
  }

  ch.on('presence', { event: 'sync' }, rebuild);
  const ready = new Promise((resolve, reject) => {
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') { subscribed = true; flush(); resolve(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(status));
    });
  });
  rebuild();

  return {
    ready,
    peers: () => snap,
    presence(patch) {
      const next = { ...state };
      for (const [k, v] of Object.entries(patch)) { if (v === null) delete next[k]; else next[k] = v; }
      state = next;
      rebuild(); flush();
      return Promise.resolve();
    },
    onPeers(fn) {
      listeners.add(fn);
      queueMicrotask(() => { if (listeners.has(fn)) fn({ peers: snap }); });
      return () => listeners.delete(fn);
    },
    async leave() {
      closed = true; listeners.clear(); clearTimeout(timer);
      try { await ch.untrack(); } catch (e) { /* já fechado */ }
      await sb.removeChannel(ch);
    },
  };
}

export function createRoomApi(sb) {
  if (!sb) return null;
  const myPeer = randomId();
  const lobby = createChannel(sb, 'pizzaria:lobby', myPeer);
  const rooms = new Map();
  return {
    peers: lobby.peers,
    presence: lobby.presence,
    onPeers: lobby.onPeers,
    async join(name) {
      if (rooms.has(name)) return rooms.get(name);
      const room = createChannel(sb, 'pizzaria:sala:' + name, myPeer);
      const wrapped = { ...room, leave: async () => { rooms.delete(name); await room.leave(); } };
      rooms.set(name, wrapped);
      try { await Promise.race([room.ready, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]); }
      catch (e) { rooms.delete(name); await room.leave(); throw e; }
      return wrapped;
    },
  };
}
