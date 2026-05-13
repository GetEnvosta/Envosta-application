# Vercel Static IPs

These are the two static outbound IPs assigned to the Envosta Vercel
project. All outbound traffic from Vercel Functions to whitelisted
upstream services originates from one of these IPs.

| IP | Whitelisted at OpenSRS | Whitelisted at wp.cloud |
|---|---|---|
| `184.72.2.216` | Yes | Yes |
| `54.241.78.174` | Yes | Yes |

## OpenSRS

Whitelisted via the OpenSRS Reseller Control Panel -> Profile ->
API Configuration. Self-serve.

## wp.cloud

wp.cloud (Atomic) does not have a self-serve IP allowlist UI. Whitelisting
is done via the Atomic account representative.

## Cutover history

- **2026-05-06** — Static IPs enabled in Vercel.
- **2026-05-06** — Both IPs whitelisted with OpenSRS. OpenSRS callers
  cut over from Supabase Edge Function (proxy) -> Vercel internal route
  (direct).
- **2026-05-12** — wp.cloud whitelist confirmed. wp.cloud callers cut
  over (commits `0db06b9`, `bd6595f`). Stripe webhook ported to Vercel
  (commit `8c92ce5`).
- **2026-05-13** — Phase 2D decommission. Supabase Edge Functions
  (`stripe-webhook`, `provision-hosting`, `site-info`, `register-domain`,
  `health-check`) and both Cloud Run proxies removed. All wp.cloud and
  OpenSRS traffic now originates directly from Vercel static IPs.

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
