import { categorize } from "@/lib/categories";

export interface ParsedExpense {
  amount: number | null;
  description: string;
  participants: string[]; // raw name tokens user mentioned (for matching)
  splitType: "equal" | "owes" | "paid";
  payerName: string | null; // if user said "X paid"
  ower: string | null;      // if user said "X owes me", this is X
  category: { category: string; emoji: string; label: string };
  rawText: string;
  confidence: number;
}

const NUMBER_WORDS: Record<string, number> = {
  hundred: 100, thousand: 1000, lakh: 100000, lac: 100000,
};

function extractAmount(text: string): number | null {
  // 1) Currency-prefixed: ₹500, rs 500, rs.500, inr 500, $500
  const currencyRe = /(?:₹|rs\.?|inr|usd|\$)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i;
  const cMatch = text.match(currencyRe);
  if (cMatch) return parseFloat(cMatch[1].replace(/,/g, ""));

  // 2) Numbers followed by k/K (e.g., 1.2k, 5k)
  const kRe = /\b([0-9]+(?:\.[0-9]+)?)\s*k\b/i;
  const kMatch = text.match(kRe);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;

  // 3) "500 rupees" / "500 bucks"
  const trailRe = /\b([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:rupees?|bucks|dollars?|inr)\b/i;
  const tMatch = text.match(trailRe);
  if (tMatch) return parseFloat(tMatch[1].replace(/,/g, ""));

  // 4) Bare number: prefer first plausible number (>= 1)
  const numRe = /\b([0-9][0-9,]*(?:\.[0-9]+)?)\b/;
  const nMatch = text.match(numRe);
  if (nMatch) {
    const n = parseFloat(nMatch[1].replace(/,/g, ""));
    if (n >= 1) return n;
  }

  // 5) Word numbers: "five hundred", "two thousand"
  const lower = text.toLowerCase();
  for (const [word, mult] of Object.entries(NUMBER_WORDS)) {
    const re = new RegExp(`\\b(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)\\s+${word}\\b`);
    const m = lower.match(re);
    if (m) {
      const digits = parseInt(m[1], 10);
      const wordsMap: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      };
      const n = isNaN(digits) ? wordsMap[m[1]] : digits;
      if (n) return n * mult;
    }
  }
  return null;
}

const STOPWORDS = new Set([
  "add", "an", "a", "the", "expense", "of", "for", "with", "and",
  "to", "split", "splitting", "equally", "evenly", "between", "among",
  "spent", "paid", "owe", "owes", "owed", "pay", "rupees", "rs", "inr",
  "rupee", "bucks", "rupees.", "lunch", "dinner", "yesterday", "today", "tomorrow",
  "me", "i", "you", "we", "us", "them", "they",
  "by", "on", "in", "at", "from",
  "hundred", "thousand", "lakh",
  "share", "shares", "split", "guys",
]);

/**
 * Extract candidate participant name tokens. We grab capitalized words
 * (proper nouns) and known indicators like "with X, Y and Z".
 */
function extractParticipants(text: string): string[] {
  const found = new Set<string>();

  // Prefer "with X, Y and Z" or "between X, Y and Z"
  const groupRe = /\b(?:with|between|among|amongst)\s+([^.;]+?)(?:\s+(?:split|equally|evenly|for|on|at|paid)|$)/i;
  const m = text.match(groupRe);
  if (m) {
    const list = m[1]
      .split(/[,&]|\band\b/i)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of list) {
      const cleaned = name.replace(/[^\w\s'-]/g, "").trim();
      if (cleaned && cleaned.length > 1 && !STOPWORDS.has(cleaned.toLowerCase())) {
        found.add(cleaned);
      }
    }
  }

  // Pick up capitalized proper nouns elsewhere (very tolerant)
  const capRe = /\b([A-Z][a-z]{1,})\b/g;
  let cm: RegExpExecArray | null;
  while ((cm = capRe.exec(text))) {
    const w = cm[1];
    if (!STOPWORDS.has(w.toLowerCase())) {
      found.add(w);
    }
  }

  return Array.from(found);
}

function extractDescription(text: string, amount: number | null): string {
  // Strip common command verbs and amount tokens
  let cleaned = text
    .replace(/^(?:add|log|note)\s+/i, "")
    .replace(/(?:₹|rs\.?|inr|\$)\s*[0-9][0-9,]*(?:\.[0-9]+)?/i, "")
    .replace(/\b[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:k|rupees?|bucks|dollars?|inr)?\b/i, "")
    .replace(/\bsplit\s+(?:equally|evenly|among|amongst|between)?.*$/i, "")
    .replace(/\bwith\s+.+?(?=$|\sfor\s|\son\s)/i, "")
    .replace(/\b(an?\s+)?expense(?:\s+of)?/i, "")
    .replace(/\b(paid|owes?|owed)\b.*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Try to find the noun phrase like "dinner", "uber to airport"
  if (!cleaned) {
    const nounRe = /\b(dinner|lunch|breakfast|brunch|coffee|tea|uber|ola|cab|taxi|movie|gas|petrol|fuel|grocer(?:y|ies)|rent|wifi|electricity|trip|flight|hotel)\b/i;
    const m = text.match(nounRe);
    if (m) cleaned = m[1];
  }

  cleaned = cleaned.replace(/^(for|on|at)\s+/i, "").trim();
  if (!cleaned) cleaned = "Expense";
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function detectSplitType(text: string): { splitType: "equal" | "owes" | "paid"; payerName: string | null; ower: string | null } {
  const lower = text.toLowerCase();

  // "Rahul owes me 500" / "Rahul owes me"
  const owesRe = /\b([A-Z][a-z]+)\s+owes\s+me\b/;
  const owesMatch = text.match(owesRe);
  if (owesMatch) {
    return { splitType: "owes", payerName: null, ower: owesMatch[1] };
  }

  // "I owe Rahul 500" / "owe Rahul"
  const iOweRe = /\bI\s+owe\s+([A-Z][a-z]+)/i;
  const iOweMatch = text.match(iOweRe);
  if (iOweMatch) {
    return { splitType: "owes", payerName: iOweMatch[1], ower: "me" };
  }

  // "Rahul paid 500"
  const paidRe = /\b([A-Z][a-z]+)\s+paid\b/;
  const paidMatch = text.match(paidRe);
  if (paidMatch) {
    return { splitType: "paid", payerName: paidMatch[1], ower: null };
  }

  // "I paid 500 for ..." → still equal split, payer = me
  if (/\bI\s+paid\b/i.test(text)) {
    return { splitType: "equal", payerName: "me", ower: null };
  }

  if (lower.includes("equally") || lower.includes("evenly") || lower.includes("split")) {
    return { splitType: "equal", payerName: null, ower: null };
  }
  return { splitType: "equal", payerName: null, ower: null };
}

export function parseExpenseText(text: string): ParsedExpense {
  const amount = extractAmount(text);
  const participants = extractParticipants(text);
  const split = detectSplitType(text);
  const description = extractDescription(text, amount);
  const category = categorize(description || text);

  // Confidence heuristic
  let confidence = 0;
  if (amount) confidence += 0.5;
  if (participants.length) confidence += 0.25;
  if (description && description !== "Expense") confidence += 0.2;
  confidence = Math.min(1, confidence);

  return {
    amount,
    description,
    participants,
    splitType: split.splitType,
    payerName: split.payerName,
    ower: split.ower,
    category,
    rawText: text,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export interface MemberLite {
  id: string;
  name: string | null;
  email: string;
}

/** Fuzzy-match parsed name tokens against group members. */
export function matchMembers(tokens: string[], members: MemberLite[]): MemberLite[] {
  const matches: MemberLite[] = [];
  for (const tok of tokens) {
    const t = tok.toLowerCase();
    const m = members.find((mb) => {
      const name = (mb.name || mb.email).toLowerCase();
      return name.includes(t) || t.includes(name.split(/[@\s]/)[0]);
    });
    if (m && !matches.includes(m)) matches.push(m);
  }
  return matches;
}
