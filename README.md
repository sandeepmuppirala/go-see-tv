# Go See TV

Independent live-event viewing guide for the United States and Canada.

## Stack
Next.js App Router, React, TypeScript, Vercel; Supabase planned for verified catalog, authentication and entitlements. The UI runs without secrets.

## Run
`npm install && npm run dev`

## Current behavior
The catalog starts empty intentionally. No live TV rights or broadcaster details are fabricated. Add only source-verified broadcast information (country, legal provider URL, source URL and checked timestamp). Google OAuth and subscription tiers are not yet active; the UI labels this clearly.

## Roadmap
Supabase Postgres/RLS, source-verified ingestion with freshness controls, Google OAuth via Supabase, independent entitlements for events/tv/both, later unified billing, monitoring and provider integration.

## Deploy
Connect this repo to your Vercel go-see-tv project, framework Next.js, root `./`, default build settings. No environment variables needed until Supabase is enabled. Deployment not verified by this commit.
