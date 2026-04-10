import { supabaseAdmin, supabaseForUser, cors, json, error } from "../_shared/deps.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // Auth: admin only
    const userSb = supabaseForUser(req);
    const { data: { user }, error: authErr } = await userSb.auth.getUser();
    if (authErr || !user) return error("Unauthorized", 401);

    const sb = supabaseAdmin();
    const { data: profile } = await sb.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return error("Admin access required", 403);

    const { ticketId, ticketType, thread, customerContext, quoteAmount, intakeMetadata } = await req.json();
    if (!ticketType || !thread) return error("ticketType and thread are required");

    // Build system prompt
    let contextLines = `Ticket type: ${ticketType}`;
    if (customerContext) {
      contextLines += `\nCustomer: ${customerContext.name ?? "Unknown"}`;
      if (customerContext.plan) contextLines += `\nPlan: ${customerContext.plan}`;
      if (customerContext.siteUrl) contextLines += `\nSite: ${customerContext.siteUrl}`;
      if (customerContext.siteStatus) contextLines += `\nSite Status: ${customerContext.siteStatus}`;
      if (customerContext.onboardingStage) contextLines += `\nOnboarding: ${customerContext.onboardingStage}`;
    }
    if (quoteAmount) {
      contextLines += `\nApproved quote: $${(quoteAmount / 100).toFixed(2)} CAD`;
    }
    // Add intake form context for sales tickets
    if (intakeMetadata) {
      if (intakeMetadata.company) contextLines += `\nCompany: ${intakeMetadata.company}`;
      if (intakeMetadata.industry) contextLines += `\nIndustry: ${intakeMetadata.industry}`;
      if (intakeMetadata.project_type) contextLines += `\nProject: ${intakeMetadata.project_type}`;
      if (intakeMetadata.budget) contextLines += `\nBudget: ${intakeMetadata.budget}`;
      if (intakeMetadata.timeline) contextLines += `\nTimeline: ${intakeMetadata.timeline}`;
      if (intakeMetadata.plan) contextLines += `\nInterested Plan: ${intakeMetadata.plan} (${intakeMetadata.billing ?? "monthly"})`;
      if (intakeMetadata.closed_on_spot) contextLines += `\nDeal Status: CLOSED ON SPOT`;
      if (intakeMetadata.sales_rep) contextLines += `\nAffiliate: ${intakeMetadata.sales_rep}`;
    }

    const conversationText = thread.map((msg: any) =>
      `${msg.sender === "customer" ? "Customer" : "Agent"}: ${msg.message}`
    ).join("\n\n");

    const systemPrompt = `You are a support agent for Envosta, a premium WordPress hosting company with personal onboarding and concierge service.

${contextLines}

Conversation:
${conversationText}

Draft a professional, warm, concise reply.
- Support: helpful, technical, reference their setup when relevant
- Studio: creative, professional, ask about scope if no quote yet, confirm next steps if quoted
- Onboarding: enthusiastic not pushy, highlight personal onboarding and concierge service, guide toward signing up

Under 150 words. Be human, not corporate.`;

    // Call Anthropic API
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: systemPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return error(`AI API error: ${anthropicRes.status}`, 502);
    }

    const anthropicData = await anthropicRes.json();
    const draft = anthropicData?.content?.[0]?.text ?? "";
    const inputTokens = anthropicData?.usage?.input_tokens ?? 0;
    const outputTokens = anthropicData?.usage?.output_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;

    console.log("AI draft generated for ticket:", ticketId, "length:", draft.length, "tokens:", totalTokens);

    // Log AI usage and deduct credits from the customer whose ticket this is
    try {
      if (ticketId) {
        const { data: ticket } = await sb.from("tickets").select("user_id").eq("id", ticketId).maybeSingle();
        const ticketUserId = ticket?.user_id;

        const { data: pricingRow } = await sb.from("products")
          .select("metadata")
          .eq("type", "credit_rate")
          .eq("slug", "ai_tokens-per_1k_tokens")
          .maybeSingle();
        const rate = Number((pricingRow?.metadata as any)?.credits_per_unit ?? 0.5);
        const creditsCharged = Math.round((totalTokens / 1000) * rate * 10000) / 10000;

        await sb.from("logs").insert({
          user_id: ticketUserId,
          action: "ai.usage",
          details: `draft_reply: ${totalTokens} tokens`,
          level: "info",
          metadata: { ai_action: "draft_reply", input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens, credits_charged: creditsCharged, model: "claude-sonnet-4-20250514" },
        });

        if (ticketUserId && creditsCharged > 0) {
          await sb.rpc("fn_deduct_credits", {
            p_user_id: ticketUserId,
            p_amount: Math.ceil(creditsCharged),
            p_service_type: "ai_tokens",
            p_description: `AI draft reply: ${totalTokens} tokens`,
            p_reference_id: ticketId,
          });
        }
      }
    } catch (logErr) {
      console.error("AI usage log error (non-fatal):", logErr);
    }

    return json({ draft });
  } catch (e) {
    console.error("AI draft error:", e);
    return error(String(e), 500);
  }
});
