-- ELORA: Fix browser access to the EXISTING 7-argument create_order function.
-- Run this once in Supabase SQL Editor after confirming the function exists.
-- Signature matches orders_setup_fixed.sql:
-- (text, text, text, text, text, jsonb, text)

grant usage on schema public to anon, authenticated;

grant execute on function public.create_order(
  text, text, text, text, text, jsonb, text
) to anon, authenticated;

notify pgrst, 'reload schema';

select
  has_function_privilege('anon', 'public.create_order(text,text,text,text,text,jsonb,text)', 'execute') as anon_can_execute,
  has_function_privilege('authenticated', 'public.create_order(text,text,text,text,text,jsonb,text)', 'execute') as authenticated_can_execute;
