#!/bin/bash
set -e

cd /opt/tedx-agent
source venv/bin/activate

export GOOGLE_API_KEY="AIzaSyDCGnqdvV0rsdr8A2ARd6PR9XAra8GEtMA"
export TEDX_AGENT_TOKEN="tedxagent2026"
export CRAWL4AI_URL="http://localhost:11235"
export CRAWL4AI_TOKEN="tedx2026secret"

echo "Starting TEDx Enrichment Agent on :8001..."
uvicorn main:app --host 0.0.0.0 --port 8001
