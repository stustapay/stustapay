-- revision: 8697011c
-- requires: 2a15b453

alter table payout_run
    drop column execution_date;

create or replace view customer as
    select
        a.*,
        customer_info.*
    from
        account_with_history a
        left join customer_info on (a.id = customer_info.customer_account_id)
    where
        a.type = 'private';

create or replace view payout_run_with_stats as
    (
    select
        p.*,
        s.total_donation_amount,
        s.total_payout_amount,
        s.n_payouts
    from
        payout_run p
        join (
            select
                py.id                                                      as id,
                coalesce(sum(c.donation), 0)                               as total_donation_amount,
                coalesce(sum(c.balance), 0) - coalesce(sum(c.donation), 0) as total_payout_amount,
                count(*)                                                   as n_payouts
            from
                payout_run py
                left join customer c on py.id = c.payout_run_id
            group by py.id
             ) s on p.id = s.id );

do
$$
    begin
        create type tse_type as enum ('diebold_nixdorf');
    exception
        when duplicate_object then null;
    end
$$;

alter table tse
    add column ws_url text not null default '';
alter table tse
    add column ws_timeout double precision default 5;
alter table tse
    add column password text not null default '';
alter table tse
    add column type tse_type not null default 'diebold_nixdorf';
alter table tse
    rename column tse_id to id;
alter table tse
    rename column tse_name to name;
alter table tse
    rename column tse_status to status;
alter table tse
    rename column tse_serial to serial;
alter table tse
    alter column serial set not null;
alter table tse
    rename column tse_hashalgo to hashalgo;
alter table tse
    rename column tse_time_format to time_format;
alter table tse
    rename column tse_public_key to public_key;
alter table tse
    rename column tse_certificate to certificate;
alter table tse
    rename column tse_process_data_encoding to process_data_encoding;
