import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/groups/[id]/invite - Public endpoint for invite landing page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, name: true, description: true, _count: { select: { members: true } } },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: group.id,
    name: group.name,
    description: group.description,
    memberCount: group._count.members,
  });
}
