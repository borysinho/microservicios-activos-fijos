#!/bin/sh
set -e

if [ "${N8N_IMPORT_WORKFLOWS:-true}" = "true" ] && [ -d /workflows ]; then
  n8n import:workflow --separate --input=/workflows || true
  n8n update:workflow --all --active=true || true
fi

exec n8n start
