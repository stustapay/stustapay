-- migration: 3e242fc3
-- requires: 7e81cbb1

alter table forbidden_objects_at_node drop constraint forbidden_objects_at_node_node_id_fkey;
alter table forbidden_objects_at_node add constraint forbidden_objects_at_node_node_id_fkey
    foreign key (node_id) references node(id) on delete cascade;

alter table forbidden_objects_in_subtree_at_node drop constraint forbidden_objects_in_subtree_at_node_node_id_fkey;
alter table forbidden_objects_in_subtree_at_node add constraint forbidden_objects_in_subtree_at_node_node_id_fkey
    foreign key (node_id) references node(id) on delete cascade;
