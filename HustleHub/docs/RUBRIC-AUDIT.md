# Part 3 rubric audit

## Final QA follow-up, 9 November 2026

The [finalisation PR](https://github.com/Christopher-Doyle/HustleHub-INSY7314/pull/10) starts from `main` at `38d8d7a`. That main history contains 80 commits and work from Christopher, Daniel and Pabi under six Git author labels. See the PR checks for fresh test counts, browser screenshots, Docker logs and Semgrep results. Cite a new main-branch run after approval and merge.

| Rubric area | What to verify in the final review | Remaining evidence risk |
|---|---|---|
| Income and tax | `src/services/taxService.cjs`, `transactionService.cjs` and `FreelancerIncome.jsx` separate tax-year, year-to-date and lifetime earnings. The real booking test checks the R26 298 estimate on R245 100 within the 2027 tax year | Estimate assumes platform income and the primary rebate. Record the live chart and disclaimer |
| CI/CD and Docker | `part3-ci.yml` runs backend, frontend, Newman, OpenAPI, production audits, Compose startup, HTTPS, smoke and browser tests. Capture proof from the PR and repeat after merge | Course Autograde is a separate workflow. Its reusable runner requires course-owner access |
| Static analysis | `.semgrep.yml` contains nine blocking rules. The CI JSON artifact and historical evidence show scope and findings | Custom rules cover selected patterns and cannot establish absence of all vulnerabilities |
| Logging | `requestLogger.cjs`, `logger.cjs` and the services produce correlated structured events. Daniel recorded Better Stack receipt on 8 November | Keep the group's sanitised provider screenshots and replace the shared document's stale cloud link placeholder |
| Additional controls | Atomic lockout and MongoDB-backed hashed JWT revocation. `api.test.cjs` exercises concurrent attempts, expiry, cross-instance replay and simulated revocation storage failures | Explain that local logout can still clear the browser during a server outage |
| Security review and README | Both READMEs link setup, architecture, risk controls, test instructions, evidence, references and AI disclosure | Add the demo link and confirm Classroom50 destination and earlier assessor feedback before submitting |

The booking test failed on the old heading in [run 42508536430](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42508536430). The report's page snapshot showed the new confirmation, matching gig and booking ID. The browser POST returned 201 and the container logged the linked booking and transaction under one request ID. The regression now checks the response, confirmation, and persisted transaction with that same booking ID.

## Earlier team audit

Independent audit by Daniel Wilson (ST10446445) on 8 November 2026 against `main` at commit `a34e9e5`, plus the changes in this branch. The marking categories and weights come from the team's Part 3 brief (Tax and Income Dashboard 20, CI/CD 20, Static Code Analysis 10, Docker 10, Logging 10, Additional Security Features 15, Security Review 10, README 5). The official lecturer rubric text and any feedback on Parts 1 and 2 were **not** available in the repository, so this audit cannot confirm that earlier feedback was addressed. Each member should compare their own marked feedback with the final application.

Scores below are provisional self-assessments of how the evidence would read to a marker. They are not predictions of the awarded mark.

## Summary

| Category | Weight | Provisional now | Reachable with outstanding evidence | Main remaining risk |
|---|---:|---:|---:|---|
| Tax and Income Dashboard | 20 | 17 | 19 | Screenshots of the dashboard and chart (Pabi) |
| CI/CD Pipeline | 20 | 15 | 17 | No delivery or deployment stage. Course Autograde unresolved |
| Static Code Analysis | 10 | 7 | 8 | Custom nine-rule policy only. Zero findings gives little evidence of coverage |
| Docker | 10 | 8 | 9 | Not re-run locally in this audit. Needs healthy-container screenshots |
| Logging | 10 | 9 | 10 | Cloud receipt verified 8 Nov 2026. Screenshots must be sanitised and attached |
| Additional Security Features | 15 | 13 | 14 | Evidence screenshots. Lockout can be used against a known account |
| Security Review | 10 | 8 | 9 | Needs to be read alongside test and CI evidence |
| README | 5 | 4 | 5 | Video link still to add |
| **Total** | **100** | **81** | **85–91** | Depends mostly on cloud logging and screenshots |

## 1. Tax and Income Dashboard (20)

- **Requirement:** SARS-based tax estimate, income dashboard, monthly chart.
- **Implementation:** `src/services/taxService.cjs`, `GET /api/income/me/insights`, `client/src/pages/Freelancer/FreelancerIncome.jsx`.
- **Verified:** The 2027 brackets, base amounts and R17,820 primary rebate match the [SARS rates page](https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/) as read on 8 November 2026. Tax-year bounds are exactly 1 March 2026 00:00 UTC to 28 February 2027 23:59:59.999 UTC. The API response labels the figure an estimate and carries a disclaimer.
- **Isolation:** The route accepts no freelancer ID and queries by the token's user. Tests: `freelancer income and transaction history include only that freelancer…`, `financial insights separate lifetime earnings from the exact 2027 tax-year boundaries`.
- **Tests:** `test/tax.test.cjs` (4), `test/bookings.test.cjs`, `FreelancerIncome.test.jsx`. CI Docker smoke asserts `taxYearEarnings` and `lifetimeEarnings`. Playwright checks the tax estimate and chart.
- **Problems:** The estimate treats recorded platform earnings as the annual taxable income, uses only the primary rebate and assumes under 65. This is disclosed in the code, the README and the UI disclaimer, so it is a documented simplification and not a defect. The Playwright check of the tax estimate depends on the run date falling inside the tax year (to 28 February 2027).
- **Changes made:** README now states the verification against SARS and the assumptions.
- **Risk:** Marker needs screenshots of the dashboard and chart. Pabi owns these.

## 2. CI/CD Pipeline (20)

- **Implementation:** `.github/workflows/part3-ci.yml`: `verify` job (backend tests, OpenAPI, Newman, production audits, frontend tests and build, Compose validate/build/up, in-container HTTPS check, Docker smoke, Playwright, artifact upload, teardown) and `static-analysis` job.
- **Triggers:** push to `main` and `feat/**`, pull requests to `main`.
- **Failure gates:** Each step is a normal `run` step without `continue-on-error`, so a failing test, audit at high severity or Semgrep finding fails the job. Artifacts upload with `if: always()`.
- **Evidence:** Run `42374523350` (reported by the team, not independently opened by this audit). Earlier runs `42368902419`, `42371534932` and `42372224995` document the fixes made on the way.
- **Problems found:**
  1. There is no continuous *delivery* step. Images are built and smoke-tested but never published or deployed. If the rubric reads CI/CD strictly, this is the weakest point. Adding a registry push without a decision from the group would add credentials and cost, so it was not done.
  2. The workflow requests `security-events: write`, which only the abandoned CodeQL step needed.
  3. The course `Autograde` workflow fails because its reusable runner `EMWCCN/classroom50` cannot be found from this repository. This is outside the code. The lecturer must confirm the assignment remote.
  4. Branch protection or required checks on `main` are not visible from the repository, so "required checks fail correctly" is shown only by the steps' exit behaviour.
- **Changes made:** None to the workflow. A working pipeline was not changed to create activity.
- **Risk:** Medium. Mitigate by explaining the delivery scope honestly in the video and README.

## 3. Static Code Analysis (10)

- **Implementation:** Semgrep OSS 1.184.0, `.semgrep.yml` with nine `ERROR` rules, `--error`, JSON artifact. See [static-analysis evidence](../evidence/part3-static-analysis.md).
- **Scope:** `HustleHub/src` and `HustleHub/client/src`. Tests, scripts and bundles are excluded.
- **Result:** Zero findings. No suppressions.
- **Problems:** All rules are repository-owned. A marker may ask why no recognised rule pack (OWASP, Node.js, React) is used, and a clean result on nine patterns is weak evidence. CodeQL was abandoned because code scanning upload was unavailable, which the evidence file explains honestly.
- **Changes made:** The evidence file now states trigger, command, blocking behaviour, scope, limits and how to inspect the JSON artifact.
- **Risk:** Medium. A registry pack could be added in a future pull request, but only after a CI run shows what it reports.

## 4. Docker (10)

- **Implementation:** `HustleHub/Dockerfile` (multi-stage, production dependencies, non-root via `su-exec`, health check), `HustleHub/client/Dockerfile` (build stage then Nginx 1.27, HTTPS, health check), `docker-compose.yml` (MongoDB 7.0.41 with health check, API, client; read-only filesystems, `no-new-privileges`, `depends_on` health conditions).
- **Evidence:** CI builds all images, starts the stack with `--wait`, checks HTTPS inside the Nginx container and runs the smoke flow and Playwright against it.
- **Problems:** Docker Desktop was not running on the auditor's machine, so the stack was **not re-run locally**. Compose reads `.env`, so `npm run setup` must run first (documented). The API health check disables certificate verification for its loopback probe, which is acceptable for a local probe but worth stating if asked.
- **Changes made:** README gained a Docker Compose section with accurate commands.
- **Risk:** Low. Needs healthy-container screenshots from a local run or the CI artifact.

## 5. Logging (10)

- **Implementation:** `src/utils/logger.cjs`, `src/middleware/requestLogger.cjs`, event calls in services, HTTPS exporter with timeout, two retries and failure isolation.
- **Problems found and fixed:**
  1. Service-layer events (`authentication_failed`, `authentication_succeeded`, `account_locked`, `booking_created`, `transaction_created`) had **no `requestId`**, although the README told users to confirm request IDs in the cloud. They now inherit it through `AsyncLocalStorage`.
  2. `requestLogger` chose the event name from `req.path`, which is shortened inside mounted routers. In a local run only 7 of 9 login responses were tagged `authentication_attempt`, and the booking was logged as plain `http_request`. It now uses `req.originalUrl`.
  3. Exported records had no `dt` or `message`, so the provider would use arrival time and show no readable line. Exported copies now carry both, as Better Stack documents.
- **Tests added:** correlation, no credentials in output, classification, exporter payload. Backend total is now 64.
- **Cloud receipt:** On 8 November 2026 Better Stack Live tail received the events from the Docker Compose stack, including login, failed login, lockout, booking, transaction, validation error and revocation, and a search by one request ID returned the related records. `docs/CLOUD-LOGGING-EVIDENCE.md` holds the dated table.
- **Remaining gap:** Export is best-effort, so events can be lost if the provider is unreachable. The screenshots must be attached and free of the token and ingesting host.
- **Risk:** Low.

## 6. Additional Security Features (15)

These go beyond the Part 1 and 2 controls (bcrypt, JWT validation, RBAC, rate limiting, headers, validation).

1. **Atomic account lockout.** `authService.login` increments `failedLoginAttempts` in one MongoDB update pipeline and sets a 15-minute `lockedUntil` on the fifth failure, so concurrent guesses cannot slip past the counter. A locked account still performs a dummy bcrypt comparison and returns the same 401 as any failure. Tests: `five failed passwords lock an account…`, `concurrent failures are counted atomically and an expired lock recovers safely`. It differs from the existing IP rate limiter because it protects a single account from distributed guessing.
2. **Persistent JWT revocation.** Tokens carry a `jti`. `POST /api/auth/logout` stores only its SHA-256 digest with the token's expiry. A TTL index removes expired entries. Every authenticated request checks the collection and fails closed. Tests: `logout revokes the current JWT while a separately issued token remains valid`, and a second API instance rejecting a revoked token. It differs from stateless JWT expiry because a stolen token stops working at logout and the record survives restarts.
3. **Container hardening** is a supporting control, not one of the two.

- **Weakness:** Lockout can be used to deny a known user access for 15 minutes. This is documented.
- **Risk:** Low. Needs demo screenshots without token values.

## 7. Security Review (10)

- **Implementation:** the threat table in `HustleHub/README.md`.
- **Problems found:** The table had no row for container and CI/CD risks, which the brief requires, and its evidence column mostly said what was implemented rather than where it is tested. Row names did not match the requested categories.
- **Changes made:** Added the container/CI row, renamed rows to the requested categories, and cited named tests or CI evidence for each claim. Stated that ZAP predates Part 3.
- **Risk:** Low to medium. The ZAP results are from the Part 2 API and were not repeated for the container stack.

## 8. README (5)

- **Problems found:**
  1. Known limitations said logout did **not** revoke tokens, contradicting the Part 3 feature.
  2. Test totals were stale (48 and 75, Newman 52/226, OpenAPI 13 paths) against the CI figures (61, 77, 55/239) and local figures (64, 77, 55/239, 15).
  3. The team table named "Daniel Watson".
  4. The run cited was not the latest, and the README had no Docker, Playwright or CI section.
  5. The text still began "This branch adds…".
- **Changes made:** All corrected. Root README now explains the project, parts, stack, roles, startup, verification table and evidence index.
- **Risk:** Low. Add the video link when it exists.

## GitHub collaboration

`main` had 56 commits at `a34e9e5`: Christopher Doyle 32 (18 + 14 under two identities), Daniel Wilson 20 (19 as `ST10446445`, 1 as `Daniel Wilson`), Pabi 4 (two identities). The 75-commit target is **not met** and contribution is uneven. Do not create filler commits. Commits from this work add real changes, and each member should keep making genuine ones. Ask Pabi to confirm that `OrangeSodaShawty` is their GitHub identity. Branches `feat/pt3-bookings-transactions`, `feat/p3-bookings-transactions` and `pabis-section` are fully merged into `main`.

## Parts 1 and 2 regression

Backend tests (64), Newman (55 requests, 239 assertions) and frontend tests (77) pass locally. The CI Docker smoke test covers registration, login, gig creation, browsing, booking, automatic transaction, income and revocation. Playwright covers the UI path. Admin overview, RBAC, rate limiting, headers, HTTPS and CORS have named backend tests. Lecturer feedback on earlier parts could not be checked (see above).

## Commands run in this audit

| Command | Result |
|---|---|
| `npm ci && npm run setup && npm test` | 61 passed before changes, 64 after |
| `npm run openapi:validate` | valid, 15 paths |
| `npm run test:postman` | 55 requests, 239 assertions, 0 failed |
| `cd client && npm ci && npm test` | 77 passed in 12 files |
| `npm audit --omit=dev --audit-level=high` (API) | 0 vulnerabilities |
| `npm run security:server` with `npm run demo:log-events` | all events logged with request IDs, no sensitive strings |
| Docker Compose, Playwright, Semgrep | not run locally. Relied on GitHub Actions |
