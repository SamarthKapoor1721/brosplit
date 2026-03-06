import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { z } from "zod";

const createExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  paidById: z.string().optional(),
  splitAmong: z.array(z.string()).min(1, "Must split among at least one person"),
  date: z.string().optional(),
});

// POST /api/groups/[id]/expenses - Add an expense
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  // Check user is a member
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this group" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { description, amount, paidById, splitAmong, date } = createExpenseSchema.parse(body);

    const payerId = paidById || session.user.id;

    // Verify the payer is a member of the group
    const payerMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId: payerId },
    });
    if (!payerMembership) {
      return NextResponse.json(
        { error: "The selected payer is not a member of this group" },
        { status: 400 }
      );
    }

    const splitAmount = Math.round((amount / splitAmong.length) * 100) / 100;
    // Handle rounding remainder so total splits == expense amount
    const remainder = Math.round((amount - splitAmount * splitAmong.length) * 100) / 100;

    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        date: date ? new Date(date) : new Date(),
        paidById: payerId,
        groupId,
        splits: {
          create: splitAmong.map((userId, index) => ({
            userId,
            amount: index === 0 ? splitAmount + remainder : splitAmount,
          })),
        },
      },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
