import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
export const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
export const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
export const WPCLOUD_API_KEY = Deno.env.get("WPCLOUD_API_KEY") ?? "";
export const WPCLOUD_PROXY_URL = Deno.env.get("WPCLOUD_PROXY_URL") ?? "";
export const WPCLOUD_PROXY_SECRET = Deno.env.get("WPCLOUD_PROXY_SECRET") ?? "";
export const WPCLOUD_CLIENT = Deno.env.get("WPCLOUD_CLIENT") ?? "envosta";

/**
 * Make a request to the wp.cloud Atomic API via the static IP proxy.
 * The proxy forwards to atomic-api.wordpress.com with the same path/headers.
 * Base API path: /api/v1.0/
 * Auth header: Auth: API_KEY (proxy passes Authorization: Bearer as-is)
 */
export async function wpcloudPost(path: string, body?: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${WPCLOUD_PROXY_URL}${path}`;

  // wp.cloud API uses application/x-www-form-urlencoded for most endpoints
  const formBody = new URLSearchParams();
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "object" && value !== null) {
        // Nested objects: flatten with bracket notation
        for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
          formBody.append(`${key}[${subKey}]`, String(subValue));
        }
      } else {
        formBody.append(key, String(value ?? ""));
      }
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Auth": WPCLOUD_API_KEY,
      "X-Proxy-Secret": WPCLOUD_PROXY_SECRET,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });
  const rawText = await res.text();
  console.log("wpcloud raw response:", res.status, rawText);
  let json;
  try { json = JSON.parse(rawText); } catch { json = { raw: rawText }; }
  // Return full response — keep message + data together
  return { ok: res.ok, status: res.status, data: json };
}

export async function wpcloudGet(path: string): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${WPCLOUD_PROXY_URL}${path}`;
  console.log("wpcloud GET:", url);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Auth": WPCLOUD_API_KEY,
      "X-Proxy-Secret": WPCLOUD_PROXY_SECRET,
    },
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json?.data ?? json };
}

export function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export function supabaseForUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

export function getStripe() {
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
}

export function getCryptoProvider() {
  return Stripe.createSubtleCryptoProvider();
}

const ALLOWED_ORIGINS = [
  "https://envosta.com",
  "https://www.envosta.com",
  "https://my.envosta.com",
  "http://localhost:3000",
];

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

// Backwards compat — used by functions that don't pass request
export const cors = {
  "Access-Control-Allow-Origin": "https://envosta.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const json = (data: unknown, status = 200, req?: Request) =>
  new Response(JSON.stringify(data), { status, headers: { ...(req ? getCorsHeaders(req) : cors), "Content-Type": "application/json" } });

export const error = (msg: string, status = 400) => json({ error: msg }, status);

export async function log(p: {
  userId?: string; serviceId?: string; level?: string;
  action: string; message?: string; req?: unknown; res?: unknown;
  ip?: string; ua?: string; ms?: number;
}) {
  try {
    const sb = supabaseAdmin();
    await sb.from("logs").insert({
      user_id: p.userId, site_id: p.serviceId, level: p.level ?? "info",
      action: p.action, message: p.message, request_payload: p.req,
      response_payload: p.res, ip_address: p.ip, user_agent: p.ua, duration_ms: p.ms,
    });
  } catch (e) {
    console.error("Log write failed:", e);
  }
}

export { Stripe };
