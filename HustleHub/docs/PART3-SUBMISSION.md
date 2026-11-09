# Part 3 submission checklist

Submit the complete Parts 1–3 application. The repository root README leads to the full setup, test instructions, security review, and evidence.

| Lecturer requirement | Where to verify it |
|---|---|
| Preserve Parts 1 and 2 | Backend, frontend and Newman regressions cover the earlier authentication, roles, gig and booking flows. The Compose smoke test covers the integrated flow. Compare any individual marking feedback against the final app before submission |
| Tax, income and data security | See the [financial design and threat review](../README.md). The API derives amounts from the signed-in freelancer's completed transactions. The 2027 SARS brackets and rebate are linked in the README. Unit tests cover the thresholds and rounding |
| Automated integration, builds and failure gates | [Part 3 workflow](../../.github/workflows/part3-ci.yml) runs Node tests, Newman, Vitest, the React production build, both image builds, audits, Compose smoke and Playwright. The Playwright test uses the built React site and real Express/Mongo services |
| Static analysis and Docker | See the [Semgrep report](../evidence/part3-static-analysis.md), both Dockerfiles and [Compose configuration](../docker-compose.yml). Hosted deployment is optional |
| Logging | Container evidence includes structured server events with request IDs. Optional HTTPS cloud export is implemented and tested. See [cloud logging setup and evidence](CLOUD-LOGGING-EVIDENCE.md). Provider receipt in Better Stack was verified on 8 November 2026 with screenshots in the shared evidence document |
| Own security features | The README identifies atomic account lockout and persistent JWT revocation. The baseline security controls are documented separately in the threat review |
| Self-audit | [Rubric audit](RUBRIC-AUDIT.md) scores each category, lists the defects found and fixed, and states the remaining risks |
| Sources | Review the [sources](SOURCES-AND-AI-DECLARATION.md). Each member that has added any external code  has a required format |

## Browser integration test

Start the isolated Compose stack as described in the root README. From the `HustleHub` directory:

```sh
npm --prefix client ci
cd client
npx playwright install chromium
npm run test:e2e
```

Use a disposable local Compose database. The test creates synthetic client and freelancer accounts, creates and books a gig, checks access boundaries and matches the booking to the freelancer's transaction. It checks the nonzero tax estimate and chart when run within the configured tax year. The Playwright report includes booking and dashboard screenshots. CI removes its temporary Compose volume after testing.

## Evidence to attach before submitting

1. Review the [final QA PR checks](https://github.com/Christopher-Doyle/HustleHub-INSY7314/pull/10/checks). After merge, capture the two passing jobs and Compose/Playwright steps from the [Part 3 run on main](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions?query=branch%3Amain) whose SHA matches the submission. Download the `browser-integration-evidence`, `container-runtime-evidence` and `semgrep-static-analysis` artifacts before they expire.
2. Capture the Semgrep summary showing the scan scope and findings. Explain the local rules and their limits using the analysis report.
3. Capture login, booking, transaction and error events with demo data. For the highest band, show receipt in the group's cloud log source using the cloud logging document (done on 8 November 2026 in Better Stack). Keep credentials, private keys, tokens and personal data out of all evidence.
4. Record the full authentication → gig → booking → transaction → dashboard flow. Add the viewable video link to the root README and the assessment submission. See the [demo guide](PART3-DEMO-GUIDE.md).
5. Confirm the submission repository against the official Classroom50 invitation. The current remote is `Christopher-Doyle/HustleHub-INSY7314`. GitHub's [Autograde annotation](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42373522015) says it cannot find the course's reusable runner. Ask the course owner to confirm the assignment remote and runner access. If using a service fork, push the complete history and link that fork in the README.
6. The 75+ meaningful-commit target was not met at `a34e9e5` (56 commits: Christopher 32, Daniel 20, Pabi 4). Report the real contributor record, including later genuine commits, and do not pad it. Confirm any earlier lecturer feedback is addressed.
