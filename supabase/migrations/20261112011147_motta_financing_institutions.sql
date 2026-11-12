-- Institutions supplied by the dealership; no claim of a formal partnership.
create table public.motta_financing_institutions (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 80),
 logo_url text not null default '' check(length(logo_url)<=1500 and (logo_url='' or logo_url ~ '^https://[^/@[:space:]<>]+/[^[:space:]<>]*$' or logo_url ~ '^/img/[a-zA-Z0-9_./-]+$')),
 logo_authorized boolean not null default false,
 enabled boolean not null default true,
 sort_order integer not null default 0 check(sort_order between 0 and 10000),
 created_at timestamptz not null default now(),
 check(logo_url='' or logo_authorized)
);
create index motta_financing_display_order on public.motta_financing_institutions(enabled,sort_order,name,id);
alter table public.motta_financing_institutions enable row level security;
revoke all on public.motta_financing_institutions from anon,authenticated;
grant select on public.motta_financing_institutions to anon;
grant select,insert,update,delete on public.motta_financing_institutions to authenticated;
create policy financing_public_read on public.motta_financing_institutions for select to anon using(enabled);
create policy financing_member_read on public.motta_financing_institutions for select to authenticated using(enabled or (select motta_private.can('settings')));
create policy financing_admin_insert on public.motta_financing_institutions for insert to authenticated with check((select motta_private.can('settings')));
create policy financing_admin_update on public.motta_financing_institutions for update to authenticated using((select motta_private.can('settings'))) with check((select motta_private.can('settings')));
create policy financing_admin_delete on public.motta_financing_institutions for delete to authenticated using((select motta_private.can('settings')));

-- No unverified or AI-generated logos. Administrators can provide authorized files.
insert into public.motta_financing_institutions(name,sort_order) values
 ('Bradesco',10),('Itaú',20),('Safra',30),('Daycoval',40),('C6 Bank',50),('Banco PAN',60),('BV',70),('Car Bank',80),('Omene',90);
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.motta_financing_institutions;
 end if;
end $$;
