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

    const { priceId, domainName, domainPriceCents, renewal, customInvoice, targetCustomerId, amount, description, studioRequest, studioSubject, studioMessage } = await req.json();

    const stripe = getStripe();
    const sb = supabaseAdmin();

    // ---- Studio Request (price from products table) ----
    if (studioRequest) {
      // Get or create customer
      let { data: customer } = await sb.from("users").select("*").eq("id", user.id).single();
      if (!customer?.stripe_customer_id) {
        const sc = await stripe.customers.create({ email: user.email ?? "", metadata: { supabase_user_id: user.id } });
        await sb.from("users").update({ stripe_customer_id: sc.id }).eq("id", user.id);
        customer = { ...customer, stripe_customer_id: sc.id };
      }

      // Get studio request price from DB
      const { data: studioAddon } = await sb.from("products").select("price_cad, stripe_price_id, name").eq("slug", "studio-request").maybeSingle();
      const studioPrice = studioAddon?.price_cad ?? 25000;
      const studioName = studioAddon?.name ?? "Studio Request";

      const lineItems: any[] = studioAddon?.stripe_price_id
        ? [{ price: studioAddon.stripe_price_id, quantity: 1 }]
        : [{ price_data: { currency: "usd", unit_amount: studioPrice, product_data: { name: studioName } }, quantity: 1 }];

      const session = await stripe.checkout.sessions.create({
        customer: customer!.stripe_customer_id,
        mode: "payment",
        line_items: lineItems,
        success_url: `https://my.envosta.com/dashboard/support?studio=success`,
        cancel_url: `https://my.envosta.com/dashboard/support?studio=cancelled`,
        metadata: {
          supabase_user_id: user.id,
          type: "studio_request",
          studio_subject: (studioSubject ?? "").slice(0, 200),
          studio_message: (studioMessage ?? "").slice(0, 400),
        },
      });

      console.log("Studio request checkout:", session.id);
      await log({ userId: user.id, action: "stripe.studio_request.created", message: studioSubject ?? "Studio Request" });
      return json({ url: session.url, sessionId: session.id });
    }

    // ---- Custom Invoice (admin sends one-time charge to a customer) ----
    if (customInvoice && targetCustomerId && amount && description) {
      // Verify caller is admin
      const { data: profile } = await sb.from("users").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") return error("Admin access required", 403);

      // Create Stripe Invoice
      const invoiceItem = await stripe.invoiceItems.create({
        customer: targetCustomerId,
        amount: amount,
        currency: "usd",
        description: description,
      });

      const invoice = await stripe.invoices.create({
        customer: targetCustomerId,
        auto_advance: true, // auto-finalize and send
        collection_method: "send_invoice",
        days_until_due: 14,
      });

      // Finalize and send
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      await stripe.invoices.sendInvoice(invoice.id);

      console.log("Custom invoice created:", invoice.id, "amount:", amount, "to:", targetCustomerId);
      await log({ userId: user.id, action: "stripe.custom_invoice.created", message: `${description} - $${(amount / 100).toFixed(2)} USD to ${targetCustomerId}` });

      return json({
        invoiceId: invoice.id,
        invoiceUrl: finalized.hosted_invoice_url,
        status: finalized.status,
      });
    }

    if (!priceId && !domainName) return error("priceId or domainName is required");

    // Get or create Stripe customer
    let { data: customer } = await sb.from("users")
      .select("*").eq("id", user.id).single();

    if (!customer?.stripe_customer_id) {
      const sc = await stripe.customers.create({
        email: user.email ?? "",
        metadata: { supabase_user_id: user.id },
      });
      await sb.from("users").update({ stripe_customer_id: sc.id }).eq("id", user.id);
      customer = { ...customer, stripe_customer_id: sc.id };
    }

    // Build line items
    const line_items: any[] = [];

    // Subscription line item (hosting plan)
    if (priceId) {
      line_items.push({ price: priceId, quantity: 1 });
    }

    // Domain registration is free with the hosting plan (first year included).
    // Webhook handles OpenSRS registration and creates a yearly renewal
    // subscription with 1-year trial so renewals auto-charge from year 2.
    // Domain-only purchases (no plan) still need a charge:
    if (domainName && !priceId) {
      const tld = domainName.split(".").pop()?.toLowerCase() ?? "";
      const { data: tldProduct } = await sb.from("products")
        .select("stripe_price_id, price_usd, price_cad, metadata")
        .eq("type", "domain_tld")
        .eq("slug", `tld-${tld}`).maybeSingle();

      // Always prefer the USD Stripe price ID. Fallback to inline price_data
      // in USD using price_usd (then price_cad as last-resort if a TLD hasn't
      // had USD pricing populated yet).
      if (tldProduct?.stripe_price_id) {
        line_items.push({ price: tldProduct.stripe_price_id, quantity: 1 });
      } else {
        line_items.push({
          price_data: {
            currency: "usd",
            unit_amount:
              (tldProduct?.metadata as any)?.registration_price_usd
              ?? tldProduct?.price_usd
              ?? (tldProduct?.metadata as any)?.registration_price_cad
              ?? tldProduct?.price_cad
              ?? 1500,
            product_data: { name: `Domain Registration: ${domainName} (1 year)` },
          },
          quantity: 1,
        });
      }
    }

    if (line_items.length === 0) return error("No line items to checkout");

    // Determine checkout mode
    // If any line item is a recurring/subscription price, mode must be "subscription"
    // Domain-only with Stripe Price (yearly) is also a subscription
    const hasRecurring = line_items.some((li: any) => li.price && !li.price_data);
    const mode = (priceId || hasRecurring) ? "subscription" : "payment";

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
