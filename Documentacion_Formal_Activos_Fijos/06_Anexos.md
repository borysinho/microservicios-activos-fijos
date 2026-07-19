# 6. Anexos

## 6.1 Indice de Diagramas PlantUML

Los siguientes diagramas fueron elaborados en PlantUML con notacion UML 2.5 o superior.

| Diagrama | Archivo |
| --- | --- |
| Casos de uso general | `diagramas/01_casos_uso_general.puml` |
| Modelo de dominio | `diagramas/02_modelo_dominio.puml` |
| Modelo de analisis | `diagramas/03_modelo_analisis.puml` |
| Componentes del sistema | `diagramas/04_componentes_sistema.puml` |
| Despliegue multi-cloud | `diagramas/05_despliegue_multicloud.puml` |
| Secuencia: registrar activo | `diagramas/06_secuencia_registrar_activo.puml` |
| Secuencia: diagnostico IA movil | `diagramas/07_secuencia_diagnostico_ia_movil.puml` |
| Estados del activo | `diagramas/08_estados_activo.puml` |
| Actividad: WhatsApp a email | `diagramas/09_actividad_whatsapp_email.puml` |

## 6.2 Endpoints de Servicios

| Servicio | URL productiva | Tipo |
| --- | --- | --- |
| Frontend web | https://microservicios-activos-fijos.vercel.app/ | Aplicacion web |
| Manual de uso | https://microservicios-activos-fijos.vercel.app/manual | Recurso de aprendizaje |
| Repositorio | https://github.com/borysinho/microservicios-activos-fijos | Codigo fuente |
| Releases moviles | https://github.com/borysinho/microservicios-activos-fijos/releases/ | Instalacion movil |
| MS1 GraphQL | https://ms1-activos-fijos-bq20260710.eastus.cloudapp.azure.com/graphql | API GraphQL |
| MS1 Auth | https://ms1-activos-fijos-bq20260710.eastus.cloudapp.azure.com/auth | REST autenticacion |
| MS2 REST | https://ycsivjbq335a75x6nfgxcvhdry0kytxf.lambda-url.us-east-1.on.aws/api | API REST |
| MS3 REST | https://ms3-activos-fijos-k5ikeew3wq-uc.a.run.app/api | API REST |

## 6.3 Contrato GraphQL Representativo

```graphql
type Activo {
  id: ID!
  codigo: String!
  nombre: String!
  valorAdquisicion: Float!
  valorLibros: Float!
  estado: EstadoActivo!
  categoria: CategoriaActivo!
  asignacionActual: Asignacion
  historialTraslados: [Traslado!]!
  registrosBlockchain: [RegistroBlockchain!]!
}

type Query {
  activos(filtro: FiltroActivoInput): [Activo!]!
  activo(id: ID!): Activo
  dashboardBI: DashboardMetricas!
  reporteDepreciacion(anio: Int!): ReporteDepreciacion!
}

type Mutation {
  registrarActivo(input: ActivoInput!): Activo!
  asignarActivo(input: AsignacionInput!): Asignacion!
  registrarTraslado(input: TrasladoInput!): Traslado!
  registrarBaja(input: BajaInput!): Baja!
  cambiarEstadoActivo(id: ID!, estado: EstadoActivo!, observacion: String): Activo!
}
```

## 6.4 Contratos REST Representativos

| Servicio | Metodo | Recurso | Proposito |
| --- | --- | --- | --- |
| MS2 | POST | `/api/documentos/upload` | Subir documento a S3 y registrar metadatos/auditoria. |
| MS2 | GET | `/api/documentos/{documentoId}/url` | Obtener URL presignada de descarga. |
| MS2 | POST | `/api/ia/diagnostico` | Procesar imagen para verificacion visual IA. |
| MS2 | GET | `/api/ml/prediccion-vida-util` | Obtener prediccion de vida util restante. |
| MS2 | GET | `/api/ml/clustering` | Obtener agrupacion K-Means de activos. |
| MS3 | POST | `/api/whatsapp/webhook` | Recibir evento de WhatsApp Business API. |
| MS3 | GET | `/api/notificaciones` | Consultar notificaciones de usuario. |
| MS3 | POST | `/api/webhooks/mantenimiento-programado` | Disparar automatizacion de mantenimiento. |

## 6.5 Resumen de Cumplimiento de Requisitos

| Requisito | Cumplimiento |
| --- | --- |
| Minimo 3 microservicios | 4 microservicios: MS1, MS2, MS3 y MS4. |
| Multi-cloud | Azure, AWS, Google Cloud y Vercel para frontend. |
| Multi-lenguaje | Java, Python y Node.js. |
| Frontend Angular | Aplicacion web Angular desplegada. |
| App movil React Native | Aplicacion movil con build Android y funciones de campo. |
| 3 recursos nativos | Camara, GPS, almacenamiento offline y notificaciones push. |
| GraphQL obligatorio | MS1 expone GraphQL para gestion empresarial. |
| Gestion documental | MS2 gestiona S3, DynamoDB, versiones y auditoria. |
| Deep Learning | CNN para analisis visual de evidencia fotografica. |
| Machine Learning | Random Forest y K-Means. |
| Blockchain | Registro de transacciones de activos mediante hashes verificables. |
| N8N | Tres workflows versionados en MS4 e invocados solo por MS3. |
| PostgreSQL | Supabase PostgreSQL para MS1. |
| DynamoDB | Metadatos documentales y auditoria en MS2. |
| Amazon S3 | Almacenamiento de documentos e imagenes. |
| BI | Dashboard con KPIs, graficas y reportes. |
| Despliegue 100% cloud | Servicios productivos alojados en proveedores cloud. |

## 6.6 Criterios para Generar PDF Final

Para convertir esta documentacion a PDF formal se recomienda:

- Usar una herramienta que respete enlaces internos y tabla de contenido navegable.
- Renderizar los SVG de QR sin rasterizarlos a baja resolucion.
- Incluir los diagramas PlantUML renderizados como imagenes dentro del PDF.
- Mantener los anexos al final del documento para preservar legibilidad.
- Verificar manualmente que cada URL y QR abra el recurso correspondiente.

