-- revision: c5c4ae30
-- requires: dc0af35b

create table if not exists payout_run (
    id bigint primary key generated always as identity (start with 1),
    created_by text not null,
    created_at timestamptz not null
);

alter table customer_info add column payout_run_id bigint references payout_run(id) on delete cascade;
alter table customer_info add column payout_error text;
alter table customer_info add column payout_export boolean default true not null;
