# 07. Flujo de Trabajo: Prueba

> Capítulo 11 del libro: _Prueba_.

## 1. Propósito

Verificar que el sistema **realiza lo especificado por los casos de uso** y cumple los requisitos no funcionales. La prueba en UP no es una fase final: empieza en Elaboración y se intensifica en Construcción y Transición.

## 2. Trabajadores

| Trabajador                              | Responsabilidad                               |
| --------------------------------------- | --------------------------------------------- |
| **Diseñador de pruebas**                | Diseña casos y procedimientos de prueba       |
| **Ingeniero de componentes**            | Implementa pruebas unitarias y de componentes |
| **Ingeniero de pruebas de integración** | Ejecuta pruebas de integración                |
| **Ingeniero de pruebas de sistema**     | Ejecuta pruebas de sistema y de aceptación    |

## 3. Artefactos

| Artefacto                   | Descripción                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------- |
| **Modelo de pruebas**       | Conjunto de casos y procedimientos de prueba                                        |
| **Caso de prueba**          | Conjunto de entradas, condiciones y resultados esperados que verifican un requisito |
| **Procedimiento de prueba** | Pasos para ejecutar uno o más casos                                                 |
| **Componente de prueba**    | Código que automatiza un caso de prueba                                             |
| **Plan de prueba**          | Estrategia, recursos, calendario, criterios de aceptación                           |
| **Defectos**                | Reportes de fallos detectados                                                       |
| **Evaluación de la prueba** | Métricas: cobertura, fiabilidad, tasa de defectos                                   |

## 4. Niveles de prueba

| Nivel           | Qué verifica                                 | Quién                           |
| --------------- | -------------------------------------------- | ------------------------------- |
| **Unitaria**    | Una clase/operación aislada                  | Ingeniero de componentes        |
| **Componente**  | Un componente con sus dependencias mockeadas | Ingeniero de componentes        |
| **Integración** | Varios subsistemas trabajando juntos         | Ingeniero de integración        |
| **Sistema**     | El sistema completo contra los casos de uso  | Ingeniero de pruebas de sistema |
| **Aceptación**  | Validación con el cliente                    | Cliente / Usuarios              |

## 5. Tipos de prueba

- **Funcional** — verifica casos de uso (¿hace lo que debe?)
- **Rendimiento** — tiempo de respuesta, throughput
- **Carga / estrés** — comportamiento bajo volumen alto
- **Fiabilidad** — operación continua sin fallos
- **Seguridad** — autenticación, autorización, datos
- **Usabilidad** — experiencia del usuario
- **Instalación / configuración** — distintos entornos
- **Regresión** — que cambios nuevos no rompen lo viejo

## 6. Actividades del flujo

```mermaid
flowchart LR
  A[Planificar prueba] --> B[Diseñar prueba]
  B --> C[Implementar prueba]
  C --> D[Ejecutar prueba]
  D --> E[Evaluar prueba]
```

### 6.1. Planificar prueba

Definir alcance, niveles, recursos y criterios de éxito de cada iteración.

### 6.2. Diseñar prueba

**Cada caso de uso da origen a uno o más casos de prueba**:

- **Caso de prueba del flujo principal**: el escenario de éxito.
- **Casos de prueba para cada flujo alternativo y excepción**.
- **Casos de prueba de límite** (valores extremos, vacíos, máximos).

Plantilla:

```
Caso de prueba: CT-<id>
Caso de uso asociado: <nombre>
Precondiciones: <estado del sistema antes>
Datos de entrada: <valores>
Pasos:
  1. ...
Resultado esperado: <lo que debe ocurrir>
Criterio de aceptación: <pass/fail>
```

### 6.3. Implementar prueba

Automatizar los casos de prueba siempre que sea posible: JUnit, NUnit, pytest, Selenium, Cypress, JMeter, etc.

### 6.4. Ejecutar prueba

Ejecutar los casos planificados, registrar resultados y defectos.

### 6.5. Evaluar prueba

Calcular métricas:

- **Cobertura** de casos de uso (% de casos de uso probados)
- **Cobertura de código** (líneas, ramas)
- **Tasa de defectos** por iteración
- **Defectos abiertos / cerrados / críticos**
- **Tiempo medio entre fallos** (MTBF)

## 7. Diagramas UML del flujo

| Diagrama                                                   | Importancia | Cuándo                           |
| ---------------------------------------------------------- | :---------: | -------------------------------- |
| **Tabla de casos de prueba** (no es UML)                   |    ★★★★★    | Siempre                          |
| **Diagrama de actividad** del procedimiento de prueba      |     ★★      | Procedimientos complejos         |
| **Diagrama de secuencia** ilustrando interacción de prueba |      ★      | Pruebas de integración complejas |
| **Matriz de trazabilidad** caso de uso ↔ caso de prueba    |    ★★★★★    | Imprescindible                   |

## 8. Matriz de trazabilidad (ejemplo)

| Caso de uso           | Casos de prueba            | Cobertura |
| --------------------- | -------------------------- | --------- |
| CU-01 Iniciar sesión  | CT-01, CT-02, CT-03        | 100%      |
| CU-02 Sacar dinero    | CT-04, CT-05, CT-06, CT-07 | 100%      |
| CU-03 Consultar saldo | CT-08                      | 100%      |

## 9. Buenas prácticas

1. **Pruebas automáticas** desde el primer día.
2. **Tests primero** o al menos junto con el código (TDD opcional pero recomendado).
3. **Pruebas de regresión** ejecutadas en cada build.
4. **Independencia** del equipo de pruebas de sistema respecto al de implementación.
5. **Datos de prueba** controlados y reproducibles.
6. Las **pruebas de aceptación** las define el cliente desde Requisitos.

## 10. Errores comunes

- ❌ Empezar a probar al final del proyecto.
- ❌ No automatizar y depender de pruebas manuales repetidas.
- ❌ No probar flujos alternativos ni excepciones.
- ❌ No registrar defectos formalmente.
- ❌ Considerar "completado" lo que solo pasa el flujo principal.

## Próximo paso

→ [08. Catálogo de Diagramas UML](08_Diagramas_UML_Catalogo.md)
