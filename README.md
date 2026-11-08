# HustleHub+ · INSY7314 Final POE

HustleHub+ is a MERN freelance marketplace. Freelancers publish gigs and clients book them. A booking creates a simulated transaction, which feeds the freelancer's income and estimated-tax dashboard. No real payment is processed.

| Part | What it delivered |
|---|---|
| 1 | Secure registration and login (bcrypt, JWT), roles, MongoDB models, HTTPS and security headers |
| 2 | Gig management with ownership, client bookings, automatic transactions, freelancer income, admin overview, OpenAPI, Newman and OWASP ZAP testing |
| 3 | SARS-based tax and income dashboard, GitHub Actions CI/CD, Semgrep, Docker Compose, structured and cloud-exportable logging, account lockout, persistent JWT revocation and the final security review |

**Stack:** Node.js 24, Express 5, MongoDB (Mongoose), React 18 with Vite, Nginx, Docker Compose, GitHub Actions, Semgrep, Playwright, Newman.

**Roles:** client (browse and book), freelancer (manage own gigs, view own bookings, transactions, income and tax estimate), administrator (safe platform totals only, created by an operator and never by public registration).

## Run the full stack

Prerequisites: Node.js 24, npm, OpenSSL (included with Git for Windows) and Docker Desktop.

```sh
cd HustleHub
npm run setup
docker compose up --build --wait
```

Open https://localhost:5173 and accept the self-signed development certificate, or check https://localhost:5173/api/health. `npm run setup` creates a local `.env` and certificate, both ignored by Git. The stack has its own MongoDB container. `docker compose down` stops it and keeps the database volume. Add `-v` to delete the volume.

To run the API and React dev server without Docker, see [Install and run](HustleHub/README.md#install-and-run).

## Verify it

| Check | Command (from `HustleHub`) | Last local result |
|---|---|---|
| Backend tests | `npm ci && npm test` | 64 passed |
| OpenAPI | `npm run openapi:validate` | valid, 15 paths |
| Newman API regression | `npm run test:postman` | 55 requests, 239 assertions, 0 failures |
| Frontend tests | `cd client && npm ci && npm test` | 77 passed |
| Docker flow check | `node scripts/docker-smoke.cjs` (stack running) | passes in CI |
| Browser test | `cd client && npx playwright install chromium && npm run test:e2e` (stack running) | passes in CI |

Local results were recorded on 8 November 2026. Docker, Playwright and Semgrep results come from GitHub Actions because Docker was not running during that local check. The workflow is `.github/workflows/part3-ci.yml`.

## Part 3 submission evidence

- [Full project README](HustleHub/README.md) covers setup, architecture, tax rules, logging and the final security review.
- [Rubric audit](HustleHub/docs/RUBRIC-AUDIT.md) scores each Part 3 category against the evidence and lists the remaining risks.
- [Implementation checklist](HustleHub/docs/PART3-IMPLEMENTATION-CHECKLIST.md) maps the rubric to implementation and verified results.
- [GitHub Actions on main](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions?query=branch%3Amain) contains the test, build, Docker smoke and Semgrep runs.
- [Static-analysis report](HustleHub/evidence/part3-static-analysis.md) explains the rules, scope, limits and the JSON artifact.
- [Cloud logging setup and evidence](HustleHub/docs/CLOUD-LOGGING-EVIDENCE.md) lists the log events and records what the cloud provider has actually received. Receipt is **pending** until real observations are added.
- [Demonstration guide](HustleHub/docs/PART3-DEMO-GUIDE.md) gives the recording sequence. The video link will be added here after the group recording: *pending*.
- [Lecturer's submission checklist](HustleHub/docs/PART3-SUBMISSION.md) shows where each requirement is evidenced and what remains.
- [Sources and AI-use declaration](HustleHub/docs/SOURCES-AND-AI-DECLARATION.md) lists references and each member's disclosed AI assistance.

## Known limitations

Cloud log receipt, the demonstration video and the course Autograde runner are not yet confirmed. See the [limitations list](HustleHub/README.md#known-limitations) for the complete, current set.
