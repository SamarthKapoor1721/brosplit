import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { z } from "zod";

const createSettlementSchema = z.object({
  receiverId: z.string().min(1, "Receiver is required"),
  amount: z.number().positive("Amount must be positive"),
  note: z.string().trim().max(200).optional(),
});

// GET /api/groups/[id]/settlements - Settlement history for a group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this group" },
      { status: 403 }
    );
  }

  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    include: {
      payer: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(settlements);
}

// POST /api/groups/[id]/settlements - Record a settlement (after UPI payment)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;
  const payerId = session.user.id;

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: payerId },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this group" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { receiverId, amount, note } = createSettlementSchema.parse(body);

    if (receiverId === payerId) {
      return NextResponse.json(
        { error: "You can't settle with yourself" },
        { status: 400 }
      );
    }

    const receiverMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId: receiverId },
    });
    if (!receiverMembership) {
      return NextResponse.json(
        { error: "Receiver is not a member of this group" },
        { status: 400 }
      );
    }

    const settlement = await prisma.settlement.create({
      data: {
        amount: Math.round(amount * 100) / 100,
        note: note || "BroSplit Settlement",
        payerId,
        receiverId,
        groupId,
      },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(settlement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error creating settlement:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
