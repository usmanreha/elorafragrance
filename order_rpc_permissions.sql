-- Run once in Supabase SQL Editor for the existing 7-argument COD function.
-- This does not create a duplicate function or change the orders table.
grant usage on schema public to anon, authenticated;
grant execute on function public.create_order(text, text, text, jsonb, text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
