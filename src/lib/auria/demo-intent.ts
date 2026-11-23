import type { Language } from "@/types/auria";

const groups = [
  ["bridal", /\b(bridal|wedding|shaadi|shadi|haar|choker|collar)\b|دلہن|عروسی|شادی|ہار/i],
  ["rings", /\b(rings?|angoothi|anguthi|signet)\b|انگوٹھی|انگوٹھیاں/i],
  ["bangles", /\b(bangles?|kada|kara|cuffs?|choori)\b|چوڑی|چوڑیاں|کڑا/i],
  ["necklaces", /\b(necklaces?|chains?|pendants?)\b|مالا|نیکلس/i],
  ["earrings", /\b(earrings?|jhumk[ae]s?|studs?|hoops?)\b|جھمک|بالی/i],
] as const;

export function categoryFrom(text: string) {
  // In a phrase such as "bridal rings" the object is more specific than the occasion.
  return (groups.slice(1).find(([, pattern]) => pattern.test(text)) ?? groups.find(([, pattern]) => pattern.test(text)))?.[0];
}
export function purityFrom(text: string) {
  return text.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .match(/(18|21|22|24)\s*(?:k\b|karats?\b|قیراط|کیرٹ)/i)?.[1] as "18" | "21" | "22" | "24" | undefined;
}
export function budgetFrom(text: string) {
  const match = text.match(/\b(?:PKR|Rs\.?)\s*([0-9]+(?:,[0-9]{3})*)(?![0-9,]|\.[0-9])/i);
  const amount = match ? Number(match[1].replaceAll(",", "")) : 0;
  return amount >= 1 && amount <= 10_000_000 ? amount : null;
}
export function demoLanguage(text: string, preference: Language) {
  if (preference !== "auto") return preference;
  if (/[\u0600-\u06ff]/.test(text)) return "ur";
  return /\b(dikha[oy]?|chahiye|waali|wali|pehl[ai]|doosr[ai]|bata[oy]?|kya|mujhe|salam)\b/i.test(text) ? "roman-ur" : "en";
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
