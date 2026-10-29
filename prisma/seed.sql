-- =============================================================
-- FieldPartner — Seed Data
-- Run in: pgAdmin / DBeaver / TablePlus / psql
-- DB: fieldpartner_db
-- =============================================================

-- -------------------------
-- COUNTRIES
-- -------------------------
INSERT INTO countries (id, code, "descriptionES", "descriptionPT", "descriptionEN", language, currency, "taxKey", "taxKeyFormat", "createdAt", "updatedAt")
VALUES
  ('ctry-ar', 'AR', 'Argentina',  'Argentina',  'Argentina',  'es', 'ARS', 'CUIT', '##-########-#', NOW(), NOW()),
  ('ctry-py', 'PY', 'Paraguay',   'Paraguai',   'Paraguay',   'es', 'PYG', 'RUC',  '#######-#',     NOW(), NOW()),
  ('ctry-br', 'BR', 'Brasil',     'Brasil',     'Brazil',     'pt', 'BRL', 'CNPJ', '##.###.###/####-##', NOW(), NOW()),
  ('ctry-cl', 'CL', 'Chile',      'Chile',      'Chile',      'es', 'CLP', 'RUT',  '##.###.###-#',  NOW(), NOW()),
  ('ctry-uy', 'UY', 'Uruguay',    'Uruguai',    'Uruguay',    'es', 'UYU', 'RUT',  '##-######-#',   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- LICENCE TYPES
-- -------------------------
INSERT INTO licence_types (id, label, description, "systemType", "maximumUnitAllowed", "allowedUsersCount", "createdAt", "updatedAt")
VALUES
  ('ltype-c', 'C', 'Licencia Básica',    'BASIC',    1,  3,  NOW(), NOW()),
  ('ltype-l', 'L', 'Licencia Estándar',  'STANDARD', 5,  10, NOW(), NOW()),
  ('ltype-h', 'H', 'Licencia Profesional','PRO',     20, 50, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- CATEGORIES (catálogo global, sin accountId)
-- -------------------------
INSERT INTO categories (id, "idCategory", "descriptionES", "descriptionPT", "descriptionEN", "createdAt", "updatedAt")
VALUES
  ('cat-herb',  'HERBICIDE',    'Herbicida',       'Herbicida',       'Herbicide',       NOW(), NOW()),
  ('cat-fert',  'FERTILIZER',   'Fertilizante',    'Fertilizante',    'Fertilizer',      NOW(), NOW()),
  ('cat-insc',  'INSECTICIDE',  'Insecticida',     'Inseticida',      'Insecticide',     NOW(), NOW()),
  ('cat-fung',  'FUNGICIDE',    'Fungicida',       'Fungicida',       'Fungicide',       NOW(), NOW()),
  ('cat-seed',  'SEED',         'Semilla',         'Semente',         'Seed',            NOW(), NOW()),
  ('cat-adjuv', 'ADJUVANT',     'Adyuvante',       'Adjuvante',       'Adjuvant',        NOW(), NOW()),
  ('cat-other', 'OTHER',        'Otro',            'Outro',           'Other',           NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- INPUT TYPES
-- -------------------------
INSERT INTO input_types (code, "descriptionES", "descriptionPT", "descriptionEN", phytosanitary, "isCrop", "createdAt", "updatedAt")
VALUES
  ('HERBICIDE',      'Herbicida',          'Herbicida',          'Herbicide',          true,  false, NOW(), NOW()),
  ('FERTILIZER',     'Fertilizante',       'Fertilizante',       'Fertilizer',         false, false, NOW(), NOW()),
  ('INSECTICIDE',    'Insecticida',        'Inseticida',         'Insecticide',        true,  false, NOW(), NOW()),
  ('FUNGICIDE',      'Fungicida',          'Fungicida',          'Fungicide',          true,  false, NOW(), NOW()),
  ('SEED',           'Semilla',            'Semente',            'Seed',               false, true,  NOW(), NOW()),
  ('ADJUVANT',       'Adyuvante',          'Adjuvante',          'Adjuvant',           false, false, NOW(), NOW()),
  ('SEED_TREATMENT', 'Curasemillas',       'Tratamento de Semente','Seed Treatment',   true,  false, NOW(), NOW()),
  ('INOCULANT',      'Inoculante',         'Inoculante',         'Inoculant',          false, false, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- -------------------------
-- CROPS
-- -------------------------
INSERT INTO crops (id, "descriptionES", "descriptionPT", "descriptionEN", "cropType", variety, labors, prepared, sowing, application, germination, harvest, "createdAt", "updatedAt")
VALUES
  ('crop-soy',    'Soja',      'Soja',     'Soybean',    'OILSEED',    NULL, ARRAY[]::"Labor"[], false, true, true, true, true,  NOW(), NOW()),
  ('crop-corn',   'Maíz',      'Milho',    'Corn',       'CEREAL',     NULL, ARRAY[]::"Labor"[], true,  true, true, true, true,  NOW(), NOW()),
  ('crop-wheat',  'Trigo',     'Trigo',    'Wheat',      'GRAMINEAE',  NULL, ARRAY[]::"Labor"[], true,  true, true, true, true,  NOW(), NOW()),
  ('crop-sunf',   'Girasol',   'Girassol', 'Sunflower',  'OILSEED',    NULL, ARRAY[]::"Labor"[], true,  true, true, true, true,  NOW(), NOW()),
  ('crop-sorgh',  'Sorgo',     'Sorgo',    'Sorghum',    'CEREAL',     NULL, ARRAY[]::"Labor"[], true,  true, true, true, true,  NOW(), NOW()),
  ('crop-cotton', 'Algodón',   'Algodão',  'Cotton',     'TEXTILE',    NULL, ARRAY[]::"Labor"[], true,  true, true, true, true,  NOW(), NOW()),
  ('crop-peanut', 'Maní',      'Amendoim', 'Peanut',     'LEGUME',     NULL, ARRAY[]::"Labor"[], false, true, true, true, true,  NOW(), NOW()),
  ('crop-canola', 'Canola',    'Canola',   'Canola',     'OILSEED',    NULL, ARRAY[]::"Labor"[], true,  true, true, true, true,  NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- MOVEMENT TYPES (catálogo global)
-- -------------------------
INSERT INTO movement_types (id, name, description, "createdAt", "updatedAt")
VALUES
  ('mvt-buy',      'Compra',          'Ingreso por compra',            NOW(), NOW()),
  ('mvt-sale',     'Venta',           'Egreso por venta',              NOW(), NOW()),
  ('mvt-transfer', 'Transferencia',   'Movimiento entre depósitos',    NOW(), NOW()),
  ('mvt-adjust',   'Ajuste',          'Ajuste de inventario',          NOW(), NOW()),
  ('mvt-loss',     'Pérdida',         'Pérdida / merma',               NOW(), NOW()),
  ('mvt-return',   'Devolución',      'Devolución a proveedor',        NOW(), NOW()),
  ('mvt-app',      'Aplicación',      'Consumo por aplicación en lote',NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- Verificación rápida — ejecutar por separado para confirmar
-- =============================================================
 SELECT 'countries' AS tbl, COUNT(*) FROM countries
 UNION ALL SELECT 'licence_types', COUNT(*) FROM licence_types
 UNION ALL SELECT 'categories',    COUNT(*) FROM categories
 UNION ALL SELECT 'input_types',   COUNT(*) FROM input_types
 UNION ALL SELECT 'crops',         COUNT(*) FROM crops
 UNION ALL SELECT 'movement_types',COUNT(*) FROM movement_types;
