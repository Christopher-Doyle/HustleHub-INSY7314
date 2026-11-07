# Part 3 demonstration guide

Suggested duration: 8-12 minutes. Use disposable users; never show `.env`, Atlas credentials, private keys, passwords or full JWTs.

1. Run `docker compose up --build`; show both services and health.
2. Register/login a freelancer; create/edit a Gig.
3. Register/login a client; browse and book the Gig; explain automatic transaction creation.
4. Return as freelancer; show bookings, transactions, financial cards, tax disclaimer and monthly chart.
5. Show structured login, booking and financial JSON logs with request IDs and no credentials.
6. Demonstrate five failed passwords causing lockout on a disposable account.
7. Log in, call logout, then show that reuse of the revoked token returns 401.
8. Show the actual GitHub Actions run and CodeQL result, then explain Docker hardening and test/audit evidence.

Capture dashboard desktop/mobile views, calculation tests, logs, lockout/revocation, container health, CI jobs, CodeQL, production audits and final test totals. Cloud logging is not implemented or claimed.
