import { supabaseForUser, supabaseAdmin, cors, json, error } from "../_shared/deps.ts";
import { callClaude } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // Auth: staff only
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const sb = supabaseAdmin();
    const { data: profile } = await sb.from("users").select("role").eq("id", user.id).single();
    if (!["admin", "affiliate", "studio"].includes(profile?.role)) {
      return error("Staff access required", 403);
    }

    const { ticketId } = await req.json();
    if (!ticketId) return error("ticketId required");

    // Fetch ticket with messages
    const { data: ticket } = await sb
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (!ticket) return error("Ticket not found", 404);

    const { data: messages } = await sb
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    // Build context from ticket metadata
    const meta = ticket.metadata ?? {};
    const intakeContext = [
      `Company: ${meta.company ?? "Unknown"}`,
      `Industry: ${meta.industry ?? "Unknown"}`,
      `Project Type: ${meta.project_type ?? "Unknown"}`,
      `Budget: ${meta.budget ?? "Unknown"}`,
      `Timeline: ${meta.timeline ?? "Unknown"}`,
      meta.website ? `Current Website: ${meta.website}` : null,
      meta.plan ? `Chosen Plan: ${meta.plan} (${meta.billing ?? "monthly"})` : null,
      meta.design_fee ? `Design Fee: $${meta.design_fee} CAD (${meta.design_fee_status})` : null,
      `Contact: ${ticket.contact_name ?? "Unknown"} (${ticket.contact_email ?? ""})`,
      meta.phone ? `Phone: ${meta.phone}` : null,
    ].filter(Boolean).join("\n");

    const conversationText = (messages ?? [])
      .map((m: any) => `${m.sender}: ${m.message}`)
      .join("\n\n");

    const systemPrompt = `You are a project manager at Envosta, a premium managed WordPress hosting company. You create structured onboarding briefs for the studio/design team.

Envosta Plans:
- Minimum ($50/mo): Basic hosting, 1-on-1 setup, free migration
- Growth ($129/mo): + SEO audit, WooCommerce, plugin setup, performance optimization
- Performance ($350/mo): + Custom theme design, dedicated team, priority support

Design process: Custom theme design & build, $500 flat fee invoiced after client approval.

Onboarding timeline: 3-5 business days for hosting setup, 2-4 weeks for design projects.`;

    const userMessage = `Generate a structured onboarding brief for the studio team based on this closed deal.

Client Context:
${intakeContext}

Conversation History:
${conversationText || "No messages yet."}

Generate the brief with these sections:

1. **Client Overview** — Who they are, what they do, key contact info
2. **Project Scope** — What needs to be built/migrated, features required
3. **Design Requirements** — Style direction, branding notes, competitor references if any
4. **Technical Requirements** — E-commerce, integrations, forms, SEO, specific plugins
5. **Content Needs** — What content the client needs to provide (photos, copy, logos, etc.)
6. **Timeline** — Realistic milestones based on their stated timeline
7. **Next Steps** — Immediate action items for the studio team

Be specific and actionable. If information is missing, note it as "TBD — follow up with client."`;

    const result = await callClaude(systemPrompt, userMessage, 1200);

    // Log AI usage and deduct credits from the customer's account
    try {
      const ticketUserId = ticket.user_id;
      if (ticketUserId) {
        const { data: pricingRow } = await sb.from("products")
          .select("metadata")
          .eq("type", "credit_rate")
          .eq("slug", "ai_tokens-per_1k_tokens")
          .maybeSingle();
        const rate = Number((pricingRow?.metadata as any)?.credits_per_unit ?? 0.5);
        const creditsCharged = Math.round((result.total_tokens / 1000) * rate * 10000) / 10000;

        await sb.from("logs").insert({
          user_id: ticketUserId,
          action: "ai.usage",
          details: `onboarding_brief: ${result.total_tokens} tokens`,
          level: "info",
          metadata: { ai_action: "onboarding_brief", input_tokens: result.input_tokens, output_tokens: result.output_tokens, total_tokens: result.total_tokens, credits_charged: creditsCharged, model: "claude-sonnet-4-20250514" },
        });

        if (creditsCharged > 0) {
          await sb.rpc("fn_deduct_credits", {
            p_user_id: ticketUserId,
            p_amount: Math.ceil(creditsCharged),
            p_service_type: "ai_tokens",
            p_description: `AI onboarding brief: ${result.total_tokens} tokens`,
            p_reference_id: ticketId,
          });
        }
      }
    } catch (logErr) {
      console.error("AI usage log error (non-fatal):", logErr);
    }

    return json({ brief: result.text });
  } catch (e) {
    console.error("AI onboarding brief error:", e);
    return error(String(e), 500);
  }
});
