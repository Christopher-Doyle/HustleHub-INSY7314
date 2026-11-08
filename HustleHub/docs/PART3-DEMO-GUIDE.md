# Part 3 demonstration guide

Suggested duration: 8-12 minutes. Use disposable users; never show `.env`, Atlas credentials, private keys, passwords or full JWTs.

1. Run `docker compose up --build --wait`; open `https://localhost:5173`, show all three services healthy and show `/api/health` returns JSON through Nginx.
2. Register/login a freelancer; create/edit a Gig.
3. Register/login a client; browse and book the Gig; explain automatic transaction creation.
4. Return as freelancer; show bookings, transactions, financial cards, tax disclaimer and monthly chart.
5. Run `npm run demo:log-events`, then show the structured `authentication_succeeded`, `booking_created`, `transaction_created` and `request_error` events with matching request IDs and no credentials. The script prints request IDs only.
6. Show the `account_locked` and `account_lockout_active` events produced by the script's five failed passwords on its disposable account, and that the correct password is then refused.
7. Show the `token_revoked` event, the hashed MongoDB revocation record (never the JWT), and that the revoked token returns 401. The automated test proves the same from a second API instance.
8. Open [passing run 42372224995](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42372224995). Show the in-container IPv4 HTTPS 200, the Docker smoke pass, the Semgrep job and both evidence artifacts. Explain Docker hardening and the test and audit results.

For cloud logging, follow [Cloud logging setup and evidence](CLOUD-LOGGING-EVIDENCE.md): create a disposable Better Stack HTTP source, keep the three `LOG_EXPORT_*` values in the ignored `.env`, run `npm run demo:log-events`, and show the sanitised events in Live tail. Do not expose the ingesting host or token.

Capture dashboard desktop/mobile views, calculation tests, logs, lockout/revocation, container health, CI jobs, Semgrep artifact, production audits and final test totals. Cloud-export code/configuration may be shown, but do not claim successful cloud receipt until a real provider endpoint has received a sanitised test event.
