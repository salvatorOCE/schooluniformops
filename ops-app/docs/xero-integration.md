# Xero financial integration

The ops app can create Xero sales invoices from **School Bulk Orders**. Products and schools are linked to Xero Items and Contacts so invoices are created with the correct line items and "Bill To" contact.

## Environment variables

Set these in your deployment (e.g. Netlify / `.env.local`):

- `XERO_CLIENT_ID` — From [Xero Developer](https://developer.xero.com/) app credentials
- `XERO_CLIENT_SECRET` — App secret
- `XERO_REDIRECT_URI` — Optional; used if you implement OAuth callback (e.g. `https://your-app.netlify.app/api/xero/callback`)
- `XERO_REFRESH_TOKEN` — Obtained after one-time OAuth flow (see below)
- `XERO_TENANT_ID` — Xero organisation/tenant ID (from the same OAuth flow)

Never expose refresh or access tokens to the client.

## Getting a refresh token (one-time)

1. Create an app at [developer.xero.com](https://developer.xero.com/) and note Client ID and Secret.
2. **Option A (in-app):** With the ops app running locally and redirect URI set to `http://localhost:3000/api/xero/callback` in the Xero app config, open **GET /api/xero/connect** in your browser (e.g. `http://localhost:3000/api/xero/connect`). Sign in to Xero, authorise the app, and you’ll be redirected to a page that shows your **refresh token** and **tenant ID**. Copy them into `.env.local`.
3. **Option B:** Use the [Xero OAuth2 Playground](https://developer.xero.com/app/xero-api-oauth2-playground) (or a small script) to complete the OAuth flow and get the authorisation code, then exchange it for access + refresh tokens.
4. Store the **refresh token** and **tenant ID** in your env. The refresh token is long-lived and is used by the server to get new access tokens when creating invoices.

## Flow

1. **Bulk order** — User creates or opens a bulk order (order number like `BULK-…`) in **School Bulk Orders**.
2. **Create Xero Invoice** — User clicks "Create Xero Invoice". The app:
   - Loads the order, its line items, and the school.
   - Resolves **Contact**: uses `school.xero_contact_id` if set, otherwise creates a Xero Contact from school name/code and saves the new Contact ID back to the school.
   - Builds **line items**: for each order line, uses `product.xero_item_code` if set, else `order_item.sku` as the Xero Item Code. Quantity and unit price come from the order.
   - Calls Xero `createInvoices` (ACCREC, AUTHORISED).
   - Saves `xero_invoice_id` and `xero_invoice_number` into `order.meta`.
3. **View in Xero** — Once created, the same order shows a "View in Xero" link that opens the invoice in Xero.

## Mapping

- **Products** — On **All Products**, edit a product and set **Xero Item Code** (e.g. `EDPS-FL02`, `FLAX-CJ1320`) to match the Code in your Xero Items list. If left blank, the product’s SKU is used.
- **Schools** — On **All Schools**, use the pencil next to **Xero Contact ID** to set the Xero Contact UUID for that school. If left blank, the first time you create an invoice for that school the app creates a Contact in Xero and stores its ID.

## API

- `GET /api/xero/connect` — Redirects to Xero’s OAuth consent page. After authorising, Xero redirects to `/api/xero/callback`, which shows the refresh token and tenant ID to copy into `.env.local`. Use when the OAuth2 Playground is unavailable.
- `GET /api/xero/callback` — OAuth callback; do not open directly. Xero redirects here after the user authorises.
- `POST /api/xero/create-invoice` — Body: `{ "orderId": "<uuid>" }`. Creates the invoice and returns `{ success, xeroInvoiceId, xeroInvoiceNumber, url }`. Returns 409 if the order already has a Xero invoice.
- `PATCH /api/schools/[id]` — Body: `{ "xero_contact_id": "<uuid>|null" }`. Updates the school’s Xero Contact ID.

## Files

- `src/lib/xero-client.ts` — Server-side Xero client (refresh token, getContact, createContact, createInvoice).
- `src/app/api/xero/connect/route.ts` — Starts OAuth flow (redirects to Xero consent).
- `src/app/api/xero/callback/route.ts` — OAuth callback; displays refresh token and tenant ID.
- `src/app/api/xero/create-invoice/route.ts` — Create-invoice handler.
- `src/app/api/schools/[id]/route.ts` — School update (e.g. xero_contact_id).
- DB: `products.xero_item_code`, `schools.xero_contact_id`, `orders.meta.xero_invoice_id` / `xero_invoice_number`.

## Troubleshooting

- **"Xero env missing"** — Ensure all four env vars are set.
- **"Xero token refresh failed"** — Refresh token may be revoked or expired. Re-run the OAuth flow and update `XERO_REFRESH_TOKEN` (and `XERO_TENANT_ID` if the org changed).
- **"Invalid line: SKU … has no Xero item code"** — Set **Xero Item Code** on the product (Products page, Edit) to match an existing Xero Item Code, or ensure the product’s SKU matches a Xero Item Code.
- **"Xero invoice creation failed"** — Check Xero API error in response `detail`. Common causes: invalid Item Code, missing Contact, or auth/tenant issue.
