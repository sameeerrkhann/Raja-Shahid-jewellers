import "server-only";
import { upstreamRetryAfter } from "@/lib/auria/provider-policy";
import type { ModelProvider } from "@/types/auria";
const failures = new Map<ModelProvider, { until: number; count: number; code: string }>();

export function healthFor(provider: ModelProvider) {
  const entry = failures.get(provider);
  return entry && entry.until > Date.now() ? entry : null;
}

export function recordProviderFailure(provider: ModelProvider, code: string, error?: unknown) {
  if (!canUseLocalFallbackCode(code)) return;
  const previous = failures.get(provider);
  const now = Date.now();
  const count = previous && previous.until + 600_000 > now ? Math.min(5, previous.count + 1) : 1;
  const retryDelay = code === "PROVIDER_RATE_LIMIT" ? 60_000 : ["PROVIDER_ACCESS", "MODEL_UNAVAILABLE", "PROVIDER_TLS"].includes(code) ? 300_000 : Math.min(120_000, 15_000 * 2 ** (count - 1));
  failures.set(provider, { until: now + Math.max(retryDelay, upstreamRetryAfter(error)), count, code });
}

function canUseLocalFallbackCode(code: string) {
  return ["OLLAMA_UNAVAILABLE", "OLLAMA_INCOMPLETE", "PROVIDER_INCOMPLETE", "PROVIDER_RATE_LIMIT", "PROVIDER_ACCESS", "MODEL_UNAVAILABLE", "PROVIDER_BUSY", "PROVIDER_TLS", "PROVIDER_NETWORK", "TIMEOUT"].includes(code);
}

export function recordProviderSuccess(provider: ModelProvider) {
  failures.delete(provider);
}
