# Monorepo: Blush by Mounika (Next.js 15 + Turbo + Supabase)

This monorepo contains two apps and shared packages:

- `apps/ecommerce`: Customer-facing store
- `apps/admin`: Admin dashboard (RBAC)
- `packages/ui`: Shared UI components (Tailwind + ShadCN style)
- `packages/config`: Tailwind preset and shared configs
- `packages/integrations`: Stripe and Shiprocket helpers

## Tech
- Next.js 15 (App Router, React 19)
- TypeScript
- TailwindCSS + ShadCN-style components
- Supabase (Auth + DB)
- Stripe (Payments) and Shiprocket (Shipping/Tracking)
- Turborepo, ESLint, Prettier
- CI/CD for Vercel

## Getting Started

1) Install dependencies (pnpm recommended):

```bash
pnpm install
```

2) Setup environment (create `.env` in the repository root or in each app):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for admin APIs + auth cookie issuance)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SHIPROCKET_API_EMAIL`, `SHIPROCKET_API_PASSWORD`, `SHIPROCKET_WEBHOOK_SECRET`

### Auth (Ecommerce)
Ecommerce uses **Supabase Auth** for **Email/Password**, and then issues an `auth_token` cookie (internal customer id) used by the app APIs.

In Supabase Dashboard:
- **Authentication → Providers**: enable **Email** (and allow signups if you want users to register)
- **Authentication → URL Configuration**: allow redirect URL(s) for password reset:
  - `http://localhost:3000/reset-password`
  - your production equivalent (e.g. `https://your-domain.com/reset-password`)

3) Development:

```bash
pnpm dev
```

Open `http://localhost:3000` for `ecommerce` and `http://localhost:3001` for `admin` (see each app's `package.json`).

4) Build:

```bash
pnpm build
```

## Vercel Monorepo
Create two Vercel projects and point them to:
- `apps/ecommerce`
- `apps/admin`

Set environment variables in each project's Settings → Environment Variables.

## Supabase
- Create a Supabase project and set env variables.
- Apply schema from `supabase/schema.sql` (adjust as needed).

## PRD Alignment
The initial pages, routes, and admin areas map to the PRD sections (PLP, PDP, Cart, Checkout, Orders, Products, Banners/Blog stubs, and Webhooks). Extend data models and UI as you validate flows.


