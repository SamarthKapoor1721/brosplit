import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { calculateGroupBalances } from "@/lib/balances";
import { prisma } from "@/lib/prisma";

// GET /api/groups/[id]/balances - Get simplified balances for a group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  // Check user is member
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this group" },
      { status: 403 }
    );
  }

  const balances = await calculateGroupBalances(groupId);
  return NextResponse.json(balances);
}
