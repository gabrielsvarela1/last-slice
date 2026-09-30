import './style.css';
import { sb, loadProfile, saveProfile, submitGame, buyCosmetic, fetchLeaderboard } from './backend.js';
import { createRoomApi } from './net.js';

(() => {
'use strict';
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(2, window.devicePixelRatio || 1);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t); };
// Aleatório com semente: no multijogador todos recebem os mesmos clientes, ondas e peças.
function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function setup(c, W, H) {
  c.width = W * DPR; c.height = H * DPR;
  const x = c.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0); return x;
}
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); t = clamp(t, 0, 1);
  const ch = s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function label(c, txt, x, y, size, fill, stroke = '#1a1210', align = 'center') {
  c.font = `${size}px "Lilita One", "Arial Rounded MT Bold", sans-serif`;
  c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = size / 4; c.strokeText(txt, x, y); }
  c.fillStyle = fill; c.fillText(txt, x, y);
}
function xMark(c, x, y, s = 10) {
  c.strokeStyle = '#ff5d4a'; c.lineWidth = 3.5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - s / 2, y - s / 2); c.lineTo(x + s / 2, y + s / 2); c.moveTo(x + s / 2, y - s / 2); c.lineTo(x - s / 2, y + s / 2); c.stroke();
}
const cleanName = (s, n = 16) => (typeof s === 'string' ? s : '').replace(/[\u0000-\u001f\u007f-\u009f­​-‏‪-‮⁠-⁯﻿]/g, '').trim().slice(0, n);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ---------- perfil e personalização ---------- */
const TEAM = [
  { id: 'tomate', name: 'Tomate', c: '#e24a2c' }, { id: 'manjericao', name: 'Manjericão', c: '#4f9e3a' },
  { id: 'queijo', name: 'Queijo', c: '#e9b320' }, { id: 'azul', name: 'Azulejo', c: '#3d7dd8' },
  { id: 'roxo', name: 'Beringela', c: '#8a4fd6' }, { id: 'rosa', name: 'Framboesa', c: '#d9467a' },
  { id: 'laranja', name: 'Abóbora', c: '#e07a24' }, { id: 'petroleo', name: 'Petróleo', c: '#1f8a8a' },
];
const CUSTOM = [
  { cat: 'parede', tab: 'pizzaria', label: 'Parede', opts: [
    { id: 'p-creme', name: 'Azulejo creme', price: 0, v: { a: '#eadbc2', b: '#e0cdb0', pat: 'check' } },
    { id: 'p-menta', name: 'Verde menta', price: 10, v: { a: '#cfe6d4', b: '#bcdcc3', pat: 'check' } },
    { id: 'p-tijolo', name: 'Tijolo', price: 15, v: { a: '#b5654a', b: '#8f4633', pat: 'brick' } },
    { id: 'p-rosa', name: 'Riscas retro', price: 15, v: { a: '#f5d3dc', b: '#eab6c4', pat: 'stripe' } },
    { id: 'p-azul', name: 'Azulejo português', price: 20, v: { a: '#f4f1ea', b: '#2d5da8', pat: 'azulejo' } },
    { id: 'p-xadrez', name: 'Xadrez', price: 25, v: { a: '#f2f2f2', b: '#2a2a2a', pat: 'check' } },
  ] },
  { cat: 'balcao', tab: 'pizzaria', label: 'Balcão', opts: [
    { id: 'b-madeira', name: 'Madeira', price: 0, v: { top: '#a8663a', mid: '#8a4f2c', bot: '#6d3b20', pat: 'wood' } },
    { id: 'b-carvao', name: 'Carvão', price: 10, v: { top: '#555555', mid: '#353535', bot: '#1f1f1f', pat: 'wood' } },
    { id: 'b-retro', name: 'Vermelho retro', price: 15, v: { top: '#e6e6e6', mid: '#c8322a', bot: '#9a2019', pat: 'retro' } },
    { id: 'b-marmore', name: 'Mármore', price: 20, v: { top: '#f1efe9', mid: '#dcd8cf', bot: '#b9b3a6', pat: 'marble' } },
    { id: 'b-neon', name: 'Néon', price: 35, v: { top: '#2a1a40', mid: '#1c1030', bot: '#120a20', pat: 'neon' } },
  ] },
  { cat: 'chao', tab: 'pizzaria', label: 'Chão', opts: [
    { id: 'c-tijoleira', name: 'Tijoleira', price: 0, v: { a: '#3a2a22', b: '#33241d' } },
    { id: 'c-soalho', name: 'Soalho', price: 10, v: { a: '#5a3b24', b: '#43291a', pat: 'plank' } },
    { id: 'c-verde', name: 'Mosaico verde', price: 15, v: { a: '#2c4a3a', b: '#223a2d' } },
    { id: 'c-xadrez', name: 'Xadrez', price: 20, v: { a: '#2a2a2a', b: '#8e8a80' } },
  ] },
  { cat: 'forno', tab: 'pizzaria', label: 'Forno', opts: [
    { id: 'f-tijolo', name: 'Tijolo', price: 0, v: { body: '#7d3421', text: '#f4c343' } },
    { id: 'f-pedra', name: 'Pedra', price: 15, v: { body: '#6b6660', text: '#f7ecdc' } },
    { id: 'f-preto', name: 'Ferro preto', price: 20, v: { body: '#2e2b29', text: '#e24a2c' } },
    { id: 'f-azulejo', name: 'Azulejo azul', price: 25, v: { body: '#2d5da8', text: '#ffffff' } },
    { id: 'f-ouro', name: 'Dourado', price: 60, v: { body: '#b8901f', text: '#fff6d0' } },
  ] },
  { cat: 'tabua', tab: 'utensilios', label: 'Bancada', opts: [
    { id: 't-clara', name: 'Madeira clara', price: 0, v: { wood: '#b27a46', ring: '#8f5c2e' } },
    { id: 't-escura', name: 'Nogueira', price: 10, v: { wood: '#6e4526', ring: '#4f2f18' } },
    { id: 't-ardosia', name: 'Ardósia', price: 15, v: { wood: '#4a4f55', ring: '#33373c' } },
    { id: 't-marmore', name: 'Mármore', price: 20, v: { wood: '#e9e6df', ring: '#c9c3b6' } },
  ] },
  { cat: 'prato', tab: 'utensilios', label: 'Pratos', opts: [
    { id: 'pr-branco', name: 'Branco', price: 0, v: { a: '#efe6d6', b: '#d4c7b0' } },
    { id: 'pr-azul', name: 'Azul e branco', price: 10, v: { a: '#e9f0fb', b: '#2d5da8' } },
    { id: 'pr-verde', name: 'Verde', price: 10, v: { a: '#d6ecd0', b: '#6db552' } },
    { id: 'pr-preto', name: 'Preto', price: 10, v: { a: '#2e2e2e', b: '#5a5a5a' } },
  ] },
  { cat: 'cortador', tab: 'utensilios', label: 'Corta-pizzas', opts: [
    { id: 'k-aco', name: 'Aço', price: 0, v: { blade: '#d9dde2', edge: '#8b939c', handle: '#6b4a2a' } },
    { id: 'k-rubi', name: 'Rubi', price: 25, v: { blade: '#e8506a', edge: '#9a2038', handle: '#222222' } },
    { id: 'k-ouro', name: 'Dourado', price: 30, v: { blade: '#f4d35e', edge: '#b8901f', handle: '#3a2a1a' } },
    { id: 'k-arco', name: 'Arco-íris', price: 50, v: { blade: '#ffffff', edge: '#888888', handle: '#6b4a2a', rainbow: true } },
  ] },
  { cat: 'relva', tab: 'esplanada', label: 'Cenário', opts: [
    { id: 'r-verao', name: 'Verão', price: 0, v: { a: '#64a24a', b: '#5a9642', street: '#6b6158', top: '#1f2a18' } },
    { id: 'r-outono', name: 'Outono', price: 15, v: { a: '#9a8a3a', b: '#8c7c33', street: '#6b6158', top: '#2a2014', deco: 'leaves' } },
    { id: 'r-neve', name: 'Neve', price: 25, v: { a: '#e9eef4', b: '#dbe3ec', street: '#8b929a', top: '#1c2530', deco: 'snow' } },
    { id: 'r-praia', name: 'Praia', price: 30, v: { a: '#ecd49a', b: '#e2c887', street: '#4aa3c9', top: '#123a4a', deco: 'shells' } },
    { id: 'r-noite', name: 'Noite', price: 35, v: { a: '#2f4f3a', b: '#294633', street: '#3a3a48', top: '#0f1420', deco: 'fireflies' } },
  ] },
  { cat: 'azeitona', tab: 'defesas', label: 'Azeitoneira', opts: [
    { id: 'a-verde', name: 'Azeitona verde', price: 0, v: { head: '#7c8f2e', snout: '#6a7a24', pot: '#b5562f', shot: '#56612a' } },
    { id: 'a-preta', name: 'Azeitona preta', price: 10, v: { head: '#3a352f', snout: '#26221e', pot: '#b5562f', shot: '#2a2622' } },
    { id: 'a-kalamata', name: 'Kalamata', price: 15, v: { head: '#6b3257', snout: '#522443', pot: '#3d7dd8', shot: '#5b2d4a' } },
    { id: 'a-ouro', name: 'Vaso dourado', price: 40, v: { head: '#7c8f2e', snout: '#6a7a24', pot: '#d4a72c', shot: '#56612a' } },
  ] },
  { cat: 'massa', tab: 'defesas', label: 'Muro de massa', opts: [
    { id: 'm-classica', name: 'Clássica', price: 0, v: { body: '#efd9a8', line: '#c69c5c' } },
    { id: 'm-integral', name: 'Integral', price: 10, v: { body: '#b98b5a', line: '#8a603a' } },
    { id: 'm-beterraba', name: 'Beterraba', price: 20, v: { body: '#d9668a', line: '#a3405f' } },
    { id: 'm-espinafre', name: 'Espinafres', price: 20, v: { body: '#8cc47a', line: '#5f9a4c' } },
  ] },
  { cat: 'queijo', tab: 'defesas', label: 'Queijeira', opts: [
    { id: 'q-flamengo', name: 'Flamengo', price: 0, v: { body: '#f5c542', top: '#fbe08a', hole: '#dca52a', line: '#cf961c' } },
    { id: 'q-cheddar', name: 'Cheddar', price: 10, v: { body: '#f08a24', top: '#f7b060', hole: '#c86a14', line: '#b85e10' } },
    { id: 'q-gorgonzola', name: 'Gorgonzola', price: 20, v: { body: '#e8e4d0', top: '#f6f3e4', hole: '#5a8fb5', line: '#b9b39a' } },
    { id: 'q-serra', name: 'Serra da Estrela', price: 25, v: { body: '#f3e6c4', top: '#fbf3de', hole: '#d9c08a', line: '#c9a86a' } },
  ] },
  { cat: 'pimenta', tab: 'defesas', label: 'Piri-piri', opts: [
    { id: 'pi-vermelho', name: 'Vermelho', price: 0, v: { body: '#d8321f' } },
    { id: 'pi-verde', name: 'Jalapeño', price: 10, v: { body: '#3f9a3a' } },
    { id: 'pi-amarelo', name: 'Habanero', price: 15, v: { body: '#f0a020' } },
    { id: 'pi-roxo', name: 'Fantasma', price: 30, v: { body: '#6a2a8a' } },
  ] },
];
const CMAP = Object.fromEntries(CUSTOM.map(c => [c.cat, c]));
const TABS = [['perfil', 'Perfil'], ['pizzaria', 'Pizzaria'], ['utensilios', 'Utensílios'], ['esplanada', 'Esplanada'], ['defesas', 'Defesas']];

let P = { name: '', shop: '', team: 'tomate', stars: 30, owned: [], sel: {}, best: 0, keys: {}, keyNames: {}, muted: false };
try {
  const raw = JSON.parse(LS.get('pizzaria-sitiada-perfil') || 'null');
  if (raw && typeof raw === 'object') P = Object.assign(P, raw);
} catch (e) {}
if (!Array.isArray(P.owned)) P.owned = [];
if (!P.sel || typeof P.sel !== 'object') P.sel = {};
if (!P.keys || typeof P.keys !== 'object') P.keys = {};
if (!P.keyNames || typeof P.keyNames !== 'object') P.keyNames = {};
if (!P.story || typeof P.story !== 'object') P.story = {};
P.name = cleanName(P.name || LS.get('pizzaria-sitiada-nick') || '');
P.shop = cleanName(P.shop, 24);
P.stars = Math.max(0, Math.floor(+P.stars || 0));
P.best = Math.max(Math.floor(+P.best || 0), Math.floor(+LS.get('pizzaria-sitiada-best') || 0));
if (!TEAM.some(t => t.id === P.team)) P.team = 'tomate';
// O perfil fica em cache no browser e, com servidor, os campos editáveis são enviados (com atraso, para juntar mudanças).
// Estrelas, compras e recorde nunca são enviados daqui: só o servidor os altera (submit_game, buy_cosmetic).
let saveTimer = null;
const saveP = () => {
  LS.set('pizzaria-sitiada-perfil', JSON.stringify(P));
  if (!sb) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveProfile({ name: P.name, shop: P.shop, team: P.team, sel: P.sel, keys: P.keys, key_names: P.keyNames, muted: !!P.muted, story: P.story })
      .catch(e => console.warn('Perfil não guardado no servidor', e));
  }, 800);
};
const owns = o => o.price === 0 || P.owned.includes(o.id);
let PREVIEW = null;
function SK(cat) {
  const c = CMAP[cat];
  if (PREVIEW && PREVIEW.cat === cat) { const o = c.opts.find(o => o.id === PREVIEW.id); if (o) return o.v; }
  const o = c.opts.find(o => o.id === P.sel[cat] && owns(o));
  return (o || c.opts[0]).v;
}
const teamColor = id => (TEAM.find(t => t.id === id) || TEAM[0]).c;
const myName = () => P.name || 'Pizzaiolo';
const shopName = () => P.shop || (P.name ? 'Pizzaria ' + P.name : 'A minha pizzaria');

/* ---------- canvases ---------- */
const KW = 560, KH = 460, DW = 720, DH = 460;
const TW = 10, TH = 20, TS = 18, TTOP = 44, TCW = TW * TS, TCH = TTOP + TH * TS;
const PVW = 520, PVH = 260;
const kc = $('#kc'), dc = $('#dc'), tc = $('#tc');
const kx = setup(kc, KW, KH), dx = setup(dc, DW, DH), tx = setup(tc, TCW, TCH);
const mpx = setup($('#menuPreview'), PVW, PVH), cpx = setup($('#customPreview'), PVW, PVH);

/* ---------- cenário ---------- */
function drawWall(c, W, H, v) {
  c.fillStyle = v.a; c.fillRect(0, 0, W, H);
  c.fillStyle = v.b; c.strokeStyle = v.b;
  if (v.pat === 'check') { for (let x = 0; x < W; x += 28) for (let y = 0; y < H; y += 28) if (((x + y) / 28) % 2 === 0) c.fillRect(x, y, 28, 28); }
  else if (v.pat === 'stripe') { for (let x = 0; x < W; x += 40) c.fillRect(x, 0, 20, H); }
  else if (v.pat === 'brick') {
    c.lineWidth = 2;
    for (let y = 0, row = 0; y < H; y += 14, row++) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      for (let x = row % 2 ? 0 : 18; x < W; x += 36) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 14); c.stroke(); }
    }
  } else if (v.pat === 'azulejo') {
    c.lineWidth = 1.5;
    for (let x = 0; x < W; x += 28) for (let y = 0; y < H; y += 28) {
      c.strokeRect(x + .5, y + .5, 27, 27); circ(c, x + 14, y + 14, 4.5); c.fill();
      c.beginPath(); c.moveTo(x + 14, y + 4); c.lineTo(x + 24, y + 14); c.lineTo(x + 14, y + 24); c.lineTo(x + 4, y + 14); c.closePath(); c.stroke();
    }
  }
}
function drawCounter(c, y, W, h, v) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, v.top); g.addColorStop(.25, v.mid); g.addColorStop(1, v.bot);
  c.fillStyle = g; c.fillRect(0, y, W, h);
  if (v.pat === 'wood') {
    c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, y + 12 + i * 9); for (let x = 0; x <= W; x += 40) c.lineTo(x, y + 12 + i * 9 + Math.sin(x * .05 + i) * 1.5); c.stroke(); }
  } else if (v.pat === 'marble') {
    c.strokeStyle = 'rgba(90,90,90,.3)'; c.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const x0 = i * W / 6 + 20; c.beginPath(); c.moveTo(x0, y + 2); c.bezierCurveTo(x0 + 30, y + h * .3, x0 - 10, y + h * .6, x0 + 40, y + h); c.stroke(); }
  } else if (v.pat === 'retro') {
    c.fillStyle = v.top; c.fillRect(0, y, W, 8); c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(0, y + h * .6, W, 3);
  } else if (v.pat === 'neon') {
    c.save(); c.shadowBlur = 12;
    c.shadowColor = '#ff4fd8'; c.fillStyle = '#ff4fd8'; c.fillRect(0, y + 4, W, 2);
    c.shadowColor = '#4fe3ff'; c.fillStyle = '#4fe3ff'; c.fillRect(0, y + h - 7, W, 2);
    c.restore();
  }
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, y, W, 3);
}
function drawFloor(c, y, W, H, v) {
  c.fillStyle = v.a; c.fillRect(0, y, W, H - y); c.fillStyle = v.b;
  if (v.pat === 'plank') { for (let yy = y, row = 0; yy < H; yy += 22, row++) { c.fillRect(0, yy, W, 2); for (let x = (row % 2) * 60; x < W; x += 120) c.fillRect(x, yy, 2, 22); } }
  else for (let x = 0; x < W; x += 40) for (let yy = y; yy < H; yy += 40) if (((x / 40) + ((yy - y) / 40)) % 2 === 0) c.fillRect(x, yy, 40, 40);
}
function drawAwning(c, x, y, w, h, col) {
  const n = Math.max(4, Math.round(w / 28)), sw = w / n;
  for (let i = 0; i < n; i++) {
    c.fillStyle = i % 2 ? '#fbf4e6' : col;
    c.beginPath(); c.moveTo(x + i * sw, y); c.lineTo(x + (i + 1) * sw, y); c.lineTo(x + (i + 1) * sw, y + h);
    c.arc(x + i * sw + sw / 2, y + h, sw / 2, 0, Math.PI); c.closePath(); c.fill();
  }
}
const DECO = (() => { const r = mulberry(7); return Array.from({ length: 60 }, () => [r(), r(), r()]); })();
function drawLawnDeco(c, x0, y0, W, H, v) {
  if (!v.deco) return;
  for (const [a, b, s] of DECO) {
    let x = x0 + a * W, y = y0 + b * H;
    if (v.deco === 'leaves') { c.fillStyle = s < .5 ? '#d9772a' : '#b5462a'; ell(c, x, y, 5, 2.5, s * 6); c.fill(); }
    else if (v.deco === 'shells') { if (s < .5) { c.fillStyle = '#f2b8b0'; c.beginPath(); c.arc(x, y, 4, Math.PI, 0); c.fill(); } }
    else if (v.deco === 'snow') { y = y0 + ((b * H + G * (12 + s * 10)) % H); c.fillStyle = 'rgba(255,255,255,.9)'; circ(c, x + Math.sin(G + s * 9) * 4, y, 1.4 + s * 1.4); c.fill(); }
    else if (v.deco === 'fireflies') { if (s < .45) { const al = .35 + .35 * Math.sin(G * 2 + s * 20); c.fillStyle = `rgba(255,236,120,${al})`; circ(c, x + Math.sin(G * .7 + s * 9) * 10, y + Math.cos(G * .5 + s * 7) * 8, 2.2); c.fill(); } }
  }
}

/* ---------- pizza ---------- */
const TOPS = {
  molho: { label: 'Molho', key: 'q', color: '#d8402a' },
  queijo: { label: 'Queijo', key: 'w', color: '#f7d35c' },
  pepperoni: { label: 'Pepperoni', key: 'e', color: '#b3281d' },
  cogumelo: { label: 'Cogumelo', key: 'r', color: '#e8d6b8' },
  azeitona: { label: 'Azeitona', key: 't', color: '#2a2622' },
  pimento: { label: 'Pimento', key: 'y', color: '#3fa34a' },
};
const EXTRAS = ['pepperoni', 'cogumelo', 'azeitona', 'pimento'];
const ORDER_TOPS = ['molho', 'queijo', ...EXTRAS];
const COOK = 5, BURN = 12;
const keyOf = tops => ORDER_TOPS.filter(t => tops.includes(t)).join('+');
function genPos(n, maxR) {
  const a = [], off = rand(0, TAU);
  for (let i = 0; i < n; i++) { const ang = off + i / n * TAU + rand(-.35, .35), d = rand(.35, 1) * maxR; a.push([Math.cos(ang) * d, Math.sin(ang) * d, rand(0, TAU)]); }
  return a;
}
function newPizza() { return { tops: [], pos: {}, bake: 0 }; }
function addTop(p, t) {
  if (p.tops.includes(t)) return false;
  p.tops.push(t); p.pos[t] = genPos(t === 'queijo' ? 8 : t === 'pepperoni' ? 6 : 5, t === 'queijo' ? .5 : .58);
  return true;
}
function makePizza(tops, bake = 0) { const p = newPizza(); tops.forEach(t => addTop(p, t)); p.bake = bake; return p; }
const pizzaState = p => p.bake < COOK ? 'raw' : p.bake < BURN ? 'cooked' : 'burnt';
function drawPiece(c, t, x, y, s, rot, burnt) {
  c.save(); c.translate(x, y); c.rotate(rot);
  if (t === 'pepperoni') {
    c.fillStyle = burnt ? '#2e0f08' : '#b3281d'; circ(c, 0, 0, s); c.fill();
    c.fillStyle = 'rgba(0,0,0,.22)'; circ(c, s * .35, -s * .2, s * .2); c.fill(); circ(c, -s * .3, s * .3, s * .16); c.fill();
  } else if (t === 'cogumelo') {
    c.fillStyle = burnt ? '#3a2a1a' : '#eadbc0';
    c.beginPath(); c.arc(0, 0, s, Math.PI, 0); c.closePath(); c.fill(); c.fillRect(-s * .32, -1, s * .64, s * .85);
    c.fillStyle = 'rgba(110,70,35,.45)'; c.fillRect(-s * .8, -s * .12, s * 1.6, Math.max(.8, s * .16));
  } else if (t === 'azeitona') {
    c.strokeStyle = burnt ? '#0c0b0a' : '#26221e'; c.lineWidth = s * .55; circ(c, 0, 0, s * .68); c.stroke();
  } else if (t === 'pimento') {
    c.strokeStyle = burnt ? '#1c2a10' : '#3fa34a'; c.lineWidth = s * .5; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, s, -.2, Math.PI * .85); c.stroke();
  }
  c.restore();
}
function drawPizza(c, x, y, r, p) {
  const b = p.bake, cookT = clamp(b / COOK, 0, 1), burnT = clamp((b - COOK - 3) / (BURN - COOK - 3), 0, 1), burnt = b >= BURN;
  let crust = mix('#f1dfb4', '#d98c3a', cookT); if (burnT > 0) crust = mix('#d98c3a', '#3b2216', burnT);
  c.fillStyle = 'rgba(0,0,0,.22)'; circ(c, x + 2, y + 4, r); c.fill();
  c.fillStyle = crust; circ(c, x, y, r); c.fill();
  c.fillStyle = 'rgba(255,255,255,.14)'; circ(c, x - r * .06, y - r * .08, r * .9); c.fill();
  if (p.tops.includes('molho')) c.fillStyle = burnT > 0 ? mix('#b22a18', '#3a140c', burnT) : mix('#dc4630', '#b52c19', cookT);
  else c.fillStyle = mix('#f6ebd2', '#e4b572', cookT);
  circ(c, x, y, r * .8); c.fill();
  if (p.tops.includes('queijo')) {
    c.fillStyle = burnT > 0 ? mix('#f5c238', '#4a3012', burnT) : mix('#fbeaa8', '#f5c238', cookT);
    circ(c, x, y, r * .5); c.fill();
    for (const [a, bb] of p.pos.queijo) { circ(c, x + a * r, y + bb * r, r * .27); c.fill(); }
    if (cookT >= 1 && !burnt) { c.fillStyle = 'rgba(190,110,30,.45)'; for (const [a, bb] of p.pos.queijo.slice(0, 4)) { circ(c, x + a * r * .8, y + bb * r * .8, r * .06); c.fill(); } }
  }
  for (const t of EXTRAS) if (p.tops.includes(t)) {
    const s = r * (t === 'pepperoni' ? .15 : .14);
    for (const [a, bb, rot] of p.pos[t]) drawPiece(c, t, x + a * r, y + bb * r, s, rot, burnt);
  }
}

/* ---------- defesas ---------- */
const ROWS = 5, COLS = 9, GX = 44, GY = 40, CW = 72, CH = 84;
const TOWERS = {
  azeitoneira: { label: 'Azeitoneira', cost: 50, hp: 300, key: '1' },
  muro: { label: 'Muro de massa', cost: 40, hp: 1600, key: '2' },
  queijeira: { label: 'Queijeira', cost: 75, hp: 300, key: '3' },
  pimenta: { label: 'Piri-piri', cost: 125, hp: 400, key: '4' },
};
function drawAzeit(c, x, y, o) {
  const v = SK('azeitona'), rc = (o.recoil || 0) * 5, sw = Math.sin((o.anim || 0) * 2) * 1.5;
  c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, x, y + 33, 20, 5); c.fill();
  c.fillStyle = v.pot; c.beginPath(); c.moveTo(x - 16, y + 14); c.lineTo(x + 16, y + 14); c.lineTo(x + 12, y + 33); c.lineTo(x - 12, y + 33); c.closePath(); c.fill();
  c.fillStyle = mix(v.pot, '#000000', .25); rr(c, x - 18, y + 10, 36, 7, 3); c.fill();
  c.strokeStyle = '#4e8a2f'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y + 12); c.quadraticCurveTo(x - 6 + sw, y + 2, x - rc + sw, y - 8); c.stroke();
  c.fillStyle = '#6cb24a'; ell(c, x - 10, y + 4, 8, 4, -.5); c.fill(); ell(c, x + 9, y + 2, 8, 4, .6); c.fill();
  const hx = x - rc + sw, hy = y - 13;
  c.fillStyle = o.hit > 0 ? mix(v.head, '#ffffff', .5) : v.head; ell(c, hx, hy, 17, 14); c.fill();
  c.fillStyle = v.snout; rr(c, hx + 9, hy - 6, 15, 12, 4); c.fill();
  c.fillStyle = '#1c1f0c'; ell(c, hx + 24, hy, 3, 5); c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; ell(c, hx - 7, hy - 7, 5, 3, -.4); c.fill();
  c.fillStyle = '#fff'; circ(c, hx - 1, hy - 3, 4.6); c.fill();
  c.fillStyle = '#111'; circ(c, hx + .5, hy - 3, 2.3); c.fill();
}
function drawMuro(c, x, y, o) {
  const v = SK('massa'), s = Math.sin((o.anim || 0) * 1.6) * .03, hpR = o.hp / o.max;
  c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, x, y + 33, 24, 5); c.fill();
  c.fillStyle = o.hit > 0 ? mix(v.body, '#ffffff', .5) : v.body; ell(c, x, y + 6, 27 * (1 + s), 27 * (1 - s)); c.fill();
  c.strokeStyle = v.line; c.lineWidth = 2; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; circ(c, x - 11, y - 9, 3); c.fill(); circ(c, x + 7, y - 13, 2); c.fill(); circ(c, x + 13, y - 3, 2.4); c.fill();
  c.fillStyle = '#3b2616'; circ(c, x - 8, y + 3, 3); c.fill(); circ(c, x + 8, y + 3, 3); c.fill();
  c.strokeStyle = '#3b2616'; c.lineWidth = 2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 13, y - 4); c.lineTo(x - 4, y - 1); c.moveTo(x + 13, y - 4); c.lineTo(x + 4, y - 1);
  c.moveTo(x - 5, y + 14); c.lineTo(x + 5, y + (hpR < .33 ? 16 : 14)); c.stroke();
  c.strokeStyle = mix(v.line, '#000000', .2); c.lineWidth = 1.6;
  if (hpR < .66) { c.beginPath(); c.moveTo(x - 20, y - 6); c.lineTo(x - 14, y); c.lineTo(x - 18, y + 6); c.stroke(); }
  if (hpR < .33) { c.beginPath(); c.moveTo(x + 18, y + 16); c.lineTo(x + 12, y + 20); c.lineTo(x + 16, y + 26); c.stroke(); }
}
function drawQueij(c, x, y, o) {
  const v = SK('queijo'), b = Math.sin((o.anim || 0) * 2.2) * 1.2, rc = (o.recoil || 0) * 4;
  c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, x, y + 33, 24, 5); c.fill();
  c.save(); c.translate(x - rc, y + b);
  c.fillStyle = o.hit > 0 ? mix(v.body, '#ffffff', .5) : v.body;
  c.beginPath(); c.moveTo(-26, 30); c.lineTo(24, 30); c.lineTo(24, 2); c.lineTo(-26, -20); c.closePath(); c.fill();
  c.strokeStyle = v.line; c.lineWidth = 2; c.stroke();
  c.fillStyle = v.top; c.beginPath(); c.moveTo(-26, -20); c.lineTo(24, 2); c.lineTo(24, 7); c.lineTo(-26, -14); c.closePath(); c.fill();
  c.fillStyle = v.hole; circ(c, -14, 8, 5); c.fill(); circ(c, 4, 20, 4); c.fill(); circ(c, -17, 23, 3); c.fill(); circ(c, 10, 8, 2.6); c.fill();
  c.fillStyle = mix(v.line, '#000000', .3); circ(c, 18, 16, 6); c.fill();
  c.fillStyle = '#fff'; circ(c, -4, -2, 5); c.fill();
  c.fillStyle = '#111'; circ(c, -3, -2, 2.4); c.fill();
  c.restore();
}
function drawPim(c, x, y, o) {
  const v = SK('pimenta'), f = o.fuse != null ? clamp(1 - o.fuse / 1, 0, 1) : 0, a = o.anim || 0;
  const sh = f * 3 * Math.sin(a * 70), s = 1 + f * .4;
  c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, x, y + 33, 16, 5); c.fill();
  c.save(); c.translate(x + sh, y + 6); c.scale(s, s);
  c.fillStyle = (f > .55 && Math.floor(a * 18) % 2) ? '#ffb199' : v.body;
  c.beginPath(); c.moveTo(-6, -20); c.bezierCurveTo(14, -22, 18, 0, 8, 18); c.bezierCurveTo(4, 26, -4, 28, -2, 22); c.bezierCurveTo(4, 10, -18, 0, -6, -20); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2.5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-5, -12); c.quadraticCurveTo(-8, -4, -4, 4); c.stroke();
  c.fillStyle = '#3f8a2f'; rr(c, -9, -26, 13, 8, 3); c.fill();
  c.strokeStyle = '#3f8a2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(-3, -24); c.quadraticCurveTo(0, -32, 5, -32); c.stroke();
  c.fillStyle = '#fff'; circ(c, -1, -8, 3.6); c.fill(); circ(c, 7, -7, 3.3); c.fill();
  c.fillStyle = '#111'; circ(c, 0, -7.5, 1.7); c.fill(); circ(c, 7.5, -6.5, 1.6); c.fill();
  c.strokeStyle = '#3a0a04'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-5, -13); c.lineTo(2, -11); c.moveTo(11, -12); c.lineTo(5, -10.5); c.stroke();
  c.restore();
}
const TOWER_DRAW = { azeitoneira: drawAzeit, muro: drawMuro, queijeira: drawQueij, pimenta: drawPim };
function drawCutter(c, x, y, spin) {
  const v = SK('cortador');
  c.save(); c.translate(x, y);
  c.strokeStyle = v.handle; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-16, -18); c.stroke();
  c.rotate(spin);
  if (v.rainbow) { const cols = ['#e24a2c', '#f4c343', '#6db552', '#3d7dd8', '#8a4fd6', '#d9467a']; cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 12, i / 6 * TAU, (i + 1) / 6 * TAU); c.closePath(); c.fill(); }); }
  else { c.fillStyle = v.blade; circ(c, 0, 0, 12); c.fill(); }
  c.strokeStyle = v.edge; c.lineWidth = 2; circ(c, 0, 0, 12); c.stroke();
  c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); c.moveTo(0, -8); c.lineTo(0, 8); c.stroke();
  c.restore();
}

/* ---------- zombies ---------- */
const ZT = {
  normal: { hp: 190, spd: 15, dps: 45, pts: 25 },
  caixa: { hp: 480, spd: 14, dps: 45, pts: 50 },
  estafeta: { hp: 130, spd: 31, dps: 35, pts: 40 },
  mota: { hp: 240, spd: 36, dps: 45, pts: 60 },
  gordo: { hp: 650, spd: 10, dps: 60, pts: 70 },
  mini: { hp: 80, spd: 24, dps: 25, pts: 10 },
  ladrao: { hp: 230, spd: 19, dps: 30, pts: 60 },
  chef: { hp: 1200, spd: 9, dps: 110, pts: 120 },
  gigante: { hp: 3600, spd: 6, dps: 350, pts: 500 },
};
const ZSTYLE = {
  normal: { k: 1, w: 23, shirt: '#6b5a8a' }, caixa: { k: 1, w: 23, shirt: '#8a6a4a' },
  estafeta: { k: 1, w: 20, shirt: '#c9402c' }, mota: { k: 1, w: 21, shirt: '#2f6fb0' },
  gordo: { k: 1.15, w: 34, shirt: '#6f8a3a' }, mini: { k: .68, w: 23, shirt: '#6b5a8a' },
  ladrao: { k: 1, w: 22, shirt: 'stripe' }, chef: { k: 1.3, w: 23, shirt: '#ece6da' },
  gigante: { k: 1.75, w: 27, shirt: '#5a1f2a' },
};
const ZINFO = {
  normal: ['Zombie comum', 'Lento e teimoso.'],
  caixa: ['Zombie da caixa', 'A caixa de pizza na cabeça protege-o até se partir.'],
  estafeta: ['Estafeta', 'Rápido e frágil.'],
  mota: ['Estafeta de mota', 'Salta por cima da primeira defesa que encontra.'],
  gordo: ['Zombie guloso', 'Quando cai, divide-se em dois pequenos.'],
  mini: ['Zombie pequeno', 'Nasce do guloso. Rápido mas fraco.'],
  ladrao: ['Ladrão', 'Rouba moedas enquanto anda. Derrota-o para as recuperar.'],
  chef: ['Chef zombie', 'Aguenta muito e morde forte.'],
  gigante: ['Rei Zombie', 'Chefe que aparece de 5 em 5 ondas.'],
};
// [tipo, onda em que aparece, peso]
const WTAB = [['normal', 1, 5], ['caixa', 2, 3], ['estafeta', 3, 2], ['mota', 4, 2], ['gordo', 5, 1.5], ['chef', 5, 1], ['ladrao', 6, 1.3]];
function drawScooter(c) {
  c.fillStyle = '#222'; circ(c, -15, -7, 7); c.fill(); circ(c, 16, -7, 7); c.fill();
  c.fillStyle = '#9aa0a6'; circ(c, -15, -7, 3); c.fill(); circ(c, 16, -7, 3); c.fill();
  c.fillStyle = '#d8321f'; c.beginPath(); c.moveTo(-18, -12); c.lineTo(20, -12); c.quadraticCurveTo(25, -20, 16, -24); c.lineTo(-6, -24); c.lineTo(-12, -16); c.closePath(); c.fill();
  c.strokeStyle = '#444'; c.lineWidth = 3; c.beginPath(); c.moveTo(-15, -7); c.lineTo(-20, -38); c.lineTo(-27, -38); c.stroke();
  c.fillStyle = '#f4c343'; rr(c, 8, -42, 17, 17, 2); c.fill(); c.fillStyle = '#d8321f'; circ(c, 16.5, -33.5, 3.5); c.fill();
}
function drawZombie(c, z, x, g) {
  const st = ZSTYLE[z.type], k = st.k, w = st.w, T = z.type;
  const riding = T === 'mota' && z.bike;
  const fast = T === 'estafeta' || T === 'mini';
  const step = riding ? 0 : Math.sin(z.anim * (fast ? 11 : T === 'gigante' ? 3 : 6));
  const chew = z.eating ? Math.abs(Math.sin(z.anim * 14)) : 0;
  const bob = z.eating ? chew * 1.5 : riding ? Math.sin(z.anim * 20) * .8 : Math.abs(step) * 2;
  const jumpY = z.jump ? Math.sin(Math.PI * clamp(z.jump.t / .6, 0, 1)) * 55 : 0;
  const skin = z.flash > 0 ? '#eaffd8' : z.slow > 0 ? '#b8c97a' : '#8db278';
  const shirt = z.sent ? '#8a4fd6' : st.shirt;
  c.save(); c.translate(x, g);
  c.fillStyle = z.sent ? 'rgba(170,110,255,.55)' : 'rgba(0,0,0,.28)'; ell(c, 0, 0, (16 + (w - 23) / 2) * k, 4.5 * k); c.fill();
  c.translate(0, -jumpY); c.scale(k, k);
  if (riding) { drawScooter(c); c.translate(0, -12); }
  c.strokeStyle = '#3d3a4a'; c.lineWidth = T === 'estafeta' ? 4 : 5; c.lineCap = 'round';
  c.beginPath();
  if (riding) { c.moveTo(-3, -22); c.lineTo(-10, -12); c.lineTo(-12, -2); c.moveTo(4, -22); c.lineTo(-4, -12); c.lineTo(-6, -2); }
  else { c.moveTo(-3, -22); c.lineTo(-3 + step * 6, -1); c.moveTo(4, -22); c.lineTo(4 - step * 6, -1); }
  c.stroke();
  c.translate(0, -bob);
  const armY = z.eating ? Math.sin(z.anim * 14) * 4 : Math.sin(z.anim * 3) * 2;
  c.strokeStyle = skin; c.lineWidth = 4.5;
  c.beginPath(); c.moveTo(3, -43); c.lineTo(-20, -41 + armY); c.stroke();
  if (T === 'estafeta') { c.fillStyle = '#f4c343'; rr(c, 7, -50, 13, 17, 3); c.fill(); c.fillStyle = '#c9402c'; circ(c, 13.5, -41.5, 3); c.fill(); }
  if (T === 'ladrao') { c.fillStyle = '#7a5a36'; circ(c, 12, -50, 10); c.fill(); c.fillStyle = '#f4c343'; label(c, '€', 12, -50, 11, '#f4c343', null); }
  if (shirt === 'stripe') {
    c.fillStyle = '#f2f2f2'; rr(c, -w / 2, -50, w, 30, 6); c.fill();
    c.fillStyle = '#222'; for (let i = 0; i < 4; i++) c.fillRect(-w / 2, -47 + i * 7, w, 3.5);
  } else { c.fillStyle = shirt; rr(c, -w / 2, -50, w, 30, 6); c.fill(); }
  if (T === 'gordo') { c.fillStyle = z.sent ? '#7a42c0' : '#62792f'; ell(c, -5, -32, w / 2, 12); c.fill(); c.fillStyle = skin; ell(c, -8, -24, 7, 4); c.fill(); }
  if (T === 'chef') { c.fillStyle = '#fff'; rr(c, -9, -40, 18, 20, 3); c.fill(); c.fillStyle = '#c0392b'; c.fillRect(-11, -50, 23, 4); }
  if (T === 'gigante') { c.fillStyle = '#f4c343'; c.fillRect(-w / 2, -30, w, 4); }
  c.fillStyle = 'rgba(0,0,0,.25)';
  c.beginPath(); c.moveTo(-w / 2, -20); c.lineTo(-w / 2 + 4, -25); c.lineTo(-w / 2 + 8, -20); c.lineTo(-w / 2 + 13, -24); c.lineTo(-w / 2 + 17, -20); c.closePath(); c.fill();
  c.strokeStyle = skin; c.lineWidth = 4.5;
  c.beginPath(); c.moveTo(-6, -44); c.lineTo(-27, -39 - armY); c.stroke();
  c.fillStyle = skin; circ(c, -3, -61, 12.5); c.fill();
  c.fillStyle = 'rgba(40,70,40,.22)'; circ(c, 2, -56, 6); c.fill();
  c.fillStyle = '#fff'; circ(c, -8, -64, 3.7); c.fill(); circ(c, 0, -65, 3.2); c.fill();
  c.fillStyle = '#c0302a'; circ(c, -9, -63.5, 1.7); c.fill(); circ(c, -1, -64.5, 1.5); c.fill();
  c.fillStyle = '#3b1c1c'; rr(c, -13, -56, 10, 3 + chew * 4, 1.5); c.fill();
  c.fillStyle = '#f4efe0'; c.fillRect(-12, -56, 2, 2); c.fillRect(-8, -56, 2, 2);
  if (T === 'caixa' && z.box) {
    c.fillStyle = '#d9b27a'; rr(c, -18, -85, 30, 14, 2); c.fill();
    c.strokeStyle = '#a9824a'; c.lineWidth = 1.2; c.strokeRect(-18, -85, 30, 14);
    c.fillStyle = '#c0392b'; circ(c, -3, -78, 3.6); c.fill();
  }
  if (T === 'estafeta') { c.fillStyle = '#c9402c'; c.beginPath(); c.arc(-3, -66, 12.8, Math.PI, 0); c.fill(); rr(c, -23, -68, 12, 4, 2); c.fill(); }
  if (T === 'mota') {
    c.fillStyle = '#f4c343'; c.beginPath(); c.arc(-3, -64, 14, Math.PI * .95, Math.PI * 2.05); c.fill();
    c.fillStyle = 'rgba(60,120,180,.6)'; rr(c, -16, -67, 10, 6, 2); c.fill();
  }
  if (T === 'ladrao') {
    c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(-3, -65, 13, Math.PI, 0); c.fill();
    rr(c, -14, -67, 19, 6, 3); c.fill();
    c.fillStyle = '#fff'; circ(c, -8, -64, 1.8); c.fill(); circ(c, 0, -64.5, 1.6); c.fill();
  }
  if (T === 'chef') { c.fillStyle = '#fff'; c.fillRect(-13, -79, 20, 9); circ(c, -10, -82, 7); c.fill(); circ(c, -3, -87, 8); c.fill(); circ(c, 5, -82, 7); c.fill(); }
  if (T === 'gigante') {
    c.fillStyle = '#f4c343'; c.beginPath(); c.moveTo(-14, -72); c.lineTo(-14, -84); c.lineTo(-8, -78); c.lineTo(-3, -88); c.lineTo(2, -78); c.lineTo(8, -84); c.lineTo(8, -72); c.closePath(); c.fill();
    c.fillStyle = '#e24a2c'; circ(c, -3, -78, 2); c.fill();
  }
  if (z.slow > 0) { c.fillStyle = 'rgba(245,197,66,.92)'; ell(c, -3, -71, 11, 4); c.fill(); c.fillRect(-10, -71, 3, 7); c.fillRect(2, -71, 3, 5); }
  c.restore();
  if (z.hp < z.max) {
    const bw = 30 * Math.min(1.6, k), yy = g - k * 96 - jumpY;
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x - bw / 2, yy, bw, 4);
    c.fillStyle = '#e24a2c'; c.fillRect(x - bw / 2, yy, bw * clamp(z.hp / z.max, 0, 1), 4);
  }
}

/* ---------- clientes ---------- */
const SLOTS = [95, 280, 465];
const LOOKS = {
  skin: ['#f2c9a0', '#d9a47a', '#a8704a', '#7a4a2c', '#f5d6b8'],
  shirt: ['#3d7dd8', '#7b52c9', '#2f9e8f', '#d2663a', '#c93f6b', '#e0b53a'],
  hair: ['#2a1a12', '#6b3a1e', '#c9a24a', '#1b1b1b', '#8a8a8a', '#b8452a'],
};
const CTYPES = {
  normal: { w: 6, pay: 1, pat: 1, from: 0 },
  crianca: { w: 1.4, pay: .7, pat: 1.4, from: 0, tag: 'CRIANÇA', tagc: '#8fd3ff', name: 'Criança', desc: 'Pede pizzas simples e tem muita paciência. Paga pouco.' },
  avo: { w: 1, pay: 1, pat: 1.6, from: 0, tag: 'AVÓ', tagc: '#f7ecdc', name: 'Avó', desc: 'Muito paciente. Deixa sempre 10 moedas de gorjeta.' },
  vip: { w: 1.2, pay: 3, pat: .6, from: 1, tag: 'VIP', tagc: '#f4c343', name: 'VIP', desc: 'Paga o triplo, mas espera pouco.' },
  pressa: { w: 1.2, pay: 1.8, pat: .5, from: 1, tag: 'PRESSA', tagc: '#ff8a70', name: 'Apressado', desc: 'Muito pouca paciência, gorjeta alta.' },
  critico: { w: 1, pay: 1.5, pat: .85, from: 2, tag: 'CRÍTICO', tagc: '#c9a2ff', name: 'Crítico', desc: 'Servido, devolve 1 de reputação. Zangado, tira 2.' },
  indeciso: { w: 1, pay: 1.2, pat: 1.1, from: 2, tag: 'INDECISO', tagc: '#b8f09a', name: 'Indeciso', desc: 'A meio da espera muda de pedido.' },
};
// pool/maxE limitam os ingredientes extra (modo história); sem eles, o pedido cresce com as ondas.
function randomOrder(rng, wave, simple, pool = EXTRAS, maxE) {
  if (simple) return (pool.includes('pepperoni') && rng() < .3) ? ['molho', 'queijo', 'pepperoni'] : ['molho', 'queijo'];
  const m = Math.min(maxE ?? (wave < 2 ? 1 : wave < 4 ? 2 : 3), pool.length);
  const n = Math.floor(rng() * (m + 1));
  return ['molho', 'queijo', ...pool.map(t => [rng(), t]).sort((a, b) => a[0] - b[0]).slice(0, n).map(e => e[1])];
}
function newCustomer(slot, wave, rng = Math.random, force, opts = {}) {
  let type = force;
  if (!type) {
    const av = opts.types ? Object.entries(CTYPES).filter(([id]) => opts.types.includes(id)) : Object.entries(CTYPES).filter(([, d]) => wave >= d.from);
    let r = rng() * av.reduce((s, [, d]) => s + d.w, 0);
    type = av[av.length - 1][0];
    for (const [id, d] of av) { r -= d.w; if (r <= 0) { type = id; break; } }
  }
  const ct = CTYPES[type];
  const order = randomOrder(rng, wave, type === 'crianca', opts.extras, opts.maxE);
  const alt = type === 'indeciso' ? randomOrder(rng, wave + 1, false, opts.extras, opts.maxE) : null;
  const n = order.length - 2;
  const max = (Math.max(24, 46 - wave * 2) + n * 3) * ct.pat;
  return {
    slot, type, order, alt, key: keyOf(order), preview: makePizza(order, COOK + 1), pat: max, max, st: 'in', t: 0, mood: null, seed: Math.random(), changed: false, qT: 0,
    look: { skin: pick(LOOKS.skin), shirt: pick(LOOKS.shirt), hair: pick(LOOKS.hair) },
  };
}
function drawPerson(c, hx, dy, cu, mood) {
  const t = cu.type, small = t === 'crianca';
  const hr = small ? 19 : 24, hy = 78 + dy + (small ? 16 : 0);
  let shirt = cu.look.shirt;
  if (t === 'vip') shirt = '#1d1d24'; else if (t === 'pressa') shirt = '#2f9e5a'; else if (t === 'critico') shirt = '#5a4a6a'; else if (t === 'avo') shirt = '#b56a8a';
  c.fillStyle = shirt; rr(c, hx - (small ? 22 : 30), hy + 22, small ? 44 : 60, 70, 16); c.fill();
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(hx - 2, hy + 26, 4, 50);
  if (t === 'vip') { c.strokeStyle = '#f4c343'; c.lineWidth = 2.5; c.beginPath(); c.arc(hx, hy + 22, 14, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
  if (t === 'critico') {
    c.fillStyle = '#fff'; rr(c, hx + 14, hy + 38, 16, 20, 2); c.fill();
    c.strokeStyle = '#999'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(hx + 17, hy + 44 + i * 5); c.lineTo(hx + 27, hy + 44 + i * 5); c.stroke(); }
  }
  const angry = mood === 'mad' || mood === 'angry';
  c.fillStyle = angry ? mix(cu.look.skin, '#e0503a', .35 + Math.sin(G * 8) * .1) : cu.look.skin;
  circ(c, hx, hy, hr); c.fill();
  const hair = t === 'avo' ? '#d4d4d4' : cu.look.hair;
  c.fillStyle = hair; c.beginPath(); c.arc(hx, hy - 3, hr + 1.5, Math.PI * 1.02, Math.PI * 1.98); c.fill();
  if (t === 'avo') { circ(c, hx, hy - hr - 5, 8); c.fill(); }
  if (t === 'critico') { c.fillStyle = '#1b1b1b'; ell(c, hx - 2, hy - hr + 2, hr + 4, 7, -.15); c.fill(); circ(c, hx - 2, hy - hr - 5, 3); c.fill(); }
  if (small) {
    c.fillStyle = '#3d7dd8'; c.beginPath(); c.arc(hx, hy - 4, hr + 1, Math.PI, 0); c.fill();
    c.strokeStyle = '#555'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx, hy - hr - 4); c.lineTo(hx, hy - hr - 9); c.stroke();
    c.strokeStyle = '#e24a2c'; c.lineWidth = 3; const a = G * 14; c.beginPath(); c.moveTo(hx - Math.cos(a) * 10, hy - hr - 9); c.lineTo(hx + Math.cos(a) * 10, hy - hr - 9); c.stroke();
  }
  if (t === 'pressa') { c.fillStyle = '#e24a2c'; c.fillRect(hx - hr + 1, hy - 13, hr * 2 - 2, 5); c.fillStyle = '#8fd3ff'; ell(c, hx + hr - 1, hy - 2 + Math.sin(G * 6) * 2, 3, 4.5); c.fill(); }
  const blink = Math.sin(G * 1.4 + cu.seed * 20) > .985;
  c.fillStyle = '#231510'; c.strokeStyle = '#231510'; c.lineWidth = 2.2; c.lineCap = 'round';
  if (t === 'vip') { c.fillStyle = '#111'; rr(c, hx - 15, hy - 4, 12, 8, 3); c.fill(); rr(c, hx + 3, hy - 4, 12, 8, 3); c.fill(); c.fillRect(hx - 3, hy - 2, 6, 2); }
  else if (blink) { c.beginPath(); c.moveTo(hx - 11, hy); c.lineTo(hx - 5, hy); c.moveTo(hx + 5, hy); c.lineTo(hx + 11, hy); c.stroke(); }
  else { circ(c, hx - 8, hy, 2.8); c.fill(); circ(c, hx + 8, hy, 2.8); c.fill(); }
  if (t === 'avo') { c.strokeStyle = '#6a6a6a'; c.lineWidth = 1.5; circ(c, hx - 8, hy, 6); c.stroke(); circ(c, hx + 8, hy, 6); c.stroke(); c.strokeStyle = '#231510'; c.lineWidth = 2.2; }
  if (angry) { c.beginPath(); c.moveTo(hx - 13, hy - 8); c.lineTo(hx - 4, hy - 5); c.moveTo(hx + 13, hy - 8); c.lineTo(hx + 4, hy - 5); c.stroke(); }
  if (t === 'critico') { c.strokeStyle = '#2a1a12'; c.lineWidth = 3; c.beginPath(); c.moveTo(hx - 8, hy + 6); c.quadraticCurveTo(hx, hy + 2, hx + 8, hy + 6); c.stroke(); c.strokeStyle = '#231510'; c.lineWidth = 2.2; }
  c.beginPath();
  if (mood === 'happy') { c.arc(hx, hy + 8, 8, .1 * Math.PI, .9 * Math.PI); c.fillStyle = '#6b1f16'; c.fill(); }
  else if (mood === 'ok') { c.arc(hx, hy + 7, 6, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
  else if (mood === 'meh') { c.moveTo(hx - 5, hy + 12); c.lineTo(hx + 5, hy + 12); c.stroke(); }
  else { c.arc(hx, hy + 17, 6, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
  if (t === 'indeciso' && (!cu.changed || cu.qT > 0)) label(c, cu.qT > 0 ? '!' : '?', hx + hr + 4, hy - hr + Math.sin(G * 5) * 3, 20, '#b8f09a');
}
function drawCustomer(c, cu) {
  const sx = SLOTS[cu.slot], hx = sx - 32;
  let off = 0;
  if (cu.st === 'in') off = (1 - ease(cu.t / .45)) * 95;
  if (cu.st === 'leave') off = ease(cu.t / .6) * 95;
  const ratio = cu.pat / cu.max;
  const mood = cu.mood || (ratio > .5 ? 'ok' : ratio > .25 ? 'meh' : 'mad');
  c.save(); c.beginPath(); c.rect(0, 0, KW, 150); c.clip();
  c.translate(0, off); drawPerson(c, hx, 0, cu, mood); c.restore();
  if (cu.st !== 'leave') {
    const a = cu.st === 'in' ? ease(cu.t / .45) : 1, shake = cu.qT > 0 ? Math.sin(G * 50) * 3 : 0;
    c.save(); c.globalAlpha = a; c.translate(shake, 0);
    c.fillStyle = '#fffaf0'; rr(c, sx - 2, 8, 86, 76, 14); c.fill();
    c.beginPath(); c.moveTo(sx + 2, 60); c.lineTo(sx - 12, 70); c.lineTo(sx + 8, 70); c.closePath(); c.fill();
    drawPizza(c, sx + 41, 46, 29, cu.preview);
    const ct = CTYPES[cu.type];
    if (ct.tag) {
      c.font = '600 10px Rubik, system-ui, sans-serif'; const tw = c.measureText(ct.tag).width + 12;
      c.fillStyle = ct.tagc; rr(c, sx + 41 - tw / 2, 78, tw, 14, 7); c.fill();
      c.fillStyle = '#1a1210'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ct.tag, sx + 41, 85.5);
    }
    c.restore();
  }
}

/* ---------- tetris ---------- */
const TPIECES = {
  I: { c: '#e24a2c', s: [[0, 1], [1, 1], [2, 1], [3, 1]], n: 4 }, O: { c: '#f4c343', s: [[1, 0], [2, 0], [1, 1], [2, 1]], n: 4 },
  T: { c: '#8a4fd6', s: [[1, 0], [0, 1], [1, 1], [2, 1]], n: 3 }, S: { c: '#6db552', s: [[1, 0], [2, 0], [0, 1], [1, 1]], n: 3 },
  Z: { c: '#c0392b', s: [[0, 0], [1, 0], [1, 1], [2, 1]], n: 3 }, J: { c: '#3d7dd8', s: [[0, 0], [0, 1], [1, 1], [2, 1]], n: 3 },
  L: { c: '#d98c3a', s: [[2, 0], [0, 1], [1, 1], [2, 1]], n: 3 },
};
function newTetris() {
  const t = { grid: Array.from({ length: TH }, () => Array(TW).fill(null)), bag: [], cur: null, next: null, fall: 0, lines: 0 };
  t.next = bagNext(t); spawnPiece(t); return t;
}
function bagNext(t) {
  if (!t.bag.length) t.bag = Object.keys(TPIECES).map(k => [S.rt(), k]).sort((a, b) => a[0] - b[0]).map(e => e[1]);
  return t.bag.pop();
}
function spawnPiece(t) {
  const k = t.next; t.next = bagNext(t);
  t.cur = { k, cells: TPIECES[k].s.map(a => [...a]), x: 3, y: 0 };
  t.fall = 0;
  return fits(t, t.cur.cells, t.cur.x, t.cur.y);
}
function fits(t, cells, x, y) {
  return cells.every(([cx, cy]) => { const gx = x + cx, gy = y + cy; return gx >= 0 && gx < TW && gy < TH && (gy < 0 || !t.grid[gy][gx]); });
}
const tOK = () => S.sd && S.tet && S.tet.cur && S.mode === 'play';
function tMove(dx) { if (!tOK()) return; const t = S.tet; if (fits(t, t.cur.cells, t.cur.x + dx, t.cur.y)) t.cur.x += dx; }
function tRotate() {
  if (!tOK()) return; const t = S.tet; if (t.cur.k === 'O') return;
  const n = TPIECES[t.cur.k].n, r = t.cur.cells.map(([x, y]) => [n - 1 - y, x]);
  for (const off of [0, -1, 1, -2, 2]) if (fits(t, r, t.cur.x + off, t.cur.y)) { t.cur.cells = r; t.cur.x += off; return; }
}
function tSoft() { if (!tOK()) return; const t = S.tet; if (fits(t, t.cur.cells, t.cur.x, t.cur.y + 1)) { t.cur.y++; t.fall = 0; S.score += 1; } else tLock(); }
function tHard() {
  if (!tOK()) return; const t = S.tet; let d = 0;
  while (fits(t, t.cur.cells, t.cur.x, t.cur.y + 1)) { t.cur.y++; d++; }
  S.score += d * 2; tLock();
}
function tLock() {
  const t = S.tet;
  for (const [cx, cy] of t.cur.cells) { const gy = t.cur.y + cy; if (gy < 0) { gameOver('tetris'); return; } t.grid[gy][t.cur.x + cx] = TPIECES[t.cur.k].c; }
  const full = []; for (let y = 0; y < TH; y++) if (t.grid[y].every(Boolean)) full.push(y);
  if (full.length) {
    for (const y of full) { t.grid.splice(y, 1); t.grid.unshift(Array(TW).fill(null)); }
    const n = Math.min(4, full.length), coins = [0, 10, 25, 45, 80][n], pts = [0, 100, 250, 450, 800][n];
    t.lines += n; S.coins += coins; S.score += pts;
    float('t', TCW / 2, TTOP + full[0] * TS, '+' + coins + ' moedas', '#f4c343', 14);
    for (const y of full) burst('t', TCW / 2, TTOP + y * TS + TS / 2, '#f4c343', 10, 120, 100, 3);
    bump('#coins'); sfx.coin();
  } else sfx.tick();
  if (!spawnPiece(t)) gameOver('tetris');
}
function addGarbage(n) {
  const t = S.tet; if (!t) return;
  for (let i = 0; i < n; i++) {
    const top = t.grid.shift();
    if (top.some(Boolean)) { gameOver('tetris'); return; }
    const gap = Math.floor(Math.random() * TW);
    t.grid.push(Array.from({ length: TW }, (_, x) => x === gap ? null : '#6b6158'));
  }
  while (t.cur && !fits(t, t.cur.cells, t.cur.x, t.cur.y) && t.cur.y > -3) t.cur.y--;
  if (t.cur && !fits(t, t.cur.cells, t.cur.x, t.cur.y)) gameOver('tetris');
}
function tetUpdate(dt) {
  const t = S.tet; if (!t || !t.cur) return;
  t.fall += dt;
  const g = Math.max(.2, .8 - S.sdT * .003);
  if (t.fall >= g) { t.fall = 0; if (fits(t, t.cur.cells, t.cur.x, t.cur.y + 1)) t.cur.y++; else tLock(); }
}
function drawBlock(c, px, py, s, col) {
  c.fillStyle = col; rr(c, px + 1, py + 1, s - 2, s - 2, 4); c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; rr(c, px + 3, py + 3, s - 8, 3.5, 2); c.fill();
  c.fillStyle = 'rgba(0,0,0,.18)'; circ(c, px + s * .62, py + s * .62, s * .14); c.fill();
}

/* ---------- som ---------- */
let AC = null, muted = false, lastShot = 0;
function audioOn() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
}
function snd(f, d = .08, type = 'square', v = .045, slide = 0, delay = 0) {
  if (!AC || muted) return;
  const t0 = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + d + .03);
}
function noise(d = .4, v = .12) {
  if (!AC || muted) return;
  const n = AC.sampleRate * d, buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = AC.createBufferSource(), g = AC.createGain(); g.gain.value = v;
  s.buffer = buf; s.connect(g).connect(AC.destination); s.start();
}
const sfx = {
  pop: () => snd(420, .06, 'triangle', .05, 1.6),
  tick: () => snd(240, .04, 'square', .025),
  err: () => snd(150, .12, 'square', .03),
  ding: () => { snd(880, .15, 'sine', .07); snd(1320, .2, 'sine', .05, 0, .08); },
  coin: () => { snd(990, .08, 'square', .035); snd(1480, .14, 'square', .035, 0, .07); },
  shoot: () => { const n = performance.now(); if (n - lastShot < 90) return; lastShot = n; snd(300, .05, 'triangle', .025, .6); },
  hit: () => snd(120, .05, 'square', .02, .7),
  place: () => snd(260, .1, 'triangle', .06, 1.5),
  angry: () => snd(200, .3, 'sawtooth', .05, .5),
  chomp: () => snd(90, .08, 'sawtooth', .03, .8),
  boom: () => { noise(.5, .16); snd(90, .4, 'sine', .12, .4); },
  wave: () => { snd(330, .18, 'sawtooth', .04); snd(247, .3, 'sawtooth', .04, 0, .16); },
  cutter: () => snd(700, .5, 'sawtooth', .03, 2.2),
  sab: () => { snd(520, .12, 'sawtooth', .04, .5); snd(390, .2, 'sawtooth', .04, .5, .1); },
  sd: () => { snd(220, .3, 'sawtooth', .06); snd(165, .5, 'sawtooth', .06, 0, .25); noise(.3, .06); },
};

/* ---------- estado ---------- */
let G = 0;
let S;
// Morte súbita aos 3 min; com ?teste no endereço começa aos 15 s (para testar).
const SD_AT = new URLSearchParams(location.search).has('teste') ? 15 : 180;
// Nas fases da história, a morte súbita só acontece se a fase a pedir (sdAt).
const sdAtNow = () => S.story ? (S.story.sdAt ?? Infinity) : SD_AT;
function freshState(seed = (Math.random() * 2 ** 31) | 0, mp = false, story = null) {
  return {
    mode: 'play', mp, story, rc: mulberry(seed), rw: mulberry(seed ^ 0x2545F491), rt: mulberry(seed ^ 0x51ED27), time: 0,
    coins: story ? story.coins : 100, score: 0, hearts: 3, wave: 0,
    nextWave: story ? (story.zombies.length ? story.firstWave : Infinity) : 15, queue: [],
    board: null, ovens: [null, null], rack: [null, null, null], custs: [], custTimer: 1,
    towers: [], zombies: [], shots: [], rollers: [], parts: [], floats: [], flyers: [],
    cutters: Array.from({ length: ROWS }, () => ({ st: 'ready', x: GX - 22 })),
    tool: null, served: 0, kills: 0, shake: 0, banner: null,
    burnt: 0, fx: {}, fxTop: null, shield: false, sabCd: 0, sd: false, sdT: 0, tet: null, earned: null,
  };
}
function demoState() {
  const s = freshState(); s.mode = 'menu'; s.wave = 6; s.time = 120; s.nextWave = 130;
  s.board = makePizza(['molho', 'queijo', 'pepperoni']);
  s.ovens[0] = makePizza(['molho', 'queijo', 'cogumelo'], 3.2);
  s.ovens[1] = makePizza(['molho', 'queijo'], 6.5);
  s.rack[0] = makePizza(['molho', 'queijo', 'azeitona'], 6);
  const a = newCustomer(0, 3, Math.random, 'vip'), b = newCustomer(1, 3, Math.random, 'crianca'), cc = newCustomer(2, 3, Math.random, 'critico');
  a.st = b.st = cc.st = 'wait'; cc.pat = cc.max * .3; s.custs.push(a, b, cc);
  [['azeitoneira', 0, 1], ['azeitoneira', 2, 1], ['muro', 2, 4], ['queijeira', 3, 0], ['azeitoneira', 4, 2], ['muro', 1, 3], ['queijeira', 1, 0]]
    .forEach(([type, r, col]) => s.towers.push(mkTower(type, r, col)));
  [['normal', 2, 370], ['caixa', 0, 560], ['mota', 4, 470], ['ladrao', 3, 600], ['chef', 1, 660], ['gordo', 0, 400]]
    .forEach(([type, row, x]) => { const z = mkZombie(type, row, 1); z.x = x; s.zombies.push(z); });
  s.zombies[0].eating = true; s.zombies[0].hp *= .6;
  s.shots.push({ x: 180, y: GY + 2 * CH + CH / 2 - 13, row: 2, kind: 'olive', dmg: 0, vx: 0 });
  s.burnt = 1;
  return s;
}
function mkTower(type, r, col) {
  const d = TOWERS[type];
  return { type, r, c: col, x: GX + col * CW + CW / 2, y: GY + r * CH + CH / 2, hp: d.hp, max: d.hp, cd: .5, anim: rand(0, 6), recoil: 0, hit: 0, fuse: type === 'pimenta' ? 1 : null };
}
function mkZombie(type, row, mult, spdF = rand(.92, 1.08)) {
  const d = ZT[type];
  return { type, row, x: DW + 30, hp: d.hp * mult, max: d.hp * mult, spd: d.spd * spdF, dps: d.dps, slow: 0, flash: 0, anim: rand(0, 6), eating: false,
    box: type === 'caixa', bike: type === 'mota', jump: null, loot: 0, stealT: 0 };
}
const sdI = () => S.sd ? Math.min(1, S.sdT / 120) : 0;
const sdSpeed = () => S.sd ? 1.2 + .2 * sdI() : 1;
const scoreMul = () => S.sd ? 1.5 : 1;

/* ---------- efeitos ---------- */
function burst(w, x, y, col, n = 8, sp = 90, g = 200, size = 3) {
  if (REDUCED) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), v = rand(.3, 1) * sp;
    S.parts.push({ w, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .3, g, life: rand(.35, .7), max: .7, col, size: rand(.6, 1.2) * size });
  }
}
function float(w, x, y, txt, col = '#fff', size = 17) { S.floats.push({ w, x, y, txt, col, size, t: 0 }); }
const toast = (txt, x = 118, y = 236, col = '#fff') => float('k', x, y, txt, col, 15);

/* ---------- cozinha ---------- */
const BOARD = { x: 118, y: 334, r: 90 };
const OVEN = { x: 236, y: 208, w: 190, h: 240 };
const ovenY = i => 246 + i * 100;
const RACK = { x: 492, y: i => 268 + i * 74, r: 32 };

function addDough() {
  if (S.board) { toast('Já há uma pizza na bancada'); sfx.err(); return; }
  S.board = newPizza(); burst('k', BOARD.x, BOARD.y, '#f7ecd6', 12, 120, 60, 4); sfx.pop();
}
function addTopping(t) {
  if (S.story && !S.story.tops.includes(t)) { toast('Ainda não tens ' + TOPS[t].label.toLowerCase() + ' nesta fase', BOARD.x, 236, '#ffd2c4'); sfx.err(); return; }
  if (S.fx.ingred > 0 && S.fxTop === t) { toast('Acabou o stock: ' + TOPS[t].label.toLowerCase() + '!', BOARD.x, 236, '#ffb3a0'); sfx.err(); return; }
  if (!S.board) { toast('Primeiro a massa (D)', BOARD.x, 236, '#ffd2c4'); sfx.err(); return; }
  if (!addTop(S.board, t)) { toast('Já tem ' + TOPS[t].label.toLowerCase()); sfx.err(); return; }
  burst('k', BOARD.x + rand(-30, 30), BOARD.y + rand(-30, 30), TOPS[t].color, 7, 80, 80, 3); sfx.pop();
}
function trashBoard() {
  if (!S.board) return;
  S.board = null; toast('Pizza para o lixo', BOARD.x, 236, '#ffd2c4'); burst('k', BOARD.x, BOARD.y, '#8a6a4a', 10, 100); sfx.err();
}
function toOven(i) {
  if (!S.board) { toast('Não há pizza na bancada'); sfx.err(); return; }
  if (i == null) i = S.ovens.findIndex(o => !o);
  if (i < 0 || S.ovens[i]) { toast('O forno está cheio', 331, 226, '#ffd2c4'); sfx.err(); return; }
  S.ovens[i] = S.board; S.board = null; sfx.place();
}
function ovenClick(i) {
  const p = S.ovens[i], y = ovenY(i);
  if (!p) { if (S.board) toOven(i); else toast('Forno vazio', 331, y + 30); return; }
  const st = pizzaState(p);
  if (st === 'raw') { toast(S.fx.forno > 0 ? 'O forno está avariado!' : 'Ainda está a cozer', 331, y + 30); sfx.err(); return; }
  if (st === 'burnt') {
    S.ovens[i] = null; burst('k', 331, y + 40, '#444', 14, 70, -40, 5);
    if (S.burnt < 3) { S.burnt++; toast('Queimada! Guardada como arma (B)', 331, y + 30, '#ffb37a'); sfx.pop(); }
    else { toast('Queimada! Já tens 3 guardadas', 331, y + 30, '#ff9a80'); sfx.err(); }
    return;
  }
  const j = S.rack.findIndex(r => !r);
  if (j < 0) { toast('Prateleira cheia', 331, y + 30, '#ffd2c4'); sfx.err(); return; }
  S.rack[j] = p; S.ovens[i] = null;
  S.flyers.push({ p, x0: 331, y0: y + 40, x1: RACK.x, y1: RACK.y(j), t: 0, d: .25, r0: 30, r1: 26 });
  sfx.pop();
}
// Tirar do forno pelo teclado: primeiro a pizza pronta mais perto de queimar, depois as queimadas.
function takeOut() {
  let best = -1, bb = -1;
  S.ovens.forEach((p, i) => { if (p && pizzaState(p) === 'cooked' && p.bake > bb) { bb = p.bake; best = i; } });
  if (best < 0) S.ovens.forEach((p, i) => { if (p && pizzaState(p) === 'burnt' && best < 0) best = i; });
  if (best < 0) { toast(S.ovens.some(Boolean) ? 'Ainda nenhuma está pronta' : 'O forno está vazio', 331, 226, '#ffd2c4'); sfx.err(); return; }
  ovenClick(best);
}
// Entregar pelo teclado: ao cliente com menos paciência que tenha a pizza certa na prateleira.
function deliverAuto() {
  let best = null;
  for (const cu of S.custs) {
    if (cu.st === 'leave' || !S.rack.some(p => p && keyOf(p.tops) === cu.key)) continue;
    if (!best || cu.pat / cu.max < best.pat / best.max) best = cu;
  }
  if (!best) { toast(S.rack.some(Boolean) ? 'Nenhuma pizza pronta bate com os pedidos' : 'Ainda não há pizzas prontas', RACK.x - 60, 226, '#ffd2c4'); sfx.err(); return; }
  deliver(best);
}
function rackClick(i) {
  if (!S.rack[i]) return;
  S.rack[i] = null; toast('Deitada fora', RACK.x - 20, RACK.y(i) - 40, '#ffd2c4'); burst('k', RACK.x, RACK.y(i), '#8a6a4a', 8, 80); sfx.err();
}
function deliver(cu) {
  if (cu.st === 'leave') return;
  const sx = SLOTS[cu.slot];
  const i = S.rack.findIndex(p => p && keyOf(p.tops) === cu.key);
  if (i < 0) { toast(S.rack.some(Boolean) ? 'Nenhuma pizza pronta é esta' : 'Ainda não há pizzas prontas', sx + 20, 120, '#ffd2c4'); sfx.err(); return; }
  const p = S.rack[i]; S.rack[i] = null;
  const ct = CTYPES[cu.type], ratio = cu.pat / cu.max, extras = cu.order.length - 2, tip = Math.round(ratio * 10);
  const pay = Math.round((18 + 7 * extras + tip) * ct.pay) + (cu.type === 'avo' ? 10 : 0);
  S.coins += pay; S.score += (100 + extras * 30 + tip * 10) * ct.pay * scoreMul(); S.served++;
  cu.st = 'leave'; cu.t = 0; cu.mood = 'happy';
  S.flyers.push({ p, x0: RACK.x, y0: RACK.y(i), x1: sx + 41, y1: 46, t: 0, d: .3, r0: 26, r1: 18, fade: true });
  float('k', sx + 10, 118, '+' + pay + ' moedas', '#f4c343', 20);
  burst('k', sx + 10, 118, '#f4c343', 10, 110, 200, 3);
  if (cu.type === 'critico' && S.hearts < 3) { S.hearts++; float('k', sx + 10, 96, '+1 reputação', '#b8f09a', 15); }
  if (S.mp && ratio >= .5) { sendEv('z'); float('k', sx + 10, 150, 'Zombie enviado aos rivais!', '#d2b4ff', 14); }
  bump('#coins'); sfx.coin();
}

/* ---------- esplanada ---------- */
function selectTool(t) {
  if (TOWERS[t] && S.story && !S.story.towers.includes(t)) { float('d', DW / 2, 70, 'Ainda não desbloqueaste esta defesa', '#ffd2c4', 16); sfx.err(); return; }
  if ((t === 'pa' || t === 'queimada') && S.fx.itens > 0) { float('d', DW / 2, 70, 'Mãos atadas! Não podes usar itens.', '#ffb3a0', 16); sfx.err(); return; }
  if (t === 'queimada' && S.burnt <= 0 && S.tool !== 'queimada') { float('d', DW / 2, 70, 'Não tens pizzas queimadas. Deixa uma queimar no forno.', '#ffd2c4', 15); sfx.err(); return; }
  if (TOWERS[t] && S.fx.loja > 0) { float('d', DW / 2, 70, 'Loja fechada!', '#ffb3a0', 18); sfx.err(); return; }
  S.tool = S.tool === t ? null : t;
  if (S.tool && TOWERS[S.tool] && S.coins < TOWERS[S.tool].cost) { float('d', DW / 2, 70, `Faltam ${TOWERS[S.tool].cost - S.coins} moedas. Faz mais pizzas!`, '#ffd2c4', 17); sfx.err(); }
  syncTools();
}
function cellClick(r, col) {
  const occ = S.towers.find(t => t.r === r && t.c === col);
  const cx = GX + col * CW + CW / 2, cy = GY + r * CH + CH / 2;
  if (S.tool === 'queimada') {
    if (S.fx.itens > 0) { selectTool(null); return; }
    if (S.burnt <= 0) { S.tool = null; syncTools(); return; }
    S.burnt--; S.rollers.push({ row: r, x: GX - 10, rot: 0, hit: new Set() });
    float('d', cx, cy - 20, 'Lá vai!', '#ffb37a', 15); sfx.cutter();
    if (S.burnt <= 0) S.tool = null; syncTools(); return;
  }
  if (cx > TET_COVER) { float('d', TET_COVER - 90, cy, 'Tapado pelo Tetris', '#ffd2c4', 14); sfx.err(); return; }
  if (S.tool === 'pa') {
    if (!occ || occ.type === 'pimenta') return;
    const back = Math.floor(TOWERS[occ.type].cost / 2);
    occ.dead = true; S.coins += back; float('d', cx, cy - 20, '+' + back, '#f4c343'); burst('d', cx, cy + 20, '#8a6a4a', 10, 90);
    S.tool = null; syncTools(); sfx.pop(); return;
  }
  if (!S.tool) { if (!occ) float('d', cx, cy, 'Escolhe uma defesa em baixo', '#fff', 14); return; }
  if (S.fx.loja > 0) { float('d', cx, cy, 'Loja fechada!', '#ffb3a0', 15); sfx.err(); return; }
  const d = TOWERS[S.tool];
  if (occ) { float('d', cx, cy, 'Casa ocupada', '#ffd2c4', 14); sfx.err(); return; }
  if (S.coins < d.cost) { float('d', cx, cy, `Faltam ${d.cost - S.coins} moedas`, '#ffd2c4', 15); sfx.err(); return; }
  S.coins -= d.cost; S.towers.push(mkTower(S.tool, r, col));
  burst('d', cx, cy + 30, '#6b5030', 10, 80, 150, 3); sfx.place();
  S.tool = null; syncTools();
}
const rowGround = r => GY + r * CH + CH - 10;
function hitZombie(z, dmg, slow) {
  z.hp -= dmg; z.flash = .08; if (slow) z.slow = 3;
  if (z.box && z.hp < z.max * .45) { z.box = false; burst('d', z.x, rowGround(z.row) - 80, '#d9b27a', 8, 90, 300, 4); }
}
function killZombie(z) {
  if (z.dead) return;
  z.dead = true; S.kills++;
  const pts = ZT[z.type].pts * scoreMul(); S.score += pts;
  const k = ZSTYLE[z.type].k;
  burst('d', z.x, rowGround(z.row) - 40 * k, '#8db278', 14 * k, 140, 300, 4);
  float('d', z.x, rowGround(z.row) - 70 * k, '+' + Math.round(pts), '#cde8b8', 14);
  if (z.type === 'gordo') for (const dxx of [-12, 14]) {
    const m = mkZombie('mini', z.row, z.max / ZT.gordo.hp, 1); m.x = z.x + dxx; m.sent = z.sent; m.spd *= sdSpeed(); S.zombies.push(m);
  }
  if (z.type === 'ladrao' && z.loot > 0) { const back = z.loot + 5; S.coins += back; float('d', z.x, rowGround(z.row) - 100, '+' + back + ' recuperadas', '#f4c343', 15); bump('#coins'); }
  if (z.type === 'gigante') { S.shake = .4; sfx.boom(); }
}
function explode(t) {
  for (const z of S.zombies) if (Math.abs(z.row - t.r) <= 1 && Math.abs(z.x - t.x) < CW * 1.6) hitZombie(z, 900);
  burst('d', t.x, t.y, '#ff7a2a', 30, 260, 120, 6); burst('d', t.x, t.y, '#ffd24a', 20, 200, 80, 4);
  S.shake = .35; sfx.boom();
}
function pickZType(w, R, allowed) {
  const av = allowed ? WTAB.filter(e => allowed.includes(e[0])) : WTAB.filter(e => w >= e[1]);
  if (!av.length) return 'normal';
  const ws = av.map(e => e[2] * (e[0] === 'normal' ? 1 : 1 + w * .05));
  let r = R() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < av.length; i++) { r -= ws[i]; if (r <= 0) return av[i][0]; }
  return 'normal';
}
const WAVE_NEW = {
  1: 'Os primeiros zombies estão a chegar', 2: 'Zombies com caixas de pizza na cabeça', 3: 'Estafetas da concorrência: são rápidos',
  4: 'Estafetas de mota: saltam a primeira defesa', 5: 'Chegou o Rei Zombie! E também gulosos e chefs', 6: 'Ladrões: roubam moedas enquanto andam',
};
function buildWave(w) {
  const R = S.rw, n = Math.round((S.story ? 2 + w * 1.5 : 2 + w * 1.8) * (S.sd ? 1.4 + .4 * sdI() : 1));
  const span = Math.min(26, 12 + w * 2), mult = 1 + (w - 1) * .08;
  let lastRow = -1;
  for (let i = 0; i < n; i++) {
    const type = pickZType(w, R, S.story && S.story.zombies);
    let row; do { row = Math.floor(R() * ROWS); } while (row === lastRow && R() < .6);
    lastRow = row;
    S.queue.push({ at: S.time + i / n * span + R() * 1.2, type, row, mult, spdF: .92 + R() * .16 });
  }
  const boss = S.story ? (S.story.boss && w === S.story.goal.n) : w % 5 === 0;
  if (boss) S.queue.push({ at: S.time + span * .5, type: 'gigante', row: Math.floor(R() * ROWS), mult, spdF: 1 });
  S.queue.sort((a, b) => a.at - b.at);
  const last = S.story && S.story.goal.type === 'waves' && w === S.story.goal.n;
  const sub = S.story ? (boss ? 'O Rei Zombie chegou!' : last ? 'Última onda: aguenta!' : `${n} zombies a caminho`)
    : WAVE_NEW[w] || (w % 5 === 0 ? 'O Rei Zombie voltou!' : `${n} zombies a caminho`);
  S.banner = { txt: (S.sd ? 'Morte súbita · ' : '') + 'Onda ' + w + (S.story && S.story.goal.type === 'waves' ? ' de ' + S.story.goal.n : ''), sub, t: 0 };
  sfx.wave();
}
function startSD() {
  S.sd = true; S.sdT = 0; S.tet = newTetris(); S.coins += 100; S.nextWave = S.time + 3;
  S.banner = { txt: 'MORTE SÚBITA', sub: 'Tudo mais rápido. Joga o Tetris com as setas! +100 moedas', t: 0 };
  float('k', KW / 2, 200, '+100 moedas de bónus', '#f4c343', 20); bump('#coins');
  sfx.sd(); syncStage();
}

/* ---------- sabotagens ---------- */
const SABS = [
  { id: 'forno', name: 'Forno avariado', cost: 60, desc: 'Os fornos do rival param durante 8 s.' },
  { id: 'horda', name: 'Horda', cost: 50, desc: 'Manda 4 zombies ao rival.' },
  { id: 'chef', name: 'Chef furioso', cost: 95, desc: 'Manda um chef zombie ao rival.' },
  { id: 'loja', name: 'Loja fechada', cost: 70, desc: 'O rival não compra defesas nem sabotagens durante 10 s.' },
  { id: 'itens', name: 'Mãos atadas', cost: 45, desc: 'O rival não usa a pá nem pizzas queimadas durante 12 s.' },
  { id: 'ingred', name: 'Falta de stock', cost: 55, desc: 'Um ingrediente do rival esgota durante 10 s.' },
  { id: 'apagao', name: 'Apagão', cost: 65, desc: 'A cozinha do rival fica às escuras durante 8 s.' },
  { id: 'pressa', name: 'Clientes impacientes', cost: 55, desc: 'A paciência dos clientes do rival cai a dobrar durante 10 s.' },
  { id: 'nevoeiro', name: 'Nevoeiro', cost: 50, desc: 'A esplanada do rival fica com nevoeiro durante 10 s.' },
  { id: 'lixo', name: 'Peças de lixo', cost: 60, sd: true, desc: 'Junta 2 linhas de lixo ao Tetris do rival (só na morte súbita).' },
  { id: 'escudo', name: 'Escudo', cost: 40, self: true, desc: 'Bloqueia a próxima sabotagem que receberes.' },
];
const SABMAP = Object.fromEntries(SABS.map(s => [s.id, s]));
const FX_LABEL = { forno: 'Forno avariado', loja: 'Loja fechada', itens: 'Mãos atadas', ingred: 'Sem stock', apagao: 'Apagão', pressa: 'Clientes impacientes', nevoeiro: 'Nevoeiro' };
const FX_DUR = { forno: 8, loja: 10, itens: 12, ingred: 10, apagao: 8, pressa: 10, nevoeiro: 10 };
function buySab(id) {
  const d = SABMAP[id];
  if (!S.mp || S.mode !== 'play') return;
  if (S.fx.loja > 0) { float('d', DW / 2, 70, 'Loja fechada!', '#ffb3a0', 18); sfx.err(); return; }
  if (S.sabCd > 0) { float('d', DW / 2, 70, `Espera ${Math.ceil(S.sabCd)} s`, '#ffd2c4', 16); sfx.err(); return; }
  if (d.sd && !S.sd) { float('d', DW / 2, 70, 'Só na morte súbita', '#ffd2c4', 16); sfx.err(); return; }
  if (S.coins < d.cost) { float('d', DW / 2, 70, `Faltam ${d.cost - S.coins} moedas`, '#ffd2c4', 16); sfx.err(); return; }
  if (d.self) {
    if (S.shield) { float('d', DW / 2, 70, 'Já tens um escudo ativo', '#bfe6ff', 16); return; }
    S.shield = true;
  } else {
    if (!rivalsAlive()) { float('d', DW / 2, 70, 'Não há rivais em jogo', '#ffd2c4', 16); return; }
    sendEv(id);
  }
  S.coins -= d.cost; S.sabCd = 5;
  float('d', DW / 2, 70, d.self ? 'Escudo ativo' : d.name + ' enviado!', d.self ? '#bfe6ff' : '#d2b4ff', 18);
  sfx.sab(); syncTools(); renderEffects();
}
function applyEv(kind, from) {
  if (!S.mp || S.mode !== 'play') return;
  if (kind === 'z') { spawnSent('normal', from); return; }
  const d = SABMAP[kind]; if (!d || d.self) return;
  if (S.shield) { S.shield = false; float('d', DW / 2, 96, `Escudo bloqueou: ${d.name}`, '#bfe6ff', 16); sfx.pop(); renderEffects(); return; }
  if (kind === 'horda') { for (let i = 0; i < 4; i++) S.queue.push({ at: S.time + i * .7, type: pick(['normal', 'normal', 'estafeta', 'mota']), row: Math.floor(Math.random() * ROWS), mult: 1 + S.wave * .08, spdF: 1, sent: true }); S.queue.sort((a, b) => a.at - b.at); }
  else if (kind === 'chef') spawnSent('chef', null);
  else if (kind === 'lixo') addGarbage(2);
  else if (FX_DUR[kind]) {
    S.fx[kind] = FX_DUR[kind];
    if (kind === 'ingred') S.fxTop = pick(ORDER_TOPS);
    if (kind === 'itens' && (S.tool === 'pa' || S.tool === 'queimada')) S.tool = null;
    if (kind === 'loja' && TOWERS[S.tool]) S.tool = null;
  }
  S.banner = { txt: d.name + '!', sub: `Sabotagem de ${from}`, t: 0 };
  sfx.sab(); syncTools(); renderEffects();
}
function spawnSent(type, from) {
  const z = mkZombie(type, Math.floor(Math.random() * ROWS), 1 + S.wave * .08);
  z.sent = true; z.spd *= sdSpeed(); S.zombies.push(z);
  if (from) float('d', DW - 150, 64, from + ' mandou-te um zombie!', '#d2b4ff', 15);
  snd(520, .15, 'sawtooth', .04, .5);
}

/* ---------- ciclo ---------- */
function update(dt) {
  S.time += dt; S.score += dt * 2 * scoreMul();
  if (!S.sd && S.time >= sdAtNow()) startSD();
  if (S.sd) S.sdT += dt;
  for (const k in S.fx) S.fx[k] = Math.max(0, S.fx[k] - dt);
  S.sabCd = Math.max(0, S.sabCd - dt);

  S.custTimer -= dt;
  if (S.custTimer <= 0) {
    // o cliente é sempre gerado (mesma sequência para todos); só entra se houver lugar
    const cu = newCustomer(0, S.wave, S.rc, null, S.story ? { types: S.story.custs, extras: S.story.tops.filter(t => EXTRAS.includes(t)), maxE: S.story.maxE } : undefined);
    if (S.sd) { cu.max *= .85 - .1 * sdI(); cu.pat = cu.max; }
    const free = [0, 1, 2].filter(i => !S.custs.some(c => c.slot === i));
    if (free.length) { cu.slot = pick(free); S.custs.push(cu); }
    S.custTimer = (Math.max(5, 10.5 - S.wave * .55) + S.rc() * 3) * (S.sd ? .85 : 1);
  }
  for (const cu of S.custs) {
    cu.t += dt; cu.qT = Math.max(0, cu.qT - dt);
    if (cu.st === 'in' && cu.t >= .45) { cu.st = 'wait'; cu.t = 0; }
    else if (cu.st === 'wait') {
      cu.pat -= dt * (S.fx.pressa > 0 ? 2 : 1);
      if (cu.type === 'indeciso' && !cu.changed && cu.pat < cu.max * .55) {
        cu.changed = true; cu.order = cu.alt; cu.key = keyOf(cu.alt); cu.preview = makePizza(cu.alt, COOK + 1);
        cu.pat = Math.min(cu.max, cu.pat + cu.max * .3); cu.qT = 1.2;
        float('k', SLOTS[cu.slot] + 40, 100, 'Mudei de ideias!', '#b8f09a', 14); sfx.err();
      }
      if (cu.pat <= 0) {
        const loss = cu.type === 'critico' ? 2 : 1;
        cu.st = 'leave'; cu.t = 0; cu.mood = 'angry'; S.hearts -= loss;
        float('k', SLOTS[cu.slot] - 20, 110, `-${loss} reputação`, '#ff7a62', 19); sfx.angry();
        if (S.hearts <= 0) { gameOver('kitchen'); return; }
      }
    }
  }
  S.custs = S.custs.filter(cu => !(cu.st === 'leave' && cu.t > .6));

  S.ovens.forEach((p, i) => {
    if (!p) return;
    if (S.fx.forno > 0) { if (Math.random() < dt * 6) burst('k', 331 + rand(-50, 50), ovenY(i) + 10, '#ffd24a', 2, 60, 200, 2); return; }
    const before = pizzaState(p); p.bake += dt; const after = pizzaState(p);
    if (before === 'raw' && after === 'cooked') sfx.ding();
    if (before === 'cooked' && after === 'burnt') sfx.err();
    if (p.bake > COOK + 3 && Math.random() < dt * 10) S.parts.push({ w: 'k', x: 331 + rand(-30, 30), y: ovenY(i) + 10, vx: rand(-8, 8), vy: -40, g: -10, life: 1, max: 1, col: p.bake > BURN ? '#2a2a2a' : '#8a8a8a', size: rand(4, 7) });
  });

  const wavesDone = S.story && S.story.goal.type === 'waves' && S.wave >= S.story.goal.n;
  if (S.time >= S.nextWave && !wavesDone) { S.wave++; buildWave(S.wave); S.nextWave = S.time + (S.sd ? 24 : S.story ? S.story.gap : 32); }
  while (S.queue.length && S.queue[0].at <= S.time) {
    const q = S.queue.shift(), z = mkZombie(q.type, q.row, q.mult, q.spdF * sdSpeed());
    if (q.sent) z.sent = true;
    S.zombies.push(z);
  }

  for (const t of S.towers) {
    t.anim += dt; t.recoil = Math.max(0, t.recoil - dt * 5); t.hit -= dt;
    if (t.type === 'azeitoneira' || t.type === 'queijeira') {
      t.cd -= dt;
      if (t.cd <= 0 && S.zombies.some(z => z.row === t.r && z.x > t.x - 10 && z.x < DW + 5 && !z.jump)) {
        const q = t.type === 'queijeira';
        S.shots.push({ x: t.x + (q ? 18 : 24), y: t.y + (q ? 16 : -13), row: t.r, kind: q ? 'cheese' : 'olive', dmg: q ? 12 : 20, vx: q ? 260 : 340 });
        t.cd = q ? 2.1 : 1.35; t.recoil = 1; sfx.shoot();
      }
    }
    if (t.type === 'pimenta') { t.fuse -= dt; if (t.fuse <= 0) { explode(t); t.dead = true; } }
  }

  for (const z of S.zombies) {
    z.anim += dt; z.flash -= dt; z.slow -= dt;
    const f = z.slow > 0 ? .5 : 1;
    if (z.jump) {
      z.jump.t += dt; const tt = clamp(z.jump.t / .6, 0, 1);
      z.x = z.jump.x0 + (z.jump.x1 - z.jump.x0) * tt;
      if (tt >= 1) z.jump = null;
    } else {
      const tgt = S.towers.find(t => !t.dead && t.r === z.row && Math.abs(t.x - (z.x - 12)) < 24);
      if (tgt && z.type === 'mota' && z.bike) {
        z.bike = false; z.spd *= 15 / ZT.mota.spd; z.jump = { t: 0, x0: z.x, x1: tgt.x - 46 }; sfx.pop();
      } else if (tgt) {
        if (!z.eating) sfx.chomp();
        z.eating = true; tgt.hp -= z.dps * f * dt; tgt.hit = .08;
        if (tgt.hp <= 0) { tgt.dead = true; burst('d', tgt.x, tgt.y + 10, '#7a5a3a', 12, 110); sfx.chomp(); }
      } else { z.eating = false; z.x -= z.spd * f * dt; }
    }
    if (z.type === 'ladrao') {
      z.stealT += dt;
      if (z.stealT >= 1 && z.x < DW) { z.stealT = 0; const s = Math.min(2, S.coins); if (s > 0) { S.coins -= s; z.loot += s; float('d', z.x, rowGround(z.row) - 96, '-' + s, '#f4c343', 12); } }
    }
    if (z.type === 'gigante' && !z.eating && !REDUCED && Math.random() < dt * 1.2) S.shake = Math.max(S.shake, .08);
    const cut = S.cutters[z.row];
    if (z.x < GX + 8 && cut.st === 'ready') { cut.st = 'go'; sfx.cutter(); }
    if (z.x < 4 && cut.st === 'used') { gameOver('lawn'); return; }
  }
  S.cutters.forEach((cut, r) => {
    if (cut.st !== 'go') return;
    cut.x += 520 * dt;
    for (const z of S.zombies) if (z.row === r && Math.abs(z.x - cut.x) < 24) z.hp = 0;
    if (cut.x > DW + 30) cut.st = 'used';
  });
  for (const rl of S.rollers) {
    rl.x += 380 * dt; rl.rot += dt * 12;
    for (const z of S.zombies) if (z.row === rl.row && !rl.hit.has(z) && Math.abs(z.x - rl.x) < 22 && !z.jump) {
      rl.hit.add(z); hitZombie(z, 220); burst('d', z.x, rowGround(z.row) - 20, '#3b2216', 8, 110, 200, 3); sfx.hit();
    }
    if (rl.x > DW + 30) rl.dead = true;
  }
  for (const s of S.shots) {
    s.x += s.vx * dt;
    const z = S.zombies.find(z => !z.dead && z.hp > 0 && z.row === s.row && Math.abs(z.x - s.x) < 16 && !z.jump);
    if (z) { hitZombie(z, s.dmg, s.kind === 'cheese'); s.dead = true; burst('d', s.x, s.y, s.kind === 'cheese' ? SK('queijo').body : SK('azeitona').shot, 5, 70, 200, 2.5); sfx.hit(); }
    else if (s.x > DW + 20) s.dead = true;
  }
  for (const z of S.zombies) if (z.hp <= 0) killZombie(z);

  S.towers = S.towers.filter(t => !t.dead);
  S.zombies = S.zombies.filter(z => !z.dead);
  S.shots = S.shots.filter(s => !s.dead);
  S.rollers = S.rollers.filter(r => !r.dead);
  if (S.sd) { tetUpdate(dt); if (S.mode !== 'play') return; }
  if (S.story && goalDone()) { levelComplete(); return; }
  stepFx(dt);
}
function stepFx(dt) {
  for (const p of S.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }
  S.parts = S.parts.filter(p => p.life > 0);
  for (const f of S.floats) f.t += dt;
  S.floats = S.floats.filter(f => f.t < 1.1);
  for (const f of S.flyers) f.t += dt;
  S.flyers = S.flyers.filter(f => f.t < f.d);
  if (S.banner) { S.banner.t += dt; if (S.banner.t > 2.6) S.banner = null; }
  S.shake = Math.max(0, S.shake - dt);
}
function idle(dt) {
  for (const t of S.towers) t.anim += dt;
  for (const z of S.zombies) z.anim += dt;
  stepFx(dt);
}

/* ---------- desenho: cozinha ---------- */
let kMouse = null, dMouse = null;
function renderK() {
  const c = kx;
  drawWall(c, KW, 150, SK('parede'));
  drawAwning(c, 0, 0, KW, 12, teamColor(P.team));
  for (const cu of S.custs) drawCustomer(c, cu);
  drawCounter(c, 150, KW, 46, SK('balcao'));
  for (const cu of S.custs) {
    if (cu.st === 'leave') continue;
    const sx = SLOTS[cu.slot], ratio = clamp(cu.pat / cu.max, 0, 1);
    c.fillStyle = 'rgba(0,0,0,.4)'; rr(c, sx - 60, 168, 142, 10, 5); c.fill();
    c.fillStyle = ratio > .5 ? '#6db552' : ratio > .25 ? '#f4c343' : '#e24a2c';
    rr(c, sx - 60, 168, Math.max(10, 142 * ratio), 10, 5); c.fill();
    if (kMouse && kMouse.y < 196 && kMouse.x > sx - 62 && kMouse.x < sx + 86) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; rr(c, sx - 4, 6, 90, 80, 15); c.stroke(); }
  }
  drawFloor(c, 196, KW, KH, SK('chao'));

  label(c, 'BANCADA', BOARD.x, 226, 14, '#f7ecdc', 'rgba(0,0,0,.5)');
  const tb = SK('tabua');
  c.fillStyle = 'rgba(0,0,0,.3)'; circ(c, BOARD.x + 3, BOARD.y + 6, BOARD.r); c.fill();
  c.fillStyle = tb.wood; circ(c, BOARD.x, BOARD.y, BOARD.r); c.fill();
  c.strokeStyle = tb.ring; c.lineWidth = 3; circ(c, BOARD.x, BOARD.y, BOARD.r - 4); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) { c.beginPath(); c.arc(BOARD.x - 20, BOARD.y + 10, i * 22, -.6, 1.4); c.stroke(); }
  if (S.board) drawPizza(c, BOARD.x, BOARD.y, 74, S.board);
  else {
    c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,240,220,.6)'; c.lineWidth = 2; circ(c, BOARD.x, BOARD.y, 62); c.stroke(); c.setLineDash([]);
    label(c, 'Clica para', BOARD.x, BOARD.y - 9, 15, '#fff3e0', 'rgba(0,0,0,.55)');
    label(c, 'pôr massa', BOARD.x, BOARD.y + 11, 15, '#fff3e0', 'rgba(0,0,0,.55)');
  }
  if (kMouse && Math.hypot(kMouse.x - BOARD.x, kMouse.y - BOARD.y) < BOARD.r) {
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; circ(c, BOARD.x, BOARD.y, BOARD.r + 3); c.stroke();
    if (S.board) label(c, 'Clica: para o forno', BOARD.x, BOARD.y + BOARD.r + 12, 12, '#fff', '#1a1210');
  }
  drawOven(c);
  label(c, 'PRONTAS', RACK.x, 215, 14, '#f7ecdc', 'rgba(0,0,0,.5)');
  if (S.rack.some(Boolean)) label(c, 'entregar · ' + keyLabel(bindOf('entregar')), RACK.x - 8, 230, 11, '#f4c343', 'rgba(0,0,0,.6)');
  const pv = SK('prato');
  for (let i = 0; i < 3; i++) {
    const y = RACK.y(i);
    c.fillStyle = 'rgba(0,0,0,.3)'; circ(c, RACK.x + 2, y + 4, RACK.r); c.fill();
    c.fillStyle = pv.a; circ(c, RACK.x, y, RACK.r); c.fill();
    c.strokeStyle = pv.b; c.lineWidth = 2.5; circ(c, RACK.x, y, RACK.r - 5); c.stroke();
    if (S.rack[i]) {
      drawPizza(c, RACK.x, y, 26, S.rack[i]);
      if (kMouse && Math.hypot(kMouse.x - RACK.x, kMouse.y - y) < RACK.r) {
        c.fillStyle = '#e24a2c'; circ(c, RACK.x + 24, y - 24, 10); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(RACK.x + 20, y - 28); c.lineTo(RACK.x + 28, y - 20); c.moveTo(RACK.x + 28, y - 28); c.lineTo(RACK.x + 20, y - 20); c.stroke();
      }
    }
  }
  for (const f of S.flyers) {
    const t = ease(f.t / f.d), x = f.x0 + (f.x1 - f.x0) * t, y = f.y0 + (f.y1 - f.y0) * t - Math.sin(t * Math.PI) * 40;
    c.save(); if (f.fade) c.globalAlpha = 1 - t * .6; drawPizza(c, x, y, f.r0 + (f.r1 - f.r0) * t, f.p); c.restore();
  }
  drawFx(c, 'k');
  if (S.fx.apagao > 0) {
    const m = kMouse || { x: KW / 2, y: KH / 2 };
    const g = c.createRadialGradient(m.x, m.y, 40, m.x, m.y, 120);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(5,3,2,.95)');
    c.fillStyle = g; c.fillRect(0, 0, KW, KH);
    label(c, 'APAGÃO', KW / 2, 24, 18, '#ffc6e8');
  }
}
function drawOven(c) {
  const { x: x0, y: y0, w, h } = OVEN, v = SK('forno'), broken = S.fx.forno > 0;
  c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, x0 + 3, y0 + 6, w, h, 26); c.fill();
  c.fillStyle = v.body; rr(c, x0, y0, w, h, 26); c.fill();
  c.save(); rr(c, x0, y0, w, h, 26); c.clip();
  c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1;
  for (let y = y0 + 8, row = 0; y < y0 + h; y += 16, row++) {
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke();
    for (let x = x0 + (row % 2 ? 12 : 30); x < x0 + w; x += 36) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 16); c.stroke(); }
  }
  c.restore();
  label(c, broken ? 'AVARIADO' : 'FORNO', x0 + w / 2, y0 + 20, 17, broken ? '#ffc6e8' : v.text, 'rgba(0,0,0,.45)');
  for (let i = 0; i < 2; i++) {
    const oy = ovenY(i), ox = x0 + 22, ow = w - 44, p = S.ovens[i];
    c.fillStyle = '#1b0d08'; rr(c, ox, oy, ow, 70, 26); c.fill();
    if (!broken) {
      const fl = .55 + Math.sin(G * 9 + i) * .08 + Math.sin(G * 23 + i * 3) * .05;
      const rg = c.createRadialGradient(ox + ow / 2, oy + 62, 4, ox + ow / 2, oy + 62, 70);
      rg.addColorStop(0, `rgba(255,140,40,${fl})`); rg.addColorStop(1, 'rgba(255,90,20,0)');
      c.fillStyle = rg; rr(c, ox, oy, ow, 70, 26); c.fill();
    }
    if (p) { c.save(); c.translate(ox + ow / 2, oy + 44); c.scale(1, .5); drawPizza(c, 0, 0, 36, p); c.restore(); }
    const st = p ? pizzaState(p) : null;
    c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, ox, oy + 76, ow, 8, 4); c.fill();
    if (p) {
      let frac, col;
      if (st === 'raw') { frac = p.bake / COOK; col = broken ? '#777' : '#f4a13a'; }
      else if (st === 'cooked') { frac = 1; const d = (p.bake - COOK) / (BURN - COOK); col = d < .45 ? '#6db552' : d < .75 ? '#f4c343' : '#e24a2c'; }
      else { frac = 1; col = '#2a2a2a'; }
      c.fillStyle = col; rr(c, ox, oy + 76, Math.max(8, ow * frac), 8, 4); c.fill();
      if (st === 'cooked') {
        const warn = p.bake > COOK + 3.5;
        if (!warn || Math.floor(G * 6) % 2) label(c, (warn ? 'TIRA JÁ!' : 'PRONTA') + ' · ' + keyLabel(bindOf('tirar')), ox + ow / 2, oy + 12, 13, warn ? '#ff8a70' : '#b8f09a', '#1b0d08');
      } else if (st === 'burnt') label(c, 'QUEIMADA', ox + ow / 2, oy + 12, 13, '#ffb37a', '#1b0d08');
    }
    if (kMouse && kMouse.x > ox && kMouse.x < ox + ow && kMouse.y > oy && kMouse.y < oy + 86) {
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; rr(c, ox - 3, oy - 3, ow + 6, 76, 28); c.stroke();
    }
  }
}

/* ---------- desenho: esplanada ---------- */
function renderD() {
  const c = dx, lv = SK('relva');
  c.save();
  if (S.shake > 0 && !REDUCED) c.translate(rand(-6, 6) * S.shake * 3, rand(-6, 6) * S.shake * 3);
  c.fillStyle = lv.top; c.fillRect(-10, -10, DW + 20, DH + 20);
  for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) { c.fillStyle = (r + col) % 2 ? lv.b : lv.a; c.fillRect(GX + col * CW, GY + r * CH, CW, CH); }
  const ex = GX + COLS * CW;
  c.fillStyle = lv.street; c.fillRect(ex, GY, DW - ex, DH - GY);
  c.fillStyle = 'rgba(255,255,255,.12)'; for (let y = GY; y < DH; y += 22) c.fillRect(ex, y, DW - ex, 2);
  drawLawnDeco(c, GX, GY, COLS * CW, ROWS * CH, lv);
  const fv = SK('parede');
  c.fillStyle = fv.pat === 'brick' ? fv.a : '#7d3421'; c.fillRect(0, GY, GX, DH - GY);
  c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1;
  for (let y = GY, row = 0; y < DH; y += 14, row++) { c.beginPath(); c.moveTo(0, y); c.lineTo(GX, y); c.stroke(); for (let x = row % 2 ? 8 : 20; x < GX; x += 24) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 14); c.stroke(); } }
  drawAwning(c, 0, GY, GX + 6, 10, teamColor(P.team));
  c.fillStyle = '#4a2a18'; rr(c, 6, GY + 2 * CH + 8, 28, CH - 12, 6); c.fill();
  c.fillStyle = '#f4c343'; circ(c, 28, GY + 2 * CH + CH / 2 + 4, 2.5); c.fill();

  const noZ = S.story && !S.story.zombies.length;
  const lastW = S.story && S.story.goal.type === 'waves' && S.wave >= S.story.goal.n;
  const top = S.sd ? 24 : S.story ? (S.wave === 0 ? S.story.firstWave : S.story.gap) : S.wave === 0 ? 15 : 32;
  const left = noZ || lastW ? 0 : Math.max(0, S.nextWave - S.time);
  label(c, noZ ? 'SEM ZOMBIES' : S.wave === 0 ? 'A PREPARAR' : 'ONDA ' + S.wave, 14, GY / 2, 18, S.sd ? '#ff8a70' : '#f4c343', null, 'left');
  const bx = 150, bw = clamp(TET_COVER - bx - 190, 70, 280);
  c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, bx, GY / 2 - 5, bw, 10, 5); c.fill();
  c.fillStyle = '#e24a2c'; rr(c, bx, GY / 2 - 5, Math.max(10, bw * (1 - left / top)), 10, 5); c.fill();
  c.font = '500 13px Rubik, system-ui, sans-serif'; c.fillStyle = '#e6d8c4'; c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillText(noZ ? 'Hoje só há clientes' : lastW ? 'Última onda: derrota os que faltam!' : S.wave === 0 ? `Primeira onda em ${Math.ceil(left)} s — faz pizzas!` : `Próxima onda em ${Math.ceil(left)} s`, bx + bw + 14, GY / 2);
  if (noZ) { label(c, 'Hoje não há zombies.', DW / 2, DH / 2 - 14, 24, '#fff8ec', 'rgba(0,0,0,.45)'); label(c, 'Concentra-te na cozinha!', DW / 2, DH / 2 + 16, 18, '#f4c343', 'rgba(0,0,0,.45)'); }

  if (dMouse && S.tool) {
    const col = Math.floor((dMouse.x - GX) / CW), r = Math.floor((dMouse.y - GY) / CH);
    if (col >= 0 && col < COLS && r >= 0 && r < ROWS && GX + col * CW + CW / 2 <= TET_COVER) {
      const occ = S.towers.some(t => t.r === r && t.c === col);
      if (S.tool === 'queimada') { c.fillStyle = 'rgba(255,160,80,.2)'; c.fillRect(GX, GY + r * CH, COLS * CW, CH); }
      else {
        const ok = S.tool === 'pa' ? occ : (!occ && S.coins >= TOWERS[S.tool].cost);
        c.fillStyle = ok ? 'rgba(255,255,255,.22)' : 'rgba(226,74,44,.3)'; c.fillRect(GX + col * CW, GY + r * CH, CW, CH);
        if (S.tool !== 'pa' && !occ) { c.save(); c.globalAlpha = .55; TOWER_DRAW[S.tool](c, GX + col * CW + CW / 2, GY + r * CH + CH / 2, { anim: G, hp: 1, max: 1 }); c.restore(); }
      }
    }
  }
  for (let r = 0; r < ROWS; r++) {
    const cut = S.cutters[r];
    if (cut.st !== 'used') drawCutter(c, cut.x + 22, rowGround(r) - 8, cut.st === 'go' ? G * 30 : 0);
    for (const t of S.towers) if (t.r === r) {
      TOWER_DRAW[t.type](c, t.x, t.y, t);
      if (t.hp < t.max && t.type !== 'pimenta') {
        c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(t.x - 18, t.y + 36, 36, 4);
        c.fillStyle = '#6db552'; c.fillRect(t.x - 18, t.y + 36, 36 * t.hp / t.max, 4);
      }
      if (S.tool === 'pa' && t.type !== 'pimenta') { c.strokeStyle = 'rgba(244,195,67,.8)'; c.lineWidth = 2; c.setLineDash([4, 4]); c.strokeRect(GX + t.c * CW + 3, GY + r * CH + 3, CW - 6, CH - 6); c.setLineDash([]); }
    }
    for (const rl of S.rollers) if (rl.row === r) {
      const y = rowGround(r) - 14;
      c.save(); c.translate(rl.x, y); c.rotate(rl.rot);
      c.fillStyle = '#3b2216'; circ(c, 0, 0, 16); c.fill(); c.fillStyle = '#1e0f08'; circ(c, 0, 0, 12); c.fill();
      c.strokeStyle = '#5a3a26'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, 0); c.lineTo(12, 0); c.moveTo(0, -12); c.lineTo(0, 12); c.stroke();
      c.restore();
      if (Math.random() < .5) S.parts.push({ w: 'd', x: rl.x - 10, y: y - 10, vx: rand(-20, 0), vy: -30, g: -10, life: .6, max: .6, col: '#555', size: rand(3, 5) });
    }
    const zs = S.zombies.filter(z => z.row === r).sort((a, b) => b.x - a.x);
    for (const z of zs) drawZombie(c, z, z.x, rowGround(r));
  }
  const av = SK('azeitona'), qv = SK('queijo');
  for (const s of S.shots) {
    if (s.kind === 'olive') { c.fillStyle = av.shot; ell(c, s.x, s.y, 7, 5.5); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; circ(c, s.x - 2, s.y - 2, 1.8); c.fill(); }
    else { c.fillStyle = qv.body; circ(c, s.x, s.y, 7); c.fill(); c.fillStyle = qv.hole; circ(c, s.x + 2, s.y + 1, 2); c.fill(); }
  }
  if (lv.deco === 'fireflies') { c.fillStyle = 'rgba(10,20,50,.18)'; c.fillRect(GX, GY, COLS * CW, ROWS * CH); }
  // Zombies escondidos atrás do Tetris flutuante: seta vermelha na fila, com o número deles.
  if (S.sd && TET_COVER < DW) for (let r = 0; r < ROWS; r++) {
    const n = S.zombies.filter(z => z.row === r && z.x > TET_COVER - 6).length;
    if (!n) continue;
    const x = TET_COVER - 16, y = GY + r * CH + CH / 2, a = .55 + .45 * Math.sin(G * 8);
    c.fillStyle = `rgba(226,74,44,${a})`;
    c.beginPath(); c.moveTo(x - 11, y); c.lineTo(x + 5, y - 12); c.lineTo(x + 5, y + 12); c.closePath(); c.fill();
    if (n > 1) label(c, String(n), x, y + 22, 13, '#fff');
  }
  if (S.fx.nevoeiro > 0) {
    const fx0 = GX + 3 * CW;
    const g = c.createLinearGradient(fx0 - 40, 0, fx0 + 60, 0); g.addColorStop(0, 'rgba(220,226,232,0)'); g.addColorStop(1, 'rgba(220,226,232,.96)');
    c.fillStyle = g; c.fillRect(fx0 - 40, GY, DW - fx0 + 40, DH - GY);
    c.fillStyle = 'rgba(235,240,245,.5)';
    for (let i = 0; i < 8; i++) { circ(c, fx0 + 60 + ((i * 97 + G * 20) % (DW - fx0)), GY + 40 + (i * 53) % (DH - GY - 60), 40); c.fill(); }
    label(c, 'NEVOEIRO', DW - 90, GY + 24, 16, '#5f3a7a', null);
  }
  drawFx(c, 'd');
  if (S.banner) {
    const t = S.banner.t, a = t < .3 ? t / .3 : t > 2.1 ? 1 - (t - 2.1) / .5 : 1;
    c.save(); c.globalAlpha = clamp(a, 0, 1);
    c.fillStyle = 'rgba(20,12,10,.65)'; c.fillRect(0, DH / 2 - 52, DW, 96);
    label(c, S.banner.txt, DW / 2, DH / 2 - 16, 40 + (1 - ease(t / .4)) * 20, S.sd ? '#ff8a70' : '#f4c343');
    c.font = '500 16px Rubik, system-ui, sans-serif'; c.fillStyle = '#f7ecdc'; c.textAlign = 'center'; c.fillText(S.banner.sub, DW / 2, DH / 2 + 24);
    c.restore();
  }
  c.restore();
}
function renderT() {
  const c = tx, t = S.tet, fl = TET_MODE === 'float';
  c.clearRect(0, 0, TCW, TCH);
  c.fillStyle = fl ? 'rgba(23,16,13,.9)' : '#17100d'; c.fillRect(0, 0, TCW, TTOP);
  if (!fl) c.fillRect(0, TTOP, TCW, TH * TS);
  if (!t) return;
  label(c, 'PRÓXIMA', 8, 13, 11, '#b9a08a', null, 'left');
  const np = TPIECES[t.next];
  for (const [x, y] of np.s) drawBlock(c, 10 + x * 10, 22 + y * 10, 10, np.c);
  label(c, 'LINHAS', TCW - 8, 13, 11, '#b9a08a', null, 'right');
  label(c, String(t.lines), TCW - 8, 31, 18, '#f4c343', null, 'right');
  c.fillStyle = fl ? 'rgba(30,20,16,.74)' : '#221713'; c.fillRect(0, TTOP, TCW, TH * TS);
  c.strokeStyle = 'rgba(255,255,255,.04)'; c.lineWidth = 1;
  for (let x = 1; x < TW; x++) { c.beginPath(); c.moveTo(x * TS, TTOP); c.lineTo(x * TS, TCH); c.stroke(); }
  for (let y = 1; y < TH; y++) { c.beginPath(); c.moveTo(0, TTOP + y * TS); c.lineTo(TCW, TTOP + y * TS); c.stroke(); }
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) if (t.grid[y][x]) drawBlock(c, x * TS, TTOP + y * TS, TS, t.grid[y][x]);
  if (t.cur) {
    let gy = t.cur.y; while (fits(t, t.cur.cells, t.cur.x, gy + 1)) gy++;
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.5;
    for (const [cx, cy] of t.cur.cells) if (gy + cy >= 0) { rr(c, (t.cur.x + cx) * TS + 2, TTOP + (gy + cy) * TS + 2, TS - 4, TS - 4, 3); c.stroke(); }
    for (const [cx, cy] of t.cur.cells) if (t.cur.y + cy >= 0) drawBlock(c, (t.cur.x + cx) * TS, TTOP + (t.cur.y + cy) * TS, TS, TPIECES[t.cur.k].c);
  }
  c.fillStyle = 'rgba(226,74,44,.5)'; c.fillRect(0, TTOP, TCW, 2);
  drawFx(c, 't');
}
function drawFx(c, w) {
  for (const p of S.parts) if (p.w === w) { c.globalAlpha = clamp(p.life / p.max, 0, 1); c.fillStyle = p.col; circ(c, p.x, p.y, p.size); c.fill(); }
  c.globalAlpha = 1;
  const W = w === 'k' ? KW : w === 't' ? TCW : DW, m = w === 't' ? 60 : 70;
  for (const f of S.floats) if (f.w === w) {
    c.save(); c.globalAlpha = clamp(1.4 - f.t * 1.3, 0, 1);
    label(c, f.txt, clamp(f.x, m, W - m), f.y - f.t * 34, f.size, f.col); c.restore();
  }
}

/* ---------- pré-visualização da pizzaria ---------- */
const PV_PIZZA = makePizza(['molho', 'queijo', 'pepperoni', 'azeitona'], 6);
const PV_ZOMBIE = (() => { const z = mkZombie('caixa', 0, 1); return z; })();
function drawPreview(c) {
  const W = PVW, H = PVH, KWp = 250, wallH = 110;
  c.clearRect(0, 0, W, H);
  c.save(); c.beginPath(); c.rect(0, 0, KWp, H); c.clip();
  drawWall(c, KWp, wallH, SK('parede'));
  drawAwning(c, 0, 0, KWp, 12, teamColor(P.team));
  c.fillStyle = 'rgba(20,12,10,.72)'; rr(c, 16, 30, KWp - 32, 34, 9); c.fill();
  c.fillStyle = teamColor(P.team); c.fillRect(16, 60, KWp - 32, 4);
  c.font = '17px "Lilita One", sans-serif'; const nm = shopName(); let fs = 17;
  while (c.measureText(nm).width > KWp - 50 && fs > 10) { fs--; c.font = fs + 'px "Lilita One", sans-serif'; }
  label(c, nm, KWp / 2, 46, fs, '#fff8ec', null);
  drawCounter(c, wallH, KWp, 26, SK('balcao'));
  drawFloor(c, wallH + 26, KWp, H, SK('chao'));
  const tb = SK('tabua'), bx = 70, by = 196;
  c.fillStyle = tb.wood; circ(c, bx, by, 50); c.fill(); c.strokeStyle = tb.ring; c.lineWidth = 3; circ(c, bx, by, 46); c.stroke();
  drawPizza(c, bx, by, 40, PV_PIZZA);
  const ov = SK('forno'), ox = 140, oy = 146;
  c.fillStyle = ov.body; rr(c, ox, oy, 96, 106, 18); c.fill();
  label(c, 'FORNO', ox + 48, oy + 14, 12, ov.text, 'rgba(0,0,0,.45)');
  c.fillStyle = '#1b0d08'; rr(c, ox + 12, oy + 28, 72, 40, 16); c.fill();
  const rg = c.createRadialGradient(ox + 48, oy + 62, 2, ox + 48, oy + 62, 40); rg.addColorStop(0, 'rgba(255,140,40,.6)'); rg.addColorStop(1, 'rgba(255,90,20,0)');
  c.fillStyle = rg; rr(c, ox + 12, oy + 28, 72, 40, 16); c.fill();
  const pv = SK('prato'); c.fillStyle = pv.a; circ(c, ox + 48, oy + 88, 13); c.fill(); c.strokeStyle = pv.b; c.lineWidth = 2; circ(c, ox + 48, oy + 88, 10); c.stroke();
  c.restore();

  c.save(); c.translate(KWp, 0); c.beginPath(); c.rect(0, 0, W - KWp, H); c.clip();
  const lv = SK('relva'), LW = W - KWp, bw = 26, cw = (LW - bw) / 3, ch = H / 2;
  for (let r = 0; r < 2; r++) for (let col = 0; col < 3; col++) { c.fillStyle = (r + col) % 2 ? lv.b : lv.a; c.fillRect(bw + col * cw, r * ch, cw, ch); }
  drawLawnDeco(c, bw, 0, LW - bw, H, lv);
  c.fillStyle = '#7d3421'; c.fillRect(0, 0, bw, H);
  drawAwning(c, 0, 0, bw + 4, 10, teamColor(P.team));
  const tw = (type, r, col) => { const x = bw + col * cw + cw / 2, y = r * ch + ch / 2 + 2; c.save(); c.translate(x, y); c.scale(.85, .85); TOWER_DRAW[type](c, 0, 0, { anim: G, hp: 1, max: 1, recoil: 0 }); c.restore(); };
  tw('azeitoneira', 0, 0); tw('muro', 0, 2); tw('queijeira', 1, 0); tw('pimenta', 1, 1);
  drawCutter(c, 14, ch - 12, 0); drawCutter(c, 14, H - 12, G * 2);
  PV_ZOMBIE.anim = G; drawZombie(c, PV_ZOMBIE, bw + 2.5 * cw, H - 10);
  const av = SK('azeitona'); c.fillStyle = av.shot; ell(c, bw + cw * .9 + ((G * 60) % (cw * 1.4)), ch / 2 - 9, 6, 5); c.fill();
  if (lv.deco === 'fireflies') { c.fillStyle = 'rgba(10,20,50,.18)'; c.fillRect(0, 0, LW, H); }
  c.restore();
}

/* ---------- atalhos de teclado ---------- */
// Guardados por posição física da tecla (e.code), para funcionarem em qualquer layout de teclado.
// Mão esquerda: fila de cima = ingredientes pela ordem da pizza; fila do meio = percurso da pizza;
// números = esplanada; fila de baixo = sabotagens. Mão direita no rato; setas para o Tetris.
const ACTIONS = [
  ['Cozinha', [
    ['massa', 'Pôr massa', 'KeyA'], ['molho', 'Molho', 'KeyQ'], ['queijo', 'Queijo', 'KeyW'], ['pepperoni', 'Pepperoni', 'KeyE'],
    ['cogumelo', 'Cogumelo', 'KeyR'], ['azeitona', 'Azeitona', 'KeyT'], ['pimento', 'Pimento', 'KeyY'],
    ['forno', 'Meter no forno', 'KeyS'], ['tirar', 'Tirar do forno', 'KeyD'], ['entregar', 'Entregar pizza', 'KeyF'], ['lixo', 'Deitar fora', 'KeyG'],
  ]],
  ['Esplanada', [
    ['azeitoneira', 'Azeitoneira', 'Digit1'], ['muro', 'Muro de massa', 'Digit2'], ['queijeira', 'Queijeira', 'Digit3'],
    ['pimenta', 'Piri-piri', 'Digit4'], ['queimada', 'Pizza queimada', 'Digit5'], ['pa', 'Pá (vender)', 'Digit6'],
  ]],
  ['Sabotagens', [
    ['s-horda', 'Horda', 'KeyZ'], ['s-forno', 'Forno avariado', 'KeyX'], ['s-apagao', 'Apagão', 'KeyC'], ['s-nevoeiro', 'Nevoeiro', 'KeyV'],
    ['s-pressa', 'Clientes impacientes', 'KeyB'], ['s-ingred', 'Falta de stock', 'KeyN'], ['s-loja', 'Loja fechada', 'KeyM'],
    ['s-itens', 'Mãos atadas', 'KeyH'], ['s-chef', 'Chef furioso', 'KeyJ'], ['s-lixo', 'Peças de lixo', 'KeyK'], ['s-escudo', 'Escudo', 'KeyL'],
  ]],
  ['Tetris', [
    ['t-esq', 'Mover para a esquerda', 'ArrowLeft'], ['t-dir', 'Mover para a direita', 'ArrowRight'], ['t-rodar', 'Rodar', 'ArrowUp'],
    ['t-descer', 'Descer', 'ArrowDown'], ['t-largar', 'Largar', 'Space'],
  ]],
  ['Geral', [['pausa', 'Pausa', 'KeyP']]],
];
const ACT_LIST = ACTIONS.flatMap(([group, list]) => list.map(([id, label, def]) => ({ id, label, def, group })));
const ACT_MAP = Object.fromEntries(ACT_LIST.map(a => [a.id, a]));
const REPEATABLE = new Set(['t-esq', 't-dir', 't-descer']);
const KEY_NAMES = { Space: 'Espaço', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Enter: 'Enter', Backspace: '⌫', Tab: 'Tab',
  CapsLock: 'Caps', Backquote: '\\', Minus: "'", Equal: '«', BracketLeft: '+', BracketRight: '´', Semicolon: 'Ç', Quote: 'º', Backslash: '~',
  Comma: ',', Period: '.', Slash: '-', IntlBackslash: '<' };
function bindOf(id) { return Object.prototype.hasOwnProperty.call(P.keys, id) ? P.keys[id] : (ACT_MAP[id] ? ACT_MAP[id].def : ''); }
function keyLabel(code) {
  if (!code) return '—';
  if (P.keyNames[code]) return P.keyNames[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return KEY_NAMES[code] || code;
}
let CODE2ACT = {};
function rebuildKeys() {
  CODE2ACT = {};
  for (const a of ACT_LIST) { const c = bindOf(a.id); if (c) CODE2ACT[c] = a.id; }
  for (const [id, k] of Object.entries(KBD)) k.textContent = keyLabel(bindOf(id));
  renderHowKeys();
}
const ACT_FN = {
  massa: () => addDough(), forno: () => toOven(), tirar: () => takeOut(), entregar: () => deliverAuto(), lixo: () => trashBoard(),
  queimada: () => selectTool('queimada'), pa: () => selectTool('pa'),
  't-esq': () => tMove(-1), 't-dir': () => tMove(1), 't-rodar': () => tRotate(), 't-descer': () => tSoft(), 't-largar': () => tHard(),
};
function runAction(id) {
  if (ACT_FN[id]) ACT_FN[id]();
  else if (TOPS[id]) addTopping(id);
  else if (TOWERS[id]) selectTool(id);
  else if (id.startsWith('s-')) buySab(id.slice(2));
}
function renderHowKeys() {
  const box = document.getElementById('howKeys'); if (!box) return;
  box.textContent = '';
  for (const [group, list] of ACTIONS) {
    const p = el('div'); p.appendChild(el('b', null, group + ': '));
    list.forEach(([id, lab], i) => { if (i) p.appendChild(document.createTextNode(' · ')); p.appendChild(el('kbd', null, keyLabel(bindOf(id)))); p.appendChild(document.createTextNode(' ' + lab.toLowerCase())); });
    box.appendChild(p);
  }
}

/* ---------- Tetris: posição no ecrã ---------- */
let TET_MODE = null, TET_COVER = DW;
function layoutTetris() {
  const side = $('#tetrisSide'), stage = $('#stage'), app = $('.app');
  const mode = !S.sd ? null : innerWidth < 921 ? 'stack' : innerWidth >= 1690 ? 'dock' : 'float';
  if (mode !== TET_MODE) {
    TET_MODE = mode;
    stage.classList.toggle('dock', mode === 'dock'); app.classList.toggle('dock', mode === 'dock');
    side.classList.toggle('float', mode === 'float');
    if (mode !== 'float') { side.removeAttribute('style'); tc.removeAttribute('style'); }
  }
  if (mode === 'float') {
    const d = dc.getBoundingClientRect(), s = stage.getBoundingClientRect();
    if (!d.width) return;
    const h = d.height, cw = Math.round(h * TCW / TCH), pw = cw + 4;
    Object.assign(side.style, { top: (d.top - s.top - 2) + 'px', left: (d.right - s.left - pw + 2) + 'px', width: pw + 'px', height: (h + 4) + 'px' });
    tc.style.width = cw + 'px';
    TET_COVER = (d.width - pw + 2) / d.width * DW;
  } else TET_COVER = DW;
}
addEventListener('resize', () => layoutTetris());

/* ---------- interface ---------- */
function toLocal(canvas, W, H, e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
kc.addEventListener('pointermove', e => { kMouse = toLocal(kc, KW, KH, e); });
kc.addEventListener('pointerleave', () => { kMouse = null; });
dc.addEventListener('pointermove', e => { dMouse = toLocal(dc, DW, DH, e); });
dc.addEventListener('pointerleave', () => { dMouse = null; });
kc.addEventListener('pointerdown', e => {
  if (S.mode !== 'play') return;
  const { x, y } = toLocal(kc, KW, KH, e); kMouse = { x, y };
  if (y < 196) { for (const cu of S.custs) { const sx = SLOTS[cu.slot]; if (x > sx - 62 && x < sx + 86) { deliver(cu); return; } } return; }
  if (Math.hypot(x - BOARD.x, y - BOARD.y) < BOARD.r) { S.board ? toOven() : addDough(); return; }
  for (let i = 0; i < 2; i++) { const oy = ovenY(i); if (x > OVEN.x + 16 && x < OVEN.x + OVEN.w - 16 && y > oy - 6 && y < oy + 90) { ovenClick(i); return; } }
  for (let i = 0; i < 3; i++) if (Math.hypot(x - RACK.x, y - RACK.y(i)) < RACK.r + 4) { rackClick(i); return; }
});
dc.addEventListener('pointerdown', e => {
  if (S.mode !== 'play') return;
  const { x, y } = toLocal(dc, DW, DH, e); dMouse = { x, y };
  const col = Math.floor((x - GX) / CW), r = Math.floor((y - GY) / CH);
  if (r >= 0 && r < ROWS && (S.tool === 'queimada' ? x >= 0 : col >= 0 && col < COLS)) cellClick(r, clamp(col, 0, COLS - 1));
});
dc.addEventListener('contextmenu', e => { e.preventDefault(); if (S.tool) { S.tool = null; syncTools(); } });
document.querySelectorAll('#tPad button').forEach(b => b.addEventListener('pointerdown', e => {
  e.preventDefault();
  ({ l: () => tMove(-1), r: () => tMove(1), rot: tRotate, soft: tSoft, hard: tHard })[b.dataset.t]();
}));

const ICONS = [], KBD = {};
function iconCanvas(draw) { const c = document.createElement('canvas'); const x = setup(c, 40, 40); draw(x); ICONS.push({ x, draw }); return c; }
function refreshIcons() { for (const i of ICONS) { i.x.clearRect(0, 0, 40, 40); i.draw(i.x); } }
function toolBtn(parent, { id, name, key, icon, cost, onClick, cls, title }) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'tool' + (cls ? ' ' + cls : ''); b.id = id;
  if (title) b.title = title;
  b.appendChild(iconCanvas(icon));
  b.appendChild(el('span', null, name));
  if (cost != null) b.appendChild(el('span', 'cost', cost + ' moedas'));
  if (key) { const k = el('kbd', null, keyLabel(bindOf(key))); KBD[key] = k; b.appendChild(k); }
  b.addEventListener('click', () => { if (S.mode === 'play') onClick(); });
  parent.appendChild(b); return b;
}
const kTools = $('#kTools'), dTools = $('#dTools'), sTools = $('#sTools');
toolBtn(kTools, { id: 't-massa', name: 'Massa', key: 'massa', onClick: addDough, icon: c => drawPizza(c, 20, 20, 16, newPizza()) });
for (const t of ORDER_TOPS) toolBtn(kTools, {
  id: 't-' + t, name: TOPS[t].label, key: t, onClick: () => addTopping(t), icon: c => {
    if (t === 'molho') { c.fillStyle = '#d8402a'; circ(c, 20, 21, 13); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; circ(c, 15, 16, 4); c.fill(); }
    else if (t === 'queijo') { c.fillStyle = '#f5c542'; c.beginPath(); c.moveTo(6, 30); c.lineTo(34, 30); c.lineTo(34, 18); c.lineTo(6, 8); c.closePath(); c.fill(); c.fillStyle = '#dca52a'; circ(c, 14, 20, 3); c.fill(); circ(c, 25, 25, 2.5); c.fill(); }
    else drawPiece(c, t, 20, t === 'cogumelo' ? 18 : 20, t === 'azeitona' ? 13 : 11, t === 'pimento' ? .6 : .3, false);
  },
});
toolBtn(kTools, { id: 't-forno', name: 'Forno', key: 'forno', cls: 'hot', onClick: () => toOven(), icon: c => {
  c.fillStyle = SK('forno').body; rr(c, 4, 6, 32, 30, 10); c.fill(); c.fillStyle = '#1b0d08'; rr(c, 10, 18, 20, 13, 6); c.fill();
  c.fillStyle = '#ff9a3a'; ell(c, 20, 28, 7, 3); c.fill();
} });
toolBtn(kTools, { id: 't-lixo', name: 'Lixo', key: 'lixo', onClick: trashBoard, icon: c => {
  c.fillStyle = '#8b939c'; rr(c, 10, 12, 20, 24, 3); c.fill(); c.fillStyle = '#b8bec5'; rr(c, 7, 8, 26, 5, 2); c.fill(); c.fillRect(16, 5, 8, 4);
  c.strokeStyle = '#5d646c'; c.lineWidth = 1.5; for (const x of [15, 20, 25]) { c.beginPath(); c.moveTo(x, 16); c.lineTo(x, 32); c.stroke(); }
} });
for (const [type, d] of Object.entries(TOWERS)) toolBtn(dTools, {
  id: 'd-' + type, name: d.label, key: type, cost: d.cost, onClick: () => selectTool(type),
  icon: c => { c.save(); c.translate(20, 19); c.scale(.55, .55); TOWER_DRAW[type](c, 0, 0, { anim: 0, hp: 1, max: 1 }); c.restore(); },
});
toolBtn(dTools, { id: 'd-pa', name: 'Pá (vender)', key: 'pa', onClick: () => selectTool('pa'), icon: c => {
  c.strokeStyle = '#8a5a30'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(22, 22); c.lineTo(35, 35); c.stroke();
  c.fillStyle = '#d9b27a'; ell(c, 15, 15, 12, 11, -.8); c.fill(); c.strokeStyle = '#a9824a'; c.lineWidth = 1.5; c.stroke();
} });
const qBtn = toolBtn(dTools, { id: 'd-queimada', name: 'Pizza queimada', key: 'queimada', onClick: () => selectTool('queimada'), icon: c => {
  c.fillStyle = '#3b2216'; circ(c, 20, 20, 15); c.fill(); c.fillStyle = '#1e0f08'; circ(c, 20, 20, 11); c.fill();
  c.fillStyle = '#ff8a3a'; circ(c, 15, 16, 2); c.fill(); circ(c, 25, 23, 1.6); c.fill();
} });
const qBadge = el('span', 'badge', '0'); qBtn.appendChild(qBadge);

const SAB_ICON = {
  forno: c => { c.fillStyle = '#7d3421'; rr(c, 5, 9, 28, 26, 9); c.fill(); c.fillStyle = '#1b0d08'; rr(c, 10, 19, 18, 11, 5); c.fill(); xMark(c, 30, 10, 10); },
  horda: c => { for (const [x, y] of [[11, 26], [29, 26], [20, 15]]) { c.fillStyle = '#8db278'; circ(c, x, y, 7.5); c.fill(); c.fillStyle = '#c0302a'; circ(c, x - 2.5, y - 1, 1.6); c.fill(); circ(c, x + 2.5, y - 1, 1.6); c.fill(); } },
  chef: c => { c.fillStyle = '#fff'; circ(c, 13, 14, 7); c.fill(); circ(c, 20, 9, 8); c.fill(); circ(c, 27, 14, 7); c.fill(); c.fillRect(11, 15, 18, 8); c.fillStyle = '#8db278'; circ(c, 20, 30, 7); c.fill(); c.fillStyle = '#c0302a'; circ(c, 17, 29, 1.5); c.fill(); circ(c, 23, 29, 1.5); c.fill(); },
  loja: c => { c.fillStyle = '#f4c343'; circ(c, 18, 20, 12); c.fill(); c.strokeStyle = '#b8901f'; c.lineWidth = 2; circ(c, 18, 20, 12); c.stroke(); label(c, '€', 18, 21, 14, '#b8901f', null); xMark(c, 30, 30, 10); },
  itens: c => { c.strokeStyle = '#8a5a30'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(20, 20); c.lineTo(32, 32); c.stroke(); c.fillStyle = '#d9b27a'; ell(c, 14, 14, 10, 9, -.8); c.fill(); xMark(c, 30, 10, 10); },
  ingred: c => { c.fillStyle = '#f5c542'; c.beginPath(); c.moveTo(4, 32); c.lineTo(30, 32); c.lineTo(30, 20); c.lineTo(4, 10); c.closePath(); c.fill(); c.fillStyle = '#dca52a'; circ(c, 12, 22, 3); c.fill(); xMark(c, 31, 10, 10); },
  apagao: c => { c.fillStyle = '#2a2a2a'; rr(c, 2, 2, 36, 36, 8); c.fill(); c.fillStyle = '#6a6a6a'; circ(c, 20, 17, 9); c.fill(); c.fillRect(16, 24, 8, 8); c.fillStyle = '#999'; c.fillRect(16, 27, 8, 2); },
  pressa: c => { c.fillStyle = '#fff'; circ(c, 20, 21, 13); c.fill(); c.strokeStyle = '#e24a2c'; c.lineWidth = 3; circ(c, 20, 21, 13); c.stroke(); c.strokeStyle = '#222'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(20, 21); c.lineTo(20, 12); c.moveTo(20, 21); c.lineTo(27, 24); c.stroke(); },
  nevoeiro: c => { c.fillStyle = '#cfd6de'; circ(c, 13, 23, 7); c.fill(); circ(c, 21, 17, 9); c.fill(); circ(c, 29, 23, 6); c.fill(); c.fillRect(12, 23, 18, 7); c.fillStyle = '#9aa3ad'; c.fillRect(6, 33, 28, 2); },
  lixo: c => { for (const [x, y] of [[6, 24], [16, 24], [26, 24], [16, 14]]) drawBlock(c, x, y, 10, '#6b6158'); },
  escudo: c => { c.fillStyle = '#3d7dd8'; c.beginPath(); c.moveTo(20, 4); c.lineTo(34, 9); c.lineTo(32, 24); c.quadraticCurveTo(28, 32, 20, 37); c.quadraticCurveTo(12, 32, 8, 24); c.lineTo(6, 9); c.closePath(); c.fill(); c.fillStyle = '#bfe6ff'; c.fillRect(18, 8, 4, 26); },
};
for (const s of SABS) toolBtn(sTools, { id: 's-' + s.id, name: s.name, key: 's-' + s.id, cost: s.cost, title: s.desc, onClick: () => buySab(s.id), icon: SAB_ICON[s.id] });

function syncTools() {
  for (const [type, d] of Object.entries(TOWERS)) {
    const b = document.getElementById('d-' + type);
    b.classList.toggle('sel', S.tool === type); b.classList.toggle('poor', S.coins < d.cost); b.classList.toggle('cd', S.fx.loja > 0);
  }
  document.getElementById('d-pa').classList.toggle('sel', S.tool === 'pa');
  document.getElementById('d-pa').classList.toggle('cd', S.fx.itens > 0);
  qBtn.classList.toggle('sel', S.tool === 'queimada');
  qBtn.classList.toggle('cd', S.burnt <= 0 || S.fx.itens > 0);
  qBadge.textContent = String(S.burnt);
  for (const t of ORDER_TOPS) document.getElementById('t-' + t).classList.toggle('out', S.fx.ingred > 0 && S.fxTop === t);
  // Na história só aparecem os botões do que já foi desbloqueado.
  const st = S.story;
  for (const t of ORDER_TOPS) setHidden('t-' + t, st && !st.tops.includes(t));
  for (const t of Object.keys(TOWERS)) setHidden('d-' + t, st && !st.towers.includes(t));
  setHidden('d-pa', st && !st.towers.length);
  setHidden('d-queimada', st && !st.zombies.length);
  for (const s of SABS) {
    const b = document.getElementById('s-' + s.id);
    b.classList.toggle('poor', S.coins < s.cost);
    b.classList.toggle('cd', S.sabCd > 0 || S.fx.loja > 0 || (s.self && S.shield));
    b.classList.toggle('locked', !!s.sd && !S.sd);
  }
}
const hudCache = {};
function setHidden(id, v) { const e = document.getElementById(id); if (e.hidden !== !!v) e.hidden = !!v; }
function setText(id, v, html) { if (hudCache[id] !== v) { hudCache[id] = v; const e = document.getElementById(id); if (html) e.innerHTML = v; else e.textContent = v; } }
function bump(sel) { const e = $(sel).parentElement; e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
let lastSync = 0;
function hud() {
  setText('coins', String(S.coins));
  setText('score', String(Math.floor(S.score)));
  const h = clamp(S.hearts, 0, 3);
  setText('hearts', '♥'.repeat(h) + '<span class="lost">' + '♥'.repeat(3 - h) + '</span>', true);
  setText('wave', String(S.wave));
  setText('best', String(Math.max(P.best, S.mode === 'menu' ? 0 : Math.floor(S.score))));
  if (S.story) { setText('timeLbl', 'Objetivo'); setText('timeLeft', goalText()); }
  else {
    setText('timeLbl', S.sd ? 'Morte súbita' : 'Morte súbita em');
    setText('timeLeft', S.sd ? 'ATIVA' : S.mode === 'menu' ? fmtTime(SD_AT) : fmtTime(SD_AT - S.time));
  }
  $('#timeStat').classList.toggle('sdon', S.sd);
  const now = performance.now();
  if (now - lastSync > 250) { lastSync = now; syncTools(); renderEffects(); renderTip(); if (S.sd) layoutTetris(); }
}
function renderEffects() {
  const box = $('#effects'), items = [];
  for (const k in FX_LABEL) if (S.fx[k] > 0) items.push([(k === 'ingred' && S.fxTop ? 'Sem ' + TOPS[S.fxTop].label.toLowerCase() : FX_LABEL[k]) + ' · ' + Math.ceil(S.fx[k]) + ' s', '']);
  if (S.shield) items.push(['Escudo ativo', 'good']);
  const key = items.map(i => i[0]).join('|');
  if (hudCache.fx === key) return; hudCache.fx = key;
  box.textContent = ''; box.hidden = !items.length;
  for (const [t, cls] of items) box.appendChild(el('span', 'effect ' + cls, t));
}
let sdShown = null;
function syncStage() {
  const on = !!S.sd;
  if (sdShown === on) return; sdShown = on;
  $('#stage').classList.toggle('sd', on); $('#tetrisSide').hidden = !on;
  layoutTetris();
}
function syncShop() {
  $('#shopName').textContent = shopName(); $('#shopDot').style.background = teamColor(P.team);
  $('#menuShop').textContent = shopName(); $('#menuDot').style.background = teamColor(P.team);
  $('#menuStars').textContent = '★ ' + P.stars; $('#bestMenu').textContent = P.best; $('#customStars').textContent = P.stars;
}

/* ---------- ecrãs ---------- */
const overlay = $('#overlay');
const CARDS = ['menuCard', 'storyCard', 'introCard', 'levelCard', 'customCard', 'howCard', 'optionsCard', 'rankCard', 'pauseCard', 'overCard', 'mpCard', 'countCard', 'mpOverCard'];
let curCard = 'menuCard';
function showCard(id, focus = true) {
  if (curCard === 'customCard' && id !== 'customCard') { PREVIEW = null; pendingBuy = null; refreshIcons(); }
  curCard = id; overlay.hidden = !id;
  for (const c of CARDS) document.getElementById(c).hidden = c !== id;
  if (id && focus) { const btn = document.getElementById(id).querySelector('.play:not(:disabled),.mbtn'); if (btn) setTimeout(() => btn.focus({ preventScroll: true }), 30); }
  if (id) overlay.scrollTop = 0;
  syncShop();
}
function setMpHud(on) {
  $('#bestStat').hidden = on; $('#pauseBtn').hidden = on; $('#rivals').hidden = !on; $('#sabBar').hidden = !on;
}
// Com servidor, as estrelas são calculadas e validadas lá; done(estrelas, erro) é chamado quando responder.
function awardStars(win, done) {
  const earned = Math.min(80, Math.floor(S.score / 250) + (win ? 15 : 0) + (S.sd ? 5 : 0) + (S.mp ? 3 : 0));
  if (!sb) { P.stars += earned; saveP(); syncShop(); if (done) done(earned); return earned; }
  submitGame({ score: S.score, wave: S.wave, duration: S.time, mode: S.mp ? 'mp' : S.story ? 'story' : 'solo', won: win, sd: S.sd })
    .then(r => { P.stars = r.stars; P.best = r.best; LS.set('pizzaria-sitiada-perfil', JSON.stringify(P)); syncShop(); if (done) done(r.earned); })
    .catch(e => { console.warn('Partida não guardada', e); if (done) done(null, e); });
  return null;
}
function toMenu() { if (NET.game) leaveRoom(); S = demoState(); setMpHud(false); hudCache.fx = null; renderEffects(); syncStage(); showCard('menuCard'); }
// "Jogar outra vez" repete o último modo (sobrevivência ou a mesma fase).
let replay = () => start();
function start() { audioOn(); S = freshState(); replay = start; setMpHud(false); syncStage(); showCard(null); }
function pause() { if (S.mode !== 'play' || S.mp) return; S.mode = 'pause'; showCard('pauseCard'); }
function resume() { if (S.mode !== 'pause') return; S.mode = 'play'; showCard(null); audioOn(); }
function gameOver(why) {
  if (S.mp) { finishMp('dead', why); return; }
  if (S.mode !== 'play') return;
  S.mode = 'over';
  const sc = Math.floor(S.score), rec = !S.story && sc > P.best;
  if (rec) P.best = sc;
  $('#overStars').textContent = sb ? 'A guardar estrelas…' : '';
  awardStars(false, (earned, err) => {
    $('#overStars').textContent = err ? 'Sem ligação ao servidor: as estrelas desta partida não foram guardadas.' : `+${earned} ★ estrelas`;
  });
  $('#overTitle').textContent = { kitchen: 'A pizzaria fechou', lawn: 'Os zombies entraram', tetris: 'O Tetris encheu' }[why];
  $('#overText').textContent = {
    kitchen: 'A reputação chegou a zero. Repara nas barras de paciência no balcão e cuidado com os críticos.',
    lawn: 'Um zombie chegou à porta numa fila sem corta-pizzas. As defesas precisam de moedas, e as moedas vêm das pizzas.',
    tetris: 'As peças chegaram ao topo. Na morte súbita tens de dividir a atenção por três.',
  }[why];
  $('#rScore').textContent = sc; $('#rPizzas').textContent = S.served; $('#rKills').textContent = S.kills; $('#rWave').textContent = S.wave;
  $('#overBest').innerHTML = S.story ? '' : rec ? '<b>Novo recorde!</b>' : 'Recorde: <b>' + P.best + '</b>';
  $('#againBtn').textContent = S.story ? 'Tentar outra vez' : 'Jogar outra vez';
  $('#overMenu').textContent = S.story ? 'Mapa' : 'Menu principal';
  sfx.angry(); showCard('overCard');
}
$('#startBtn').addEventListener('click', start);
$('#againBtn').addEventListener('click', () => replay());
$('#overMenu').addEventListener('click', () => { if (S.story) openStory(); else toMenu(); });
$('#resumeBtn').addEventListener('click', resume);
$('#quitBtn').addEventListener('click', toMenu);
$('#pauseBtn').addEventListener('click', () => S.mode === 'pause' ? resume() : pause());
function setMuted(v) {
  muted = v; P.muted = v; saveP();
  for (const id of ['soundBtn', 'optSound']) document.getElementById(id).textContent = 'Som: ' + (v ? 'desligado' : 'ligado');
  audioOn();
}
$('#soundBtn').addEventListener('click', () => setMuted(!muted));
$('#optSound').addEventListener('click', () => setMuted(!muted));

/* ---------- opções ---------- */
let optReturn = 'menuCard';
function openOptions(from) { optReturn = from; bindingAct = null; $('#keysNote').textContent = ''; renderOptions(); showCard('optionsCard'); }
function renderOptions(flashId) {
  const grid = $('#keysGrid'); grid.textContent = '';
  for (const [group, list] of ACTIONS) {
    const g = el('div', 'kgroup'); g.appendChild(el('h3', null, group));
    for (const [id, lab] of list) {
      const row = el('div', 'krow' + (flashId === id ? ' flash' : ''));
      const code = bindOf(id), listening = bindingAct === id;
      const b = el('button', 'keybtn' + (listening ? ' listen' : '') + (code ? '' : ' empty'), listening ? 'Carrega numa tecla…' : keyLabel(code));
      b.type = 'button'; b.setAttribute('aria-label', `${lab}: ${keyLabel(code)}. Mudar tecla`);
      b.addEventListener('click', () => { bindingAct = listening ? null : id; renderOptions(); });
      row.append(el('span', null, lab), b); g.appendChild(row);
    }
    grid.appendChild(g);
  }
}
$('#optBtn').addEventListener('click', () => openOptions('menuCard'));

/* ---------- ranking ---------- */
let rankMode = 'solo';
async function loadRank() {
  for (const b of document.querySelectorAll('#rankTabs .tab')) b.setAttribute('aria-selected', String(b.dataset.mode === rankMode));
  const ol = $('#rankList'); ol.textContent = '';
  if (!sb) { ol.appendChild(el('li', 'empty', 'O ranking precisa de ligação ao servidor.')); return; }
  ol.appendChild(el('li', 'empty', 'A carregar…'));
  const mode = rankMode;
  try {
    const rows = await fetchLeaderboard(mode);
    if (mode !== rankMode) return;
    ol.textContent = '';
    if (!rows.length) { ol.appendChild(el('li', 'empty', 'Ainda ninguém jogou neste modo. Sê o primeiro!')); return; }
    rows.forEach((r, i) => {
      const li = el('li'), dot = el('span', 'dot'); dot.style.background = teamColor(r.team);
      const who = (cleanName(r.name) || 'Pizzaiolo') + (r.shop ? ' · ' + cleanName(r.shop, 24) : '') + (r.is_me ? ' (tu)' : '');
      li.append(el('span', 'rk', String(i + 1)), dot, el('span', 'nm', who), el('span', 'pill', 'onda ' + r.wave), el('span', 'num', String(r.score)));
      if (r.is_me) li.classList.add('me');
      ol.appendChild(li);
    });
  } catch (e) { console.warn(e); ol.textContent = ''; ol.appendChild(el('li', 'empty', 'Não foi possível carregar o ranking. Tenta outra vez.')); }
}
$('#rankBtn').addEventListener('click', () => { showCard('rankCard'); loadRank(); });
$('#rankBack').addEventListener('click', () => showCard('menuCard'));
for (const b of document.querySelectorAll('#rankTabs .tab')) b.addEventListener('click', () => { rankMode = b.dataset.mode; loadRank(); });
$('#pauseOpt').addEventListener('click', () => openOptions('pauseCard'));
$('#optBack').addEventListener('click', () => { bindingAct = null; showCard(optReturn); });
$('#keysReset').addEventListener('click', () => { P.keys = {}; P.keyNames = {}; saveP(); rebuildKeys(); renderOptions(); $('#keysNote').textContent = 'Teclas repostas.'; sfx.pop(); });
$('#howBtn').addEventListener('click', () => { buildHow(); showCard('howCard'); });
$('#howBack').addEventListener('click', () => showCard('menuCard'));
$('#customBtn').addEventListener('click', () => { renderCustom(); showCard('customCard', false); });
$('#customBack').addEventListener('click', () => showCard('menuCard'));

/* ---------- modo história ---------- */
// Capítulo 1: cada fase introduz ingredientes, defesas, zombies ou clientes novos.
// goal: serve (servir N pizzas), waves (aguentar N ondas) ou lines (N linhas no Tetris da morte súbita).
// Fatias (1 a 3) = corações com que se acaba a fase.
const ALL_TOPS = ['molho', 'queijo', 'pepperoni', 'cogumelo', 'azeitona', 'pimento'];
const STORY = [
  { id: 1, name: 'Primeira fornada', goal: { type: 'serve', n: 5 },
    text: 'Abriste a tua pizzaria na Rua do Forno. Os primeiros clientes estão a chegar e só querem uma boa Margherita. Mostra-lhes do que és capaz!',
    tops: ['molho', 'queijo'], maxE: 0, towers: [], zombies: [], custs: ['normal'], coins: 0, tips: true },
  { id: 2, name: 'Visitas indesejadas', goal: { type: 'waves', n: 2 },
    text: 'O cheiro a pizza acordou os zombies do bairro. Planta azeitoneiras na esplanada para proteger a porta, sem deixar de servir os clientes.',
    tops: ['molho', 'queijo', 'pepperoni'], maxE: 1, towers: ['azeitoneira'], zombies: ['normal'], custs: ['normal'], coins: 100, firstWave: 30, gap: 30, tips: true },
  { id: 3, name: 'Paredes de massa', goal: { type: 'waves', n: 3 },
    text: 'Alguns zombies trazem caixas de pizza na cabeça e aguentam mais tiros. Um muro de massa à frente das azeitoneiras ganha-lhes tempo.',
    tops: ['molho', 'queijo', 'pepperoni', 'cogumelo'], maxE: 1, towers: ['azeitoneira', 'muro'], zombies: ['normal', 'caixa'], custs: ['normal', 'crianca'], coins: 100, firstWave: 25, gap: 30 },
  { id: 4, name: 'Clientes exigentes', goal: { type: 'serve', n: 12 },
    text: 'A fama da pizzaria chegou longe. Hoje aparecem um crítico gastronómico e clientes VIP. Serve 12 pizzas sem deixar os zombies entrar.',
    tops: ['molho', 'queijo', 'pepperoni', 'cogumelo', 'azeitona'], maxE: 2, towers: ['azeitoneira', 'muro'], zombies: ['normal', 'caixa'],
    custs: ['normal', 'crianca', 'avo', 'vip', 'critico'], coins: 100, firstWave: 25, gap: 32 },
  { id: 5, name: 'Estafetas da concorrência', goal: { type: 'waves', n: 4 },
    text: 'A pizzaria rival mandou os seus estafetas zombies, que são muito rápidos. O queijo derretido da Queijeira abranda-os.',
    tops: ALL_TOPS, maxE: 2, towers: ['azeitoneira', 'muro', 'queijeira'], zombies: ['normal', 'caixa', 'estafeta'],
    custs: ['normal', 'crianca', 'avo', 'vip', 'critico', 'pressa'], coins: 125, firstWave: 25, gap: 32 },
  { id: 6, name: 'O Rei Zombie', goal: { type: 'waves', n: 5 }, boss: true,
    text: 'Corre o boato de que o Rei Zombie vem aí provar a pizza mais famosa da rua. Guarda o piri-piri para quando ele aparecer na última onda.',
    tops: ALL_TOPS, maxE: 2, towers: ['azeitoneira', 'muro', 'queijeira', 'pimenta'], zombies: ['normal', 'caixa', 'estafeta', 'mota', 'gordo'],
    custs: ['normal', 'crianca', 'avo', 'vip', 'critico', 'pressa', 'indeciso'], coins: 175, firstWave: 25, gap: 34 },
  { id: 7, name: 'Ladrões de moedas', goal: { type: 'serve', n: 15 },
    text: 'Há ladrões a roubar as moedas das pizzarias da rua. Derrota-os depressa para recuperares o que levaram, ou ficas sem dinheiro para defesas.',
    tops: ALL_TOPS, maxE: 3, towers: ['azeitoneira', 'muro', 'queijeira', 'pimenta'], zombies: ['normal', 'caixa', 'estafeta', 'mota', 'gordo', 'ladrao'],
    custs: ['normal', 'crianca', 'avo', 'vip', 'critico', 'pressa', 'indeciso'], coins: 175, firstWave: 20, gap: 30 },
  { id: 8, name: 'Morte súbita', goal: { type: 'lines', n: 5 }, sdAt: 60,
    text: 'Ao fim de um minuto começa a morte súbita e aparece um Tetris no meio da pizzaria. E dizem que anda por aí um chef zombie. Faz 5 linhas sem deixar a cozinha nem a esplanada caírem.',
    tops: ALL_TOPS, maxE: 3, towers: ['azeitoneira', 'muro', 'queijeira', 'pimenta'], zombies: ['normal', 'caixa', 'estafeta', 'mota', 'gordo', 'ladrao', 'chef'],
    custs: ['normal', 'crianca', 'avo', 'vip', 'critico', 'pressa', 'indeciso'], coins: 150, firstWave: 15, gap: 30 },
];
const TOWER_INFO = {
  azeitoneira: 'Dispara azeitonas ao longo da fila.', muro: 'Não ataca, mas aguenta muitas dentadas.',
  queijeira: 'Dispara queijo que abranda os zombies.', pimenta: 'Explode pouco depois de pousada e limpa tudo à volta.',
};
const levelSlices = id => P.story[id] || 0;
const unlocked = id => id === 1 || levelSlices(id - 1) > 0;
function goalLabel(lvl) {
  const g = lvl.goal;
  return g.type === 'serve' ? `Serve ${g.n} pizzas` : g.type === 'waves' ? `Aguenta ${g.n} ondas de zombies` : `Na morte súbita, faz ${g.n} linhas no Tetris`;
}
function goalText() {
  const g = S.story.goal;
  if (g.type === 'serve') return `${Math.min(S.served, g.n)}/${g.n} pizzas`;
  if (g.type === 'waves') return `onda ${Math.min(S.wave, g.n)}/${g.n}`;
  return S.sd ? `${Math.min(S.tet ? S.tet.lines : 0, g.n)}/${g.n} linhas` : 'Tetris em ' + fmtTime(sdAtNow() - S.time);
}
function goalDone() {
  const g = S.story.goal;
  if (g.type === 'serve') return S.served >= g.n;
  if (g.type === 'waves') return S.wave >= g.n && !S.queue.length && !S.zombies.length;
  return !!S.tet && S.tet.lines >= g.n;
}
function sliceRow(n, big) {
  const d = el('span', 'slices' + (big ? ' big' : ''));
  d.setAttribute('aria-label', `${n} de 3 fatias`);
  for (let i = 0; i < 3; i++) d.appendChild(el('i', 'slice' + (i < n ? ' on' : '')));
  return d;
}

function openStory() {
  if (NET.game) leaveRoom();
  S = demoState(); setMpHud(false); syncStage();
  const grid = $('#levelGrid'); grid.textContent = '';
  let total = 0, nextId = null;
  for (const lvl of STORY) {
    const got = levelSlices(lvl.id), open = unlocked(lvl.id);
    total += got;
    if (open && !got && nextId === null) nextId = lvl.id;
    const li = el('li'), b = el('button', 'lvl' + (lvl.id === nextId ? ' next' : '')); b.type = 'button'; b.disabled = !open;
    b.append(el('span', 'n', String(lvl.id)), el('b', null, lvl.name), el('span', 'g', open ? goalLabel(lvl) : `Termina a fase ${lvl.id - 1} para desbloquear`), sliceRow(got));
    b.addEventListener('click', () => openIntro(lvl));
    li.appendChild(b); grid.appendChild(li);
  }
  $('#storySlices').textContent = `${total}/${STORY.length * 3} fatias`;
  showCard('storyCard', false);
  const nb = grid.querySelector('.lvl.next') || grid.querySelector('.lvl:not(:disabled)');
  if (nb) setTimeout(() => nb.focus({ preventScroll: true }), 30);
}

// Novidades de uma fase: tudo o que não existia na fase anterior, com o desenho de cada coisa.
function levelNews(lvl) {
  const prev = STORY.find(l => l.id === lvl.id - 1);
  const was = (key, v) => prev && prev[key].includes(v);
  const out = [];
  for (const t of lvl.tops) if (!was('tops', t)) out.push({ kind: 'top', id: t, name: TOPS[t].label, desc: t === 'molho' || t === 'queijo' ? 'A base de todas as pizzas.' : 'Ingrediente novo nos pedidos.' });
  for (const t of lvl.towers) if (!was('towers', t)) out.push({ kind: 'tower', id: t, name: TOWERS[t].label, desc: TOWER_INFO[t] });
  for (const z of lvl.zombies) if (!was('zombies', z)) out.push({ kind: 'zombie', id: z, name: ZINFO[z][0], desc: ZINFO[z][1] });
  if (lvl.boss) out.push({ kind: 'zombie', id: 'gigante', name: ZINFO.gigante[0], desc: 'Aparece na última onda. Aguenta muito.' });
  for (const c of lvl.custs) if (!was('custs', c)) out.push({ kind: 'cust', id: c, name: c === 'normal' ? 'Cliente' : CTYPES[c].name, desc: c === 'normal' ? 'Pede uma pizza e espera com paciência.' : CTYPES[c].desc });
  if (lvl.sdAt != null) out.push({ kind: 'sd', id: 'sd', name: 'Morte súbita', desc: 'Um Tetris no meio do ecrã. Joga com as setas e o espaço.' });
  return out;
}
function drawNews(c, it) {
  if (it.kind === 'top') {
    c.save(); c.translate(0, 10); c.scale(2, 2);
    if (it.id === 'molho') { c.fillStyle = '#d8402a'; circ(c, 20, 21, 13); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; circ(c, 15, 16, 4); c.fill(); }
    else if (it.id === 'queijo') { c.fillStyle = '#f5c542'; c.beginPath(); c.moveTo(6, 30); c.lineTo(34, 30); c.lineTo(34, 18); c.lineTo(6, 8); c.closePath(); c.fill(); c.fillStyle = '#dca52a'; circ(c, 14, 20, 3); c.fill(); circ(c, 25, 25, 2.5); c.fill(); }
    else drawPiece(c, it.id, 20, 20, it.id === 'azeitona' ? 13 : 11, .3, false);
    c.restore();
  } else if (it.kind === 'tower') TOWER_DRAW[it.id](c, 40, 56, { anim: 0, hp: 1, max: 1, recoil: 0 });
  else if (it.kind === 'zombie') {
    const z = mkZombie(it.id, 0, 1); z.anim = 1; const f = 1 / Math.max(1, ZSTYLE[it.id].k * 1.05);
    c.save(); c.translate(it.id === 'mota' ? 44 : 40, 96); c.scale(f, f); drawZombie(c, z, 0, 0); c.restore();
  } else if (it.kind === 'cust') drawPerson(c, 40, -40, { type: it.id, seed: .3, changed: false, qT: 0, look: { skin: '#e8b890', shirt: '#3d7dd8', hair: '#6b3a1e' } }, 'ok');
  else for (const [x, y, col] of [[14, 60, '#e24a2c'], [32, 60, '#e24a2c'], [50, 60, '#8a4fd6'], [32, 42, '#e24a2c'], [50, 78, '#f4c343'], [32, 78, '#6db552']]) drawBlock(c, x, y, 18, col);
}
let introLvl = null;
function openIntro(lvl) {
  if (!unlocked(lvl.id)) return;
  introLvl = lvl;
  $('#introNum').textContent = `Capítulo 1 · Fase ${lvl.id} de ${STORY.length}`;
  $('#introName').textContent = lvl.name;
  $('#introText').textContent = lvl.text;
  $('#introGoal').textContent = goalLabel(lvl);
  const got = levelSlices(lvl.id);
  $('#introBest').textContent = got ? `O teu melhor: ${got} de 3 fatias` : 'Acaba com os 3 corações para ganhares as 3 fatias.';
  const box = $('#introNew'); box.textContent = '';
  const news = levelNews(lvl);
  $('#introNewWrap').hidden = !news.length;
  for (const it of news) {
    const b = el('div', 'beast'), cv = document.createElement('canvas'), c = setup(cv, 80, 100);
    drawNews(c, it);
    const tx = el('div'); tx.append(el('b', null, it.name), el('span', null, it.desc));
    b.append(cv, tx); box.appendChild(b);
  }
  showCard('introCard');
}
function startLevel(lvl) {
  audioOn();
  S = freshState(undefined, false, lvl); replay = () => startLevel(lvl);
  setMpHud(false); $('#bestStat').hidden = true; syncStage(); showCard(null); syncTools();
  S.banner = { txt: `Fase ${lvl.id}: ${lvl.name}`, sub: goalLabel(lvl), t: 0 };
}
function levelComplete() {
  const lvl = S.story, got = clamp(S.hearts, 1, 3), prev = levelSlices(lvl.id);
  S.mode = 'over';
  if (got > prev) { P.story = { ...P.story, [lvl.id]: got }; saveP(); }
  const next = STORY.find(l => l.id === lvl.id + 1);
  $('#lvlNum').textContent = `Fase ${lvl.id} · ${lvl.name}`;
  $('#lvlTitle').textContent = lvl.id === STORY.length ? 'Capítulo concluído!' : 'Fase concluída!';
  const sl = $('#lvlSlices'); sl.textContent = ''; sl.appendChild(sliceRow(got, true));
  $('#lvlText').textContent = got === 3 ? 'Perfeito: acabaste com os 3 corações.'
    : `Acabaste com ${got} ${got === 1 ? 'coração' : 'corações'}. Repete a fase sem perder clientes para ganhares as 3 fatias.`;
  $('#lvlStars').textContent = sb ? 'A guardar estrelas…' : '';
  awardStars(prev === 0, (earned, err) => {
    $('#lvlStars').textContent = err ? 'Sem ligação ao servidor: as estrelas desta fase não foram guardadas.' : `+${earned} ★ estrelas` + (prev === 0 ? ' (inclui 15 pela primeira vitória)' : '');
  });
  $('#lvlNext').hidden = !next;
  sfx.ding(); setTimeout(() => sfx.coin(), 250);
  showCard('levelCard');
}

// Dicas das primeiras fases: dizem sempre o próximo passo, com a tecla atual de cada ação.
function storyTip() {
  if (!S.story || !S.story.tips || S.mode !== 'play') return null;
  const K = id => keyLabel(bindOf(id));
  if (S.story.zombies.length) {
    if (!S.towers.length && S.coins >= 50) return `Os zombies vêm pela direita. Escolhe a Azeitoneira (tecla ${K('azeitoneira')}) e clica numa casa da esplanada, nas primeiras colunas.`;
    if (S.towers.length < 3 && S.coins >= 50 && S.wave > 0) return `Tens moedas para mais uma Azeitoneira (${K('azeitoneira')}). Protege as filas onde aparecem zombies.`;
  }
  const waiting = S.custs.filter(c => c.st === 'wait').sort((a, b) => a.pat / a.max - b.pat / b.max);
  const cu = waiting[0];
  if (cu && S.rack.some(p => p && keyOf(p.tops) === cu.key)) return `Pizza pronta na prateleira! Clica no cliente ou carrega em ${K('entregar')} para entregar.`;
  if (S.ovens.some(p => p && pizzaState(p) === 'cooked')) return `A barra ficou verde: a pizza está pronta. Clica no forno ou carrega em ${K('tirar')} para a tirar antes que queime.`;
  if (!cu) return S.served ? null : 'Espera pelo primeiro cliente…';
  if (!S.board) return S.ovens.some(Boolean) ? `Enquanto a pizza coze, podes começar outra: ${K('massa')} para pôr massa.` : `Um cliente quer uma pizza. Clica na bancada ou carrega em ${K('massa')} para pôr massa.`;
  const need = cu.order.filter(t => !S.board.tops.includes(t));
  if (need.length) return `O balão do cliente mostra o pedido. Junta ${TOPS[need[0]].label.toLowerCase()} (tecla ${K(need[0])}).`;
  return `Pizza montada! Clica na bancada ou carrega em ${K('forno')} para a meter no forno.`;
}
function renderTip() {
  const t = storyTip(), box = $('#tip');
  if (hudCache.tip === t) return; hudCache.tip = t;
  box.hidden = !t; box.textContent = t || '';
}

$('#storyBtn').addEventListener('click', openStory);
$('#storyBack').addEventListener('click', () => showCard('menuCard'));
$('#introPlay').addEventListener('click', () => { if (introLvl) startLevel(introLvl); });
$('#introBack').addEventListener('click', openStory);
$('#lvlNext').addEventListener('click', () => { const n = STORY.find(l => l.id === S.story.id + 1); if (n) openIntro(n); });
$('#lvlRetry').addEventListener('click', () => replay());
$('#lvlMap').addEventListener('click', openStory);

/* ---------- personalizar ---------- */
let curTab = 'perfil', pendingBuy = null;
function renderCustom() {
  const tabs = $('#customTabs'); tabs.textContent = '';
  for (const [id, name] of TABS) {
    const b = el('button', 'tab', name); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(curTab === id));
    b.addEventListener('click', () => { curTab = id; PREVIEW = null; pendingBuy = null; renderCustom(); });
    tabs.appendChild(b);
  }
  const body = $('#customBody'); body.textContent = '';
  if (curTab === 'perfil') {
    const f1 = el('div', 'field'); const l1 = el('label', null, 'O teu nome'); l1.htmlFor = 'pName';
    const i1 = el('input', 'input'); i1.id = 'pName'; i1.maxLength = 16; i1.value = P.name; i1.placeholder = 'Ex.: Gabriel';
    i1.addEventListener('input', () => { setName(i1.value); });
    f1.append(l1, i1);
    const f2 = el('div', 'field'); const l2 = el('label', null, 'Nome da pizzaria'); l2.htmlFor = 'pShop';
    const i2 = el('input', 'input'); i2.id = 'pShop'; i2.maxLength = 24; i2.value = P.shop; i2.placeholder = shopName();
    i2.addEventListener('input', () => { P.shop = cleanName(i2.value, 24); saveP(); syncShop(); });
    f2.append(l2, i2);
    const f3 = el('div', 'field'); f3.appendChild(el('p', 'sub', 'Cor da equipa'));
    const tw = el('div', 'teams');
    for (const t of TEAM) {
      const b = el('button', 'team'); b.type = 'button'; b.style.background = t.c; b.title = t.name; b.setAttribute('aria-label', t.name); b.setAttribute('aria-pressed', String(P.team === t.id));
      b.addEventListener('click', () => { P.team = t.id; saveP(); renderCustom(); syncShop(); pushLobby(); if (NET.game) NET.game.presence({ color: P.team }).catch(() => {}); });
      tw.appendChild(b);
    }
    f3.appendChild(tw);
    body.append(f1, f2, f3, el('p', 'note', 'A cor da equipa aparece no toldo da pizzaria e ao lado do teu nome no multijogador.'));
    return;
  }
  for (const cat of CUSTOM.filter(c => c.tab === curTab)) {
    body.appendChild(el('h3', 'cat-h', cat.label));
    const grid = el('div', 'opts');
    const selId = (cat.opts.find(o => o.id === P.sel[cat.cat] && owns(o)) || cat.opts[0]).id;
    for (const o of cat.opts) {
      const b = el('button', 'opt'); b.type = 'button';
      const sw = el('span', 'sw');
      for (const v of Object.values(o.v)) if (typeof v === 'string' && v[0] === '#' && sw.children.length < 4) { const i = el('i'); i.style.background = v; sw.appendChild(i); }
      if (o.v.rainbow) { sw.textContent = ''; for (const col of ['#e24a2c', '#f4c343', '#6db552', '#3d7dd8']) { const i = el('i'); i.style.background = col; sw.appendChild(i); } }
      b.appendChild(sw); b.appendChild(el('span', null, o.name));
      let st;
      if (o.id === selId) { st = 'Em uso'; b.classList.add('on'); }
      else if (owns(o)) st = 'Usar';
      else if (pendingBuy === o.id) { st = P.stars >= o.price ? `Comprar por ★ ${o.price}` : `Faltam ★ ${o.price - P.stars}`; b.classList.add('pending'); }
      else { st = `★ ${o.price}`; b.classList.add('locked'); }
      b.appendChild(el('span', 'st', st));
      b.addEventListener('click', () => clickOpt(cat, o));
      grid.appendChild(b);
    }
    body.appendChild(grid);
  }
}
let buying = false;
function clickOpt(cat, o) {
  if (owns(o)) { P.sel[cat.cat] = o.id; PREVIEW = null; pendingBuy = null; saveP(); sfx.pop(); }
  else if (pendingBuy === o.id) {
    if (P.stars < o.price) sfx.err();
    else if (sb) {
      if (buying) return;
      buying = true; $('#customMsg').textContent = 'A comprar…';
      buyCosmetic(o.id).then(r => {
        P.stars = r.stars; P.owned = r.owned; P.sel[cat.cat] = o.id; PREVIEW = null; pendingBuy = null; saveP(); sfx.coin();
        $('#customMsg').textContent = `Compraste: ${o.name}.`;
      }).catch(e => {
        console.warn(e); sfx.err();
        $('#customMsg').textContent = 'Não foi possível comprar. Verifica a ligação e tenta outra vez.';
      }).finally(() => { buying = false; renderCustom(); syncShop(); });
      return;
    } else { P.stars -= o.price; P.owned.push(o.id); P.sel[cat.cat] = o.id; PREVIEW = null; pendingBuy = null; saveP(); sfx.coin(); }
  } else { PREVIEW = { cat: cat.cat, id: o.id }; pendingBuy = o.id; audioOn(); sfx.tick(); }
  renderCustom(); syncShop();
}
function setName(v) {
  P.name = cleanName(v); saveP(); syncShop();
  if ($('#nick').value !== P.name) $('#nick').value = P.name;
  if (NET.game) NET.game.presence({ name: myName() }).catch(() => {});
  pushLobby();
}

/* ---------- como jogar ---------- */
let howBuilt = false;
function buildHow() {
  if (howBuilt) return; howBuilt = true;
  const cb = $('#custBest');
  for (const [id, d] of Object.entries(CTYPES)) {
    if (!d.name) continue;
    const box = el('div', 'beast'), cv = document.createElement('canvas'), c = setup(cv, 80, 100);
    const cu = { type: id, seed: .3, changed: false, qT: 0, look: { skin: '#e8b890', shirt: '#3d7dd8', hair: '#6b3a1e' } };
    drawPerson(c, 40, -40, cu, 'ok');
    const tx = el('div'); tx.append(el('b', null, d.name), el('span', null, d.desc));
    box.append(cv, tx); cb.appendChild(box);
  }
  const zb = $('#zombBest');
  for (const [id, [name, desc]] of Object.entries(ZINFO)) {
    const box = el('div', 'beast'), cv = document.createElement('canvas'), c = setup(cv, 80, 100);
    const z = mkZombie(id, 0, 1); z.anim = 1; const k = ZSTYLE[id].k, f = 1 / Math.max(1, k * 1.05);
    c.save(); c.translate(id === 'mota' ? 44 : 40, 96); c.scale(f, f); drawZombie(c, z, 0, 0); c.restore();
    const tx = el('div'); tx.append(el('b', null, name), el('span', null, desc));
    box.append(cv, tx); zb.appendChild(box);
  }
  const sl = $('#sabList');
  for (const s of SABS) { const li = el('li'); li.append(el('b', null, `${s.name} (${s.cost} moedas): `), document.createTextNode(s.desc)); sl.appendChild(li); }
}

/* ---------- multijogador ---------- */
// Tudo passa pela "presença" da sala: cada jogador publica o seu estado (nome, pronto, pontos, eventos)
// e lê o dos outros. Não há servidor próprio nem autoridade central.
const NET = { api: null, game: null, code: null, phase: 'out', ready: false, match: null, lastMatchId: null,
  roster: [], final: {}, seen: {}, evSeq: 0, evLog: [], st: null, why: null, tOut: null, pushT: 0, lastPush: '', lobbyKey: '', rivT: 0, overSound: false, winAwarded: false };
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 4 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
const nickIn = $('#nick'); nickIn.value = P.name;
nickIn.addEventListener('input', () => setName(nickIn.value));
const STATUS = { lobby: ['à espera', ''], ready: ['pronto', 'ok'], count: ['a jogar', 'live'], play: ['a jogar', 'live'], dead: ['eliminado', 'bad'], win: ['venceu', 'ok'], left: ['saiu', 'bad'] };
const pill = st => { const [t, c] = STATUS[st] || STATUS.lobby; return el('span', 'pill ' + c, t); };
const validTeam = id => TEAM.some(t => t.id === id) ? id : 'tomate';

function setMpEnabled(on) { $('#createBtn').disabled = !on; $('#joinForm button').disabled = !on; }
setMpEnabled(false);
const roomReady = Promise.resolve(createRoomApi(sb));
roomReady.then(api => {
  if (!api) { mpUnavailable(); return; }
  NET.api = api; setMpEnabled(true);
  api.onPeers(() => { if (!NET.game) renderOpenRooms(); }, () => mpUnavailable());
  pushLobby(); renderOpenRooms();
}).catch(mpUnavailable);
function mpUnavailable() {
  NET.api = null; setMpEnabled(false); $('#mpOff').hidden = false;
  const ul = $('#openRooms'); ul.textContent = ''; ul.appendChild(el('li', 'empty', 'Sem ligação às salas.'));
}
function pushLobby() {
  if (!NET.api) return;
  const st = { name: myName(), color: P.team, room: NET.code, open: NET.phase === 'lobby' };
  const key = JSON.stringify(st); if (key === NET.lobbyKey) return; NET.lobbyKey = key;
  NET.api.presence(st).catch(() => {});
}
function renderOpenRooms() {
  const ul = $('#openRooms'); if (!NET.api) return;
  const rooms = new Map();
  for (const p of NET.api.peers()) {
    if (p.sameTab || p.kind !== 'viewer') continue;
    const pr = p.presence || {};
    const code = typeof pr.room === 'string' && /^[A-Z2-9]{4}$/.test(pr.room) ? pr.room : null;
    if (!code) continue;
    const r = rooms.get(code) || { code, names: [], open: false };
    r.names.push(cleanName(pr.name) || 'Pizzaiolo'); r.open = r.open || pr.open === true;
    rooms.set(code, r);
  }
  ul.textContent = '';
  if (!rooms.size) { ul.appendChild(el('li', 'empty', 'Não há salas abertas. Cria uma e partilha o código.')); return; }
  for (const r of rooms.values()) {
    const li = el('li');
    li.append(el('span', 'num', r.code), el('span', 'nm', r.names.join(', ')), pill(r.open ? 'lobby' : 'play'));
    const b = el('button', 'btn-sm', 'Entrar'); b.type = 'button'; b.disabled = !r.open;
    b.addEventListener('click', () => joinRoom(r.code));
    li.appendChild(b); ul.appendChild(li);
  }
}
async function joinRoom(code) {
  if (!NET.api) return;
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) { $('#codeIn').focus(); return; }
  audioOn();
  if (NET.game) await leaveRoom();
  let g;
  try { g = await NET.api.join('pz-' + code.toLowerCase()); }
  catch (e) { const ul = $('#openRooms'); ul.textContent = ''; ul.appendChild(el('li', 'empty', 'Não foi possível entrar na sala. Tenta outra vez.')); return; }
  Object.assign(NET, { game: g, code, phase: 'lobby', ready: false, match: null });
  g.onPeers(onGamePeers, () => { if (NET.game === g) { leaveRoom(); if (S.mode !== 'play') showCard('mpCard'); } });
  await g.presence({ name: myName(), color: P.team, ready: false, match: null, st: 'lobby', ev: [] }).catch(() => {});
  renderMp(); pushLobby();
}
async function leaveRoom() {
  const g = NET.game;
  Object.assign(NET, { game: null, code: null, phase: 'out', ready: false, match: null });
  if (g) await g.leave().catch(() => {});
  renderMp(); pushLobby();
}
function gamePlayers() {
  if (!NET.game) return [];
  return NET.game.peers().filter(p => p.kind === 'viewer' && p.presence && typeof p.presence.name === 'string');
}
function onGamePeers() {
  const ps = gamePlayers();
  if (NET.match) for (const p of ps) {
    if (p.sameTab) continue;
    const pr = p.presence;
    if (pr.match && pr.match.id === NET.match.id) {
      NET.final[p.peer] = {
        name: cleanName(pr.name) || 'Rival', color: teamColor(validTeam(pr.color)), score: Math.max(0, Math.floor(+pr.score || 0)),
        hearts: clamp(Math.floor(+pr.hearts || 0), 0, 3), st: ['count', 'play', 'dead', 'win'].includes(pr.st) ? pr.st : 'play',
        tOut: Number.isFinite(pr.tOut) ? pr.tOut : null, lastT: Number.isFinite(pr.t) ? pr.t : 0,
      };
    }
  }
  if (NET.phase === 'lobby') { lobbyLogic(ps); renderMp(); }
  else if (NET.phase !== 'out') { receiveEvents(ps); renderRivals(); if (NET.phase === 'over') renderResults(); }
}
function lobbyLogic(ps) {
  const host = [...ps].sort((a, b) => a.peer < b.peer ? -1 : 1)[0];
  if (!host) return;
  if (host.sameTab) {
    const allReady = ps.length >= 2 && ps.every(p => p.presence.ready === true);
    if (allReady && NET.phase === 'lobby') startCountdown({ id: 'm' + Math.random().toString(36).slice(2, 9), seed: (Math.random() * 2 ** 31) | 0 }, ps);
  } else if (NET.ready) {
    const m = host.presence.match;
    if (m && typeof m.id === 'string' && Number.isFinite(m.seed) && m.id !== NET.lastMatchId) startCountdown({ id: m.id.slice(0, 12), seed: m.seed | 0 }, ps);
  }
}
function startCountdown(m, ps) {
  Object.assign(NET, { phase: 'count', match: m, lastMatchId: m.id, ready: false, final: {}, seen: {}, evSeq: 0, evLog: [], st: 'count', why: null, tOut: null, lastPush: '', overSound: false, winAwarded: false });
  NET.roster = ps.map(p => ({ peer: p.peer, me: p.sameTab }));
  for (const p of ps) if (!p.sameTab) NET.final[p.peer] = { name: cleanName(p.presence.name) || 'Rival', color: teamColor(validTeam(p.presence.color)), score: 0, hearts: 3, st: 'count', tOut: null, lastT: 0 };
  NET.game.presence({ ready: false, match: m, st: 'count', score: 0, hearts: 3, wave: 0, ev: [], tOut: null, t: 0 }).catch(() => {});
  pushLobby();
  let n = 3; $('#countNum').textContent = n; showCard('countCard', false); sfx.pop();
  const iv = setInterval(() => {
    n--;
    if (NET.phase !== 'count') { clearInterval(iv); return; }
    if (n > 0) { $('#countNum').textContent = n; sfx.pop(); }
    else { clearInterval(iv); beginMatch(); }
  }, 1000);
}
function beginMatch() {
  S = freshState(NET.match.seed, true);
  NET.phase = 'play'; NET.st = 'play';
  setMpHud(true); syncStage(); showCard(null); renderRivals(); pushGame(true); sfx.wave();
}
function pushGame(force) {
  if (!NET.game || !NET.match) return;
  const now = performance.now();
  if (!force && now - NET.pushT < 500) return;
  NET.pushT = now;
  const st = { match: NET.match, st: NET.st, score: Math.floor(S.score), hearts: Math.max(0, S.hearts), wave: S.wave, ev: NET.evLog, tOut: NET.tOut, t: Math.floor(S.time), color: P.team };
  const key = JSON.stringify(st); if (key === NET.lastPush) return; NET.lastPush = key;
  NET.game.presence(st).catch(() => {});
}
function sendEv(kind) { if (!S.mp) return; NET.evSeq++; NET.evLog = [...NET.evLog, [NET.evSeq, kind]].slice(-10); pushGame(true); }
function receiveEvents(ps) {
  if (!NET.match) return;
  for (const p of ps) {
    if (p.sameTab) continue;
    const pr = p.presence;
    if (!pr.match || pr.match.id !== NET.match.id || !Array.isArray(pr.ev)) continue;
    const seen = NET.seen[p.peer] || 0; let mx = seen, n = 0;
    const from = cleanName(pr.name) || 'Um rival';
    for (const e of pr.ev) {
      if (!Array.isArray(e) || !Number.isInteger(e[0]) || e[0] <= seen || e[0] > seen + 30) continue;
      mx = Math.max(mx, e[0]);
      if ((e[1] === 'z' || SABMAP[e[1]]) && n++ < 5) applyEv(e[1], from);
    }
    NET.seen[p.peer] = mx;
  }
}
const isAlive = r => r.st === 'play' || r.st === 'count' || r.st === 'win';
function rivalsAlive() { return standings().some(r => !r.me && isAlive(r)); }
function standings() {
  const inRoom = new Set(gamePlayers().map(p => p.peer));
  const rows = NET.roster.map(r => {
    if (r.me) return { name: myName(), color: teamColor(P.team), me: true, score: Math.floor(S.score), hearts: clamp(S.hearts, 0, 3), st: NET.st, tOut: NET.tOut };
    const f = NET.final[r.peer] || { name: 'Rival', color: '#888', score: 0, hearts: 0, st: 'count', tOut: null, lastT: 0 };
    let st = f.st, tOut = f.tOut;
    if (!inRoom.has(r.peer) && st !== 'dead' && st !== 'win') { st = 'left'; if (tOut == null) tOut = f.lastT; }
    return { ...f, me: false, st, tOut };
  });
  return rows.sort((a, b) => (isAlive(b) - isAlive(a)) || ((b.tOut || 0) - (a.tOut || 0)) || (b.score - a.score));
}
function renderRivals() {
  const box = $('#rivals'); if (!S.mp) return;
  box.textContent = '';
  for (const r of standings()) {
    const d = el('div', 'rival' + (r.me ? ' me' : ''));
    const dot = el('span', 'dot'); dot.style.background = r.color;
    d.append(dot, el('span', 'nm', r.me ? r.name + ' (tu)' : r.name), el('b', null, String(r.score)), el('span', 'h', '♥'.repeat(r.hearts)), pill(r.st));
    box.appendChild(d);
  }
}
function finishMp(st, why) {
  if (S.mode !== 'play') return;
  S.mode = 'over'; NET.st = st; NET.phase = 'over'; NET.why = why || null; NET.tOut = st === 'dead' ? S.time : null;
  pushGame(true);
  S.earned = null; S.earnErr = false;
  awardStars(st === 'win', (earned, err) => { S.earned = err ? null : earned; S.earnErr = !!err; if (NET.phase === 'over') renderResults(); });
  if (st === 'win') NET.winAwarded = true;
  if (st === 'win') sfx.ding(); else sfx.angry();
  renderResults(); showCard('mpOverCard');
}
function renderResults() {
  const rows = standings(), me = rows.find(r => r.me);
  const over = rows.filter(isAlive).length <= 1;
  if (over) {
    const top = rows[0];
    $('#mpTitle').textContent = top.me ? 'Ganhaste!' : 'Ganhou ' + top.name;
    $('#mpText').textContent = top.me ? `Foste o último de pé, com ${me.score} pontos.` : `Aguentaste até ao ${rows.indexOf(me) + 1}.º lugar, com ${me.score} pontos. Joga outra vez para a desforra.`;
    if (top.me && !NET.winAwarded && !sb) { NET.winAwarded = true; P.stars += 15; S.earned = (S.earned || 0) + 15; saveP(); syncShop(); }
    if (!NET.overSound) { NET.overSound = true; if (top.me) sfx.coin(); }
  } else {
    $('#mpTitle').textContent = { kitchen: 'A pizzaria fechou', lawn: 'Os zombies entraram', tetris: 'O Tetris encheu' }[NET.why] || 'Eliminado';
    $('#mpText').textContent = `Ficas com ${me.score} pontos. À espera que os outros acabem…`;
  }
  $('#mpStars').textContent = S.earned != null ? `+${S.earned} ★ estrelas` : S.earnErr ? 'Sem ligação ao servidor: as estrelas não foram guardadas.' : sb ? 'A guardar estrelas…' : '';
  const ol = $('#mpTable'); ol.textContent = '';
  rows.forEach((r, i) => {
    const li = el('li'), dot = el('span', 'dot'); dot.style.background = r.color;
    li.append(el('span', 'rk', String(i + 1)), dot, el('span', 'nm', r.me ? r.name + ' (tu)' : r.name), pill(r.st), el('span', 'num', String(r.score)));
    ol.appendChild(li);
  });
}
function renderMp() {
  const inRoom = !!NET.game;
  $('#mpOut').hidden = inRoom; $('#mpIn').hidden = !inRoom;
  if (!inRoom) { renderOpenRooms(); return; }
  $('#roomCode').textContent = NET.code;
  const ps = gamePlayers().sort((a, b) => a.peer < b.peer ? -1 : 1);
  const ul = $('#plist'); ul.textContent = '';
  if (!ps.length) ul.appendChild(el('li', 'empty', 'A ligar à sala…'));
  for (const p of ps) {
    const pr = p.presence, li = el('li'), dot = el('span', 'dot'); dot.style.background = teamColor(validTeam(pr.color));
    const st = (pr.st === 'play' || pr.st === 'count') ? 'play' : pr.ready === true ? 'ready' : 'lobby';
    li.append(dot, el('span', 'nm', (cleanName(pr.name) || 'Pizzaiolo') + (p.sameTab ? ' (tu)' : '')), pill(st));
    ul.appendChild(li);
  }
  $('#readyBtn').textContent = NET.ready ? 'Cancelar' : 'Estou pronto';
  const busy = ps.some(p => !p.sameTab && (p.presence.st === 'play' || p.presence.st === 'count'));
  $('#roomHint').textContent = ps.length < 2 ? 'Partilha o código com um amigo. São precisos pelo menos 2 jogadores.'
    : busy ? 'Há uma partida a decorrer nesta sala. Espera que acabe.' : 'A partida começa quando todos estiverem prontos.';
}
function backToRoom() {
  if (!NET.game) { toMenu(); return; }
  Object.assign(NET, { phase: 'lobby', ready: false, match: null, st: null, roster: [] });
  S = demoState(); setMpHud(false); syncStage(); hudCache.fx = null; renderEffects();
  NET.game.presence({ ready: false, match: null, st: 'lobby', ev: [], score: null, hearts: null, wave: null, tOut: null, t: null }).catch(() => {});
  renderMp(); showCard('mpCard'); pushLobby();
}
$('#mpBtn').addEventListener('click', () => { audioOn(); renderMp(); showCard('mpCard', false); if (!P.name) nickIn.focus(); });
$('#mpBack').addEventListener('click', () => { if (NET.game) leaveRoom(); showCard('menuCard'); });
$('#createBtn').addEventListener('click', () => joinRoom(newCode()));
$('#joinForm').addEventListener('submit', e => { e.preventDefault(); joinRoom($('#codeIn').value); });
$('#leaveBtn').addEventListener('click', () => leaveRoom());
$('#readyBtn').addEventListener('click', () => {
  if (!NET.game) return;
  audioOn(); NET.ready = !NET.ready;
  NET.game.presence({ ready: NET.ready, name: myName(), color: P.team }).then(onGamePeers, () => {});
  renderMp();
});
$('#copyCode').addEventListener('click', e => {
  const btn = e.currentTarget;
  navigator.clipboard.writeText(NET.code || '').then(() => { btn.textContent = 'Copiado'; setTimeout(() => { btn.textContent = 'Copiar código'; }, 1500); })
    .catch(() => { const r = document.createRange(); r.selectNodeContents($('#roomCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
});
$('#backRoomBtn').addEventListener('click', backToRoom);
$('#exitMpBtn').addEventListener('click', toMenu);
function netTick() {
  if (S.mode === 'play') {
    pushGame(false);
    if (NET.phase === 'play' && NET.roster.length > 1 && S.time > 2 && !standings().some(r => !r.me && isAlive(r))) finishMp('win');
  }
  const now = performance.now();
  if (now - NET.rivT > 300) { NET.rivT = now; renderRivals(); }
}

/* ---------- teclado e ciclo ---------- */
// Mudar uma tecla em Opções: apanha a próxima tecla antes do jogo a ver.
let bindingAct = null;
addEventListener('keydown', e => {
  if (!bindingAct) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.code === 'Escape') { bindingAct = null; renderOptions(); return; }
  if (/^(Shift|Control|Alt|Meta|OS)/.test(e.code) || !e.code) return;
  const id = bindingAct, prev = bindOf(id), code = e.code;
  const other = ACT_LIST.find(a => a.id !== id && bindOf(a.id) === code);
  if (other) P.keys[other.id] = prev || '';
  P.keys[id] = code;
  if (e.key && e.key.length === 1 && e.key !== ' ') P.keyNames[code] = e.key.toUpperCase();
  bindingAct = null; saveP(); rebuildKeys();
  renderOptions(other ? other.id : id);
  $('#keysNote').textContent = other ? `${other.label} passou para a tecla ${keyLabel(prev)}.` : `${ACT_MAP[id].label}: ${keyLabel(code)}.`;
  sfx.pop();
}, true);
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.code === 'Escape') {
    if (S.mode === 'pause') resume();
    else if (S.mode === 'play') { if (S.tool) { S.tool = null; syncTools(); } else pause(); }
    return;
  }
  const act = CODE2ACT[e.code];
  if (!act) return;
  if (act === 'pausa') { e.preventDefault(); if (!e.repeat) { if (S.mode === 'pause') resume(); else pause(); } return; }
  if (S.mode !== 'play') return;
  if (act.startsWith('t-') && !S.sd) return;
  if (act.startsWith('s-') && !S.mp) return;
  e.preventDefault();
  if (e.repeat && !REPEATABLE.has(act)) return;
  runAction(act);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

S = demoState();
syncShop(); syncStage(); rebuildKeys();
// Com servidor: o perfil guardado lá manda. No primeiro acesso, envia-se o que já estava no browser.
(async () => {
  if (!sb) return;
  try {
    const row = await loadProfile();
    if (!row) return;
    P.stars = row.stars; P.owned = Array.isArray(row.owned) ? row.owned : []; P.best = row.best || 0;
    // Progresso da história: fica o melhor entre o servidor e o browser (é só progresso, não dá moeda).
    const st = row.story && typeof row.story === 'object' ? row.story : {};
    for (const [k, v] of Object.entries(P.story)) if ((st[k] || 0) < v) st[k] = v;
    P.story = st;
    const edited = row.name || row.shop || row.team !== 'tomate' || Object.keys(row.sel || {}).length || Object.keys(row.keys || {}).length;
    if (edited) {
      P.name = cleanName(row.name); P.shop = cleanName(row.shop, 24); P.team = TEAM.some(t => t.id === row.team) ? row.team : 'tomate';
      P.sel = row.sel || {}; P.keys = row.keys || {}; P.keyNames = row.key_names || {}; P.muted = !!row.muted;
      LS.set('pizzaria-sitiada-perfil', JSON.stringify(P));
    } else saveP();
    muted = !!P.muted; nickIn.value = P.name;
    for (const id of ['soundBtn', 'optSound']) document.getElementById(id).textContent = 'Som: ' + (muted ? 'desligado' : 'ligado');
    syncShop(); rebuildKeys(); refreshIcons();
    if (curCard === 'customCard') renderCustom();
  } catch (e) { console.warn('Sem ligação ao servidor; a jogar offline', e); }
})();
muted = !!P.muted;
for (const id of ['soundBtn', 'optSound']) document.getElementById(id).textContent = 'Som: ' + (muted ? 'desligado' : 'ligado');
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; G += dt;
  if (S.mode === 'play') update(dt); else if (S.mode === 'menu') idle(dt);
  if (S.mp) netTick();
  syncStage();
  renderK(); renderD(); if (S.sd) renderT(); hud();
  if (curCard === 'menuCard' && !overlay.hidden) drawPreview(mpx);
  if (curCard === 'customCard' && !overlay.hidden) drawPreview(cpx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
