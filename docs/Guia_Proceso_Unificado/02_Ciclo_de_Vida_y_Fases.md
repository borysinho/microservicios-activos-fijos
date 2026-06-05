# 02. Ciclo de Vida y Fases del Proceso Unificado

## 1. Estructura general

El ciclo de vida del UP se organiza en **ciclos**. Cada ciclo:

- Produce una **versión** del producto.
- Se compone de **cuatro fases**: Inicio, Elaboración, Construcción, Transición.
- Cada fase se subdivide en **iteraciones**.
- Cada iteración recorre los **cinco flujos de trabajo** y entrega un incremento.
- Cada fase termina con un **hito** que evalúa los artefactos y decide si se continúa.

![Vida del proceso: ciclos y fases](../Transcritos/Proceso%20Unificado%20-%20Rumbaugh%20Jacobson%20Booch/imagenes/ok-pdfcoffee.com_el-proceso-unificado-de-desarrollo-de-software-james-rumbaugh-ivar-jacobson-grady-booch-3-pdf-free.pdf-0034-07.png)

## 2. Mapa fase × flujo de trabajo

![Esfuerzo de los flujos de trabajo en cada fase](../Transcritos/Proceso%20Unificado%20-%20Rumbaugh%20Jacobson%20Booch/imagenes/ok-pdfcoffee.com_el-proceso-unificado-de-desarrollo-de-software-james-rumbaugh-ivar-jacobson-grady-booch-3-pdf-free.pdf-0037-04.png)

| Flujo \\ Fase  | Inicio | Elaboración | Construcción | Transición |
| -------------- | :----: | :---------: | :----------: | :--------: |
| Requisitos     |  ▓▓▓▓  |   ▓▓▓▓▓▓    |      ▓▓      |     ▒      |
| Análisis       |   ▓▓   |   ▓▓▓▓▓▓    |     ▓▓▓      |     ▒      |
| Diseño         |   ▒    |   ▓▓▓▓▓▓    |    ▓▓▓▓▓     |     ▒      |
| Implementación |   ▒    |     ▓▓▓     |   ▓▓▓▓▓▓▓▓   |     ▓▓     |
| Prueba         |   ▒    |     ▓▓      |   ▓▓▓▓▓▓▓    |    ▓▓▓     |

> El esfuerzo se distribuye desigualmente: los requisitos y arquitectura dominan al inicio; la implementación y prueba dominan al final.

## 3. Iteración genérica

Toda iteración, sin importar la fase, sigue el mismo patrón:

1. **Planificación de la iteración** — qué casos de uso y qué riesgos atacar.
2. **Captura de Requisitos** — refinar/añadir casos de uso.
3. **Análisis** — refinar el modelo de análisis.
4. **Diseño** — diseñar las realizaciones de los casos de uso.
5. **Implementación** — codificar componentes.
6. **Prueba** — verificar el incremento.
7. **Evaluación de la iteración** — ¿se cumplieron los objetivos? ¿qué riesgos persisten?

![Iteración genérica](../Transcritos/Proceso%20Unificado%20-%20Rumbaugh%20Jacobson%20Booch/imagenes/ok-pdfcoffee.com_el-proceso-unificado-de-desarrollo-de-software-james-rumbaugh-ivar-jacobson-grady-booch-3-pdf-free.pdf-0323-01.png)

---

## 4. Fase 1 — INICIO (Inception)

### 4.1. Objetivo

Establecer la **viabilidad** del sistema y su análisis de negocio. Decidir si se sigue adelante.

### 4.2. Pasos clave

1. **Delimitar el ámbito** del sistema y sus interfaces externas.
2. **Esbozar la arquitectura** (sin implementarla; demostrar que es creíble).
3. **Identificar riesgos críticos** y cómo mitigarlos.
4. **Demostrar valor** mediante un prototipo exploratorio (descartable).

### 4.3. Entregables principales

- Visión del producto (documento de visión)
- Modelo de casos de uso simplificado (~10–20% identificados, los más críticos)
- Modelo del negocio o del dominio inicial
- Esbozo de arquitectura candidata
- Lista inicial de riesgos
- Análisis de negocio / business case
- Plan inicial del proyecto
- Glosario inicial

### 4.4. Hito: Objetivos del Ciclo de Vida (LCO)

**Preguntas decisorias**:

- ¿Cuáles son las funciones principales para los usuarios más importantes?
- ¿Cómo podría ser la arquitectura?
- ¿Cuál es el plan y costo estimado del proyecto?

### 4.5. Diagramas UML típicos

- **Diagrama de casos de uso** (alto nivel, top 10–20%)
- **Diagrama de clases del dominio** (modelo conceptual)
- **Diagrama de paquetes** (esbozo arquitectónico)

---

## 5. Fase 2 — ELABORACIÓN (Elaboration)

### 5.1. Objetivo

**Construir la línea base de la arquitectura** y reducir los riesgos significativos. Estabilizar requisitos y plan para poder comprometerse con un contrato.

### 5.2. Pasos clave

1. Crear la **línea base ejecutable** de la arquitectura.
2. Identificar y mitigar los riesgos significativos.
3. Especificar **atributos de calidad** (rendimiento, fiabilidad, escalabilidad).
4. Capturar **~80% de casos de uso** con suficiente detalle para planificar Construcción.
5. Preparar planificación detallada, recursos y costo de la siguiente fase.

### 5.3. Entregables principales

- Modelo de casos de uso **detallado** (≥80% identificado, los críticos especificados completos)
- Modelo de análisis y modelo de diseño (vistas arquitectónicas)
- **Descripción de la arquitectura** (vistas de los modelos)
- **Línea base ejecutable de la arquitectura** (esqueleto operativo)
- Lista de riesgos actualizada
- Plan detallado de Construcción
- Manual de usuario preliminar

### 5.4. Hito: Arquitectura del Ciclo de Vida (LCA)

**Pregunta decisoria**: ¿Son los casos de uso, la arquitectura y el plan suficientemente estables, y los riesgos suficientemente controlados, para comprometerse al desarrollo completo?

### 5.5. Diagramas UML típicos

- Diagrama de casos de uso (completo)
- **Especificaciones detalladas** de casos de uso (flujos)
- **Diagrama de clases de análisis** (con frontera/control/entidad)
- **Diagrama de clases de diseño** (vista arquitectónica)
- **Diagrama de paquetes/subsistemas**
- **Diagrama de secuencia** o **comunicación** para realizaciones de casos de uso clave
- **Diagrama de estados** para entidades complejas
- **Diagrama de componentes** (vista arquitectónica)
- **Diagrama de despliegue** (vista arquitectónica)
- Modelo de datos (cuando aplica)

---

## 6. Fase 3 — CONSTRUCCIÓN (Construction)

### 6.1. Objetivo

Producir el **sistema completo**, preparado para entrega beta. Es la fase de mayor esfuerzo de codificación y prueba.

### 6.2. Pasos clave

1. Completar la captura de requisitos restantes.
2. Completar análisis y diseño de todos los casos de uso.
3. **Implementar y probar** todos los componentes.
4. Integrar el sistema iterativamente.
5. Preparar la versión beta.

### 6.3. Entregables principales

- Sistema software ejecutable (capacidad operativa inicial)
- Modelos completos (análisis, diseño, implementación, despliegue, prueba)
- Manuales de usuario y administración
- Plan de transición / despliegue
- Materiales de formación

### 6.4. Hito: Capacidad Operativa Inicial (IOC)

**Pregunta decisoria**: ¿Cubre el producto las necesidades de los usuarios suficientemente como para hacer una primera entrega beta?

### 6.5. Diagramas UML típicos

- **Diagrama de clases de diseño completo**
- **Diagramas de secuencia** de cada caso de uso relevante
- **Diagramas de estados** de entidades con vida compleja
- **Diagramas de actividad** para procesos complejos
- **Diagrama de componentes** completo
- **Diagrama de despliegue** completo
- **Modelo de datos** detallado (cuando aplica)

---

## 7. Fase 4 — TRANSICIÓN (Transition)

### 7.1. Objetivo

Llevar el producto a la **comunidad de usuarios**: beta → versión general.

### 7.2. Pasos clave

1. Liberar versión beta a un grupo reducido.
2. Recoger defectos y deficiencias.
3. Corregir, mejorar e integrar.
4. **Preparar manufactura**, despliegue, formación, soporte y línea de ayuda.
5. Versión general (release).

### 7.3. Entregables principales

- Producto **release** estable (instaladores, paquetes)
- Manuales finales
- Material de formación final
- Reporte de pruebas de aceptación
- Plan de mantenimiento

### 7.4. Hito: Liberación del Producto (PR)

**Pregunta decisoria**: ¿Cumple el producto las expectativas del cliente y está la organización lista para soportarlo?

### 7.5. Diagramas UML típicos

- Pocos diagramas nuevos. Se actualizan los existentes según defectos corregidos.
- **Diagrama de despliegue** definitivo (incluye configuración productiva).

---

## 8. Resumen comparativo de fases

| Aspecto                          | Inicio          | Elaboración                     | Construcción        | Transición                     |
| -------------------------------- | --------------- | ------------------------------- | ------------------- | ------------------------------ |
| **Pregunta clave**               | ¿Vale la pena?  | ¿Es viable arquitectónicamente? | ¿Está construido?   | ¿Está listo para los usuarios? |
| **Énfasis**                      | Visión, alcance | Arquitectura                    | Codificación        | Despliegue                     |
| **Riesgos**                      | Identificar     | Mitigar significativos          | Resolver residuales | De producción/operación        |
| **Iteraciones típicas**          | 1               | 1–2                             | 2–4                 | 1–2                            |
| **% casos de uso especificados** | 10–20%          | ~80%                            | 100%                | 100%                           |
| **Línea base**                   | Visión          | Arquitectura                    | Producto beta       | Producto release               |

## 9. Reglas prácticas para iteraciones

1. **Cada iteración produce algo ejecutable y demostrable** (aunque sea pequeño).
2. **Las iteraciones tempranas mitigan riesgos**; las tardías añaden funcionalidad.
3. **El orden de los casos de uso lo dicta el riesgo y la criticidad**, no la simpleza de codificación.
4. **Si una iteración falla**, se replanifica antes de continuar — no se acumulan deudas.
5. **Cada iteración termina con una evaluación**: estado de los riesgos, métricas, lecciones aprendidas.

## Próximo paso

→ [03. Flujo de Captura de Requisitos](03_Flujo_Captura_Requisitos.md)
