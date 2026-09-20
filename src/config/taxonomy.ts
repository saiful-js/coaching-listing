/**
 * Display-only copy of the taxonomy, used by the static foundation pages.
 *
 * The database seed (M1) is the source of truth for anything data-driven —
 * do NOT import this from feature code. The exact area list is still an open
 * plan gate (docs/plan.md, "Decision gates still open") — confirm before M1.
 *
 * `nameBn` is carried here so the M1 seed can be lifted straight from this
 * file; UI chrome stays English-only per ADR 0002.
 */
export const areas = [
  {
    slug: "narayanganj-sadar",
    nameEn: "Narayanganj Sadar",
    nameBn: "নারায়ণগঞ্জ সদর",
  },
  { slug: "fatullah", nameEn: "Fatullah", nameBn: "ফতুল্লা" },
  { slug: "siddhirganj", nameEn: "Siddhirganj", nameBn: "সিদ্ধিরগঞ্জ" },
  { slug: "bandar", nameEn: "Bandar", nameBn: "বন্দর" },
  { slug: "sonargaon", nameEn: "Sonargaon", nameBn: "সোনারগাঁও" },
  { slug: "rupganj", nameEn: "Rupganj", nameBn: "রূপগঞ্জ" },
  { slug: "araihazar", nameEn: "Araihazar", nameBn: "আড়াইহাজার" },
] as const;

export const categories = [
  { slug: "class-1-5", nameEn: "Class 1–5", nameBn: "ক্লাস ১–৫" },
  { slug: "class-6-8", nameEn: "Class 6–8", nameBn: "ক্লাস ৬–৮" },
  { slug: "ssc", nameEn: "SSC", nameBn: "এসএসসি" },
  { slug: "hsc", nameEn: "HSC", nameBn: "এইচএসসি" },
  { slug: "admission", nameEn: "Admission", nameBn: "ভর্তি প্রস্তুতি" },
  { slug: "english-medium", nameEn: "English Medium", nameBn: "ইংলিশ মিডিয়াম" },
  {
    slug: "ielts-spoken-english",
    nameEn: "IELTS & Spoken English",
    nameBn: "আইইএলটিএস ও স্পোকেন ইংলিশ",
  },
  {
    slug: "ict-programming",
    nameEn: "ICT & Programming",
    nameBn: "আইসিটি ও প্রোগ্রামিং",
  },
] as const;
