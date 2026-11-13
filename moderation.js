// Filter gegen Schimpfwörter und "lustige" Teenager-Ideen auf Namensschildern.
// Stufe 1 (hier): schnelle Wortliste, erkennt auch Tricks wie H0d3n, Hooodeen, H-o-d-e-n.
// Stufe 2: Gemini prüft im Kartentext-Aufruf zusätzlich Wortspiele und versteckte Anspielungen (server.js).
//
// Die Liste ist bewusst zurückhaltend, damit harmlose Namen nicht hängen bleiben
// (z. B. "Barsch", "Schwanz" beim Drachen). Grenzfälle entscheidet Stufe 2.

// Treffer irgendwo im Text (auch in zusammengesetzten Wörtern wie "Hodenkobold")
const SUBSTRINGS = [
  'hoden', 'penis', 'pimmel', 'vagina', 'fotze', 'votze', 'titten', 'moepse', 'brueste', 'nippel',
  'fick', 'fuck', 'wichs', 'wixx', 'wixer', 'sperma', 'porno', 'porn', 'dildo', 'orgasm', 'masturb', 'vibrator',
  'nutte', 'hurensohn', 'hure', 'schlampe', 'bitch', 'bordell',
  'arschloch', 'arschgeige', 'scheiss', 'scheis', 'shit', 'kacke', 'kack', 'pisse', 'pisser',
  'wichser', 'missgeburt', 'spasti', 'schwuchtel', 'kanake', 'neger', 'nigg', 'zigeuner',
  'nazi', 'hitler', 'holocaust', 'hakenkreuz', 'sieg heil', 'siegheil', 'kz',
  'kokain', 'heroin', 'crystal meth', 'kiffer',
  'vergewalt', 'paedophil', 'pedophil', 'kinderfick',
];
// Treffer nur als ganzes Wort (sonst zu viele Fehlalarme)
const WORDS = ['arsch', 'sex', 'sexy', 'anal', 'anus', 'dick', 'cock', 'tits', 'heil', 'koks', 'kiffen', 'spast', 'mongo', 'puff', 'bong', 'kz', 'ss', 'nsdap'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i', '€': 'e' };

function base(s) {
  return String(s || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$!|€]/g, (c) => LEET[c]);
}
const squash = (s) => s.replace(/(.)\1+/g, '$1');          // Hooodeeen → Hoden
const letters = (s) => s.replace(/[^a-z]/g, '');            // H-o-d-e-n → hoden
const SUB_SQ = SUBSTRINGS.map((w) => squash(letters(base(w))));

// Liefert das gefundene Wort oder null
function badWord(text) {
  if (!text) return null;
  const b = base(text);
  const flat = letters(b);
  const variants = [flat, squash(flat)];
  for (let i = 0; i < SUBSTRINGS.length; i++) {
    const w = letters(base(SUBSTRINGS[i]));
    if (w.length < 3) continue; // sehr kurze nur als ganzes Wort (unten)
    if (variants.some((v) => v.includes(w) || v.includes(SUB_SQ[i]))) return SUBSTRINGS[i];
  }
  const tokens = b.split(/[^a-z]+/).filter(Boolean);
  for (const t of tokens) {
    if (WORDS.includes(t) || WORDS.includes(squash(t))) return t;
    if (SUBSTRINGS.includes(t)) return t;
  }
  return null;
}

// Prüft mehrere Felder: { name: '…', avatarText: '…' } → null oder { field, word }
function checkFields(fields) {
  for (const [field, value] of Object.entries(fields)) {
    const word = badWord(value);
    if (word) return { field, word };
  }
  return null;
}

const FIELD_LABEL = { name: 'Name', avatarText: 'Avatar-Beschreibung', favArtist: 'Lieblingskünstler*in' };
function rejection(hit, hint) {
  const label = FIELD_LABEL[hit.field] || hit.field;
  return Object.assign(new Error(hint || `${label}: Das geht so nicht aufs Namensschild – bitte etwas anderes wählen.`), { code: 422, field: hit.field });
}

module.exports = { badWord, checkFields, rejection, FIELD_LABEL };
