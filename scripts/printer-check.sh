#!/usr/bin/env bash
# Diagnose für den Brother QL-560 – Ausgabe einfach komplett kopieren und schicken.
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/bin:$PATH"
h() { printf '\n== %s ==\n' "$*"; }

h "System"
uname -sr; grep -m1 PRETTY_NAME /etc/os-release 2>/dev/null

h "Brother-Geräte am USB (sysfs, Hersteller 04f9)"
found=0
for d in /sys/bus/usb/devices/*; do
  if [[ -f "$d/idVendor" && "$(<"$d/idVendor")" == 04f9 ]]; then
    found=1; echo "$(basename "$d"): 04f9:$(<"$d/idProduct") $(cat "$d/product" 2>/dev/null)"
    for i in "$d":*; do [[ -L "$i/driver" ]] && echo "  Interface $(basename "$i") → Treiber $(basename "$(readlink "$i/driver")")"; done
  fi
done
[[ $found == 1 ]] || echo "KEIN Brother-Gerät gefunden (Kabel? eingeschaltet?)"
command -v lsusb >/dev/null && { echo; lsusb | grep -i -E 'brother|04f9' || echo "(lsusb: nichts)"; }

h "/dev/usb"
ls -l /dev/usb/ 2>&1

h "Kernel-Modul usblp"
lsmod | grep -w usblp || echo "usblp nicht geladen"
grep -rs usblp /etc/modprobe.d /usr/lib/modprobe.d 2>/dev/null || echo "keine Sperre (blacklist) für usblp gefunden"

h "Berechtigungen"
echo "Benutzer: $USER  Gruppen: $(id -nG)"
cat /etc/udev/rules.d/60-brother-ql.rules 2>/dev/null || echo "udev-Regel fehlt"

h "CUPS"
systemctl is-active cups 2>/dev/null || echo "cups nicht aktiv"
command -v lpstat >/dev/null && lpstat -v 2>/dev/null | grep -i -E 'brother|ql' || true

h "brother_ql"
command -v brother_ql || echo "brother_ql nicht im PATH"
pipx list --short 2>/dev/null | grep -i brother
command -v brother_ql >/dev/null && timeout 15 brother_ql -b pyusb discover 2>&1 | tail -n 5

h "Server"
grep -E '^(PRINT_MODE|BROTHER_QL_[A-Z]+)=' "$DIR/.env" 2>/dev/null || echo ".env fehlt"
systemctl --user is-active zefix-badge 2>/dev/null
curl -fs http://localhost:5173/api/status 2>/dev/null || echo "Server antwortet nicht"
echo
journalctl --user -u zefix-badge -n 15 --no-pager 2>/dev/null | tail -n 15
