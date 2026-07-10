"""Punto de entrada de MS2 — Gestión Documental e IA."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.controllers.auditoria_controller import router as auditoria_router
from app.controllers.documento_controller import router as documento_router
from app.controllers.ia_controller import ia_router, ml_router
from app.infrastructure.dynamodb_adapter import DynamoDBAdapter
from app.infrastructure.s3_adapter import S3Adapter
from app.modelos.model_loader import model_loader


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializar recursos AWS al arrancar (omitir si no hay conectividad)
    if settings.auto_bootstrap_aws_resources:
        try:
            s3 = S3Adapter()
            s3.ensure_bucket()
            db = DynamoDBAdapter()
            db.ensure_tables()
        except Exception as _aws_exc:
            import logging
            logging.getLogger(__name__).warning(
                "AWS/LocalStack no disponible al arrancar (%s). "
                "Endpoints de documentos y auditoría funcionarán en modo degradado.",
                _aws_exc.__class__.__name__,
            )
    # Cargar modelos IA/ML (con fallback si S3 no disponible)
    if settings.load_ai_models:
        model_loader.load_all()
    yield


app = FastAPI(
    title="MS2 — Gestión Documental e IA",
    description="Microservicio FastAPI para documentos, auditoría, CNN y ML",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers bajo prefijo /api
app.include_router(documento_router, prefix="/api")
app.include_router(auditoria_router, prefix="/api")
app.include_router(ia_router, prefix="/api")
app.include_router(ml_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ms2-documentos-ia"}
