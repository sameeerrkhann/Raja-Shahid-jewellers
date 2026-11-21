import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode, type Content, type Part } from "@google/genai";
import type { Capability, ChatProvider, ProviderChunk } from "@/types/auria";
import { AuriaError } from "@/lib/auria/validation";
import { lastVerified } from "./store";
import { configuredCapability } from "@/lib/auria/provider-policy";
export { providerError } from "@/lib/auria/provider-policy";

export function providerCapability(): Capability {
  const capability = configuredCapability(process.env);
  return { ...capability, lastVerifiedAt: capability.available ? lastVerified() : null };
}
export function geminiProvider(): ChatProvider {
  const capability = providerCapability();
  if (!capability.available) throw new AuriaError("CHAT_UNAVAILABLE", capability.reason, 503);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { timeout: 40_000, retryOptions: { attempts: 1 } } });
  return {
    async *stream(input): AsyncGenerator<ProviderChunk> {
      const contents: Content[] = input.history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] }));
      for (const exchange of input.exchanges) {
        contents.push(exchange.continuation as Content);
        contents.push({ role: "user", parts: exchange.results.map(({ call, data }) => ({ functionResponse: { name: call.name, ...(call.id ? { id: call.id } : {}), response: { result: data } } })) });
      }
      const stream = await ai.models.generateContentStream({ model: capability.model, contents, config: { systemInstruction: input.system, maxOutputTokens: 1600, abortSignal: input.signal, tools: [{ functionDeclarations: input.tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters })) }], toolConfig: { functionCallingConfig: { mode: input.requireTool ? FunctionCallingConfigMode.ANY : FunctionCallingConfigMode.AUTO } } } });
      const parts: Part[] = []; let finish = "";
      // Observed live (AI-02): the HTTP stream can stay open ~70s after the finishReason chunk, and the SDK
      // iterator does not react to abort while waiting. Race every read against abort and stop at finishReason.
      const iterator = stream[Symbol.asyncIterator]();
      const aborted = new Promise<never>((_, reject) => { const fail = () => reject(input.signal.reason ?? new Error("ABORTED")); if (input.signal.aborted) fail(); else input.signal.addEventListener("abort", fail, { once: true }); });
      aborted.catch(() => undefined);
      try {
        while (!finish) {
          const next = await Promise.race([iterator.next(), aborted]);
          if (next.done) break;
          const chunk = next.value; const candidate = chunk.candidates?.[0];
          if (candidate?.finishReason) finish = String(candidate.finishReason);
          for (const part of candidate?.content?.parts ?? []) { parts.push(part); if (part.text && !part.thought) yield { text: part.text }; }
          if (chunk.usageMetadata) yield { usage: { input: chunk.usageMetadata.promptTokenCount ?? null, output: chunk.usageMetadata.candidatesTokenCount ?? null, total: chunk.usageMetadata.totalTokenCount ?? null } };
        }
      } finally { void iterator.return?.(undefined).catch(() => undefined); }
      if (finish && !["STOP", "MAX_TOKENS"].includes(finish)) throw new AuriaError("PROVIDER_REFUSAL", "AURIA could not provide this response. Try rephrasing your jewellery question.", 422, true);
      if (finish === "MAX_TOKENS") throw new AuriaError("OUTPUT_LIMIT", "The response reached its length limit. Ask a shorter follow-up.", 422, true);
      const calls = parts.flatMap((p) => p.functionCall ? [{ name: p.functionCall.name ?? "", args: p.functionCall.args ?? {}, id: p.functionCall.id }] : []);
      yield { calls, continuation: { role: "model", parts }, finished: true };
    },
  };
}
