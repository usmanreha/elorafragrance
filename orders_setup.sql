-- ELORA Orders setup for the existing Supabase project
-- Run this ONCE in Supabase SQL Editor after the existing ELORA setup.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  city text,
  notes text,
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null default 'Cash on Delivery' check (payment_method = 'Cash on Delivery'),
  status text not null default 'New' check (status in ('New','Confirmed','Shipped','Delivered','Cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) generated always as (unit_price * quantity) stored
);

alter table public.orders add column if not exists payment_method text not null default 'Cash on Delivery';
update public.orders set payment_method = 'Cash on Delivery' where payment_method is null or payment_method <> 'Cash on Delivery';
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Remove policies if this script is re-run.
drop policy if exists "Public can create orders" on public.orders;
drop policy if exists "Admins can view orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Admins can view order items" on public.order_items;

-- Customers do not need to read orders. The site creates orders through the RPC below.
-- Keep direct INSERT blocked to prevent mismatched order/order-item records.

drop function if exists public.create_order(text,text,text,text,text,jsonb);

create or replace function public.create_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_notes text,
  p_items jsonb,
  p_payment_method text default 'Cash on Delivery'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(12,2);
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_product_name text;
  v_price numeric(12,2);
begin
  if coalesce(trim(p_customer_name), '') = '' then raise exception 'Customer name is required'; end if;
  if coalesce(trim(p_phone), '') = '' then raise exception 'Phone number is required'; end if;
  if coalesce(trim(p_address), '') = '' then raise exception 'Delivery address is required'; end if;
  if coalesce(trim(p_payment_method), '') <> 'Cash on Delivery' then raise exception 'Only Cash on Delivery is available'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  create temporary table if not exists _elora_order_items (
    product_id uuid,
    quantity integer
  ) on commit drop;
  truncate _elora_order_items;

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_qty := greatest(1, least(99, (v_item->>'quantity')::integer));
    exception when others then
      raise exception 'Invalid product in cart';
    end;
    insert into _elora_order_items values (v_product_id, v_qty);
  end loop;

  select coalesce(sum(p.price * i.quantity), 0)
    into v_total
  from _elora_order_items i
  join public.products p on p.id = i.product_id;

  if exists (
    select 1 from _elora_order_items i
    left join public.products p on p.id = i.product_id
    where p.id is null
  ) then
    raise exception 'One or more products are no longer available';
  end if;

  insert into public.orders(customer_name, phone, address, city, notes, total, payment_method)
  values (trim(p_customer_name), trim(p_phone), trim(p_address), nullif(trim(p_city), ''), nullif(trim(p_notes), ''), v_total, 'Cash on Delivery')
  returning id into v_order_id;

  insert into public.order_items(order_id, product_id, product_name, unit_price, quantity)
  select v_order_id, p.id, p.name, p.price, i.quantity
  from _elora_order_items i
  join public.products p on p.id = i.product_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_order(text,text,text,text,text,jsonb,text) from public;
grant execute on function public.create_order(text,text,text,text,text,jsonb,text) to anon, authenticated;

drop policy if exists "Admins can view orders" on public.orders;
create policy "Admins can view orders"
on public.orders for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can view order items" on public.order_items;
create policy "Admins can view order items"
on public.order_items for select
to authenticated
using (public.is_admin());

-- Optional: give the admin dashboard access to order item details through the normal RLS policy.
-- No customer-facing SELECT policy is created, so customers cannot read other customers' orders.


-- ELORA Ratings & Reviews
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
