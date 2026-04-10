import { supabaseAdmin } from "./deps.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-sonnet-4-20250514";

// Platform-wide daily alert threshold (tokens)
const PLATFORM_DAILY_ALERT = 5_000_000;

export interface ClaudeResponse {
  text: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

/**
 * Check if a user has exceeded their daily AI token budget.
 * Uses their monthly_ai_token_limit from sites, divided by 30.
 * Returns { allowed, dailyUsed, dailyLimit } or null if no limit set.
 */
export async function checkAiTokenBudget(userId: string | null): Promise<{
  allowed: boolean;
  dailyUsed: number;
  dailyLimit: number | null;
}> {
  if (!userId) return { allowed: true, dailyUsed: 0, dailyLimit: null };

  const sb = supabaseAdmin();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  // Get today's token usage from logs
  const { data: todayLogs } = await sb
    .from("logs")
    .select("metadata")
    .eq("user_id", userId)
    .eq("action", "ai.usage")
    .gte("created_at", startOfDay);

  let dailyUsed = 0;
  for (const log of todayLogs ?? []) {
    dailyUsed += (log.metadata as any)?.total_tokens ?? 0;
  }

  // Get their monthly limit from any active site
  const { data: sites } = await sb
    .from("sites")
    .select("monthly_ai_token_limit")
    .eq("user_id", userId)
    .in("status", ["active", "provisioning"])
    .not("monthly_ai_token_limit", "is", null)
    .limit(1);

  const monthlyLimit = sites?.[0]?.monthly_ai_token_limit ?? null;
  const dailyLimit = monthlyLimit ? Math.floor(monthlyLimit / 30) : null;

  return {
    allowed: dailyLimit ? dailyUsed < dailyLimit : true,
    dailyUsed,
    dailyLimit,
  };
}

/**
 * Check platform-wide daily token usage and alert if threshold exceeded.
 */
async function checkPlatformDailyUsage(): Promise<void> {
  const sb = supabaseAdmin();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const { data: todayLogs } = await sb
    .from("logs")
    .select("metadata")
    .eq("action", "ai.usage")
    .gte("created_at", startOfDay);

  let totalTokens = 0;
  for (const log of todayLogs ?? []) {
    totalTokens += (log.metadata as any)?.total_tokens ?? 0;
  }

  if (totalTokens > PLATFORM_DAILY_ALERT) {
    // Check if we already alerted today
    const { data: existingAlert } = await sb
      .from("logs")
      .select("id")
      .eq("action", "platform.ai_spend_alert")
      .gte("created_at", startOfDay)
      .maybeSingle();

    if (!existingAlert) {
      await sb.from("logs").insert({
        action: "platform.ai_spend_alert",
        details: `Platform AI usage: ${totalTokens.toLocaleString()} tokens today (threshold: ${PLATFORM_DAILY_ALERT.toLocaleString()})`,
        level: "warn",
        metadata: { total_tokens: totalTokens, threshold: PLATFORM_DAILY_ALERT },
      });

      // Email admin
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
      if (RESEND_API_KEY) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Envosta <noreply@email.envosta.com>",
              to: "admin@envosta.com",
              subject: `[Platform Alert] AI token usage: ${totalTokens.toLocaleString()} tokens today`,
              html: `<p>Platform-wide AI usage has reached <strong>${totalTokens.toLocaleString()} tokens</strong> today (alert threshold: ${PLATFORM_DAILY_ALERT.toLocaleString()}).</p><p>This is informational — no calls are being blocked.</p>`,
            }),
          });
        } catch {}
      }
    }
  }
}

/**
 * Shared helper to call Claude API from Supabase edge functions.
 * Checks per-user daily token budget before calling.
 * Returns the text response and token usage.
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 800,
  userId?: string | null,
): Promise<ClaudeResponse> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  // Check per-user budget if userId provided
  if (userId) {
    const budget = await checkAiTokenBudget(userId);
    if (!budget.allowed) {
      throw new Error(
        `AI token limit reached. You've used ${budget.dailyUsed.toLocaleString()} of ${budget.dailyLimit?.toLocaleString()} tokens today. Try again tomorrow or increase your limit in site settings.`
      );
    }
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: `${systemPrompt}\n\n${userMessage}` }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Anthropic API error:", res.status, errText);
    throw new Error(`AI API error: ${res.status}`);
  }

  const data = await res.json();
  const inputTokens = data?.usage?.input_tokens ?? 0;
  const outputTokens = data?.usage?.output_tokens ?? 0;

  // Check platform-wide usage (non-blocking, runs in background)
  checkPlatformDailyUsage().catch(() => {});

  return {
    text: data?.content?.[0]?.text ?? "",
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
  };
}
