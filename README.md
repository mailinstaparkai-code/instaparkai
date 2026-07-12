# Insta Park AI

Enterprise parking management platform. Monorepo containing the Super Admin portal
and, later, the valet parking operator apps (dweb, mweb, Android) for individual sites.

## Structure

- `apps/super-admin` — Next.js + Tailwind + shadcn/ui Super Admin portal
- `supabase/` — database migrations and config for the Supabase project backing the platform
- `design.md` — shared design system (colors, typography, components) used across all apps

## Stack

- Backend: Supabase (Postgres + RLS, Auth, Realtime, Storage, Edge Functions)
- Super Admin frontend: Next.js, Tailwind CSS, shadcn/ui
- Valet apps (future): native Android (Kotlin) + a separate React web app for dweb/mweb

## Deployments

- Super Admin portal (production): https://instaparkai-super-admin.vercel.app

## Getting started

```bash
npm install
npm run dev -w apps/super-admin
```
