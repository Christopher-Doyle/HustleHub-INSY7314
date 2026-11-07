# Part 3 implementation checklist

Verified on [GitHub Actions run 42372224995](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42372224995), commit `ec26dfd`. Both jobs passed.

| Requirement | Implementation/evidence | Status |
|---|---|---|
| Tax dashboard | 2027 tax-year boundaries, lifetime/tax-year/YTD separation, React cards and monthly chart | Calculation, boundary and React tests passed. Docker smoke checked income through the HTTPS API |
| CI and analysis | Backend and frontend tests, OpenAPI, Newman, production audits, builds, Compose and blocking Semgrep | 61 backend and 77 frontend tests passed. Newman ran 55 requests and 239 assertions with zero failures. Both production audits reported zero vulnerabilities. Semgrep found zero issues across 81 application files |
| Docker | HTTPS Nginx, verified upstream TLS, API, disposable MongoDB and smoke test | All three services healthy. An in-container request to `https://127.0.0.1:8443/` returned HTTP 200. Smoke covered registration, login, gig creation and browsing, booking, transaction, income, SPA direct-route refresh, logout and rejection of the revoked JWT. CI removed the disposable MongoDB volume |
| Logging | Redacted structured JSON, authentication, booking, transaction and error events, and an optional HTTPS exporter | Exporter regressions passed. Live cloud receipt still requires a team-configured source and test events |
| Security controls | Atomic account lockout and MongoDB-backed hashed `jti` revocation with TTL | Lockout, concurrent attempts, recovery, revocation and RBAC regressions passed |
| Submission evidence | README threat mapping, demo guide, static analysis and container logs | [Container evidence](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42372224995/artifacts/13573803070) · [Semgrep JSON](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42372224995/artifacts/13573639826). Team still needs to attach the recorded demo |

Run `42368902419` exposed the MongoDB 8.0 incompatibility with the runner's Linux 6.19+ kernel (`SERVER-121912`). The stack now uses MongoDB 7.0.41. The API stages its private key with owner-only permissions and starts Node as a non-root user. Run `42371534932` showed the API healthy and Nginx workers running, but the frontend's `localhost` probe returned connection refused. Nginx listens on IPv4, so the probe now uses the explicit IPv4 loopback address.
