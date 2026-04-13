import { supabaseForUser, supabaseAdmin, cors, json, error } from "../_shared/deps.ts";
import { callClaude } from "../_shared/anthropic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const {
      salesRep, contactName, email, phone, company, website,
      industry, projectType, budget, timeline, notes,
      plan, billing, closedOnSpot,
    } = await req.json();

    if (!contactName || !company || !industry) {
      return error("Missing required intake fields");
    }

    const systemPrompt = `You are a sales advisor for Envosta, a premium managed WordPress hosting company with personal onboarding and concierge service.

Our plans:
- Minimum ($50 CAD/mo): 10GB SSD, 50GB bandwidth, staging, daily backups, 1-on-1 setup, free migration
- Growth ($129 CAD/mo): 30GB SSD, 200GB bandwidth, SEO audit, WooCommerce setup, plugin recommendations
- Performance ($350 CAD/mo): 100GB SSD, unlimited bandwidth, priority support, custom theme design, dedicated team

Design service: $500 CAD flat fee, invoiced after client approves the design.

Annual billing saves 2 months (roughly 17% off).`;

    const intakeData = [
      `Contact: ${contactName}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Company: ${company}`,
      website ? `Current Website: ${website}` : null,
      `Industry: ${industry}`,
      `Project Type: ${projectType}`,
      `Budget Range: ${budget}`,
      `Timeline: ${timeline}`,
      closedOnSpot ? `CLOSED ON SPOT: ${plan} plan (${billing})` : null,
      notes ? `Notes: ${notes}` : null,
    ].filter(Boolean).join("\n");

    const userMessage = `Given this intake form data from sales rep ${salesRep}, generate:

1. **Lead Summary** (2-3 sentences describing this lead and their needs)
2. **Recommended Plan** (which Envosta plan fits best and why — one sentence)
3. **Talking Points** (3-4 bullet points the sales rep can use in the conversation)
4. **Estimated Scope** (what this project likely involves — 2-3 sentences)

Intake Data:
${intakeData}

Format your response with clear headers. Be concise and actionable.`;

    const summary = await callClaude(systemPrompt, userMessage, 600);

    return json({ summary });
  } catch (e) {
    console.error("AI intake summary error:", e);
    return error(String(e), 500);
  }
});
