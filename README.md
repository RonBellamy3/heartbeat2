# Heartbeat

_For the love of music._

A social album-logging app — log the albums you listen to, rate them (half-star
increments), write reviews, and browse what everyone else is spinning.

This is a **v1 / MVP slice** of a larger planned product (see `HEARTBEAT_SPEC.md`
style notes in the project history for the full roadmap — concerts, video
uploads, follows/likes/comments, releases & tours calendars, lists, and
moderation are intentionally deferred to later phases). What's here:

- Email/password auth (NextAuth / Auth.js), Google OAuth is wired up but optional
- Live album search backed by MusicBrainz, with Cover Art Archive artwork
- Logging an album: half-star rating, review text, listened-on date, relisten
  and spoiler flags
- Album pages with aggregate rating and everyone's reviews
- Profile pages showing a user's logged albums
- Dark-mode-first, mobile-first UI with a bottom tab bar and a floating "+"
  log button

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 (Postgres via
`@prisma/adapter-pg`) · NextAuth v5 · Zod · MusicBrainz + Cover Art Archive APIs.
Deployed on Railway (Postgres plugin + web service, built from this repo).

## Getting started

You'll need a Postgres database to develop against — either run one locally
(Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`) or
point `DATABASE_URL` at the same Railway Postgres instance the deployed app
uses (fine for a solo/early-stage project).

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and secrets (see below)
npm run db:deploy      # pushes the Prisma schema to your database
npm run db:seed        # ~30 well-known albums with real MusicBrainz metadata
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up for a real
account — the seed script only populates the album catalog, never any user
accounts, so there's nothing fake to log in as.

## Environment variables

See `.env.example` for the full list. The important ones for local dev:

| Variable | Required? | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | Any random string in dev; generate a real one for prod with `openssl rand -base64 32` |
| `AUTH_URL` | yes | Base URL of the app, e.g. `http://localhost:3000` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | no | Leave blank to disable Google sign-in; the credentials (email/password) flow works without it |
| `MUSICBRAINZ_USER_AGENT` | recommended | MusicBrainz asks that all clients identify themselves; format is `AppName/Version (contact)` |

Everything under "Phase 3" in `.env.example` (Spotify/Ticketmaster/Bandsintown)
is unused by this slice — the schema has room for it, but no code reads those
vars yet.

## How the pieces fit together

- **Auth** (`src/auth.ts`) — NextAuth v5, JWT sessions (required for the
  Credentials provider), bcrypt-hashed passwords (cost 12). Signup, email
  verification, and password reset live under `src/app/api/auth/*` as plain
  Route Handlers rather than NextAuth's built-in pages, so they can be
  validated with Zod and rate-limited independently.
- **Mailer** (`src/lib/mailer.ts`) — logs verification/reset links to the
  console in dev. Swap the body of `sendMail` for a real provider (Resend,
  Postmark, SES...) for production; nothing else needs to change.
- **Rate limiting** (`src/lib/rate-limit.ts`) — in-memory fixed-window
  limiter. Fine for a single dev/small-prod process; swap for a shared store
  (Redis/Upstash) once you run more than one server instance.
- **MusicBrainz integration** (`src/lib/musicbrainz.ts`) — a promise-chain
  queue throttles requests to ~1/sec as MusicBrainz's usage policy asks.
  Search results are cached in the `MusicBrainzSearchCache` table for 24h so
  repeat searches don't re-hit the API. If MusicBrainz is unreachable, the
  search API falls back to a stale cache entry (or an empty result with
  `degraded: true`) instead of failing the request — the UI shows a friendly
  "search unavailable" message and still lets you add an album manually.
- **Albums are cached locally on first use** — search results aren't
  persisted until someone actually picks one (`POST /api/albums/resolve`)
  or logs it, at which point an `Album` row is upserted keyed by
  `musicbrainzId`.
- **Authorization** — every mutation (`POST /api/logs`, `PATCH`/`DELETE
  /api/logs/[id]`, album creation) re-checks the session server-side and, for
  edits/deletes, verifies the log belongs to the requesting user before
  touching it. Client-sent IDs are never trusted on their own.
- **Rendering user content safely** — review text and bios are rendered as
  plain React children (never `dangerouslySetInnerHTML`), so they're
  HTML-escaped by default; no sanitizer library was needed for this slice.
- **Security headers** — set globally in `next.config.ts` (CSP,
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`).

## Database

Prisma 7 no longer allows a connection URL directly in `schema.prisma`; the
app constructs a `PrismaClient` with an explicit driver adapter
(`src/lib/prisma.ts`, using `@prisma/adapter-pg` against `DATABASE_URL`).

There's no committed migration history yet — `npm run db:deploy` runs
`prisma db push`, which syncs the schema straight onto whatever database
`DATABASE_URL` points at. That's fine while the schema is still moving fast
with no production data to protect. Once real user data exists, switch to
`prisma migrate dev` locally to generate reviewable migration files, and run
`prisma migrate deploy` (not `db push`) in production so schema changes are
explicit and never silently drop a column.

## Testing the critical paths manually

There's no automated test suite in this slice yet. To sanity-check the things
that matter most:

- **Auth**: sign up, sign out, sign back in; try logging in with a wrong
  password 6 times in a row and confirm the 6th attempt is rejected before
  even checking the password (rate limit).
- **Authorization**: sign up two accounts, grab one user's log ID from the
  network tab while logged in as the other, and confirm `PATCH`/`DELETE
  /api/logs/<their-id>` returns 403 rather than succeeding.
- **Upload/search resilience**: temporarily set `MUSICBRAINZ_USER_AGENT` to
  something and block outbound network to `musicbrainz.org` — the search UI
  should show the "unavailable" message and the manual-add fallback instead
  of crashing.

## What's deliberately not here yet (see product spec for full roadmap)

Concerts + video upload, follows/likes/comments, notifications, releases &
tours calendars, lists & favorites, admin/moderation dashboard, blocking,
reporting, and private accounts. The Prisma schema already has models for
most of these so they can be layered in without a rewrite.
