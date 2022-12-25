-- revision: 62df6b55
-- requires: null

-- stustapay core database
--
-- (c) 2022 Jonas Jelten <jj@sft.lol>
--
-- security stuff:
-- security definer functions are executed in setuid-mode
-- to grant access to them, use:
--   grant execute on function some_function_name to some_insecure_user;

begin;

set plpgsql.extra_warnings to 'all';
set lc_monetary to "de_DE.utf8";

do $$ begin
    create extension pgcrypto;
exception
    when duplicate_object then null;
end $$;

create table product (
    id serial primary key,
    name varchar(255) not null
);

commit;
