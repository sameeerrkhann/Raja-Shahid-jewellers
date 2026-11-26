import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Conversation, ModelProvider, Usage } from "@/types/auria";
import { AuriaError } from "@/lib/auria/validation";
import { normalizeDraft } from "@/lib/auria/quotation";

export type OwnerState = { conversations: Conversation[]; usage: Usage[] };
// Local single-host adapter; no hosted service or public storage. Transactions serialize writers.
function database() {
  const directory = join(process.cwd(), ".auria-data");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const testRun = process.env.AURIA_TEST_RUN_ID;
  const testFile = testRun && /^[a-f0-9-]{36}$/i.test(testRun) ? "test-" + testRun + ".sqlite" : "test.sqlite";
  const db = new DatabaseSync(join(directory, process.env.AURIA_TEST_STORE === "true" ? testFile : "private.sqlite"));
  db.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, expires INTEGER NOT NULL, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS calls (id TEXT PRIMARY KEY, owner TEXT NOT NULL, created INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
  db.exec("CREATE TABLE IF NOT EXISTS enquiry_references (reference TEXT PRIMARY KEY, owner TEXT NOT NULL, conversation_id TEXT NOT NULL, draft_id TEXT NOT NULL UNIQUE);");
  return db;
}
export function createSession(id: string, expires: number) {
  const db = database();
  try { db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now()); db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(id, expires, JSON.stringify({ conversations: [], usage: [] })); } finally { db.close(); }
}
export function withOwner<T>(owner: string, change: (state: OwnerState) => T): T {
  const db = database();
  try {
    db.exec("BEGIN IMMEDIATE");
    const row = db.prepare("SELECT expires,data FROM sessions WHERE id=?").get(owner) as { expires: number; data: string } | undefined;
    if (!row || row.expires <= Date.now()) throw new AuriaError("SESSION_EXPIRED", "Your private session expired. Start a new session.", 401);
    const state = JSON.parse(row.data) as OwnerState;
    for (const c of state.conversations) if (c.draft) normalizeDraft(c.draft);
    for (const c of state.conversations) if (c.activeTurn && c.activeTurn.expiresAt < Date.now()) { const m = c.messages.find((m) => m.id === c.activeTurn?.assistantId); if (m) { m.state = "STOPPED"; m.errorCode = "INTERRUPTED"; } c.activeTurn = null; c.version++; }
    const result = change(state);
    for (const c of state.conversations) for (const draft of [c.draft, c.callback]) if (draft?.reference) {
      const existing = db.prepare("SELECT owner,draft_id FROM enquiry_references WHERE reference=?").get(draft.reference) as { owner: string; draft_id: string } | undefined;
      if (existing && (existing.owner !== owner || existing.draft_id !== draft.id)) throw new AuriaError("REFERENCE_CONFLICT", "Could not reserve an enquiry reference. Retry submission.", 409, true);
      db.prepare("INSERT OR IGNORE INTO enquiry_references VALUES (?, ?, ?, ?)").run(draft.reference, owner, c.id, draft.id);
    }
    db.prepare("UPDATE sessions SET data=? WHERE id=?").run(JSON.stringify(state), owner);
    db.exec("COMMIT"); return result;
  } catch (error) { try { db.exec("ROLLBACK"); } catch {} throw error; } finally { db.close(); }
}
export function ownedConversation(state: OwnerState, id: string) { const c = state.conversations.find((c) => c.id === id); if (!c) throw new AuriaError("NOT_FOUND", "Conversation unavailable.", 404); return c; }
export function reserveCall(owner: string, model: string): string {
  const db = database(); const now = Date.now(); const id = randomUUID();
  try {
    db.exec("BEGIN IMMEDIATE"); db.prepare("DELETE FROM calls WHERE created < ?").run(now - 86_400_000);
    const count = (since: number) => (db.prepare("SELECT COUNT(*) AS n FROM calls WHERE created >= ?").get(since) as { n: number }).n;
    const cap = Math.min(100, Math.max(1, Number(process.env.AI_DAILY_REQUEST_LIMIT) || 20));
    if (count(now - 60_000) >= 5 || count(now - 86_400_000) >= cap) throw new AuriaError("RATE_LIMITED", "The demo request limit is reached. Please wait before retrying.", 429, true);
    db.prepare("INSERT INTO calls VALUES (?, ?, ?)").run(id, owner, now); db.exec("COMMIT");
  } catch (error) { try { db.exec("ROLLBACK"); } catch {} throw error; } finally { db.close(); }
  withOwner(owner, (s) => { s.usage.push({ id, model, startedAt: new Date(now).toISOString(), state: "RESERVED", inputTokens: null, outputTokens: null, totalTokens: null }); s.usage = s.usage.slice(-100); });
  return id;
}
export function finishProviderCall(owner: string, id: string, tokens: { input: number | null; output: number | null; total: number | null } | null, state: Exclude<Usage["state"], "RESERVED">) {
  withOwner(owner, (session) => {
    const usage = session.usage.find((entry) => entry.id === id);
    if (!usage) return;
    usage.state = state;
    usage.inputTokens = tokens?.input ?? null;
    usage.outputTokens = tokens?.output ?? null;
    usage.totalTokens = tokens?.total ?? null;
  });
}
function verificationKey(provider: ModelProvider) { return provider === "gemini" ? "verified" : "verified:" + provider; }
export function markVerified(provider: ModelProvider = "gemini") { const db = database(); try { db.prepare("INSERT OR REPLACE INTO metadata VALUES (?, ?)").run(verificationKey(provider), new Date().toISOString()); } finally { db.close(); } }
export function lastVerified(provider: ModelProvider = "gemini"): string | null { const db = database(); try { return (db.prepare("SELECT value FROM metadata WHERE key=?").get(verificationKey(provider)) as { value: string } | undefined)?.value ?? null; } finally { db.close(); } }
