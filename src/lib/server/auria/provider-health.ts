import "server-only";
import { configuredCapability } from "@/lib/auria/provider-policy";

type Provider = "gemini" | "ollama";
const failures = new Map<Provider, { until: number; count: number; code: string }>();

export function providerOrder(env: Record<string, string | undefined>): Provider[] {
  const requested = (env.AURIA_PROVIDER_PRIORITY ?? "").split(",").map((value) => value.trim());
  const order = [...new Set([...requested, "gemini", "ollama"])];
  return order.filter((name): name is Provider => name === "gemini"
    ? configuredCapability(env).available : name === "ollama" && env.AURIA_OLLAMA_ENABLED === "true");
}

export function healthFor(provider: Provider) {
  const entry = failures.get(provider);
  return entry && entry.until > Date.now() ? entry : null;
}

export function recordProviderFailure(provider: Provider, code: string) {
  if (!canUseLocalFallbackCode(code)) return;
  const previous = failures.get(provider);
  const now = Date.now();
  const count = previous && previous.until + 600_000 > now ? Math.min(5, previous.count + 1) : 1;
  const retryDelay = code === "PROVIDER_RATE_LIMIT" ? 60_000 : ["PROVIDER_ACCESS", "MODEL_UNAVAILABLE", "PROVIDER_TLS"].includes(code) ? 300_000 : Math.min(60_000, 5_000 * 2 ** (count - 1));
  failures.set(provider, { until: now + retryDelay, count, code });
}

function canUseLocalFallbackCode(code: string) {
  return ["OLLAMA_UNAVAILABLE", "OLLAMA_INCOMPLETE", "PROVIDER_INCOMPLETE", "PROVIDER_RATE_LIMIT", "PROVIDER_ACCESS", "MODEL_UNAVAILABLE", "PROVIDER_BUSY", "PROVIDER_TLS", "PROVIDER_NETWORK", "TIMEOUT"].includes(code);
}

export function recordProviderSuccess(provider: Provider) {
  failures.delete(provider);
}
