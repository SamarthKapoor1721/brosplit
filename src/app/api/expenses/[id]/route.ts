import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";

// DELETE /api/expenses/[id] - Delete an expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { group: { include: { members: true } } },
  });

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  // Only the person who paid or a group admin can delete
  const isAdmin = expense.group.members.some(
    (m) => m.userId === session.user.id && m.role === "admin"
  );
  const isPayer = expense.paidById === session.user.id;

  if (!isAdmin && !isPayer) {
    return NextResponse.json(
      { error: "Only the payer or group admin can delete this expense" },
      { status: 403 }
    );
  }

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ message: "Expense deleted" });
}
