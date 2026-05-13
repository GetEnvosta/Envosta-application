import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
export const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
export const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
export const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

export function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
}

export function supabaseForUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
