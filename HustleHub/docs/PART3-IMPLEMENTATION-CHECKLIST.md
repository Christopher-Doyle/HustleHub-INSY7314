# Part 3 implementation checklist

| Requirement | Implementation/evidence | Status |
|---|---|---|
| Tax dashboard | Explicit 2027 boundaries, lifetime/tax-year/YTD separation, React cards/chart and boundary tests | Local automated tests passed |
| CI and analysis | Tests, builds, audits, Compose runtime smoke test and blocking Semgrep with artifacts | Repaired; new remote run must be observed |
| Docker | HTTPS Nginx `/api` proxy, API, disposable MongoDB and complete smoke flow | Configuration validated; CI runtime gate configured |
| Logging | Redacted JSON, business events, correlation and failure-isolated HTTPS cloud exporter | Local tests passed; real cloud receipt needs team credentials |
| Security controls | Atomic lockout and MongoDB-backed hashed `jti` revocation with TTL | Local regression tests passed, including a second API instance |
| Final evidence | README threat mapping, analysis record and demo guide | Updated; CI artifact links pending run |

The original run `42366106585` passed verification and Docker builds but failed CodeQL upload because repository code scanning was unavailable. CodeQL was replaced with subscription-free blocking Semgrep. Configuration is not presented as proof of the replacement run or cloud receipt until observed.
