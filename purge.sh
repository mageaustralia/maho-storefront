#!/bin/bash
# Purge Cloudflare edge cache for storefront domains
# Usage: ./purge.sh [host|all]
# Examples:
#   ./purge.sh store1.example.com   # Purge specific host
#   ./purge.sh all                  # Purge all hosts from wrangler config
#   ./purge.sh                      # Same as 'all'

cd "$(dirname "$0")"
source .env 2>/dev/null

if [ -z "$CLOUDFLARE_API_KEY" ] || [ -z "$CLOUDFLARE_EMAIL" ] || [ -z "$ZONE_ID" ]; then
  echo "Error: Missing CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, or ZONE_ID in .env"
  exit 1
fi

# Find wrangler config (prefer wrangler.toml, fall back to any wrangler.*.toml)
WRANGLER_CONFIG="${WRANGLER_CONFIG:-wrangler.toml}"
if [ ! -f "$WRANGLER_CONFIG" ]; then
  WRANGLER_CONFIG=$(ls wrangler.*.toml 2>/dev/null | head -1)
fi

if [ -z "$WRANGLER_CONFIG" ] || [ ! -f "$WRANGLER_CONFIG" ]; then
  echo "Error: No wrangler config found"
  exit 1
fi

# Extract all hosts from wrangler config routes
ALL_HOSTS=$(grep -oP 'pattern = "\K[^"]+(?=/\*")' "$WRANGLER_CONFIG" | jq -R -s -c 'split("\n") | map(select(length > 0))')

case "${1:-all}" in
  all)
    HOSTS="$ALL_HOSTS"
    echo "Purging all hosts..."
    ;;
  *)
    HOSTS="[\"${1}\"]"
    echo "Purging ${1}..."
    ;;
esac

curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
  -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"hosts\":$HOSTS}" | jq -r 'if .success then "Cache purged successfully" else "Cache purge failed: \(.errors[0].message // "unknown error")" end'
