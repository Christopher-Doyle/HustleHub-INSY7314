# HustleHub+ — INSY7314 Final POE

> **Final POE submission (Parts 1–3).** HustleHub+ is a MERN freelance marketplace. Freelancers publish gigs, clients book them, a booking creates a simulated transaction, and the freelancer sees income and an estimated South African tax position. Part 3 added the tax dashboard, structured security logging, account lockout, persistent JWT revocation, Docker Compose, GitHub Actions and Semgrep. The repository root [README](../README.md) is the quick start. This file is the full reference.

## What was built in each part

| Part | Scope | Where to look |
|---|---|---|
| 1 | Secure foundation: registration, login with bcrypt, JWT validation, roles, MongoDB models, HTTPS, security headers, rate limiting | [Security controls](#security-controls), `test/api.test.cjs`, `test/models.test.cjs` |
| 2 | Gig CRUD with ownership, client booking, automatic transaction, freelancer income, admin overview, OpenAPI, Newman, OWASP ZAP | [Application workflow](#application-workflow), [API routes](#api-routes), [Postman and Newman](#postman-and-newman), [OWASP ZAP](#owasp-zap-security-testing) |
| 3 | Tax and income dashboard, CI/CD, static analysis, Docker, logging, account lockout, JWT revocation, security review | The sections below, the [rubric audit](docs/RUBRIC-AUDIT.md) and the [submission checklist](docs/PART3-SUBMISSION.md) |

Submission links: [GitHub repository](https://github.com/Christopher-Doyle/HustleHub-INSY7314) · demonstration video: *to be added after the group recording* · [sources and AI-use declaration](docs/SOURCES-AND-AI-DECLARATION.md).

## Part 3 financial insights

Freelancers use **Income** to view lifetime platform earnings separately from 2027 tax-year earnings, year-to-date earnings, estimated tax, estimated after-tax income and monthly tax-year earnings. `GET /api/income/me/insights` derives values only from the authenticated freelancer's completed transactions and accepts no client-supplied freelancer ID.

The estimator includes transactions from exactly 1 March 2026 00:00 UTC through 28 February 2027 23:59:59.999 UTC. It does not annualise an incomplete year: recorded tax-year platform earnings are the explicitly displayed estimated annual taxable-income basis. It uses the SARS 2027 progressive rates and R17,820 primary rebate with integer-cent calculations. It assumes a person under 65 and excludes other income, deductions, provisional payments and individual circumstances. It is educational guidance, not tax advice or an official assessment. [SARS rates source](https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/).

## Part 3 operations and monitoring

- `docker compose up --build --wait` runs MongoDB, the non-root API, and an HTTPS Nginx frontend/reverse proxy with read-only application filesystems and `no-new-privileges`. Browser `/api` traffic remains same-origin and Nginx verifies the API certificate.
- `.github/workflows/part3-ci.yml` performs locked installs, backend/frontend tests, React build, production audit gates, Compose validation, image builds, a disposable full-stack runtime smoke flow and blocking Semgrep OSS analysis. Evidence is uploaded as Actions artifacts.
- JSON logs include timestamp, level, event, request ID, route, status, duration, actor ID and a one-way client fingerprint. Login, booking and financial routes receive explicit events, and service-layer events (`authentication_failed`, `account_locked`, `booking_created`, `transaction_created`, `token_revoked`) inherit the request ID of the HTTP request that caused them. Request bodies, passwords, tokens, cookies and authorization headers are not logged. The event catalogue is in [cloud logging setup and evidence](docs/CLOUD-LOGGING-EVIDENCE.md).
- Optional HTTPS cloud delivery uses `LOG_EXPORT_URL`, `LOG_EXPORT_TOKEN` and `LOG_EXPORT_TIMEOUT_MS`. The JSON/Bearer format matches the [Better Stack HTTP ingestion API](https://betterstack.com/docs/logs/ingesting-data/http/logs/) (use its assigned HTTPS ingesting host and source token). Exported copies also carry `dt` (event time) and `message` (event name). Export has bounded exponential retries and is failure-isolated. Provider receipt was observed on 8 November 2026; the dated evidence table is in the cloud logging document.

## New Part 3 security controls

1. **Account lockout:** atomic MongoDB update pipelines count concurrent failures; five failed passwords lock an account for 15 minutes, and a successful login after expiry resets counters. IP rate limiting remains an independent control.
2. **JWT revocation:** tokens include a unique `jti`; `POST /api/auth/logout` stores only its SHA-256 digest in MongoDB until expiry. A TTL index cleans records, and every API instance checks the shared collection fail-closed.
3. **Container hardening:** production-only API dependencies, non-root execution, health checks, read-only filesystems and `no-new-privileges` reduce attack surface.

## Final security review

| Threat | Implemented protection | Evidence / residual limitation |
|---|---|---|
| Injection | Strict field/type allowlists, server-owned IDs, no raw query objects, literal-text search, Semgrep `mongodb-where-operator` and `javascript-eval` rules | Tests `operator, nested and script-style input is rejected…`, `regex characters in search are treated as literal text`; ZAP null-byte finding fixed. Update validation when adding fields |
| XSS | React escaping, angle-bracket rejection, CSP on both Express and Nginx, Semgrep `react-dangerous-html` rule | Test `validation rejects missing, malicious, unknown…`. The ZAP run predates Part 3 and should be repeated against the container stack |
| Authentication | bcrypt, generic invalid-credential errors, IP rate limits, short JWT expiry, atomic lockout, persistent hashed revocation | Tests `five failed passwords lock an account…`, `concurrent failures are counted atomically…`, `logout revokes the current JWT…`. Lockout can still be abused against a known account; the 15-minute window limits impact |
| Broken access control | JWT, database-reloaded roles, ownership filters, financial queries scoped to the token's user | Tests `another freelancer cannot update a gig they do not own`, `freelancer income and transaction history include only that freelancer…`, `RBAC distinguishes…`. Admins remain privileged |
| Misconfiguration | HTTPS only, Helmet/CSP, exact-origin CORS, validated environment, ignored secrets, `no-store` | Tests `HTTPS certificate is verified; security headers…`, `plain HTTP is refused…`, `insecure JWT configuration fails closed`. Local certificate is development-only |
| Vulnerable dependencies | Lockfiles, `npm ci`, `npm audit --omit=dev --audit-level=high` for API and client in CI | Both production audits report 0 vulnerabilities. The development-only Newman tree reports advisories and is not shipped |
| Insufficient logging and monitoring | Business-layer events, request-ID correlation, redaction, bounded HTTPS exporter | Tests in `test/logging.test.cjs` and `service-level security events carry the request ID…`. Provider receipt verified 8 Nov 2026 (see cloud logging evidence) |
| Sensitive data exposure | `passwordHash` excluded from queries, ignored secrets and keys, log key redaction, hashed token IDs in MongoDB | Tests `registration normalizes email and stores only a salted cost-12 hash`, `unexpected errors hide stack, file paths, and secrets`. Deployment must provide secret storage |
| Container and CI/CD risks | Version-pinned base images, production-only API dependencies, non-root API, read-only filesystems, `no-new-privileges`, verified upstream TLS, locked installs, blocking Semgrep, artifacts free of secrets | Compose smoke test and run artifacts. Images are built but not pushed or deployed, and the workflow still requests an unused `security-events: write` permission |

See `docs/PART3-IMPLEMENTATION-CHECKLIST.md`, `docs/PART3-DEMO-GUIDE.md` and `evidence/part3-static-analysis.md`.

The [lecturer's submission checklist](docs/PART3-SUBMISSION.md) includes Playwright instructions and the evidence handoff. See [sources and AI-use declaration](docs/SOURCES-AND-AI-DECLARATION.md) for research, attribution and disclosure.

Use the [final QA pull request](https://github.com/Christopher-Doyle/HustleHub-INSY7314/pull/10) and its checks to review the booking regression, dashboard and browser evidence. [Main run 42508536430](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42508536430) exposed a stale Playwright assertion after the booking UI changed. The response and container logs confirmed that the booking and its transaction succeeded. After merging the fix, cite the passing workflow for the exact submission SHA on `main`.

A secure MERN freelance marketplace using MongoDB, Express, React and Node.js.

HustleHub+ is a secure freelance marketplace where freelancers publish Gigs and clients book them. A confirmed booking automatically creates a transaction, and freelancers can review related bookings, transaction history and income. The integrated submission includes a React frontend, Express HTTPS API, MongoDB persistence, JWT authentication, role-based access control, automated tests, Postman/Newman regression testing and a reproducible OWASP ZAP workflow.

## Implemented functionality

- Client and freelancer registration; public admin registration is prohibited.
- Secure login, short-lived JWTs, profile restoration and complete logout.
- Public Gig browsing, search, filtering, pagination and detail views.
- Freelancer-only Gig creation, own-Gig listing, editing and deletion.
- Server-enforced Gig ownership and role restrictions.
- Client-only booking with price and freelancer derived from the stored Gig.
- Automatic completed transaction creation after booking confirmation.
- User-scoped client bookings, freelancer bookings, transactions and income.
- Protected administrator overview with safe aggregate platform counts.
- Responsive role-aware React interface with loading, empty, success and error states.

## Technology stack

| Area | Technology |
|---|---|
| API | Node.js, Express 5, HTTPS |
| Data | MongoDB Atlas or MongoDB, Mongoose |
| Authentication | bcryptjs, JSON Web Tokens |
| Security | Helmet, restrictive CSP, explicit CORS allowlist, rate limiting, strict validation |
| Frontend | React 18, React Router 7, Vite |
| Tests | Node test runner, mongodb-memory-server, Vitest, Testing Library |
| API regression | Postman collection and Newman |
| Dynamic security | OWASP ZAP workflow using the official Docker image |

Node.js 24 or later is required by this project and its current test dependencies. Part 2 extends the secure Part 1 authentication foundation. Booking confirmation and transaction completion are simulated for the assignment; no real payment is processed.

## Architecture

The backend uses a layered flow:

```text
React frontend → unified session/JWT store → shared API client
  → HTTPS Express request
  → security middleware / authentication / role checks / validation
  → route
  → controller
  → service
  → Mongoose model
  → MongoDB Atlas or compatible local MongoDB
  → safe response envelope
```

The React application uses one authoritative session store for the JWT and public user profile. All protected API requests read that same token. Routes and middleware validate access; controllers translate requests into service calls; services enforce business rules; models define data relationships. Frontend role checks control the user experience only; backend JWT, database role and ownership checks are authoritative.

## Roles

### Client

- Browse and view Gigs.
- Book a Gig.
- View only their own bookings.
- Cannot create or modify Gigs.
- Cannot access freelancer income or administration.

### Freelancer

- Browse Gigs.
- Create, edit and delete only their own Gigs.
- View bookings associated with their own Gigs.
- View only their own transactions and income.
- Cannot create client bookings or access administration.

### Administrator

- View safe aggregate counts for users, roles, Gigs, bookings and transactions.
- Cannot be created through public registration.
- Must be deliberately provisioned by an authorised operator.

To create an administrator, set temporary process variables and run the provisioning command. Do not add these variables to `.env` or commit their values:

```powershell
$env:ADMIN_NAME='HustleHub Administrator'
$env:ADMIN_EMAIL='admin@example.com'
$env:ADMIN_PASSWORD='<strong unique password>'
npm.cmd run admin:create
Remove-Item Env:ADMIN_NAME,Env:ADMIN_EMAIL,Env:ADMIN_PASSWORD
```

The command stores only a bcrypt cost-12 hash and does not print the password.

## Security controls

- bcrypt cost factor 12; plaintext passwords are never stored.
- Authentication failures use a uniform response and a dummy hash comparison.
- HS256 JWT algorithm pinning, issuer, audience, expiry and claim validation.
- Authenticated users are reloaded from MongoDB so current roles remain authoritative.
- Public registration permits only `client` and `freelancer`.
- Explicit field allowlists reject mass assignment and ownership overrides.
- Scalar/type, length, ObjectId, price, decimal and query validation.
- Operator objects, arrays, markup/control characters, unknown fields, `NaN`, infinity and negative prices are rejected.
- Gig ownership is verified before updates/deletes and repeated in the database mutation filter.
- Booking price, client and freelancer identities are derived server-side.
- Authentication rate limit: 30 requests per IP per 15 minutes.
- Booking mutation rate limit: 20 requests per IP per 15 minutes.
- Gig mutation rate limit: 60 requests per IP per 15 minutes.
- Rate-limit responses include a controlled body, standard headers and `Retry-After`.
- Helmet removes technology disclosure and applies HSTS, MIME sniffing protection, frame protection and a restrictive CSP.
- `Cache-Control: no-store` is applied to API responses.
- HTTP requests are rejected with `426`; TLS 1.2 or later is required by the server.
- Cross-origin requests are allowed only from configured exact origins; wildcard credentialed CORS is not used.
- Error responses do not expose stack traces, database URIs or implementation paths.

Gig prices must be finite numbers from 0 to 1,000,000 with at most two decimal places. Public string queries reject all ASCII control characters; multiline Gig descriptions permit safe whitespace but reject dangerous control characters and angle brackets. JSON request bodies are limited to 10 KB. JWTs use issuer `hustlehub-api`, audience `hustlehub-client`, HS256 and a 15-minute lifetime. Rate-limit standard headers use draft-8; legacy rate headers are disabled.

The default CSP uses same-origin `default-src`, `script-src`, `style-src` and `connect-src`, with `object-src 'none'` and `frame-ancestors 'none'`. During development, Vite proxies `/api` to the HTTPS backend, so browser API traffic remains same-origin. For a separately hosted production frontend, set `VITE_API_BASE_URL`, list its exact origin in `CLIENT_ORIGINS`, and extend `connect-src` deliberately rather than using `*`.

## Environment configuration

Run setup to create `.env` with a random JWT secret, or copy `.env.example` and replace its placeholders locally. Never commit `.env`. The setup script preserves existing entries, including placeholders; copying the example therefore requires supplying your own valid JWT secret. For Atlas, replace the localhost default with your local connection string targeting `hustlehub`, allow the development IP in Atlas Network Access and provision database access locally.

| Variable | Purpose |
|---|---|
| `PORT` | HTTPS API port; default `4000` |
| `HOST` | Bind host; default `127.0.0.1` |
| `JWT_SECRET` | At least 64 hexadecimal characters |
| `MONGODB_URI` | MongoDB Atlas `mongodb+srv://` or local MongoDB URI |
| `MONGODB_DNS_SERVERS` | Optional comma-separated DNS resolver IPs for SRV environments |
| `CLIENT_ORIGINS` | Exact comma-separated browser origins allowed by CORS |
| `LOG_EXPORT_URL` | Optional HTTPS JSON ingestion endpoint for a cloud logging provider |
| `LOG_EXPORT_TOKEN` | Optional cloud ingestion bearer token; never commit it |
| `LOG_EXPORT_TIMEOUT_MS` | Export timeout in milliseconds; default `2000` |

The frontend optionally supports `VITE_API_BASE_URL`; local development should leave it blank and use the Vite proxy.

### Connect Better Stack cloud logging

1. Create a free Better Stack **Logs** source and choose HTTP ingestion.
2. Copy its assigned HTTPS ingest URL into local/deployment secret `LOG_EXPORT_URL`.
3. Store the source token as secret `LOG_EXPORT_TOKEN`; never place either value in source control or screenshots.
4. Keep `LOG_EXPORT_TIMEOUT_MS=2000` unless the provider requires a smaller limit.
5. Restart the API, run `npm run demo:log-events` (or perform a disposable login and booking by hand), then verify `authentication_succeeded`, `booking_created`, `transaction_created` and request/error events in Live Tail.
6. Confirm the received records contain request IDs but no passwords, JWTs, authorization headers, email addresses or names.

Console JSON remains available when no exporter is configured. Export requests have a fixed timeout and two bounded exponential retries; events are not buffered in an unbounded in-memory queue, and exporter failure never fails marketplace operations.

## HTTPS setup

From the project folder:

```powershell
npm.cmd run setup
```

The script preserves existing environment values, creates `.env` only if absent, appends a localhost MongoDB default only when `MONGODB_URI` is missing, and generates:

```text
.env
certs/localhost.pem
certs/localhost-key.pem
```

Certificates and private keys are ignored by Git. The script uses Git for Windows OpenSSL at `C:/Program Files/Git/usr/bin/openssl.exe` first, then OpenSSL on PATH. Certificates cover localhost and 127.0.0.1 and last 365 days. An incomplete pair is rejected; move both old files aside before regenerating. Direct API access may show a self-signed certificate warning; production requires trusted certificates.

## Install and run

Prerequisites: Node.js 24+, npm, Git, and an Atlas or compatible MongoDB connection. OpenSSL is required for local certificates; Docker Desktop with the Linux engine is required only for ZAP. Tests/Newman use temporary MongoDB processes; the first run may download a MongoDB binary.

Clone and enter the Node project:

```powershell
git clone https://github.com/Christopher-Doyle/HustleHub-INSY7314.git
cd HustleHub-INSY7314/HustleHub
```

Backend terminal:

```powershell
npm.cmd ci
npm.cmd run setup
# Configure the MongoDB connection locally in .env before starting.
npm.cmd start
```

Frontend terminal:

```powershell
cd client
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:5173`. The frontend proxy forwards `/api` requests to `https://localhost:4000` and accepts the local development certificate only for that server-to-server proxy hop.

Keep both terminals running. Run backend commands from `HustleHub/` so Node's `--env-file=.env` loads the intended file. Existing process environment variables take precedence; clear stale overrides if needed. If you change the backend port, update Vite's proxy target. On macOS/Linux use `npm` instead of `npm.cmd`; the `.cmd` spelling avoids PowerShell npm.ps1 execution-policy conflicts.

## Application workflow

1. Register a freelancer and log in.
2. Open **My gigs**, create a Gig, and optionally edit it.
3. Log out and register or log in as a client.
4. Browse the marketplace and open the Gig detail page.
5. Select **Book this gig** and confirm the booking.
6. The API stores a confirmed booking and automatically creates a completed transaction.
7. The client sees the booking under **My bookings**.
8. The freelancer sees the related booking, transaction and updated income.

Data persists in the configured MongoDB database and survives API restarts.

## API routes

| Method and path | Access | Purpose |
|---|---|---|
| `GET /api/health` | Public | API health |
| `POST /api/auth/register` | Public | Register client/freelancer |
| `POST /api/auth/login` | Public | Authenticate |
| `GET /api/auth/me` | Authenticated | Current profile |
| `GET /api/gigs` | Public | Browse/search Gigs |
| `GET /api/gigs/:id` | Public | Gig detail |
| `GET /api/gigs/mine` | Freelancer | Own Gigs |
| `POST /api/gigs` | Freelancer | Create Gig |
| `PATCH /api/gigs/:id` | Owning freelancer | Edit Gig |
| `DELETE /api/gigs/:id` | Owning freelancer | Delete Gig |
| `POST /api/bookings` | Client | Book a Gig and create transaction |
| `GET /api/bookings/me` | Client | Own bookings |
| `GET /api/bookings/freelancer` | Freelancer | Related bookings |
| `GET /api/transactions/me` | Freelancer | Own transactions |
| `GET /api/income/me` | Freelancer | Own income summary |
| `GET /api/income/me/insights` | Freelancer | Own earnings, monthly summary and estimated tax |
| `POST /api/auth/logout` | Authenticated | Revoke the current JWT |
| `GET /api/admin/overview` | Admin | Safe platform totals |

The validated OpenAPI 3.0.3 definition is in `docs/openapi.yaml`.

It documents the API operations, including the Bearer JWT scheme, token revocation and financial insights. Validate with `npm.cmd run openapi:validate`.

## Automated tests

Backend tests use HTTPS and isolated `mongodb-memory-server` databases:

```powershell
npm.cmd test
```

The suite covers authentication, hashing, JWT validation, CORS, headers, Gig CRUD, ownership, malicious input, booking, transaction, income, admin RBAC and rate limits.

Verified locally on 8 November 2026: **64 total / 64 passed / 0 failed / 0 skipped**, including tampered/expired tokens, database role checks, null-byte rejection, prototype-related fields, model validation, tax-year boundaries, lockout, revocation, the tax estimator, the log exporter and log correlation.

Frontend tests:

```powershell
cd client
npm.cmd test
```

They cover API handling, validation, Gig marketplace and management interactions, booking and income states.

Verified locally on 8 November 2026: **77 total / 77 passed / 0 failed**, across 12 files, including authentication/session, role-aware navigation, create/edit/delete interactions, the income dashboard and error handling.

Production build:

```powershell
cd client
npm.cmd run build
```

Final production build: **PASS**. Output is `client/dist/`, which is ignored. Vite's development proxy is not a production deployment; production needs configured origins and trusted HTTPS.

## Run with Docker Compose

From `HustleHub`, with Docker Desktop running:

```sh
npm run setup
docker compose up --build --wait
```

`npm run setup` creates `.env` and the development certificate, which Compose mounts into the containers. The stack has three services: `mongo` (MongoDB 7.0.41), `api` (Express over HTTPS, non-root) and `client` (Nginx serving the React build and proxying `/api` with upstream certificate verification). Open https://localhost:5173 and accept the self-signed development certificate. Check the services with `docker compose ps`. `https://localhost:5173/api/health` should return `status: ok`. Run the full flow check with `node scripts/docker-smoke.cjs`, then stop with `docker compose down` (add `-v` to delete the database volume).

## Browser tests (Playwright)

With the Compose stack running:

```sh
cd client
npm ci
npx playwright install chromium
npm run test:e2e
```

The single scenario registers a freelancer and a client, creates and books a gig, checks access boundaries and confirms the transaction, tax estimate and monthly chart. Use a disposable Compose database. The HTML report is written to `client/playwright-report` and CI uploads it as `browser-integration-evidence`.

## Continuous integration and static analysis

`.github/workflows/part3-ci.yml` runs on pushes to `main` and `feat/**` and on pull requests to `main`. The `verify` job installs with `npm ci`, then runs backend tests, OpenAPI validation, Newman, production audits, frontend tests and build, Chromium install, Compose validation and build, container startup, an in-container HTTPS check, the Docker smoke flow and Playwright. It uploads the Playwright report and container log even on failure. The `static-analysis` job runs Semgrep 1.184.0 with the repository's nine rules from `.semgrep.yml` over `HustleHub/src` and `HustleHub/client/src`, and any finding fails the job. See the [static-analysis evidence](evidence/part3-static-analysis.md) for scope and limits. The separate `Autograde` workflow belongs to the course (see known limitations).

## Postman and Newman

Regenerate and run the six-folder Part 2 collection:

```powershell
npm.cmd run postman:build
npm.cmd run test:postman
```

The collection folders are:

1. Authentication
2. Gig Marketplace
3. Gig Ownership and RBAC
4. Bookings
5. Transactions and Income
6. Security and Error Cases

The Newman runner starts isolated HTTPS APIs backed by `mongodb-memory-server`, generates disposable roles/data, and destroys the entire temporary database in `finally`. It does not connect to team Atlas. A minimal private summary is written under ignored `evidence/private/`; no bearer token or password is included.

Verified locally on 8 November 2026: **55 requests / 239 assertions / 0 failures**. The Part 2 collection covers success and failure cases in the six folders above. Test passwords are generated at runtime. Newman may emit the upstream `fs.F_OK` deprecation warning; it does not cause test failures. The Part 1 collection is retained as historical work.

## Atlas persistence smoke test

With a valid Atlas URI in the ignored `.env` file:

```powershell
npm.cmd run smoke:atlas
```

This performs the complete freelancer → Gig → client booking → transaction → income flow, proves cross-owner denial and restart persistence, then deletes only its tracked disposable records and verifies cleanup.

## OWASP ZAP security testing

Read `docs/SECURITY-TESTING.md` before running dynamic scans. The safe workflow is:

```powershell
npm.cmd run openapi:validate
npm.cmd run security:server
```

Then, in another terminal with Docker Desktop running:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-zap.ps1
```

OWASP ZAP Dynamic Application Security Testing was executed on **2026-10-11** with the official stable Docker image, **ZAP 2.17.0**. The scan script targets only the isolated port-4040 HTTPS API through localhost / `host.docker.internal`, with `mongodb-memory-server`, a temporary JWT secret and disposable data. Atlas, GitHub, university systems and public/external services were not scanned. Stop the isolated server with Ctrl+C after scanning to destroy its temporary database.

| Executed scan | High | Medium | Low | Informational | Coverage |
|---|---:|---:|---:|---:|---|
| Baseline/passive: YES | 0 | 0 | 0 | 2 | Intentional non-storable/cache-control observations |
| API final rerun: YES | 0 | 0 | 0 | 4 | 20 imported operations, 67 URLs, 119 rules passed |
| Full active: YES | 0 | 0 | 0 | 2 | 142 rules passed; unauthenticated origin crawl |

### Finding and remediation

The first ZAP API scan found that `%00` (null byte) in the Gig search query caused HTTP **500** when passed into MongoDB regex handling. Public string query validation now rejects ASCII control characters with controlled HTTP **400**. Regression coverage was added, ZAP was rerun and the final scans report no High, Medium or Low alerts. No findings were suppressed.

### Sanitized security evidence

- [Detailed security report](docs/SECURITY-TESTING.md)
- [ZAP summary](evidence/security/zap-summary.md)
- [Baseline summary](evidence/security/zap-baseline-summary.txt)
- [API summary](evidence/security/zap-api-summary.txt)
- [Full active summary](evidence/security/zap-full-summary.txt)

Raw/private reports remain under ignored `evidence/private/zap/` because request details may be unsuitable for public source control.

## Dependency auditing

Production dependencies only:

```powershell
npm.cmd audit --omit=dev
cd client
npm.cmd audit --omit=dev
```

Development-only advisories, where present, should be assessed separately because Newman and test tooling are not shipped with the runtime application. Do not use `npm audit fix --force` without compatibility testing.

Final runtime audits: **backend 0 vulnerabilities; frontend 0 vulnerabilities**. Backend full-tree auditing still reports advisories through development-only Newman/Postman dependencies; they are separate from clean production runtime trees.

## Evidence policy

- Sanitised, reviewed submission evidence may be committed under `evidence/security/`.
- Raw Postman/ZAP output belongs under `evidence/private/` and is ignored.
- Generated root-level JSON evidence is ignored to prevent verification runs from dirtying Git.
- Never commit `.env`, credentials, private keys, passwords or bearer tokens.

## Known limitations

- Booking and transaction creation use a compensating delete when transaction creation fails because `mongodb-memory-server` and standalone MongoDB do not provide replica-set transactions. A production Atlas deployment can migrate this operation to a Mongoose session transaction.
- Admin accounts require deliberate operator provisioning; there is intentionally no public admin registration path.
- ZAP did not retain role-specific JWT sessions for protected workflows. Backend tests, Newman and the real Atlas smoke verify authenticated RBAC/IDOR; unauthenticated crawling alone does not verify those permissions.
- Logout revokes the token server-side (SHA-256 of its `jti` in MongoDB until expiry). Revocation is checked on every authenticated request, so a MongoDB outage rejects requests rather than allowing a revoked token.
- Cloud log receipt was verified on 8 November 2026 against a free Better Stack source using synthetic accounts, with screenshots in the shared evidence document (see [cloud logging evidence](docs/CLOUD-LOGGING-EVIDENCE.md)). The source token is kept outside Git, and the export is best-effort with bounded retries, so events can be lost if the provider is unreachable.
- OWASP ZAP was run on 2026-10-11 against the Part 2 API. It has not been repeated against the Part 3 container stack.
- Semgrep uses nine repository-owned rules rather than a registry rule pack, so a clean result shows those patterns are absent, not that no weakness exists.
- Account lockout can be used to lock out a known email for 15 minutes. IP rate limiting and the short window limit the impact.
- The course `Autograde` workflow cannot find its reusable runner (`EMWCCN/classroom50`) from this repository. Treat it as unresolved until the lecturer confirms the assignment remote.
- Images are built and smoke-tested in CI but are not pushed to a registry or deployed. There is no hosted environment.
- Rate-limit state uses process memory, resets on restart and is not shared across API instances.
- The latest Newman release still brings 19 audit findings through its development-only Postman runtime dependency tree. Both production runtime audits are clean, Newman runs only against the disposable local harness, and no unsafe forced downgrade was applied.

## Team contribution summary

| Team member | Contribution |
|---|---|
| Christopher Doyle | Atlas/database foundation, shared models, authentication/JWT, RBAC/security. Part 3: tax dashboard, logging, lockout, revocation, Docker, CI/CD, Semgrep, Playwright and final integration |
| Daniel Wilson (ST10446445) | Gig marketplace API/frontend and testing in Part 2. Part 3: rubric audit, README and security-review corrections, request-ID log correlation, request classification fix, demo log generator, cloud-logging and static-analysis evidence. Git history uses the identities `ST10446445` and `Daniel Wilson` |
| Pabi (Paballo Nthutang, ST10446382) | Booking, transactions, income, related frontend and testing/evidence work. Git history uses `Paballo Nthutang - ST10446382` and `OrangeSodaShawty`. Part 3 UI and Playwright contributions are recorded in the shared evidence document |

The repository retains the original team branches/merges and subsequent integration, testing, security and documentation commits.

## Database design

| Model | Purpose, actual fields and references |
|---|---|
| User | `fullName`, unique normalized `email`, hidden `passwordHash`, `role`, `createdAt`, `updatedAt` |
| Gig | `freelancerId` → User; `title`, `description`, `category`, `price`, `createdAt`, `updatedAt` |
| Booking | `gigId` → Gig; `clientId`/`freelancerId` → User; `price`, `status` (pending/confirmed/completed/cancelled), `createdAt`, `updatedAt` |
| Transaction | `bookingId` → Booking; `gigId` → Gig; `clientId`/`freelancerId` → User; `amount`, `status` (pending/completed/failed/refunded), `createdAt` only |

Bookings snapshot the stored Gig's price/owner and authenticated client. Income sums only the freelancer's completed transactions. No payment credentials are stored.

## Project structure

```text
HustleHub/
├── src/
│   ├── controllers/
│   ├── middleware/       # validation, authentication, roles, CORS, limits and errors
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── client/src/           # React pages, components, auth/session and API client
├── certs/                # locally generated; only .gitkeep tracked
├── test/
├── postman/
├── scripts/
├── docs/
├── evidence/security/
├── .env.example
└── README.md
```

## Role permissions at a glance

| Action | Public | Client | Freelancer | Admin |
|---|---|---|---|---|
| Browse/view Gigs | Yes | Yes | Yes | Yes |
| Authenticated profile | No | Yes | Yes | Yes |
| Create Gig / My Gigs | No | No | Yes | No |
| Edit/delete own Gig | No | No | Yes | No |
| Edit/delete another freelancer's Gig | No | No | No | No |
| Create booking / client booking history | No | Own only | No | No |
| Freelancer bookings | No | No | Related only | No |
| Transactions/income | No | No | Own only | No |
| Admin overview | No | No | No | Yes |

## Responsive UI and accessibility

The UI includes responsive Gig cards, role-aware/mobile-friendly navigation, loading/empty/error/success states, form validation, visible keyboard focus, accessible labels, alert/status regions and a Not Found route. Layouts were checked around **360px mobile**, **768px tablet** and desktop. Final integration also inspected compact/desktop rendering without horizontal overflow. Functional page states are covered by the frontend suite; exact-width browser checks are separate from unit tests.

## Optional demo seeding

`npm.cmd run seed:dev` preserves the original idempotent sample-Gig workflow. When creating its demo freelancer, supply a locally chosen `SEED_FREELANCER_PASSWORD` as a temporary process variable; it requires at least 12 characters, at most 72 UTF-8 bytes and no control characters. It never prints a password. Existing demo accounts/Gigs are preserved. Normal application use and Newman do not require seeding.

## Final verified status

| Check | Result |
|---|---|
| Backend automated tests | 64/64 PASS; 0 failed, 0 skipped (local, 8 Nov 2026) |
| Frontend tests | 77/77 PASS (local, 8 Nov 2026) |
| Frontend production build | PASS |
| Newman | 55 requests / 239 assertions / 0 failures (local, 8 Nov 2026) |
| ZAP Baseline (Part 2 API) | 0 High / 0 Medium / 0 Low |
| ZAP API final rerun | 0 High / 0 Medium / 0 Low |
| ZAP Full Active | 0 High / 0 Medium / 0 Low |
| Backend runtime audit | 0 vulnerabilities |
| Frontend runtime audit | 0 vulnerabilities |
| Docker, Playwright, Semgrep | Verified in GitHub Actions only. Docker Desktop was not running during the local audit |
| Cloud log receipt | Verified in Better Stack on 8 Nov 2026 (login, failed login, lockout, booking, transaction, error, revocation, request-ID search) |
| Atlas end-to-end | PASS in Part 2 (October 2026); not repeated for Part 3 |
| RBAC / ownership | PASS |
| OpenAPI | Valid 3.0.3 contract; 15 paths |

## Tax estimate rules

The estimate follows the SARS 2027 tax-year table (1 March 2026 – 28 February 2027), checked against the [SARS rates page](https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/) on 8 November 2026. The seven brackets run from 18% to 45%, and the primary rebate is R17,820. `src/services/taxService.cjs` matches the published bracket limits, base amounts and rebate. Below R99,000 the rebate cancels the tax, which matches SARS's under-65 threshold. The result is labelled an estimate, not an assessment, and the API response carries a disclaimer.

## Recommended demonstration order

1. Start backend.
2. Start frontend.
3. Freelancer register/login.
4. Create/edit a Gig in My Gigs.
5. Show marketplace.
6. Client register/login.
7. Open Gig detail.
8. Confirm booking.
9. Show client bookings.
10. Show freelancer bookings.
11. Show linked transaction on the Income page.
12. Show calculated income.
13. Demonstrate RBAC/ownership rejection through tests.
14. Run backend/frontend tests and build.
15. Run Newman.
16. Open ZAP evidence and explain null-byte remediation.
17. Show the Part 3 dashboard, then the cloud logging events, lockout and revocation, CI run, Semgrep artifact and Docker health (see the [demo guide](docs/PART3-DEMO-GUIDE.md)).

Use locally chosen credentials and keep secrets/private reports out of submission source control.
