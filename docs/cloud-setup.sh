#!/usr/bin/env bash
set -euo pipefail
cd /workspace/sislop
export npm_config_cache=/tmp/sislop-npm
export XDG_CONFIG_HOME=/tmp/sislop-config
export WRANGLER_LOG_PATH=/tmp/sislop-wrangler-logs
export WRANGLER_SEND_METRICS=false
npm ci
npm run db:local
npm test
npm run build
