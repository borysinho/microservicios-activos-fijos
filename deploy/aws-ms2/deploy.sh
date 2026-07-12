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

if [[ "${MS2_AWS_ACCESS_KEY_ID:-}" == "test" && "${MS2_AWS_SECRET_ACCESS_KEY:-}" == "test" ]]; then
  unset MS2_AWS_ACCESS_KEY_ID MS2_AWS_SECRET_ACCESS_KEY MS2_AWS_SESSION_TOKEN
fi

if [[ "${MS2_AWS_ENDPOINT_URL:-}" =~ (localhost|127\.0\.0\.1|localstack) ]]; then
  unset MS2_AWS_ENDPOINT_URL
fi

if [[ "${MS2_S3_BUCKET_NAME:-}" == "activos-fijos-documentos-dev" ]]; then
  unset MS2_S3_BUCKET_NAME
fi

AWS_CLI="${AWS_CLI:-$(command -v aws || true)}"
if [[ -z "$AWS_CLI" && -x /tmp/aws-cli-ms2-bin/aws ]]; then
  AWS_CLI="/tmp/aws-cli-ms2-bin/aws"
fi

MS2_PROJECT_NAME_VALUE="${MS2_PROJECT_NAME:-activos-fijos-ms2}"
MS2_STACK_NAME_VALUE="${MS2_STACK_NAME:-$MS2_PROJECT_NAME_VALUE}"
MS2_AWS_REGION_VALUE="${MS2_AWS_REGION:-us-east-1}"
AWS_PROFILE_ARG=()
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_PROFILE_ARG=(--profile "$AWS_PROFILE")
fi

MS2_DOCS_TABLE_NAME_VALUE="${MS2_DYNAMODB_TABLE_DOCS:-activos-fijos-ms2-documentos}"
MS2_AUDIT_TABLE_NAME_VALUE="${MS2_DYNAMODB_TABLE_AUDITORIA:-activos-fijos-ms2-auditoria}"
MS2_JWT_SECRET_VALUE="${MS2_JWT_SECRET:-saf-ms1-super-secret-key-2026-activos-fijos-bolivia-uagrm}"
MS2_JWT_ALGORITHM_VALUE="${MS2_JWT_ALGORITHM:-HS512}"
MS2_ALLOWED_ORIGINS_VALUE="${MS2_ALLOWED_ORIGINS:-*}"
MS2_LOAD_AI_MODELS_VALUE="${MS2_LOAD_AI_MODELS:-true}"

[[ -n "$AWS_CLI" && -x "$AWS_CLI" ]] || {
  echo "ERROR: aws CLI no esta instalado." >&2
  exit 127
}
command -v docker >/dev/null || {
  echo "ERROR: Docker no esta instalado." >&2
  exit 127
}

ACCOUNT_ID="$("$AWS_CLI" "${AWS_PROFILE_ARG[@]}" sts get-caller-identity --query Account --output text)"
MS2_BUCKET_NAME_VALUE="${MS2_S3_BUCKET_NAME:-${MS2_PROJECT_NAME_VALUE}-${ACCOUNT_ID}-${MS2_AWS_REGION_VALUE}}"
MS2_ECR_REPO_VALUE="${MS2_ECR_REPO:-$MS2_PROJECT_NAME_VALUE}"

echo "AWS CLI: $AWS_CLI"
echo "Region: $MS2_AWS_REGION_VALUE"
echo "Cuenta AWS: $ACCOUNT_ID"
echo "Stack: $MS2_STACK_NAME_VALUE"
echo "Bucket S3: $MS2_BUCKET_NAME_VALUE"
echo "ECR repo: $MS2_ECR_REPO_VALUE"

if ! "$AWS_CLI" "${AWS_PROFILE_ARG[@]}" ecr describe-repositories \
  --region "$MS2_AWS_REGION_VALUE" \
  --repository-names "$MS2_ECR_REPO_VALUE" >/dev/null 2>&1; then
  "$AWS_CLI" "${AWS_PROFILE_ARG[@]}" ecr create-repository \
    --region "$MS2_AWS_REGION_VALUE" \
    --repository-name "$MS2_ECR_REPO_VALUE" \
    --image-scanning-configuration scanOnPush=true >/dev/null
fi

"$AWS_CLI" "${AWS_PROFILE_ARG[@]}" ecr put-lifecycle-policy \
  --region "$MS2_AWS_REGION_VALUE" \
  --repository-name "$MS2_ECR_REPO_VALUE" \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Mantener solo las ultimas 5 imagenes de MS2",
        "selection": {
          "tagStatus": "any",
          "countType": "imageCountMoreThan",
          "countNumber": 5
        },
        "action": {
          "type": "expire"
        }
      }
    ]
  }' >/dev/null

ECR_URI="${ACCOUNT_ID}.dkr.ecr.${MS2_AWS_REGION_VALUE}.amazonaws.com/${MS2_ECR_REPO_VALUE}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
IMAGE_URI="${ECR_URI}:${IMAGE_TAG}"

"$AWS_CLI" "${AWS_PROFILE_ARG[@]}" ecr get-login-password --region "$MS2_AWS_REGION_VALUE" \
  | docker login --username AWS --password-stdin "$ECR_URI"

docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  --load \
  -f "$DEPLOY_DIR/Dockerfile.lambda" \
  -t "$IMAGE_URI" \
  "$ROOT_DIR"

docker push "$IMAGE_URI"

"$AWS_CLI" "${AWS_PROFILE_ARG[@]}" cloudformation deploy \
  --region "$MS2_AWS_REGION_VALUE" \
  --stack-name "$MS2_STACK_NAME_VALUE" \
  --template-file "$DEPLOY_DIR/cloudformation.yml" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    ProjectName="$MS2_PROJECT_NAME_VALUE" \
    ImageUri="$IMAGE_URI" \
    BucketName="$MS2_BUCKET_NAME_VALUE" \
    DocsTableName="$MS2_DOCS_TABLE_NAME_VALUE" \
    AuditTableName="$MS2_AUDIT_TABLE_NAME_VALUE" \
    JwtSecret="$MS2_JWT_SECRET_VALUE" \
    JwtAlgorithm="$MS2_JWT_ALGORITHM_VALUE" \
    AllowedOrigins="$MS2_ALLOWED_ORIGINS_VALUE" \
    LoadAiModels="$MS2_LOAD_AI_MODELS_VALUE"

"$AWS_CLI" "${AWS_PROFILE_ARG[@]}" cloudformation describe-stacks \
  --region "$MS2_AWS_REGION_VALUE" \
  --stack-name "$MS2_STACK_NAME_VALUE" \
  --query "Stacks[0].Outputs" \
  --output table
