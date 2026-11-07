# Sources and AI-use declaration

## References

| Source | Use in HustleHub+ |
|---|---|
| [SARS rates of tax for individuals](https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/) | 2027 tax brackets, dates and primary rebate used in `src/services/taxService.cjs` |
| [OWASP Top 10](https://top10.owasp.org/2021/) | Risk categories for the README security review, including broken access control, injection, authentication, and logging |
| [Playwright CI guide](https://playwright.dev/docs/ci) | Chromium installation and test execution in GitHub Actions. The marketplace scenario uses this project's own routes and form labels |
| [Semgrep CI documentation](https://semgrep.dev/docs/semgrep-ci/sample-ci-configs) | Guidance for running analysis in CI. The local rules are in `.semgrep.yml` |

Third-party package versions are listed in the API and frontend npm lockfiles. If the team copied or adapted any additional source, add its link, file or feature, and license or required attribution before submission.

## AI use

OpenAI Codex was used to assist with implementation and debugging, including the Part 3 tax and dashboard work, logging export, JWT revocation and account lockout, Docker and CI fixes, regression tests, and documentation. Codex also assisted with the branch integration, the Playwright test and this submission review. GitHub Actions provides the reproducible verification results. The group should review this declaration, add any other AI use from Parts 1 and 2 or individual contributions, and transfer it to the institution's declaration form if required.
