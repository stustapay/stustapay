-- migration: 3a6d80b4
-- requires: 7b3d1202

create or replace function hash_voucher_token(
    token text
) returns text as
$$
<<locals>> declare
    token_hash bytea;
    token_hash_encoded text;
begin
    locals.token_hash = sha256(convert_to(hash_voucher_token.token, 'utf-8'));
    -- the following idiot function has its "from" start position as 1-index based
    locals.token_hash = substring(locals.token_hash from 1 for 24);
    locals.token_hash_encoded = encode(locals.token_hash, 'base64');
    locals.token_hash_encoded = replace(locals.token_hash_encoded, '+', '-');
    locals.token_hash_encoded = replace(locals.token_hash_encoded, '/', '_');
    return '$' || locals.token_hash_encoded;
end
$$ language plpgsql
    immutable
    set search_path = "$user", public;

alter table ticket_voucher add column token_hash text not null generated always as (hash_voucher_token(token)) stored;

create index user_tag_pin_idx on user_tag (pin);
create index ticket_voucher_token_idx on ticket_voucher (token);
create index ticket_voucher_token_hash_idx on ticket_voucher (token_hash);
