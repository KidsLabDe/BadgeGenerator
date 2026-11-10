#!/usr/bin/env bash
# ZeFix! Kartenschmiede – Einrichtung auf einem Linux-Laptop (Manjaro/Arch, außerdem Debian/Ubuntu und Fedora)
# mit direkt angeschlossenem Brother QL-560 (62 mm Endlos).
#
#   ./setup-linux.sh
#
# Kann gefahrlos mehrfach ausgeführt werden.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
URL="http://localhost:5173"
PRINTER_DEV="/dev/usb/lp0"
NEED_RELOGIN=0

say()  { printf '\n\033[1;35m▶ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
ask()  { local a; read -rp "  $1 [J/n] " a; [[ -z "$a" || "$a" =~ ^[JjYy] ]]; }

set_env() { # set_env KEY VALUE  – ersetzt oder ergänzt eine Zeile in .env
  local k="$1" v="$2" tmp
  if grep -q "^$k=" .env; then
    tmp="$(mktemp)"
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" == "$k="* ]]; then printf '%s=%s\n' "$k" "$v"; else printf '%s\n' "$line"; fi
    done < .env > "$tmp"
    mv "$tmp" .env
  else
    printf '%s=%s\n' "$k" "$v" >> .env
  fi
}

[[ "$(uname -s)" == "Linux" ]] || { echo "Dieses Skript ist für Linux. Auf dem Mac siehe README."; exit 1; }

# Paketmanager erkennen: pacman (Manjaro/Arch), apt (Debian/Ubuntu), dnf (Fedora)
if command -v pacman >/dev/null; then PM=pacman
elif command -v apt-get >/dev/null; then PM=apt
elif command -v dnf >/dev/null; then PM=dnf
else PM=none; warn "Kein bekannter Paketmanager – bitte nodejs und pipx selbst installieren."; fi

pkg_install() { # pkg_install <pacman-Paket> <apt-Paket> <dnf-Paket>
  case "$PM" in
    pacman) sudo pacman -S --needed --noconfirm "$1" ;;
    apt)    sudo apt-get update && sudo apt-get install -y "$2" ;;
    dnf)    sudo dnf install -y "$3" ;;
    *)      echo "Bitte installieren: $1"; exit 1 ;;
  esac
}

# ---------- 1. Node.js ----------
say "Node.js prüfen"
node_major() { node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo 0; }
if [[ "$(node_major)" -ge 18 ]]; then
  ok "Node $(node -v)"
else
  warn "Node 18+ fehlt (gefunden: $(node -v 2>/dev/null || echo keins))."
  if ask "Node.js installieren (braucht sudo)?"; then
    pkg_install nodejs nodejs nodejs
    if [[ "$(node_major)" -lt 18 && "$PM" == apt ]]; then
      warn "Die Debian-Version ist zu alt – installiere Node 20 über NodeSource."
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    fi
    [[ "$(node_major)" -ge 18 ]] || { echo "Abbruch: Node 18+ konnte nicht installiert werden."; exit 1; }
    ok "Node $(node -v)"
  else
    echo "Abbruch: Bitte Node 18 oder neuer installieren."; exit 1
  fi
fi
NODE_BIN="$(command -v node)"

# ---------- 2. brother_ql ----------
say "Druckertreiber brother_ql einrichten"
export PATH="$HOME/.local/bin:$PATH"
if ! command -v brother_ql >/dev/null; then
  command -v pipx >/dev/null || pkg_install python-pipx pipx pipx
  pipx ensurepath >/dev/null 2>&1 || true
  pipx install brother_ql_next || pipx install brother_ql
fi
QL_BIN="$(command -v brother_ql)"
ok "brother_ql: $QL_BIN"

# ---------- 3. Druckerzugriff ----------
say "Druckerzugriff (Gruppe lp)"
if id -nG "$USER" | tr ' ' '\n' | grep -qx lp; then
  ok "$USER ist in der Gruppe lp"
else
  sudo usermod -aG lp "$USER"
  NEED_RELOGIN=1
  ok "$USER zur Gruppe lp hinzugefügt (gilt nach Ab-/Anmelden)"
fi
if [[ -e "$PRINTER_DEV" ]]; then
  ok "Drucker gefunden: $PRINTER_DEV"
else
  warn "$PRINTER_DEV fehlt – QL-560 per USB anschließen und einschalten."
  warn "Falls er trotzdem fehlt: 'sudo modprobe usblp' und 'lsusb | grep -i brother' prüfen."
  warn "Läuft CUPS und hat den Drucker übernommen, hilft meist: Drucker einmal ab- und wieder anstecken."
fi

# ---------- 4. Konfiguration ----------
say "Konfiguration (.env)"
if [[ ! -f .env ]]; then
  cp .env.example .env
  read -rp "  Gemini-API-Key (von https://aistudio.google.com/apikey, leer = später): " KEY
  [[ -n "$KEY" ]] && set_env PB_GEMINI_API_KEY "$KEY"
fi
set_env PRINT_MODE brother_ql
set_env BROTHER_QL_CMD "$QL_BIN"
set_env BROTHER_QL_BACKEND linux_kernel
set_env BROTHER_QL_PRINTER "file://$PRINTER_DEV"
chmod 600 .env
grep -q '^PB_GEMINI_API_KEY=.\+' .env && ok "Gemini-Key gesetzt" || warn "Kein Gemini-Key in .env – die Karten laufen dann im Offline-Modus."
mkdir -p data/cards

# ---------- 5. Testdruck ----------
say "Testdruck"
if [[ -e "$PRINTER_DEV" ]] && ask "Testetikett drucken?"; then
  CMD=("$QL_BIN" -m QL-560 -b linux_kernel -p "file://$PRINTER_DEV" print -l 62 "$DIR/scripts/testlabel.png")
  if [[ -w "$PRINTER_DEV" ]]; then "${CMD[@]}" && ok "Gedruckt"
  else sg lp -c "$(printf '%q ' "${CMD[@]}")" && ok "Gedruckt"; fi || warn "Testdruck fehlgeschlagen – siehe Meldung oben."
fi

# ---------- 6. Autostart des Servers ----------
say "Server als Dienst einrichten (systemd --user)"
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/zefix-badge.service" <<EOF
[Unit]
Description=ZeFix! Kartenschmiede
After=network-online.target

[Service]
WorkingDirectory=$DIR
ExecStart=$NODE_BIN $DIR/server.js
Restart=on-failure
Environment=PATH=$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable zefix-badge.service >/dev/null
systemctl --user restart zefix-badge.service
sleep 1
if systemctl --user is-active --quiet zefix-badge.service; then ok "Server läuft auf $URL"
else warn "Server startet nicht – Log: journalctl --user -u zefix-badge -n 50"; fi

# ---------- 7. Starter im Menü / Autostart ----------
say "Starter anlegen"
chmod +x "$DIR/scripts/start-kiosk.sh"
mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/zefix-kartenschmiede.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=ZeFix! Kartenschmiede
Exec=$DIR/scripts/start-kiosk.sh
Icon=$DIR/public/assets/zefix-mascot.png
Terminal=false
Categories=Utility;
EOF
ok "Menüeintrag „ZeFix! Kartenschmiede“"
if ask "Browser beim Anmelden automatisch im Vollbild öffnen?"; then
  mkdir -p "$HOME/.config/autostart"
  cp "$HOME/.local/share/applications/zefix-kartenschmiede.desktop" "$HOME/.config/autostart/"
  ok "Autostart aktiv"
fi

say "Fertig!"
echo "  Kartenschmiede:  $URL"
echo "  Alle Karten:     $URL/overview.html"
echo "  Server-Log:      journalctl --user -u zefix-badge -f"
echo "  Neustart:        systemctl --user restart zefix-badge"
if [[ "$NEED_RELOGIN" == 1 ]]; then
  printf '\n  \033[1;33mWichtig:\033[0m Einmal ab- und wieder anmelden (oder neu starten),\n  damit der Server auf den Drucker zugreifen darf.\n'
fi
