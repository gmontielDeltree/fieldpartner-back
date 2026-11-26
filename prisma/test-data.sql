-- =============================================================
-- FieldPartner — Datos de prueba ("fruta") para probar casuísticas del front
-- NO correr en producción. Requiere haber corrido antes prisma/seed.sql (países, tipos de
-- insumo, cultivos). Es idempotente: todo lo que crea tiene id 'fruta-...' y se puede
-- volver a correr o borrar con el bloque del final.
--
-- Uso: poner el id de la cuenta de prueba en la línea marcada (1) y correr el archivo
-- entero, por ejemplo:
--   psql -U postgres -d fieldpartner_db -v ON_ERROR_STOP=1 -f prisma/test-data.sql
-- (en pgAdmin / DBeaver: ejecutar el script completo).
--
-- Para sumar casos nuevos: agregar filas a las secciones de abajo con un id 'fruta-...'
-- y un comentario que diga qué casuística prueban.
-- =============================================================

BEGIN;

-- (1) Cuenta de prueba: las filas de la cuenta (insumos propios, depósitos) se cuelgan acá.
DROP TABLE IF EXISTS fruta_cuenta;
CREATE TEMP TABLE fruta_cuenta ON COMMIT DROP AS
SELECT a.id, a."countryCode", left(a.id, 8) AS tag
FROM accounts a
WHERE a.id = 'PEGAR-ACA-EL-ID-DE-LA-CUENTA';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM fruta_cuenta) THEN
    RAISE EXCEPTION 'test-data.sql: poner en (1) el id de una cuenta existente';
  END IF;
END $$;

-- -------------------------
-- INSUMOS DE PLATAFORMA (accountId NULL, isDefault): los ven todas las cuentas
-- -------------------------
-- Casos: filtro por país del usuario (AR ve los de AR y los sin país, no los de BR) y
-- alta de un insumo propio con el mismo nombre que uno de plataforma (se permite).
INSERT INTO inputs (id, "accountId", "countryId", name, brand, "unitMeasurement", "activePrincipal",
                    labors, "isDefault", "minimumDose", "maximumDose", "recommendedDose", "inputTypeId", "createdAt", "updatedAt")
SELECT v.id, NULL, c.id, v.name, v.brand, v.unit, v.active, v.labors::"Labor"[], true, v.min, v.max, v.rec, t.id, NOW(), NOW()
FROM (VALUES
  ('fruta-plat-glifo-ar',   'AR', 'Glifosato 66%',        'Genérico', 'l',  'Glifosato', '{APPLICATION}', 1.5, 3.0, 2.0, 'HERBICIDE'),
  ('fruta-plat-atrazina-ar','AR', 'Atrazina 90%',         'Genérico', 'kg', 'Atrazina',  '{APPLICATION}', 1.0, 2.5, 1.5, 'HERBICIDE'),
  ('fruta-plat-glifo-br',   'BR', 'Glifosato 48% (BR)',   'Genérico', 'l',  'Glifosato', '{APPLICATION}', 2.0, 4.0, 3.0, 'HERBICIDE'),
  ('fruta-plat-inoc',       NULL, 'Inoculante soja (todos los países)', 'Genérico', 'l', NULL, '{SOWING}', NULL, NULL, NULL, 'INOCULANT')
) AS v(id, country, name, brand, unit, active, labors, min, max, rec, type_code)
LEFT JOIN countries c ON c.code = v.country
LEFT JOIN input_types t ON t.code = v.type_code
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- INSUMOS DE LA CUENTA
-- -------------------------
-- Casos: semilla (tipo isCrop + cultivo + stock por lote), dosis y principio activo,
-- fertilizante con punto de reposición y cultivos de aplicación, tipos que antes no
-- existían (combustible, repuestos) y un insumo sin tipo (la UI no tiene que romperse).
INSERT INTO inputs (id, "accountId", "countryId", name, brand, "unitMeasurement", "activePrincipal", "stockByLot",
                    labors, "minimumDose", "maximumDose", "recommendedDose", "replenishmentPoint", "toxicityClass",
                    "inputTypeId", "cropId", "createdAt", "updatedAt")
SELECT 'fruta-' || f.tag || '-' || v.key, f.id, c.id, v.name, v.brand, v.unit, v.active, v.by_lot,
       v.labors::"Labor"[], v.min, v.max, v.rec, v.repl, v.tox, t.id, cr.id, NOW(), NOW()
FROM fruta_cuenta f
CROSS JOIN (VALUES
  ('soja',    'Soja DM 46i20',         'Don Mario', 'kg', NULL,        true,  '{SOWING}',             60.0, 80.0, 70.0, NULL,  NULL, 'SEED',        'Soja'),
  ('glifo',   'Glifosato 66%',         'Atanor',    'l',  'Glifosato', false, '{APPLICATION}',        1.5,  3.0,  2.0,  200,   'IV', 'HERBICIDE',   NULL),
  ('urea',    'Urea granulada',        'Profertil', 'kg', NULL,        false, '{SOWING,APPLICATION}', 50.0, 150.0, 100.0, 500, NULL, 'FERTILIZER',  NULL),
  ('gasoil',  'Gasoil',                'YPF',       'l',  NULL,        false, '{}',                   NULL, NULL, NULL, 1000,  NULL, 'FUEL',        NULL),
  ('cadena',  'Cadena de sembradora',  NULL,        'un', NULL,        false, '{}',                   NULL, NULL, NULL, NULL,  NULL, 'SPARE_PARTS', NULL),
  ('sintipo', 'Insumo sin tipo',       NULL,        NULL, NULL,        false, '{}',                   NULL, NULL, NULL, NULL,  NULL, NULL,          NULL)
) AS v(key, name, brand, unit, active, by_lot, labors, min, max, rec, repl, tox, type_code, crop_name)
LEFT JOIN countries c ON c.code = f."countryCode"
LEFT JOIN input_types t ON t.code = v.type_code
LEFT JOIN crops cr ON cr."descriptionES" = v.crop_name
ON CONFLICT (id) DO NOTHING;

-- Cultivos de aplicación (si los cultivos del seed no están, se saltean).
INSERT INTO input_crop_applications (id, "inputId", "cropId", "minDose", "maxDose", "suggestedDose")
SELECT 'fruta-' || f.tag || '-' || v.input_key || '-' || v.crop_key, i.id, cr.id, v.min, v.max, v.rec
FROM fruta_cuenta f
CROSS JOIN (VALUES
  ('soja', 'soja',  'Soja',  60.0, 80.0, 70.0),
  ('urea', 'maiz',  'Maíz',  100.0, 200.0, 150.0),
  ('urea', 'trigo', 'Trigo', 80.0, 120.0, 100.0)
) AS v(input_key, crop_key, crop_name, min, max, rec)
JOIN inputs i ON i.id = 'fruta-' || f.tag || '-' || v.input_key
JOIN crops cr ON cr."descriptionES" = v.crop_name
ON CONFLICT DO NOTHING;

-- -------------------------
-- DEPÓSITOS DE LA CUENTA
-- -------------------------
-- Casos: depósito con ubicaciones, silo bolsa, virtual y uno que admite stock negativo.
INSERT INTO deposits (id, "accountId", description, "countryCode", locality, province,
                      "isVirtual", "isNegative", "hasDeposit", "hasSiloBag", "siloBagId", "createdAt", "updatedAt")
SELECT 'fruta-' || f.tag || '-' || v.key, f.id, v.description, f."countryCode", v.locality, v.province,
       v.is_virtual, v.is_negative, v.has_deposit, v.has_silo_bag, v.silo_bag_id, NOW(), NOW()
FROM fruta_cuenta f
CROSS JOIN (VALUES
  ('dep-central',  'Depósito central',   'Pergamino', 'Buenos Aires', false, false, true,  false, NULL),
  ('dep-silobolsa','Silo bolsa lote 3',  'Pergamino', 'Buenos Aires', false, false, false, true,  'SB-0001'),
  ('dep-virtual',  'Depósito virtual',   NULL,        NULL,           true,  false, false, false, NULL),
  ('dep-negativo', 'Depósito negativo',  'Rojas',     'Buenos Aires', false, true,  true,  false, NULL)
) AS v(key, description, locality, province, is_virtual, is_negative, has_deposit, has_silo_bag, silo_bag_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO deposit_locations (id, "depositId", number, name)
SELECT 'fruta-' || f.tag || '-dep-central-' || v.number, 'fruta-' || f.tag || '-dep-central', v.number, v.name
FROM fruta_cuenta f
CROSS JOIN (VALUES ('1', 'Galpón 1'), ('2', 'Galpón 2')) AS v(number, name)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Qué quedó cargado
SELECT 'inputs' AS tabla, COUNT(*) FROM inputs WHERE id LIKE 'fruta-%'
UNION ALL SELECT 'input_crop_applications', COUNT(*) FROM input_crop_applications WHERE id LIKE 'fruta-%'
UNION ALL SELECT 'deposits', COUNT(*) FROM deposits WHERE id LIKE 'fruta-%'
UNION ALL SELECT 'deposit_locations', COUNT(*) FROM deposit_locations WHERE id LIKE 'fruta-%';

-- =============================================================
-- Borrar toda la fruta (descomentar y correr aparte). Si el front generó stock o
-- movimientos sobre estos insumos o depósitos, hay que borrarlos antes.
-- =============================================================
-- BEGIN;
-- DELETE FROM input_crop_applications WHERE id LIKE 'fruta-%' OR "inputId" LIKE 'fruta-%';
-- DELETE FROM inputs WHERE id LIKE 'fruta-%';
-- DELETE FROM deposit_locations WHERE "depositId" LIKE 'fruta-%';
-- DELETE FROM deposits WHERE id LIKE 'fruta-%';
-- COMMIT;
