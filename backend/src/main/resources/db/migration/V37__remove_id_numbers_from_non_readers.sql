-- Migration V37: Remove id_number and username from non-readers (admin, managers/moderators, authors)
UPDATE users
SET id_number = NULL
WHERE LOWER(role) IN ('admin', 'manager', 'author');

UPDATE users
SET username = NULL
WHERE LOWER(role) IN ('admin', 'manager', 'author');

UPDATE authors
SET id_number = NULL
WHERE id_number IS NOT NULL;

