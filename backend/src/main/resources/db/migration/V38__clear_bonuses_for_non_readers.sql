-- Migration V38: Clear bonuses and transactions for non-readers (admins, managers/assistants, authors)
DELETE FROM bonus_transactions
WHERE user_id IN (
    SELECT id FROM users
    WHERE (role IS NOT NULL AND LOWER(role) NOT IN ('client', 'reader'))
       OR (duty IS NOT NULL AND duty != '')
);

UPDATE users
SET bonus_balance = 0
WHERE (role IS NOT NULL AND LOWER(role) NOT IN ('client', 'reader'))
   OR (duty IS NOT NULL AND duty != '');
