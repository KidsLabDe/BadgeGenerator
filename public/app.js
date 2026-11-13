import {
  CATEGORIES, JOKER, SKILL_LEVELS, CREATURES, EXTRAS, LEARN_TAGS, WEAKNESSES, RESISTANCES,
  ROLES, FUN_GROUPS, BINGO_COMMON,
} from './data.js';

const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(3, '0');

// ---------------- Zustand ----------------
function freshState() {
  return {
    id: null, no: null,
    role: 'teen', name: '',
    skills: Object.fromEntries(CATEGORIES.map((c) => [c.id, { level: 0, tags: new Set(), custom: [] }])),
    creature: '', extras: new Set(), avatarText: '',
    learn: new Set(),
    fun: Object.fromEntries(FUN_GROUPS.map((g) => [g.id, new Set()])), favArtist: '',
    gen: null,          // Texte von Gemini
    image: null,        // HTMLImageElement
    imageSrc: null, avatarDirty: false,
    bingo: null,        // 9 Felder
    seed: Math.random(),
  };
}
let state = freshState();

// Profil-Teil, der gespeichert wird (Sets → Arrays)
function serialize() {
  return {
    role: state.role, name: state.name,
    skills: Object.fromEntries(Object.entries(state.skills).map(([k, v]) => [k, { level: v.level, tags: [...v.tags], custom: v.custom }])),
    creature: state.creature, extras: [...state.extras], avatarText: state.avatarText,
    learn: [...state.learn],
    fun: Object.fromEntries(Object.entries(state.fun).map(([k, v]) => [k, [...v]])), favArtist: state.favArtist,
    seed: state.seed,
  };
}
function deserialize(s = {}) {
  const st = freshState();
  Object.assign(st, {
    role: s.role || 'teen', name: s.name || '', creature: s.creature || '', avatarText: s.avatarText || '',
    favArtist: s.favArtist || '', seed: s.seed ?? st.seed,
    extras: new Set(s.extras || []), learn: new Set(s.learn || []),
  });
  for (const [k, v] of Object.entries(s.skills || {})) if (st.skills[k]) st.skills[k] = { level: v.level || 0, tags: new Set(v.tags || []), custom: v.custom || [] };
  for (const [k, v] of Object.entries(s.fun || {})) if (st.fun[k]) st.fun[k] = new Set(v);
  return st;
}

// ---------------- UI aufbauen ----------------
function chip(label, on, onClick) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'chip' + (on ? ' on' : ''); b.textContent = label;
  b.onclick = () => { onClick(); b.classList.toggle('on'); changed(); };
  return b;
}
function toggle(set, v) { set.has(v) ? set.delete(v) : set.add(v); }
function single(root, items, get, set) {
  root.innerHTML = '';
  for (const it of items) {
    const b = chip(`${it.emoji} ${it.label || it.id}`, get() === it.id, () => {});
    b.onclick = () => { set(get() === it.id && it.id !== 'teen' && it.id !== 'mentor' ? '' : it.id); root.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); if (get()) b.classList.add('on'); changed(); };
    root.append(b);
  }
}

function buildSkills() {
  const root = $('#skills'); root.innerHTML = '';
  for (const c of CATEGORIES) {
    const s = state.skills[c.id];
    const el = document.createElement('div');
    el.className = 'skill' + (s.level ? ' active' : '');
    el.innerHTML = `<div class="skill-head"><span class="emoji">${c.emoji}</span>${c.label}<span class="lvl">${SKILL_LEVELS[s.level]}</span></div>
      <input type="range" min="0" max="3" step="1" value="${s.level}" aria-label="${c.label}">`;
    const chips = document.createElement('div'); chips.className = 'chips';
    for (const t of [...c.tags, ...s.custom]) chips.append(chip(t, s.tags.has(t), () => toggle(s.tags, t)));
    el.append(chips);
    const range = el.querySelector('input');
    range.oninput = () => {
      s.level = Number(range.value);
      el.classList.toggle('active', s.level > 0);
      el.querySelector('.lvl').textContent = SKILL_LEVELS[s.level];
      changed();
    };
    root.append(el);
  }
}

function buildChips() {
  single($('#role'), ROLES, () => state.role, (v) => { state.role = v || 'teen'; updateRoleTexts(); });
  single($('#creatures'), CREATURES, () => state.creature, (v) => { state.creature = v; });
  const ex = $('#extras'); ex.innerHTML = '';
  for (const e of EXTRAS) ex.append(chip(e, state.extras.has(e), () => toggle(state.extras, e)));
  const le = $('#learn'); le.innerHTML = '';
  for (const l of LEARN_TAGS) le.append(chip(l.label, state.learn.has(l.label), () => toggle(state.learn, l.label)));
}

function buildFun() {
  const root = $('#fun'); root.innerHTML = '';
  for (const g of FUN_GROUPS) {
    const row = document.createElement('div'); row.className = 'fun-group';
    row.innerHTML = `<div class="fun-label">${g.emoji} ${g.label}</div>`;
    const chips = document.createElement('div'); chips.className = 'chips';
    for (const o of g.options) chips.append(chip(o.l, state.fun[g.id].has(o.id), () => toggle(state.fun[g.id], o.id)));
    row.append(chips); root.append(row);
  }
}

function bindInputs() {
  for (const id of ['name', 'avatarText', 'favArtist']) {
    const el = $('#' + id); el.value = state[id];
    el.oninput = () => { state[id] = el.value; el.classList.remove('missing'); changed(); };
  }
}

function updateRoleTexts() {
  const m = state.role === 'mentor';
  $('#learnTitle').textContent = m ? 'Was willst du selbst hier lernen?' : 'Was willst du hier ausprobieren?';
}

function buildAll() { buildSkills(); buildChips(); buildFun(); bindInputs(); updateRoleTexts(); busy(false); changed(); }

// ---------------- abgeleitete Werte ----------------
function rankedSkills() {
  return CATEGORIES.map((c, i) => ({ c, i, ...state.skills[c.id] }))
    .filter((s) => s.level > 0)
    .sort((a, b) => b.level - a.level || b.tags.size - a.tags.size || a.i - b.i);
}
function types() {
  const r = rankedSkills().slice(0, 2).map((s) => s.c);
  return r.length ? r : [JOKER];
}
function pick(arr, salt = 0) { return arr[Math.floor(((state.seed * 9301 + salt * 49297) % 1) * arr.length)]; }

function profile() {
  return {
    role: state.role,
    name: state.name.trim(),
    skills: CATEGORIES.map((c) => ({ label: c.label, level: state.skills[c.id].level, tags: [...state.skills[c.id].tags] })),
    avatar: { creature: state.creature, extras: [...state.extras], text: state.avatarText.trim() },
    learnTags: [...state.learn],
    // Fun Facts gehen bewusst NICHT an Gemini – sie sind geheim fürs Bingo
  };
}

// lokaler Text, solange noch nichts generiert wurde (oder offline)
function localText() {
  const mentor = state.role === 'mentor';
  const attacks = rankedSkills().slice(0, 2).map((s, k) => {
    const tag = [...s.tags][0];
    return {
      name: pick(s.c.attacks, k + 1),
      effect: tag ? `Hilft deinem Team bei allem rund um ${tag}.` : `Bringt ${s.c.label}-Power ins Team.`,
      level: s.level,
    };
  });
  if (!attacks.length) attacks.push({ name: 'Neugier-Strahl', effect: 'Probiert alles einmal aus und lernt dabei rasend schnell.', level: 1 });
  const learn = [...state.learn];
  return {
    title: mentor ? 'Mentor*in' : '', creature: state.creature && state.creature !== 'Überrasch mich!' ? state.creature : '',
    attacks,
    weakness: pick(WEAKNESSES, 7), resistance: pick(RESISTANCES, 11),
    flavor: mentor ? 'Ich helfe gern – sprich mich einfach an!'
      : learn.length ? `Will hier ${learn.slice(0, 2).join(' & ')} ausprobieren. Sprich mich an!` : 'Gerade frisch geschlüpft – sag Hallo!',
  };
}

// ---------------- Bingo ----------------
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const OPTS = Object.fromEntries(FUN_GROUPS.flatMap((g) => g.options.map((o) => [o.id, o])));

// pool = anonymer Vorrat der anderen (vom Server): welche Chips, Typen, Lernwünsche es schon gibt
function buildBingo(pool) {
  const mine = new Set(Object.values(state.fun).flatMap((s) => [...s]));
  const used = new Set(); const fields = [];
  const addFun = (id, kind = 'fun') => {
    if (used.has(id) || !OPTS[id]) return false;
    used.add(id); fields.push({ kind, text: (kind === 'same' ? 'auch ' : '') + OPTS[id].f }); return true;
  };

  // 1 Feld: Lernen / Helfen (verbindet Teilnehmende und Mentis)
  if (state.role === 'mentor') {
    const wants = shuffle(Object.keys(pool.learn).filter((l) => l !== 'Neue Leute kennenlernen'));
    fields.push({ kind: 'learn', text: wants.length ? `${wants[0]} lernen will` : 'zum ersten Mal bei einem Hackathon ist' });
  } else {
    const can = LEARN_TAGS.filter((t) => t.cats.some((c) => pool.teach[c]));
    const own = can.filter((t) => state.learn.has(t.label));
    const t = shuffle(own.length ? own : can)[0];
    fields.push({ kind: 'learn', text: t ? `dir ${t.label} zeigen kann` : 'zum ersten Mal bei einem Hackathon ist' });
  }

  // 2 Typ-Felder – bevorzugt Typen, die es wirklich schon gibt
  const cats = [...shuffle(CATEGORIES.filter((c) => pool.cats[c.id])), ...shuffle(CATEGORIES.filter((c) => !pool.cats[c.id]))].slice(0, 2);
  for (const c of cats) fields.push({ kind: 'type', icon: c.icon, text: `Typ „${c.label}“ auf der Karte hat` });

  // 2 „wie du“-Felder aus den eigenen geheimen Antworten (Freitext bleibt auf dem eigenen Zettel)
  const same = [];
  if (state.favArtist.trim()) same.push({ kind: 'same', text: `auch ${state.favArtist.trim()} hört` });
  for (const id of shuffle([...mine])) same.push({ id });
  let nSame = 0;
  for (const f of same) {
    if (nSame >= 2) break;
    if (f.id) { if (addFun(f.id, 'same')) nSame++; } else { fields.push(f); nSame++; }
  }

  // Rest: Fun Facts aus dem Vorrat, dann häufige Füller
  const fill = [
    ...shuffle(Object.keys(pool.fun).filter((id) => !mine.has(id))),
    ...shuffle(BINGO_COMMON.filter((id) => !mine.has(id))),
    ...shuffle(Object.keys(OPTS).filter((id) => !mine.has(id))),
  ];
  for (const id of fill) { if (fields.length >= 8) break; addFun(id); }

  const grid = shuffle(fields).slice(0, 8);
  grid.splice(4, 0, { kind: 'joker', text: state.role === 'mentor' ? 'Gib einem Team einen Tipp für sein Projekt' : 'Erzähl jemandem deine Projektidee' });
  return grid;
}

// ---------------- Zeichnen (gemeinsame Helfer) ----------------
const W = 696, H = 1190, BH = 906, M = 18;
const FONT = '"Carlito", "Calibri", sans-serif';
const HAND = '"Schoolbell", cursive';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const wortmarke = new Image(); wortmarke.src = 'assets/zefix-wortmarke.svg'; wortmarke.onload = () => changed();
const mascot = new Image(); mascot.src = 'assets/zefix-mascot.png';
const canvas = $('#card'); const cctx = canvas.getContext('2d', { willReadFrequently: true });
const bcanvas = $('#bingo'); const bctx = bcanvas.getContext('2d', { willReadFrequently: true });
let ctx = cctx;
const IMG = { x: M + 22, y: 182, w: W - 2 * (M + 22), h: 440 };

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function fitFont(text, weight, max, min, width, family = FONT) {
  let s = max;
  do { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(text).width <= width) break; s -= 2; } while (s > min);
  return s;
}
function wrapLines(text, width, maxLines = 99) {
  const words = String(text).split(/\s+/); const lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > width && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += ' …'; }
  return lines;
}
function wrap(text, x, y, width, lh, maxLines) {
  const lines = wrapLines(text, width, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return lines.length;
}
function frame(w, h) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 8; ctx.strokeStyle = '#000';
  rr(M, M, w - 2 * M, h - 2 * M, 30); ctx.stroke();
  ctx.lineWidth = 2; rr(M + 10, M + 10, w - 2 * M - 20, h - 2 * M - 20, 22); ctx.stroke();
  ctx.fillStyle = '#000'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
}
const noLabel = () => (state.no ? `#${pad(state.no)}` : '#NEU');

// kleine Vektor-Icons (druckfreundlich, keine Emoji)
function icon(kind, cx, cy, r, filled = true) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = filled ? '#000' : '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke();
  const fg = filled ? '#fff' : '#000';
  ctx.fillStyle = fg; ctx.strokeStyle = fg; ctx.lineWidth = Math.max(2, r * 0.16); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const s = r * 0.55;
  ctx.translate(cx, cy);
  ctx.beginPath();
  switch (kind) {
    case 'code':
      ctx.moveTo(-s * 0.35, -s * 0.7); ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.35, s * 0.7);
      ctx.moveTo(s * 0.35, -s * 0.7); ctx.lineTo(s, 0); ctx.lineTo(s * 0.35, s * 0.7);
      ctx.moveTo(s * 0.15, -s * 0.8); ctx.lineTo(-s * 0.15, s * 0.8); ctx.stroke(); break;
    case 'bolt':
      ctx.moveTo(s * 0.2, -s * 1.1); ctx.lineTo(-s * 0.65, s * 0.15); ctx.lineTo(-s * 0.05, s * 0.15);
      ctx.lineTo(-s * 0.25, s * 1.1); ctx.lineTo(s * 0.65, -s * 0.2); ctx.lineTo(s * 0.05, -s * 0.2); ctx.closePath(); ctx.fill(); break;
    case 'cube':
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.9, -s * 0.5); ctx.lineTo(s * 0.9, s * 0.5); ctx.lineTo(0, s); ctx.lineTo(-s * 0.9, s * 0.5); ctx.lineTo(-s * 0.9, -s * 0.5); ctx.closePath();
      ctx.moveTo(-s * 0.9, -s * 0.5); ctx.lineTo(0, 0); ctx.lineTo(s * 0.9, -s * 0.5); ctx.moveTo(0, 0); ctx.lineTo(0, s); ctx.stroke(); break;
    case 'brush':
      ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2); ctx.stroke();
      for (const [a, b] of [[-0.4, -0.4], [0.35, -0.45], [0.45, 0.25], [-0.45, 0.3]]) { ctx.beginPath(); ctx.arc(a * s, b * s, s * 0.18, 0, Math.PI * 2); ctx.fill(); } break;
    case 'pad':
      ctx.roundRect(-s, -s * 0.55, s * 2, s * 1.1, s * 0.5); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(-s * 0.6, 0); ctx.lineTo(-s * 0.2, 0); ctx.moveTo(-s * 0.4, -s * 0.2); ctx.lineTo(-s * 0.4, s * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s * 0.45, -s * 0.1, s * 0.12, 0, 7); ctx.arc(s * 0.45, s * 0.2, s * 0.01, 0, 7); ctx.fill(); break;
    case 'note':
      ctx.ellipse(-s * 0.3, s * 0.55, s * 0.35, s * 0.26, -0.4, 0, 7); ctx.fill(); ctx.beginPath();
      ctx.moveTo(s * 0.03, s * 0.5); ctx.lineTo(s * 0.03, -s * 0.9); ctx.quadraticCurveTo(s * 0.6, -s * 0.6, s * 0.7, -s * 0.15); ctx.stroke(); break;
    case 'bulb':
      ctx.arc(0, -s * 0.2, s * 0.65, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(s * 0.25, s * 0.6); ctx.lineTo(-s * 0.25, s * 0.6); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.25, s * 0.9); ctx.lineTo(s * 0.25, s * 0.9); ctx.stroke(); break;
    case 'bubble':
      ctx.roundRect(-s, -s * 0.8, s * 2, s * 1.3, s * 0.4); ctx.moveTo(-s * 0.4, s * 0.5); ctx.lineTo(-s * 0.6, s); ctx.lineTo(0, s * 0.5); ctx.stroke(); break;
    case 'people':
      ctx.arc(-s * 0.45, -s * 0.35, s * 0.3, 0, 7); ctx.moveTo(s * 0.75, -s * 0.35); ctx.arc(s * 0.45, -s * 0.35, s * 0.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-s * 0.45, s * 0.75, s * 0.5, Math.PI, 0); ctx.arc(s * 0.45, s * 0.75, s * 0.5, Math.PI, 0); ctx.fill(); break;
    default:
      ctx.font = `800 ${r * 1.2}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, r * 0.05);
  }
  ctx.restore();
}

// 1-Bit-Umwandlung: Bildbereich mit Floyd-Steinberg, Rest mit Schwellwert
function toMonochrome(w, h, img) {
  const d = ctx.getImageData(0, 0, w, h); const px = d.data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  const inImg = (x, y) => img && x > img.x + 4 && x < img.x + img.w - 4 && y > img.y + 4 && y < img.y + img.h - 4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (inImg(x, y)) {
      const old = Math.min(255, Math.max(0, (g[i] - 128) * 1.35 + 140));
      const nw = old < 128 ? 0 : 255; const err = old - nw; g[i] = nw;
      if (x + 1 < w) g[i + 1] += err * 7 / 16;
      if (y + 1 < h) { if (x > 0) g[i + w - 1] += err * 3 / 16; g[i + w] += err * 5 / 16; if (x + 1 < w) g[i + w + 1] += err / 16; }
    } else g[i] = g[i] < 150 ? 0 : 255;
  }
  for (let i = 0; i < w * h; i++) { px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = g[i]; px[i * 4 + 3] = 255; }
  ctx.putImageData(d, 0, 0);
}

// ---------------- Karte ----------------
function drawPlaceholder() {
  ctx.save();
  ctx.setLineDash([10, 10]); ctx.lineWidth = 3; ctx.strokeStyle = '#000';
  rr(IMG.x + 40, IMG.y + 40, IMG.w - 80, IMG.h - 80, 20); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#000'; ctx.textAlign = 'center';
  ctx.font = `400 34px ${HAND}`; ctx.fillText('Dein Avatar erscheint hier', W / 2, IMG.y + IMG.h / 2 - 6);
  ctx.font = `400 22px ${FONT}`; ctx.fillText('→ „Karte zaubern“ drücken', W / 2, IMG.y + IMG.h / 2 + 30);
  ctx.restore();
}

function renderCard() {
  ctx = cctx;
  const t = state.gen || localText();
  const ty = types();
  const mentor = state.role === 'mentor';
  const level = rankedSkills().reduce((a, s) => a + s.level, 0);
  const energy = Math.min(250, 60 + level * 10);
  frame(W, H);

  // Kopf: großer Name über die ganze Breite
  const name = state.name.trim() || 'Dein Name';
  const left = M + 26;
  fitFont(name, 400, 104, 44, W - 2 * left, HAND);
  ctx.fillText(name, left, 116);

  // Zeile 2: Untertitel links, Typen + Energie rechts
  ctx.font = `700 26px ${MONO}`; ctx.textAlign = 'right';
  const enText = `${energy}`;
  ctx.fillText(enText, W - left, 160);
  const enW = ctx.measureText(enText).width;
  ctx.font = `700 10px ${MONO}`; ctx.fillText(mentor ? 'ERFAHRUNG' : 'ENERGIE', W - left, 134);
  icon('bolt', W - left - enW - 20, 151, 15);
  ty.forEach((c, i) => icon(c.icon, W - left - enW - 58 - i * 38, 151, 15));
  ctx.textAlign = 'left';
  const sub = [t.creature, t.title].filter(Boolean).join(' · ') || 'Neue Kreatur entdeckt';
  const subW = W - 2 * left - enW - 70 - ty.length * 38;
  fitFont(sub, 'italic 400', 24, 15, subW);
  ctx.fillText(sub, left, 160);

  // Bildfeld
  ctx.lineWidth = 5; rr(IMG.x, IMG.y, IMG.w, IMG.h, 14); ctx.stroke();
  ctx.save(); rr(IMG.x + 3, IMG.y + 3, IMG.w - 6, IMG.h - 6, 12); ctx.clip();
  if (state.image) {
    const im = state.image, sc = Math.max(IMG.w / im.width, IMG.h / im.height);
    const iw = im.width * sc, ih = im.height * sc;
    ctx.drawImage(im, IMG.x + (IMG.w - iw) / 2, IMG.y + (IMG.h - ih) / 2, iw, ih);
  } else drawPlaceholder();
  ctx.restore();

  // Mentor*innen-Stempel
  if (mentor) {
    ctx.save(); ctx.translate(IMG.x + 92, IMG.y + 44); ctx.rotate(-0.12);
    ctx.fillStyle = '#fff'; rr(-84, -24, 168, 48, 8); ctx.fill();
    ctx.fillStyle = '#000'; rr(-78, -18, 156, 36, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `700 19px ${MONO}`; ctx.fillText('MENTOR*IN', 0, 7);
    ctx.restore(); ctx.fillStyle = '#000';
  }

  // Typ-Leiste
  let y = IMG.y + IMG.h + 14;
  ctx.fillStyle = '#000'; rr(IMG.x + 30, y, IMG.w - 60, 36, 18); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  const typeText = `TYP: ${ty.map((c) => c.label.toUpperCase()).join('  /  ')}`;
  fitFont(typeText, 700, 17, 12, IMG.w - 90, MONO);
  ctx.fillText(typeText, W / 2, y + 25);
  ctx.fillStyle = '#000'; ctx.textAlign = 'left';

  // Attacken
  y += 62;
  const atkH = t.attacks.length > 1 ? 124 : 160;
  t.attacks.slice(0, 2).forEach((a, k) => {
    const ay = y + k * atkH;
    const lv = Math.max(1, Math.min(3, a.level || 1));
    const ic = (ty[k] || ty[0]).icon;
    for (let p = 0; p < 3; p++) icon(ic, left + 18 + p * 34, ay + 18, 14, p < lv);
    fitFont(a.name, 400, 40, 24, W - 2 * left - 130, HAND);
    ctx.fillText(a.name, left + 122, ay + 32);
    ctx.font = `400 24px ${FONT}`;
    wrap(a.effect, left + 4, ay + 66, W - 2 * left - 8, 27, 2);
    if (k === 0 && t.attacks.length > 1) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(left, ay + atkH - 8); ctx.lineTo(W - left, ay + atkH - 8); ctx.stroke(); }
  });
  y += atkH * Math.min(2, t.attacks.length) + 2;

  // Schwäche / Immun
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(W - left, y); ctx.stroke();
  const colW = (W - 2 * left) / 2;
  ctx.font = `700 13px ${MONO}`; ctx.fillText('SCHWÄCHE', left, y + 26); ctx.fillText('IMMUN GEGEN', left + colW + 10, y + 26);
  fitFont(t.weakness, 700, 22, 14, colW - 14); ctx.fillText(t.weakness, left, y + 52);
  fitFont(t.resistance, 700, 22, 14, colW - 14); ctx.fillText(t.resistance, left + colW + 10, y + 52);
  ctx.beginPath(); ctx.moveTo(left + colW, y + 10); ctx.lineTo(left + colW, y + 60); ctx.lineWidth = 2; ctx.stroke();

  // Flavor
  y += 74;
  const fh = H - M - 64 - y;
  ctx.lineWidth = 2; rr(left, y, W - 2 * left, fh, 12); ctx.stroke();
  ctx.font = `400 25px ${HAND}`;
  wrap(t.flavor, left + 14, y + 30, W - 2 * left - 28, 26, Math.max(1, Math.floor((fh - 10) / 26)));

  // Fußzeile
  if (wortmarke.complete && wortmarke.naturalWidth) ctx.drawImage(wortmarke, left, H - M - 54, 30 * 233 / 77, 30);
  ctx.font = `700 12px ${MONO}`;
  ctx.fillText('CODE & CULTURE · MÜNCHEN 2026', left + 104, H - M - 30);
  ctx.textAlign = 'right'; ctx.font = `700 14px ${MONO}`;
  ctx.fillText(noLabel(), W - left, H - M - 30);
  ctx.textAlign = 'left';

  toMonochrome(W, H, state.image ? IMG : null);
}

// ---------------- Bingo-Zettel ----------------
function renderBingo() {
  ctx = bctx;
  frame(W, BH);
  const left = M + 26;
  const mentor = state.role === 'mentor';

  ctx.font = `400 54px ${HAND}`; ctx.fillText('Kennenlern-Bingo', left, 92);
  if (wortmarke.complete && wortmarke.naturalWidth) ctx.drawImage(wortmarke, W - left - 26 * 233 / 77, 52, 26 * 233 / 77, 26);
  const who = `von ${state.name.trim() || '…'}${mentor ? ' · Mentor*in' : ''}`;
  fitFont(who, 400, 40, 24, W - 2 * left, HAND);
  ctx.fillText(who, left, 132);
  ctx.font = `400 20px ${FONT}`;
  wrap('Finde für jedes Feld eine andere Person, die … – sie unterschreibt im Feld. 3 in einer Reihe = BINGO!', left, 166, W - 2 * left, 24, 2);

  const gx = M + 22, gy = 206, gw = W - 2 * gx, cw = gw / 3, ch = 200;
  const cells = state.bingo || Array.from({ length: 9 }, (_, i) => (i === 4 ? { kind: 'joker', text: '…' } : { kind: 'empty', text: '' }));
  cells.forEach((f, i) => {
    const x = gx + (i % 3) * cw, y = gy + Math.floor(i / 3) * ch;
    const cx = x + cw / 2;
    ctx.textAlign = 'center';
    if (f.kind === 'joker') {
      ctx.fillStyle = '#000'; ctx.fillRect(x, y, cw, ch); ctx.fillStyle = '#fff';
      ctx.font = `400 40px ${HAND}`; ctx.fillText('Joker', cx, y + 56);
      ctx.font = `700 21px ${FONT}`;
      wrapLines(f.text, cw - 30, 4).forEach((l, k) => ctx.fillText(l, cx, y + 92 + k * 25));
      ctx.fillStyle = '#000';
    } else if (f.kind === 'empty') {
      ctx.font = `400 60px ${HAND}`; ctx.fillText('?', cx, y + ch / 2 + 20);
    } else {
      let ty = y + 42;
      if (f.kind === 'same') {
        ctx.font = `700 12px ${MONO}`; const tw = ctx.measureText('WIE DU').width + 16;
        rr(cx - tw / 2, y + 14, tw, 22, 11); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText('WIE DU', cx, y + 30); ctx.fillStyle = '#000';
        ty = y + 66;
      } else if (f.icon) { icon(f.icon, cx, y + 32, 16); ty = y + 74; }
      let size = 24, lines;
      do { ctx.font = `700 ${size}px ${FONT}`; lines = wrapLines('… ' + f.text, cw - 26); size -= 2; } while (lines.length > (f.kind === 'fun' ? 4 : 3) && size > 15);
      lines.slice(0, 4).forEach((l, k) => ctx.fillText(l, cx, ty + k * (size + 5)));
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 18, y + ch - 26); ctx.lineTo(x + cw - 18, y + ch - 26); ctx.stroke();
    }
    ctx.textAlign = 'left';
  });
  // Gitter
  ctx.lineWidth = 4; ctx.strokeRect(gx, gy, gw, ch * 3);
  ctx.lineWidth = 2; ctx.beginPath();
  for (let k = 1; k < 3; k++) { ctx.moveTo(gx + k * cw, gy); ctx.lineTo(gx + k * cw, gy + 3 * ch); ctx.moveTo(gx, gy + k * ch); ctx.lineTo(gx + gw, gy + k * ch); }
  ctx.stroke();

  ctx.font = `700 12px ${MONO}`;
  ctx.fillText('BINGO? ZEIG ES AM INFOTISCH!', left, BH - M - 30);
  ctx.textAlign = 'right'; ctx.font = `700 14px ${MONO}`; ctx.fillText(noLabel(), W - left, BH - M - 30); ctx.textAlign = 'left';

  toMonochrome(W, BH, null);
}

let raf = 0;
function changed() { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { renderCard(); renderBingo(); }); }
function renderNow() { cancelAnimationFrame(raf); renderCard(); renderBingo(); }

// ---------------- Aktionen ----------------
function setStatus(msg, cls = '') { const s = $('#status'); s.textContent = msg; s.className = 'status ' + cls; }
async function api(path, body, method = 'POST') {
  const r = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Fehler ${r.status}`), { status: r.status, field: j.field });
  return j;
}
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

function busy(on) {
  for (const id of ['generate', 'generate2', 'newImage', 'print', 'shuffleBingo']) $('#' + id).disabled = on || (!id.startsWith('generate') && !state.gen);
}

// Warte-Overlay: macht klar, dass gerade gezaubert wird (ca. 20 Sek.)
let overlayTimer = 0;
function overlay(on, step = '') {
  const el = $('#overlay');
  if (on) {
    if (el.hidden) {
      const t0 = Date.now(); el.hidden = false;
      $('#overlayBar').style.width = '0%';
      clearInterval(overlayTimer);
      overlayTimer = setInterval(() => {
        const sec = Math.round((Date.now() - t0) / 1000);
        $('#overlayTime').textContent = `${sec} Sek.`;
        $('#overlayBar').style.width = `${Math.min(95, (sec / 15) * 100)}%`; // ~15 Sek. erwartet
      }, 500);
    }
    if (step) $('#overlayStep').textContent = step;
  } else {
    $('#overlayBar').style.width = '100%';
    clearInterval(overlayTimer);
    setTimeout(() => { el.hidden = true; $('#overlayTime').textContent = '0 Sek.'; }, 250);
  }
}
function requireName() {
  if (state.name.trim()) return true;
  const n = $('#name'); n.classList.add('missing'); n.focus(); n.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setStatus('Bitte zuerst einen Namen eintragen – Spitzname reicht!', 'err');
  return false;
}

// Filter: Feld markieren und freundlichen Hinweis zeigen
const FIELD_INPUT = { name: '#name', avatarText: '#avatarText', favArtist: '#favArtist' };
function flag(field, hint) {
  const el = $(FIELD_INPUT[field] || '#name');
  el.classList.add('missing'); el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setStatus('🙈 ' + (hint || 'Das geht so nicht aufs Namensschild – bitte etwas anderes wählen.'), 'err');
}
const modKey = () => JSON.stringify([state.name.trim(), state.avatarText.trim(), state.favArtist.trim()]);
async function checkChanged() {
  if (state.modKey === modKey()) return true;
  const res = await api('/api/check', { name: state.name.trim(), avatarText: state.avatarText.trim(), favArtist: state.favArtist.trim() });
  if (!res.ok) { flag(res.field, res.hint); return false; }
  state.modKey = modKey(); return true;
}

async function makeImage() {
  const { image } = await api('/api/image', { imagePrompt: localImagePrompt() });
  state.image = await loadImage(image);
  state.imageSrc = image; state.avatarDirty = true;
}
function localImagePrompt() {
  const desc = state.avatarText.trim();
  const c = state.creature && state.creature !== 'Überrasch mich!' ? state.creature : desc ? 'original creature' : 'small cable monster';
  const tags = rankedSkills().flatMap((x) => [...x.tags]).slice(0, 3);
  return [
    desc && `Character description by the participant (German, follow it closely): "${desc}".`,
    `A ${c} with ${[...state.extras].join(', ') || 'a curious smile'}${tags.length ? ', themed around ' + tags.join(', ') : ''}${state.role === 'mentor' ? ', wise and experienced look' : ''}.`,
  ].filter(Boolean).join(' ');
}
async function makeBingo() {
  let pool = { n: 0, fun: {}, cats: {}, teach: {}, learn: {} };
  try { pool = await api(`/api/pool${state.id ? `?exclude=${state.id}` : ''}`, null, 'GET'); } catch (e) { console.warn(e); }
  state.bingo = buildBingo(pool);
  state.bingoKey = funKey();
}
// Bingo neu mischen, falls sich die Fun Facts seit dem letzten Mischen geändert haben
const funKey = () => JSON.stringify([serialize().fun, state.favArtist.trim(), state.role, [...state.learn]]);
async function ensureBingo() { if (!state.bingo || state.bingoKey !== funKey()) await makeBingo(); }

// speichert Profil, Texte, Bingo, Avatar und die fertigen Druckbilder
async function persist() {
  const meta = () => ({ id: state.id, name: state.name.trim(), role: state.role, state: serialize(), gen: state.gen, bingo: state.bingo });
  if (!state.id) {
    const r = await api('/api/cards', meta());
    state.id = r.id; state.no = r.no;
    history.replaceState(null, '', `?id=${r.id}`);
  }
  renderNow();
  const body = { ...meta(), cardPng: canvas.toDataURL('image/png'), bingoPng: bcanvas.toDataURL('image/png') };
  if (state.avatarDirty && state.imageSrc?.startsWith('data:')) body.avatar = state.imageSrc;
  await api('/api/cards', body);
  state.avatarDirty = false;
}

async function generate() {
  if (!requireName()) return;
  busy(true);
  overlay(true, '✍️ Texte werden ausgedacht, 🎨 Avatar wird gezeichnet …');
  const notes = [];
  const before = { gen: state.gen, image: state.image, imageSrc: state.imageSrc, avatarDirty: state.avatarDirty };
  const undo = () => Object.assign(state, before);
  try {
    // Text und Bild parallel – spart einige Sekunden
    const [txt, img] = await Promise.allSettled([api('/api/text', profile()), makeImage()]);
    // Filter: Wortliste (422) oder Gemini-Prüfung im Text-Aufruf
    const blocked = [txt, img].find((x) => x.status === 'rejected' && x.reason?.status === 422);
    if (blocked) { undo(); renderNow(); return flag(blocked.reason.field, blocked.reason.message); }
    if (txt.status === 'fulfilled' && txt.value.moderation && txt.value.moderation.ok === false) {
      undo(); renderNow(); return flag(txt.value.moderation.field, txt.value.moderation.hint);
    }
    if (txt.status === 'fulfilled') state.gen = txt.value;
    else { console.warn(txt.reason); notes.push('Texte offline'); state.gen = { ...localText(), imagePrompt: localImagePrompt() }; }
    if (img.status === 'rejected') { console.warn(img.reason); notes.push('Bild offline'); if (!state.image) state.image = mascot; }
    state.modKey = modKey();
    overlay(true, '🎲 Bingo wird gemischt …');
    await makeBingo();
    overlay(true, '💾 Karte wird gespeichert …');
    await persist();
    showTab('card');
    setStatus(notes.length ? `Karte #${pad(state.no)} gespeichert (${notes.join(', ')} – KI gerade nicht erreichbar).` : `Fertig! Gefällt dir Karte #${pad(state.no)}? Dann 🖨️ Drucken.`, notes.length ? 'err' : '');
    $('.preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    if (e.status === 422) flag(e.field, e.message);
    else setStatus('Hoppla: ' + e.message, 'err');
  } finally { overlay(false); busy(false); }
}
$('#generate').onclick = generate;
$('#generate2').onclick = generate;

$('#newImage').onclick = async () => {
  busy(true);
  overlay(true, '🎨 Neuer Avatar wird gezeichnet …');
  try { if (!(await checkChanged())) return; await makeImage(); await persist(); setStatus('Neues Bild – besser?'); }
  catch (e) { if (e.status === 422) flag(e.field, e.message); else setStatus('Hoppla: ' + e.message, 'err'); }
  finally { overlay(false); busy(false); }
};

$('#shuffleBingo').onclick = async () => {
  busy(true);
  try { await makeBingo(); await persist(); showTab('bingo'); setStatus('Bingo neu gemischt.'); }
  catch (e) { setStatus('Hoppla: ' + e.message, 'err'); }
  finally { busy(false); }
};

$('#print').onclick = async () => {
  if (!requireName()) return;
  busy(true);
  try {
    setStatus('🖨️ Wird gespeichert und gedruckt …', 'busy');
    if (!(await checkChanged())) return;
    await ensureBingo();
    await persist();
    await api(`/api/cards/${state.id}/print`, { what: 'both' });
    setStatus('Gedruckt: Karte + Bingo. Viel Spaß beim Hackathon! 🎉');
  } catch (e) {
    if (e.status === 501) { browserPrint([canvas.toDataURL(), bcanvas.toDataURL()]); setStatus('Über den Druckdialog drucken (Papier: 62 mm).'); }
    else if (e.status === 422) flag(e.field, e.message);
    else setStatus('Druckfehler: ' + e.message, 'err');
  } finally { busy(false); }
};

function browserPrint(srcs) {
  let box = $('#printArea');
  if (!box) { box = document.createElement('div'); box.id = 'printArea'; document.body.append(box); }
  box.innerHTML = '';
  let left = srcs.length;
  for (const src of srcs) { const im = new Image(); im.onload = () => { if (--left === 0) window.print(); }; im.src = src; box.append(im); }
}

$('#download').onclick = () => {
  const bingo = $('#tabBingo').classList.contains('on');
  const a = document.createElement('a');
  a.download = `zefix-${bingo ? 'bingo' : 'karte'}-${state.no ? pad(state.no) : 'neu'}.png`;
  a.href = (bingo ? bcanvas : canvas).toDataURL('image/png'); a.click();
};

$('#reset').onclick = () => {
  if (!confirm('Alles leeren für die nächste Person?')) return;
  location.href = '/';
};

function showTab(which) {
  $('#tabCard').classList.toggle('on', which === 'card');
  $('#tabBingo').classList.toggle('on', which === 'bingo');
  $('.cardwrap').hidden = which !== 'card';
  $('.bingowrap').hidden = which !== 'bingo';
}
$('#tabCard').onclick = () => showTab('card');
$('#tabBingo').onclick = async () => { showTab('bingo'); if (state.gen) { await ensureBingo(); renderNow(); } };

// ---------------- Start ----------------
async function loadCard(id) {
  const c = await api(`/api/cards/${id}`, null, 'GET');
  state = deserialize(c.state);
  Object.assign(state, { id: c.id, no: c.no, gen: c.gen || null, bingo: c.bingo || null });
  state.bingoKey = c.bingo ? funKey() : null;
  state.modKey = modKey(); // gespeicherte Karte wurde schon geprüft // gespeichertes Bingo beim Nachdruck nicht neu mischen
  if (c.avatarExt) { state.image = await loadImage(`/api/cards/${c.id}/avatar?t=${Date.now()}`); state.imageSrc = 'stored'; }
  else if (c.gen) state.image = mascot;
  buildAll();
  setStatus(`Bearbeite Karte #${pad(c.no)} – ${c.name}`);
}

buildAll();
showTab('card');
const editId = new URLSearchParams(location.search).get('id');
if (editId) loadCard(editId).catch((e) => setStatus('Karte nicht gefunden: ' + e.message, 'err'));
// Webfonts müssen geladen sein, bevor das Canvas sie nutzen kann
Promise.all(['400 40px Schoolbell', '400 20px Carlito', '700 20px Carlito', 'italic 400 20px Carlito', '700 20px "JetBrains Mono"'].map((f) => document.fonts.load(f, 'AbcÄöü'))).then(changed);
