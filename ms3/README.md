# MS3 - Automatizacion y Orquestacion

Microservicio NestJS + N8N para CU-67 a CU-74.

## Endpoints principales

- `GET /whatsapp/webhook`: verificacion inicial de WhatsApp Business API.
- `POST /whatsapp/webhook`: recibe mensajes entrantes y dispara el flujo de revision.
- `POST /webhooks/vencimiento-garantia`: alerta de garantia desde MS1.
- `POST /webhooks/mantenimiento-programado`: alerta de mantenimiento desde MS1.
- `POST /webhooks/diagnostico-critico`: alerta desde MS2 por diagnostico CNN critico.
- `POST /webhook/activos`: compatibilidad con el cliente actual de MS1.
- `GET /api/flujos`: estado de los 3 flujos para frontend.
- `POST /api/webhook/reportar-problema`: reporte desde mobile.

Los endpoints tambien estan disponibles con prefijo `/api` cuando el frontend o la app movil lo usan.

## Ejecutar local

```bash
npm install
npm run start:dev
```

En desarrollo, MS3 puede probar los flujos sin credenciales reales de Meta, SendGrid ni FCM. Si no configuras esas claves, los envios quedan en modo simulado y la respuesta indica el avance del flujo.

```bash
MS3_DEV_TOOLS_ENABLED=true npm run start:dev
```

## Probar funcionalidades en modo desarrollo

### 1. Ver que MS3 esta listo

```bash
curl -sS http://localhost:3000/api/dev/health
```

### 2. Probar flujo CU-67 a CU-72: WhatsApp -> MS1 -> MS2 -> email -> WhatsApp

Endpoint directo de simulacion:

```bash
curl -sS -X POST http://localhost:3000/api/dev/simular/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"from":"59170000000","text":"Solicito revision de ACT-2024-001"}'
```

Endpoint equivalente al webhook real de WhatsApp:

```bash
curl -sS -X POST http://localhost:3000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "59170000000",
            "timestamp": "1710000000",
            "text": { "body": "Solicito revision de ACT-2024-001" }
          }]
        }
      }]
    }]
  }'
```

Si MS1 no esta levantado o no encuentra el codigo, el flujo responde `Activo no encontrado`. Eso tambien valida el camino alternativo. Para validar el camino completo con ticket y documentos, levanta MS1/MS2 o usa las pruebas automatizadas.

### 3. Probar CU-73: alerta de vencimiento de garantia

```bash
curl -sS -X POST http://localhost:3000/api/dev/simular/vencimiento-garantia \
  -H "Content-Type: application/json" \
  -d '{}'
```

Endpoint real desde MS1:

```bash
curl -sS -X POST http://localhost:3000/webhooks/vencimiento-garantia \
  -H "Content-Type: application/json" \
  -d '{
    "activoId": "550e8400-e29b-41d4-a716-446655440000",
    "codigo": "ACT-2024-001",
    "nombre": "Laptop Dell",
    "fechaVencimientoGarantia": "2026-07-15",
    "responsableEmail": "responsable.area@activos.local",
    "responsablePhone": "59170000000",
    "responsableUsuarioId": "user-demo"
  }'
```

### 4. Probar CU-74: alerta de mantenimiento programado

```bash
curl -sS -X POST http://localhost:3000/api/dev/simular/mantenimiento-programado \
  -H "Content-Type: application/json" \
  -d '{}'
```

Endpoint real desde MS1:

```bash
curl -sS -X POST http://localhost:3000/webhooks/mantenimiento-programado \
  -H "Content-Type: application/json" \
  -d '{
    "activoId": "550e8400-e29b-41d4-a716-446655440001",
    "codigo": "ACT-2024-002",
    "nombre": "Impresora HP",
    "fechaMantenimiento": "2026-06-20",
    "responsableEmail": "responsable.area@activos.local",
    "responsablePhone": "59170000000",
    "responsableUsuarioId": "user-demo"
  }'
```

### 5. Probar alerta desde MS2 por diagnostico critico

```bash
curl -sS -X POST http://localhost:3000/api/dev/simular/diagnostico-critico \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 6. Ver estados de flujos para Angular

```bash
curl -sS http://localhost:3000/api/flujos
```

### 7. Probar contrato usado por la app movil

```bash
curl -sS -X POST http://localhost:3000/api/webhook/reportar-problema \
  -H "Content-Type: application/json" \
  -d '{
    "activoId": "550e8400-e29b-41d4-a716-446655440000",
    "activoCodigo": "ACT-2024-001",
    "descripcion": "Pantalla rota"
  }'
```

En emulador Android, la app movil usa `http://10.0.2.2:3000/api`, que apunta al `localhost` de tu maquina.

## Pruebas

```bash
npm test
npm run build
```

## N8N

Los workflows exportados estan en `n8n-workflows/`:

- `flujo_01_solicitud_revision.json`
- `flujo_02_alerta_garantia.json`
- `flujo_03_alerta_mantenimiento.json`

Para entorno local con N8N:

```bash
docker compose up --build
```
