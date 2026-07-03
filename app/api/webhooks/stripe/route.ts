// app/api/webhooks/stripe/route.ts — Next.js App Router webhook endpoint
// Security: raw-body signature verification + idempotency via stripe_events.
// Configure the endpoint in Stripe Dashboard -> Webhooks with STRIPE_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe, syncSubscription, syncInvoice, syncCustomer } from "@/lib/stripe";
import { enqueueProvisioning } from "@/lib/provisioning";

export const runtime = "nodejs"; // raw body access

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // Idempotency: insert-once ledger. Duplicate deliveries exit early.
  const { error: dup } = await supabase.from("stripe_events").insert({
    id: event.id, type: event.type, payload: event as unknown as Record<string, unknown>,
  });
  if (dup) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientId = session.metadata?.client_id;
        if (clientId) {
          // Payment confirmed -> fire the automation spine (dry-run honors env).
          await enqueueProvisioning(clientId);
        }
        break;
      }
      case "customer.created":
      case "customer.updated":
        await syncCustomer(event.data.object as Stripe.Customer);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.finalized":
      case "invoice.paid":
      case "invoice.payment_failed":
        await syncInvoice(event.data.object as Stripe.Invoice);
        break;
      default:
        break; // stored in ledger; unhandled types are fine
    }
    await supabase.from("stripe_events").update({ processed: true }).eq("id", event.id);
  } catch (err) {
    await supabase.from("stripe_events")
      .update({ processed: false, error: String(err) })
      .eq("id", event.id);
    // 500 -> Stripe retries; idempotency ledger makes retries safe.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
