-- Migratie: eigenaarsaccount beschermen
-- Eenmalig uitvoeren in de Supabase SQL Editor van het bestaande project.
--
-- Het eigenaarsaccount (is_owner) kan via de app/API door niemand een andere
-- rol krijgen, en niemand kan zichzelf of een ander eigenaar maken of de
-- eigenaarsmarkering weghalen. Alleen direct in Supabase (SQL Editor of
-- service role, waar geen ingelogde app-gebruiker bij is) kan dit nog.

alter table public.profiles
  add column is_owner boolean not null default false;

update public.profiles set is_owner = true where email = 'bramengbers@hotmail.nl';

create or replace function public.protect_owner_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Geen ingelogde app-gebruiker (SQL Editor / service role): toegestaan.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if old.is_owner then
      raise exception 'Het eigenaarsaccount kan niet verwijderd worden.';
    end if;
    return old;
  end if;

  if new.is_owner is distinct from old.is_owner then
    raise exception 'De eigenaar van de tool kan niet via de app gewijzigd worden.';
  end if;
  if old.is_owner and new.role is distinct from old.role then
    raise exception 'De rol van het eigenaarsaccount kan niet gewijzigd worden.';
  end if;
  return new;
end;
$$;

create trigger protect_owner_profile
  before update or delete on public.profiles
  for each row execute function public.protect_owner_profile();

revoke execute on function public.protect_owner_profile() from public, anon, authenticated;
