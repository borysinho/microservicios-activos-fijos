-- =====================================================================
-- V1__init_schema.sql
-- MS1 — Gestión de Activos Fijos
-- Migración inicial — Flyway
-- =====================================================================

-- Supabase/PostgreSQL: habilita gen_random_uuid() usado como DEFAULT.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tipos enumerados de PostgreSQL
CREATE TYPE estado_activo AS ENUM (
    'ACTIVO', 'EN_MANTENIMIENTO', 'TRANSFERIDO', 'DADO_DE_BAJA'
);

CREATE TYPE metodo_depreciacion AS ENUM (
    'LINEAL', 'ACELERADO', 'SUMA_DIGITOS'
);

CREATE TYPE rol_usuario AS ENUM (
    'ADMINISTRADOR', 'RESPONSABLE_AREA', 'AUDITOR', 'SOLO_LECTURA'
);

CREATE TYPE tipo_transaccion_blockchain AS ENUM (
    'REGISTRO', 'ASIGNACION', 'TRASLADO', 'MANTENIMIENTO', 'BAJA'
);

-- ── Responsables ─────────────────────────────────────────────────────
CREATE TABLE responsables (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(150) NOT NULL,
    cargo       VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    telefono    VARCHAR(20)
);

-- ── Áreas ─────────────────────────────────────────────────────────────
CREATE TABLE areas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          VARCHAR(20) NOT NULL UNIQUE,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     VARCHAR(255),
    responsable_id  UUID REFERENCES responsables(id)
);

-- ── Usuarios ──────────────────────────────────────────────────────────
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(80) NOT NULL UNIQUE,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    rol             VARCHAR(30) NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Categorías de Activo ──────────────────────────────────────────────
CREATE TABLE categorias_activo (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre               VARCHAR(100) NOT NULL UNIQUE,
    descripcion          VARCHAR(255),
    metodo_depreciacion  VARCHAR(20) NOT NULL,
    tasa_depreciacion    DOUBLE PRECISION NOT NULL
);

-- ── Activos ───────────────────────────────────────────────────────────
CREATE TABLE activos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo              VARCHAR(50) NOT NULL UNIQUE,
    nombre              VARCHAR(200) NOT NULL,
    descripcion         VARCHAR(500),
    fecha_adquisicion   DATE NOT NULL,
    valor_adquisicion   NUMERIC(15, 2) NOT NULL,
    vida_util_anios     INTEGER NOT NULL,
    estado              VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    categoria_id        UUID NOT NULL REFERENCES categorias_activo(id),
    area_actual_id      UUID REFERENCES areas(id),
    ubicacion           VARCHAR(100)
);

-- ── Asignaciones ──────────────────────────────────────────────────────
CREATE TABLE asignaciones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activo_id           UUID NOT NULL REFERENCES activos(id),
    responsable_id      UUID NOT NULL REFERENCES responsables(id),
    area_id             UUID NOT NULL REFERENCES areas(id),
    fecha_asignacion    DATE NOT NULL,
    fecha_devolucion    DATE,
    observaciones       VARCHAR(500),
    activa              BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Traslados ─────────────────────────────────────────────────────────
CREATE TABLE traslados (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activo_id               UUID NOT NULL REFERENCES activos(id),
    area_origen_id          UUID NOT NULL REFERENCES areas(id),
    area_destino_id         UUID NOT NULL REFERENCES areas(id),
    autorizado_por_id       UUID NOT NULL REFERENCES usuarios(id),
    fecha                   DATE NOT NULL,
    motivo_traslado         VARCHAR(500),
    recepcion_confirmada    BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── Bajas ─────────────────────────────────────────────────────────────
CREATE TABLE bajas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activo_id           UUID NOT NULL UNIQUE REFERENCES activos(id),
    autorizado_por_id   UUID NOT NULL REFERENCES usuarios(id),
    fecha               DATE NOT NULL,
    motivo              VARCHAR(500) NOT NULL,
    valor_residual      NUMERIC(15, 2) NOT NULL DEFAULT 0,
    numero_resolucion   VARCHAR(100)
);

-- ── Registros Blockchain ──────────────────────────────────────────────
CREATE TABLE registros_blockchain (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activo_id           UUID NOT NULL REFERENCES activos(id),
    hash                VARCHAR(66) NOT NULL,
    tipo_transaccion    VARCHAR(30) NOT NULL,
    payload             TEXT NOT NULL,
    bloque_id           VARCHAR(100),
    timestamp           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────
CREATE INDEX idx_activos_estado      ON activos(estado);
CREATE INDEX idx_activos_categoria   ON activos(categoria_id);
CREATE INDEX idx_activos_area        ON activos(area_actual_id);
CREATE INDEX idx_asignaciones_activo ON asignaciones(activo_id);
CREATE INDEX idx_asignaciones_activa ON asignaciones(activa);
CREATE INDEX idx_traslados_activo    ON traslados(activo_id);
CREATE INDEX idx_blockchain_activo   ON registros_blockchain(activo_id);
CREATE INDEX idx_blockchain_timestamp ON registros_blockchain(timestamp DESC);
