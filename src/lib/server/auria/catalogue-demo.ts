import "server-only";
import type { ChatProvider, ToolCall } from "@/types/auria";
import type { DesignCardData } from "@/types/catalogue";
import { statusLabels } from "@/config/catalogue";

type DemoDesign = { designCode: string; category: string };
type DemoContext = { selectedDesign: DemoDesign | null; displayedDesigns: (DemoDesign & { position: number })[] };
const categories = { rings: /\b(ring|rings|angoothi)\b/i, bangles: /\b(bangle|bangles|kada|kara)\b/i, bridal: /\b(bridal|wedding|shaadi|sets?)\b/i, necklaces: /\b(necklaces?|chains?)\b/i, earrings: /\b(earrings?|jhumkas?)\b/i };
const ordinals = [/\b(first|pehl[ai])\b/i, /\b(second|doosr[ai]|dusr[ai])\b/i, /\b(third|teesr[ai]|tisr[ai])\b/i];

function requestFor(prompt: string, context: DemoContext): ToolCall | null {
  const ids = prompt.match(/\bRSJ-D\d{3,6}\b/gi) ?? [];
  const ref = prompt.match(/\bDEMO-Q-[a-f0-9]{8,32}\b/i)?.[0];
  if (ref || /\b(status|tracking|track)\b/i.test(prompt)) return { name: "getOrderStatus", args: ref ? { reference: ref } : {} };
  if (/\b(compare|comparison)\b/i.test(prompt) && ids.length >= 2) return { name: "compareDesigns", args: { designIds: ids.slice(0, 4) } };
  const category = Object.entries(categories).find(([, pattern]) => pattern.test(prompt))?.[0];
  const ordinal = ordinals.findIndex((pattern) => pattern.test(prompt));
  const referringToSelection = /\b(this|that) (one|design|piece|ring|bangle|necklace)\b/i.test(prompt);
  if (!ids.length && (ordinal >= 0 || referringToSelection)) {
    const design = ordinal >= 0 ? context.displayedDesigns.find((item) => item.position === ordinal + 1) : context.selectedDesign;
    if (!design || (category && category !== design.category)) return null;
    return { name: "searchJewellery", args: { q: design.designCode } };
  }
  const karat = prompt.match(/\b(18|21|22|24)\s*(?:k\b|karat\b)/i)?.[1];
  return { name: "searchJewellery", args: { ...(ids[0] ? { q: ids[0] } : category ? { category } : {}), ...(karat ? { karat } : {}) } };
}
export function catalogueDemoProvider(prompt: string, context: DemoContext): ChatProvider {
  return {
    async *stream(input) {
      input.signal.throwIfAborted();
      if (input.exchanges.length === 0) {
        const call = requestFor(prompt, context);
        if (call) yield { calls: [call], continuation: { local: true } };
        else yield { text: "Which design do you mean? Select a design or enter its catalogue code." };
        return;
      }
      const { call, data } = input.exchanges[0].results[0];
      if (call.name === "getOrderStatus") {
        const result = data as { found?: boolean; reference?: string; status?: string; explanation?: string };
        yield { text: result.found ? `Recorded demo status for ${result.reference}: **${result.status?.replaceAll("_", " ")}**. ${result.explanation}` : "No matching enquiry in this conversation or for that reference. Check a saved reference in Design & Draft." };
        return;
      }
      if (call.name === "compareDesigns") {
        const { compared = [] } = data as { compared?: { designCode: string; title: string; styles: string[]; purities: number[] }[] };
        const rows = compared.map((item) => `- **${item.title}** (${item.designCode}): ${item.styles.join(", ")}. ${item.purities.map((value) => value + "K").join(", ") || "Purity to be confirmed"}.`);
        yield { text: rows.length ? `Sample catalogue comparison\n\n${rows.join("\n")}\n\nPrices, weights and timing are to be confirmed by the jeweller.` : "None of those codes match a published sample design." };
        return;
      }
      const cards = (data as { items?: DesignCardData[] }).items ?? [];
      const body = cards.map((card) => `- **${card.title}** (${card.designCode}): ${card.purityOptions.length ? card.purityOptions.map((option) => option + "K").join(", ") : "Purity to be confirmed"}. Sample · ${statusLabels[card.displayStatus]}.`).join("\n");
      const unavailable = (data as { explanation?: string }).explanation;
      const intro = /\b(quot(?:e|ation)|customiz(?:e|ation)|customise)\b/i.test(prompt) ? "Select a sample design to enter your preferences and review a quotation draft." : "These pieces come from the sample catalogue.";
      yield { text: cards.length ? `${intro}\n\n${body}\n\nPrices, weights and timing are to be confirmed by the jeweller.` : unavailable || "No sample designs match. Try a different category or a published design code." };
    },
  };
}
