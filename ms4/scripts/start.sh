#!/bin/sh
set -e

IMPORT_MARKER="${N8N_IMPORT_WORKFLOWS_MARKER:-/home/node/.n8n/.ms4-workflows-imported}"
FORCE_IMPORT="${N8N_FORCE_IMPORT_WORKFLOWS:-false}"

seed_workflows() {
  export_file="$(mktemp)"
  imported_any=false

  n8n export:workflow --all > "$export_file" 2>/tmp/ms4-export-workflows.err || true

  seed_workflow_if_missing \
    "$export_file" \
    "Flujo 01 - Solicitud de Revision por WhatsApp" \
    "/workflows/flujo_01_solicitud_revision.json"
  seed_workflow_if_missing \
    "$export_file" \
    "Flujo 02 - Alerta de Vencimiento de Garantia" \
    "/workflows/flujo_02_alerta_garantia.json"
  seed_workflow_if_missing \
    "$export_file" \
    "Flujo 03 - Alerta de Mantenimiento Programado" \
    "/workflows/flujo_03_alerta_mantenimiento.json"

  if [ "$imported_any" = "true" ]; then
    n8n update:workflow --all --active=true
  fi

  rm -f "$export_file"
  mark_imported
}

seed_workflow_if_missing() {
  export_file="$1"
  workflow_name="$2"
  workflow_file="$3"

  if [ "$FORCE_IMPORT" != "true" ] && grep -Fq "$workflow_name" "$export_file"; then
    echo "MS4 workflow already exists: $workflow_name"
    return 0
  fi

  echo "Importing MS4 workflow: $workflow_name"
  n8n import:workflow --input="$workflow_file"
  imported_any=true
}

mark_imported() {
  mkdir -p "$(dirname "$IMPORT_MARKER")"
  touch "$IMPORT_MARKER"
}

if [ "${N8N_IMPORT_WORKFLOWS:-true}" = "true" ] && [ -d /workflows ]; then
  if [ -f "$IMPORT_MARKER" ] && [ "$FORCE_IMPORT" != "true" ]; then
    echo "MS4 workflows already imported; skipping seed import."
  else
    seed_workflows
  fi
fi

exec n8n start
