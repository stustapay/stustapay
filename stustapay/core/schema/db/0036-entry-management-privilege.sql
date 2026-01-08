-- migration: 0000036
-- requires: 0000035

insert into privilege (name)
values ('entry_management')
on conflict do nothing;

insert into user_role_to_privilege (role_id, privilege)
select role_id, 'entry_management'
from user_role_to_privilege
where privilege = 'node_administration'
on conflict do nothing;
