import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
export const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
export const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
export const WPCLOUD_API_KEY = Deno.env.get("WPCLOUD_API_KEY") ?? "";
export const WPCLOUD_API_URL = Deno.env.get("WPCLOUD_API_URL") || "https://public-api.wordpress.com/wpcloud/v2";
export const ENOM_API_URL = Deno.env.get("ENOM_API_URL") || "https://resellertest.enom.com/interface.asp";
export const ENOM_UID = Deno.env.get("ENOM_UID") ?? "";
export const ENOM_PW = Deno.env.get("ENOM_PW") ?? "";

export function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export function supabaseForUser(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  return createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

export async function stripeRequest(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  return res.json();
}

export async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
    },
  });
  return res.json();
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
  } catch {
    /* logging should never crash the caller */
  }
}
