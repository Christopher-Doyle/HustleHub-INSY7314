# Sources and AI-use declaration

## References

Harvard style is used. Only sources actually consulted are listed. The *Accessed* column states the date the source was read for this documentation. Rows marked **member to confirm** were consulted while building Part 3 but the access date was not recorded, so the member who used them must add it before submission.

| Source | Used for | Accessed |
|---|---|---|
| South African Revenue Service (2026) *Rates of tax for individuals* [online]. Available at: https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/ | 2027 tax brackets, base amounts, primary rebate and tax-year dates in `src/services/taxService.cjs`. The page, last updated 28/10/2026, was compared with the code on 8 November 2026 and matched | 8 November 2026 |
| Better Stack (2026) *Ingesting logs* [online]. Available at: https://betterstack.com/docs/logs/ingesting-data/http/logs/ | HTTP ingestion format (JSON body, Bearer source token, `dt` event time, `202` response) that the log exporter targets | 8 November 2026 |
| OWASP Foundation (2021) *OWASP Top 10:2021* [online]. Available at: https://top10.owasp.org/2021/ | Risk categories for the README security review (broken access control, injection, authentication, logging and monitoring) | Member to confirm |
| Microsoft (2026) *Playwright: Continuous integration* [online]. Available at: https://playwright.dev/docs/ci | Installing Chromium and running tests in GitHub Actions. The marketplace scenario uses this project's own routes and labels | Member to confirm |
| Semgrep, Inc. (2026) *Sample CI configurations* [online]. Available at: https://semgrep.dev/docs/semgrep-ci/sample-ci-configs | Running Semgrep in CI. The rules in `.semgrep.yml` are written for this project | Member to confirm |

Third-party package versions are listed in the API and client npm lockfiles. Docker images used are `node:24-alpine`, `nginx:1.27-alpine` and `mongo:7.0.41-jammy`. If any member copied or adapted code or text from a further source, for example Docker, MongoDB, GitHub Actions or Express documentation, add its reference, the file or feature it influenced, and any licence or attribution required before submission. No such source is listed here because none has been confirmed.

## AI use

AI assistance was used in this project and the group's work should not be presented as entirely human-written.

| Member | Tool and use | Review by the member |
|---|---|---|
| Christopher Doyle | OpenAI Codex assisted with Part 3 implementation and debugging: the tax and dashboard work, logging export, JWT revocation and account lockout, Docker and CI fixes, regression tests, branch integration, the Playwright test, and an earlier draft of this document | **Christopher to confirm and extend**, including any AI use in Parts 1 and 2 |
| Daniel Wilson | Claude Code (Anthropic, model Sonnet 5.5) was used on 8 November 2026 to audit the repository against the Part 3 brief, find and fix the logging defects described in `RUBRIC-AUDIT.md`, write the tests for them, write `scripts/demo-log-events.cjs`, and draft the README corrections, the cloud-logging and static-analysis documents and this table. Daniel ran the test suites and reviewed the diff before committing. SARS and Better Stack facts were read from the live pages by the tool during the session | **Daniel to confirm** that the description is accurate and add any other AI use from Parts 1 and 2 |
| Pabi (Paballo Nthutang) | Not yet declared | **Pabi to complete**: tools used, what they produced, and what was reviewed or rewritten |

GitHub Actions provides the reproducible verification results for tests, builds, Docker and Semgrep. Each member should transfer their entry to the institution's declaration form if one is required, and should only sign for the work they can explain.
