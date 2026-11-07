# Part 3 static-analysis evidence

The first Part 3 run (`42366106585`) proved tests and Docker builds but CodeQL failed because GitHub code scanning upload was unavailable for the repository. This was an integration limitation, not a clean analysis result.

The replacement `static-analysis` job installs Semgrep OSS, scans backend and React source using the repository-owned `.semgrep.yml`, exits nonzero on blocking findings and uploads the genuine JSON result as `semgrep-static-analysis`. Rules block dynamic execution, shell-enabled child processes, unsafe React HTML injection and hard-coded JWT signing secrets. No findings are blindly ignored; rule scope is limited to application source so generated bundles and third-party packages do not create unactionable noise.

Compatible production dependency updates were applied locally. The backend and frontend production audits report zero vulnerabilities. Newman is development-only and its transitive findings are not represented as production exposure. Add the replacement Actions run URL and artifact result after it completes; this document does not pre-claim that remote result.
