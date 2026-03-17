# IPL Fantasy App

Track your friends' Dream11 IPL fantasy contest offline. Leaderboard, match history, cumulative winnings graph, and payout ledger.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase/migrations/001_initial.sql`
3. Create a season: `INSERT INTO seasons (name, start_date, end_date) VALUES ('IPL 2026', '2026-03-22', '2026-06-01');`
4. Copy the season ID and add participants + payout config (see `supabase/seed.sql` for examples)
5. In Supabase Settings → API, copy **Project URL** and **anon public** key

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

**Option A – Frontend only** (no admin API):

```bash
npm run dev
```

**Option B – Full stack** (with admin API, requires [Vercel CLI](https://vercel.com/cli)):

```bash
npm i -g vercel
vercel dev
```

Set env in Vercel: `ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### 4. Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD` (when using password auth)
   - `ADMIN_EMAILS` (optional: comma-separated admin emails for OTP login, e.g. `a@x.com,b@x.com,c@x.com`)
4. Deploy

## Admin

**Auth modes:**
- **Password** (default): Set `ADMIN_PASSWORD` only. Single shared password.
- **Email OTP** (3 admins): Set `ADMIN_EMAILS=email1@x.com,email2@x.com,email3@x.com`. Each admin signs in with a one-time code sent to their email. Free, no SMS cost.

For OTP mode: enable **Email** provider in Supabase Dashboard → Authentication → Providers.

Admin: `/admin` – manage matches, participants, payout config. Public: leaderboard, matches, graph, ledger – no login.
