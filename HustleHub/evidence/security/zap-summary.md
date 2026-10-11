# OWASP ZAP security summary

Date executed: 2026-10-11

- Tool: official OWASP ZAP stable container, version 2.17.0
- Scope: isolated HTTPS HustleHub+ API on local port 4040
- Data: disposable `mongodb-memory-server`; no Atlas data
- Baseline: 0 High, 0 Medium, 0 Low, 2 Informational
- OpenAPI API scan final rerun: 0 High, 0 Medium, 0 Low, 4 Informational
- Full active scan: 0 High, 0 Medium, 0 Low, 2 Informational; 142 rules passed

One genuine issue was discovered on the first API scan: a null byte in the public Gig search query caused a 500 response. Control characters are now rejected with a controlled 400 response, regression coverage was added, and the API scan reran cleanly.

Reviewed informational results relate to intentional non-cacheable API responses, expected controlled 4xx responses from invalid or unauthenticated attack requests, login-operation detection, and user-agent fuzzing. No alert was suppressed. Raw reports remain in the ignored `evidence/private/zap/` directory and contain no tracked evidence.
