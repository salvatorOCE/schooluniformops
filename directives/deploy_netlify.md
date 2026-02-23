# Deploy OPS App to Netlify

## Launch v1.0 checklist
1. **Version:** `package.json` is set to `1.0.0`.
2. **Commit & push** your repo (including `netlify.toml` and latest code).
3. **Netlify:** Add new site → Import project → pick your repo.
4. **Base directory:** Set to `ops-app` if the repo root is "School Uniform Solutions".
5. **Env vars:** In Site settings → Environment variables, add all vars from the table below (same as `.env.local`).
6. **Deploy:** Trigger deploy (or push to main). Open the site URL → log in with `sus123` (or your `LOGIN_CODE`).

---

## Goal
Deploy the ops-app (Next.js) to Netlify so it can be used on other devices. The app uses a simple one-code login and requires server-side features (API routes, middleware).

## Prerequisites
- Netlify account
- Repo pushed to GitHub/GitLab/Bitbucket (or deploy from local via Netlify CLI)

## Build config (already in repo)
- `ops-app/netlify.toml`: build command `npm run build`, publish `.next`, plugin `@netlify/plugin-nextjs`
- Next.js is **not** using static export so middleware and API routes work on Netlify

## Steps

### 1. Install Netlify Next.js plugin (optional; Netlify may add it automatically)
```bash
cd ops-app
npm install -D @netlify/plugin-nextjs
```

### 2. Connect repo in Netlify
- Netlify Dashboard → Add new site → Import an existing project
- Connect your Git provider and select the repo
- **Base directory:** If the repo root is the whole "School Uniform Solutions" folder, set Base directory to `ops-app`. If the repo contains only ops-app, leave base directory blank.
- **Build command:** `npm run build` (or leave default)
- **Publish directory:** `.next` (Netlify Next.js plugin usually sets this)

### 3. Environment variables (required)
In Netlify: Site settings → Environment variables → Add the same vars you have in `ops-app/.env.local`:

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (secret) |
| `WOO_URL` | WooCommerce store URL (e.g. https://schooluniformsolutions.com.au) |
| `WOO_CONSUMER_KEY` | WooCommerce API consumer key |
| `WOO_CONSUMER_SECRET` | WooCommerce API consumer secret |
| `WOO_SYNC_ENABLED` | `true` to push status updates to WooCommerce |
| `LOGIN_CODE` | (optional) Access code; defaults to `sus123` if not set |

Add these for **Production** (and optionally for Branch deploys). Then trigger a new deploy.

### 4. Deploy
- Push to your main branch or trigger "Deploy site" in Netlify.
- After deploy, open the site URL. You should see the login page; enter code `sus123` (or your `LOGIN_CODE`) to access the app.

### 5. Optional: custom domain
In Netlify: Domain management → Add custom domain (e.g. ops.schooluniformsolutions.com.au).

## Login
- **Code:** `sus123` unless you set `LOGIN_CODE` in Netlify env.
- Session is stored in an httpOnly cookie (7 days). "Sign out" in the sidebar (or mobile menu) clears it.

## Troubleshooting
- **Build fails:** Ensure Base directory is `ops-app` if the repo root is the parent folder.
- **API / middleware not working:** Confirm `output: 'export'` is **not** in `next.config.ts` (static export disables API routes and middleware).
- **Env not applied:** Redeploy after changing environment variables.
