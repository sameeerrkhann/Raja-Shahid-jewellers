import type { Language } from "@/types/auria";
import { handoffIntent } from "./demo-intent";

// Only fill these fields with shop-approved information. They are shared by the local and live tools.
export const storeKnowledge: Record<string, string | null> = {
  address: null,
  hours: null,
  contact: null,
  hallmarking: null,
  delivery: null,
  exchange: null,
  payment: null,
  returns: null,
  care: null,
};

const topics = [
  ["address", /\b(address|where.*(?:shop|showroom)|location|pata)\b|پتہ|کہاں/i, "The showroom address"],
  ["hours", /\b(hours|opening|close[sd]? at|timings?)\b|اوقات/i, "Showroom hours"],
  ["contact", /\b(whatsapp|phone|telephone|contact|call back|callback|human|salesperson|team member)\b|واٹس ایپ|رابطہ/i, "Direct contact details"],
  ["hallmarking", /\b(hallmarks?|hallmarking|certific\w*|certif\w*)\b|سرٹیفکیٹ/i, "Hallmarking and certification details"],
  ["delivery", /\b(deliver\w*|ship(?:ping)?|courier)\b|ڈیلیوری/i, "Delivery terms"],
  ["exchange", /\b(exchange|buy[- ]?back|old gold|old-gold)\b|پرانا سونا/i, "Exchange and buyback terms"],
  ["payment", /\b(payment|instalments?|pay by)\b|ادائیگی/i, "Payment terms"],
  ["returns", /\b(returns?|refunds?)\b|واپسی/i, "Return and refund terms"],
  ["care", /\b(care|clean(?:ing)?|polish)\b|صفائی|دیکھ بھال/i, "Shop-specific care instructions"],
] as const;

export function businessReply(prompt: string, locale: Exclude<Language, "auto">) {
  const tr = (en: string, ur: string, roman: string) => locale === "ur" ? ur : locale === "roman-ur" ? roman : en;
  const handoff = tr(
    " You can save a fictional request under Contact & visits in Design & draft. The demo records it without sending a message or booking.",
    " Design & draft میں Contact & visits سے نمونہ درخواست محفوظ کریں۔ کوئی پیغام یا بکنگ نہیں بھیجی جائے گی۔",
    " Design & draft mein Contact & visits se demo request save karen. Koi message ya booking nahin bheji jayegi.",
  );
  if (/\b((?:gold|sona) (?:rate|price)|per tola|tola rate)\b|سونے کا ریٹ|سونے کی قیمت|فی تولہ/i.test(prompt)) return tr(
    "Live gold rates are unavailable in this demo.", "اس ڈیمو میں سونے کا تازہ ریٹ دستیاب نہیں۔", "Is demo mein live gold rate dastiyab nahin.",
  ) + handoff;
  if (handoffIntent.test(prompt)) return tr(
    "Direct contact and showroom visits can be arranged once the jeweller confirms the details.", "شوروم کی ملاقات کے لیے جیولر سے تصدیق چاہیے۔", "Rabtay aur showroom visit ki tafseel jeweller se tasdeeq hogi.",
  ) + handoff;
  const matched = topics.filter(([, pattern]) => pattern.test(prompt));
  if (!matched.length) return null;
  if (locale !== "en") return tr("", "دکان کی یہ معلومات ابھی تصدیق کے منتظر ہیں۔", "Dukaan ki yeh maloomat abhi tasdeeq ki muntazir hain.") + handoff;
  return matched.map(([key, , label]) => storeKnowledge[key] ?? label + " will be confirmed by the jeweller.").join(" ") + handoff;
}
