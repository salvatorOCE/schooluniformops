# Development & Testing Without Affecting the Real Website

## Goal
Make app changes, upgrades, and tests using the **clone** WooCommerce store and (optionally) a copy of data, so the **real** School Uniform Solutions site is never affected.

## Rule of thumb
- **Real store** = live customers and orders. Only use when you're doing real ops work.
- **Clone store** = safe sandbox. Use for development, testing, and trying new features.

---

## Option A: Two env files + switch script (recommended)

### One-time setup

1. **Save your current production config**
   ```bash
   cd ops-app
   cp .env.local .env.local.real
   ```
   (Your real store URL and API keys are already in `.env.local`; now they’re backed up in `.env.local.real`.)

2. **Create a clone config**
   ```bash
   cp .env.local .env.local.clone
   ```
   Edit `.env.local.clone` and set only the WooCommerce section to your **clone** store:
   - `WOO_URL` = clone store URL (e.g. `https://schooluniformsolutions-clone.xxx.wpstaqhosting.com`)
   - `WOO_CONSUMER_KEY` = clone consumer key
   - `WOO_CONSUMER_SECRET` = clone consumer secret  
   Keep the same Supabase vars (so you can test with a copy of real data) or point to a separate Supabase project for full isolation.

3. **Optional:** In `.env.local.clone` you can set `WOO_SYNC_ENABLED=true` so you can test **pushing** status updates (Shipped, Completed, etc.) to the clone without ever touching the real store.

### Daily workflow

| What you're doing | Command | Result |
|-------------------|---------|--------|
| **Developing / testing** | `node scripts/switch-woo-env.js clone` then `npm run dev` | App talks to clone store only. Sync and status updates affect only the clone. |
| **Real ops (live)** | `node scripts/switch-woo-env.js real` then `npm run dev` | App talks to real store. Use when you're doing real work. |

Always **restart the app** after switching so Next.js picks up the new env.

### Quick reference

```bash
cd ops-app
node scripts/switch-woo-env.js clone   # safe for testing
node scripts/switch-woo-env.js real  # live website
```

---

## Option B: Separate Supabase for testing (full isolation)

If you want test data completely separate from production:

1. Create a **second Supabase project** (e.g. “OPS App Dev”).
2. In `.env.local.clone`, set:
   - Clone store: `WOO_URL`, `WOO_CONSUMER_KEY`, `WOO_CONSUMER_SECRET`
   - Dev Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. When using clone env, run clean-slate and sync from the clone so the dev DB is filled with clone data. Real Supabase and real store are never touched.

---

## What to avoid

- **Don’t** set `WOO_SYNC_ENABLED=true` while `.env.local` points at the **real** store unless you intend to push status updates to live orders.
- **Don’t** run sync or “FULL” sync with real credentials if you’re only trying to test; use clone env so changes stay in the clone.
- **Don’t** point the **real** store’s webhooks at a dev or test URL unless you understand the impact (e.g. duplicate events). Prefer having the clone store send webhooks to your test app.

---

## Checklist

- [ ] `.env.local.real` created and contains real store credentials (backup).
- [ ] `.env.local.clone` created and contains **clone** store URL and API keys.
- [ ] For testing: run `node scripts/switch-woo-env.js clone` and restart the app.
- [ ] For live work: run `node scripts/switch-woo-env.js real` and restart the app.
