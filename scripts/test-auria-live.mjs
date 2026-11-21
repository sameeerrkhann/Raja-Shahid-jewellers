// Explicit opt-in only. Uses the application's free-tier safeguards, never a direct provider key.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
const origin = process.env.AURIA_TEST_ORIGIN || "http://127.0.0.1:3102";
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error("Use the private loopback preview.");
const prompt = process.argv[2];
if (!prompt) throw new Error('Provide a fictional test prompt, or --history / --submit-demo / --stop.');
const statePath = process.env.AURIA_LIVE_STATE || ".auria-data/live-test-session.json";
const reportDir = process.env.AURIA_LIVE_REPORTS || "artifacts/ai01/live";
mkdirSync(".auria-data", { recursive: true }); mkdirSync(reportDir, { recursive: true });
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
async function api(path, body) {
  const r = await fetch(origin + "/api/ai/" + path, { method: body === undefined ? "GET" : "POST", headers: { Origin: origin, "Content-Type": "application/json", ...(state.cookie ? { Cookie: state.cookie } : {}), ...(state.csrf ? { "X-CSRF-Token": state.csrf } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(100000) });
  const cookie = r.headers.get("set-cookie"); if (cookie) state.cookie = cookie.split(";")[0];
  return r;
}
async function json(path, body) { const r = await api(path, body); const p = await r.json(); if (!r.ok) throw new Error(JSON.stringify({ status: r.status, error: p.error })); return p.data; }
const session = await json("session", {}); state.csrf = session.csrfToken;
if (!state.conversationId) state.conversationId = (await json("conversations", { language: "auto" })).id;
writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 }); // PRIVATE bearer; ignored, never print or publish.
let conversation = await json("conversations/" + state.conversationId);
const digest = (c) => createHash("sha256").update(JSON.stringify(c.messages)).digest("hex");
if (prompt === "--history") {
  console.log(JSON.stringify({ persisted: state.messageHash === digest(conversation), messages: conversation.messages.length, selectedDesignId: conversation.selectedDesignId, draftStatus: conversation.draft?.status, activeTurn: !!conversation.activeTurn, capability: session.capability, usage: (await json("conversations")).usage }));
} else if (prompt === "--submit-demo") {
  if (!conversation.draft) throw new Error("No draft to review.");
  const draft = await json("conversations/" + conversation.id + "/submit", { expectedVersion: conversation.draft.version, processingAccepted: true, fictionalDataConfirmed: true });
  console.log(JSON.stringify({ status: draft.status, reference: draft.reference, notificationStatus: draft.notificationStatus, fictional: draft.customer.email === "demo@example.invalid" }));
} else {
  if (!session.capability.available) throw new Error(session.capability.reason);
  const started = Date.now(); const events = []; const networkChunks = []; let firstDeltaMs = null;
  const request = { conversationId: conversation.id, expectedVersion: conversation.version, requestId: randomUUID(), message: prompt === "--stop" ? "Show me rings and explain the sample options." : prompt };
  const response = await api("chat", request);
  if (!response.ok) throw new Error(JSON.stringify({ status: response.status, body: await response.json() }));
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let stopped = false;
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break; networkChunks.push({ atMs: Date.now() - started, bytes: chunk.value.length });
    buffer += decoder.decode(chunk.value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop();
    for (const line of lines.filter(Boolean)) {
      const e = JSON.parse(line); events.push(e); if (e.type === "delta" && firstDeltaMs === null) firstDeltaMs = Date.now() - started;
      if (prompt === "--stop" && !stopped && e.type === "delta") { stopped = true; await json("conversations/" + conversation.id + "/stop", {}); }
    }
  }
  buffer += decoder.decode(); if (buffer.trim()) events.push(JSON.parse(buffer));
  conversation = await json("conversations/" + conversation.id); const done = events.findLast((e) => e.type === "done");
  const persisted = !!done && digest(done.conversation) === digest(conversation); state.messageHash = digest(conversation); writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
  const report = { at: new Date().toISOString(), prompt, model: session.capability.model, durationMs: Date.now() - started, firstDeltaMs, networkChunks, deltaEvents: events.filter((e) => e.type === "delta").length, cards: events.filter((e) => e.type === "cards").flatMap((e) => e.cards.map((c) => ({ id: c.id, name: c.title }))), errors: events.filter((e) => e.type === "error"), answer: conversation.messages.at(-1)?.text, messageState: conversation.messages.at(-1)?.state, persisted, draftStatus: conversation.draft?.status, usage: (await json("conversations")).usage };
  writeFileSync(reportDir + "/" + Date.now() + ".json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length && !(prompt === "--stop" && report.errors.every((e) => e.code === "STOPPED"))) process.exitCode = 1;
  if (!persisted) process.exitCode = 1;
}
