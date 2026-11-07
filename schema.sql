-- Esegui questo script nel SQL Editor di Supabase.
create table if not exists public.accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null default 'Conto corrente',
 opening_cents bigint not null default 0,
 opening_date date not null default current_date,
 created_at timestamptz not null default now(),
 unique(user_id,name)
);
create table if not exists public.movements (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.accounts(id) on delete cascade,
 description text not null check(length(trim(description)) between 1 and 120),
 amount_cents bigint not null check(amount_cents > 0),
 date date not null,
 kind text not null check(kind in ('income','expense')),
 category text not null default 'Altro',
 status text not null check(status in ('planned','confirmed')),
 created_at timestamptz not null default now()
);
create index if not exists movements_account_date_idx on public.movements(account_id,date);
alter table public.accounts enable row level security;
alter table public.movements enable row level security;
create policy "Own accounts" on public.accounts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own movements" on public.movements for all to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()))) with check (user_id = (select auth.uid()) and exists (select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid())));
