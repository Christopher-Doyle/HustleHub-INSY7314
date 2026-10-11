$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$privateEvidence = Join-Path $projectRoot 'evidence\private\zap'

docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop must be running before OWASP ZAP scans can execute.' }

New-Item -ItemType Directory -Force -Path $privateEvidence | Out-Null
$docs = Join-Path $projectRoot 'docs'

docker run --rm --add-host=host.docker.internal:host-gateway -v "${privateEvidence}:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://host.docker.internal:4040/api/health -I -r baseline.html -J baseline.json
docker run --rm --add-host=host.docker.internal:host-gateway -v "${docs}:/zap/spec:ro" -v "${privateEvidence}:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py -t /zap/spec/openapi.yaml -f openapi -O https://host.docker.internal:4040 -I -r api.html -J api.json
docker run --rm --add-host=host.docker.internal:host-gateway -v "${privateEvidence}:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t https://host.docker.internal:4040 -I -r full.html -J full.json

Write-Host "Private ZAP reports saved under evidence/private/zap. Inspect and sanitise before sharing."
