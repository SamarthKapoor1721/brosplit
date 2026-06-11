import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i), h |= 0;
  return Math.abs(h);
}

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // Pull a tiny bit of real activity to make tips feel grounded
  const expenseCount = await prisma.expense.count({
    where: { OR: [{ paidById: userId }, { splits: { some: { userId } } }] },
  });
  const recentExpenses = await prisma.expense.findMany({
    where: { OR: [{ paidById: userId }, { splits: { some: { userId } } }] },
    include: { splits: true },
    orderBy: { date: "desc" },
    take: 30,
  });
  const yourSpend = recentExpenses.reduce((sum, e) => {
    const s = e.splits.find((sp) => sp.userId === userId);
    return sum + (s?.amount ?? 0);
  }, 0);

  // Stable mock score per user, in band 640..820
  const seed = hash(userId);
  const score = 640 + (seed % 181);
  const paymentHistory = 70 + (seed % 30);          // %
  const creditUtilization = 18 + ((seed >> 3) % 50); // %
  const creditAge = 1 + ((seed >> 5) % 9);           // years
  const accounts = 2 + ((seed >> 7) % 6);            // count
  const inquiries = ((seed >> 9) % 5);               // count

  const band =
    score >= 780 ? { label: "Excellent", color: "success" } :
    score >= 720 ? { label: "Good", color: "accent" } :
    score >= 680 ? { label: "Fair", color: "warning" } :
                   { label: "Build it up", color: "danger" };

  const tips: { id: string; text: string; severity: "good" | "warn" | "info" }[] = [];
  if (creditUtilization > 40) {
    tips.push({
      id: "util",
      severity: "warn",
      text: `Utilization is ${creditUtilization}%. Keeping it under 30% can lift your score in 60–90 days.`,
    });
  } else {
    tips.push({
      id: "util-good",
      severity: "good",
      text: `Utilization at ${creditUtilization}% is healthy. Stay below 30% to keep gaining.`,
    });
  }
  if (paymentHistory < 90) {
    tips.push({
      id: "pay",
      severity: "warn",
      text: `Payment history is ${paymentHistory}%. Auto-pay even the minimum due — it's the single biggest score lever.`,
    });
  } else {
    tips.push({
      id: "pay-good",
      severity: "good",
      text: `${paymentHistory}% on-time payments. Streak strong — keep it going.`,
    });
  }
  if (inquiries >= 3) {
    tips.push({
      id: "inq",
      severity: "info",
      text: `${inquiries} recent inquiries. Hold off on new credit applications for 3–6 months.`,
    });
  }
  if (yourSpend > 8000) {
    tips.push({
      id: "spend",
      severity: "info",
      text: `You've split ₹${Math.round(yourSpend).toLocaleString("en-IN")} recently. Auto-settling on time helps build a clean repayment trail.`,
    });
  }
  tips.push({
    id: "age",
    severity: "info",
    text: `Oldest account: ${creditAge} years. Don't close old cards — they anchor your average age.`,
  });

  return NextResponse.json({
    score,
    band,
    factors: {
      paymentHistory,
      creditUtilization,
      creditAgeYears: creditAge,
      accounts,
      inquiries,
    },
    tips,
    activity: {
      expenseCount,
      yourSpend30: Math.round(yourSpend * 100) / 100,
    },
  });
}
