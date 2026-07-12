#!/bin/sh
set -e

if [ "${N8N_IMPORT_WORKFLOWS:-true}" = "true" ] && [ -d /workflows ]; then
  for workflow in /workflows/*.json; do
    [ -e "$workflow" ] || continue
    n8n import:workflow --input="$workflow" || true
  done
fi

exec n8n start
