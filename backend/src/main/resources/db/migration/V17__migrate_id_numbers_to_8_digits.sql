-- V17: Migrate ID numbers to 8-digit format (XXXX XXXX) safely with collision resolution

-- 1. Ensure admin-1 has 0000 0001
UPDATE users
SET id_number = '0000 0001'
WHERE id = 'admin-1' OR id_number = '000 001';

-- 2. Migrate existing 6-digit or shorter ID numbers to 8-digit format where there is NO collision
UPDATE users u
SET id_number = SUBSTRING(LPAD(REPLACE(u.id_number, ' ', ''), 8, '0') FROM 1 FOR 4) || ' ' || SUBSTRING(LPAD(REPLACE(u.id_number, ' ', ''), 8, '0') FROM 5 FOR 4)
WHERE u.id_number IS NOT NULL
  AND LENGTH(REPLACE(u.id_number, ' ', '')) <= 6
  AND u.id != 'admin-1'
  AND NOT EXISTS (
      SELECT 1 FROM users o
      WHERE o.id != u.id
        AND o.id_number = SUBSTRING(LPAD(REPLACE(u.id_number, ' ', ''), 8, '0') FROM 1 FOR 4) || ' ' || SUBSTRING(LPAD(REPLACE(u.id_number, ' ', ''), 8, '0') FROM 5 FOR 4)
  );

-- 3. For any remaining users with shorter ID numbers where the direct pad would collide,
-- assign a safe, distinct 8-digit ID in the 5001+ range
UPDATE users u
SET id_number = SUBSTRING(LPAD(CAST(5000 + (
    SELECT COUNT(*) FROM users o WHERE o.created_at < u.created_at OR (o.created_at = u.created_at AND o.id <= u.id)
) AS VARCHAR), 8, '0') FROM 1 FOR 4) || ' ' || SUBSTRING(LPAD(CAST(5000 + (
    SELECT COUNT(*) FROM users o WHERE o.created_at < u.created_at OR (o.created_at = u.created_at AND o.id <= u.id)
) AS VARCHAR), 8, '0') FROM 5 FOR 4)
WHERE u.id_number IS NOT NULL
  AND LENGTH(REPLACE(u.id_number, ' ', '')) <= 6
  AND u.id != 'admin-1';

