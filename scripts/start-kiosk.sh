#!/usr/bin/env bash
# Öffnet die Kartenschmiede im Vollbild, sobald der Server antwortet.
URL="http://localhost:5173"
for _ in $(seq 1 30); do
  if command -v curl >/dev/null; then curl -fs "$URL/api/status" >/dev/null && break; else sleep 3; break; fi
  sleep 1
done
for b in chromium chromium-browser google-chrome google-chrome-stable brave-browser; do
  if command -v "$b" >/dev/null; then exec "$b" --app="$URL" --start-fullscreen --no-first-run; fi
done
if command -v firefox >/dev/null; then exec firefox --new-window "$URL"; fi
exec xdg-open "$URL"
