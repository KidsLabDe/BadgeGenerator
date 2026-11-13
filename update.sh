#!/usr/bin/env bash
# ZeFix! Kartenschmiede aktualisieren:  ./update.sh
# Holt die neueste Version von GitHub und startet den Server neu.
# Optional:  ./update.sh --karten-loeschen   (löscht alle gespeicherten Karten, z. B. nach dem Testen)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

say()  { printf '\n\033[1;35m▶ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }

say "Neue Version holen"
OLD="$(git rev-parse HEAD)"
if ! git pull --ff-only; then
  warn "Update nicht möglich – vermutlich wurden Dateien hier lokal geändert:"
  git status --short
  warn "Lokale Änderungen verwerfen mit:  git checkout -- .   (danach ./update.sh erneut)"
  exit 1
fi
NEW="$(git rev-parse HEAD)"
if [[ "$OLD" == "$NEW" ]]; then
  ok "Schon aktuell"
else
  ok "Aktualisiert – Neuerungen:"
  git log --format='    • %s' "$OLD..$NEW"
fi

if [[ "${1:-}" == "--karten-loeschen" ]]; then
  say "Gespeicherte Karten löschen"
  COUNT="$(find data/cards -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"
  read -rp "  Wirklich alle $COUNT Karten endgültig löschen? [j/N] " A
  if [[ "$A" =~ ^[JjYy] ]]; then rm -rf data/cards/*; ok "Gelöscht – nächste Karte ist #001"; else ok "Nichts gelöscht"; fi
fi

say "Server neu starten"
if systemctl --user cat zefix-badge.service >/dev/null 2>&1; then
  systemctl --user restart zefix-badge.service
  sleep 1
  if systemctl --user is-active --quiet zefix-badge.service; then ok "Server läuft auf http://localhost:5173"
  else warn "Server startet nicht – Log: journalctl --user -u zefix-badge -n 50"; exit 1; fi
else
  warn "Dienst zefix-badge nicht gefunden – bitte einmal ./setup-linux.sh ausführen."
  exit 1
fi

say "Fertig!"
echo "  Im Browser einmal mit Strg + Umschalt + R neu laden."
