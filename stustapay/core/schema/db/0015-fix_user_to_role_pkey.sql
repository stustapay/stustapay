-- migration: 70095e33
-- requires: 45c19bb1

alter table user_to_role drop constraint user_to_role_pkey;
alter table user_to_role add constraint user_to_role_pkey primary key (user_id, role_id, node_id);