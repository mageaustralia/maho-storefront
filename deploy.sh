#!/bin/bash
# Deploy maho-storefront to Cloudflare Workers
cd "$(dirname "$0")"
source .env 2>/dev/null

if [ -z "$CLOUDFLARE_API_KEY" ] || [ -z "$CLOUDFLARE_EMAIL" ] || [ -z "$ZONE_ID" ]; then
  echo "Error: Missing CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, or ZONE_ID"
  echo "Set them in .env or export as environment variables"
  exit 1
fi

# Build CSS + JavaScript before deploying
echo "Building..."
CI=true npm run build

# Deploy to Cloudflare (uses wrangler.toml by default, or specify with --config)
CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" \
CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
npx wrangler deploy --config wrangler.toml "$@"

# Purge edge cache
if [ -n "$PURGE_HOSTS" ]; then
  echo ""
  echo "Purging edge cache..."
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"hosts\":$PURGE_HOSTS}" | jq -r 'if .success then "Cache purged successfully" else "Cache purge failed: \(.errors[0].message // "unknown error")" end'
fi
