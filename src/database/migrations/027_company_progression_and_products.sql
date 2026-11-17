-- Migration 027: Company Progression, Products, Restock and Staff Automation

ALTER TABLE economy_user_companies ADD COLUMN stock_products INTEGER NOT NULL DEFAULT 50;
ALTER TABLE economy_user_companies ADD COLUMN max_stock INTEGER NOT NULL DEFAULT 100;
ALTER TABLE economy_user_companies ADD COLUMN auto_restock INTEGER NOT NULL DEFAULT 0;
ALTER TABLE economy_user_companies ADD COLUMN npc_workers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE economy_user_companies ADD COLUMN reputation INTEGER NOT NULL DEFAULT 0;
