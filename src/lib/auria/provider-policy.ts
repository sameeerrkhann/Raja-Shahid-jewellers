import type { Capability } from "@/types/auria";
import { AuriaError } from "./validation";

export function configuredCapability(env: Record<string, string | undefined>): Capability {
  const hasKey = !!env.GEMINI_API_KEY?.trim();
  const model = env.AI_CHAT_MODEL || "gemini-3.1-flash-lite";
  const reason = !hasKey ? "AURIA is waiting for a server-side Gemini API key." : env.AI_CHAT_ENABLED !== "true" ? "Live chat is disabled in this private demo." : env.GEMINI_FREE_TIER_CONFIRMED !== "true" ? "Confirm the Gemini project is on the Free tier with billing disabled before enabling chat." : (env.AI_CHAT_PROVIDER || "gemini") !== "gemini" || model !== "gemini-3.1-flash-lite" ? "This provider or model has not been approved for free-tier use." : "Ready for a free-tier conversation. Availability depends on provider quota.";
  const available = hasKey && env.AI_CHAT_ENABLED === "true" && env.GEMINI_FREE_TIER_CONFIRMED === "true" && (env.AI_CHAT_PROVIDER || "gemini") === "gemini" && model === "gemini-3.1-flash-lite";
  return { available, mode: available ? "READY" : "UNAVAILABLE", reason, provider: "gemini", model, lastVerifiedAt: null };
}

const providerFailures = {
  PROVIDER_RATE_LIMIT: ["Gemini’s free quota is unavailable. Wait before retrying or use the catalogue demo.", 429, true],
  PROVIDER_ACCESS: ["Gemini rejected the server credentials or project access. Use the catalogue demo while access is checked.", 503, false],
  MODEL_UNAVAILABLE: ["The configured Gemini model is unavailable for this project. Use the catalogue demo while it is checked.", 503, false],
  PROVIDER_BUSY: ["Gemini is temporarily unavailable. Retry in a moment or use the catalogue demo.", 503, true],
  PROVIDER_NETWORK: ["AURIA could not reach Gemini. Retry or continue with the catalogue demo.", 503, true],
  PROVIDER_TLS: ["The server could not verify the provider connection. You can continue in the catalogue demo.", 503, false],
  TIMEOUT: ["Gemini timed out. Retry or use the catalogue demo.", 504, true],
  PROVIDER_REQUEST: ["Gemini rejected this request. Try another wording or use the catalogue demo.", 502, false],
  PROVIDER_ERROR: ["The AI service could not finish this response. You can retry when it is available.", 502, true],
  RATE_LIMITED: ["The demo request limit is reached. Please wait before retrying.", 429, true],
} as const;

export function savedProviderFailure(code?: string) {
  const failure = code && Object.hasOwn(providerFailures, code) ? providerFailures[code as keyof typeof providerFailures] : null;
  return failure ? { message: failure[0], retryable: failure[2] } : { message: "AURIA could not finish this response.", retryable: true };
}

export function upstreamStatus(error: unknown) {
  if (error instanceof AuriaError || !error || typeof error !== "object" || !("status" in error)) return null;
  const status = Number(error.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : null;
}

export function isTransientProviderFailure(error: unknown) {
  const status = upstreamStatus(error);
  const code = providerError(error).code;
  return (status !== null && [408, 500, 502, 503, 504].includes(status))
    || ["TIMEOUT", "PROVIDER_NETWORK", "PROVIDER_INCOMPLETE"].includes(code);
}

export function canUseLocalFallback(error: unknown) {
  return ["PROVIDER_RATE_LIMIT", "PROVIDER_ACCESS", "MODEL_UNAVAILABLE", "PROVIDER_BUSY", "PROVIDER_TLS", "PROVIDER_NETWORK", "TIMEOUT", "PROVIDER_INCOMPLETE"].includes(providerError(error).code);
}

export function providerError(error: unknown): AuriaError {
  if (error instanceof AuriaError) return error;
  const value = error && typeof error === "object" ? error as { name?: unknown; message?: unknown; cause?: { code?: unknown } } : {};
  const status = upstreamStatus(error);
  const detail = typeof value.message === "string" ? value.message : "";
  let code: keyof typeof providerFailures = "PROVIDER_ERROR";
  if (status === 429) code = "PROVIDER_RATE_LIMIT";
  else if (status === 401 || status === 403 || (status === 400 && /API_KEY_(?:INVALID|EXPIRED)|API key not valid/i.test(detail))) code = "PROVIDER_ACCESS";
  else if (status === 404) code = "MODEL_UNAVAILABLE";
  else if (["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(String(value.cause?.code))) code = "PROVIDER_TLS";
  else if (status === 408 || status === 504 || value.name === "TimeoutError" || value.cause?.code === "UND_ERR_CONNECT_TIMEOUT") code = "TIMEOUT";
  else if (["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "UND_ERR_SOCKET"].includes(String(value.cause?.code))) code = "PROVIDER_NETWORK";
  else if (status !== null && status >= 500) code = "PROVIDER_BUSY";
  else if (status === 400) code = "PROVIDER_REQUEST";
  const [message, httpStatus, retryable] = providerFailures[code];
  return new AuriaError(code, message, httpStatus, retryable);
}
