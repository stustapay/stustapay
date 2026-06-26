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

alter table user_to_role drop column terminal_only;

alter table user_role
    add column can_assign_all_roles boolean not null default false;

create table user_role_to_assignable_role (
    assigner_role_id   bigint not null references user_role (id) on delete cascade,
    assignable_role_id bigint not null references user_role (id) on delete cascade,
    primary key (assigner_role_id, assignable_role_id)
);

-- roles with privileged assignment capability can assign all roles
update user_role ur
set can_assign_all_roles = true
where exists (
    select 1
    from user_role_to_node_privilege urtn
    where urtn.role_id = ur.id
      and urtn.privilege = 'allow_privileged_role_assignment'
);

-- preserve effective assignment behavior for roles with only allow_role_assignment
with role_privileges as (
    select
        r.id,
        r.node_id,
        r.is_privileged,
        r.can_assign_all_roles,
        coalesce(event_privs.event_privileges, '{}'::text[]) as event_privileges,
        coalesce(node_privs.node_privileges, '{}'::text[]) as node_privileges
    from user_role r
    left join (
        select role_id, array_agg(privilege) as event_privileges
        from user_role_to_event_privilege
        group by role_id
    ) event_privs on r.id = event_privs.role_id
    left join (
        select role_id, array_agg(privilege) as node_privileges
        from user_role_to_node_privilege
        group by role_id
    ) node_privs on r.id = node_privs.role_id
)
insert into user_role_to_assignable_role (assigner_role_id, assignable_role_id)
select distinct assigner.id, target.id
from role_privileges assigner
cross join role_privileges target
join node n_assigner on n_assigner.id = assigner.node_id
join node n_target on n_target.id = target.node_id
where assigner.id != target.id
  and assigner.can_assign_all_roles = false
  and 'user_management' = any (assigner.node_privileges)
  and target.is_privileged = false
  and target.event_privileges <@ assigner.event_privileges
  and target.node_privileges <@ assigner.node_privileges
  and (
      n_assigner.id = n_target.id
      or n_assigner.id = n_target.event_node_id
      or n_target.id = n_assigner.event_node_id
      or n_assigner.event_node_id = n_target.event_node_id
  );

delete from user_role_to_node_privilege
where privilege in ('user_management', 'allow_privileged_role_assignment');

delete from privilege
where name in ('user_management', 'allow_privileged_role_assignment');

alter table user_role drop column is_privileged;
