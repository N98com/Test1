-- Migratie: optie "Alternatief product" bij stickerprints
-- Eenmalig uitvoeren in de Supabase SQL Editor van het bestaande project.

-- Bewaard per print, zodat opnieuw printen vanuit Historie dezelfde sticker geeft.
alter table public.sticker_prints
  add column alternative_product boolean not null default false;

-- Logregel uitbreiden met de nieuwe optie (zie 004_activity_log.sql).
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
      'alternative', sp.alternative_product,
      'items', jsonb_agg(jsonb_build_object('article_number', n.article_number, 'copies', n.copies) order by n.article_number)
    )
  from new_items n
  join public.sticker_prints sp on sp.id = n.print_id
  group by sp.id, sp.print_number, sp.batch_number, sp.include_barcode, sp.alternative_product;
  return null;
end;
$$;
