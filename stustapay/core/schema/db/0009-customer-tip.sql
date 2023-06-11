-- revision: dc0af35b
-- requires: ce7d9f30

-- alter table customer_info add column wants_to_tip boolean not null default false;
alter table customer_info add column tip numeric default 0.0;

alter table customer_info add constraint tip_positive check (tip >= 0);

-- view needs to be recreated as it is not updated otherwise
create or replace view customer as
    select
        a.*,
        customer_info.*
    from
        account_with_history a
        left join customer_info
            on (a.id = customer_info.customer_account_id);
