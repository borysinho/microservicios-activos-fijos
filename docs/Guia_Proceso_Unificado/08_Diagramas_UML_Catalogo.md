# 08. Catálogo de Diagramas UML — Cuáles, Cuándo y con qué Prioridad

Este catálogo lista los diagramas UML 2.x relevantes para el Proceso Unificado, con una **prioridad práctica** para proyectos universitarios y profesionales medianos. No todos los diagramas son necesarios siempre; este catálogo te ayuda a decidir.

## Leyenda de prioridad

| Prioridad | Significado                                                    |
| --------- | -------------------------------------------------------------- |
| ★★★★★     | **Obligatorio** — sin él el proyecto no se entiende            |
| ★★★★      | **Muy recomendado** — en casi todos los proyectos no triviales |
| ★★★       | **Recomendado** según contexto                                 |
| ★★        | **Opcional** — solo si aporta claridad                         |
| ★         | **Raro** — solo en casos muy específicos                       |

---

## 1. Diagramas Estructurales

### 1.1. Diagrama de Casos de Uso ★★★★★

- **Propósito**: capturar requisitos funcionales como interacciones actor–sistema.
- **Cuándo**: desde Inicio. Refinado a lo largo del proyecto.
- **Flujo**: Captura de Requisitos.
- **Notas**: ir acompañado siempre de la **especificación textual** de cada caso de uso.

### 1.2. Diagrama de Clases (de dominio) ★★★★

- **Propósito**: vocabulario conceptual del problema.
- **Cuándo**: Inicio / Elaboración temprana.
- **Flujo**: Captura de Requisitos / Análisis.

### 1.3. Diagrama de Clases (de análisis) ★★★★★

- **Propósito**: estructura ideal de objetos con estereotipos `«boundary»`, `«control»`, `«entity»`.
- **Cuándo**: Elaboración.
- **Flujo**: Análisis.

### 1.4. Diagrama de Clases (de diseño) ★★★★★

- **Propósito**: estructura final implementable, con tipos, visibilidad, multiplicidades.
- **Cuándo**: Elaboración / Construcción.
- **Flujo**: Diseño.

### 1.5. Diagrama de Objetos ★★

- **Propósito**: instantánea con instancias concretas, mostrando una configuración.
- **Cuándo**: Solo si una configuración compleja es difícil de explicar con clases.

### 1.6. Diagrama de Paquetes ★★★★

- **Propósito**: organización lógica de clases en agrupaciones cohesivas.
- **Cuándo**: sistemas medianos/grandes; Análisis y Diseño.

### 1.7. Diagrama de Componentes ★★★★

- **Propósito**: organización física en módulos binarios, librerías, servicios.
- **Cuándo**: Diseño / Implementación.
- **Especialmente útil**: arquitecturas microservicios, sistemas con múltiples módulos.

### 1.8. Diagrama de Despliegue ★★★★★

- **Propósito**: distribución física: nodos, conexiones, componentes desplegados.
- **Cuándo**: Elaboración (vista arquitectónica) y Construcción (definitivo).
- **Imprescindible** si hay más de un nodo (cliente/servidor, web, móvil + backend).

### 1.9. Diagrama de Estructura Compuesta ★

- **Propósito**: estructura interna de una clase con sus partes y conectores.
- **Cuándo**: solo si la composición interna es compleja y crítica.

### 1.10. Diagrama de Perfiles ★

- **Propósito**: extender UML con estereotipos personalizados.
- **Cuándo**: definir un perfil de dominio específico (raro).

---

## 2. Diagramas de Comportamiento

### 2.1. Diagrama de Casos de Uso

(_ver 1.1_)

### 2.2. Diagrama de Actividad ★★★★

- **Propósito**: flujo de procesos, lógica de negocio, algoritmos.
- **Cuándo**:
  - Modelar **procesos del negocio** (Captura de Requisitos).
  - Detallar **flujos de casos de uso complejos** con muchas alternativas.
  - Mostrar **algoritmos** o lógica de validación compleja.

### 2.3. Diagrama de Estados (Statechart) ★★★★

- **Propósito**: ciclo de vida de una entidad con estados discretos y transiciones.
- **Cuándo**: entidades clave con estados (ej. _Pedido_: creado → confirmado → enviado → entregado → cancelado).
- **Flujo**: Análisis / Diseño.

### 2.4. Diagrama de Secuencia ★★★★★

- **Propósito**: interacción entre objetos en orden temporal.
- **Cuándo**: para **realizar cada caso de uso significativo**.
- **Flujo**: Análisis (alto nivel) y Diseño (detallado con operaciones reales).

### 2.5. Diagrama de Comunicación (antes "Colaboración") ★★★

- **Propósito**: misma información que secuencia pero enfatizando relaciones entre objetos.
- **Cuándo**: alternativa a secuencia. Útil cuando la red de objetos es lo importante.

### 2.6. Diagrama de Tiempos (Timing) ★

- **Propósito**: cambios de estado en función del tiempo.
- **Cuándo**: sistemas en tiempo real, embebidos.

### 2.7. Diagrama de Visión General de Interacción ★★

- **Propósito**: actividad cuyas acciones son interacciones (combina actividad + secuencia).
- **Cuándo**: visión de alto nivel del flujo entre interacciones.

---

## 3. Matriz: ¿Qué diagrama usar en cada flujo?

| Flujo \\ Diagrama  | C.Uso | Clase Dom. | Clase Anál. | Clase Dis. |  Paquete   | Compon. | Despl. | Secuencia | Comun. | Estado | Activ. |
| ------------------ | :---: | :--------: | :---------: | :--------: | :--------: | :-----: | :----: | :-------: | :----: | :----: | :----: |
| Captura Requisitos | ★★★★★ |    ★★★★    |      –      |     –      |    ★★★     |    –    |   –    |     –     |   –    |   –    |  ★★★★  |
| Análisis           |   –   |     –      |    ★★★★★    |     –      |    ★★★★    |    –    |   –    |   ★★★★    |  ★★★★  |   ★★   |   ★★   |
| Diseño             |   –   |     –      |      –      |   ★★★★★    |    ★★★★    |   ★★★   |  ★★★★  |   ★★★★★   |  ★★★   |  ★★★★  |  ★★★   |
| Implementación     |   –   |     –      |      –      | actualizar | actualizar |  ★★★★   |  ★★★★  |     –     |   –    |   –    |   ★★   |
| Prueba             |   –   |     –      |      –      |     –      |     –      |    –    |   –    |    ★★     |   –    |   –    |   ★★   |

## 4. Núcleo mínimo recomendado para un proyecto universitario

Si tu tiempo es limitado, prioriza este set **mínimo viable**:

1. **Diagrama de casos de uso** + especificaciones textuales. ★★★★★
2. **Diagrama de clases del dominio** (modelo conceptual). ★★★★
3. **Diagrama de clases de diseño** (con atributos y operaciones reales). ★★★★★
4. **Diagrama de secuencia** para los **3–5 casos de uso más importantes**. ★★★★★
5. **Diagrama de estados** para **una entidad** con ciclo de vida no trivial. ★★★★
6. **Diagrama de actividad** del **proceso principal del negocio**. ★★★★
7. **Diagrama de despliegue**. ★★★★★
8. **Diagrama de componentes** (si la arquitectura tiene varios módulos/servicios). ★★★★
9. **Modelo de datos / Entidad-Relación** (no es UML pero acompaña el diseño de BD). ★★★★★
10. **Matriz de trazabilidad** caso de uso ↔ casos de prueba. ★★★★★

## 5. Cuándo _no_ hacer un diagrama

- Si el sistema es trivial y un párrafo lo describe mejor.
- Si nadie va a leerlo ni mantenerlo (los diagramas son para comunicar).
- Si duplica información ya clara en otro diagrama.
- Si lo haces "porque toca" y no aporta decisiones.

> **Regla**: cada diagrama debe responder a una pregunta concreta. Si no responde a ninguna, fuera.

## 6. Herramientas recomendadas

| Herramienta                | Tipo                  | Notas                                          |
| -------------------------- | --------------------- | ---------------------------------------------- |
| **Visual Paradigm**        | Suite UML completa    | Versión Community gratis para estudiantes      |
| **StarUML**                | Suite UML             | Pago/trial                                     |
| **Enterprise Architect**   | Suite UML profesional | Estándar industrial                            |
| **Astah UML**              | UML educativo         | Buena opción universitaria                     |
| **draw.io / diagrams.net** | Genérico              | Gratis, web, fácil; suficiente para la mayoría |
| **PlantUML**               | UML como código       | Texto → diagrama; ideal para versión control   |
| **Mermaid**                | Diagramas en Markdown | Excelente para documentación inline            |
| **Lucidchart**             | Genérico online       | Buena colaboración                             |

## Próximo paso

→ [09. Plantilla y Hoja de Ruta del Proyecto](09_Plantilla_Proyecto.md)
