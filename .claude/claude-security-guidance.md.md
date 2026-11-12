# Reglas de seguridad – API NestJS

## Autenticación y autorización
- Todo controller debe estar protegido por un AuthGuard global (APP_GUARD). Los endpoints públicos se marcan explícitamente con un decorator @Public().
- Validar JWT de Cognito verificando firma (JWKS), `iss`, `aud`/`client_id`, `token_use` y expiración. Nunca decodificar sin verificar.
- Los roles se validan con un RolesGuard + decorator @Roles(); nunca confiar en roles enviados en el body o query.
- Verificar ownership del recurso (que el usuario sea dueño del ID solicitado) para evitar IDOR.

## Validación de entrada
- ValidationPipe global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Todo input (body, params, query) usa DTOs con class-validator. Nada de `any` ni objetos sin tipar.
- Uploads de archivos (ej. PDFs): limitar tamaño, validar MIME real (no solo extensión) y nombre de archivo.

## Datos y consultas
- Prohibido construir queries (SQL, Mango/CouchDB, etc.) por interpolación de strings con input del usuario.
- No devolver entidades crudas: usar DTOs de respuesta / ClassSerializerInterceptor con @Exclude() en campos sensibles.

## Configuración HTTP
- Usar helmet, CORS con lista explícita de orígenes (nunca `*` con credenciales) y @nestjs/throttler en auth y endpoints costosos.
- Swagger deshabilitado o protegido en producción.

## Secretos y errores
- Secretos solo desde variables de entorno / secret manager, nunca hardcodeados ni logueados.
- Exception filter global que no exponga stack traces ni mensajes internos en producción.