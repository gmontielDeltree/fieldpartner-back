# CLAUDE.md — fieldpartner-back

Instrucciones para cualquier agente que trabaje en este backend (NestJS + Prisma + PostgreSQL).
Complementa el `CLAUDE.md` del workspace (`../CLAUDE.md`) y la guía de seguridad
`.claude/claude-security-guidance.md.md`, que es **obligatoria**.

El código (modelos, enums, carpetas, DTOs, nombres de métodos) va en **inglés**.
Los mensajes de error para el usuario final pueden ir en español.

---

## 1. Estructura de un módulo (referencia: `src/account/`)

```
src/<dominio>/
  <dominio>.module.ts         # importa PrismaModule; registra controller, service, repository, business
  <dominio>.controller.ts     # HTTP: rutas, guards, @Roles, ownership, parseo de params/query
  <dominio>.service.ts        # orquesta: 404s, delega en repository o business
  <dominio>.repository.ts     # ÚNICO lugar con acceso a Prisma para CRUD simple
  businessLogic/
    <dominio>.business.ts     # reglas de negocio multi-entidad, $transaction, integraciones (Cognito)
    <dominio>.business.spec.ts
  dto/
    create-<dominio>.dto.ts   # input, class-validator
    update-<dominio>.dto.ts   # PartialType(Create...) salvo campos inmutables
    <dominio>.dto.ts          # respuesta: interface + <DOMINIO>_SELECT (+ mapper toX() si hace falta)
```

Responsabilidad de cada capa:

| Capa | Hace | NO hace |
|---|---|---|
| Controller | Rutas, `@UseGuards(RolesGuard)`, `@Roles`, chequeo de ownership con `req.caller`, delega en el service | Lógica de negocio, acceso a Prisma |
| Service | Fachada: `findOne` + `NotFoundException`, delega CRUD en repository y reglas en business | Queries Prisma directas, llamadas a Cognito |
| Repository | Queries Prisma con `select` de respuesta | Reglas de negocio, excepciones HTTP |
| Business (`businessLogic/`) | Validaciones de negocio, `$transaction` sobre varias entidades, integraciones externas con acción compensatoria (ver `AccountBusiness.executeCreate`) | Manejo HTTP |

- **Cuándo hace falta `businessLogic/`:** si la operación toca más de una entidad, usa
  `$transaction`, llama a un servicio externo (Cognito, S3…) o tiene reglas según rol o categoría.
  Un catálogo con CRUD plano (country, crop, type-device…) puede omitirlo.
- **Prisma solo se inyecta en `*.repository.ts` y `businessLogic/*.business.ts`.**
  Un service que inyecta `PrismaService` es un error de estructura.
- Los errores de negocio usan `BusinessException` + `BusinessErrorCode`
  (`src/common/exceptions/business.exception.ts`). Los errores de Prisma (P2002 → 409,
  P2003 → 409/400, P2025 → 404) los traduce el `GlobalExceptionFilter`; no hace falta atraparlos
  a mano salvo para dar un mensaje más específico.
- Al agregar un módulo: registrarlo en `app.module.ts` y actualizar la lista de módulos del
  `CLAUDE.md` del workspace.

## 2. Seguridad — checklist por endpoint

El `JwtAuthGuard` es global (APP_GUARD): todo endpoint exige token salvo `@Public()`.
**Autenticado no significa autorizado.** Cada controller nuevo o modificado debe cumplir:

1. **Roles explícitos.** `@UseGuards(RolesGuard)` en el controller y `@Roles(...)` a nivel clase
   y/o método. Ningún endpoint de escritura queda sin `@Roles`.
   - **Catálogos globales** (country, category, crop, movement-type, input-type, licence-type,
     type-device y los futuros): lectura `GET` para usuarios autenticados; `POST`/`PATCH`/`DELETE`
     solo `@Roles(UserRole.GENERAL_ADMIN)`.
   - **Datos de una cuenta** (accounts, users, fields, deposits…): `GENERAL_ADMIN` ve todo;
     `ADMIN` y los usuarios comunes solo lo suyo.
2. **Ownership / IDOR.** Todo `:id` que pertenezca a una cuenta se valida contra
   `req.caller.accountId` (ver `AccountController.assertOwnership` y el scoping de
   `UsersService`). Los listados se filtran por cuenta en la query, no después.
3. **El rol y la cuenta salen de `req.caller`** (resuelto por `RolesGuard` desde la DB o desde
   claims firmados). Nunca del body, query ni headers. Los DTOs de input no aceptan `role`,
   `accountId` ni `isAdmin` salvo que el business los valide contra el caller.
4. **DTOs de input** con class-validator para body, params y query. Nada de `any`. El
   `ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`) rechaza campos desconocidos:
   el DTO es el contrato con el front.
5. **DTOs de respuesta.** No devolver entidades crudas: el repository usa `select` con la
   constante `<DOMINIO>_SELECT` del DTO de respuesta (patrón `LicenceTypeDto`,
   `AccountSummaryDto`, `AccountDetailDto`). Nunca exponer `cognitoId`, `activeSessionId`,
   tokens ni columnas internas.
6. **Unicidad.** `@unique` solo sobre una clave de negocio real. Un campo que clasifica (tipo,
   label, unidad) no es único. Caso real: `LicenceType.label` (C/L/H) se marcó `@unique` por
   error y hubo que revertirlo.
7. **Throttling** más estricto (`@Throttle`) en endpoints sensibles o costosos (auth, altas
   que llaman a Cognito).
8. **Secretos** solo desde env; nunca loguear tokens, passwords ni respuestas de Cognito.

## 3. Prisma

- `schema.prisma` es la fuente de verdad. Cambio de schema → migración nueva en
  `prisma/migrations/` (nunca editar una ya aplicada o pusheada) → `npm run prisma:generate`.
- Ids: `String @id @default(uuid())`, salvo catálogos existentes con `Int autoincrement`
  (`InputType`). El id lo genera la DB; el front no lo envía.
- Si un cambio afecta datos de referencia, actualizar `prisma/seed.sql` (idempotente,
  `ON CONFLICT`).

## 4. Tests y verificación

- Toda lógica en `businessLogic/` y toda regla de autorización (roles, scoping) lleva un
  `*.spec.ts`. Cognito siempre mockeado; los tests nunca tocan AWS.
- Antes de dar algo por terminado: `npm run build`, `npm test` y `npm run lint`.

## 5. Deuda conocida (pendiente de corregir)

Detectada en la revisión del 2026-11-19 (waves 1–3 del backoffice):

- **[ALTA] Catálogos sin `@Roles`.** `country`, `category`, `crop`, `movement-type`,
  `input-type`, `licence-type` y `type-device` permiten `POST`/`PATCH`/`DELETE` a **cualquier
  usuario autenticado** (incluido un usuario de Cat A desde `fieldpartner_front`). Aplicar la
  regla 2.1.
- **[MEDIA] El canal no se valida después del login.** El header `channel` solo se chequea al
  emitir el token (`/auth/login` y el completado de nueva contraseña). Un token obtenido por `fieldpartner_front` sirve igual contra endpoints del
  backoffice. Hoy lo mitiga 2.1 (roles); evaluar validar el canal también por request.
- **[MEDIA] `users/` no sigue la estructura.** `UsersService` inyecta `PrismaService` y
  `CognitoService` directamente (alta con Cognito + compensación, scoping, agrupado). Mover las
  queries a `users.repository.ts` y el alta/edición a `businessLogic/users.business.ts`.
- **[BAJA] Catálogos devuelven la entidad cruda** (incluye `createdAt`/`updatedAt`). Solo
  `licence-type` tiene DTO de respuesta. Aplicar la regla 2.5 al tocar cada módulo.
