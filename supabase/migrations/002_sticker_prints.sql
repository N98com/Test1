-- Migratie: sticker-printhistorie
-- Eenmalig uitvoeren in de Supabase SQL Editor van het bestaande project
-- (bovenop het al aanwezige schema uit schema.sql).

-- ============ sticker_prints (Historie: printlog van stickers) ============
-- Losstaand van movements/stock: houdt bij wie wanneer welke stickers heeft
-- geprint (artikelen, aantallen, batch, met/zonder barcode). Items worden
-- gedenormaliseerd opgeslagen (niet enkel product_id) zodat de historie klopt
-- blijft ook als een artikel later wordt gewijzigd of verwijderd.
create table public.sticker_prints (
  id uuid primary key default gen_random_uuid(),
  print_number bigint generated always as identity,
  batch_number text not null,
  include_barcode boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) default auth.uid()
);
alter table public.sticker_prints enable row level security;
create policy "sticker_prints select admin only"
  on public.sticker_prints for select
  using (public.current_role() = 'admin');
create policy "sticker_prints insert all authenticated"
  on public.sticker_prints for insert
  with check (auth.role() = 'authenticated');

create table public.sticker_print_items (
  id uuid primary key default gen_random_uuid(),
  print_id uuid not null references public.sticker_prints(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  article_number text not null,
  description text not null,
  ean text not null,
  company_id text not null,
  units_per_box int not null,
  copies int not null
);
alter table public.sticker_print_items enable row level security;
create policy "sticker_print_items select admin only"
  on public.sticker_print_items for select
  using (public.current_role() = 'admin');
create policy "sticker_print_items insert all authenticated"
  on public.sticker_print_items for insert
  with check (auth.role() = 'authenticated');

-- Realtime-updates voor de Historie-tab (zelfde patroon als de andere tabellen)
alter publication supabase_realtime add table public.sticker_prints;
alter publication supabase_realtime add table public.sticker_print_items;
