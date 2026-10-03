-- migration: 7ecb5a30
-- requires: 8ac08b65

alter table till_profile add column use_ttp_for_card_payment boolean not null default false;
