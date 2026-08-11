-- Voorraadbeheer: schema, RLS-policies en seed data
-- Uitvoeren in Supabase SQL Editor (eenmalig)

create extension if not exists pgcrypto;

-- ============ profiles (koppelt aan auth.users, bevat de rol) ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create policy "profiles select own or admin"
  on public.profiles for select
  using (auth.uid() = id or public.current_role() = 'admin');

create policy "profiles update admin only"
  on public.profiles for update
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Automatisch een profiel aanmaken (rol: user) zodra er een nieuw account bijkomt
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ companies ============
create table public.companies (
  id text primary key,
  name text not null
);
alter table public.companies enable row level security;
create policy "companies select all authenticated"
  on public.companies for select
  using (auth.role() = 'authenticated');

-- ============ warehouses ============
create table public.warehouses (
  id text primary key,
  number int not null,
  name text not null,
  description text not null
);
alter table public.warehouses enable row level security;
create policy "warehouses select all authenticated"
  on public.warehouses for select
  using (auth.role() = 'authenticated');

-- ============ products ============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  article_number text not null,
  description text not null,
  ean text not null,
  company_id text not null references public.companies(id),
  units_per_box int not null,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "products select all authenticated"
  on public.products for select
  using (auth.role() = 'authenticated');
create policy "products admin insert"
  on public.products for insert
  with check (public.current_role() = 'admin');
create policy "products admin update"
  on public.products for update
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy "products admin delete"
  on public.products for delete
  using (public.current_role() = 'admin');

-- ============ stock_entries ============
create table public.stock_entries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  warehouse_id text not null references public.warehouses(id),
  batch_number text not null,
  quantity int not null,
  created_at timestamptz not null default now()
);
alter table public.stock_entries enable row level security;
create policy "stock select all authenticated"
  on public.stock_entries for select
  using (auth.role() = 'authenticated');
create policy "stock insert all authenticated"
  on public.stock_entries for insert
  with check (auth.role() = 'authenticated');
create policy "stock update all authenticated"
  on public.stock_entries for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "stock delete all authenticated"
  on public.stock_entries for delete
  using (auth.role() = 'authenticated');

-- ============ movements (historie) ============
create table public.movements (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('in','out','correction')),
  product_id uuid not null references public.products(id) on delete cascade,
  warehouse_id text not null references public.warehouses(id),
  batch_number text not null,
  quantity int not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) default auth.uid()
);
alter table public.movements enable row level security;
create policy "movements select admin only"
  on public.movements for select
  using (public.current_role() = 'admin');
create policy "movements insert all authenticated"
  on public.movements for insert
  with check (auth.role() = 'authenticated');

-- ============ seed data (LISL/EB, Magazijn 1-4) ============
insert into public.companies (id, name) values
  ('lisl', 'LISL'),
  ('eb', 'EB');

insert into public.warehouses (id, number, name, description) values
  ('magazijn-1', 1, 'Magazijn 1', 'Werkplek, klein gedeelte opslag LISL'),
  ('magazijn-2', 2, 'Magazijn 2', 'Werkplek, klein gedeelte opslag EB'),
  ('magazijn-3', 3, 'Magazijn 3', 'Gemengde opslaglocatie LISL & EB'),
  ('magazijn-4', 4, 'Magazijn 4', 'Gemengde opslaglocatie LISL & EB');
