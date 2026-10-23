-- Migratie: SECURITY DEFINER-functies niet meer van buitenaf aanroepbaar maken
-- Eenmalig uitvoeren in de Supabase SQL Editor van het bestaande project.

-- handle_new_user draait alleen als trigger op auth.users; triggers hebben geen
-- EXECUTE-recht van de aanroeper nodig, dus niemand hoeft 'm via de API aan te roepen.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- current_role wordt door de RLS-policies gebruikt en moet dus aanroepbaar blijven
-- voor ingelogde gebruikers, maar niet voor niet-ingelogde (anon) bezoekers.
revoke execute on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated;
