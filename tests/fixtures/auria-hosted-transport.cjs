// Network fixtures are loaded only by the isolated Playwright provider server.
"use strict";

const fakeKey = "phase5-fixture-groq";
if (process.env.AURIA_TEST_STORE !== "true" || process.env.GROQ_API_KEY !== fakeKey || !process.env.AURIA_TEST_RUN_ID) {
  throw new Error("Hosted provider fixtures require isolated storage and synthetic credentials.");
}

const browserFetch = globalThis.fetch;
const encoder = new TextEncoder();

function failed(status, headers = {}) {
  return Response.json({ error: { code: "fixture" } }, { status, headers });
}

function sse(frames, finish = true) {
  const data = frames.map((chunk) => "data: " + JSON.stringify(chunk) + "\r\n\r\n").join("") + (finish ? "data: [DONE]\r\n\r\n" : "");
  const encoded = encoder.encode(data);
  let offset = 0;
  const body = new ReadableStream({
    async pull(controller) {
      if (offset === 0) await new Promise((resolve) => setTimeout(resolve, 25));
      controller.enqueue(encoded.slice(offset, offset += 31));
      if (offset >= encoded.length) controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream; charset=utf-8" } });
}

const chunk = (delta, finishReason = null) => ({ choices: [{ index: 0, delta, finish_reason: finishReason }] });
const metering = { x_groq: { usage: { prompt_tokens: 120, completion_tokens: 19, total_tokens: 139 } }, choices: [] };

function toolCall(name, args) {
  const json = JSON.stringify(args);
  return sse([
    chunk({ tool_calls: [{ index: 0, id: "fixture-call", type: "function", function: { name, arguments: json.slice(0, 8) } }] }),
    chunk({ tool_calls: [{ index: 0, function: { arguments: json.slice(8) } }] }),
    chunk({}, "tool_calls"),
    metering,
  ]);
}

globalThis.fetch = async function auriaHostedFixture(input, init) {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.hostname === "generativelanguage.googleapis.com") return failed(503);
  if (url.hostname !== "api.groq.com") return browserFetch(input, init);
  if (url.pathname !== "/openai/v1/chat/completions" || url.protocol !== "https:" ||
      new Headers(init?.headers).get("Authorization") !== "Bearer " + fakeKey) return failed(401);

  const { model, messages, stream, tools, tool_choice: choice, include_reasoning: reasoning } = JSON.parse(init.body);
  if (model !== "openai/gpt-oss-20b" || !stream || reasoning !== false || !tools.every((tool) => tool.type === "function")) return failed(400);

  if (process.env.AURIA_TEST_PROVIDER_SCENARIO === "quota") return failed(429, { "Retry-After": "120" });
  if (process.env.AURIA_TEST_PROVIDER_SCENARIO === "partial") {
    return sse([chunk({ content: "Fixture partial reply" }, "stop"), metering], false);
  }

  const text = messages.findLast((message) => message.role === "user").content;
  const followUp = text.includes("Doosri");
  if (choice === "required") return followUp
    ? toolCall("getProductDetails", { designId: "RSJ-D007" })
    : toolCall("searchJewellery", { category: "rings", karat: "22" });

  const tool = messages.at(-1);
  const declared = messages.at(-2)?.tool_calls?.[0];
  if (tool.role !== "tool" || tool.tool_call_id !== "fixture-call" || declared?.id !== tool.tool_call_id || declared.function.arguments.length < 10) return failed(400);
  const data = JSON.parse(tool.content);
  if (followUp ? data.designCode !== "RSJ-D007" : data.items?.map((item) => item.designCode).join() !== "RSJ-D005,RSJ-D007") return failed(400);

  const pieces = followUp ? ["Doosri angoothi ", "RSJ-D007 hai — نمونہ۔"] : ["Two sample 22K rings. ", "RSJ-D005 and RSJ-D007."];
  return sse([chunk({ reasoning: "Internal fixture reasoning", content: pieces[0] }), chunk({ content: pieces[1] }), chunk({}, "stop"), metering]);
};
