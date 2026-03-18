import { supabaseAdmin, supabaseForUser, ENOM_API_URL, ENOM_UID, ENOM_PW, cors, json, error, log } from "../_shared/deps.ts";

async function enom(command: string, params: Record<string, string>) {
  const q = new URLSearchParams({ command, uid: ENOM_UID, pw: ENOM_PW, responsetype: "json", ...params });
  const res = await fetch(`${ENOM_API_URL}?${q}`);
  if (!res.ok) throw new Error(`eNom HTTP ${res.status}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = Date.now();

  try {
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const { action, domainName, serviceId, years, nameservers } = await req.json();
    if (!domainName) return error("domainName is required");

    const parts = domainName.split(".");
    if (parts.length < 2) return error("Invalid domain format");
    const sld = parts.slice(0, -1).join(".");
    const tld = parts[parts.length - 1];
    const sb = supabaseAdmin();

    // CHECK availability
    if (action === "check") {
      const result = await enom("Check", { sld, tld });
      const available = result?.RRPCode === "210" || result?.RRPCode === 210;
      await log({ userId: user.id, action: "domain.check", message: `${domainName}: ${available ? "available" : "taken"}`, ms: Date.now() - t0 });
      return json({ domainName, available });
    }

    // REGISTER
    const { data: domain, error: domErr } = await sb.from("domains").insert({
      user_id: user.id, service_id: serviceId, domain_name: domainName,
      tld, status: "pending_dns", nameservers: nameservers ?? [],
    }).select().single();
    if (domErr) return error(domErr.message, 500);

    const purchaseParams: Record<string, string> = { sld, tld, NumYears: String(years ?? 1) };
    if (nameservers?.length) {
      nameservers.forEach((ns: string, i: number) => { purchaseParams[`NS${i + 1}`] = ns; });
    }

    const result = await enom("Purchase", purchaseParams);
    const success = result?.RRPCode === "200" || result?.RRPCode === 200;
    const ms = Date.now() - t0;

    if (!success) {
      await sb.from("domains").update({ status: "failed", metadata: { error: result } }).eq("id", domain.id);
      await log({ userId: user.id, level: "error", action: "domain.register.failed", message: domainName, res: result, ms });
      return error("Registration failed", 502);
    }

    await sb.from("domains").update({
      status: "registered", enom_order_id: result?.OrderID,
      registration_date: new Date().toISOString(),
      expiry_date: new Date(Date.now() + (years ?? 1) * 365.25 * 86400000).toISOString(),
      metadata: result,
    }).eq("id", domain.id);

    await log({ userId: user.id, serviceId, action: "domain.register.success", message: domainName, ms });
    return json({ domainId: domain.id, domainName, status: "registered" });

  } catch (e) {
    await log({ level: "error", action: "domain.register.error", message: String(e) });
    return error(String(e), 500);
  }
});
