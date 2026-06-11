# BroSplit

A small Next.js app for splitting expenses within groups. Built with Next.js (App Router), Prisma for data access, NextAuth for authentication, and a flexible database configuration that defaults to local SQLite for development and optionally supports libSQL/Turso in production.

## Features

- User registration and authentication (NextAuth)
- Groups and group memberships
- Create expenses and split amounts among group members
- Prisma ORM with migrations and type-safe client
- Supports local SQLite (dev) and libSQL/Turso (production) via environment variables

## Tech stack

- Next.js (App Router)
- React
- Prisma
- NextAuth
- Tailwind CSS
- TypeScript

## Requirements

- Node.js 18+ (recommended)
- npm, pnpm or yarn
- (Optional) libSQL/Turso account if you want to run with a remote libSQL database in production

## Getting started (local development)

1. Install dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

2. Copy the example env and adjust values

```bash
cp .env .env.local
```

Open `.env.local` and set the following (the repo already includes a `.env` with defaults for local development):

- `DATABASE_URL` — for development this project uses SQLite by default: `file:./dev.db`
- `TURSO_DATABASE_URL` — optional, if you want to use libSQL/Turso instead in non-local environments
- `NEXTAUTH_URL` — e.g. `http://localhost:3000`
- `NEXTAUTH_SECRET` — a secure random string for NextAuth session encryption

3. Generate Prisma client (postinstall runs this automatically)

```bash
npx prisma generate
```

4. Run migrations (creates SQLite db and schema)

```bash
npx prisma migrate dev --name init
```

5. Start dev server

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open http://localhost:3000 in your browser.

## Database configuration

This project is configured to use SQLite locally and can be configured to use libSQL/Turso in other environments.

- Local development (default): `.env` contains `DATABASE_URL="file:./dev.db"` and `prisma/schema.prisma` uses `provider = "sqlite"`.
- Optional production: `prisma.config.ts` will prefer `TURSO_DATABASE_URL` over `DATABASE_URL` when available. The dependencies include `@libsql/client` and `@prisma/adapter-libsql` for libSQL/Turso support.

If you want to switch to Postgres or another provider, update `prisma/schema.prisma` datasource provider and set `DATABASE_URL` accordingly. Then run migrations and `prisma generate`.

## Prisma schema

The Prisma schema is in `prisma/schema.prisma`. Models include `User`, `Group`, `GroupMember`, `Expense`, and `ExpenseSplit`.

## Authentication

NextAuth is wired up in the app route at `src/app/api/auth/[...nextauth]/route.ts`. For local testing, ensure:

- `NEXTAUTH_URL` is set to your dev URL (e.g., `http://localhost:3000`)
- `NEXTAUTH_SECRET` is a long random string

For production, store `NEXTAUTH_SECRET` in your hosting provider secrets and rotate if exposed.

## Notes about Neon / libSQL

- There is no direct `neon` package in `package.json`. The repo contains libSQL/Turso dependencies (`@libsql/client`, `@prisma/adapter-libsql`) and `prisma.config.ts` prefers `TURSO_DATABASE_URL` if provided.
- `package-lock.json` has an indirect reference to `@neon-rs/load` (likely pulled in by a dependency), but the project is not configured to use Neon as the primary DB.

## Environment variables

Minimum env vars for development:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-local-secret"
```

Optional (for libSQL/Turso):

```env
TURSO_DATABASE_URL="file:... or libsql connection string..."
```

## Deployment

Recommended: deploy on Vercel. Add production secrets in Vercel's dashboard (or your provider's secrets manager): `DATABASE_URL` or `TURSO_DATABASE_URL`, and `NEXTAUTH_SECRET`.

Steps:

- Build: `npm run build` (the project runs `prisma generate` during build)
- Ensure your production DB url is set in environment
- Run any necessary migrations on the production DB (if using Postgres/libSQL) before or during deployment

## Backups & migrating off SQLite

- SQLite (`dev.db`) is for local development only. Back it up by copying the file.
- To move to a managed DB (recommended for production):
	1. Update `prisma/schema.prisma` datasource provider and set `DATABASE_URL` to the new DB connection string.
	2. Create a migration and apply it to the new DB.
	3. Export/import data as needed (use `prisma db pull` / `prisma db push` and data migration scripts if required).

## Contributing

- Follow the existing TypeScript and formatting patterns
- Run linters and tests (if added) before PRs

## Troubleshooting

- If you see Prisma client errors, run `npx prisma generate` then restart the dev server.
- If auth sessions fail, verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are correct.

## License

MIT
