#!/bin/bash
# RunReady SG — SonarQube Analysis Script
# Usage: ./scripts/run-sonar.sh
#
# Prerequisites:
#   1. SonarQube running: docker compose -f infra/docker-compose.sonarqube.yml up -d
#   2. Create token at http://localhost:9000 (admin/admin → My Account → Security → Generate Token)
#   3. Export token: export SONAR_TOKEN=sqp_xxxxx

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=== Step 1: Generate Python coverage report ==="
cd backend
pip install pytest-cov > /dev/null 2>&1
pytest -m unit --cov=app --cov-report=xml:coverage.xml -q 2>/dev/null || echo "Warning: some tests failed, coverage still generated"
cd "$PROJECT_ROOT"

echo "=== Step 2: Generate frontend coverage report (optional) ==="
if [ -f frontend/package.json ]; then
    cd frontend
    if grep -q '"test"' package.json 2>/dev/null; then
        npm run test -- --coverage --watchAll=false 2>/dev/null || echo "Warning: frontend tests skipped or failed"
    else
        echo "No test script in frontend/package.json — skipping frontend coverage"
    fi
    cd "$PROJECT_ROOT"
fi

echo "=== Step 3: Run SonarScanner ==="
if [ -z "$SONAR_TOKEN" ]; then
    echo "Error: SONAR_TOKEN not set."
    echo "  1. Go to http://localhost:9000 (login: admin/admin)"
    echo "  2. My Account → Security → Generate Token"
    echo "  3. export SONAR_TOKEN=sqp_xxxxx"
    exit 1
fi

docker compose -f infra/docker-compose.sonarqube.yml run --rm \
    -e SONAR_LOGIN="$SONAR_TOKEN" \
    sonar-scanner \
    sonar-scanner \
    -Dsonar.host.url=http://sonarqube:9000 \
    -Dsonar.token="$SONAR_TOKEN"

echo ""
echo "=== Done! View results at http://localhost:9000/dashboard?id=runready-sg ==="