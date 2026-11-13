// ZeFix! Badge Generator – kleiner Server ohne Abhängigkeiten (Node >= 18)
// - liefert die Oberfläche aus /public
// - spricht mit Gemini (Key bleibt auf dem Server)
// - schickt fertige Karten (PNG, 696 px breit) an den Brother QL-560

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, execFileSync } = require('child_process');

// ---------- .env laden ----------
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
const KEY = process.env.PB_GEMINI_API_KEY;
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
const PORT = Number(process.env.PORT || 5173);
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

// ---------- Gemini ----------
async function gemini(model, body) {
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Gemini HTTP ${res.status}`);
  return data;
}

const CARD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'Kurzer Titel nach dem Namen, z.B. "die Lötkolben-Flüsterin". Max 28 Zeichen.' },
    creature: { type: 'STRING', description: 'Name der Fantasie-Kreatur/Art, ein Wort, z.B. "Pixelfuchs". Max 16 Zeichen.' },
    attacks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Attackenname, max 18 Zeichen' },
          effect: { type: 'STRING', description: 'Effekttext, max 70 Zeichen, positiv, konkret, hackathon-nützlich' },
          level: { type: 'INTEGER', description: '1 bis 3' },
        },
        required: ['name', 'effect', 'level'],
      },
    },
    weakness: { type: 'STRING', description: 'Liebevolle, harmlose Schwäche, max 30 Zeichen' },
    resistance: { type: 'STRING', description: 'Immun gegen ..., max 30 Zeichen' },
    flavor: { type: 'STRING', description: 'Flavor-Text, 1-2 Sätze, max 120 Zeichen, lädt zum Ansprechen ein' },
    imagePrompt: { type: 'STRING', description: 'Englische Beschreibung der Kreatur fürs Bild (Aussehen, Accessoires, Pose), max 300 Zeichen' },
  },
  required: ['title', 'creature', 'attacks', 'weakness', 'resistance', 'flavor', 'imagePrompt'],
};

function describeProfile(p) {
  const skills = (p.skills || [])
    .filter((s) => s.level > 0)
    .sort((a, b) => b.level - a.level)
    .map((s) => `${s.label} (Level ${s.level}/3${s.tags?.length ? ', Tags: ' + s.tags.join(', ') : ''})`);
  return [
    `Rolle: ${p.role === 'mentor' ? 'Mentor*in (begleitet Teams, erfahren)' : 'Teilnehmer*in (12–18 Jahre)'}`,
    `Name: ${p.name || '(kein Name)'}`,
    `Skills: ${skills.join('; ') || 'noch offen – Entdecker*in'}`,
    `Will lernen / ausprobieren: ${(p.learnTags || []).join(', ') || '-'}`,
    `Avatar-Wesen: ${p.avatar?.creature || 'frei wählbar'}`,
    `Avatar-Accessoires: ${(p.avatar?.extras || []).join(', ') || '-'}`,
  ].join('\n');
}

async function generateText(profile) {
  const prompt = `Du schreibst Texte für eine Sammelkarte (eigener Stil, KEIN Pokémon, keine geschützten Namen) für den ZeFix! Code & Culture Jugend-Hackathon (Teilnehmende 12–18 Jahre).
Die Karte hilft schüchternen Jugendlichen, ins Gespräch zu kommen und ein Team zu finden.
Regeln: Deutsch, freundlich, witzig, niemals abwertend, keine Anspielungen auf Aussehen, Gewicht, Herkunft oder Geschlecht.
Keine Pronomen (er/sie/ihn/ihr) für die Person und kein Geschlecht aus dem Namen ableiten. Der Flavor-Text ist in der Ich-Form geschrieben (die Karte spricht selbst), z. B. "Frag mich nach …". Titel geschlechtsneutral (z. B. "Meister*in" oder "Profi").
Genau 2 Attacken, basierend auf den stärksten Skills (Level übernehmen). Wenn kaum Skills: kreative Entdecker-Attacken.
Schwäche, Resistenz und Flavor erfindest du passend zu Skills, Avatar-Wesen und Lernwünschen – liebevoll und harmlos. Der Flavor-Text lädt zum Ansprechen ein und greift gern einen Lernwunsch auf.
Bei Mentor*innen: Attacken beschreiben, wobei die Person Teams helfen kann (z. B. "Hilft deinem Team …"), Flavor lädt ein, um Hilfe zu fragen ("Frag mich, wenn …").
Das imagePrompt beschreibt nur die Kreatur (Avatar-Wesen + Details + Skill-Thema als Accessoires), keine Menschen, kein Text.

Profil:
${describeProfile(profile)}`;
  const data = await gemini(TEXT_MODEL, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: CARD_SCHEMA, temperature: 1.0 },
  });
  const txt = data.candidates?.[0]?.content?.parts?.map((x) => x.text || '').join('') || '';
  const out = JSON.parse(txt);
  out.attacks = (out.attacks || []).slice(0, 2);
  return out;
}

async function generateImage(imagePrompt) {
  const prompt = `Trading card illustration of an original, friendly fantasy creature. ${imagePrompt}
Style: black and white ink line art, bold clean black outlines, flat white fill, minimal hatching, very high contrast, no grey gradients, no shading blobs, centered full body, plain pure white background, no frame, no text, no letters, no logos. Original design, must not resemble any existing franchise character. Suitable for thermal label printing.`;
  const data = await gemini(IMAGE_MODEL, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
  });
  const part = data.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
  if (!part) throw new Error('Kein Bild erhalten (evtl. Safety-Filter). Bitte nochmal versuchen.');
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}

// ---------- Druck ----------
function hasCmd(cmd) {
  if (cmd.includes('/')) return fs.existsSync(cmd);
  try { execFileSync('/usr/bin/which', [cmd], { stdio: 'ignore' }); return true; } catch { return false; }
}
// Druckweg: BROTHER_QL_BACKEND = auto | linux_kernel | pyusb
// auto: gibt es /dev/usb/lp* (Kernel-Treiber usblp), wird das genutzt, sonst direkt per USB (libusb).
// Wird bei jedem Druck neu ermittelt, damit Ab-/Anstecken des Druckers kein Problem ist.
const QL_CMD = process.env.BROTHER_QL_CMD || 'brother_ql';
const QL_MODEL = process.env.BROTHER_QL_MODEL || 'QL-560';
const QL_USB_DEFAULT = 'usb://0x04f9:0x2027'; // Brother QL-560
// Linux: angeschlossenen Brother-Drucker über sysfs finden (Hersteller-ID 04f9)
function brotherUsb() {
  try {
    for (const d of fs.readdirSync('/sys/bus/usb/devices')) {
      const base = `/sys/bus/usb/devices/${d}`;
      if (!fs.existsSync(`${base}/idVendor`)) continue;
      if (fs.readFileSync(`${base}/idVendor`, 'utf8').trim() !== '04f9') continue;
      return `usb://0x04f9:0x${fs.readFileSync(`${base}/idProduct`, 'utf8').trim()}`;
    }
  } catch {}
  return QL_USB_DEFAULT;
}
function qlTarget() {
  let backend = (process.env.BROTHER_QL_BACKEND || 'auto').toLowerCase();
  let printer = process.env.BROTHER_QL_PRINTER || '';
  if (backend === 'auto') {
    const lp = process.platform === 'linux' && fs.existsSync('/dev/usb')
      ? fs.readdirSync('/dev/usb').filter((f) => /^lp\d+$/.test(f)).sort()[0] : null;
    backend = lp ? 'linux_kernel' : 'pyusb';
    if (!printer || printer.startsWith('file://') !== (backend === 'linux_kernel')) printer = lp ? `file:///dev/usb/${lp}` : brotherUsb();
  }
  if (!printer) printer = backend === 'linux_kernel' ? 'file:///dev/usb/lp0' : brotherUsb();
  return { backend, printer };
}
function printMode() {
  const m = (process.env.PRINT_MODE || 'auto').toLowerCase();
  if (m !== 'auto') return m;
  if (hasCmd(QL_CMD)) return 'brother_ql';
  if (process.env.CUPS_PRINTER) return 'cups';
  return 'none';
}
function printPng(buf) {
  return new Promise((resolve, reject) => {
    const mode = printMode();
    if (mode === 'none') return reject(Object.assign(new Error('Kein Drucker konfiguriert (siehe README).'), { code: 501 }));
    const file = path.join(os.tmpdir(), `zefix-badge-${Date.now()}.png`);
    fs.writeFileSync(file, buf);
    const done = (err, stdout, stderr) => {
      fs.unlink(file, () => {});
      if (err) reject(new Error((stderr || err.message).toString().trim()));
      else resolve(mode);
    };
    if (mode === 'brother_ql') {
      const { backend, printer } = qlTarget();
      execFile(QL_CMD, ['-m', QL_MODEL, '-b', backend, '-p', printer, 'print', '-l', '62', file], { timeout: 60000 }, (err, out, errOut) => {
        if (err) {
          const msg = String(errOut || err.message);
          const hint = /No such file|No backend|not found|Errno 2|Device not found|NoneType/i.test(msg) ? 'Drucker nicht gefunden – ist der QL-560 eingeschaltet und per USB verbunden?'
            : /Permission|Errno 13|Access denied/i.test(msg) ? 'Keine Berechtigung für den Drucker – setup-linux.sh ausführen und neu anmelden.'
            : msg.trim().split('\n').pop();
          console.error(msg);
          return done(new Error(hint), out, '');
        }
        done(null, out, errOut);
      });
    } else if (mode === 'cups') {
      execFile('lp', ['-d', process.env.CUPS_PRINTER, '-o', 'fit-to-page', file], { timeout: 60000 }, done);
    } else reject(new Error(`Unbekannter PRINT_MODE: ${mode}`));
  });
}

// ---------- Kartenspeicher (data/cards/<id>/) ----------
// card.json (Profil, Texte, Bingo), avatar.png|jpg, card.png, bingo.png
const DATA = path.join(__dirname, 'data', 'cards');
fs.mkdirSync(DATA, { recursive: true });
const validId = (id) => /^[a-z0-9-]{6,40}$/.test(id || '');
const cardDir = (id) => path.join(DATA, id);

function listCards() {
  return fs.readdirSync(DATA).filter(validId).map((id) => {
    try { return JSON.parse(fs.readFileSync(path.join(cardDir(id), 'card.json'), 'utf8')); } catch { return null; }
  }).filter(Boolean).sort((a, b) => a.no - b.no);
}
function readCard(id) {
  if (!validId(id)) return null;
  try { return JSON.parse(fs.readFileSync(path.join(cardDir(id), 'card.json'), 'utf8')); } catch { return null; }
}
function writeDataUrl(file, dataUrl) {
  const m = String(dataUrl).match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  fs.writeFileSync(`${file}.${ext}`, Buffer.from(m[2], 'base64'));
  return ext;
}
function saveCard(body) {
  let card = body.id ? readCard(body.id) : null;
  const now = new Date().toISOString();
  if (!card) {
    const no = listCards().reduce((m, c) => Math.max(m, c.no || 0), 0) + 1;
    card = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, no, createdAt: now, printed: 0 };
    fs.mkdirSync(cardDir(card.id), { recursive: true });
  }
  const name = String(body.name || '').trim().slice(0, 30);
  if (!name) throw Object.assign(new Error('Name fehlt'), { code: 400 });
  Object.assign(card, { name, role: body.role === 'mentor' ? 'mentor' : 'teen', state: body.state, gen: body.gen, bingo: body.bingo, updatedAt: now });
  const dir = cardDir(card.id);
  if (body.avatar) { const ext = writeDataUrl(path.join(dir, 'avatar'), body.avatar); if (ext) card.avatarExt = ext; }
  if (body.cardPng) { writeDataUrl(path.join(dir, 'card'), body.cardPng); card.hasCardPng = true; }
  if (body.bingoPng) { writeDataUrl(path.join(dir, 'bingo'), body.bingoPng); card.hasBingoPng = true; }
  fs.writeFileSync(path.join(dir, 'card.json'), JSON.stringify(card, null, 1));
  return card;
}
function summary(c) {
  const { state, gen, bingo, ...rest } = c;
  return { ...rest, title: gen?.title || '', creature: gen?.creature || '' };
}

// Anonymer Vorrat fürs Bingo: nur Chip-Auswahlen zählen, nie Namen oder Freitext
function pool(excludeId) {
  const out = { n: 0, mentors: 0, fun: {}, cats: {}, teach: {}, learn: {} };
  const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
  for (const c of listCards()) {
    if (c.id === excludeId || !c.state) continue;
    out.n++; if (c.role === 'mentor') out.mentors++;
    const st = c.state;
    for (const ids of Object.values(st.fun || {})) for (const id of ids) inc(out.fun, id);
    for (const [cat, v] of Object.entries(st.skills || {})) {
      if (v.level >= 1) inc(out.cats, cat);
      if (v.level >= 2) inc(out.teach, cat);
    }
    if (c.role !== 'mentor') for (const l of st.learn || []) inc(out.learn, l);
  }
  return out;
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

function readJson(req, limit = 15e6) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('Zu groß')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch (e) { reject(e); } });
  });
}
function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/text') {
      return send(res, 200, await generateText(await readJson(req)));
    }
    if (req.method === 'POST' && req.url === '/api/image') {
      const { imagePrompt } = await readJson(req);
      return send(res, 200, { image: await generateImage(String(imagePrompt || 'a small friendly creature')) });
    }
    if (req.method === 'POST' && req.url === '/api/print') {
      const { png } = await readJson(req);
      const mode = await printPng(Buffer.from(String(png).replace(/^data:image\/png;base64,/, ''), 'base64'));
      return send(res, 200, { ok: true, mode });
    }
    const url = new URL(req.url, 'http://x');
    const cm = url.pathname.match(/^\/api\/cards(?:\/([a-z0-9-]+))?(?:\/(avatar|card\.png|bingo\.png|print))?$/);
    if (cm) {
      const [, id, sub] = cm;
      if (!id && req.method === 'GET') return send(res, 200, listCards().map(summary));
      if (!id && req.method === 'POST') return send(res, 200, summary(saveCard(await readJson(req))));
      const card = readCard(id);
      if (!card) return send(res, 404, { error: 'Karte nicht gefunden' });
      if (!sub && req.method === 'GET') return send(res, 200, card);
      if (!sub && req.method === 'DELETE') { fs.rmSync(cardDir(id), { recursive: true, force: true }); return send(res, 200, { ok: true }); }
      if (sub === 'print' && req.method === 'POST') {
        const { what = 'both' } = await readJson(req);
        const files = (what === 'both' ? ['card', 'bingo'] : [what]).map((w) => path.join(cardDir(id), `${w}.png`)).filter((f) => fs.existsSync(f));
        if (!files.length) return send(res, 404, { error: 'Noch kein Druckbild gespeichert' });
        let mode;
        for (const f of files) mode = await printPng(fs.readFileSync(f));
        card.printed = (card.printed || 0) + 1; card.printedAt = new Date().toISOString();
        fs.writeFileSync(path.join(cardDir(id), 'card.json'), JSON.stringify(card, null, 1));
        return send(res, 200, { ok: true, mode });
      }
      if (req.method === 'GET' && sub) {
        const file = sub === 'avatar' ? path.join(cardDir(id), `avatar.${card.avatarExt || 'png'}`) : path.join(cardDir(id), sub);
        if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'content-type': file.endsWith('.jpg') ? 'image/jpeg' : 'image/png', 'cache-control': 'no-store' });
        return fs.createReadStream(file).pipe(res);
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/pool') {
      return send(res, 200, pool(url.searchParams.get('exclude')));
    }
    if (req.method === 'GET' && req.url === '/api/status') {
      return send(res, 200, { printMode: printMode(), printer: qlTarget(), textModel: TEXT_MODEL, imageModel: IMAGE_MODEL, hasKey: !!KEY });
    }
    // statische Dateien
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(__dirname, 'public', rel === '/' ? 'index.html' : rel);
    if (!file.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('Not found');
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    send(res, [400, 501].includes(e.code) ? e.code : 500, { error: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`ZeFix! Badge Generator läuft auf http://localhost:${PORT}  (Druck: ${printMode()})`);
});
