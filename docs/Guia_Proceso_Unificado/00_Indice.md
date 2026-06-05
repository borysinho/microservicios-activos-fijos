# Guía Práctica del Proceso Unificado (UP) — RUP/Jacobson, Booch, Rumbaugh

Esta serie de documentos sintetiza el libro **"El Proceso Unificado de Desarrollo de Software"** (Jacobson, Booch, Rumbaugh) en una guía operativa para desarrollar proyectos universitarios y profesionales aplicando esta metodología.

> Fuente base: [El Proceso Unificado de Desarrollo de Software.md](../Transcritos/Proceso%20Unificado%20-%20Rumbaugh%20Jacobson%20Booch/El%20Proceso%20Unificado%20de%20Desarrollo%20de%20Software.md)

## Las tres ideas clave del UP

El UP se sostiene sobre **tres pilares** que actúan como un taburete: si falta uno, el proceso cae.

1. **Dirigido por casos de uso** — los requisitos guían todo el proceso (análisis, diseño, implementación, pruebas).
2. **Centrado en la arquitectura** — la estructura del sistema se establece pronto y guía el desarrollo.
3. **Iterativo e incremental** — el sistema crece en mini-proyectos sucesivos que mitigan riesgos.

## Estructura de la guía

| #   | Documento                                                                | Propósito                                                   |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 01  | [Fundamentos del Proceso Unificado](01_Fundamentos_Proceso_Unificado.md) | Conceptos clave, las 4 P, modelos, artefactos, flujos       |
| 02  | [Ciclo de Vida y Fases](02_Ciclo_de_Vida_y_Fases.md)                     | Inicio, Elaboración, Construcción, Transición + iteraciones |
| 03  | [Flujo de Captura de Requisitos](03_Flujo_Captura_Requisitos.md)         | Modelo del negocio + modelo de casos de uso                 |
| 04  | [Flujo de Análisis](04_Flujo_Analisis.md)                                | Modelo de análisis: clases de análisis, realizaciones       |
| 05  | [Flujo de Diseño](05_Flujo_Diseno.md)                                    | Modelo de diseño + modelo de despliegue                     |
| 06  | [Flujo de Implementación](06_Flujo_Implementacion.md)                    | Modelo de implementación: componentes y código              |
| 07  | [Flujo de Pruebas](07_Flujo_Pruebas.md)                                  | Modelo de pruebas: casos y procedimientos                   |
| 08  | [Catálogo de Diagramas UML](08_Diagramas_UML_Catalogo.md)                | Qué diagramas usar, cuándo, y su prioridad                  |
| 09  | [Plantilla y Hoja de Ruta del Proyecto](09_Plantilla_Proyecto.md)        | Pasos concretos para desarrollar un proyecto                |

## Cómo usar esta guía

- **Primera vez con UP**: lee 01 → 02 → 09 → consulta 03–07 según el flujo activo.
- **Para un proyecto universitario**: salta directo a [09_Plantilla_Proyecto.md](09_Plantilla_Proyecto.md) y usa 08 como referencia rápida de diagramas.
- **Para entender qué entregar en cada fase**: usa la matriz de [02_Ciclo_de_Vida_y_Fases.md](02_Ciclo_de_Vida_y_Fases.md).
- **Para decidir si un diagrama es necesario**: revisa la tabla de prioridades en [08_Diagramas_UML_Catalogo.md](08_Diagramas_UML_Catalogo.md).

## Vista general del proceso

![Las cuatro fases y los cinco flujos de trabajo](../Transcritos/Proceso%20Unificado%20-%20Rumbaugh%20Jacobson%20Booch/imagenes/ok-pdfcoffee.com_el-proceso-unificado-de-desarrollo-de-software-james-rumbaugh-ivar-jacobson-grady-booch-3-pdf-free.pdf-0037-04.png)

_Las cuatro fases (Inicio, Elaboración, Construcción, Transición) recorren los cinco flujos de trabajo (Requisitos, Análisis, Diseño, Implementación, Prueba) con intensidades distintas._

## Glosario rápido

- **Artefacto**: cualquier producto del trabajo (modelo, diagrama, código, documento).
- **Modelo**: vista autocontenida del sistema (UML).
- **Flujo de trabajo (workflow)**: secuencia de actividades relacionadas que producen un resultado observable.
- **Iteración**: mini-proyecto que recorre todos los flujos y produce un incremento.
- **Incremento**: crecimiento medible del sistema producido por una iteración.
- **Hito**: punto al final de cada fase donde se evalúan los artefactos para decidir continuar.
- **Línea base de la arquitectura**: versión ejecutable mínima que prueba que la arquitectura funciona (al final de Elaboración).
- **Trabajador**: rol (no persona) responsable de actividades — analista, arquitecto, diseñador, etc.
