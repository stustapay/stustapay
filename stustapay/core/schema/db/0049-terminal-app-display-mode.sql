-- migration: 0000049
-- requires: 0000048

alter table terminal add column if not exists app_display_mode text default null;

alter table terminal
    drop constraint if exists terminal_app_display_mode_valid;

alter table terminal
    add constraint terminal_app_display_mode_valid
    check (app_display_mode is null or app_display_mode in ('day', 'night'));
