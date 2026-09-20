-- ELORA: Fix browser access to the EXISTING 7-argument create_order function.
-- Run this once in Supabase SQL Editor. Do not run the old UUID setup files.

grant usage on schema public to anon, authenticated;

grant execute on function public.create_order(
  text, text, text, jsonb, text, text, text
) to anon, authenticated;

notify pgrst, 'reload schema';

-- Optional verification: should return true for both roles.
select
  has_function_privilege('anon', 'public.create_order(text,text,text,jsonb,text,text,text)', 'execute') as anon_can_execute,
  has_function_privilege('authenticated', 'public.create_order(text,text,text,jsonb,text,text,text)', 'execute') as authenticated_can_execute;
