import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode, ThinkingLevel, type Content, type Part } from "@google/genai";
import type { Capability, ChatProvider, ProviderChunk } from "@/types/auria";
import { AuriaError } from "@/lib/auria/validation";
import { lastVerified } from "./store";
import { configuredCapability } from "@/lib/auria/provider-policy";
import { ollamaModel } from "./ollama";
export { providerError } from "@/lib/auria/provider-policy";

export function providerCapability(): Capability {
  const capability = configuredCapability(process.env);
  const localFallback = process.env.AURIA_OLLAMA_ENABLED === "true";
  if (!capability.available && localFallback) {
    return { ...capability, available: true, mode: "READY", provider: "ollama", model: ollamaModel, reason: "The on-device Ollama model is enabled. Availability depends on the local Ollama service." };
  }
  return { ...capability, localFallback, lastVerifiedAt: capability.available ? lastVerified() : null };
}

export function geminiClient() {
  const capability = configuredCapability(process.env);
  if (!capability.available) throw new AuriaError("CHAT_UNAVAILABLE", capability.reason, 503);
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    enterprise: false,
    apiVersion: "v1beta",
    httpOptions: { baseUrl: "https://generativelanguage.googleapis.com", timeout: 35_000, retryOptions: { attempts: 1 } },
  });
  return { ai, model: capability.model };
}

export async function withProviderAbort<T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> {
  signal.throwIfAborted();
  let onAbort: () => void = () => undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try { return await Promise.race([operation(), aborted]); }
  finally { signal.removeEventListener("abort", onAbort); }
}

export function geminiProvider(): ChatProvider & { model: string } {
  const { ai, model } = geminiClient();
  return {
    model,
    async *stream(input): AsyncGenerator<ProviderChunk> {
      const contents: Content[] = input.history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] }));
      for (const exchange of input.exchanges) {
        contents.push(exchange.continuation as Content);
        contents.push({ role: "user", parts: exchange.results.map(({ call, data }) => ({ functionResponse: { name: call.name, ...(call.id ? { id: call.id } : {}), response: { result: data } } })) });
      }
      const stream = await withProviderAbort(input.signal, () => ai.models.generateContentStream({
        model, contents, config: {
          systemInstruction: input.system, maxOutputTokens: 1600, abortSignal: input.signal,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          tools: [{ functionDeclarations: input.tools.map((tool) => ({ name: tool.name, description: tool.description, parametersJsonSchema: tool.parameters })) }],
          toolConfig: { functionCallingConfig: { mode: input.requireTool ? FunctionCallingConfigMode.ANY : FunctionCallingConfigMode.AUTO } },
        },
      }));
      const iterator = stream[Symbol.asyncIterator]();
      const parts: Part[] = [];
      let finish = "";
      // The SDK iterator can retain the connection after the final candidate. Stop at that candidate.
      try {
        while (!finish) {
          const next = await withProviderAbort(input.signal, () => iterator.next());
          if (next.done) break;
          const chunk = next.value;
          const candidate = chunk.candidates?.[0];
          if (chunk.promptFeedback?.blockReason) throw new AuriaError("PROVIDER_REFUSAL", "AURIA could not use this input. Try rephrasing your jewellery question.", 422, true);
          if (candidate?.finishReason) finish = String(candidate.finishReason);
          for (const part of candidate?.content?.parts ?? []) {
            parts.push(part); // Preserve Gemini thought signatures for tool continuations.
            if (part.text && !part.thought) yield { text: part.text };
          }
          if (chunk.usageMetadata) yield { usage: { input: chunk.usageMetadata.promptTokenCount ?? null, output: chunk.usageMetadata.candidatesTokenCount ?? null, total: chunk.usageMetadata.totalTokenCount ?? null } };
        }
      } finally { void iterator.return?.(undefined).catch(() => undefined); }
      if (!finish) throw new AuriaError("PROVIDER_INCOMPLETE", "The reply ended before it was complete. You can retry.", 502, true);
      if (finish === "MAX_TOKENS") throw new AuriaError("OUTPUT_LIMIT", "The response reached its length limit. Ask a shorter follow-up.", 422, true);
      if (finish !== "STOP") throw new AuriaError("PROVIDER_REFUSAL", "AURIA could not provide this response. Try rephrasing your jewellery question.", 422, true);
      const calls = parts.flatMap((part) => part.functionCall ? [{ name: part.functionCall.name ?? "", args: part.functionCall.args ?? {}, id: part.functionCall.id }] : []);
      yield { calls, continuation: { role: "model", parts }, finished: true };
    },
  };
}
