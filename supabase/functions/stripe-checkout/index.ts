import { supabaseAdmin, supabaseForUser, getStripe, cors, json, error, log } from "../_shared/deps.ts";

/**
 * Create a Stripe Checkout session.
 *
 * Supports:
 * 1. Plan only: { priceId } → subscription checkout
 * 2. Plan + domain: { priceId, domainName, domainPriceCents } → subscription + one-time domain charge
 * 3. Domain only: { domainName, domainPriceCents } → one-time payment for domain registration
 * 4. Domain renewal: { domainName, domainPriceCents, renewal: true } → one-time payment for renewal
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) {
      console.error("Auth error:", authErr?.message);
      return error("Unauthorized", 401);
    }

    const { priceId, domainName, domainPriceCents, renewal } = await req.json();
    if (!priceId && !domainName) return error("priceId or domainName is required");

    const stripe = getStripe();
    const sb = supabaseAdmin();

    // Get or create Stripe customer
    let { data: customer } = await sb.from("customers")
      .select("*").eq("user_id", user.id).single();

    if (!customer) {
      const sc = await stripe.customers.create({
        email: user.email ?? "",
        metadata: { supabase_user_id: user.id },
      });
      const { data: newCust } = await sb.from("customers").insert({
        user_id: user.id, stripe_customer_id: sc.id, billing_email: user.email,
      }).select().single();
      customer = newCust;
    }

    // Build line items
    const line_items: any[] = [];

    // Subscription line item (hosting plan)
    if (priceId) {
      line_items.push({ price: priceId, quantity: 1 });
    }

    // Domain line item (one-time charge)
    if (domainName && domainPriceCents) {
      const label = renewal
        ? `Domain Renewal: ${domainName} (1 year)`
        : `Domain Registration: ${domainName} (1 year)`;

      line_items.push({
        price_data: {
          currency: "cad",
          unit_amount: domainPriceCents,
          product_data: { name: label },
        },
        quantity: 1,
      });
    }

    if (line_items.length === 0) return error("No line items to checkout");

    // Determine checkout mode
    // If there's a subscription price, mode must be "subscription"
    // If domain only (no priceId), mode is "payment"
    const mode = priceId ? "subscription" : "payment";

    // Build session params
    const sessionParams: any = {
      customer: customer!.stripe_customer_id,
      mode,
      line_items,
      success_url: `https://my.envosta.com/dashboard/sites?checkout=success${domainName ? `&domain=${domainName}` : ""}`,
      cancel_url: "https://my.envosta.com/dashboard/add-site?checkout=cancelled",
      metadata: {
        supabase_user_id: user.id,
        ...(domainName && { domain_name: domainName }),
      },
    };

    // Add subscription metadata only for subscription mode
    if (mode === "subscription") {
      sessionParams.subscription_data = {
        metadata: {
          supabase_user_id: user.id,
          ...(domainName && { domain_name: domainName }),
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Checkout created:", session.id, "mode:", mode, "domain:", domainName ?? "none");
    await log({ userId: user.id, action: "stripe.checkout.created", message: `${session.id} (${mode})` });
    return json({ url: session.url, sessionId: session.id });

  } catch (e) {
    console.error("Checkout error:", e);
    return error(String(e), 500);
  }
});
