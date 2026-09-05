/** Server-side OpenAI integration for Renovo IPNC.
 * Server-only. Authentication/authorization MUST finish before invoking this helper.
 * No SDK dependency, no retries, no logging, no Lovable fallback.
 */
export const OPENAI_MODEL = "gpt-4.1-mini-2025-04-14";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";
export const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export type FunctionTool = {
  type: "function";
  function: { name: string; description?: string; parameters: Record<string, unknown>; strict?: boolean };
};
export type ChatRequest = {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  tools?: FunctionTool[];
  tool_choice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  response_format?: { type: "json_object" };
  max_completion_tokens?: number;
};
type Dependencies = {
  provider?: "openai" | "gemini";
  fetch?: typeof fetch;
  env?: (name: string) => string | undefined;
  timeoutMs?: number;
  maxInputBytes?: number;
};

function runtimeEnv(name: string): string | undefined {
  return (globalThis as unknown as { Deno?: { env: { get(name: string): string | undefined } } }).Deno?.env.get(name);
}

function failure(status: number, code: string, message: string): Response {
  return Response.json({ error: message, code }, { status });
}

/** Returns Response so existing .ok/.status/.text()/.json() consumers keep working.
 * The HTTP response returned to the BROWSER must still use the caller's CORS headers.
 */
export function createOpenAIChat(dependencies: Dependencies = {}) {
  const fetchImpl = dependencies.fetch ?? fetch;
  const env = dependencies.env ?? runtimeEnv;
  const isGemini = dependencies.provider === "gemini";
  return async function openAIChat(input: ChatRequest, signal?: AbortSignal): Promise<Response> {
    // Configuration is read only at invocation; import and offline mocks never read credentials.
    const key = (isGemini ? (env("GEMINI_API_KEY") || env("Gemini API Key")) : env("OPENAI_API_KEY"))?.trim();
    if (!key) return failure(503, "ai_not_configured", "IA ainda não configurada no servidor.");
    if (/[^\x21-\x7E]/.test(key)) {
      return failure(503, "ai_key_format_invalid", "A chave de IA salva no servidor contém espaços internos ou caracteres inválidos.");
    }
    const model = isGemini ? (env("GEMINI_MODEL") ?? GEMINI_MODEL) : (env("OPENAI_MODEL") ?? OPENAI_MODEL);
    // Only validated models may be enabled; no arbitrary/expensive model from user payloads.
    if (isGemini ? model !== GEMINI_MODEL : (model !== OPENAI_MODEL && model !== "gpt-4.1-mini")) {
      return failure(503, "ai_model_not_validated", "Modelo de IA não validado para este aplicativo.");
    }
    if (!Array.isArray(input.messages) || !input.messages.length || input.messages.some(m =>
      !m || !["system", "user", "assistant"].includes(m.role) || typeof m.content !== "string")) {
      return failure(400, "invalid_ai_input", "Conteúdo inválido para IA.");
    }
    const outputLimit = input.max_completion_tokens ?? 4096;
    if (!Number.isInteger(outputLimit) || outputLimit < 1 || outputLimit > 8192) {
      return failure(400, "invalid_ai_limit", "Limite de saída de IA inválido.");
    }
    const hasTools = Array.isArray(input.tools) && input.tools.length > 0;
    if (input.tool_choice && !hasTools) {
      return failure(400, "invalid_ai_tools", "Ferramenta de IA ausente.");
    }
    // Explicit allowlist: never forward arbitrary properties such as model, n, store or stream.
    const body = JSON.stringify({
      model,
      messages: input.messages,
      ...(hasTools ? { tools: input.tools, tool_choice: input.tool_choice ?? "auto", ...(!isGemini ? { parallel_tool_calls: false } : {}) } : {}),
      ...(input.response_format ? { response_format: input.response_format } : {}),
      ...(isGemini ? { max_tokens: outputLimit, reasoning_effort: "minimal" } : { max_completion_tokens: outputLimit, store: false }),
      stream: false,
      n: 1,
    });
    if (new TextEncoder().encode(body).byteLength > (dependencies.maxInputBytes ?? 131072)) {
      return failure(413, "ai_input_too_large", "Conteúdo muito longo. Divida os registros antes de gerar com IA.");
    }
    if (signal?.aborted) return failure(408, "ai_cancelled", "Geração cancelada.");
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, dependencies.timeoutMs ?? 25000);
    try {
      const upstream = await fetchImpl(isGemini ? GEMINI_ENDPOINT : ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body,
        signal: controller.signal,
        redirect: "error",
      });
      let data: any;
      try { data = await upstream.json(); } catch {
        if (controller.signal.aborted) throw new Error("aborted");
        return failure(upstream.ok ? 502 : 503, "ai_invalid_response", "Serviço de IA indisponível no momento.");
      }
      if (!upstream.ok) {
        // Normalize OpenAI's quota 429 to the app's pre-existing payment/quota 402 branch.
        if (data?.error?.code === "insufficient_quota" || data?.error?.type === "insufficient_quota") {
          return failure(402, "ai_quota_exhausted", "Limite ou saldo da API de IA esgotado. Verifique o faturamento.");
        }
        if (upstream.status === 429) return failure(429, "ai_rate_limited", "Limite temporário de IA. Tente novamente mais tarde.");
        if (upstream.status === 401 || upstream.status === 403) {
          return Response.json({
            error: "IA indisponível por configuração do servidor.",
            code: "ai_configuration_error",
            reason: upstream.status === 401 ? "invalid_credentials" : "access_denied",
          }, { status: 503 });
        }
        return failure(upstream.status >= 500 ? 503 : 502, "ai_provider_error", "Não foi possível gerar o conteúdo com IA.");
      }
      const choice = data?.choices?.[0];
      const message = choice?.message;
      if (choice?.finish_reason === "length") return failure(502, "ai_output_truncated", "Resposta da IA excedeu o limite. Reduza o conteúdo.");
      if (choice?.finish_reason === "content_filter" || message?.refusal) return failure(422, "ai_refused", "Não foi possível gerar este conteúdo.");
      if (!message) return failure(502, "ai_empty_response", "IA não retornou conteúdo.");
      const calls = message.tool_calls;
      const forcedName = typeof input.tool_choice === "object" ? input.tool_choice.function.name : undefined;
      const requiresTool = !!forcedName || input.tool_choice === "required";
      if (requiresTool && (!Array.isArray(calls) || calls.length !== 1 || (forcedName && calls[0]?.function?.name !== forcedName))) {
        return failure(502, "ai_invalid_tool_call", "IA não retornou a extração esperada.");
      }
      if (Array.isArray(calls) && calls.length) {
        for (const call of calls) {
          if (call?.type !== "function" || typeof call?.function?.arguments !== "string" ||
              !input.tools?.some(tool => tool.function.name === call.function.name)) {
            return failure(502, "ai_invalid_tool_call", "IA retornou uma extração inválida.");
          }
          try { JSON.parse(call.function.arguments); } catch {
            return failure(502, "ai_invalid_tool_json", "IA retornou uma extração incompleta.");
          }
        }
      } else if (typeof message.content !== "string" || !message.content.trim()) {
        return failure(502, "ai_empty_response", "IA não retornou conteúdo.");
      }
      // Preserve the original Chat Completions envelope including usage, content and tool_calls.
      return Response.json(data, { status: 200 });
    } catch {
      if (timedOut) return failure(504, "ai_timeout", "A IA demorou para responder. Tente novamente.");
      if (signal?.aborted) return failure(408, "ai_cancelled", "Geração cancelada.");
      return failure(503, "ai_network_error", "Não foi possível conectar ao serviço de IA.");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  };
}

export const openAIChat = createOpenAIChat();
