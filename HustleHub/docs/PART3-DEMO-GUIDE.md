# Part 3 demonstration guide

Allow 10–12 minutes. Record a disposable Compose stack with synthetic accounts. Keep `.env`, Atlas details, passwords, keys, source tokens and JWTs off screen.

## Before recording

After approval and merge, confirm the submitted `main` SHA matches a successful [Part 3 workflow](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions?query=branch%3Amain). Download its browser, container and Semgrep artifacts. Open them, the group evidence document and the cloud screenshots in advance.

```sh
cd HustleHub
npm run setup
docker compose up --build --wait
docker compose ps
```

Open `https://localhost:5173` and `https://localhost:5173/api/health`. The certificate is for local development. Check MongoDB, Express and Nginx show healthy. Prepare separate browser profiles or private windows for each role. Use unique synthetic addresses such as `poe.freelancer.<suffix>@example.test` and `poe.client.<suffix>@example.test` and privately generated passwords.

## Speaker order

1. **Christopher, 0:00–3:30.** Introduce the client, freelancer and admin roles, and show the browser → Nginx HTTPS → Express → MongoDB flow. Register and log in as the freelancer, then open **My gigs → Create gig**. Use “POE Website Accessibility Audit”, category **Development**, and a simulated price of **R245 100** to demonstrate a nonzero tax estimate. In the separate client window, register and log in, then use **Browse gigs → gig title → Book this gig**.
2. **Pabi, 3:30–7:00.** Confirm the booking and pause on **You’re booked in**. Show the gig, price and booking ID, then **View my bookings**. In the freelancer window, show **Bookings → Income**. Match the same ID in transaction history, show the monthly chart and explain lifetime vs tax-year vs year-to-date income. For a fresh account with one R245 100 transaction in the 2027 tax year, show the R26 298 estimate and disclaimer. Show a narrow layout and the chart/table scrolling within their sections.
3. **Daniel, 7:00–11:00.** Show `docker compose ps`, the green verify and Semgrep jobs, Newman and Playwright totals, and their artifacts. Explain the two additional controls: five failed attempts trigger a 15-minute lockout, and logout persists a hashed JWT identifier so replay is rejected. Run `npm run demo:log-events` on disposable accounts and show request correlation, revocation and the documented Better Stack receipt. Show the automated 401 replay result without exposing the JWT. If appropriate, show **Admin overview** using a separately provisioned disposable admin.

## Recovery

- If a service is unhealthy, inspect `docker compose ps -a` and `docker compose logs --tail=60 mongo api client` before retrying. Confirm Docker Desktop is running with Linux containers and the setup step created the local certificate pair.
- If a login is locked, switch to a fresh synthetic account. Keep the lockout demonstration separate from the presenter accounts.
- If the chart is empty or the total differs, confirm the booking was completed and that the freelancer is the owner. For a clean calculation, use a fresh freelancer and one booking. The current chart and tax estimate are tied to the displayed 2027 tax year.
- If cloud Live tail is unavailable, use the dated and sanitised screenshots described in [Cloud logging evidence](CLOUD-LOGGING-EVIDENCE.md). Distinguish recorded receipt from a live demonstration.
- Stop with `docker compose down` to keep the demo database for rehearsal. Use a fresh Compose project or fresh synthetic users for another recording.
