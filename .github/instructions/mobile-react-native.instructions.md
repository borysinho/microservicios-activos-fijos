---
applyTo: "mobile/**,**/mobile/**,**/app-movil/**,**/react-native/**"
description: "Instrucciones para la App Móvil — React Native. Usar cuando se trabaje en la aplicación de campo para responsables de área, con cámara, GPS, modo offline e IA."
---

# App Móvil — React Native

**Tecnología**: React Native 0.85.x (requisito obligatorio de la cátedra)  
**Distribución**: Tiendas de aplicaciones (App Store / Google Play)  
**Orientada al trabajo de campo** de responsables de área — no es una réplica de la web.

## Recursos Nativos del Dispositivo (mínimo 3 requeridos)

| Recurso                  | Uso en el sistema                                                           |
| ------------------------ | --------------------------------------------------------------------------- |
| **Cámara**               | Fotografiar activos para diagnóstico automático de estado mediante IA (CNN) |
| **GPS**                  | Geolocalizar activos físicamente y registrar ubicación en inspecciones      |
| **Almacenamiento local** | Caché offline de activos asignados para trabajo sin conexión a internet     |

> Estos tres recursos son **obligatorios** según el docente. No omitir ninguno.

## Funcionalidades de la App

| Funcionalidad                     | Descripción                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------- |
| **Lista de activos asignados**    | Consulta de activos del usuario autenticado (REST → MS1)                        |
| **Diagnóstico IA por fotografía** | Tomar foto con cámara → enviar a MS2 → recibir estado del activo en tiempo real |
| **Geolocalización en mapa**       | Visualizar y registrar la ubicación física del activo con GPS                   |
| **Reporte de problemas**          | Solicitar revisión vía WhatsApp integrado o formulario (REST → MS3)             |
| **Notificaciones y alertas**      | Recibir notificaciones push desde MS3 (N8N)                                     |
| **Modo offline**                  | Caché local de activos asignados cuando no hay conexión a internet              |

## Integración con Microservicios

| Operación                      | Microservicio | Protocolo                  |
| ------------------------------ | ------------- | -------------------------- |
| Consultar activos asignados    | MS1           | REST                       |
| Diagnóstico de imagen con IA   | MS2           | REST (multipart/form-data) |
| Reporte de problema / revisión | MS3           | REST                       |

> La app móvil **no usa GraphQL**. Toda comunicación es REST.

## Endpoint Principal — Diagnóstico IA (Flujo completo)

```
POST https://<ms2-aws>/api/ia/diagnostico-imagen
Content-Type: multipart/form-data
Body:
  imagen: <archivo capturado con cámara>
  activoId: <uuid del activo>
  latitud: <coordenada GPS>
  longitud: <coordenada GPS>

Response:
{
  "estado": "deteriorado" | "bueno" | "requiere_mantenimiento" | "oxidado",
  "confianza": 0.92,
  "detalle": "Oxidación detectada en estructura lateral",
  "recomendacion": "Programar mantenimiento preventivo de inmediato"
}
```

## Flujo de Diagnóstico IA (Ejemplo 2)

1. Usuario selecciona activo de su lista
2. Pulsa "Diagnosticar con IA" → app activa la **cámara**
3. Se toma la fotografía → app obtiene coordenadas **GPS**
4. App comprime la imagen y envía a MS2 vía REST
5. MS2 procesa con CNN, guarda en S3 y DynamoDB
6. App muestra resultado: estado, confianza y recomendación
7. MS2 notifica a MS3 si el estado es crítico → MS3 genera orden de mantenimiento en MS1

## Modo Offline

- Al iniciar sesión, sincronizar lista de activos asignados a **almacenamiento local**
- Mostrar datos en caché si no hay conexión
- Marcar operaciones pendientes para sincronizar al recuperar conectividad
- No enviar diagnósticos de imagen sin conexión (requiere red activa)

## Variables de Entorno

```javascript
// config.js o .env
MS1_BASE_URL=https://<ms1-azure>/api
MS2_BASE_URL=https://<ms2-aws>/api
MS3_BASE_URL=https://<ms3-gcp>/api
```

No hardcodear URLs. Usar variables de entorno o un módulo de configuración centralizado.

## Permisos Nativos Requeridos

```xml
<!-- Android (AndroidManifest.xml) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- iOS (Info.plist) -->
NSCameraUsageDescription
NSLocationWhenInUseUsageDescription
NSPhotoLibraryUsageDescription
```

Solicitar permisos en tiempo de ejecución antes de usar cámara o GPS.
