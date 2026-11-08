# Part 3 static-analysis evidence

The first Part 3 run (`42366106585`) proved tests and Docker builds but CodeQL failed because GitHub code scanning upload was unavailable for the repository. This was an integration limitation, not a clean analysis result.

The replacement `static-analysis` job pins Semgrep OSS 1.184.0, scans backend and React source using the repository-owned `.semgrep.yml`, exits nonzero on blocking findings and uploads the genuine JSON result as `semgrep-static-analysis`. The expanded nine-rule policy covers dynamic execution, shell-enabled child processes, unsafe React HTML injection, hard-coded JWT secrets, weak security hashes, JWT `none`, credentialed wildcard CORS, MongoDB `$where`, and disabled TLS verification. No findings are blindly ignored; rule scope is limited to application source so generated bundles, scripts and third-party packages do not create unactionable noise.

Both jobs passed in [Part 3 DevSecOps run 42372224995](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42372224995) on commit `ec26dfd`. The Semgrep job ran nine rules on 81 application files and reported zero findings. No findings required remediation under this policy. The JSON report is in [artifact 13573639826](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42372224995/artifacts/13573639826) (SHA-256 `3bd7821b110230e696c312935c5451b1371e7462c5e70eef5b79968eb5fbc2e8`).

Both production-only npm audits reported zero vulnerabilities after compatible dependency updates. The backend dependency install still reported advisories with development dependencies included. Newman is development-only and is excluded from the production API image.

## Scope, limits and how to check the evidence

| Item | Detail |
|---|---|
| Trigger | Every push to `main` or `feat/**` and every pull request to `main`, in the `static-analysis` job of `.github/workflows/part3-ci.yml` |
| Command | `semgrep scan --config .semgrep.yml --error --json-output=HustleHub/evidence/ci/semgrep.json HustleHub/src HustleHub/client/src` |
| Blocking | `--error` makes any finding fail the job. All nine rules use severity `ERROR`. The job has no `continue-on-error` and no `--exclude` or `nosemgrep` suppression |
| Scanned | Backend and React application source. Tests, scripts, generated bundles and `node_modules` are outside the scan paths |
| Rules | Repository-owned only. No Semgrep registry rule pack (for example `p/javascript` or `p/owasp-top-ten`) is loaded |
| Result | Zero findings, so there was no remediation work to report. The pass proves the nine patterns are absent. It does not prove the code is free of other weaknesses |

Limitations to state in the submission:

- A custom nine-rule policy is narrower than a registry pack. Adding a registry pack would widen coverage but needs a CI run to see whether it raises findings, so it was not added without that evidence.
- Semgrep OSS performs pattern matching and does not track data flow across files.
- Dependency risk is covered separately by `npm audit --omit=dev --audit-level=high`, not by Semgrep.

To check the evidence: open the `static-analysis` job on the run, confirm the `semgrep scan` step is green, download the `semgrep-static-analysis` artifact, and confirm `results` is an empty array and `paths.scanned` lists files under `HustleHub/src` and `HustleHub/client/src`. For a local run, install Semgrep 1.184.0 and use the command above from the repository root.
