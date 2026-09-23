-- Customers get a free-text notes field (Module 7 feature).
ALTER TABLE app_customer ADD COLUMN notes text NOT NULL DEFAULT '';
