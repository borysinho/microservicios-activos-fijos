#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy/aws-ms2"

if [[ -f "$ROOT_DIR/ms2/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/ms2/.env"
  set +a
fi

if [[ "${AWS_ENDPOINT_URL:-}" =~ (localhost|127\.0\.0\.1|localstack) ]]; then
  unset AWS_ENDPOINT_URL
fi

AWS_CLI="${AWS_CLI:-$(command -v aws || true)}"
if [[ -z "$AWS_CLI" && -x /tmp/aws-cli-ms2-bin/aws ]]; then
  AWS_CLI="/tmp/aws-cli-ms2-bin/aws"
fi

PROJECT_NAME="${PROJECT_NAME:-activos-fijos-ms2}"
STACK_NAME="${STACK_NAME:-$PROJECT_NAME}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE_ARG=()
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_PROFILE_ARG=(--profile "$AWS_PROFILE")
fi

DOCS_TABLE_NAME="${DYNAMODB_TABLE_DOCS:-documentos}"
AUDIT_TABLE_NAME="${DYNAMODB_TABLE_AUDITORIA:-auditoria}"
JWT_SECRET="${JWT_SECRET:-saf-ms1-super-secret-key-2026-activos-fijos-bolivia-uagrm}"
JWT_ALGORITHM="${JWT_ALGORITHM:-HS512}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-*}"

[[ -n "$AWS_CLI" && -x "$AWS_CLI" ]] || {
  echo "ERROR: aws CLI no esta instalado." >&2
  exit 127
}
command -v docker >/dev/null || {
  echo "ERROR: Docker no esta instalado." >&2
  exit 127
}

ACCOUNT_ID="$("$AWS_CLI" "${AWS_PROFILE_ARG[@]}" sts get-caller-identity --query Account --output text)"
BUCKET_NAME="${S3_BUCKET_NAME:-${PROJECT_NAME}-${ACCOUNT_ID}-${AWS_REGION}}"
ECR_REPO="${ECR_REPO:-$PROJECT_NAME}"

echo "AWS CLI: $AWS_CLI"
echo "Region: $AWS_REGION"
echo "Cuenta AWS: $ACCOUNT_ID"
echo "Stack: $STACK_NAME"
echo "Bucket S3: $BUCKET_NAME"
echo "ECR repo: $ECR_REPO"

if ! "$AWS_CLI" "${AWS_PROFILE_ARG[@]}" ecr describe-repositories \
  --region "$AWS_REGION" \
  --repository-names "$ECR_REPO" >/dev/null 2>&1; then
  "$AWS_CLI" "${AWS_PROFILE_ARG[@]}" ecr create-repository \
    --region "$AWS_REGION" \
    --repository-name "$ECR_REPO" \
    --image-scanning-configuration scanOnPush=true >/dev/null
fi

ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
IMAGE_URI="${ECR_URI}:${IMAGE_TAG}"

"$AWS_CLI" "${AWS_PROFILE_ARG[@]}" ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_URI"

docker build \
  --platform linux/amd64 \
  -f "$DEPLOY_DIR/Dockerfile.lambda" \
  -t "$IMAGE_URI" \
  "$ROOT_DIR"

docker push "$IMAGE_URI"

"$AWS_CLI" "${AWS_PROFILE_ARG[@]}" cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$DEPLOY_DIR/cloudformation.yml" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    ProjectName="$PROJECT_NAME" \
    ImageUri="$IMAGE_URI" \
    BucketName="$BUCKET_NAME" \
    DocsTableName="$DOCS_TABLE_NAME" \
    AuditTableName="$AUDIT_TABLE_NAME" \
    JwtSecret="$JWT_SECRET" \
    JwtAlgorithm="$JWT_ALGORITHM" \
    AllowedOrigins="$ALLOWED_ORIGINS"

"$AWS_CLI" "${AWS_PROFILE_ARG[@]}" cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output table
