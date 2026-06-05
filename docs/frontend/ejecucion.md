# Frontend Web — Guía de Ejecución

**Tecnología**: Angular 21.2  
**Ubicación**: `frontend/`

---

## Requisitos Previos

| Herramienta | Versión mínima | Verificar con    |
| ----------- | -------------- | ---------------- |
| Node.js     | 22.x           | `node --version` |
| npm         | 11.x           | `npm --version`  |
| Angular CLI | 21.x           | `ng version`     |

Si Angular CLI no está instalado globalmente:

```bash
npm install -g @angular/cli
```

---

## 1. Instalar Dependencias

Desde la raíz del proyecto:

```bash
cd frontend
npm install
```

Esto instalará todas las dependencias declaradas en `package.json`, incluyendo:

- `apollo-angular` + `@apollo/client` — comunicación GraphQL con MS1
- `@angular/animations` — transiciones y animaciones de la UI

---

## 2. Configurar URLs de Microservicios

Editar `src/environments/environment.ts` con las URLs de los servicios en ejecución:

```typescript
export const environment = {
  production: false,
  ms1GraphqlUrl: "http://localhost:8081/graphql", // MS1 — Spring Boot
  ms2BaseUrl: "http://localhost:8000/api", // MS2 — FastAPI
  ms3BaseUrl: "http://localhost:3000/api", // MS3 — NestJS
};
```

> Para producción, las URLs definitivas se configuran en `environment.prod.ts`.

---

## 3. Ejecutar en Desarrollo

```bash
npm start
# equivalente a: ng serve
```

La aplicación estará disponible en `http://localhost:4200`.  
Los cambios en el código se reflejan automáticamente (live reload).

Para exponer en la red local (útil para pruebas desde otro dispositivo):

```bash
ng serve --host 0.0.0.0
```

---

## 4. Compilar para Producción

```bash
npm run build
# equivalente a: ng build
```

El output se genera en `dist/frontend/browser/`. Al compilar en modo producción:

- Se aplican las URLs de `environment.prod.ts`
- Se activa la optimización y minificación del código
- Se genera hashing de archivos para cache busting

---

## 5. Ejecutar Tests Unitarios

```bash
npm test
# equivalente a: ng test
```

---

## 6. Dependencias de los Microservicios

El frontend consume los tres microservicios. Para la experiencia completa deben estar activos:

| Microservicio            | Cómo levantarlo                       | Puerto por defecto |
| ------------------------ | ------------------------------------- | ------------------ |
| MS1 — Gestión de Activos | `cd ms1 && docker compose up -d`      | `8080`             |
| MS2 — Documentos e IA    | `cd ms2 && uvicorn main:app --reload` | `8000`             |
| MS3 — Automatización     | `cd ms3 && npm run start:dev`         | `3000`             |

> El frontend funciona parcialmente sin MS2 y MS3. Sin MS1 (GraphQL) no cargará ningún dato de activos.

---

## Estructura de Carpetas Relevante

```
frontend/src/
├── environments/
│   ├── environment.ts        ← URLs de desarrollo
│   └── environment.prod.ts   ← URLs de producción
└── app/
    ├── core/                 ← Guards, interceptors, servicios globales
    ├── shared/               ← Componentes, pipes y directivas reutilizables
    ├── features/             ← Un directorio por módulo funcional
    │   ├── activos/
    │   ├── documentos/
    │   ├── dashboard-bi/
    │   ├── auditoria/
    │   ├── machine-learning/
    │   ├── usuarios/
    │   └── auth/
    └── layout/               ← Navbar y sidebar compartidos
```
