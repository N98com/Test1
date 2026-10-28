-- Migratie: activiteitenlog ("Logs" in het instellingenmenu, alleen voor admins)
-- Eenmalig uitvoeren in de Supabase SQL Editor van het bestaande project.
--
-- Wijzigingen worden vastgelegd door database-triggers, dus ook als iets niet via
-- de app gebeurt. Acties die via een Edge Function met de service-role sleutel
-- lopen (account aanmaken, eigen e-mail/wachtwoord wijzigen) hebben in de database
-- geen ingelogde gebruiker; die Edge Functions schrijven hun logregel zelf.

create table public.activity_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id) on delete set null,
  -- E-mailadres op het moment van de actie, zodat de log klopt blijft als het
  -- account later een ander e-mailadres krijgt of verwijderd wordt.
  actor_email text,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb
);
create index activity_log_created_at_idx on public.activity_log (created_at desc, id desc);

alter table public.activity_log enable row level security;
-- Alleen lezen voor admins; schrijven gebeurt uitsluitend door de triggers
-- hieronder (security definer) en door Edge Functions (service role).
create policy "activity_log select admin only"
  on public.activity_log for select
  using (public.current_role() = 'admin');

create or replace function public.log_activity(p_action text, p_target text, p_details jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activity_log (actor_id, actor_email, action, target, details)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()), p_action, p_target, p_details);
$$;

-- ============ artikelen ============
create or replace function public.log_product_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changes jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('product_created', new.article_number, jsonb_build_object(
      'description', new.description, 'ean', new.ean, 'company_id', new.company_id, 'units_per_box', new.units_per_box));
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_activity('product_deleted', old.article_number, jsonb_build_object(
      'description', old.description, 'ean', old.ean));
    return old;
  end if;

  if new.article_number is distinct from old.article_number then
    changes := changes || jsonb_build_object('article_number', jsonb_build_array(old.article_number, new.article_number));
  end if;
  if new.description is distinct from old.description then
    changes := changes || jsonb_build_object('description', jsonb_build_array(old.description, new.description));
  end if;
  if new.ean is distinct from old.ean then
    changes := changes || jsonb_build_object('ean', jsonb_build_array(old.ean, new.ean));
  end if;
  if new.company_id is distinct from old.company_id then
    changes := changes || jsonb_build_object('company_id', jsonb_build_array(old.company_id, new.company_id));
  end if;
  if new.units_per_box is distinct from old.units_per_box then
    changes := changes || jsonb_build_object('units_per_box', jsonb_build_array(old.units_per_box, new.units_per_box));
  end if;

  if changes <> '{}'::jsonb then
    perform public.log_activity('product_updated', new.article_number, jsonb_build_object('changes', changes));
  end if;
  return new;
end;
$$;

create trigger log_product_change
  after insert or update or delete on public.products
  for each row execute function public.log_product_change();

-- ============ stickers ============
-- Eén logregel per print (niet per artikel): de app voegt alle artikelen van
-- een print in één keer toe, dus een statement-trigger ziet ze allemaal samen.
create or replace function public.log_sticker_print()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (actor_id, actor_email, action, target, details)
  select
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    'stickers_printed',
    'Print #' || sp.print_number,
    jsonb_build_object(
      'batch', sp.batch_number,
      'barcode', sp.include_barcode,
      'items', jsonb_agg(jsonb_build_object('article_number', n.article_number, 'copies', n.copies) order by n.article_number)
    )
  from new_items n
  join public.sticker_prints sp on sp.id = n.print_id
  group by sp.id, sp.print_number, sp.batch_number, sp.include_barcode;
  return null;
end;
$$;

create trigger log_sticker_print
  after insert on public.sticker_print_items
  referencing new table as new_items
  for each statement execute function public.log_sticker_print();

-- ============ accounts: rol wijzigen ============
-- Alleen wanneer een ingelogde admin dit via de app doet (auth.uid() gevuld);
-- wijzigingen door Edge Functions loggen die functies zelf.
create or replace function public.log_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    perform public.log_activity('role_changed', new.email, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;

create trigger log_profile_change
  after update on public.profiles
  for each row execute function public.log_profile_change();

-- Interne functies niet via de API aanroepbaar maken.
revoke execute on function public.log_activity(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.log_product_change() from public, anon, authenticated;
revoke execute on function public.log_sticker_print() from public, anon, authenticated;
revoke execute on function public.log_profile_change() from public, anon, authenticated;
