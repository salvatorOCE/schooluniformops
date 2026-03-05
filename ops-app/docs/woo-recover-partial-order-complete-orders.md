# Recover orders stuck in "Partial Order Complete" (list empty)

WooCommerce can show "Partial Order Complete (2)" but display "No items found" in the list. **Cause:** the status slug was too long. WordPress limits post status slugs to **20 characters** (including `wc-`). Using `wc-partial-order-complete` (23 chars) breaks the admin list. Use slug **`wc-partial-complete`** (18 chars) in your WPCode snippet — see `woo-custom-status-partial-order-complete-wpcode.php`. After fixing the snippet, new orders set to Partially Complete will appear in the list. To recover existing stuck orders, move them back to Processing (e.g. via the recovery API below).

## Option 1: Ops app recovery API (easiest)

With the ops app running and logged in:

**1. List orders in Partial Order Complete**

In browser dev tools (Console) or a REST client, same origin as the app:

```http
GET /api/woo/recover-partial-orders
```

Response example: `{ "orders": [ { "id": 12345, "number": "180", ... }, ... ] }`. Note the `id` values (WooCommerce order IDs).

**2. Move each order back to Processing**

```http
POST /api/woo/recover-partial-orders
Content-Type: application/json

{ "wooOrderId": 12345 }
```

Repeat for each order (e.g. SUS-0180 and SUS-0182). Use the `id` from step 1; you can match by `number` (180, 182) to know which is which. After that they will appear under the "Processing" tab in WooCommerce.

## Option 2: WooCommerce REST API (curl)

Use your WooCommerce API credentials (same as in the ops app `.env`: `WOO_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET`).

**1. List orders with status `partial-order-complete`**

```bash
# Replace YOUR_SITE, KEY, SECRET with your values
curl -s -u "KEY:SECRET" "https://YOUR_SITE/wp-json/wc/v3/orders?status=partial-order-complete" | jq '.[].id, .[].number'
```

Or in a browser/Postman: GET  
`https://YOUR_SITE/wp-json/wc/v3/orders?status=partial-order-complete`  
with Basic Auth (consumer key : consumer secret).

Note the order **IDs** (numeric) for SUS-0180 and SUS-0182.

**2. Move each order back to "Processing" so it shows in the list**

```bash
# Replace ORDER_ID with the numeric WooCommerce order ID (e.g. from step 1)
curl -X PUT -u "KEY:SECRET" \
  "https://YOUR_SITE/wp-json/wc/v3/orders/ORDER_ID" \
  -H "Content-Type: application/json" \
  -d '{"status":"processing"}'
```

After that, the order will appear under the "Processing" tab. You can then change it again in WooCommerce or the ops app as needed.

## Option 3: From the ops app (browser console)

While logged into the ops app, open the Orders page, open DevTools → Console, and run:

```javascript
// List orders stuck in Partial Order Complete
const list = await fetch('/api/woo/recover-partial-orders', { credentials: 'include' }).then(r => r.json());
console.log(list.orders);

// Then for each order, e.g. id 12345 and 12346:
await fetch('/api/woo/recover-partial-orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ wooOrderId: 12345 })
});
await fetch('/api/woo/recover-partial-orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ wooOrderId: 12346 })
});
```

## Why this happens

The custom status "Partial Order Complete" is registered (WPCode snippet is active), so orders can be set to that status. Some WooCommerce versions or list implementations do not display orders with custom statuses correctly in the filtered list, so the count shows (2) but the table is empty. Moving the order to a standard status (e.g. `processing`) makes it visible again.
