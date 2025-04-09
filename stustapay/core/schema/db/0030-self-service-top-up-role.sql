-- migration: 0000030
-- requires: 0000029

-- Add new privilege
insert into privilege (
    name
)
values (
    'can_topup'
)
on conflict do nothing;

-- Add new self-service-top-up role for all existing nodes with ID > 0
INSERT INTO user_role (name, is_privileged, node_id)
SELECT DISTINCT 'self-service-top-up', false, id
FROM node
WHERE id > 0 AND event_id IS NOT NULL AND 'self-service-top-up' NOT IN (SELECT name FROM user_role WHERE node_id = node.id)
ON CONFLICT DO NOTHING;

-- Add the can_topup privilege to all self-service-top-up roles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT DISTINCT id FROM user_role WHERE name = 'self-service-top-up'
    LOOP
        INSERT INTO user_role_to_privilege (role_id, privilege)
        VALUES (r.id, 'can_topup')
        ON CONFLICT DO NOTHING;
        INSERT INTO user_role_to_privilege (role_id, privilege)
        VALUES (r.id, 'terminal_login')
        ON CONFLICT DO NOTHING;
    END LOOP;
END
$$;

-- Note: The OrderService.py file should be updated to accept either 
-- Privilege.can_book_orders or Privilege.can_topup for topup operations 