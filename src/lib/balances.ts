import { prisma } from "@/lib/prisma";

interface Balance {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export async function calculateGroupBalances(groupId: string): Promise<Balance[]> {
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      paidBy: true,
      splits: {
        include: { user: true },
      },
    },
  });

  // Net balance per user: positive = owed money, negative = owes money
  const netBalances: Record<string, { amount: number; name: string }> = {};

  for (const expense of expenses) {
    // Person who paid gets credit
    if (!netBalances[expense.paidById]) {
      netBalances[expense.paidById] = { amount: 0, name: expense.paidBy.name || expense.paidBy.email };
    }
    netBalances[expense.paidById].amount += expense.amount;

    // Each person in the split owes their share
    for (const split of expense.splits) {
      if (!netBalances[split.userId]) {
        netBalances[split.userId] = { amount: 0, name: split.user.name || split.user.email };
      }
      netBalances[split.userId].amount -= split.amount;
    }
  }

  // Simplify debts using greedy algorithm
  const creditors: { id: string; name: string; amount: number }[] = [];
  const debtors: { id: string; name: string; amount: number }[] = [];

  for (const [userId, data] of Object.entries(netBalances)) {
    if (data.amount > 0.01) {
      creditors.push({ id: userId, name: data.name, amount: data.amount });
    } else if (data.amount < -0.01) {
      debtors.push({ id: userId, name: data.name, amount: -data.amount });
    }
  }

  // Sort for optimal settlement
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Balance[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].id,
        fromName: debtors[i].name,
        to: creditors[j].id,
        toName: creditors[j].name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}
