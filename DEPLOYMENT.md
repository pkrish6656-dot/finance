# Vercel Deployment (AutoFinance)

This project now supports deployment on Vercel with:

- **Serverless API function** at `api/index.ts` (Express app wrapper)
- **Static client build** from Vite (`dist/public`)
- Routing configured via `vercel.json`

## Required environment variables

Set these in Vercel Project Settings:

- `DATABASE_URL` (PostgreSQL connection string)
- `SESSION_SECRET` (long random secret)
- `REPL_ID` (OIDC client id)
- `ISSUER_URL` (optional; defaults to `https://replit.com/oidc`)
- Any OpenAI vars required by your integration

## Build settings

No custom framework preset is required when using `vercel.json` in this repo.

## Notes

- Auth/session is initialized in the shared app factory (`server/createApp.ts`) and is used for both local Node runtime and Vercel serverless runtime.
- Session cookies are `secure` only in production, allowing local development over HTTP.
