import type { Capability } from "@/types/auria";
import { AuriaError } from "./validation";

export function configuredCapability(env: Record<string, string | undefined>): Capability {
  const model = env.AI_CHAT_MODEL || "gemini-3.1-flash-lite";
  const reason = !env.GEMINI_API_KEY ? "AURIA is waiting for a server-side Gemini API key." : env.AI_CHAT_ENABLED !== "true" ? "Live chat is disabled in this private demo." : env.GEMINI_FREE_TIER_CONFIRMED !== "true" ? "Confirm the Gemini project is on the Free tier with billing disabled before enabling chat." : (env.AI_CHAT_PROVIDER || "gemini") !== "gemini" || model !== "gemini-3.1-flash-lite" ? "This provider or model has not been approved for free-tier use." : "Ready for a free-tier conversation. Availability depends on provider quota.";
  const available = !!env.GEMINI_API_KEY && env.AI_CHAT_ENABLED === "true" && env.GEMINI_FREE_TIER_CONFIRMED === "true" && (env.AI_CHAT_PROVIDER || "gemini") === "gemini" && model === "gemini-3.1-flash-lite";
  return { available, mode: available ? "READY" : "UNAVAILABLE", reason, provider: "gemini", model, lastVerifiedAt: null };
}

export function providerError(error: unknown): AuriaError {
  if (error instanceof AuriaError) return error;
  const value = error && typeof error === "object" ? error as { status?: unknown; name?: unknown; cause?: { code?: unknown } } : {};
  const status = Number(value.status);
  if (status === 429) return new AuriaError("PROVIDER_RATE_LIMIT", "Gemini's free quota is temporarily unavailable. Wait before retrying; no paid fallback was used.", 429, true);
  if (status === 401 || status === 403) return new AuriaError("PROVIDER_ACCESS", "Gemini access was rejected. Check the server key, project eligibility and Free tier.", 503);
  if (status === 404) return new AuriaError("MODEL_UNAVAILABLE", "The configured Gemini model is unavailable for this project.", 503);
  if (["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"].includes(String(value.cause?.code))) return new AuriaError("PROVIDER_TLS", "The server could not verify the provider certificate. Configure a trusted certificate store; never disable HTTPS verification.", 503);
  if (status === 408 || status === 504 || value.name === "TimeoutError") return new AuriaError("TIMEOUT", "The AI service timed out. You can retry.", 504, true);
  return new AuriaError("PROVIDER_ERROR", "The AI service could not finish this response. You can retry when it is available.", 502, true);
}
