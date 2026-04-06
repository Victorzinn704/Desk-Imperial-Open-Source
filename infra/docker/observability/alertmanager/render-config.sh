#!/bin/sh
set -eu

OUTPUT_PATH="${1:-/tmp/alertmanager.generated.yml}"
WEBHOOK_URL="${ALERTMANAGER_WEBHOOK_URL:-${ALERTMANAGER_DEFAULT_WEBHOOK_URL:-}}"
ALERTMANAGER_BIN="${ALERTMANAGER_BIN:-/bin/alertmanager}"

ROUTE_RECEIVER="default"
WEBHOOK_BLOCK=""

if [ -n "$WEBHOOK_URL" ]; then
  ROUTE_RECEIVER="default-webhook"
  WEBHOOK_BLOCK="
  - name: default-webhook
    webhook_configs:
      - url: \"$WEBHOOK_URL\"
        send_resolved: true"
fi

cat > "$OUTPUT_PATH" <<EOF
global:
  resolve_timeout: 5m

route:
  receiver: $ROUTE_RECEIVER
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 2h

receivers:
  - name: default$WEBHOOK_BLOCK
EOF

exec "$ALERTMANAGER_BIN" --config.file="$OUTPUT_PATH" --storage.path=/alertmanager
