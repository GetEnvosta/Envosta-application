import { supabaseAdmin, supabaseForUser, stripeRequest, cors, json, error, log } from "../_shared/deps.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const { priceId } = await req.json();
    if (!priceId) return error("priceId is required");

    const sb = supabaseAdmin();

    // Get or create Stripe customer
    let { data: customer } = await sb.from("customers")
      .select("*").eq("user_id", user.id).single();

    if (!customer) {
      const sc = await stripeRequest("/customers", {
        email: user.email ?? "",
        "metadata[supabase_user_id]": user.id,
      });
      const { data: newCust } = await sb.from("customers").insert({
        user_id: user.id, stripe_customer_id: sc.id, billing_email: user.email,
      }).select().single();
      customer = newCust;
    }

    // Create Stripe Checkout Session
    const session = await stripeRequest("/checkout/sessions", {
      customer: customer!.stripe_customer_id,
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: "https://my.envosta.com/dashboard?checkout=success",
      cancel_url: "https://my.envosta.com/dashboard?checkout=cancelled",
      "subscription_data[metadata][supabase_user_id]": user.id,
    });

    await log({ userId: user.id, action: "stripe.checkout.created", message: session.id });
    return json({ url: session.url, sessionId: session.id });

  } catch (e) {
    await log({ level: "error", action: "stripe.checkout.error", message: String(e) });
    return error(String(e), 500);
  }
});
