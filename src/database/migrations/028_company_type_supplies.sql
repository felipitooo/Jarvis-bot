-- Migration 028: Per-company-type supplies (dynamic stock per business)
-- supply_unit_cost = 0 means "auto": calculated from income (30% of hourly income spent on supplies).

ALTER TABLE economy_company_types ADD COLUMN supply_name TEXT NOT NULL DEFAULT 'Insumos Gerais';
ALTER TABLE economy_company_types ADD COLUMN supply_emoji TEXT NOT NULL DEFAULT '📦';
ALTER TABLE economy_company_types ADD COLUMN supply_burn_rate INTEGER NOT NULL DEFAULT 3;
ALTER TABLE economy_company_types ADD COLUMN supply_unit_cost INTEGER NOT NULL DEFAULT 0;

UPDATE economy_company_types
   SET supply_name = 'Sacas de Café & Insumos', supply_emoji = '🫘', supply_burn_rate = 6
 WHERE name LIKE 'Cafeteria%';

UPDATE economy_company_types
   SET supply_name = 'Kits de Energia & Refrigeração', supply_emoji = '🔌', supply_burn_rate = 4
 WHERE name LIKE 'Mineradora%';

UPDATE economy_company_types
   SET supply_name = 'Fichas, Bebidas & Suprimentos VIP', supply_emoji = '🍾', supply_burn_rate = 3
 WHERE name LIKE 'Cassino%';

UPDATE economy_company_types
   SET supply_name = 'Células de Combustível & Componentes', supply_emoji = '🛰️', supply_burn_rate = 2
 WHERE name LIKE 'Laborat%';
