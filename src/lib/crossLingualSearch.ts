export interface BilingualSynonymEntry {
  canonical: string;
  en: string[];
  bn: string[];
}

export const BILINGUAL_DICTIONARY: BilingualSynonymEntry[] = [
  {
    canonical: 'motivational books',
    en: ['motivational', 'motivation', 'self help', 'self-help', 'inspiration', 'inspirational', 'books', 'book'],
    bn: ['মোটিভেশনাল', 'মোটিভেশন', 'অনুপ্রেরণা', 'উন্নয়ন', 'আত্মউন্নয়ন', 'বই', 'বইসমূহ'],
  },
  {
    canonical: 'books',
    en: ['book', 'books', 'novel', 'literature', 'reading', 'education', 'academic'],
    bn: ['বই', 'পুস্তক', 'উপন্যাস', 'সাহিত্য', 'শিক্ষা', 'পড়া'],
  },
  {
    canonical: 'smartphone',
    en: ['smartphone', 'phone', 'mobile', 'cellphone', 'android', 'iphone', 'galaxy', '5g'],
    bn: ['স্মার্টফোন', 'ফোন', 'মোবাইল', 'হ্যান্ডসেট'],
  },
  {
    canonical: 'laptop',
    en: ['laptop', 'notebook', 'ultrabook', 'macbook', 'computer', 'pc'],
    bn: ['ল্যাপটপ', 'কম্পিউটার', 'নোটবুক'],
  },
  {
    canonical: 'headphones',
    en: ['headphone', 'headphones', 'earbuds', 'earphone', 'audio', 'airpods', 'wireless', 'speaker'],
    bn: ['হেডফোন', 'ইয়ারবাড', 'ইয়ারফোন', 'স্পিকার', 'অডিও'],
  },
  {
    canonical: 'smartwatch',
    en: ['smartwatch', 'watch', 'wearable', 'fitness tracker', 'band'],
    bn: ['স্মার্টওয়াচ', 'ঘড়ি', 'হাতঘড়ি', 'ওয়াচ'],
  },
  {
    canonical: 'fashion',
    en: ['fashion', 'clothing', 'apparel', 'hoodie', 'shirt', 't-shirt', 'cap', 'jacket', 'mens', 'womens'],
    bn: ['ফ্যাশন', 'পোশাক', 'জামা', 'হুডি', 'শার্ট', 'ক্যাপ', 'টি-শার্ট'],
  },
  {
    canonical: 'shoes',
    en: ['shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'boots', 'sandals'],
    bn: ['জুতা', 'স্নিকার', 'জুতো', 'পাদুকা'],
  },
  {
    canonical: 'backpack',
    en: ['bag', 'bags', 'backpack', 'wallet', 'luggage', 'travel bag'],
    bn: ['ব্যাগ', 'ব্যাকপ্যাক', 'মানিব্যাগ', 'ওয়ালেট'],
  },
  {
    canonical: 'beauty',
    en: ['beauty', 'skincare', 'serum', 'cream', 'cosmetics', 'facewash', 'sunscreen', 'personal care'],
    bn: ['বিউটি', 'স্কিনকেয়ার', 'সৌন্দর্য', 'ত্বক', 'ক্রিম', 'সিরাম', 'প্রসাধনী'],
  },
  {
    canonical: 'home living',
    en: ['home', 'living', 'chair', 'furniture', 'appliance', 'kitchen', 'lamp', 'decor'],
    bn: ['হোম', 'ঘর', 'আসবাব', 'চেয়ার', 'হোম অ্যাপ্লায়েন্স', 'ঘরোয়া'],
  },
  {
    canonical: 'accessories',
    en: ['power bank', 'charger', 'cable', 'glasses', 'sunglasses', 'gadget'],
    bn: ['পাওয়ার ব্যাংক', 'চার্জার', 'চশমা', 'গ্যাজেট', 'এক্সেসরিজ'],
  },
];

// Normalize Bangla/English text: collapse whitespace, lowercase ASCII, normalize common Bangla variants
export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function expandCrossLingualTerms(rawQuery: string): {
  normalizedQuery: string;
  tokens: string[];
  expandedTerms: string[];
} {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) {
    return { normalizedQuery: '', tokens: [], expandedTerms: [] };
  }

  const tokens = normalizedQuery.split(' ').filter((t) => t.length >= 1);
  const expanded = new Set<string>([normalizedQuery, ...tokens]);

  for (const entry of BILINGUAL_DICTIONARY) {
    const allEntryTerms = [entry.canonical, ...entry.en, ...entry.bn].map((t) => normalizeSearchText(t));
    const matched =
      allEntryTerms.some((term) => normalizedQuery.includes(term)) ||
      tokens.some((tok) => allEntryTerms.some((term) => term === tok || (tok.length >= 3 && term.startsWith(tok))));

    if (matched) {
      expanded.add(entry.canonical);
      for (const t of entry.en) expanded.add(normalizeSearchText(t));
      for (const t of entry.bn) expanded.add(normalizeSearchText(t));
    }
  }

  return {
    normalizedQuery,
    tokens,
    expandedTerms: Array.from(expanded).filter(Boolean),
  };
}

export function buildHighlightSegments(text: string, query: string): Array<{ text: string; match: boolean }> {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return [{ text, match: false }];

  const tokens = cleanQuery.split(' ').filter((t) => t.length >= 2);
  if (tokens.length === 0) return [{ text, match: false }];

  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts
    .filter((p) => p.length > 0)
    .map((part) => ({
      text: part,
      match: tokens.some((tok) => part.toLowerCase() === tok.toLowerCase()),
    }));
}
