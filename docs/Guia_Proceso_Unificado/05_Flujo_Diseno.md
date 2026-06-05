# 05. Flujo de Trabajo: Diseño

> Capítulo 9 del libro: _Diseño_.

## 1. Propósito

Llevar el modelo de análisis a una forma **implementable** considerando el lenguaje, plataforma, frameworks, requisitos no funcionales y restricciones del entorno. Define **cómo** se construirá el sistema.

Produce **dos modelos**:

- **Modelo de diseño**: estructura estática y dinámica orientada a objetos lista para programar.
- **Modelo de despliegue**: distribución de los componentes en los nodos físicos.

## 2. Trabajadores

| Trabajador                    | Responsabilidad                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------- |
| **Arquitecto**                | Estructura del modelo de diseño y modelo de despliegue (vistas arquitectónicas) |
| **Ingeniero de casos de uso** | Realiza cada caso de uso en el modelo de diseño                                 |
| **Ingeniero de componentes**  | Diseña clases y subsistemas                                                     |

## 3. Artefactos

| Artefacto                                  | Descripción                                                   |
| ------------------------------------------ | ------------------------------------------------------------- |
| **Subsistemas de diseño**                  | Agrupaciones cohesivas de clases (capas, frameworks, módulos) |
| **Clases de diseño**                       | Versión refinada e implementable de las clases                |
| **Interfaces**                             | Contratos entre subsistemas/clases                            |
| **Realizaciones de casos de uso – diseño** | Diagramas de secuencia detallados                             |
| **Modelo de despliegue**                   | Nodos, conexiones, asignación de componentes                  |

## 4. Estructura típica del modelo de diseño (capas)

```
+----------------------------+
| Capa específica de aplicación  |  <-- Lógica de negocio del sistema
+----------------------------+
| Capa general de aplicación     |  <-- Servicios reutilizables internos
+----------------------------+
| Capa intermedia (middleware)   |  <-- Frameworks, ORM, mensajería
+----------------------------+
| Capa de software del sistema   |  <-- SO, redes, BD
+----------------------------+
```

## 5. Actividades del flujo

```mermaid
flowchart LR
  A[Diseño arquitectónico] --> B[Diseñar un caso de uso]
  B --> C[Diseñar una clase]
  C --> D[Diseñar un subsistema]
```

### 5.1. Diseño arquitectónico

- Definir las **capas** y los **subsistemas** principales.
- Identificar **clases activas** (con hilo propio) y arquitectura de procesos.
- Identificar **componentes reutilizables** o productos a integrar.
- Definir **interfaces** entre subsistemas.
- Decidir **mecanismos comunes**: persistencia, transacciones, seguridad, logging, comunicación, manejo de errores.

### 5.2. Diseñar un caso de uso

Para cada caso de uso significativo, refinar la realización-análisis en una **realización-diseño**:

1. Identificar las **clases de diseño** participantes.
2. Construir **diagramas de secuencia detallados** mostrando los mensajes entre objetos (con firma exacta de operaciones).
3. Identificar requisitos sobre subsistemas y operaciones.

### 5.3. Diseñar una clase

Definir completamente cada clase:

- **Atributos** con tipos exactos.
- **Operaciones** con signaturas completas y visibilidad (`+`, `-`, `#`).
- **Estados** (si aplica) con un **diagrama de estados**.
- **Métodos** (algoritmo o referencia a implementación).
- **Relaciones** (asociación, agregación, composición, dependencia, generalización).

### 5.4. Diseñar un subsistema

- Definir las **interfaces** que ofrece.
- Garantizar el cumplimiento de las interfaces.
- Mantener cohesión interna y baja dependencia con otros subsistemas.

## 6. Modelo de despliegue

Define la topología física donde se ejecuta el sistema:

- **Nodos**: hardware (servidores, dispositivos) o entornos de ejecución (JVM, contenedores).
- **Conexiones**: protocolos de comunicación.
- **Componentes desplegados** en cada nodo.
- Consideraciones: rendimiento, alta disponibilidad, seguridad, distribución geográfica.

**Ejemplo (texto)**:

```
[Cliente Web] --HTTPS--> [Servidor Web] --TCP--> [Servidor App] --JDBC--> [Servidor BD]
```

## 7. Diagramas UML del flujo

| Diagrama                                            | Importancia | Cuándo                                               |
| --------------------------------------------------- | :---------: | ---------------------------------------------------- |
| **Diagrama de clases de diseño** (completo)         |    ★★★★★    | Siempre                                              |
| **Diagrama de secuencia** detallado por caso de uso |    ★★★★★    | Casos relevantes                                     |
| **Diagrama de paquetes/subsistemas**                |    ★★★★     | Sistemas medianos/grandes                            |
| **Diagrama de estados**                             |    ★★★★     | Entidades con ciclo de vida complejo                 |
| **Diagrama de comunicación**                        |     ★★★     | Alternativa a secuencia para mostrar relaciones      |
| **Diagrama de actividad**                           |     ★★★     | Algoritmos / lógica de negocio compleja              |
| **Diagrama de despliegue**                          |    ★★★★★    | Siempre que haya múltiples nodos                     |
| **Diagrama de tiempos**                             |      ★      | Sistemas en tiempo real                              |
| **Modelo Entidad-Relación / esquema BD**            |    ★★★★★    | Sistemas con persistencia (no es UML, pero acompaña) |

## 8. Patrones útiles a aplicar

- **Capas (Layers)** — separación de responsabilidades por nivel.
- **MVC / MVP / MVVM** — separación UI / lógica / datos.
- **Repository / DAO** — acceso a datos.
- **Fachada (Facade)** — simplifica interfaces de subsistemas.
- **Estrategia (Strategy)** — algoritmos intercambiables.
- **Observer** — notificación de cambios.
- **Singleton, Factory, Adapter** — según necesidad.

## 9. Decisiones de diseño típicas a documentar

| Decisión           | Ejemplo                     |
| ------------------ | --------------------------- |
| Lenguaje           | Java 17 / C# / Python       |
| Framework backend  | Spring Boot / .NET / Django |
| Framework frontend | React / Angular / Flutter   |
| Persistencia       | PostgreSQL + JPA/Hibernate  |
| Comunicación       | REST / GraphQL / gRPC       |
| Autenticación      | OAuth2 / JWT                |
| Despliegue         | Docker + Kubernetes / VM    |

## 10. Reglas prácticas

1. **Cada clase de análisis se refleja** en una o más clases de diseño (mantener trazabilidad).
2. Los **diagramas de secuencia** deben usar las **operaciones reales** de las clases de diseño.
3. Las **interfaces** son la herramienta principal para reducir acoplamiento entre subsistemas.
4. **No diseñar** lo que no será implementado pronto (YAGNI dentro del UP).
5. Las **decisiones de diseño** deben quedar **registradas** (no en la cabeza del arquitecto).

## 11. Errores comunes

- ❌ Saltar del análisis al código sin un modelo de diseño explícito.
- ❌ Diagramas de secuencia con operaciones que **no existen** en el diagrama de clases.
- ❌ Modelos de datos desconectados del modelo de diseño.
- ❌ Olvidar el modelo de despliegue.
- ❌ Capas con dependencias circulares.

## Próximo paso

→ [06. Flujo de Implementación](06_Flujo_Implementacion.md)
