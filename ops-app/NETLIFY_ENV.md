# Netlify environment variables

For the ops app to show **orders and data** on Netlify, the same environment variables used locally must be set in Netlify.

## Where to set them

1. Netlify dashboard → your site → **Site configuration** → **Environment variables**
2. Add each variable (or **Import from .env** and paste from your local `ops-app/.env.local`).

## Required variables

| Variable | Purpose |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only; used for orders, history, sync) |

## Optional (if you use WooCommerce sync)

| Variable | Purpose |
|----------|--------|
| `WOO_URL` | WooCommerce site URL |
| `WOO_CONSUMER_KEY` | WooCommerce API consumer key |
| `WOO_CONSUMER_SECRET` | WooCommerce API consumer secret |

## After changing variables

- Trigger a **new deploy** (e.g. **Deploys** → **Trigger deploy** → **Deploy site**) so the build and runtime use the new values.

If these are missing, the app will build and load but **orders, exceptions, and Recovery Center data will be empty** on Netlify while working on localhost.
