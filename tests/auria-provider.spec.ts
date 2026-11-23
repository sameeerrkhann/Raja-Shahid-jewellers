import { test, expect } from "@playwright/test";
import { configuredCapability, providerError } from "../src/lib/auria/provider-policy";
const enabled = { GEMINI_API_KEY: "fictional-test-value", AI_CHAT_ENABLED: "true", GEMINI_FREE_TIER_CONFIRMED: "true" };
test("missing credentials, disabled chat and unconfirmed free tier fail closed", () => {
  expect(configuredCapability({}).available).toBe(false);
  expect(configuredCapability({ ...enabled, GEMINI_API_KEY: "" }).reason).toContain("key");
  expect(configuredCapability({ ...enabled, AI_CHAT_ENABLED: "false" }).available).toBe(false);
  expect(configuredCapability({ ...enabled, GEMINI_FREE_TIER_CONFIRMED: "false" }).available).toBe(false);
  expect(configuredCapability(enabled)).toMatchObject({ available: true, mode: "READY", model: "gemini-3.1-flash-lite", lastVerifiedAt: null });
});
test("no paid provider or unapproved model fallback is permitted", () => {
  for (const AI_CHAT_PROVIDER of ["openai", "groq", "vertex"]) expect(configuredCapability({ ...enabled, AI_CHAT_PROVIDER }).available).toBe(false);
  expect(configuredCapability({ ...enabled, AI_CHAT_MODEL: "unapproved-model" }).available).toBe(false);
});
test("free quota, access, missing model, TLS, timeout and unknown errors are safely mapped", () => {
  expect(providerError({ status: 429 })).toMatchObject({ code: "PROVIDER_RATE_LIMIT", status: 429, retryable: true });
  for (const status of [401, 403]) expect(providerError({ status }).code).toBe("PROVIDER_ACCESS");
  expect(providerError({ status: 404 }).code).toBe("MODEL_UNAVAILABLE");
  expect(providerError({ status: 503, message: "private diagnostic" })).toMatchObject({ code: "PROVIDER_BUSY", status: 503, retryable: true });
  expect(providerError({ name: "TimeoutError" }).status).toBe(504);
  expect(providerError({ cause: { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" } }).code).toBe("PROVIDER_TLS");
  const safe = providerError({ status: 500, message: "secret-test-value", request: "private-url" });
  expect(safe.message).not.toMatch(/secret-test-value|private-url/);
});
