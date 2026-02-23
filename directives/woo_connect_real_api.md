# Switch OPS App to Real WooCommerce API

## Goal
Replace the current clone/test WooCommerce connection with the **real** WooCommerce store so Supabase is populated with real orders, products, and schools. No mistakes—real data only.

## Current Setup (Summary)
- **WooCommerce**: Credentials in `ops-app/.env.local` — `WOO_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET`. Optional: `WOO_SYNC_ENABLED` (outbound status updates), `WOO_WEBHOOK_SECRET` (incoming webhooks).
- **Supabase**: Same project for both clone and real; data is identified by `woo_order_id` and `products.woocommerce_id`. Orders and order_items are synced from WooCommerce; products can be synced via `scripts/sync-woo.ts` or webhooks.
- **Sync flows**:
  - **Pull (orders)**: `POST /api/woo/pull-sync` — fetches orders from WooCommerce, upserts into `orders` and `order_items`. Matches products by `products.woocommerce_id`. Sidebar "SYNC" / "FULL" triggers this.
  - **Products + schools**: `scripts/sync-woo.ts` — fetches WooCommerce products (and creates schools from categories), upserts products with `woocommerce_id`.
  - **Outbound (status)**: `POST /api/woo/sync` — updates WooCommerce order status; only runs when `WOO_SYNC_ENABLED=true`.
  - **Webhooks**: Orders and products from WooCommerce can push to `/api/webhooks/woocommerce/orders` and `/api/webhooks/woocommerce/products`; require `WOO_WEBHOOK_SECRET`.

## Safe Migration Procedure

### Phase 1: Prepare (no destructive changes)
1. **Backup** (recommended): In Supabase Dashboard → Table Editor, export or note row counts for `orders`, `order_items`, `products`, `schools`. Or use SQL: `SELECT 'orders', COUNT(*) FROM orders UNION ALL SELECT 'order_items', COUNT(*) FROM order_items UNION ALL SELECT 'products', COUNT(*) FROM products UNION ALL SELECT 'schools', COUNT(*) FROM schools;`
2. **New credentials**: User provides real WooCommerce API URL, Consumer Key, and Consumer Secret. Do **not** delete old keys until migration is verified.
3. **Update env**: In `ops-app/.env.local`, set:
   - `WOO_URL` = real store URL (e.g. `https://schooluniformsolutions.com.au`)
   - `WOO_CONSUMER_KEY` = real key
   - `WOO_CONSUMER_SECRET` = real secret
   - Leave `WOO_SYNC_ENABLED` **false** until Phase 3 is done (so we don’t push status changes to real store during migration).
   - `WOO_WEBHOOK_SECRET` = set when configuring webhooks on the real store (Phase 3).

### Phase 2: Replace data with real WooCommerce data
To avoid mixing clone and real data, clear WooCommerce-sourced data then re-sync from the real API.

**Option A — Full reset (recommended for “replace everything with real data”)**
1. **Clear in this order** (to respect foreign keys):
   - Delete all `order_items` (or `TRUNCATE order_items CASCADE` if available).
   - Delete all `orders`.
   - Delete all `products` (or only rows where `woocommerce_id IS NOT NULL` if you want to keep manual products).
   - Optionally delete all `schools` if you want schools to come only from real WooCommerce categories.
2. **Sync products and schools from real WooCommerce**:
   - From repo root: `cd ops-app && npx ts-node scripts/sync-woo.ts` (or `tsx scripts/sync-woo.ts`). Ensure `.env.local` already has the **real** WooCommerce credentials. This creates schools from product categories and upserts products with `woocommerce_id`.
3. **Sync orders from real WooCommerce**:
   - Trigger a **full** pull: in the OPS app UI, use the sidebar “FULL” sync (or `POST /api/woo/pull-sync` with body `{ "fullSync": true }`). This paginates through all orders and upserts them. Order items are linked to products by `product_id` → `products.woocommerce_id`.

**Option B — Softer reset (keep schools, replace orders and products)**
1. Delete `order_items` then `orders`.
2. Delete products where `woocommerce_id IS NOT NULL` (keeps any manual products without a Woo id).
3. Run `scripts/sync-woo.ts` (real credentials) to repopulate products and create/link schools.
4. Run full pull-sync as above.

### Phase 3: Verify and enable live behaviour
1. **Verify in OPS app**: Check Overview, Orders, Digital Stock, Schools. Confirm orders and products match the real store (spot-check order numbers and product names).
2. **Enable outbound sync** (when ready to push status changes to real WooCommerce): Set `WOO_SYNC_ENABLED=true` in `.env.local` and restart the app.
3. **Webhooks** (optional but recommended for real-time updates): In the **real** WooCommerce admin → Settings → Advanced → Webhooks, add:
   - Order updated: URL = `https://<your-ops-app-domain>/api/webhooks/woocommerce/orders`, secret = same value as `WOO_WEBHOOK_SECRET`.
   - Product updated: URL = `https://<your-ops-app-domain>/api/webhooks/woocommerce/products`, secret = same. Set `WOO_WEBHOOK_SECRET` in `.env.local` to that secret.

## Edge cases and pitfalls
- **Products without `woocommerce_id`**: Manual products (e.g. created in Digital Stock) have `woocommerce_id` null. Order line items may have `product_id` null if the WooCommerce product isn’t in Supabase; name/sku are still stored on the line item.
- **School matching**: Pull-sync and sync-woo derive school from product categories or first line item’s product. Ensure real store uses category names that match or can map to schools.
- **Idempotency**: Orders are upserted on `woo_order_id`; products on `woocommerce_id`. Re-running sync is safe; duplicate rows are not created.
- **Sync script**: `scripts/sync-woo.ts` uses `.env.local` and both WooCommerce and Supabase. Run from `ops-app` with real credentials; if the script has different column names (e.g. `woo_product_id` in types vs `woocommerce_id` in DB), the actual DB column is `woocommerce_id` per `supabase/schema.sql`.

## Do not
- Remove or overwrite `.env.local` without backing up current values.
- Set `WOO_SYNC_ENABLED=true` until you’ve verified that orders in the app are the real store’s orders.
- Point real WooCommerce webhooks at the app until `WOO_WEBHOOK_SECRET` is set and the app is deployed and reachable.

## Checklist (for user/agent)
- [ ] Backup or record row counts (orders, order_items, products, schools).
- [ ] Add real WooCommerce URL, Consumer Key, Consumer Secret to `ops-app/.env.local`.
- [ ] Clear order_items → orders → products (and optionally schools) per Option A or B.
- [ ] Run `scripts/sync-woo.ts --products-only` from `ops-app` to sync products and schools from real WooCommerce (orders are synced via app FULL sync).
- [ ] Run full pull-sync (FULL button or POST with `fullSync: true`).
- [ ] Verify data in the app.
- [ ] Set `WOO_SYNC_ENABLED=true` when ready to push status updates.
- [ ] Configure webhooks on real WooCommerce and set `WOO_WEBHOOK_SECRET` if using webhooks.
