# Freshness — how the storefront stays current without re-renders

The storefront is server-side rendered from Cloudflare KV. Pages render fast
because Maho is never on the request path. The trade-off: KV can drift from
Maho when admins edit content.

The freshness mechanism keeps things current without putting Maho on the SSR
path. It's a client-side check that runs after page load and patches the DOM
in place when it finds a difference.

## Flow

```
1. Browser → CF edge → Worker
   Worker reads KV, renders SSR HTML, returns to browser.
   Page contains hidden <div data-freshness-* /> metadata describing the
   content's identity and a hash of its current rendered version.

2. Browser → /freshness/should-check?key=<kvKey>
   Worker checks a per-key edge-cache throttle. If anyone (any visitor)
   checked this key in the last FRESHNESS_INTERVAL (60s), returns
   { check: false } and we stop.
   This prevents thundering herd — only one visitor per minute does the
   round trip to Maho on behalf of all visitors at this edge.

3. Browser → /api/<resource>?<filter>
   The browser asks Maho for the current version. Currently this goes
   through the Worker's /api/* proxy; future direction is browser-direct
   to a public Maho subdomain to drop the proxy hop. See the README for
   that migration plan.

4. Browser computes a fresh hash and compares it to the rendered version.
   If equal — done. The current page matches the source of truth.

5. If the hashes differ:
   a) Browser POSTs /freshness with { kvKey, data }. Worker writes KV
      and bumps the global pulse hash, which busts the edge cache for
      pages keyed on that pulse so the *next* visitor gets a fresh SSR.
   b) Browser calls _patchDOM(type, freshData) to update the visible
      page in place — current visitor sees the fresh content without
      a reload.
```

## Adding freshness to a new page type

Templates declare freshness intent with two pieces:

1. A hidden meta div at the top of the page:
   ```jsx
   <div hidden
     data-freshness-type="cms"
     data-freshness-key={`cms:${page.identifier}`}
     data-freshness-api={`/api/cms-pages?identifier=${encodeURIComponent(page.identifier)}`}
     data-freshness-checked={(page as any)._lastChecked ?? '0'}
     data-freshness-version={djb2(/* hash of fields that affect rendering */)}
   />
   ```

2. `data-freshness-target="<name>"` attributes on the DOM nodes the patch
   should mutate:
   ```jsx
   <h1 data-freshness-target="cms-title">…</h1>
   <div data-freshness-target="cms-content">…</div>
   ```

Then add a `_patchXxx(data)` method to `freshness-controller.js` that uses
`this._target('<name>')` to find each node and mutate it.

### Why data-freshness-target instead of CSS classes?

Earlier versions of `_patchDOM` used class names (`.blog-post-header h1`,
`.blog-post-content`). When the templates were redesigned for a different
visual treatment those classes were dropped, the DOM-patch silently
no-op'd, and the user saw stale content for the rest of the session.

`data-freshness-target` decouples the patch contract from styling
decisions. Style classes can change freely without breaking freshness;
freshness targets can change without affecting visual styling. Same
discipline as Stimulus targets, same reasoning.

## Build a fingerprint that catches every visible change

The `data-freshness-version` hash on the SSR'd page must include every
field the template renders. If it omits a field, freshness will never
detect changes to that field. The matching `_buildVersion(type, ...)` in
`freshness-controller.js` must hash exactly the same fields in the same
order, otherwise comparison will always say "stale" and trigger a write
storm.

Convention: when adding a new field to a page, update both sides at once.

## Throttle, not staleness gate

The 60-second `/freshness/should-check` window is a throttle: it limits
how often visitors collectively call Maho per key, regardless of how
stale KV actually is. If KV is 30 minutes stale and a visitor happens to
arrive moments after another visitor set the throttle (and got back
"unchanged"), this visitor will not trigger a check.

The mitigations: (a) `_lastChecked` is rendered as `data-freshness-checked`
on the SSR'd page so a future controller change can also trigger when the
data itself is older than N seconds (regardless of the cross-visitor
throttle); (b) any `/freshness` POST that actually writes new data also
bumps the pulse hash, busting the edge cache for downstream visitors —
so a real edit propagates fast even without per-visitor staleness checks.

## Worker /freshness POST: what it does

```
1. Validates the kvKey prefix is in FRESHNESS_ALLOWED_TYPES.
2. Stamps `_lastChecked = now` on the data.
3. KV.put(kvKey, data, 86400 TTL).
4. Computes a new pulse hash, KV.put('pulse', { hash, updatedAt }).
   The pulse hash is a build-version-style cache key — every edge-cached
   page is keyed by `?_v=<pulseHash>`, so bumping pulse retires every
   stale cached HTML at every edge node simultaneously.
```
