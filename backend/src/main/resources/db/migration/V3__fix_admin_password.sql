-- Fix admin password hash (V2 seed contained an incorrect hash for 'changeme')
UPDATE users
SET password_hash = '$2b$10$Nqhp0Tmb7UEjlszTnP34PuVQ5.qDcU2WM4sdnOV1THgcjHcjtf75C'
WHERE email = 'admin@farm.local';
