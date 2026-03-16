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
CI=true bun run build

# Deploy to Cloudflare (uses wrangler.toml by default, or specify with --config)
CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" \
CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" \
bun x wrangler deploy --config wrangler.toml "$@"

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

# Prewarm edge cache (optional — set WARM_HOSTS in .env)
# WARM_HOSTS='["https://demo.mageaustralia.com.au"]'
if [ -n "$WARM_HOSTS" ] && [ -n "$SYNC_SECRET" ]; then
  echo ""
  echo "Prewarming edge cache..."
  WARM_URLS=$(echo "$WARM_HOSTS" | jq -r '.[]')
  for host in $WARM_URLS; do
    # Get list of URLs to warm from the Worker
    url_list=$(curl -s "${host}/cache/warm-urls" -H "Authorization: Bearer $SYNC_SECRET" --max-time 10)
    if [ $? -ne 0 ] || [ -z "$url_list" ]; then
      echo "  ${host}: failed to get URL list"
      continue
    fi

    total=$(echo "$url_list" | jq -r '.urls | length')
    echo "  ${host}: warming ${total} pages..."

    # Fetch URLs in parallel batches of 10 using xargs
    warmed=$(echo "$url_list" | jq -r '.urls[]' | \
      xargs -P 10 -I {} curl -s -o /dev/null -w "%{http_code}\n" "${host}{}" --max-time 10 2>/dev/null | \
      grep -c '^200$')

    echo "  ${host}: ${warmed}/${total} pages warmed"
  done
fi
