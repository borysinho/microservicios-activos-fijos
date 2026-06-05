# 06. Flujo de Trabajo: Implementación

> Capítulo 10 del libro: _Implementación_.

## 1. Propósito

Convertir el modelo de diseño en código ejecutable organizado en componentes. La implementación produce el **modelo de implementación**, que muestra los archivos fuente, librerías y ejecutables, y la correspondencia con las clases de diseño.

## 2. Trabajadores

| Trabajador                   | Responsabilidad                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| **Arquitecto**               | Estructura del modelo de implementación (vista arquitectónica) y plan de integración |
| **Ingeniero de componentes** | Implementa, prueba unitariamente y mantiene los componentes                          |
| **Integrador del sistema**   | Integra los componentes en builds sucesivos                                          |

## 3. Artefactos

| Artefacto                        | Descripción                                                      |
| -------------------------------- | ---------------------------------------------------------------- |
| **Modelo de implementación**     | Componentes y subsistemas de implementación                      |
| **Componente**                   | Archivo fuente, biblioteca, ejecutable, fichero de configuración |
| **Subsistema de implementación** | Agrupación física de componentes (paquete, módulo, librería)     |
| **Interfaces de componente**     | Operaciones expuestas y consumidas                               |
| **Plan de integración**          | Orden y dependencias de integración por incremento               |

## 4. Actividades del flujo

```mermaid
flowchart LR
  A[Implementación arquitectónica] --> B[Integrar el sistema]
  B --> C[Implementar un subsistema]
  C --> D[Implementar una clase]
  D --> E[Realizar prueba unitaria]
```

### 4.1. Implementación arquitectónica

- Identificar **componentes significativos arquitectónicamente** (binarios, librerías, ejecutables).
- Asignar componentes a **nodos** del modelo de despliegue.
- Definir el **plan de build/integración**.

### 4.2. Integrar el sistema

Estrategia incremental:

1. Definir los **builds** de la iteración (subsistemas a incorporar).
2. Integrar **de abajo hacia arriba** (capas inferiores primero) o **por casos de uso completos**.
3. Cada build debe **compilar y ejecutar** las pruebas existentes.
4. Resolver defectos antes de continuar.

### 4.3. Implementar un subsistema

- Implementar todos los componentes del subsistema.
- Verificar que satisface las **interfaces que ofrece**.
- Verificar dependencias hacia otros subsistemas.

### 4.4. Implementar una clase

- Implementar atributos, operaciones, asociaciones según el diseño.
- Aplicar las **convenciones de codificación** del proyecto.
- Mantener trazabilidad clase de diseño ↔ archivo(s) fuente.
- Adaptar nombres a las restricciones del lenguaje.

### 4.5. Realizar prueba unitaria

Cada clase/componente debe pasar pruebas unitarias **antes** de la integración.

- **Prueba de especificación** (caja negra): contra la interfaz.
- **Prueba estructural** (caja blanca): cobertura de caminos.
- **Prueba de rendimiento** unitario si aplica.

## 5. Tipos de componentes

| Tipo                                 | Ejemplos                                  |
| ------------------------------------ | ----------------------------------------- |
| **Componente de despliegue**         | `.exe`, `.jar`, `.dll`, contenedor Docker |
| **Componente de archivo de trabajo** | Archivo `.java`, `.cs`, `.py`, `.html`    |
| **Componente de ejecución**          | Objeto en memoria, instancia de servicio  |

## 6. Diagramas UML del flujo

| Diagrama                                       | Importancia | Cuándo                                  |
| ---------------------------------------------- | :---------: | --------------------------------------- |
| **Diagrama de componentes**                    |    ★★★★     | Sistemas con varios módulos/servicios   |
| **Diagrama de paquetes de implementación**     |     ★★★     | Para mostrar la organización del código |
| **Diagrama de despliegue** (con componentes)   |    ★★★★★    | Imprescindible para el "release"        |
| **Diagrama de actividad** del proceso de build |     ★★      | Solo si el proceso es complejo          |

## 7. Buenas prácticas

1. **Pequeños incrementos integrados frecuentemente** (idealmente CI/CD).
2. **Convenciones de código** acordadas y aplicadas con linters/formateadores.
3. **Trazabilidad mantenida**: cada artefacto de código se vincula con su clase/componente de diseño.
4. **Pruebas unitarias automatizadas** desde el inicio.
5. **Control de versiones disciplinado**: ramas por iteración o feature, revisiones de código.
6. **No optimizar prematuramente**: medir antes.

## 8. Reglas prácticas

- Si un componente **no tiene una clase de diseño** que justifique su existencia, revisar el diseño.
- Si una clase de diseño **no se traduce** en código, eliminarla del diseño o justificarla.
- Las **interfaces de componente** son la guía para integrar; respetarlas estrictamente.

## 9. Errores comunes

- ❌ Empezar a programar sin un diseño suficiente.
- ❌ Integración "Big Bang" al final de la fase.
- ❌ Componentes monolíticos sin interfaces claras.
- ❌ No automatizar pruebas unitarias.
- ❌ Saltar la prueba unitaria y descubrir defectos en pruebas de sistema.

## Próximo paso

→ [07. Flujo de Pruebas](07_Flujo_Pruebas.md)
