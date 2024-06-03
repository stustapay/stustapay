-- revision: 9a962cb1
-- requires: 2b0f2fb3

insert into account_type (name)
values
('sepa_exit');

insert into account (
    node_id, type, name, comment
)
select
    id, 'sepa_exit', 'SEPA Exit', 'target account when a SEPA transfer exits the system'
from
    node
where
    event_id is not null
    and not exists (
        select 1
        from account
        where node_id = node.id and type = 'sepa_exit'
);