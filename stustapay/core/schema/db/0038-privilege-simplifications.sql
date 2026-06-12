-- migration: a55734c9
-- requires: fb101fcb

create table user_role_to_event_privilege (
    role_id   bigint not null references user_role (id) on delete cascade,
    privilege text   not null references privilege (name),
    primary key (role_id, privilege)
);


alter table user_role_to_privilege rename to user_role_to_node_privilege;

insert into user_role_to_event_privilege (role_id, privilege)
select role_id, privilege
from user_role_to_node_privilege
where privilege in (
    'customer_management',
    'payout_management',
    'create_user',
    'cash_transport',
    'grant_free_tickets',
    'grant_vouchers',
    'terminal_login',
    'supervised_terminal_login'
);

delete from user_role_to_node_privilege
where privilege in (
    'customer_management',
    'payout_management',
    'create_user',
    'cash_transport',
    'grant_free_tickets',
    'grant_vouchers',
    'terminal_login',
    'supervised_terminal_login'
);

insert into privilege (name)
values ('allow_role_assignment');

update user_role_to_node_privilege set privilege = 'allow_role_assignment'
where privilege = 'user_management';

delete from privilege where name = 'user_management';
