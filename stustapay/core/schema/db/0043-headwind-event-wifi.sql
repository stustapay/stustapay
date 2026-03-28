-- migration: 0000043
-- requires: 0000042

alter table event
    add column if not exists wifi_ssid text,
    add column if not exists wifi_passphrase text;

alter table terminal_device_mapping
    add column if not exists last_wifi_pushed_at timestamptz,
    add column if not exists last_wifi_push_status text,
    add column if not exists last_wifi_push_error text;
