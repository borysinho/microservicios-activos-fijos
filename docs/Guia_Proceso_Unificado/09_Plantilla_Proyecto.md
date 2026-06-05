# 09. Plantilla y Hoja de Ruta del Proyecto (UP)

Esta es una **guía operativa paso a paso** para desarrollar un proyecto universitario aplicando el Proceso Unificado. Sigue el orden de las fases y, dentro de cada una, el orden recomendado de actividades.

## 0. Estructura de carpetas sugerida del proyecto

```
mi-proyecto/
├── docs/
│   ├── 01_Vision.md
│   ├── 02_Glosario.md
│   ├── 03_Modelo_Negocio.md
│   ├── 04_Casos_de_Uso/
│   │   ├── CU-01_NombreCaso.md
│   │   ├── CU-02_NombreCaso.md
│   │   └── ...
│   ├── 05_Modelo_Analisis.md
│   ├── 06_Arquitectura.md
│   ├── 07_Modelo_Diseno.md
│   ├── 08_Modelo_Datos.md
│   ├── 09_Modelo_Despliegue.md
│   ├── 10_Plan_Pruebas.md
│   ├── 11_Casos_Prueba.md
│   ├── 12_Plan_Iteraciones.md
│   ├── 13_Riesgos.md
│   └── diagramas/
│       ├── casos_uso.png
│       ├── clases_dominio.png
│       ├── clases_diseno.png
│       ├── secuencia_CU01.png
│       ├── estados_pedido.png
│       ├── despliegue.png
│       └── ...
├── src/
├── tests/
├── README.md
└── ...
```

---

## FASE 1 — INICIO

### Paso 1.1. Documento de Visión

**Archivo**: `docs/01_Vision.md`

**Contenido mínimo**:

- Problema u oportunidad
- Stakeholders (quiénes y qué necesitan)
- Características clave del producto
- Objetivos de negocio
- Alcance (qué incluye y qué _no_ incluye)
- Restricciones técnicas / de negocio

### Paso 1.2. Glosario

**Archivo**: `docs/02_Glosario.md`

Lista de términos del dominio con definición clara y única.

### Paso 1.3. Identificar actores y casos de uso de alto nivel

**Archivo**: `docs/04_Casos_de_Uso/00_Modelo_CU.md`

- Listar **actores** y describirlos brevemente.
- Listar los **casos de uso** (nombre + descripción de 1 línea).
- Crear el **diagrama de casos de uso** general.
- Marcar los **casos de uso clave** (5–10%, los arquitectónicamente significativos).

### Paso 1.4. Esbozar arquitectura

**Archivo**: `docs/06_Arquitectura.md`

- Capas/módulos principales.
- Tecnología candidata (lenguaje, framework, BD, despliegue).
- Esbozo de **diagrama de despliegue** (cliente / servidor / BD).

### Paso 1.5. Análisis de riesgos inicial

**Archivo**: `docs/13_Riesgos.md`

| Id   | Riesgo | Impacto       | Probabilidad  | Mitigación | Estado  |
| ---- | ------ | ------------- | ------------- | ---------- | ------- |
| R-01 | ...    | Alto/Med/Bajo | Alta/Med/Baja | ...        | Abierto |

### Paso 1.6. Plan de iteraciones inicial

**Archivo**: `docs/12_Plan_Iteraciones.md`

Estimar:

- Número de iteraciones por fase.
- Casos de uso por iteración.
- Riesgos atacados en cada iteración.

### ✅ Hito de Inicio (LCO)

- [ ] Documento de visión revisado y aprobado.
- [ ] Modelo de casos de uso de alto nivel.
- [ ] Arquitectura candidata documentada.
- [ ] Lista de riesgos.
- [ ] Plan de iteraciones.
- [ ] Decisión: **¿Avanzar a Elaboración?**

---

## FASE 2 — ELABORACIÓN

### Paso 2.1. Modelo del negocio / dominio

**Archivo**: `docs/03_Modelo_Negocio.md`

- **Diagrama de clases del dominio** con entidades clave y relaciones.
- Si hay procesos de negocio: **diagrama de actividad** del proceso principal.

### Paso 2.2. Especificar casos de uso al ~80%

**Archivos**: uno por caso de uso en `docs/04_Casos_de_Uso/CU-XX_*.md`

Plantilla por caso de uso:

```markdown
# CU-XX: <nombre>

**Actor principal**:
**Actores secundarios**:
**Precondiciones**:
**Postcondiciones**:

## Flujo principal

1. ...
2. ...

## Flujos alternativos

- 3a. Si <cond> entonces ...

## Excepciones

- E1. ...

## Requisitos especiales

- Tiempo de respuesta: ...
- Seguridad: ...

## Frecuencia / volumen

- ...
```

### Paso 2.3. Modelo de análisis

**Archivo**: `docs/05_Modelo_Analisis.md`

- **Diagrama de clases de análisis** con `«boundary»`, `«control»`, `«entity»`.
- Por cada **caso de uso clave**: realización-análisis con **diagrama de comunicación** o **secuencia**.

### Paso 2.4. Modelo de diseño (vista arquitectónica)

**Archivo**: `docs/07_Modelo_Diseno.md`

- **Diagrama de paquetes/subsistemas** con capas.
- **Diagrama de clases de diseño** de los componentes arquitectónicos clave.
- Definición de interfaces principales.
- Decisiones de diseño documentadas (lenguaje, framework, ORM, etc.).

### Paso 2.5. Modelo de datos

**Archivo**: `docs/08_Modelo_Datos.md`

- **Diagrama Entidad-Relación** o **diagrama de clases de persistencia**.
- Esquema SQL inicial (si aplica).

### Paso 2.6. Modelo de despliegue

**Archivo**: `docs/09_Modelo_Despliegue.md`

- **Diagrama de despliegue** mostrando todos los nodos y comunicaciones.
- Componentes asignados a cada nodo.

### Paso 2.7. Línea base ejecutable de la arquitectura

Implementar un **esqueleto funcional** que:

- Atraviesa todas las capas.
- Implementa **al menos un caso de uso clave** end-to-end.
- Demuestra que la arquitectura es viable.

### Paso 2.8. Plan de pruebas inicial

**Archivo**: `docs/10_Plan_Pruebas.md`

- Estrategia, niveles, herramientas, criterios.

### ✅ Hito de Elaboración (LCA)

- [ ] ~80% de casos de uso especificados.
- [ ] Modelo de análisis completo (al menos para casos clave).
- [ ] Diagrama de clases de diseño arquitectónico.
- [ ] Modelo de datos.
- [ ] Diagrama de despliegue.
- [ ] **Línea base ejecutable** demostrable.
- [ ] Plan detallado de Construcción.
- [ ] Riesgos significativos mitigados.
- [ ] Decisión: **¿Comprometernos a Construcción?**

---

## FASE 3 — CONSTRUCCIÓN

Por **cada iteración** de Construcción:

### Paso 3.1. Planificar iteración

- Seleccionar casos de uso a implementar (priorizados por valor + riesgo).
- Definir criterios de éxito de la iteración.

### Paso 3.2. Refinar requisitos pendientes

Completar especificaciones de los casos de uso restantes.

### Paso 3.3. Refinar análisis y diseño

- Actualizar diagrama de clases de diseño.
- **Diagrama de secuencia detallado** por cada caso de uso de la iteración.
- **Diagrama de estados** para entidades con ciclo de vida.
- Diagrama de actividad para algoritmos complejos.

### Paso 3.4. Implementar

- Codificar siguiendo el diseño.
- Pruebas unitarias.
- Control de versiones disciplinado.

### Paso 3.5. Probar

- **Casos de prueba** por cada caso de uso (`docs/11_Casos_Prueba.md`).
- Pruebas de integración del incremento.
- Actualizar **matriz de trazabilidad**.

### Paso 3.6. Integrar e incrementar

- Build de la iteración.
- Pruebas de regresión.
- Demo funcional.

### Paso 3.7. Evaluar iteración

- ¿Se cumplieron los objetivos?
- ¿Qué riesgos se cerraron?
- ¿Qué se ajusta para la siguiente?

### ✅ Hito de Construcción (IOC)

- [ ] 100% de casos de uso implementados.
- [ ] Sistema integrado y funcional (versión beta).
- [ ] Manuales de usuario y administrador.
- [ ] Casos de prueba ejecutados con cobertura adecuada.
- [ ] Matriz de trazabilidad completa.
- [ ] Plan de transición / despliegue.

---

## FASE 4 — TRANSICIÓN

### Paso 4.1. Liberar versión beta

- Desplegar en entorno controlado.
- Distribuir a usuarios beta.

### Paso 4.2. Recoger y corregir defectos

- Sistema de reporte de bugs.
- Priorización: críticos → mayores → menores.

### Paso 4.3. Refinamientos

- Mejoras de usabilidad detectadas en la beta.
- Optimizaciones de rendimiento.

### Paso 4.4. Documentación final

- Manual de usuario definitivo.
- Manual de administrador / despliegue.
- Documento de instalación.
- Material de formación.

### Paso 4.5. Liberación final

- Empaquetado / contenedor / instalador.
- Plan de soporte y mantenimiento.

### ✅ Hito de Transición (PR)

- [ ] Producto release publicado.
- [ ] Documentación final entregada.
- [ ] Defectos críticos cerrados.
- [ ] Usuarios capacitados.
- [ ] Plan de mantenimiento activo.

---

## Tabla resumen de entregables por fase

| Entregable               |    Inicio     |  Elaboración  | Construcción  |  Transición   |
| ------------------------ | :-----------: | :-----------: | :-----------: | :-----------: |
| Documento de visión      |  ✅ inicial   |  ✅ refinado  |       –       |       –       |
| Glosario                 |  ✅ inicial   |  ✅ ampliado  |      ✅       |      ✅       |
| Diagrama de casos de uso | ✅ alto nivel |  ✅ completo  |      ✅       |       –       |
| Especificaciones de CU   |     ~20%      |     ~80%      |     100%      |       –       |
| Modelo del dominio       |   ✅ esbozo   |      ✅       |       –       |       –       |
| Diagrama clases análisis |       –       |      ✅       |      ✅       |       –       |
| Diagrama clases diseño   |       –       | ✅ vista arq. |  ✅ completo  |       –       |
| Diagrama secuencia       |       –       |   CU clave    |     todos     |       –       |
| Diagrama estados         |       –       | entidad clave |     todas     |       –       |
| Diagrama actividad       | proceso clave |       –       |  algoritmos   |       –       |
| Diagrama componentes     |       –       | ✅ vista arq. |      ✅       |       –       |
| Diagrama despliegue      |    esbozo     | ✅ vista arq. | ✅ definitivo | ✅ producción |
| Modelo de datos          |       –       |      ✅       |      ✅       |       –       |
| Plan de pruebas          |       –       |      ✅       |      ✅       |       –       |
| Casos de prueba          |       –       |     clave     |     todos     |       –       |
| Matriz trazabilidad      |       –       |   iniciada    |   completa    |   mantenida   |
| Código fuente            |       –       |   esqueleto   |   completo    |   refinado    |
| Manuales                 |       –       |       –       |    drafts     |    finales    |
| Plan de iteraciones      |    inicial    |   detallado   |  actualizado  |       –       |
| Lista de riesgos         |    inicial    |  actualizada  |  actualizada  |   residual    |

## Plantillas listas para copiar

### Plantilla de caso de uso

```markdown
# CU-XX: <Nombre del caso de uso>

| Campo               | Valor                         |
| ------------------- | ----------------------------- |
| ID                  | CU-XX                         |
| Actor principal     |                               |
| Actores secundarios |                               |
| Tipo                | Primario / Secundario         |
| Importancia         | Crítica / Alta / Media / Baja |
| Frecuencia          | Diaria / Semanal / Mensual    |

## Descripción breve

…

## Precondiciones

- …

## Postcondiciones

- …

## Flujo principal (escenario de éxito)

1. El <actor> …
2. El sistema …
3. …

## Flujos alternativos

- **3a.** Si … entonces …
  1. …

## Excepciones

- **E1.** Si … entonces …

## Requisitos especiales (no funcionales)

- Tiempo de respuesta: …
- Seguridad: …
- Disponibilidad: …

## Información asociada

- Datos de entrada: …
- Datos de salida: …

## Casos de prueba relacionados

- CT-XX, CT-XY
```

### Plantilla de caso de prueba

```markdown
# CT-XX: <Nombre>

| Campo       | Valor                                         |
| ----------- | --------------------------------------------- |
| ID          | CT-XX                                         |
| Caso de uso | CU-XX                                         |
| Tipo        | Funcional / Rendimiento / …                   |
| Nivel       | Unitaria / Integración / Sistema / Aceptación |
| Prioridad   | Alta / Media / Baja                           |

## Precondiciones

- …

## Datos de prueba

| Campo | Valor |
| ----- | ----- |
| …     | …     |

## Pasos

1. …
2. …

## Resultado esperado

…

## Criterio de aceptación

…
```

### Plantilla de riesgo

```markdown
| Id   | Riesgo | Impacto | Probabilidad | Exposición | Mitigación | Plan de contingencia | Responsable | Estado                   |
| ---- | ------ | ------- | ------------ | ---------- | ---------- | -------------------- | ----------- | ------------------------ |
| R-01 | …      | A/M/B   | A/M/B        | A×P        | …          | …                    | …           | Abierto/Mitigado/Cerrado |
```

## Consejos finales para proyectos universitarios

1. **No te ahogues en diagramas**. Haz los del [núcleo mínimo del catálogo](08_Diagramas_UML_Catalogo.md#4-núcleo-mínimo-recomendado-para-un-proyecto-universitario) bien hechos.
2. **La trazabilidad es lo que más impresiona** a los evaluadores: un caso de uso debe poderse rastrear hasta su clase, su código y su caso de prueba.
3. **Itera de verdad**. No hagas todo al final disfrazado de iteraciones.
4. **Documenta decisiones**, no solo resultados.
5. **El producto final = código + modelos + documentación**. Los tres pesan.
6. Si tienes 4 semanas: 1 sem. Inicio + Elaboración (con esqueleto), 2 sem. Construcción (2 iter.), 1 sem. Transición y entrega.

## Recursos

- [00. Índice](00_Indice.md)
- [01. Fundamentos](01_Fundamentos_Proceso_Unificado.md)
- [02. Ciclo de Vida y Fases](02_Ciclo_de_Vida_y_Fases.md)
- [Flujos 03 – 07](03_Flujo_Captura_Requisitos.md)
- [08. Catálogo de Diagramas](08_Diagramas_UML_Catalogo.md)
