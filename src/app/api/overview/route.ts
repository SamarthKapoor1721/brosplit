import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { calculateGroupBalances } from "@/lib/balances";
import { categorize } from "@/lib/categories";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      expenses: {
        include: {
          paidBy: { select: { id: true, name: true, email: true } },
          splits: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Aggregate balances across all groups
  let youOwe = 0;
  let youAreOwed = 0;
  const perPerson: Record<string, { id: string; name: string; amount: number }> = {};
  const perGroup: { id: string; name: string; net: number; members: number; expenses: number }[] = [];

  for (const group of groups) {
    const balances = await calculateGroupBalances(group.id);
    let groupNet = 0;
    for (const b of balances) {
      if (b.from === userId) {
        youOwe += b.amount;
        groupNet -= b.amount;
        const key = b.to;
        if (!perPerson[key]) perPerson[key] = { id: b.to, name: b.toName, amount: 0 };
        perPerson[key].amount -= b.amount;
      } else if (b.to === userId) {
        youAreOwed += b.amount;
        groupNet += b.amount;
        const key = b.from;
        if (!perPerson[key]) perPerson[key] = { id: b.from, name: b.fromName, amount: 0 };
        perPerson[key].amount += b.amount;
      }
    }
    perGroup.push({
      id: group.id,
      name: group.name,
      net: Math.round(groupNet * 100) / 100,
      members: group.members.length,
      expenses: group.expenses.length,
    });
  }

  // Recent activity across all groups (last 10)
  type RecentExpense = {
    id: string;
    description: string;
    amount: number;
    date: string;
    groupId: string;
    groupName: string;
    paidBy: { id: string; name: string | null; email: string };
    yourShare: number;
    youPaid: boolean;
    category: { category: string; emoji: string; label: string };
  };

  const recent: RecentExpense[] = [];
  for (const group of groups) {
    for (const e of group.expenses) {
      const yourSplit = e.splits.find((s) => s.userId === userId);
      recent.push({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date.toISOString(),
        groupId: group.id,
        groupName: group.name,
        paidBy: e.paidBy,
        yourShare: yourSplit?.amount ?? 0,
        youPaid: e.paidById === userId,
        category: categorize(e.description),
      });
    }
  }
  recent.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  // Spend insights (last 30 days)
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30 = recent.filter((r) => +new Date(r.date) >= cutoff);
  const yourSpend30 = last30.reduce((sum, r) => sum + r.yourShare, 0);
  const totalSpend30 = last30.reduce((sum, r) => sum + r.amount, 0);

  return NextResponse.json({
    user: { id: userId, name: session.user.name, email: session.user.email },
    summary: {
      youOwe: Math.round(youOwe * 100) / 100,
      youAreOwed: Math.round(youAreOwed * 100) / 100,
      net: Math.round((youAreOwed - youOwe) * 100) / 100,
      yourSpend30: Math.round(yourSpend30 * 100) / 100,
      totalSpend30: Math.round(totalSpend30 * 100) / 100,
    },
    perPerson: Object.values(perPerson)
      .filter((p) => Math.abs(p.amount) > 0.01)
      .map((p) => ({ ...p, amount: Math.round(p.amount * 100) / 100 }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
    groups: perGroup,
    recent: recent.slice(0, 25),
  });
}
