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
-- SYSTEMS (productos FieldPartner a los que pertenecen licencias y menús)
-- -------------------------
INSERT INTO systems (id, code, name, version, "technicalDetails", "createdAt", "updatedAt")
VALUES
  ('sys-basic',    'BASIC',    'BASIC',    NULL, NULL, NOW(), NOW()),
  ('sys-standard', 'STANDARD', 'STANDARD', NULL, NULL, NOW(), NOW()),
  ('sys-pro',      'PRO',      'PRO',      NULL, NULL, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- -------------------------
-- LICENCE TYPES
-- label = unidad de licenciamiento: C = Campo, L = Licencia, H = Hectárea (ver useLicences en el BO).
-- "systemId" se resuelve por code: los sistemas pueden venir de la migración con otro id.
-- -------------------------
INSERT INTO licence_types (id, label, description, "systemId", "maximumUnitAllowed", "allowedUsersCount", "createdAt", "updatedAt")
SELECT v.id, v.label, v.description, s.id, v.max_units, v.users, NOW(), NOW()
FROM (VALUES
  ('ltype-c', 'C', 'Licencia por campo',    'BASIC',    1,  3),
  ('ltype-l', 'L', 'Licencia única',        'STANDARD', 5,  10),
  ('ltype-h', 'H', 'Licencia por hectárea', 'PRO',      20, 50)
) AS v(id, label, description, system_code, max_units, users)
LEFT JOIN systems s ON s.code = v.system_code
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- CATEGORIES (catálogo global, sin accountId)
-- -------------------------
INSERT INTO categories (id, "categoryType", "descriptionES", "descriptionPT", "descriptionEN", "createdAt", "updatedAt")
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
  ('INOCULANT',      'Inoculante',         'Inoculante',         'Inoculant',          false, false, NOW(), NOW()),
  -- Tipos que el front tenía en CouchDB y el catálogo no (KAN-70).
  ('SPARE_PARTS',    'Repuestos',          'Peças de reposição', 'Spare parts',        false, false, NOW(), NOW()),
  ('MATERIALS',      'Materiales',         'Materiais',          'Materials',          false, false, NOW(), NOW()),
  ('FUEL',           'Combustible',        'Combustível',        'Fuel',               false, false, NOW(), NOW()),
  ('MISCELLANEOUS',  'Varios',             'Diversos',           'Miscellaneous',      false, false, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- -------------------------
-- ENTITY CATEGORIES (categorías de terceros, separadas de las de insumos)
-- El front busca por code: CONTRACTOR (contratistas) y AGRONOMIST (ingenieros agrónomos).
-- -------------------------
INSERT INTO entity_categories (id, code, "descriptionES", "descriptionPT", "descriptionEN", "createdAt", "updatedAt")
VALUES
  ('ecat-contractor', 'CONTRACTOR', 'Contratista',        'Prestador de serviços', 'Contractor', NOW(), NOW()),
  ('ecat-agronomist', 'AGRONOMIST', 'Ingeniero agrónomo', 'Engenheiro agrônomo',   'Agronomist', NOW(), NOW())
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
-- "name" es el que compara el front (enum TypeMovement): no cambiarlo.
-- manual = se ofrece en la pantalla de movimientos de stock; los otros los genera el front.
-- stockSum: ADD suma, SUBTRACT descuenta, BOTH el usuario elige. La transferencia descuenta
-- del origen (el front suma en el destino).
-- Un tipo que ya exista con el mismo nombre (cargado desde el BO) no se duplica.
-- -------------------------
INSERT INTO movement_types (id, name, "conceptES", "conceptPT", "conceptEN", description, manual, "stockSum", "createdAt", "updatedAt")
SELECT v.id, v.name, v.concept_es, v.concept_pt, v.concept_en, v.description, v.manual, v.stock_sum::"StockSumType", NOW(), NOW()
FROM (VALUES
  ('mvt-adjust',    'Ajustes',                       'Ajustes',                        'Ajustes',                      'Adjustments',            'Ajuste de inventario',                true,  'BOTH'),
  ('mvt-buy',       'Compra',                        'Compra',                         'Compra',                       'Purchase',               'Ingreso por compra',                  true,  'ADD'),
  ('mvt-sale',      'Ventas Varias',                 'Ventas varias',                  'Vendas diversas',              'Miscellaneous sales',    'Egreso por venta',                    true,  'SUBTRACT'),
  ('mvt-transfer',  'Transferencia entre depositos', 'Transferencia entre depósitos',  'Transferência entre depósitos','Transfer between deposits','Movimiento entre depósitos',       true,  'SUBTRACT'),
  ('mvt-loan',      'Prestamos',                     'Préstamos',                      'Empréstimos',                  'Loans',                  'Préstamo de o a terceros',            true,  'BOTH'),
  ('mvt-transform', 'Transformacion',                'Transformación',                 'Transformação',                'Transformation',         'Transformación de insumos',           false, 'BOTH'),
  ('mvt-exit',      'Salida de Campo',               'Salida de campo',                'Saída de campo',               'Field exit',             'Cosecha que sale del campo',          false, 'ADD'),
  ('mvt-withdraw',  'Orden de Retiro',               'Orden de retiro',                'Ordem de retirada',            'Withdrawal order',       'Retiro de insumos del depósito',      false, 'SUBTRACT'),
  ('mvt-labor',     'Labores',                       'Labores',                        'Trabalhos',                    'Field work',             'Consumo por labores en el lote',      false, 'SUBTRACT')
) AS v(id, name, concept_es, concept_pt, concept_en, description, manual, stock_sum)
WHERE NOT EXISTS (SELECT 1 FROM movement_types m WHERE m.name = v.name)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- Verificación rápida — ejecutar por separado para confirmar
-- =============================================================
 SELECT 'countries' AS tbl, COUNT(*) FROM countries
 UNION ALL SELECT 'licence_types', COUNT(*) FROM licence_types
 UNION ALL SELECT 'categories',    COUNT(*) FROM categories
 UNION ALL SELECT 'input_types',   COUNT(*) FROM input_types
 UNION ALL SELECT 'entity_categories', COUNT(*) FROM entity_categories
 UNION ALL SELECT 'crops',         COUNT(*) FROM crops
 UNION ALL SELECT 'movement_types',COUNT(*) FROM movement_types;



select
    id,
    category,
    denomination,
    "countryCode",
    currency,
    status,
    "licenceNumber",
    "isLicenceMultipleCountry",
    "maxHectares",
    "maxFields",
    "countFields",
    "countLicences",
    "countHectares",
    "createdAt",
    "updatedAt"
from
    public.accounts;

UPDATE users
SET role = 'GENERAL_ADMIN'
WHERE lower(email) = lower('german_montiel96@hotmail.com');
