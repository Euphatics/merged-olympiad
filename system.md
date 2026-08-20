# System & Deployment Guide

Target: **Hostinger** — the SPA served as static files from `public_html`, the
API running as a Hostinger Node.js app, and MySQL from the same hosting plan.

> **Plan requirement.** Node.js apps run only on Hostinger's **Business** and
> **Cloud** plans. Premium and Single shared plans cannot run Node at all, so
> the API would have to live elsewhere. Supported Node versions: 18, 20, 22, 24.

---

## 1. Architecture on Hostinger

| Component | Where | Notes |
|---|---|---|
| Frontend | `public_html/` on `ntiolympiad.in` | Static build output, including `.htaccess` |
| Backend | Node.js app on `api.ntiolympiad.in` | Entry point `dist/index.js` |
| Database | Hostinger MySQL | Created in hPanel → Databases |
| File storage | Cloudinary | Not the server's disk — see §6 |

---

## 2. Environment variables

### Backend

Set these in hPanel → your Node.js app → Environment variables. Never commit
them. The server validates all of them at boot and refuses to start if any are
missing or malformed, listing every problem at once.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `PORT` | — | Defaults to 5000. Hostinger may assign this; leave unset if so. |
| `DATABASE_URL` | yes | `mysql://user:pass@host:3306/dbname?connection_limit=5&pool_timeout=20` — see §7 |
| `JWT_TOKEN` | yes | **Minimum 32 characters.** Generate with `npm run hash-password`. |
| `ADMIN_USERNAME` | yes | Admin login name |
| `ADMIN_PASSWORD_HASH` | yes | bcrypt hash — see §3 |
| `CLIENT_URL` | yes | `https://ntiolympiad.in` — drives CORS and email links |
| `ADDITIONAL_ORIGINS` | — | Comma-separated extra CORS origins (e.g. `https://www.ntiolympiad.in`) |
| `COOKIE_DOMAIN` | yes in prod | `.ntiolympiad.in` — the leading dot covers both apex and `api.` |
| `COOKIE_SAMESITE` | — | `lax` when site and API share a domain. `none` only across different domains, and it requires HTTPS. |
| `COOKIE_SECURE` | — | Leave empty to follow `NODE_ENV` |
| `TRUST_PROXY` | yes | `1` behind Hostinger. **Rate limiting is wrong without it** — see §7 |
| `CLOUDINARY_CLOUD_NAME` | yes | |
| `CLOUDINARY_API_KEY` | yes | |
| `CLOUDINARY_API_SECRET` | yes | |
| `GOOGLE_APPS_SCRIPT_URL` | — | Unset: verification links are logged, not emailed |
| `LOG_LEVEL` | — | `info` |

`backend/.env.example` is the canonical template.

### Frontend

Read at **build time** and baked into the bundle. Changing one requires a
rebuild and redeploy — there is no runtime configuration.

| Variable | Notes |
|---|---|
| `VITE_API_URL` | `https://api.ntiolympiad.in` — no trailing slash |
| `VITE_SITE_URL` | `https://ntiolympiad.in` |

Copy `frontend/.env.production.example` to `frontend/.env.production` before
building for release. That file is gitignored.

---

## 3. Generating credentials

```bash
cd backend
npm run hash-password -- "your-admin-password"
```

Prints a bcrypt `ADMIN_PASSWORD_HASH` and a fresh 64-character `JWT_TOKEN`.

When pasting the hash into hPanel, paste it **exactly**, including every `$`.
Some shells and panels strip or expand `$`, which produces a hash that silently
never matches and an admin login that always fails.

> Changing `JWT_TOKEN` invalidates all existing sessions — every school and
> admin is signed out. That is expected, and is the correct response to a weak
> or leaked secret.

---

## 4. Local development

Requires Node.js 20+.

```bash
git clone <repository-url>
cd merged-olympiad
npm install                       # installs both workspaces

cp backend/.env.example backend/.env
# fill in DATABASE_URL, JWT_TOKEN, ADMIN_*, CLOUDINARY_*

npm run db:deploy                 # apply migrations
npm run dev                       # backend :5000 and frontend :5173 together
```

`frontend/.env.development` already points at `http://localhost:5000`.

Useful scripts, all from the repository root:

| Command | Does |
|---|---|
| `npm run dev` | Both servers, with reload |
| `npm run verify` | Typecheck, lint, test, build — what CI runs |
| `npm run build` | Production build of both |
| `npm run db:migrate` | Create a migration from schema changes |
| `npm run db:deploy` | Apply pending migrations |
| `npm run db:studio` | Browse the database |

---

## 5. Database setup

### A fresh database

```bash
npm run db:deploy
```

Applies every migration in order and creates the full schema.

### An existing database that predates these migrations

The tables already exist but Prisma has no migration history for them, so it
would try to create everything again. Mark the baseline as applied first:

```bash
cd backend
npx prisma migrate resolve --applied 20260101000000_init
npx prisma migrate deploy
```

The first command only records that the baseline is already in place; it runs
no SQL against your tables. The second then applies just the newer migration,
which adds the `pyqs` table and `gallery_images.public_id`.

Check the current state at any time with `npx prisma migrate status`.

> Use `prisma migrate deploy`, never `prisma db push`, against production —
> `db push` reconciles by altering whatever it finds and can drop columns
> without warning.

---

## 6. Deployment

### Backend — Hostinger Node.js app

1. hPanel → **Website** → **Node.js** → create an application.
2. Point it at the `api.ntiolympiad.in` subdomain.
3. Node version **22**, application root `backend`.
4. Entry file: `dist/index.js`.
5. Add every backend environment variable from §2.
6. Deploy from GitHub (redeploys on push) or upload a `.zip`.
7. Build command: `npm install && npm run build`
   (this runs `prisma generate` and then `tsc`).
8. Apply migrations — §5.
9. Confirm: `curl https://api.ntiolympiad.in/health` → `{"status":"ok",…}`

### Frontend — static files in `public_html`

```bash
cd frontend
cp .env.production.example .env.production   # then edit the URLs
npm run build
```

Upload the **contents** of `frontend/dist/` into `public_html/`.

`dist/.htaccess` is generated by the build and **must be uploaded with the
rest** — it provides SPA routing, the CSP, HSTS, cache headers and compression.
It begins with a dot, so enable "show hidden files" in File Manager, or the
site will 404 on every route except `/`.

The CSP's `connect-src` is written from `VITE_API_URL` at build time. If the API
moves, rebuild — editing `.htaccess` by hand will drift from the bundle.

---

## 7. Notes and pitfalls

**`TRUST_PROXY` is not optional.** Behind Hostinger's proxy, every request
appears to originate from the proxy's IP. Without `TRUST_PROXY=1`,
`express-rate-limit` puts all visitors in one bucket, so 30 failed logins from
anyone lock out everybody.

**Cap the database connection pool.** Prisma defaults to
`cpu_count × 2 + 1` connections. Hostinger's shared MySQL enforces a low
`max_user_connections`, and exceeding it does not fail cleanly — it appears as
intermittent 500s under modest load. Append
`?connection_limit=5&pool_timeout=20` to `DATABASE_URL`. Raise the limit only
after checking the cap your plan actually allows:

```sql
SHOW VARIABLES LIKE 'max_user_connections';
```

**Cookies across subdomains.** `ntiolympiad.in` and `api.ntiolympiad.in` are
different origins but the same site, so `COOKIE_SAMESITE=lax` with
`COOKIE_DOMAIN=.ntiolympiad.in` works and is the safer default. Only use
`none` if the two ever end up on genuinely different domains.

**Never store uploads on the server's disk.** Application storage does not
survive a redeploy. Everything goes to Cloudinary. Gallery images previously
went to `uploads/` and vanished on every deploy, leaving rows pointing at files
that no longer existed; those rows are now filtered out of `GET /api/gallery`
and should be re-uploaded.

**The frontend needs a rebuild to change its API URL.** `VITE_*` values are
compile-time constants, not runtime config.

**Database backups.** Take a dump before applying migrations:

```bash
mysqldump -h <host> -u <user> -p <database> > backup-$(date +%F).sql
```

---

## 8. Post-deployment checklist

- [ ] `GET https://api.ntiolympiad.in/health` returns `{"status":"ok"}`
- [ ] `npx prisma migrate status` reports no pending migrations
- [ ] The site loads over HTTPS, and HTTP redirects to it
- [ ] Refreshing a deep link such as `/school-panel` loads the app, not a 404
- [ ] No CSP violations in the browser console on the home page
- [ ] Admin login works at `/admin/login`
- [ ] Registering a school sends a verification email
- [ ] A school can upload an `.xlsx` student list
- [ ] A payment proof upload appears in the admin panel
- [ ] A gallery upload renders from a `res.cloudinary.com` URL
- [ ] `JWT_TOKEN` is at least 32 characters and was not reused from development
