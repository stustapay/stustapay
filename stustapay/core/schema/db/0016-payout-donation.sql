-- revision: 2b0f2fb3
-- requires: 70095e33

alter table customer_info add column donate_all boolean default false not null;
alter table customer_info add column has_entered_info boolean default false not null;

-- for all account of type private, create customer_info record
with has_customer_info as (
    select
        a.id,
        (select exists (select from customer_info ci where a.id = ci.customer_account_id)) as has_customer_info
    from
        account a
    where
        a.type = 'private'
)
insert into customer_info ( customer_account_id ) (
    select id
    from has_customer_info
    where not has_customer_info
);
insert into account_type (name)
values
('donation_exit');

insert into account (
    id, user_tag_uid, type, name, comment, node_id
) overriding system value
values
(10, null, 'donation_exit', "Donation Exit", "target account when donation exits the system", 
    (
        select id
        from node
        where event <> null
    )
);
