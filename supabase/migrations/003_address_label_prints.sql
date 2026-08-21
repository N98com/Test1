-- Migratie: brieflabel-printhistorie
-- Eenmalig uitvoeren in de Supabase SQL Editor van het bestaande project
-- (bovenop het al aanwezige schema uit schema.sql en 002_sticker_prints.sql).

-- ============ address_label_prints (Historie: printlog van brieflabels) ============
-- Zelfde patroon als sticker_prints: wie wanneer welk brieflabel heeft geprint.
-- De labelgegevens zelf (naam/adres) worden hier opgeslagen zodat de historie
-- na het printen nog te herprinten is, ook als de invoer alleen even geplakt
-- en niet elders bewaard was.
create table public.address_label_prints (
  id uuid primary key default gen_random_uuid(),
  print_number bigint generated always as identity,
  name text not null,
  street text not null,
  house_number text not null,
  postcode text not null,
  city text not null,
  province text not null,
  country text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) default auth.uid()
);
alter table public.address_label_prints enable row level security;
create policy "address_label_prints select admin only"
  on public.address_label_prints for select
  using (public.current_role() = 'admin');
create policy "address_label_prints insert all authenticated"
  on public.address_label_prints for insert
  with check (auth.role() = 'authenticated');

-- Realtime-updates voor de Historie-tab (zelfde patroon als de andere tabellen)
alter publication supabase_realtime add table public.address_label_prints;
