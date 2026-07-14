CREATE TABLE IF NOT EXISTS incidencias (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origen                  VARCHAR(20) NOT NULL,
    activo_id               UUID REFERENCES activos(id),
    notificacion_id         VARCHAR(120),
    codigo_referencia       VARCHAR(80) NOT NULL,
    titulo                  VARCHAR(200) NOT NULL,
    tipo                    VARCHAR(80) NOT NULL,
    area                    VARCHAR(150),
    prioridad               VARCHAR(20) NOT NULL,
    estado                  VARCHAR(20) NOT NULL,
    detalle                 VARCHAR(1000) NOT NULL,
    responsable_operativo   VARCHAR(150),
    diagnostico             VARCHAR(1000),
    accion_ejecutada        VARCHAR(1000),
    proxima_accion          VARCHAR(500),
    fecha_compromiso        DATE,
    creado_por_id           UUID REFERENCES usuarios(id),
    cerrado_por_id          UUID REFERENCES usuarios(id),
    fecha_creacion          TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion     TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_cierre            TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_incidencias_notificacion
    ON incidencias(notificacion_id)
    WHERE notificacion_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_incidencias_activo ON incidencias(activo_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias(estado);
CREATE INDEX IF NOT EXISTS idx_incidencias_prioridad ON incidencias(prioridad);
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha_creacion ON incidencias(fecha_creacion DESC);
