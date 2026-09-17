# Vierra Property Brokers — Lead Tracker

A full-stack app for a 3-role brokerage workflow: **Admin → Team Lead → Property Consultant**, plus a scoped **Technical** role for ops/support.

## What's inside

- **Backend**: Node.js + Express + Prisma (PostgreSQL)
- **Frontend**: React + Vite, served by the same Express server in production
- **Auth**: simple email/password login with JWT — no self-signup. Admin is seeded once; Team Leads are created by Admin; Property Consultants are created by their Team Lead (or by Admin, who then picks which Team Lead they report to).
- Investor Profile qualification form, weekly Mon–Sun 11:00–22:00 booking grid (past slots are blocked, both in the UI and on the server), a points ledger, a weekly qualified-leads goal that resets automatically and still shows last week, auto-created Team Lead follow-up reminders with one-click WhatsApp/email/Add-to-Calendar links, a real weekly booking calendar for Admin and Team Lead, Admin filtering + CSV export, KPI cards and charts on every dashboard, search on every table, and Google Calendar OAuth (optional, see below).

## Project layout

```
vierra-app/
  server/     Express API + Prisma schema
  client/     React app (Vite), including the Vierra logo assets in client/public/
```

## 1. Run it locally

```bash
# from the vierra-app folder
npm run install:all

cp server/.env.example server/.env
# edit server/.env: set DATABASE_URL to a real Postgres, and JWT_SECRET to any long random string

cd server
npx prisma migrate dev --name init   # creates every table, including the new
                                       # supervisorId / googleRefreshToken columns
npm run seed                          # creates the one Admin account
cd ..

npm run dev:server     # starts the API on :4000
npm run dev:client     # in a second terminal, starts the frontend on :5173
```

Log in with the email/password printed by `npm run seed`.

**If you're upgrading from an earlier copy of this app** (schema already has `User`/`Lead`/etc. tables from before): just run `npx prisma migrate dev --name add_supervisor_technical_google` again from `server/` — Prisma will add the new columns (`supervisorId`, `googleRefreshToken`, `googleConnectedAt`, the `TECHNICAL` role) without touching your existing data.

From there: Admin creates a Team Lead → Team Lead creates a Property Consultant (or Admin creates one and assigns a Team Lead) → Property Consultant logs in and adds a lead → it shows up immediately on that Team Lead's dashboard with a reminder already queued.

## 2. Google Calendar (optional)

The "Link Google Calendar" button on **Admin → Team & Calendar** needs real Google OAuth credentials to do anything — without them it now tells you so clearly instead of doing nothing:

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials), create a project, enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External is fine; add your own email as a test user while it's unpublished).
3. Create an **OAuth Client ID**, type "Web application". Add an Authorized redirect URI matching `GOOGLE_REDIRECT_URI` below.
4. Fill these into `server/.env`:
   ```
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   GOOGLE_REDIRECT_URI="http://localhost:4000/api/integrations/google/callback"
   FRONTEND_URL="http://localhost:5173"
   ```
5. Restart the server and click "Link Google Calendar" again.

This isn't required for anything else in the app — Team Lead's WhatsApp, Email, and "Add to Calendar" reminder buttons all work with zero configuration, since they're simple `wa.me` / `mailto:` / Google Calendar quick-add links, not API calls.

## 3. Deploy (Railway — easiest path)

This app is built so the **whole thing deploys as one service** — the API and
the built frontend are served from the same Express process, same URL, so
there's no separate frontend host and no CORS configuration to fight with.

1. Push this folder to a GitHub repo.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Add a **PostgreSQL** plugin to the project — Railway injects `DATABASE_URL` automatically.
4. In the service's **Variables** tab, add:
   - `JWT_SECRET` — any long random string
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (optional — otherwise the defaults in `.env.example` are used)
   - `FRONTEND_URL` — your Railway app URL, e.g. `https://your-app.up.railway.app` (needed for Google OAuth redirects; harmless to set even if you skip Google)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (optional — see section 2 above; use your Railway URL + `/api/integrations/google/callback`)
5. Set the **Build Command**:
   ```
   npm run install:all && npm run build && npx prisma migrate deploy --schema=server/prisma/schema.prisma
   ```
6. Set the **Start Command**:
   ```
   npm start
   ```
7. Deploy. Once it's live, open a Railway **Shell** (or run it once from the build step) and run:
   ```
   npm run seed
   ```
   to create the Admin account.
8. Railway gives you a live `https://your-app.up.railway.app` URL immediately. Attach a custom domain later if you want one — same process either way.

Render works the same way (Web Service + Postgres add-on, same build/start commands).

## Notes on what's intentionally minimal

- No password reset flow, no email verification, no 2FA — accounts are created
  by Admin/Team Lead directly, matching how you described the org working.
- Booking has no PATCH/DELETE route by design — once a slot is booked, there's
  no way to un-book it through the API, which is what makes it permanent rather
  than just a status flag someone could flip later. Past slots are rejected
  both in the UI and on the server, so this can't be worked around by editing
  requests directly either.
- WhatsApp and the "Add to Calendar" reminder link use `wa.me` and Google
  Calendar's quick-add URL rather than paid/authenticated APIs — no Meta
  Business verification or OAuth needed to get these working today. Only the
  optional "Link Google Calendar" button (for syncing bookings automatically)
  needs real Google OAuth credentials, and it tells you clearly if they're
  missing instead of silently doing nothing.
- The Technical role deliberately has no access to lead or investor data —
  it's scoped to system counts and integration status only.
