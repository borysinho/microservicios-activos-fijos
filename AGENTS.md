# Sistema de Gestión de Activos Fijos — Guía para Agentes IA

**Materia**: Ingeniería de Software II — UAGRM  
**Docente**: Rolando Martinez  
**Metodología**: Proceso Unificado  
**Fecha de examen parcial 2**: Jueves 11 de julio de 2026

---

## Descripción del Proyecto

Plataforma distribuida de **gestión integral de activos fijos** para una organización. Permite registrar, asignar, trasladar, depreciar y dar de baja activos físicos. Integra IA para diagnóstico de estado, gestión documental con auditoría, automatización de procesos y BI.

Documentación completa en [`docs/`](docs/).

---

## Arquitectura

**3 microservicios independientes** desplegados en distintos proveedores cloud. Ver diagramas C4 y UML en [`docs/Propuesta - Sistema de Activos Fijos.md`](docs/Propuesta%20-%20Sistema%20de%20Activos%20Fijos.md).

| Microservicio            | Lenguaje           | Cloud           | Base de Datos | API             |
| ------------------------ | ------------------ | --------------- | ------------- | --------------- |
| MS1 — Gestión de Activos | Java / Spring Boot | Microsoft Azure | PostgreSQL    | GraphQL         |
| MS2 — Documentos e IA    | Python / FastAPI   | Amazon AWS      | DynamoDB + S3 | REST            |
| MS3 — Automatización     | Node.js + N8N      | Google Cloud    | —             | REST / Webhooks |

**Frontend Web**: Angular (único, consume los 3 microservicios)  
**App Móvil**: React Native (funcionalidades propias: cámara, GPS, IA)

---

## Requisitos Obligatorios del Docente

Estos requisitos son **no negociables** — el proyecto debe cubrirlos todos:

1. **Microservicios**: mínimo 3, desplegados en servidores distintos
2. **Multi-cloud**: Azure (MS1), AWS (MS2), GCP (MS3)
3. **Multi-lenguaje**: Java, Python, Node.js (uno por microservicio)
4. **Frontend**: Angular obligatorio
5. **App Móvil**: React Native obligatorio, con ≥ 3 recursos nativos del dispositivo (cámara, GPS, almacenamiento local) + IA integrada
6. **GraphQL**: obligatorio para MS1 (gestión empresarial ↔ frontend)
7. **Gestión documental**: auditoría, historial de versiones, registro de accesos
8. **Deep Learning**: procesamiento de imágenes (diagnóstico de estado de activos)
9. **Machine Learning**: supervisado (Random Forest) + no supervisado (K-Means/clustering)
10. **Blockchain**: registro inmutable de transacciones de activos
11. **Automatización N8N**: flujo mínimo de 3 pasos (WhatsApp → sistema → email)
12. **BD Relacional**: PostgreSQL
13. **BD NoSQL**: DynamoDB
14. **Almacenamiento de archivos**: Amazon S3
15. **BI**: dashboards, métricas e indicadores
16. **Despliegue**: 100% en la nube (nada local)

---

## Modelo de Dominio — MS1

Entidades principales en Spring Boot / PostgreSQL:

- `Activo` — activo fijo (código, nombre, valor, vida útil, estado, categoría)
- `CategoriaActivo` — con método y tasa de depreciación
- `Asignacion` — activo asignado a responsable + área
- `Traslado` — movimiento entre áreas
- `Baja` — retiro definitivo del activo
- `Area` / `Responsable` / `Usuario`
- `RegistroBlockchain` — hash de cada transacción de activo

**Estados del activo**: `ACTIVO → EN_MANTENIMIENTO ↔ ACTIVO → TRANSFERIDO → ACTIVO → DADO_DE_BAJA`  
Cada transición genera un `RegistroBlockchain`.

**Roles de usuario**: `ADMINISTRADOR`, `RESPONSABLE_AREA`, `AUDITOR`, `SOLO_LECTURA`

---

## Convenciones de Código

### MS1 — Spring Boot (Java)

- Arquitectura en capas: `Controller/Resolver → Service → Repository → Entity`
- GraphQL resolvers para todas las queries y mutations hacia el frontend
- Usar `UUID` como tipo de ID en todas las entidades
- Depreciación soporta métodos: `LINEAL`, `ACELERADO`, `SUMA_DIGITOS`

### MS2 — FastAPI (Python)

- Controladores separados: `DocumentoController`, `IAController`, `AuditoriaController`
- Modelos IA aislados en módulo `modelos/`: `CNN_EstadoActivo`, `RandomForest_VidaUtil`, `KMeans_Clustering`
- DynamoDB para metadatos de documentos y registros de auditoría
- S3 para archivos binarios (PDF, imágenes, contratos)

### MS3 — Node.js

- Orquestación de flujos con N8N
- Expone webhooks consumidos por MS1
- Integra con SendGrid (email) y WhatsApp Business API

---

## Modelado

- **C4**: solo para arquitectura (contexto y contenedores)
- **UML**: diagramas de clases, secuencia, estados, componentes y despliegue
- Diagramas en formato PlantUML, archivos en [`docs/diagramas/`](docs/diagramas/)
- Modelo StarUML en [`docs/Diagramas.mdj`](docs/Diagramas.mdj)

---

## Instrucciones por Área

- [MS1 — Spring Boot](.github/instructions/ms1-spring-boot.instructions.md)
- [MS2 — FastAPI + IA](.github/instructions/ms2-fastapi-ia.instructions.md)
- [MS3 — Automatización](.github/instructions/ms3-nodejs-n8n.instructions.md)
- [Frontend Web — Angular](.github/instructions/frontend-angular.instructions.md)
- [App Móvil — React Native](.github/instructions/mobile-react-native.instructions.md)
