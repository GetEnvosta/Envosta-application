const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-sonnet-4-20250514";

export interface ClaudeResponse {
  text: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

/**
 * Shared helper to call Claude API from Supabase edge functions.
 * Returns the text response and token usage.
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 800,
): Promise<ClaudeResponse> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

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

  return {
    text: data?.content?.[0]?.text ?? "",
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
  };
}
