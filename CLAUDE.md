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
     type-device, system, feature-module, menu-module y los futuros): lectura `GET` para usuarios autenticados; `POST`/`PATCH`/`DELETE`
     solo `@Roles(UserRole.GENERAL_ADMIN)`.
   - **Datos de una cuenta** (accounts, users, fields, deposits…): `GENERAL_ADMIN` ve todo;
     `ADMIN` y los usuarios comunes solo lo suyo.
2. **Ownership / IDOR.** Todo `:id` que pertenezca a una cuenta se valida contra
   `req.caller.accountId` (ver `AccountController.assertOwnership` y el scoping de
   `UsersService`). Los listados se filtran por cuenta en la query, no después.
   - **Datos por cuenta (patrón de referencia: `src/zone/`):** controller con
     `@UseGuards(RolesGuard)` + `@Roles(...ACCOUNT_DATA_ROLES)` a nivel clase (sin eso el guard
     no resuelve `req.caller`). Helpers en `src/auth/account-scope.ts`:
     `resolveTargetAccount(caller, query.accountId)` para listar/crear (GENERAL_ADMIN elige la
     cuenta con `?accountId=` — `AccountScopeQueryDto` —, el resto queda forzado a la suya y
     otra cuenta da 403) y `accountFilter(caller)` para get/patch/delete por id: el repository
     hace `findFirst({ id, accountId })` y otra cuenta da **404**. El `accountId` no va en los
     DTOs de input.
   - **Referencias a otras entidades de la cuenta** (`zoneId`, `fieldId`, `replacementId`…)
     se validan contra la misma cuenta en `businessLogic/` (ver `CampaignBusiness`); si no, se
     cuelga un registro de otra cuenta por id.
   - **Insumos de plataforma** (`Input.accountId = null`): los lee cualquier autenticado, solo
     GENERAL_ADMIN los escribe (`InputBusiness`).
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
7. **Canal.** Las operaciones de administración de plataforma (las que exigen
   `GENERAL_ADMIN`) llevan además `@Channels(Channel.Backoffice)`. El canal de un token sale
   de su `client_id` **firmado** (un app client de Cognito por frontend, ver `CognitoClients`
   y `ChannelGuard`), nunca del header `channel`: el header solo elige el app client al
   loguearse y nadie lo verifica después.
8. **Throttling** más estricto (`@Throttle`) en endpoints sensibles o costosos (auth, altas
   que llaman a Cognito).
9. **Secretos** solo desde env; nunca loguear tokens, passwords ni respuestas de Cognito.

## 3. Prisma

- `schema.prisma` es la fuente de verdad. Cambio de schema → migración nueva en
  `prisma/migrations/` (nunca editar una ya aplicada o pusheada) → `npm run prisma:generate`.
- Ids: `String @id @default(uuid())`, salvo catálogos existentes con `Int autoincrement`
  (`InputType`). El id lo genera la DB; el front no lo envía.
  **Única excepción:** `MenuModule.id` es un `Int` elegido por el admin (sin autoincrement)
  porque los permisos de usuario y el sidebar del front lo referencian; es inmutable (no está
  en el DTO de update).
- Nombres de modelo: no usar nombres que choquen con NestJS (`Module` → `FeatureModule`).
- Importación desde CouchDB: `scripts/` (fuera de la estructura de módulos, usan Prisma directo).
  `npm run import:couch-menus` trae system/modules/menu-modules: dry-run por defecto, `-- --apply`
  para escribir, idempotente; necesita `COUCHDB_URL` (y `COUCHDB_DB_SUFFIX=_stg` para staging).
- Si un cambio afecta datos de referencia, actualizar `prisma/seed.sql` (idempotente,
  `ON CONFLICT`).

### PostGIS (campos y lotes, KAN-65)

- La base necesita la extensión `postgis` (imagen local `postgis/postgis:16-3.5-alpine`; en
  staging/producción `CREATE EXTENSION` lo corre un superusuario / `rds_superuser`).
- `Field.geometry` y `Lot.geometry` son `geometry(MultiPolygon,4326)` declarados como
  `Unsupported(...)`: el cliente de Prisma **no puede leerlos ni escribirlos**, y tampoco
  `create` en esos modelos. Las escrituras y lecturas de geometría van con SQL a mano
  (`$queryRaw` con parámetros, nunca `$queryRawUnsafe` con strings armados) **solo en el
  repository**, normalizando: `ST_Multi(ST_Force2D(...))`, `ST_ForcePolygonCCW` (RFC 7946),
  `ST_ReducePrecision(..., 1e-7)`. Geometría inválida por API → 400 con `ST_IsValidReason`.
- `hectares` es una columna **generada** (`ST_Area(geometry::geography)/10000`, geodésica): no
  se escribe nunca; en el schema figura como `@default(dbgenerated(...))` para que Prisma no
  la vea como desfase. `declaredHectares` es la superficie catastral cargada a mano.
- La migración agrega cosas que `schema.prisma` no expresa: `CHECK` de geometría válida y no
  vacía, y el índice único parcial `lots_fieldId_layoutId_name_active_key`
  (`lower(name)` entre los no archivados). Si una migración generada con `migrate dev`
  propone borrarlos, es un error: sacarlo a mano.
- Las FK hacia `fields` y `lots` desde stock, salidas, movimientos, depósitos de granos,
  unidades productivas y gastos son `RESTRICT`: con referencias se archiva (`archivedAt`), no
  se borra.

## 4. Tests y verificación

- Toda lógica en `businessLogic/` y toda regla de autorización (roles, scoping) lleva un
  `*.spec.ts`. Cognito siempre mockeado; los tests nunca tocan AWS.
- Antes de dar algo por terminado: `npm run build`, `npm test` y `npm run lint` (0 warnings).
  Si `start:dev` está corriendo y `build` falla con `ENOTEMPTY` en `dist/`, usar
  `npx tsc --noEmit -p tsconfig.json`.

## 5. Deuda conocida (pendiente de corregir)

Detectada en la revisión del 2026-11-19 (waves 1–3 del backoffice):

- ~~**[ALTA] Catálogos sin `@Roles`.**~~ **Corregido (2026-11-19):** la escritura de los 7
  catálogos exige `GENERAL_ADMIN`; lo cubre `src/auth/catalog-roles.spec.ts`. Todo catálogo
  nuevo se agrega a ese spec.
- ~~**[MEDIA] `npm run lint` no funciona.**~~ **Corregido (2026-11-19):** `.eslintrc.js`
  (base NestJS + `@typescript-eslint/recommended`). Warnings llevados a 0 y `npm run lint` corre
  con `--max-warnings 0`: un warning nuevo rompe el lint. En specs se permite `any` (mocks).
- ~~**[MEDIA] El canal no se valida después del login.**~~ **Corregido en código
  (2026-11-19):** app client por canal + `ChannelGuard` global + `@Channels()`.
  **Pendiente de infraestructura:** crear en el user pool un app client por frontend y cargar
  `AWS_COGNITO_CLIENT_ID_<CANAL>`. Hasta entonces los tokens salen del client compartido, su
  canal es desconocido y `@Channels()` no se aplica (el guard lo avisa en el log).
- ~~**[A decidir] Quién puede entrar al backoffice.**~~ **Decidido y aplicado (2026-11-19):**
  solo `GENERAL_ADMIN` (`CHANNEL_ALLOWED_ROLES` en `channel.enum.ts`, chequeado al loguear).
- ~~**[MEDIA] `users/` no sigue la estructura.**~~ **Corregido (2026-11-19):** queries en
  `users.repository.ts`, alta/edición (Cognito + compensación, scoping por rol) en
  `businessLogic/users.business.ts`; el service quedó como fachada.
- ~~**[ALTA] IDOR en zones, deposits, campaigns e inputs.**~~ **Corregido (2026-11-20, KAN-64):**
  scoping por cuenta desde `req.caller`, `@Roles`, DTOs de respuesta y validación de referencias.
- ~~**[ALTA] `fields` y `field-lots` siguen sin `@Roles` ni scoping.**~~ **Mitigado
  (2026-11-24, KAN-65):** se eliminaron esos módulos junto con el modelo viejo. La API nueva
  de campos / layouts / lotes (con `@Roles` y scoping por cuenta) está pendiente dentro de KAN-65.
- **[BAJA] `accounts.accountReference`:** se sacó del schema en `746d42d` sin migración. Una
  base creada desde las migraciones conserva la columna, y `migrate diff` propone borrarla.
  Necesita su propia migración (no se mezcló con KAN-65).
- ~~**[BAJA] Catálogos devuelven la entidad cruda.**~~ **Corregido (2026-11-19):** los 7
  catálogos usan `<DOMINIO>_SELECT` + `<Model>Dto` (`Prisma.<Model>GetPayload`) en todas las
  queries del repository.
