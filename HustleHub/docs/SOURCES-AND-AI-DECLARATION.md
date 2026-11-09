# Sources and AI-use declaration

## References

Harvard style is used. Only sources actually consulted are listed. The *Accessed* column states the date each source was read.

| Source | Used for | Accessed |
|---|---|---|
| South African Revenue Service (2026) *Rates of tax for individuals* [online]. Available at: https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/ | 2027 tax brackets, base amounts, primary rebate and tax-year dates in `src/services/taxService.cjs`. The page, last updated 28/10/2026, was compared with the code on 8 November 2026 and matched | 8 November 2026 |
| Better Stack (2026) *Ingesting logs* [online]. Available at: https://betterstack.com/docs/logs/ingesting-data/http/logs/ | HTTP ingestion format (JSON body, Bearer source token, `dt` event time, `202` response) that the log exporter targets | 8 November 2026 |
| OWASP Foundation (2021) *OWASP Top 10:2021* [online]. Available at: https://top10.owasp.org/2021/ | Risk categories for the README security review (broken access control, injection, authentication, logging and monitoring) | 8 November 2026 |
| Microsoft (2026) *Playwright: Continuous integration* [online]. Available at: https://playwright.dev/docs/ci | Installing Chromium and running tests in GitHub Actions. The marketplace scenario uses this project's own routes and labels | 8 November 2026 |
| Semgrep, Inc. (2026) *Sample CI configurations* [online]. Available at: https://semgrep.dev/docs/semgrep-ci/sample-ci-configs | Running Semgrep in CI. The rules in `.semgrep.yml` are written for this project | 8 November 2026 |

Third-party package versions are listed in the API and client npm lockfiles. Docker images used are `node:24-alpine`, `nginx:1.27-alpine` and `mongo:7.0.41-jammy`. If any member copied or adapted code or text from a further source, for example Docker, MongoDB, GitHub Actions or Express documentation, add its reference, the file or feature it influenced, and any licence or attribution required before submission. No such source is listed here because none has been confirmed.

## AI use

| Member | Tool and use | Review by the member |
|---|---|---|
| Christopher Doyle | None was used | **Christopher **, None was used |
| Daniel Wilson |None was used | **Daniel **: None was used |
| Pabi (Paballo Nthutang) | None was used | **Pabi **: None was used |
