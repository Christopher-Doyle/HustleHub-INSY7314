# Part 3 static-analysis evidence

The first Part 3 run (`42366106585`) proved tests and Docker builds but CodeQL failed because GitHub code scanning upload was unavailable for the repository. This was an integration limitation, not a clean analysis result.

The replacement `static-analysis` job pins Semgrep OSS 1.184.0, scans backend and React source using the repository-owned `.semgrep.yml`, exits nonzero on blocking findings and uploads the genuine JSON result as `semgrep-static-analysis`. The expanded nine-rule policy covers dynamic execution, shell-enabled child processes, unsafe React HTML injection, hard-coded JWT secrets, weak security hashes, JWT `none`, credentialed wildcard CORS, MongoDB `$where`, and disabled TLS verification. No findings are blindly ignored; rule scope is limited to application source so generated bundles, scripts and third-party packages do not create unactionable noise.

Both jobs passed in [Part 3 DevSecOps run 42372224995](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42372224995) on commit `ec26dfd`. The Semgrep job ran nine rules on 81 application files and reported zero findings. No findings required remediation under this policy. The JSON report is in [artifact 13573639826](https://github.com/Christopher-Doyle/HustleHub-INSY7314/actions/runs/42372224995/artifacts/13573639826) (SHA-256 `3bd7821b110230e696c312935c5451b1371e7462c5e70eef5b79968eb5fbc2e8`).

Both production-only npm audits reported zero vulnerabilities after compatible dependency updates. The backend dependency install still reported advisories with development dependencies included. Newman is development-only and is excluded from the production API image.
