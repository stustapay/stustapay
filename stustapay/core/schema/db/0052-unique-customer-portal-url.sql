-- migration: 13c7b823
-- requires: 2ad79bb3

create unique index if not exists idx_event_customer_portal_url_unique
    on event (customer_portal_url)
    where customer_portal_url <> '';
