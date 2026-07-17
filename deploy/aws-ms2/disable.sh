#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -f "$ROOT_DIR/ms2/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/ms2/.env"
  set +a
fi

AWS_CLI="${AWS_CLI:-$(command -v aws || true)}"
[[ -n "$AWS_CLI" && -x "$AWS_CLI" ]] || {
  echo "ERROR: aws CLI no esta instalado." >&2
  exit 127
}

MS2_AWS_REGION_VALUE="${MS2_AWS_REGION:-us-east-1}"
MS2_PROJECT_NAME_VALUE="${MS2_PROJECT_NAME:-activos-fijos-ms2}"
MS2_EXPECTED_AWS_ACCOUNT_VALUE="${MS2_EXPECTED_AWS_ACCOUNT:-302354366685}"

AWS_PROFILE_ARG=()
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_PROFILE_ARG=(--profile "$AWS_PROFILE")
fi

ACCOUNT_ID="$("$AWS_CLI" "${AWS_PROFILE_ARG[@]}" sts get-caller-identity --query Account --output text)"
if [[ -n "$MS2_EXPECTED_AWS_ACCOUNT_VALUE" && "$ACCOUNT_ID" != "$MS2_EXPECTED_AWS_ACCOUNT_VALUE" ]]; then
  echo "ERROR: cuenta AWS activa $ACCOUNT_ID no coincide con $MS2_EXPECTED_AWS_ACCOUNT_VALUE." >&2
  echo "Define MS2_EXPECTED_AWS_ACCOUNT= para omitir esta validacion." >&2
  exit 1
fi

echo "Deshabilitando MS2 en AWS"
echo "Cuenta: $ACCOUNT_ID"
echo "Region: $MS2_AWS_REGION_VALUE"
echo "Lambda: $MS2_PROJECT_NAME_VALUE"

"$AWS_CLI" "${AWS_PROFILE_ARG[@]}" lambda put-function-concurrency \
  --region "$MS2_AWS_REGION_VALUE" \
  --function-name "$MS2_PROJECT_NAME_VALUE" \
  --reserved-concurrent-executions 0 >/dev/null

if "$AWS_CLI" "${AWS_PROFILE_ARG[@]}" lambda get-function-url-config \
  --region "$MS2_AWS_REGION_VALUE" \
  --function-name "$MS2_PROJECT_NAME_VALUE" >/dev/null 2>&1; then
  "$AWS_CLI" "${AWS_PROFILE_ARG[@]}" lambda update-function-url-config \
    --region "$MS2_AWS_REGION_VALUE" \
    --function-name "$MS2_PROJECT_NAME_VALUE" \
    --auth-type AWS_IAM >/dev/null
  echo "Function URL protegida con AWS_IAM."
else
  echo "Function URL no encontrada; se mantiene solo la concurrencia en 0."
fi

echo "MS2 quedo pausado: no acepta llamadas anonimas y Lambda tiene concurrencia 0."
