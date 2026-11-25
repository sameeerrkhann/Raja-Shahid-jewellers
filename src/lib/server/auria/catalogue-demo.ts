import "server-only";
import type { ChatProvider, Language, ProviderTurn, ToolCall } from "@/types/auria";
import type { DesignCardData, DisplayStatus, PublicDesign } from "@/types/catalogue";
import { catalogueCategories, categoryLabel, occasionOptions, purityOptions, statusLabels, styleOptions } from "@/config/catalogue";
import { budgetFrom, categoryFrom, demoLanguage, purityFrom } from "@/lib/auria/demo-intent";
import { collections } from "@/lib/server/catalogue";
import { businessReply } from "@/lib/auria/knowledge";

type DemoDesign = { designCode: string; category: string; purities: number[] };
type DemoContext = {
  language: Language;
  selectedDesign: DemoDesign | null;
  displayedDesigns: (DemoDesign & { position: number })[];
  shortlistDesigns?: DemoDesign[];
  referenceNote?: string | null;
  budgetPreferencePKR?: number | null;
  draft?: { status: string } | null;
};
type Locale = Exclude<Language, "auto">;
type Reply = (en: string, ur: string, roman: string) => string;
const ordinals = [/\b(first|pehl[ai])\b|پہل[یای]/i, /\b(second|doosr[ai]|dusr[ai])\b|دوسر[یای]/i, /\b(third|teesr[ai]|tisr[ai])\b|تیسر[یای]/i];
const comparePattern = /\b(compare|comparison|lighter|heavier|cheaper|difference between|muqabla|sasta|halka)\b|موازنہ|فرق|سستا|ہلکا/i;
const preparePattern = /\b(prepare|draft|start|create|make)\b.*\b(quote|quotation|enquiry|inquiry)\b|\b(quote|quotation|enquiry)\b.*\b(banao|banayen)\b|کوٹیشن بنا|انکوائری بنا/i;
const relatedPattern = /\b(similar|like this|something like|milta julta|isi jaisa)\b|ملتا جلتا|جیسا/i;
const quotePattern = /\b(quote|quotation|budget|customiz(?:e|ation)|customise)\b|بجٹ|قیمت/i;

function plan(prompt: string, context: DemoContext, locale: Locale, say: Reply, history: ProviderTurn[]): ToolCall | string {
  const ids = [...new Set((prompt.match(/\bRSJ-D\d{3,6}\b/gi) ?? []).map((code) => code.toUpperCase()))];
  const reference = prompt.match(/\bDEMO-[QC]-[a-f0-9]{8,32}\b/i)?.[0];
  if (reference || /\b(track(?:ing)?|(?:enquiry|order) status|status of my (?:enquiry|order))\b/i.test(prompt)) return { name: "getOrderStatus", args: reference ? { reference } : {} };

  const business = businessReply(prompt, locale);
  if (business && !ids.length) return business;
  if (/\b(?:kids?|children['’]?s|for children|bachon)\b|بچوں/i.test(prompt)) return say(
    "The sample catalogue has no children’s jewellery. The workshop can review a custom enquiry.",
    "نمونہ کیٹلاگ میں بچوں کے زیورات موجود نہیں ہیں۔ جیولر کسٹم درخواست دیکھ سکتا ہے۔",
    "Sample catalogue mein bachon ke zewarat nahin hain. Workshop custom enquiry dekh sakti hai.",
  );
  const category = categoryFrom(prompt);
  const shown = context.displayedDesigns.length >= 2 ? context.displayedDesigns : context.shortlistDesigns?.length ? context.shortlistDesigns : context.displayedDesigns;
  const candidates = shown.filter((item) => !category || item.category === category);
  const ordinalMatches = ordinals.map((pattern, index) => ({ index, at: prompt.search(pattern) })).filter(({ at }) => at >= 0).sort((a, b) => a.at - b.at);
  const resolved = ordinalMatches.map(({ index }) => shown[index]).filter((item) => item && (!category || item.category === category));
  if (preparePattern.test(prompt)) {
    const design = resolved[0] ?? context.selectedDesign;
    const designCode = ids[0] ?? design?.designCode;
    if (!designCode || ids.length > 1 || ordinalMatches.length > 1) return say("Choose one design for the draft, or share its RSJ code.", "کوٹیشن کے لیے ایک ڈیزائن یا اس کا کوڈ بتائیں۔", "Draft ke liye ek design ya us ka RSJ code batayen.");
    if (context.draft?.status === "DRAFT") return say("There’s already a saved draft. Open Design & draft to review or edit it.", "محفوظ کوٹیشن میں تبدیلی کے لیے Design & draft کھولیں۔", "Saved draft dekhne ya badalne ke liye Design & draft kholen.");
    if (context.draft) return say("This conversation already has a submitted enquiry. Start a new conversation for a new draft.", "اس گفتگو میں انکوائری محفوظ ہے۔ نئی کوٹیشن کے لیے نئی گفتگو شروع کریں۔", "Is conversation mein enquiry save hai. Naye draft ke liye nayi conversation shuru karen.");
    const purity = purityFrom(prompt);
    return { name: "createQuoteDraft", args: { designId: designCode, ...(purity ? { goldPurity: Number(purity) } : {}), budgetPKR: context.budgetPreferencePKR ?? null } };
  }
  if (comparePattern.test(prompt)) {
    const contextCodes = (ordinalMatches.length ? resolved : candidates.slice(0, 2)).map((item) => item.designCode);
    const designIds = (ids.length ? [...ids, ...(ordinalMatches.length ? contextCodes : [])] : contextCodes).slice(0, 4);
    if (designIds.length >= 2) return { name: "compareDesigns", args: { designIds } };
    return say("Choose two catalogue designs or enter their RSJ design codes and I’ll compare them.", "موازنے کے لیے دو ڈیزائن یا ان کے آر ایس جے کوڈ بتائیں۔", "Muqable ke liye do designs ya un ke RSJ codes batayen.");
  }

  if (ids[0]) return { name: "getProductDetails", args: { designId: ids[0] } };
  if (relatedPattern.test(prompt) && context.selectedDesign && !purityFrom(prompt)) return { name: "getRelatedDesigns", args: { designId: context.selectedDesign.designCode } };
  const ordinal = ordinals.findIndex((pattern) => pattern.test(prompt));
  const refersToSelection = /\b(this|that) (one|design|piece|ring|bangle|necklace)\b|یہ ڈیزائن|وہ ڈیزائن/i.test(prompt);
  if (ordinal >= 0 || refersToSelection) {
    const shown = context.displayedDesigns.filter((item) => !category || item.category === category);
    const shortlist = context.shortlistDesigns?.filter((item) => !category || item.category === category) ?? [];
    const design = ordinal >= 0 ? (shown.length >= 2 ? shown : shortlist.length ? shortlist : shown)[ordinal] : context.selectedDesign;
    if (!design || (category && category !== design.category)) return say("Which design do you mean? Select a design or enter its catalogue code.", "کون سا ڈیزائن؟ اسے منتخب کریں یا اس کا کوڈ بتائیں۔", "Kaunsa design? Design chunen ya us ka code batayen.");
    return { name: "getProductDetails", args: { designId: design.designCode } };
  }

  const terms = prompt.toLowerCase();
  const subcategory = catalogueCategories.find((item) => item.parentId && terms.includes(item.slug.replaceAll("-", " ")))?.slug;
  const collection = collections.find((item) => terms.includes(item.title.toLowerCase()) || terms.includes(item.slug.replaceAll("-", " ")))?.slug;
  const refinements = /\b(instead|same|similar|anything else|what about|aur koi|isi jaisa)\b|اس جیسا|اسی طرح/i.test(prompt);
  const previous = history.slice(0, -1).filter((message) => message.role === "user").findLast((message) => !!categoryFrom(message.text) || !!purityFrom(message.text));
  const searchCategory = category ?? (refinements || budgetFrom(prompt) || purityFrom(prompt) ? context.selectedDesign?.category ?? (previous && categoryFrom(previous.text)) : undefined);
  const karat = purityFrom(prompt) ?? (refinements && previous ? purityFrom(previous.text) : undefined);
  const style = styleOptions.find((item) => new RegExp("\\b" + item + "\\b", "i").test(prompt)) ?? (/\b(traditional|riwayati)\b|روایتی/i.test(prompt) ? "heritage" : undefined);
  const occasion = occasionOptions.find((item) => new RegExp("\\b" + item + "\\b", "i").test(prompt)) ?? (/\b(daily wear|rozana)\b|روزانہ/i.test(prompt) ? "everyday" : undefined);
  const budgetPKR = budgetFrom(prompt);
  const status = /\bin stock\b/i.test(prompt) ? "IN_STOCK" : /\b(made to order|available to craft)\b/i.test(prompt) ? "MADE_TO_ORDER" : undefined;
  const quote = quotePattern.test(prompt);
  if (category || searchCategory || subcategory || collection || karat || status || budgetPKR || style || occasion || quote) {
    return { name: "searchJewellery", args: { category: searchCategory, subcategory, collection, style, occasion, karat, status, ...(budgetPKR ? { budgetPKR } : {}) } };
  }
  if (/\b(categories|types of jewellery)\b/i.test(prompt)) return { name: "getCategories", args: {} };
  if (/\b(collections)\b/i.test(prompt)) return say("Explore " + collections.map(({ title }) => title).join(", ") + ". Tell me which collection you’d like to see.", "کیٹلاگ کے مجموعے دیکھنے کے لیے کسی مجموعے کا نام بتائیں۔", "Catalogue mein kisi collection ka naam batayen.");
  return say(
    "I can help you find a jewellery design, compare pieces, prepare a quotation or check a saved enquiry. Try “22K gold rings” or enter a design code.",
    "میں زیورات کا ڈیزائن تلاش کرنے، موازنہ کرنے، کوٹیشن بنانے یا انکوائری دیکھنے میں مدد کر سکتی ہوں۔ 22 قیراط کی انگوٹھیاں تلاش کریں یا ڈیزائن کوڈ بتائیں۔",
    "Main design dhoondne, muqabla karne, quotation banane aur enquiry ka status dekhne mein madad kar sakti hoon. 22K angothi ya design code batayen.",
  );
}

export function catalogueDemoProvider(prompt: string, context: DemoContext, history: ProviderTurn[] = []): ChatProvider {
  const locale = demoLanguage(prompt, context.language);
  const say: Reply = (en, ur, roman) => locale === "ur" ? ur : locale === "roman-ur" ? roman : en;
  const request = plan(prompt, context, locale, say, history);
  const quote = say("Prices, weights and timing are to be confirmed by the jeweller.", "قیمت، وزن اور تکمیل کا وقت جیولر سے تصدیق کے بعد معلوم ہوگا۔", "Qeemat, wazan aur waqt jeweller tasdeeq karega.");
  return {
    async *stream(input) {
      input.signal.throwIfAborted();
      if (typeof request === "string") {
        yield { text: request };
        return;
      }
      if (!input.exchanges.length) {
        yield { calls: [request], continuation: { local: true } };
        return;
      }
      const { data } = input.exchanges[0].results[0];
      if (request.name === "createQuoteDraft") {
        const result = data as { draft?: { variantId: string | null } };
        yield { text: result.draft ? say("I prepared a fictional quotation draft. Open Design & draft to review the recorded purity, budget and any custom details. Confirm the saved draft yourself when it’s ready.", "نمونہ کوٹیشن تیار ہے۔ Design & draft میں تفصیلات دیکھیں اور خود تصدیق کریں۔", "Demo quotation draft tayyar hai. Design & draft mein details check kar ke khud confirm karen.") : say("I couldn’t prepare that draft. Please select a published design and a recorded purity in Design & draft.", "کوٹیشن نہیں بن سکی۔ Design & draft میں شائع شدہ ڈیزائن اور قیراط منتخب کریں۔", "Draft nahin bana. Design & draft mein published design aur karat chunen.") };
        return;
      }
      if (request.name === "getOrderStatus") {
        const result = data as { found?: boolean; reference?: string; status?: string };
        yield { text: result.found
          ? say("Recorded demo status for ", "نمونہ انکوائری کا ریکارڈ ", "Demo enquiry ka record ") + result.reference + " · **" + result.status?.replaceAll("_", " ") + "**."
          : say("No matching enquiry was found in this browser session.", "اس براؤزر سیشن میں مماثل انکوائری نہیں ملی۔", "Is browser session mein matching enquiry nahin mili.") };
        return;
      }
      if (request.name === "getCategories") {
        const categories = data as typeof catalogueCategories;
        yield { text: say("You can browse ", "آپ یہ اقسام دیکھ سکتے ہیں ", "In categories ko dekhen ") + categories.filter((item) => !item.parentId).map((item) => item.label).join(", ") + "." };
        return;
      }
      if (request.name === "getProductDetails") {
        const design = data as Partial<PublicDesign>;
        if (!design.title) {
          yield { text: say("I couldn’t find that code in the published sample catalogue.", "یہ کوڈ شائع شدہ نمونہ کیٹلاگ میں نہیں ملا۔", "Yeh code published sample catalogue mein nahin mila.") };
          return;
        }
        const options = design.variants?.flatMap((variant) => variant.karat ? [variant.karat + "K"] : []) ?? [];
        yield { text: "**" + design.title + "** (" + design.designCode + ")\n\n" + design.description + "\n\n"
          + say("Sample gold options", "سونے کے نمونہ آپشن", "Sone ke sample options") + " · " + (options.join(", ") || say("To be confirmed", "تصدیق باقی ہے", "Tasdeeq baqi hai")) + ". " + quote };
        return;
      }
      if (request.name === "compareDesigns") {
        const { compared = [] } = data as { compared?: { title: string; designCode: string; category: string; purities: number[]; sampleDisplayStatus: DisplayStatus; customizationAvailable: boolean }[] };
        if (compared.length < 2) {
          yield { text: say("I need two published design codes to make a comparison.", "موازنے کے لیے دو شائع شدہ کوڈ بتائیں۔", "Muqable ke liye do published design codes batayen.") };
          return;
        }
        const rows = compared.map((item) => "| " + [item.title + " (" + item.designCode + ")", categoryLabel(item.category), item.purities.map((value) => value + "K").join(", ") || "Confirm", statusLabels[item.sampleDisplayStatus], item.customizationAvailable ? "By enquiry" : "As shown"].join(" | ") + " |");
        yield { text: say("Sample catalogue comparison", "نمونہ ڈیزائنوں کا موازنہ", "Sample designs ka muqabla")
          + "\n\n| Design | Category | Gold | Sample status | Customisation |\n| --- | --- | --- | --- | --- |\n" + rows.join("\n") + "\n\n" + quote
          + " " + say("These designs are quote-only, so the catalogue cannot tell which costs less.", "درج شدہ قیمتیں موجود نہیں، اس لیے یہ نہیں کہا جا سکتا کہ کون سا کم قیمت ہے۔", "Prices quote par milti hain, is liye catalogue se sasta design maloom nahin hota.") };
        return;
      }
      const { items = [], requestedPurity, matchedVariantStatus } = data as { items?: DesignCardData[]; requestedPurity?: string; matchedVariantStatus?: { id: string; displayStatus: DisplayStatus }[] };
      const intro = say("These pieces come from the sample catalogue.", "یہ زیورات نمونہ کیٹلاگ سے ہیں۔", "Yeh pieces sample catalogue se hain.");
      let text = items.length ? intro + " " + quote : say(
        "No sample designs match those filters. Try another category or a published design code.",
        "ان شرائط سے کوئی نمونہ نہیں ملا۔ کوئی دوسری قسم یا ڈیزائن کوڈ بتائیں۔",
        "In filters ka koi sample nahin mila. Doosri category ya design code azmayen.",
      );
      if (requestedPurity) text = say(
        "The sample catalogue has no " + requestedPurity + " designs. Published gold options are " + purityOptions.map((purity) => purity + "K").join(" and ") + ". Prices are confirmed by quotation.",
        "نمونہ کیٹلاگ میں " + requestedPurity + " کے ڈیزائن نہیں ہیں۔ دستیاب نمونے 18 اور 22 قیراط کے ہیں۔",
        "Sample catalogue mein " + requestedPurity + " design nahin hain. Published options 18K aur 22K hain.",
      );
      if (items.some((card) => matchedVariantStatus?.some((match) => match.id === card.id && match.displayStatus !== card.displayStatus))) {
        text += " " + say("The badges show design-level sample availability. Confirm your chosen purity in the quotation.", "بیج پورے ڈیزائن کی نمونہ دستیابی بتاتے ہیں۔ مطلوبہ قیراط کی کوٹیشن میں تصدیق کریں۔", "Badge design ki sample availability dikhata hai. Pasandida karat quotation mein tasdeeq karen.");
      }
      const budget = budgetFrom(prompt);
      if (budget && items.length) text += " " + say("Select a piece to carry your PKR budget into the quotation draft. Pricing is quote-only.", "اپنا بجٹ کوٹیشن میں شامل کرنے کے لیے ڈیزائن منتخب کریں۔", "Budget quotation mein rakhne ke liye design chunen.");
      else if (items.length && quotePattern.test(prompt)) text += " " + say("Select a design to enter your preferences and review a quotation draft.", "کوٹیشن کے لیے ایک ڈیزائن منتخب کریں۔", "Quotation ke liye design chunen.");
      yield { text };
    },
  };
}
