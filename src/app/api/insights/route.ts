import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { categorize, ExpenseCategory } from "@/lib/categories";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const expenses = await prisma.expense.findMany({
    where: {
      OR: [
        { paidById: userId },
        { splits: { some: { userId } } },
      ],
    },
    include: {
      paidBy: { select: { id: true, name: true, email: true } },
      splits: true,
    },
    orderBy: { date: "desc" },
  });

  // Category breakdown (your share only)
  const byCategory: Record<string, { category: ExpenseCategory; emoji: string; label: string; amount: number; count: number }> = {};
  // Monthly trend (last 6 months)
  const now = new Date();
  const months: { key: string; label: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months.push({
      key,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      amount: 0,
    });
  }
  const monthMap = new Map(months.map((m) => [m.key, m]));

  let totalYourSpend = 0;
  let topPayee: { name: string; amount: number } | null = null;
  const peopleMap: Record<string, { name: string; amount: number }> = {};

  for (const e of expenses) {
    const yourSplit = e.splits.find((s) => s.userId === userId);
    const yourShare = yourSplit?.amount ?? 0;
    totalYourSpend += yourShare;

    const cat = categorize(e.description);
    if (!byCategory[cat.category]) {
      byCategory[cat.category] = { ...cat, amount: 0, count: 0 };
    }
    byCategory[cat.category].amount += yourShare;
    byCategory[cat.category].count += 1;

    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = monthMap.get(key);
    if (m) m.amount += yourShare;

    // Track who you paid for the most (when you paid)
    if (e.paidById === userId) {
      for (const s of e.splits) {
        if (s.userId === userId) continue;
        const name = e.paidBy.name || e.paidBy.email; // payer = self; track recipient names below
        if (name) { /* noop */ }
      }
    }
  }

  // Compute who-owes-you-most stats from raw splits across all groups
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      expenses: { include: { splits: true, paidBy: true } },
      members: { include: { user: true } },
    },
  });

  for (const g of groups) {
    for (const e of g.expenses) {
      if (e.paidById === userId) {
        for (const s of e.splits) {
          if (s.userId === userId) continue;
          const member = g.members.find((m) => m.user.id === s.userId);
          const name = member?.user.name || member?.user.email || "Someone";
          if (!peopleMap[s.userId]) peopleMap[s.userId] = { name, amount: 0 };
          peopleMap[s.userId].amount += s.amount;
        }
      } else if (e.splits.some((s) => s.userId === userId) && e.paidById) {
        // skip — handled by symmetric counts elsewhere
      }
    }
  }

  const peopleSorted = Object.values(peopleMap)
    .sort((a, b) => b.amount - a.amount)
    .map((p) => ({ ...p, amount: Math.round(p.amount * 100) / 100 }));
  if (peopleSorted.length) topPayee = peopleSorted[0];

  // Top category
  const categoryArr = Object.values(byCategory)
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({ ...c, amount: Math.round(c.amount * 100) / 100 }));

  const topCategory = categoryArr[0] || null;

  const thisMonth = months[months.length - 1].amount;
  const lastMonth = months[months.length - 2]?.amount ?? 0;
  const monthDelta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  return NextResponse.json({
    totalYourSpend: Math.round(totalYourSpend * 100) / 100,
    categories: categoryArr,
    months: months.map((m) => ({ ...m, amount: Math.round(m.amount * 100) / 100 })),
    topCategory,
    topPayee,
    peopleYouFronted: peopleSorted.slice(0, 5),
    thisMonth: Math.round(thisMonth * 100) / 100,
    lastMonth: Math.round(lastMonth * 100) / 100,
    monthDelta: Math.round(monthDelta),
    expenseCount: expenses.length,
  });
}
