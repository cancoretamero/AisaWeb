#!/usr/bin/env bash
set -euo pipefail

PORT=4173
ARTIFACTS_DIR="artifacts"

mkdir -p "$ARTIFACTS_DIR"

python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID"' EXIT

CHROME=$(command -v chromium || command -v chromium-browser || command -v google-chrome || true)
if [[ -z "$CHROME" ]]; then
  echo "Chrome/Chromium not found. Please install chromium to run visual regression." >&2
  exit 1
fi

pages=(
  "index.html"
  "quienes-somos.html"
  "nosotros.html"
  "equipo.html"
  "carreras.html"
  "prensa.html"
  "sostenibilidad.html"
  "unidades.html"
  "utilidades.html"
)

declare -A light_refs=(
  ["quienes-somos.html"]="light-mode/quienessomos-light.html"
  ["equipo.html"]="light-mode/equipo-light.html"
  ["carreras.html"]="light-mode/carreras-light.html"
  ["prensa.html"]="light-mode/prensa-light.html"
  ["sostenibilidad.html"]="light-mode/sostenibilidad-light"
  ["unidades.html"]="light-mode/unidades-light.html"
)

compare_cmd=$(command -v compare || true)
metrics_file="$ARTIFACTS_DIR/metrics.txt"
: > "$metrics_file"

for page in "${pages[@]}"; do
  name="${page%.html}"

  for theme in dark light; do
    "$CHROME" \
      --headless \
      --disable-gpu \
      --hide-scrollbars \
      --window-size=1440,900 \
      --virtual-time-budget=6000 \
      --screenshot="$ARTIFACTS_DIR/${name}.${theme}.png" \
      "http://localhost:$PORT/${page}?__theme=${theme}&__screenshot=1"
  done

  ref_path="${light_refs[$page]:-}"
  if [[ -n "$ref_path" ]]; then
    "$CHROME" \
      --headless \
      --disable-gpu \
      --hide-scrollbars \
      --window-size=1440,900 \
      --virtual-time-budget=6000 \
      --screenshot="$ARTIFACTS_DIR/${name}.light.ref.png" \
      "http://localhost:$PORT/${ref_path}?__theme=light&__screenshot=1"

    if [[ -n "$compare_cmd" ]]; then
      diff_path="$ARTIFACTS_DIR/${name}.light.diff.png"
      metric=$(compare -metric AE "$ARTIFACTS_DIR/${name}.light.ref.png" "$ARTIFACTS_DIR/${name}.light.png" "$diff_path" 2>&1 || true)
      echo "${name}: ${metric}" >> "$metrics_file"
    fi
  fi

  echo "Captured ${page}"
done
