import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { AuriaError } from "@/lib/auria/validation";
import { createSession, withOwner } from "./store";

export const noStore = { "Cache-Control": "private, no-store", "Vary": "Cookie, Origin" };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function origin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? "";
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/.test(host)) throw new AuriaError("LOCAL_ONLY", "AURIA is available on the private local demo only.", 403);
  const browserOrigin = `${url.protocol}//${host}`;
  // This persistence adapter is intentionally private and local until hosted auth/storage is approved.
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) throw new AuriaError("LOCAL_ONLY", "AURIA is available on the private local demo only.", 403);
  if (request.method !== "GET" && request.headers.get("origin") !== browserOrigin) throw new AuriaError("ORIGIN", "Open the workspace on this site's origin.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new AuriaError("ORIGIN", "Cross-site access is unavailable.", 403);
}
export async function session(request: Request, bootstrap = false) {
  origin(request); const jar = await cookies(); let token = jar.get("rsj-auria-session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) token = undefined;
  let valid = false;
  if (token) { try { withOwner(hash(token), () => undefined); valid = true; } catch (error) { if (!(error instanceof AuriaError) || error.status !== 401) throw error; } }
  if (!valid) {
    if (!bootstrap) throw new AuriaError("SESSION_EXPIRED", "Start a private session to continue.", 401);
    token = randomBytes(32).toString("hex"); const expires = new Date(Date.now() + 7 * 86_400_000);
    createSession(hash(token), expires.getTime());
    jar.set("rsj-auria-session", token, { httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:", path: "/", expires });
  }
  const csrfToken = hash(`auria-csrf:${token!}`);
  if (!bootstrap && request.method !== "GET") {
    const supplied = request.headers.get("x-csrf-token") ?? "";
    if (!/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(csrfToken))) throw new AuriaError("CSRF", "Refresh the workspace before retrying.", 403);
  }
  return { owner: hash(token!), csrfToken };
}
export function json(data: unknown, status = 200) { return Response.json({ data }, { status, headers: noStore }); }
export function failure(error: unknown) {
  const safe = error instanceof AuriaError ? error : new AuriaError("UNAVAILABLE", "AURIA could not complete this request. Please try again.", 503, true);
  return Response.json({ error: { code: safe.code, message: safe.message, retryable: safe.retryable } }, { status: safe.status, headers: { ...noStore, ...(safe.status === 429 ? { "Retry-After": "60" } : {}) } });
}
