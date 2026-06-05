# 01. Fundamentos del Proceso Unificado

## 1. ¿Qué es el Proceso Unificado?

El **Proceso Unificado (UP)** es un _marco de trabajo genérico_ para el desarrollo de software que:

- Está **basado en componentes** interconectados a través de interfaces bien definidas.
- Utiliza **UML** (Unified Modeling Language) para todos los esquemas del sistema.
- Es **dirigido por casos de uso**, **centrado en la arquitectura** e **iterativo e incremental**.
- Puede **especializarse** para diferentes tipos de organizaciones, áreas de aplicación y tamaños de proyecto.

> Un proceso de desarrollo de software es el conjunto de actividades necesarias para transformar los requisitos de un usuario en un sistema software.

## 2. Las tres ideas clave (los tres pilares)

### 2.1. Dirigido por casos de uso

- Un **caso de uso** es un fragmento de funcionalidad del sistema que proporciona al usuario un resultado importante.
- Los casos de uso representan los **requisitos funcionales**.
- El conjunto completo de casos de uso forma el **modelo de casos de uso**, que responde: _¿Qué debe hacer el sistema para cada usuario?_
- Los casos de uso **guían**: análisis → diseño → implementación → prueba (son el hilo conductor).

### 2.2. Centrado en la arquitectura

- La arquitectura es la **forma** del sistema; los casos de uso son la **función**. Ambos evolucionan en paralelo.
- La arquitectura recoge los aspectos **estáticos y dinámicos más significativos**.
- Está influida por: plataforma, sistemas heredados, requisitos no funcionales, bloques reutilizables.
- Los **casos de uso clave** (5–10% del total) son los que dirigen la elaboración de la arquitectura.
- El arquitecto:
  1. Crea un esquema en borrador independiente de los casos de uso (plataforma, frameworks).
  2. Trabaja sobre los casos de uso clave y los realiza con subsistemas, clases y componentes.
  3. Itera hasta que la arquitectura sea **estable**.

### 2.3. Iterativo e incremental

- Cada iteración es un **mini-proyecto** que recorre todos los flujos de trabajo.
- Cada iteración produce un **incremento** (crecimiento del producto).
- La selección de qué hacer en una iteración depende de:
  1. Un grupo de **casos de uso** que amplía la utilidad del producto.
  2. Los **riesgos más importantes** que aún quedan por mitigar.

**Beneficios**: reduce coste del riesgo, evita retrasos por sorpresas tardías, permite aprendizaje temprano, acomoda requisitos cambiantes.

## 3. Las cuatro "P" del desarrollo

> _Personas, Proyecto, Producto, Proceso_

### 3.1. Personas

Son decisivas. El proceso debe **convertir "recursos" en "trabajadores"** con roles claros. Un trabajador es un _rol_, no necesariamente una persona; una persona puede asumir varios roles.

### 3.2. Proyecto

Construye el producto. Tiene un calendario, un presupuesto, un equipo y se gestiona mediante iteraciones planificadas.

### 3.3. Producto

**Más que código**. Un sistema software es un conjunto de artefactos:

- Código fuente y ejecutable
- Casos de uso y especificaciones no funcionales
- Modelos UML (análisis, diseño, despliegue, implementación, prueba)
- Manuales y documentación
- Casos de prueba

### 3.4. Proceso

Plantilla que guía al proyecto. Define **flujos de trabajo** (secuencias de actividades) que pueden especializarse para diferentes contextos.

## 4. Los cinco modelos del Proceso Unificado

![Modelos del Proceso Unificado y sus dependencias](../Transcritos/Proceso%20Unificado%20-%20Rumbaugh%20Jacobson%20Booch/imagenes/ok-pdfcoffee.com_el-proceso-unificado-de-desarrollo-de-software-james-rumbaugh-ivar-jacobson-grady-booch-3-pdf-free.pdf-0035-08.png)

| Modelo             | Propósito                                                       | Elementos principales                                     |
| ------------------ | --------------------------------------------------------------- | --------------------------------------------------------- |
| **Casos de uso**   | Captura los requisitos funcionales                              | Actores, casos de uso, relaciones                         |
| **Análisis**       | Refina los casos de uso, asigna funcionalidad inicial a objetos | Clases de análisis (frontera, control, entidad), paquetes |
| **Diseño**         | Define la estructura estática y la realización dinámica         | Subsistemas, clases de diseño, interfaces, colaboraciones |
| **Despliegue**     | Distribuye los componentes en los nodos físicos                 | Nodos, conexiones, componentes desplegados                |
| **Implementación** | Refleja el código fuente y los componentes binarios             | Componentes, subsistemas de implementación                |
| **Prueba**         | Verifica que el sistema implementa los casos de uso             | Casos de prueba, procedimientos de prueba                 |

> Adicionalmente, suele existir un **modelo del dominio** o **modelo del negocio** que describe el contexto.

**Trazabilidad**: los elementos están enlazados — un caso de uso → realización en diseño → caso de prueba.

## 5. Los cinco flujos de trabajo fundamentales

| Flujo                     | Pregunta que responde                | Modelo principal                 |
| ------------------------- | ------------------------------------ | -------------------------------- |
| **Captura de Requisitos** | ¿Qué debe hacer el sistema?          | Casos de uso (+ negocio/dominio) |
| **Análisis**              | ¿Cómo se estructura idealmente?      | Análisis                         |
| **Diseño**                | ¿Cómo se implementará concretamente? | Diseño + Despliegue              |
| **Implementación**        | ¿Cómo es el código?                  | Implementación                   |
| **Prueba**                | ¿Funciona correctamente?             | Prueba                           |

Cada flujo está descrito en detalle en los documentos 03 a 07.

## 6. Estructura de un flujo de trabajo

Cada flujo de trabajo se describe mediante:

- **Trabajadores** (roles): analista del sistema, arquitecto, ingeniero de casos de uso, diseñador, etc.
- **Artefactos** que produce o consume.
- **Actividades**: pasos concretos, descritos a menudo con un diagrama de actividad.
- **Flujo entre actividades**: cuándo se hace qué.

## 7. Herramientas

El UP recomienda herramientas para:

- Modelado visual UML (ej. Enterprise Architect, Visual Paradigm, StarUML, draw.io)
- Gestión de requisitos y trazabilidad
- Control de versiones y configuración
- Generación de código y prueba automatizada

> El proceso dirige las herramientas, no al revés.

## 8. Diferencias clave con SCRUM (perspectiva universitaria)

| Aspecto       | Proceso Unificado                                          | Scrum                                             |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| Naturaleza    | Proceso **prescriptivo** (define artefactos, roles, fases) | Marco **ágil** ligero                             |
| Documentación | Extensa (modelos UML formales)                             | Mínima                                            |
| Roles         | Múltiples (arquitecto, analista, diseñador, etc.)          | Tres (PO, SM, equipo)                             |
| Iteraciones   | Largas (semanas/meses), distintas por fase                 | Sprints uniformes (2–4 sem.)                      |
| Arquitectura  | Centro del proceso, definida temprano                      | Emerge                                            |
| Adecuado para | Proyectos medianos/grandes, sistemas críticos              | Proyectos pequeños/medianos, requisitos volátiles |

> **Por eso** muchos cursos universitarios prefieren UP: los entregables son verificables y el proceso completo es trazable.

## Próximo paso

→ [02. Ciclo de Vida y Fases](02_Ciclo_de_Vida_y_Fases.md)
