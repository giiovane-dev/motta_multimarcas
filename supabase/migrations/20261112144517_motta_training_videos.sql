create table public.motta_training_videos (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 120),
 description text not null default '' check (length(description)<=2000),
 drive_file_id text not null check (drive_file_id ~ '^[a-zA-Z0-9_-]{10,200}$'),
 sort_order integer not null default 0 check (sort_order between 0 and 10000),
 created_at timestamptz not null default now()
);
create index motta_training_display_order on public.motta_training_videos(sort_order,created_at,id);
alter table public.motta_training_videos enable row level security;
revoke all on public.motta_training_videos from public,anon,authenticated;
grant select,insert,update,delete on public.motta_training_videos to authenticated;
create policy training_read on public.motta_training_videos for select to authenticated
 using ((select motta_private.can('inventory')));
create policy training_insert on public.motta_training_videos for insert to authenticated
 with check ((select motta_private.can('settings')));
create policy training_update on public.motta_training_videos for update to authenticated
 using ((select motta_private.can('settings'))) with check ((select motta_private.can('settings')));
create policy training_delete on public.motta_training_videos for delete to authenticated
 using ((select motta_private.can('settings')));
