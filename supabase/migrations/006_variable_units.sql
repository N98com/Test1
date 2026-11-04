-- Migratie: "Variabel aantal" per artikel
-- Eenmalig uitvoeren in de Supabase SQL Editor van het bestaande project.

-- Bij een variabel aantal heeft het artikel geen vast aantal per doos: bij het
-- genereren van stickers vraagt de app dan steeds om het aantal. units_per_box
-- blijft gevuld maar wordt voor zo'n artikel niet gebruikt.
alter table public.products
  add column variable_units boolean not null default false;

-- Logregel uitbreiden met de nieuwe optie (zie 004_activity_log.sql).
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
      'description', new.description, 'ean', new.ean, 'company_id', new.company_id,
      'units_per_box', new.units_per_box, 'variable_units', new.variable_units));
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
  if new.variable_units is distinct from old.variable_units then
    changes := changes || jsonb_build_object('variable_units', jsonb_build_array(old.variable_units, new.variable_units));
  end if;

  if changes <> '{}'::jsonb then
    perform public.log_activity('product_updated', new.article_number, jsonb_build_object('changes', changes));
  end if;
  return new;
end;
$$;
