export type ExpenseCategory =
  | "food"
  | "travel"
  | "shopping"
  | "rent"
  | "bills"
  | "entertainment"
  | "groceries"
  | "other";

const RULES: { keywords: string[]; category: ExpenseCategory; emoji: string; label: string }[] = [
  {
    category: "food",
    emoji: "🍔",
    label: "Food",
    keywords: [
      "dinner", "lunch", "breakfast", "brunch", "snack", "snacks",
      "pizza", "burger", "coffee", "tea", "cafe", "restaurant",
      "swiggy", "zomato", "food", "dine", "eat", "biryani", "thali",
      "drinks", "beer", "bar", "pub", "cocktail",
    ],
  },
  {
    category: "groceries",
    emoji: "🛒",
    label: "Groceries",
    keywords: ["grocery", "groceries", "blinkit", "zepto", "bigbasket", "instamart", "vegetables", "milk"],
  },
  {
    category: "travel",
    emoji: "✈️",
    label: "Travel",
    keywords: [
      "uber", "ola", "rapido", "taxi", "cab", "auto", "metro", "bus", "train",
      "flight", "fuel", "petrol", "diesel", "trip", "travel", "airbnb", "hotel",
      "stay", "ticket", "irctc", "indigo",
    ],
  },
  {
    category: "rent",
    emoji: "🏠",
    label: "Rent",
    keywords: ["rent", "deposit", "lease", "maintenance"],
  },
  {
    category: "bills",
    emoji: "📄",
    label: "Bills",
    keywords: [
      "electricity", "water", "wifi", "internet", "broadband", "gas", "phone", "mobile",
      "recharge", "subscription", "netflix", "spotify", "prime", "jiocinema", "hotstar",
    ],
  },
  {
    category: "shopping",
    emoji: "🛍️",
    label: "Shopping",
    keywords: ["amazon", "flipkart", "myntra", "shopping", "shoes", "clothes", "shirt", "tshirt"],
  },
  {
    category: "entertainment",
    emoji: "🎬",
    label: "Entertainment",
    keywords: ["movie", "concert", "show", "ticket", "club", "party", "bookmyshow"],
  },
];

export function categorize(description: string): { category: ExpenseCategory; emoji: string; label: string } {
  const text = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) {
      return { category: rule.category, emoji: rule.emoji, label: rule.label };
    }
  }
  return { category: "other", emoji: "💸", label: "Other" };
}

export const categoryStyle: Record<ExpenseCategory, { bg: string; ring: string; text: string }> = {
  food:          { bg: "bg-warning-soft", ring: "ring-warning/30", text: "text-warning" },
  travel:        { bg: "bg-accent-soft",  ring: "ring-accent/30",  text: "text-accent" },
  shopping:      { bg: "bg-primary-soft", ring: "ring-primary/30", text: "text-primary" },
  rent:          { bg: "bg-success-soft", ring: "ring-success/30", text: "text-success" },
  bills:         { bg: "bg-danger-soft",  ring: "ring-danger/30",  text: "text-danger" },
  entertainment: { bg: "bg-primary-soft", ring: "ring-primary/30", text: "text-primary" },
  groceries:     { bg: "bg-success-soft", ring: "ring-success/30", text: "text-success" },
  other:         { bg: "bg-card-hover",   ring: "ring-border",     text: "text-muted-strong" },
};
