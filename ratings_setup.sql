-- ELORA Ratings & Reviews setup
-- Run this ONCE in Supabase SQL Editor.
create table if not exists public.product_reviews (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  reviewer_name text not null check (char_length(trim(reviewer_name)) between 2 and 80),
  rating integer not null check (rating between 1 and 5),
  review_text text check (review_text is null or char_length(review_text) <= 500),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists product_reviews_product_idx on public.product_reviews(product_id, created_at desc);
create index if not exists product_reviews_approved_idx on public.product_reviews(approved, created_at desc);
alter table public.product_reviews enable row level security;
drop policy if exists "Public can submit reviews" on public.product_reviews;
drop policy if exists "Public can read approved reviews" on public.product_reviews;
drop policy if exists "Admins can manage reviews" on public.product_reviews;
create policy "Public can submit reviews" on public.product_reviews for insert to anon, authenticated
with check (approved = false and rating between 1 and 5 and char_length(trim(reviewer_name)) between 2 and 80 and (review_text is null or char_length(review_text) <= 500));
create policy "Public can read approved reviews" on public.product_reviews for select to anon, authenticated using (approved = true or public.is_admin());
create policy "Admins can manage reviews" on public.product_reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());
