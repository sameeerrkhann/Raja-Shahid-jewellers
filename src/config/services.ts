/* Showroom visit and jewellery enquiry forms. Choices are generic jewellery-shop needs; shop facts (address,
   hours, phone, WhatsApp) stay null until the owner approves them, and the forms are not connected yet. */
export const visitPurposes = ["Bridal set", "Custom design", "Ready-made jewellery", "Gold rate and exchange", "Repair or polish", "Something else"] as const;
export const visitTimes = ["11:00 am – 1:00 pm", "1:00 pm – 3:00 pm", "3:00 pm – 5:00 pm", "5:00 pm – 7:00 pm", "7:00 pm – 9:00 pm"] as const;
export const visitGroups = ["Just me", "2 people", "3–4 people", "5 or more"] as const;
export const enquiryTopics = ["A design from the Vault", "Custom or modified design", "Bridal set", "Price and weight", "Old gold exchange", "Repair or polish", "Other"] as const;
export const contactPreferences = ["Phone call", "WhatsApp"] as const;

export const shopDetails = {
  /** Filled only once the owner approves them. */
  address: null as string | null,
  hours: null as string | null,
  phone: null as string | null,
  whatsapp: null as string | null,
  formsConnected: false,
};
