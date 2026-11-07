# Part 3 demonstration guide

Suggested duration: 8-12 minutes. Use disposable users; never show `.env`, Atlas credentials, private keys, passwords or full JWTs.

1. Run `docker compose up --build --wait`; open `https://localhost:5173`, show all three services healthy and show `/api/health` returns JSON through Nginx.
2. Register/login a freelancer; create/edit a Gig.
3. Register/login a client; browse and book the Gig; explain automatic transaction creation.
4. Return as freelancer; show bookings, transactions, financial cards, tax disclaimer and monthly chart.
5. Show structured login, booking and financial JSON logs with request IDs and no credentials.
6. Demonstrate five failed passwords causing lockout on a disposable account.
7. Log in, call logout, show the hashed MongoDB revocation record (never the JWT), then show reuse returns 401 from a second/restarted API instance.
8. Show the successful GitHub Actions verify and Semgrep jobs plus both uploaded artifacts, then explain Docker hardening and test/audit evidence.

For cloud logging, create a disposable Better Stack HTTP source, configure the three documented `LOG_EXPORT_*` secrets outside Git, generate login/booking activity, and show sanitised events in Live Tail. Do not expose the ingest URL or token.

Capture dashboard desktop/mobile views, calculation tests, logs, lockout/revocation, container health, CI jobs, Semgrep artifact, production audits and final test totals. Cloud-export code/configuration may be shown, but do not claim successful cloud receipt until a real provider endpoint has received a sanitised test event.
