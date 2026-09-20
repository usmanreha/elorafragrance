ELORA PERFUME - ORDER FIX PACKAGE

Changes in this package:
- Sends product IDs as numbers because the products.id column is bigint.
- Removes the incorrect fallback RPC call that could call a non-matching signature.
- Adds a 15-second timeout so the checkout cannot remain stuck forever.
- Displays the Supabase error clearly and logs the exception.
- Adds order_rpc_permissions.sql to grant browser RPC access to anon/authenticated.

NEXT STEPS:
1. Upload the files in this ZIP to the Netlify site (index.html must be at the root).
2. In Supabase SQL Editor, run order_rpc_permissions.sql once.
3. Test with one real cart item.
