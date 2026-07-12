# MS2 en AWS Free Tier

Este despliegue publica el microservicio **MS2 - Documentos e IA** en AWS usando:

- AWS Lambda con imagen Docker para FastAPI.
- Lambda Function URL como entrada HTTPS publica.
- Amazon S3 para documentos e imagenes.
- Amazon DynamoDB en modo `PAY_PER_REQUEST` para metadatos y auditoria.
- ECR para almacenar la imagen de Lambda.

La ruta prioriza cuenta gratuita y demos de bajo trafico: no deja EC2/App Runner/ECS encendido 24/7 y evita API Gateway.

## Requisitos locales

- AWS CLI autenticado (`aws sts get-caller-identity` debe responder).
- Docker con permiso para construir imagenes.
- Permisos AWS para ECR, CloudFormation, IAM, Lambda, S3 y DynamoDB.

## Variables

Desde `ms2/.env` o desde la shell:

```bash
export MS2_AWS_REGION=us-east-1
# Si usas AWS Academy o credenciales temporales, tambien define:
# export MS2_AWS_SESSION_TOKEN='token-temporal'
export MS2_S3_BUCKET_NAME=activos-fijos-ms2-<id-cuenta>-us-east-1
export MS2_DYNAMODB_TABLE_DOCS=activos-fijos-ms2-documentos
export MS2_DYNAMODB_TABLE_AUDITORIA=activos-fijos-ms2-auditoria
export MS2_JWT_SECRET='mismo-secret-que-MS1'
export MS2_ALLOWED_ORIGINS='https://tu-frontend.vercel.app,http://localhost:4200'
```

No definas `MS2_AWS_ENDPOINT_URL` en produccion; ese valor es solo para LocalStack.
El script ignora automaticamente valores locales como `localhost`, `127.0.0.1` o `localstack`.

## Desplegar

```bash
bash deploy/aws-ms2/deploy.sh
```

El script:

1. Valida AWS CLI y Docker.
2. Crea un repositorio ECR si no existe.
3. Aplica una lifecycle policy para conservar solo las ultimas 5 imagenes.
4. Construye la imagen Lambda liviana desde `deploy/aws-ms2/Dockerfile.lambda`.
5. Sube la imagen a ECR.
6. Despliega CloudFormation con Lambda Function URL, S3 y DynamoDB.
7. Imprime `ApiUrl` y `HealthUrl`.

## CI/CD con GitHub Actions

MS2 tiene despliegue continuo mediante `.github/workflows/ms2-aws-cd.yml`.

El workflow se dispara con:

- `push` a `main` que modifique `ms2/**`
- `push` a `main` que modifique `deploy/aws-ms2/**`
- ejecución manual con `workflow_dispatch`

El pipeline ejecuta:

1. `pip install -r requirements.txt`
2. `pytest`
3. si existe `AWS_ROLE_TO_ASSUME`, autenticacion por OIDC con `aws-actions/configure-aws-credentials`
4. si no hay OIDC pero existen access keys, autenticacion por secretos AWS
5. si hay credenciales AWS, `bash deploy/aws-ms2/deploy.sh`

Si no existe `AWS_ROLE_TO_ASSUME` ni access keys, el workflow deja pasar CI y omite el despliegue con un warning. Al agregar OIDC o secretos, el siguiente `push` o `workflow_dispatch` despliega MS2.

Variable recomendada para GitHub OIDC:

| Variable | Uso |
| --- | --- |
| `AWS_ROLE_TO_ASSUME` | ARN del rol IAM que GitHub Actions asume sin access keys permanentes |

Secretos requeridos en GitHub Actions:

| Secreto | Uso |
| --- | --- |
| `MS2_JWT_SECRET` | Secreto compartido con MS1 para validar JWT |

Secretos alternativos si no usas OIDC:

| Secreto | Uso |
| --- | --- |
| `MS2_AWS_ACCESS_KEY_ID` | Credencial del usuario o rol con permisos de despliegue |
| `MS2_AWS_SECRET_ACCESS_KEY` | Credencial del usuario o rol con permisos de despliegue |

Secretos opcionales:

| Secreto | Uso |
| --- | --- |
| `MS2_AWS_SESSION_TOKEN` | Token temporal para AWS Academy o credenciales STS |

Variables opcionales:

| Variable | Valor por defecto |
| --- | --- |
| `MS2_AWS_REGION` | `us-east-1` |
| `MS2_PROJECT_NAME` | `activos-fijos-ms2` |
| `MS2_STACK_NAME` | `activos-fijos-ms2` |
| `MS2_ECR_REPO` | `activos-fijos-ms2` |
| `MS2_S3_BUCKET_NAME` | generado por el script si está vacío |
| `MS2_DYNAMODB_TABLE_DOCS` | `activos-fijos-ms2-documentos` |
| `MS2_DYNAMODB_TABLE_AUDITORIA` | `activos-fijos-ms2-auditoria` |
| `MS2_ALLOWED_ORIGINS` | `*` |
| `MS2_JWT_ALGORITHM` | `HS512` |

## Verificar

```bash
curl https://<url-id>.lambda-url.<region>.on.aws/health
```

Respuesta esperada:

```json
{"status":"ok","service":"ms2-documentos-ia"}
```

Luego configura frontend y mobile:

- Frontend: `environment.prod.ts` -> `ms2BaseUrl: '<ApiUrl>/api'`
- Mobile: `MS2_BASE_URL=<ApiUrl>/api`

## Nota sobre IA/ML y costos

La imagen Lambda excluye `tensorflow-cpu` y `scikit-learn` para evitar una imagen pesada y costos innecesarios en una cuenta gratuita. MS2 conserva endpoints de diagnostico y ML usando los fallbacks implementados en el codigo. Para modelos reales, se puede crear una imagen de produccion con dependencias completas y cargar los modelos desde S3, evaluando memoria, cold start y almacenamiento ECR.

Para archivos grandes, no conviene subir el binario completo atravesando Lambda. El flujo recomendado es generar una URL presignada de carga y subir directamente a S3; para la demo academica actual, usar archivos pequenos.
