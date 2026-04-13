import { supabaseForUser, cors, json, error, log } from "../_shared/deps.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);
    const { action, message, serviceId, level, metadata } = await req.json();
    if (!action) return error("action is required");
    await log({
      userId: user.id, serviceId, level: level ?? "info", action, message,
      req: metadata, ip: req.headers.get("x-forwarded-for") ?? undefined,
      ua: req.headers.get("user-agent") ?? undefined,
    });
    return json({ logged: true });
  } catch (e) {
    return error(String(e), 500);
  }
});
