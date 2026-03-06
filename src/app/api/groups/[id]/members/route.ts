import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { sendInviteEmail } from "@/lib/email";
import { z } from "zod";

const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// POST /api/groups/[id]/members - Add member by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;

  // Check current user is a member
  const currentMembership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
    include: {
      user: { select: { name: true, email: true } },
      group: { select: { name: true } },
    },
  });

  if (!currentMembership) {
    return NextResponse.json(
      { error: "You are not a member of this group" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email } = addMemberSchema.parse(body);

    // Find or create user by email
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create a placeholder user - they can set password when they sign up
      user = await prisma.user.create({
        data: { email, name: email.split("@")[0] },
      });
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: user.id },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "This person is already in the group" },
        { status: 400 }
      );
    }

    const member = await prisma.groupMember.create({
      data: {
        userId: user.id,
        groupId,
        role: "member",
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Send invitation email (non-blocking — don't fail the request if email fails)
    const inviterName = currentMembership.user.name || currentMembership.user.email;
    const groupName = currentMembership.group.name;
    sendInviteEmail({
      to: email,
      inviterName,
      groupName,
      groupId,
    }).catch((err) => console.error("Invite email failed:", err));

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/members - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  await prisma.groupMember.deleteMany({
    where: { groupId, userId },
  });

  return NextResponse.json({ message: "Member removed" });
}
