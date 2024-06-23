-- migration: c7733331
-- requires: 66c577ad

insert into config (
    key, value
)
values
    -- only country codes are allowed
    ('customer_portal.sepa.allowed_country_codes', '["FI", "AT", "PT", "BE", "ES", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "PT", "MT", "MC", "NL", "PT", "SM", "SK", "SI"]')
    on conflict do nothing;
