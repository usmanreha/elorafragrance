-- ============================================================
-- ELORA FRAGRANCE - SUPABASE FIX (run ONCE in SQL Editor)
-- Fixes: reviewer_name schema-cache error + review RLS lock
-- Safe: IF NOT EXISTS, purana data delete NAHI hota
-- ============================================================

-- 1) Missing columns add karo (dono schemas support honge)
alter table public.product_reviews add column if not exists reviewer_name text;
alter table public.product_reviews add column if not exists approved boolean not null default false;
alter table public.product_reviews add column if not exists customer_name text;
alter table public.product_reviews add column if not exists status text not null default 'pending';
alter table public.product_reviews add column if not exists product_name text;

-- 2) Purana data sync karo
update public.product_reviews set reviewer_name = coalesce(reviewer_name, customer_name, 'Customer') where reviewer_name is null;
update public.product_reviews set customer_name = coalesce(customer_name, reviewer_name, 'Customer') where customer_name is null;
update public.product_reviews set approved = true where status = 'approved' and approved = false;
update public.product_reviews set status = 'approved' where approved = true and (status is null or status <> 'approved');

-- 3) Dono columns auto-sync trigger (aage mismatch na ho)
drop trigger if exists trg_elora_review_sync on public.product_reviews;
drop function if exists public.elora_review_sync();
create function public.elora_review_sync() returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.customer_name is null or NEW.customer_name = '' then NEW.customer_name := coalesce(NEW.reviewer_name, 'Customer'); end if;
    if NEW.reviewer_name is null or NEW.reviewer_name = '' then NEW.reviewer_name := NEW.customer_name; end if;
    if NEW.status is null or NEW.status = '' then NEW.status := case when NEW.approved then 'approved' else 'pending' end; end if;
    NEW.approved := (NEW.status = 'approved');
    return NEW;
  else
    if NEW.customer_name is distinct from OLD.customer_name then NEW.reviewer_name := NEW.customer_name; end if;
    if NEW.reviewer_name is distinct from OLD.reviewer_name then NEW.customer_name := NEW.reviewer_name; end if;
    if NEW.status is distinct from OLD.status then NEW.approved := (NEW.status = 'approved'); end if;
    if NEW.approved is distinct from OLD.approved then NEW.status := case when NEW.approved then 'approved' else 'pending' end; end if;
    return NEW;
  end if;
end; $$;
create trigger trg_elora_review_sync before insert or update on public.product_reviews
for each row execute function public.elora_review_sync();

-- 4) RLS: public approved reviews parh sake, anon review bhej sake
alter table public.product_reviews enable row level security;
drop policy if exists "Public can submit reviews" on public.product_reviews;
drop policy if exists "Public can read approved reviews" on public.product_reviews;
drop policy if exists "Admins can manage reviews" on public.product_reviews;
drop policy if exists "elora_public_insert_review" on public.product_reviews;
drop policy if exists "elora_public_read_approved" on public.product_reviews;
drop policy if exists "elora_admin_all" on public.product_reviews;

create policy "elora_public_insert_review" on public.product_reviews for insert to anon, authenticated
with check (rating between 1 and 5 and char_length(trim(coalesce(customer_name, reviewer_name, ''))) between 2 and 80);

create policy "elora_public_read_approved" on public.product_reviews for select to anon, authenticated
using (status = 'approved' or approved = true or public.is_admin());

create policy "elora_admin_all" on public.product_reviews for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create index if not exists product_reviews_status_idx on public.product_reviews(status, created_at desc);
create index if not exists product_reviews_approved_idx on public.product_reviews(approved, created_at desc);

-- 5) Schema cache reload (yeh reviewer_name error khatam karega)
notify pgrst, 'reload schema';
