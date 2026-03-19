import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
export const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
export const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
export const WPCLOUD_API_KEY = Deno.env.get("WPCLOUD_API_KEY") ?? "";
export const WPCLOUD_API_URL = Deno.env.get("WPCLOUD_API_URL") || "https://public-api.wordpress.com/wpcloud/v2";

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
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20" });
}

export function getCryptoProvider() {
  return Stripe.createSubtleCryptoProvider();
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

export const error = (msg: string, status = 400) => json({ error: msg }, status);

export async function log(p: {
  userId?: string; serviceId?: string; level?: string;
  action: string; message?: string; req?: unknown; res?: unknown;
  ip?: string; ua?: string; ms?: number;
}) {
  try {
    const sb = supabaseAdmin();
    await sb.from("logs").insert({
      user_id: p.userId, service_id: p.serviceId, level: p.level ?? "info",
      action: p.action, message: p.message, request_payload: p.req,
      response_payload: p.res, ip_address: p.ip, user_agent: p.ua, duration_ms: p.ms,
    });
  } catch (e) {
    console.error("Log write failed:", e);
  }
}

export { Stripe };
