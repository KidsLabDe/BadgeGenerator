# ZeFix! Kartenschmiede (Badge Generator)

Jugendliche bauen sich mit Schiebereglern und Chips eine Sammelkarte. Gemini schreibt die Texte und zeichnet einen
s/w-Avatar, danach druckt der Brother QL-560 die Karte auf 62 mm Endlosband.

## Linux-Laptop mit QL-560 (Einsatz vor Ort – Manjaro/Arch, Debian/Ubuntu, Fedora)

```bash
git clone https://github.com/kidslabde/BadgeGenerator.git
cd BadgeGenerator
./setup-linux.sh
```

Das Skript erledigt Folgendes (es kann mehrfach laufen):
1. erkennt den Paketmanager (pacman, apt oder dnf) und installiert bei Bedarf Node.js und pipx
2. installiert `brother_ql` über pipx
3. nimmt dich in die Gruppe `lp` auf, für den Zugriff auf `/dev/usb/lp0`
4. legt `.env` an und fragt nach dem Gemini-Key
5. druckt auf Wunsch ein Testetikett
6. richtet den Server als systemd-User-Dienst ein, der beim Anmelden startet
7. legt den Menüeintrag „ZeFix! Kartenschmiede“ an, auf Wunsch auch den Vollbild-Autostart

Nützliche Befehle:
```bash
journalctl --user -u zefix-badge -f
```
```bash
systemctl --user restart zefix-badge
```

Nach dem ersten Lauf einmal ab- und wieder anmelden, damit die Gruppe `lp` greift.

Probleme mit dem Drucker? Dann `./scripts/printer-check.sh` ausführen und die Ausgabe mitschicken.
Gibt es kein `/dev/usb/lp0` (auf Manjaro/Arch ist `usblp` oft gesperrt), druckt der Server automatisch direkt
per USB über libusb. Die nötige udev-Regel legt `setup-linux.sh` an.

## Entwicklung (macOS)

```bash
cp .env.example .env   # Key eintragen
node server.js
```
Dann http://localhost:5173 öffnen. Drucken per USB auf dem Mac: `brew install libusb`, `pipx install brother_ql_next`,
in `.env` `PRINT_MODE=brother_ql` setzen. Ohne Drucker öffnet „Drucken“ den Browser-Druckdialog (Papier 62 mm).

## Inhalte anpassen

Kategorien, Tags, Avatar-Wesen und Persönlichkeitsregler stehen in `public/data.js`.

## Speicherung und Übersicht

Jede gezauberte Karte wird lokal in `data/cards/<id>/` gespeichert: Profil, Texte, Bingo, Avatar sowie die fertigen
Druckbilder `card.png` und `bingo.png`. Unter http://localhost:5173/overview.html findest du alle Karten, mit Filter
(Teilnehmende/Mentis), Suche, Nachdruck, Bearbeiten und Löschen.

## Kennenlern-Bingo

Zu jeder Karte gehört ein Bingozettel, der als zweites Etikett gedruckt wird. Die Fun Facts aus Schritt 6 stehen nie
auf der Karte, sie fließen nur in die Bingozettel der anderen ein. Die Felder kommen aus dem anonymen Vorrat der
bisherigen Karten (nur Chip-Auswahlen, nie Namen oder Freitext). Am Anfang füllen häufige Antworten auf.
Eigener Freitext (Lieblingskünstler*in usw.) erscheint nur als „Wie du“-Feld auf dem eigenen Zettel.

## Welche Daten wohin gehen

| Eingabe | Karte | Bingo | an Gemini |
|---|---|---|---|
| Name, Rolle | ✅ | ✅ | ✅ |
| Skill-Regler und Tags | ✅ Typen, Energie, Attacken | ✅ Typ- und „zeigen kann“-Felder | ✅ |
| Avatar-Wesen und Extras | ✅ Bild | – | ✅ |
| Lern-Chips | indirekt (Flavor) | ✅ „zeigen kann“ / „lernen will“ | ✅ |
| Fun Facts, Lieblingskünstler*in | – | ✅ | ❌ nie |

Alles wird lokal in `data/cards/` gespeichert, denn der Bingo-Vorrat braucht die Fun Facts der anderen.

## Datenschutz

Alles bleibt lokal auf dem Laptop. An Gemini gehen nur Skills, Avatar-Wünsche und Persönlichkeitsregler, keine Fun Facts.
**Nach dem Event den Ordner `data/` löschen.** Vor dem Event außerdem die Testkarten löschen, damit die Nummerierung bei #001 beginnt:
```bash
rm -rf data/cards/*
```
