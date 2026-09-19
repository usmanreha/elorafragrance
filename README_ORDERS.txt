ELORA FRAGRANCE — FINAL COD-ONLY WEBSITE

WHAT'S UPDATED
- New black + gold luxury homepage.
- Circular ELORA logo in the header.
- Ameer-ul-Oud hero section.
- Collection slots: Ameer-ul-Oud, Sabaya, Zarar, Cool-Elexer, Aromatic, Oriental.
- FREE DELIVERY removed.
- Payment method is CASH ON DELIVERY (COD) ONLY.
- Checkout shows COD only; no card/online payment option.
- Supabase online products + orders + admin dashboard remain connected.
- Google Search Console verification meta tag is kept.

PUBLISH
1. Extract this ZIP.
2. In Netlify: Project > Deploys > drag the extracted folder to the deploy area.
3. Make sure index.html is directly inside the folder you upload.

SUPABASE COD UPDATE
Run orders_setup.sql once in the same Supabase SQL Editor. This adds/enforces the Cash on Delivery payment method for orders and updates the order RPC used by the website.

ADMIN
Open: https://elorafragrance.netlify.app/admin.html
Use the Supabase Auth admin account you already created.

ADD PERFUMES
In Admin > Add Product, you can add the six names or any future perfume, set old/sale price, tag and photo. Products then appear in the Shop section and can be ordered by customers.


RATINGS & REVIEWS UPDATE
1. Run the added Ratings & Reviews SQL at the bottom of orders_setup.sql once in Supabase SQL Editor.
2. Customers can submit a 1–5 star rating and optional written review on each product.
3. Reviews stay hidden until you approve them in Admin > Ratings & Reviews.
4. Only approved reviews are shown publicly.
5. No fake ratings/reviews are preloaded.
