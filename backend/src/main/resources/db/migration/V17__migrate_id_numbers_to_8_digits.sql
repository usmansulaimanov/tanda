-- V17: Migrate ID numbers to 8-digit format (XXXX XXXX)

-- 1. Ensure admin-1 has 0000 0001
UPDATE users
SET id_number = '0000 0001'
WHERE id = 'admin-1' OR id_number = '000 001';

-- 2. Migrate existing 6-digit or shorter ID numbers to 8-digit format
UPDATE users
SET id_number = SUBSTRING(LPAD(REPLACE(id_number, ' ', ''), 8, '0') FROM 1 FOR 4) || ' ' || SUBSTRING(LPAD(REPLACE(id_number, ' ', ''), 8, '0') FROM 5 FOR 4)
WHERE id_number IS NOT NULL
  AND LENGTH(REPLACE(id_number, ' ', '')) <= 6
  AND id != 'admin-1';
