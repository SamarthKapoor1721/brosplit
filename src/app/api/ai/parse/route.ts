import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { parseExpenseText, matchMembers } from "@/lib/ai-parse";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { text?: string; groupId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

  const parsed = parseExpenseText(text);

  // Find candidate group: prefer one explicitly named, else best member match
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  let chosenGroupId: string | null = body.groupId ?? null;
  let chosenGroup = chosenGroupId ? groups.find((g) => g.id === chosenGroupId) : undefined;

  // Try matching group by name in the text
  if (!chosenGroup) {
    const lower = text.toLowerCase();
    chosenGroup = groups.find((g) => lower.includes(g.name.toLowerCase()));
    if (chosenGroup) chosenGroupId = chosenGroup.id;
  }

  // Otherwise pick the group with most matched participants
  if (!chosenGroup && parsed.participants.length) {
    let best: { group: typeof groups[number]; score: number } | null = null;
    for (const g of groups) {
      const members = g.members.map((m) => m.user);
      const matched = matchMembers(parsed.participants, members);
      const score = matched.length;
      if (score > 0 && (!best || score > best.score)) {
        best = { group: g, score };
      }
    }
    if (best) {
      chosenGroup = best.group;
      chosenGroupId = best.group.id;
    }
  }

  // Fallback: most recently updated group
  if (!chosenGroup && groups.length > 0) {
    chosenGroup = groups[0];
    chosenGroupId = groups[0].id;
  }

  let suggestedSplit: { id: string; name: string | null; email: string }[] = [];
  let suggestedPayer: { id: string; name: string | null; email: string } | null = null;

  if (chosenGroup) {
    const members = chosenGroup.members.map((m) => m.user);
    const matched = matchMembers(parsed.participants, members);
    const me = members.find((m) => m.id === userId);

    // Build split list: matched + you (unless said someone owes you)
    const splitSet = new Map<string, typeof members[number]>();
    if (me) splitSet.set(me.id, me);
    for (const m of matched) splitSet.set(m.id, m);

    // If split list ended up tiny and the text suggests "everyone"/"all", include all
    if (/\b(all|everyone|whole group|gang)\b/i.test(text)) {
      for (const m of members) splitSet.set(m.id, m);
    }

    // Edge: "X owes me 500" → split = [me, X], payer = me
    if (parsed.splitType === "owes" && parsed.ower) {
      const owerMember = matchMembers([parsed.ower], members)[0];
      splitSet.clear();
      if (me) splitSet.set(me.id, me);
      if (owerMember) splitSet.set(owerMember.id, owerMember);
      suggestedPayer = me ?? null;
    } else if (parsed.payerName === "me") {
      suggestedPayer = me ?? null;
    } else if (parsed.payerName) {
      const payerMatch = matchMembers([parsed.payerName], members)[0];
      suggestedPayer = payerMatch ?? me ?? null;
    } else {
      suggestedPayer = me ?? null;
    }

    suggestedSplit = Array.from(splitSet.values());
  }

  return NextResponse.json({
    parsed,
    suggestion: {
      groupId: chosenGroupId,
      groupName: chosenGroup?.name || null,
      payer: suggestedPayer,
      splitAmong: suggestedSplit,
      members:
        chosenGroup?.members.map((m) => m.user) ?? [],
    },
  });
}
