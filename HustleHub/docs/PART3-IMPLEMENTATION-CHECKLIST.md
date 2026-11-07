# Part 3 implementation checklist

| Requirement | Implementation/evidence | Status |
|---|---|---|
| Tax dashboard | Explicit 2027 boundaries, lifetime/tax-year/YTD separation, React cards/chart and boundary tests | Local automated tests passed |
| CI and analysis | Tests, builds, audits, Compose runtime smoke test and blocking Semgrep with artifacts | Run `42368902419`: all pre-runtime gates and Semgrep passed; Mongo startup failed and was diagnosed from its artifact |
| Docker | HTTPS Nginx `/api` proxy, API, disposable MongoDB and complete smoke flow | Mongo 8.0 was incompatible with the runner's 6.19+ kernel; pinned compatible MongoDB 7.0.41 and rerun pending |
| Logging | Redacted JSON, business events, correlation and failure-isolated HTTPS cloud exporter | Local tests passed; real cloud receipt needs team credentials |
| Security controls | Atomic lockout and MongoDB-backed hashed `jti` revocation with TTL | Local regression tests passed, including a second API instance |
| Final evidence | README threat mapping, analysis record and demo guide | Updated; CI artifact links pending run |

The original run `42366106585` passed verification and Docker builds but failed CodeQL upload because repository code scanning was unavailable. CodeQL was replaced with subscription-free blocking Semgrep. Run `42368902419` verified Semgrep 1.184.0, zero findings/errors and artifact `semgrep-static-analysis` (`13572897093`), plus both image builds. Its runtime artifact `container-runtime-evidence` (`13573016552`) proved MongoDB 8.0 deliberately stopped on the runner's Linux 6.19+ kernel (`SERVER-121912`). The compatible MongoDB pin and improved direct diagnostics require a new run. Cloud receipt remains unverified without credentials.
