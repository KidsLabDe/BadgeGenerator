const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(3, '0');
let cards = [];
let filter = 'all';

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 3000);
}
async function api(path, body, method = 'POST') {
  const r = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `Fehler ${r.status}`), { status: r.status });
  return j;
}

// Fallback ohne Druckerkonfiguration: Browser-Druckdialog mit 62-mm-Seiten
function browserPrint(srcs) {
  let box = $('#printArea');
  if (!box) { box = document.createElement('div'); box.id = 'printArea'; document.body.append(box); }
  box.innerHTML = '';
  let left = srcs.length;
  for (const src of srcs) { const im = new Image(); im.onload = () => { if (--left === 0) window.print(); }; im.src = src; box.append(im); }
}

async function print(c, what) {
  try {
    await api(`/api/cards/${c.id}/print`, { what });
    toast(`#${pad(c.no)} ${c.name}: ${what === 'both' ? 'Karte + Bingo' : what === 'card' ? 'Karte' : 'Bingo'} gedruckt`);
    load();
  } catch (e) {
    if (e.status === 501) browserPrint((what === 'both' ? ['card', 'bingo'] : [what]).map((w) => `/api/cards/${c.id}/${w}.png?t=${Date.now()}`));
    else toast('Fehler: ' + e.message);
  }
}

function render() {
  const q = $('#q').value.trim().toLowerCase();
  const list = cards.filter((c) => (filter === 'all' || c.role === filter) && (!q || c.name.toLowerCase().includes(q)));
  const teens = cards.filter((c) => c.role !== 'mentor').length;
  $('#count').textContent = `${teens} Teilnehmende · ${cards.length - teens} Mentis`;
  const grid = $('#grid'); grid.innerHTML = '';
  if (!list.length) { grid.innerHTML = '<div class="empty">Noch keine Karten hier.</div>'; return; }
  for (const c of list) {
    const el = document.createElement('div'); el.className = 'item';
    const t = c.updatedAt ? Date.parse(c.updatedAt) : 0;
    el.innerHTML = `
      ${c.hasCardPng ? `<img loading="lazy" src="/api/cards/${c.id}/card.png?t=${t}" alt="">` : '<div class="noimg">noch nicht fertig</div>'}
      <div class="meta"><b></b><span>#${pad(c.no)} · ${c.printed || 0}× gedruckt</span></div>
      <span class="badge ${c.role === 'mentor' ? 'mentor' : ''}">${c.role === 'mentor' ? 'MENTOR*IN' : 'TEILNEHMER*IN'}</span>
      <div class="btns">
        <button class="wide" data-a="both">🖨️ Karte + Bingo</button>
        <button data-a="card">Karte</button>
        <button data-a="bingo">Bingo</button>
        <button data-a="edit">✏️ Ändern</button>
        <button class="del" data-a="del" style="grid-column: 1 / -1">🗑 Löschen</button>
      </div>`;
    el.querySelector('.meta b').textContent = c.name;
    el.querySelectorAll('button').forEach((b) => b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'edit') location.href = `/?id=${c.id}`;
      else if (a === 'del') {
        if (!confirm(`Karte #${pad(c.no)} von ${c.name} wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;
        await api(`/api/cards/${c.id}`, null, 'DELETE'); toast('Gelöscht'); load();
      } else print(c, a);
    });
    grid.append(el);
  }
}

function buildFilter() {
  const root = $('#filter'); root.innerHTML = '';
  for (const [id, label] of [['all', 'Alle'], ['teen', 'Teilnehmende'], ['mentor', 'Mentis']]) {
    const b = document.createElement('button'); b.className = 'chip' + (filter === id ? ' on' : ''); b.textContent = label;
    b.onclick = () => { filter = id; buildFilter(); render(); };
    root.append(b);
  }
}

async function load() { cards = (await api('/api/cards', null, 'GET')).reverse(); render(); }
$('#q').oninput = render;
buildFilter(); load();
