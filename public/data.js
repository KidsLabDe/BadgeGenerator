// Alle Inhalte für die Auswahl – hier kann das Orga-Team frei anpassen.

export const SKILL_LEVELS = ['nö', 'ein bisschen', 'kann ich', 'frag mich!'];

export const CATEGORIES = [
  { id: 'code', label: 'Code', emoji: '💻', icon: 'code',
    tags: ['Python', 'Scratch', 'Web / HTML', 'KI-Tools'],
    attacks: ['Bug-Jagd', 'Endlosschleife', 'Copy-Paste-Combo', 'Kompilierblitz'] },
  { id: 'hardware', label: 'Elektro & Löten', emoji: '⚡', icon: 'bolt',
    tags: ['Löten', 'Arduino', 'LEDs', 'Roboter'],
    attacks: ['Zinnregen', 'Kurzschluss-Konter', 'LED-Gewitter', 'Kabelsalat-Entwirrer'] },
  { id: 'maker', label: 'Bauen & 3D', emoji: '🧊', icon: 'cube',
    tags: ['3D-Druck', 'Basteln', 'Lasercutter', 'Lego'],
    attacks: ['Schicht um Schicht', 'Heißkleber-Hieb', 'Prototyp-Panzer', 'Filament-Wirbel'] },
  { id: 'art', label: 'Kunst & Design', emoji: '🎨', icon: 'brush',
    tags: ['Zeichnen', 'Pixel-Art', 'Foto / Video', 'Graffiti'],
    attacks: ['Farbexplosion', 'Pinsel-Wirbel', 'Pixel-Sturm', 'Skizzenblitz'] },
  { id: 'games', label: 'Games', emoji: '🎮', icon: 'pad',
    tags: ['Zocken', 'Level-Design', 'Brettspiele', 'VR'],
    attacks: ['Respawn', 'Combo-Kette', 'Boss-Strategie', 'Speedrun-Sprint'] },
  { id: 'sound', label: 'Musik & Sound', emoji: '🎧', icon: 'note',
    tags: ['Instrument', 'Beats bauen', 'Singen', 'Podcast'],
    attacks: ['Bass-Drop', 'Ohrwurm', 'Taktgefühl', 'Echo-Schall'] },
  { id: 'ideas', label: 'Welt verbessern', emoji: '🌍', icon: 'bulb',
    tags: ['Umwelt', 'Politik', 'KI & Werte', 'Datenschutz'],
    attacks: ['Geistesblitz', 'Weltretter-Welle', 'Fragezeichen-Hagel', 'Gute-Idee-Glühen'] },
  { id: 'stage', label: 'Story & Bühne', emoji: '🎤', icon: 'bubble',
    tags: ['Präsentieren', 'Schreiben', 'Erklären', 'Social Media'],
    attacks: ['Pitch-Power', 'Plot-Twist', 'Applaus-Aura', 'Wortgewitter'] },
  { id: 'team', label: 'Team & Orga', emoji: '🤝', icon: 'people',
    tags: ['Planen', 'Zuhören', 'Motivieren', 'Snacks organisieren'],
    attacks: ['Teamgeist', 'To-do-Tornado', 'Motivations-Schub', 'Snack-Heilung'] },
];

export const JOKER = { id: 'joker', label: 'Entdecker*in', emoji: '🔮', icon: 'question' };

export const CREATURES = [
  { id: 'Drache', emoji: '🐉' }, { id: 'Roboter', emoji: '🤖' }, { id: 'Fuchs', emoji: '🦊' },
  { id: 'Eule', emoji: '🦉' }, { id: 'Katze', emoji: '🐱' }, { id: 'Axolotl', emoji: '🦎' },
  { id: 'Pilzwesen', emoji: '🍄' }, { id: 'Geist', emoji: '👻' }, { id: 'Steingolem', emoji: '🗿' },
  { id: 'Qualle', emoji: '🪼' }, { id: 'Waschbär', emoji: '🦝' }, { id: 'Überrasch mich!', emoji: '🎲' },
];

export const EXTRAS = ['Brille', 'Kopfhörer', 'Mütze', 'Hoodie', 'Cape', 'Werkzeuggürtel', 'Laptop', 'Skateboard', 'Krone', 'Schal', 'Rucksack', 'Lötkolben'];

// cats: wer in diesen Kategorien mind. "kann ich" hat, kann es zeigen (fürs Bingo)
export const LEARN_TAGS = [
  { label: 'Programmieren', cats: ['code'] }, { label: 'Löten', cats: ['hardware'] }, { label: '3D-Druck', cats: ['maker'] },
  { label: 'KI', cats: ['code', 'ideas'] }, { label: 'Games bauen', cats: ['games', 'code'] }, { label: 'Präsentieren', cats: ['stage'] },
  { label: 'Design', cats: ['art'] }, { label: 'Neue Leute kennenlernen', cats: [] },
];

export const ROLES = [
  { id: 'teen', label: 'Teilnehmer*in', emoji: '🙋' },
  { id: 'mentor', label: 'Mentor*in', emoji: '🧭' },
];

// Geheime Fun Facts – stehen NICHT auf der Karte, nur in den Bingo-Zetteln.
// f = Feldtext, der hinter "Finde eine Person, die …" passt.
export const FUN_GROUPS = [
  { id: 'food', label: 'Essen', emoji: '🍕', options: [
    { id: 'pizza', l: 'Pizza', f: 'Pizza liebt' }, { id: 'doener', l: 'Döner', f: 'Döner liebt' }, { id: 'sushi', l: 'Sushi', f: 'Sushi mag' },
    { id: 'nudeln', l: 'Nudeln', f: 'Nudeln über alles mag' }, { id: 'veggie', l: 'vegetarisch', f: 'vegetarisch isst' }, { id: 'suess', l: 'Süßkram', f: 'eine Naschkatze ist' },
  ] },
  { id: 'music', label: 'Musik', emoji: '🎵', options: [
    { id: 'rap', l: 'Rap', f: 'Rap hört' }, { id: 'pop', l: 'Pop', f: 'Pop hört' }, { id: 'rock', l: 'Rock / Metal', f: 'Rock oder Metal hört' },
    { id: 'kpop', l: 'K-Pop', f: 'K-Pop hört' }, { id: 'electro', l: 'Elektro', f: 'Elektro hört' }, { id: 'gamemusic', l: 'Game-Soundtracks', f: 'Game-Soundtracks hört' },
  ] },
  { id: 'pet', label: 'Haustier', emoji: '🐾', options: [
    { id: 'hund', l: 'Hund', f: 'einen Hund hat' }, { id: 'katze', l: 'Katze', f: 'eine Katze hat' }, { id: 'nager', l: 'Nager', f: 'ein Nagetier hat' },
    { id: 'fisch', l: 'Fische', f: 'Fische hat' }, { id: 'reptil', l: 'Reptil', f: 'ein Reptil hat' }, { id: 'keins', l: 'keins', f: 'kein Haustier hat' },
  ] },
  { id: 'games', label: 'Games', emoji: '🕹️', options: [
    { id: 'minecraft', l: 'Minecraft', f: 'Minecraft spielt' }, { id: 'mariokart', l: 'Mario Kart', f: 'Mario Kart spielt' }, { id: 'fortnite', l: 'Fortnite', f: 'Fortnite spielt' },
    { id: 'roblox', l: 'Roblox', f: 'Roblox spielt' }, { id: 'brett', l: 'Brettspiele', f: 'Brettspiele liebt' }, { id: 'nogames', l: 'gar nicht', f: 'gar nicht zockt' },
  ] },
];

// Felder, die fast immer jemand erfüllt – Füllmaterial, solange der Vorrat noch klein ist
export const BINGO_COMMON = ['pizza', 'pop', 'minecraft', 'katze', 'hund', 'nudeln', 'suess', 'rap'];

export const WEAKNESSES = ['Meetings vor 10 Uhr', 'leere Akkus', 'kalte Pizza', 'WLAN-Ausfall', 'zu viele Tabs', 'Stille im Raum'];
export const RESISTANCES = ['Bugs', 'Kabelsalat', 'Lampenfieber', 'Langeweile', 'Schlafmangel', 'Chaos'];
