# Part 3 static-analysis evidence

GitHub CodeQL is configured in `.github/workflows/part3-ci.yml` for JavaScript/TypeScript. It publishes SARIF results to GitHub code scanning. This file does not claim a successful remote result before the feature branch is pushed and the workflow is observed.

Compatible production dependency updates were applied locally. Attach the actual CodeQL result after CI, listing findings, remediation commits and final status. Newman is development-only and its transitive findings must be reported separately.
