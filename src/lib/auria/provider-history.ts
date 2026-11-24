import type { ChatMessage, ProviderTurn } from "@/types/auria";

// Send the current question and complete turn pairs. Failed or stopped replies remain in the saved transcript.
export function providerHistory(messages: readonly ChatMessage[]): ProviderTurn[] {
  const current = messages.findLastIndex((message) => message.role === "user");
  if (current < 0) return [];
  const latest = messages[current].text.slice(0, 4000);
  const turns: ProviderTurn[] = [{ role: "user", text: latest }];
  let remaining = 12_000 - latest.length;
  for (let index = current - 1; index > 0 && turns.length < 11; index--) {
    const answer = messages[index], question = messages[index - 1];
    if (answer.role !== "assistant" || answer.state !== "COMPLETE" || !answer.text || question.role !== "user") continue;
    const text = question.text.slice(0, 2200);
    const reply = answer.text.slice(0, 2200);
    if (text.length + reply.length > remaining) break;
    remaining -= text.length + reply.length;
    turns.unshift({ role: "user", text }, { role: "assistant", text: reply });
    index--;
  }
  return turns;
}
