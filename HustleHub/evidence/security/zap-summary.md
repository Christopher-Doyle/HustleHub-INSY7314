# OWASP ZAP execution status

Date checked: 2026-10-11

The repository includes a reproducible isolated OWASP ZAP workflow, but no ZAP scan result is claimed in this evidence file.

- Docker CLI: available
- Docker Desktop Linux engine: unavailable at verification time
- Native ZAP CLI/Desktop: not installed
- Baseline scan: not executed
- Full/active scan: not executed
- OpenAPI API scan: not executed

To execute safely, start Docker Desktop, run `npm run security:server`, and then run `powershell -ExecutionPolicy Bypass -File scripts/run-zap.ps1` from another terminal. Raw reports are written to the ignored `evidence/private/zap/` directory. Review and sanitise them before updating this summary.
