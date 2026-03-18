-- migration: 0000042
-- requires: 0000041

create index if not exists till_node_id_idx on till (node_id);
