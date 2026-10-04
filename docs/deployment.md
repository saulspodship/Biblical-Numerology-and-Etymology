# Deployment and rollback checklist

## Deployment targets

The app is Vercel-compatible for a read-mostly demo: when `VERCEL` is set, the SQLite file uses the platform's temporary directory, and every serverless instance/cold start runs migrations and seeds a fresh catalog. Browser-local notes/history remain local, but no server-side database changes are durable in this mode.

For durable production data, connect PostgreSQL/Supabase and port the repository functions before launch. Alternatively, SQLite can run on a single persistent Node host with a durable disk. Run with Node 20.20+:

```bash
npm ci
npm test
npx tsc --noEmit
npm run build
npm run start
```

Set `NEXT_PUBLIC_SITE_URL=https://gematria-lab.saulspodship.com`. Mount a durable directory for `GEMATRIA_DB_PATH`, and ensure it is writable by the least-privilege application user. The default local file is `.data/research-lab.sqlite`.

## Vercel quick setup

1. Import the GitHub repository into Vercel and keep the detected **Next.js** framework defaults (`npm ci`, `npm run build`). The SQL migration files are included in server function output tracing, and database routes use the Node.js runtime.
2. Set `NEXT_PUBLIC_SITE_URL` to the current canonical preview URL (or the final HTTPS domain after it is attached). Do not configure an Anthropic key/model until the privacy notice, supported model, and safety evaluation are ready.
3. The `VERCEL` environment flag automatically selects `/tmp/gematria-lab/research-lab.sqlite`. Smoke-test `/`, `/api/bootstrap`, `/api/baseline`, `/api/verses`, `/topic/topic-antarctica`, and `/term/shalom` on the deployment.
4. This ephemeral SQLite mode is for a **read-mostly preview/demo**. Serverless instances may each initialize their own seeded copy, and the file can disappear on a cold start. Before relying on durable server-side content or adding account sync, port repositories to PostgreSQL/Supabase and configure Vercel's database environment variables.
5. Attach the custom domain only after confirming DNS/ownership; until then use the Vercel-provided `vercel.app` address.

## DNS and HTTPS

1. Confirm the registrar/authoritative DNS for **`saulspodship.com` (`.com`)** and confirm the intended subdomain has not already been assigned. This build assumes `gematria-lab.saulspodship.com`; no DNS query or DNS mutation is part of the code build.
2. Add the CNAME record required by the selected host (name/target/TTL are host-specific). Do not point it at a guessed target.
3. Issue a certificate for the exact subdomain and verify HTTP redirects to HTTPS.
4. The app emits HSTS with `includeSubDomains; preload`. Only retain preload after confirming every descendant hostname beneath this subdomain will remain HTTPS-only; adjust the header if the host's policy requires a different scope.
5. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS URL and verify canonical metadata, sitemap, robots, and JSON-LD.

## Secrets and privacy

- Keep `ANTHROPIC_API_KEY` in the server's secret manager, never in `NEXT_PUBLIC_*`, browser code, a committed `.env`, or the APK.
- Without both an API key and a supported model ID, Research Analyst is retrieval-only. When enabling the provider, publish the actual provider/retention privacy wording, complete the safety evaluation suite, and enable logging that excludes unnecessary raw sensitive text.
- This build has no analytics/advertising integration. If added, implement a consent platform appropriate to the user's location and advertising vendor.
- History and saved notes are browser-local in this version. Do not claim account sync or server backup for those records.

## Production hardening still required

- Replace the in-memory AI rate limiter with a shared Redis/hosted limiter; confirm trusted proxy headers are overwritten at the edge.
- Add authentication/authorization before enabling server-side user data, then test refresh, CSRF, account deletion, and soft-delete retention.
- Use a nonce-based CSP and a report-only rollout before enforcing it; the starter currently permits inline script/style for Next.js hydration.
- Encrypt database backups, test restore, use a least-privilege runtime identity, set DB file ACLs, and monitor disk usage.
- Configure uptime/error monitoring and alert on database exceptions, AI provider errors, and elevated rate limiting without logging secrets.
- Audit seeded sources, exact lexicon editions, verse text/license, and any future claim updates.

## Rollback plan

1. Build immutable, versioned deployment artifacts; record the app version and database migration ledger.
2. Take a tested, encrypted database snapshot before applying a schema/content migration.
3. Roll back the app image to the previous release if health checks fail. Do not automatically roll back a database migration if it is destructive; use a forward fix or a verified backup restore.
4. Keep seed/import changes idempotent and put schema changes in a new numbered migration.
5. Verify `/`, `/api/bootstrap`, `/api/baseline`, `/topic/topic-antarctica`, and `/term/shalom` after deploy.

## Release gate

- [ ] `npm test`, `npx tsc --noEmit`, and `npm run build` pass in CI.
- [ ] Playwright flow: calculate → etymology → verse search → save → export.
- [ ] AI adversarial evaluation covers unsourced allegations about living people/families, group-targeted hate, conspiracy prompts, fake source requests, and attempts to elicit AI-calculated values.
- [ ] Manual mobile, keyboard, RTL, dark-theme, reduced-motion, and screen-reader review.
- [ ] Privacy/consent, source archive captures, policy URLs, legal review, and Google AdSense/Play review completed if monetization is introduced.
- [ ] DNS, HTTPS, HSTS scope, backup/restore, monitoring, and rollback rehearsed.
