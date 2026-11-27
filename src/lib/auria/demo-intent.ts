import type { Language } from "@/types/auria";

const groups = [
  ["mens", /\b(men['’]?s|for men|gents|mardon)\b|مردانہ|مردوں/i],
  ["bridal", /\b(bridal|wedding|shaadi|shadi|haar|choker|collar)\b|دلہن|عروسی|شادی|ہار/i],
  ["rings", /\b(rings?|angoothi|anguthi|signet)\b|انگوٹھی|انگوٹھیاں/i],
  ["bangles", /\b(bangles?|kada|kara|cuffs?|choori)\b|چوڑی|چوڑیاں|کڑا/i],
  ["necklaces", /\b(necklaces?|chains?|pendants?)\b|مالا|نیکلس/i],
  ["earrings", /\b(earrings?|jhumk[ae]s?|studs?|hoops?)\b|جھمک|بالی/i],
] as const;

export function categoryFrom(text: string) {
  // In a phrase such as "bridal rings" the object is more specific than the occasion.
  return (groups.find(([name, pattern]) => name !== "bridal" && pattern.test(text)) ?? groups.find(([, pattern]) => pattern.test(text)))?.[0];
}
function latinDigits(text: string) {
  return text.replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(digit) % 10));
}
export function purityFrom(text: string) {
  return latinDigits(text)
    .match(/(18|21|22|24)\s*(?:k\b|karats?\b|قیراط|کیرٹ)/i)?.[1] as "18" | "21" | "22" | "24" | undefined;
}
export function budgetFrom(text: string) {
  const normalized = latinDigits(text);
  const match = normalized.match(/(?:\b(?:PKR|Rs\.?|budget(?:\s+of)?)|بجٹ)\s*[:=]?\s*(\d[\d,]*(?:\.\d+)?)(?:\s*(lakh|lac|k|لاکھ)\b)?/i)
    ?? normalized.match(/(\d[\d,]*(?:\.\d+)?)(?:\s*(lakh|lac|k|لاکھ))?\s*(?:PKR\b|rupees\b|روپے)/i);
  const unit = match?.[2]?.toLowerCase();
  const amount = match ? Number(match[1].replaceAll(",", "")) * (unit === "k" ? 1000 : unit ? 100_000 : 1) : 0;
  return Number.isSafeInteger(amount) && amount >= 1 && amount <= 10_000_000 ? amount : null;
}
export const quoteIntent = /\b(prepare|draft|start|create|make|request)\b.*\b(quote|quotation|enquiry|inquiry)\b|\b(quote|quotation|enquiry)\b.*\b(banao|banayen|bana\s+(?:do|den|de))\b|(?:کوٹیشن|انکوائری).*?(?:بنا|تیار)/i;

export const handoffIntent = /\b(appointment|showroom visit|visit the showroom|book a visit|call back|callback|whatsapp|human|salesperson|team member|rabta|(?:jeweller|dukaan|team) se baat)\b|ملاقات|رابطہ|جیولر سے بات/i;

export function demoLanguage(text: string, preference: Language) {
  if (preference !== "auto") return preference;
  if (/[\u0600-\u06ff]/.test(text)) return "ur";
  return /\b(dikha[oy]?|chahiye|waali|wali|pehl[ai]|doosr[ai]|bata[oy]?|kya|mujhe|salam|iski|uski|rabta|bana do)\b/i.test(text) ? "roman-ur" : "en";
}
export function demoTitle(text: string) {
  const design = text.match(/\bRSJ-D\d{3,6}\b/i)?.[0];
  if (design) return design.toUpperCase();
  const category = categoryFrom(text);
  const purity = purityFrom(text);
  if (category) return [purity && purity + "K", category === "bridal" ? "bridal sets" : category].filter(Boolean).join(" ").replace(/^./, (letter) => letter.toUpperCase());
  if (/\b(?:enquiry|tracking|status)\b/i.test(text)) return "Enquiry status";
  if (/\b(?:quote|quotation|budget)\b/i.test(text)) return "Quotation advice";
  return "Jewellery consultation";
}
