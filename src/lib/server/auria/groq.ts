import "server-only";
import { z } from "zod";
import { configuredGroq, parseRetryAfter } from "@/lib/auria/provider-policy";
import { AuriaError } from "@/lib/auria/validation";
import type { ChatProvider } from "@/types/auria";

const endpoint = "https://api.groq.com/openai/v1/chat/completions";
const usage = z.object({
  prompt_tokens: z.number().int().nonnegative().optional(),
  completion_tokens: z.number().int().nonnegative().optional(),
  total_tokens: z.number().int().nonnegative().optional(),
});
const frame = z.object({
  choices: z.array(z.object({
    delta: z.object({
      content: z.string().nullable().optional(),
      tool_calls: z.array(z.object({
        index: z.number().int().nonnegative().max(7),
        id: z.string().optional(),
        function: z.object({ name: z.string().optional(), arguments: z.string().optional() }).optional(),
      })).max(8).nullable().optional(),
    }).optional(),
    finish_reason: z.string().nullable().optional(),
  })).max(1).optional(),
  usage: usage.nullable().optional(),
  x_groq: z.object({ usage: usage.nullable().optional() }).nullable().optional(),
  error: z.object({ code: z.string().optional(), type: z.string().optional() }).optional(),
});
type GroqTool = { id: string; type: "function"; function: { name: string; arguments: string } };
type GroqAssistant = { role: "assistant"; content: string | null; tool_calls: GroqTool[] };

function incomplete() {
  return new AuriaError("PROVIDER_INCOMPLETE", "The reply ended before it was complete. You can retry.", 502, true);
}

async function* serverSentData(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", bytes = 0;
  const data: string[] = [];
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) return;
      bytes += part.value.byteLength;
      if (bytes > 256_000) throw incomplete();
      buffer += decoder.decode(part.value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (!line && data.length) {
          yield data.join("\n");
          data.length = 0;
        } else if (line.startsWith("data:")) {
          data.push(line.slice(5).replace(/^ /, ""));
        }
      }
    }
  } finally {
    void reader.cancel().catch(() => undefined);
  }
}

function decodeFrame(raw: string) {
  try {
    return frame.parse(JSON.parse(raw));
  } catch {
    throw incomplete();
  }
}

export function groqProvider(): ChatProvider & { model: string } {
  const { available, model } = configuredGroq(process.env);
  if (!available) throw new AuriaError("CHAT_UNAVAILABLE", "The free hosted provider is unavailable.", 503);
  const credential = process.env.GROQ_API_KEY!.trim();

  return {
    model,
    async *stream(input) {
      const tools = input.tools.map((tool) => ({ type: "function", function: tool }));
      const messages = [
        { role: "system", content: input.system },
        ...input.history.map(({ role, text }) => ({ role, content: text })),
        ...input.exchanges.flatMap(({ continuation, results }) => [
          continuation as GroqAssistant,
          ...results.map(({ call, data }) => ({ role: "tool", tool_call_id: call.id, content: JSON.stringify(data) })),
        ]),
      ];
      const signal = AbortSignal.any([input.signal, AbortSignal.timeout(25_000)]);
      const response = await fetch(endpoint, {
        method: "POST", cache: "no-store", redirect: "error", signal,
        headers: { Authorization: "Bearer " + credential, "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          model, messages, stream: true, reasoning_effort: "low", include_reasoning: false,
          max_completion_tokens: 1200, ...(tools.length ? { tools, tool_choice: input.requireTool ? "required" : "auto" } : {}),
        }),
      });
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined);
        throw Object.assign(new Error("Hosted provider rejected the request"), {
          status: response.status, retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
        });
      }
      if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
        void response.body?.cancel().catch(() => undefined);
        throw incomplete();
      }

      const calls = new Map<number, GroqTool>();
      let text = "", finish: string | null = null, ended = false;
      for await (const raw of serverSentData(response.body)) {
        signal.throwIfAborted();
        if (raw === "[DONE]") { ended = true; break; }
        const packet = decodeFrame(raw);
        if (packet.error) {
          const code = packet.error.code ?? packet.error.type;
          const status = code === "rate_limit_exceeded" ? 429 : code === "service_unavailable" ? 503 : null;
          if (status) throw Object.assign(new Error("Hosted provider ended the request"), { status });
          throw incomplete();
        }
        const choice = packet.choices?.[0];
        if (choice?.finish_reason) finish = choice.finish_reason;
        if (choice?.delta?.content) {
          text += choice.delta.content;
          if (text.length > 20_000) throw incomplete();
          yield { text: choice.delta.content };
        }
        for (const part of choice?.delta?.tool_calls ?? []) {
          const call = calls.get(part.index) ?? { id: "", type: "function", function: { name: "", arguments: "" } };
          if (part.id) call.id = part.id;
          call.function.name += part.function?.name ?? "";
          call.function.arguments += part.function?.arguments ?? "";
          if (call.function.arguments.length > 16_384 || call.function.name.length > 80) throw incomplete();
          calls.set(part.index, call);
        }
        const tokens = packet.usage ?? packet.x_groq?.usage;
        if (tokens) yield { usage: { input: tokens.prompt_tokens ?? null, output: tokens.completion_tokens ?? null, total: tokens.total_tokens ?? null } };
      }

      if (!ended || !finish) throw incomplete();
      if (finish === "length") throw new AuriaError("OUTPUT_LIMIT", "The response reached its length limit. Ask a shorter follow-up.", 422, true);
      if (finish === "content_filter") throw new AuriaError("PROVIDER_REFUSAL", "AURIA could not use this input. Try rephrasing your jewellery question.", 422, true);
      if (finish === "stop" && !calls.size && text.trim()) { yield { finished: true }; return; }
      if (finish !== "tool_calls" || !calls.size) throw incomplete();

      const completed = [...calls.entries()].sort(([left], [right]) => left - right).map(([, call]) => call);
      const ids = new Set(completed.map((call) => call.id));
      if (ids.size !== completed.length || completed.some((call) => !call.id || !input.tools.some((tool) => tool.name === call.function.name))) throw incomplete();

      let parsed;
      try {
        parsed = completed.map((call) => ({ id: call.id, name: call.function.name, args: JSON.parse(call.function.arguments) as unknown }));
      } catch {
        throw incomplete();
      }
      const continuation: GroqAssistant = { role: "assistant", content: text || null, tool_calls: completed };
      yield { calls: parsed, continuation, finished: true };
    },
  };
}
