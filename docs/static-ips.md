# Vercel Static IPs

These are the two static outbound IPs assigned to the Envosta Vercel
project. All outbound traffic from Vercel Functions to whitelisted
upstream services originates from one of these IPs.

| IP | Whitelisted at OpenSRS | Whitelisted at wp.cloud |
|---|---|---|
| `184.72.2.216` | ✅ Yes | ⏳ Pending confirmation |
| `54.241.78.174` | ✅ Yes | ⏳ Pending confirmation |

## OpenSRS

Whitelisted via the OpenSRS Reseller Control Panel → Profile →
API Configuration. Self-serve.

## wp.cloud

wp.cloud (Atomic) does not have a self-serve IP allowlist UI. Whitelisting
is done by your Atomic account representative. Email the rep with both
IPs above and confirm reachability before cutting over wp.cloud traffic.

## Cutover history

- **2026-05-06** — Static IPs enabled in Vercel.
- **2026-05-06** — Both IPs whitelisted with OpenSRS. OpenSRS callers
  cut over from Supabase Edge Function (proxy) → Vercel internal route
  (direct).
- **TBD** — wp.cloud whitelist confirmed. wp.cloud callers cut over.
- **TBD** — 7-day burn-in complete. Cloud Run proxies decommissioned,
  `opensrs-proxy/` directory removed, `*_PROXY_*` env vars cleared.

## Verification

To confirm an outbound call is coming from a Vercel IP, hit an echo
service from a Vercel route:

```ts
// src/app/api/debug/outbound-ip/route.ts (temporary)
export async function GET() {
  const r = await fetch('https://api.ipify.org?format=json').then(r => r.json());
  return Response.json(r);
}
```

The returned IP should match one of the two above.
