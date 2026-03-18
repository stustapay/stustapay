-- migration: a1b2c3d4
-- requires: fd69246a

-- Add top-up product IDs to event settings (which Pretix products are top-up/credit products)
alter table event
add column pretix_topup_ids int array not null default '{}';

-- Add fields to ticket_voucher for better Pretix data tracking
alter table ticket_voucher
add column initial_top_up_amount numeric not null default 0;

alter table ticket_voucher add column pretix_item_id int;

alter table ticket_voucher
add column cancelled boolean not null default false;

-- Flag to sync checkin back to Pretix (set when NFC band is assigned)
alter table ticket_voucher
add column needs_pretix_checkin boolean not null default false;

alter table ticket_voucher add column pretix_product_name text;
