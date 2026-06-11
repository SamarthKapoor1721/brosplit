import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-utils";
import { UPI_ID_REGEX } from "@/lib/upi";
import { z } from "zod";

const updateProfileSchema = z.object({
  upiId: z
    .union([
      z.string().trim().regex(UPI_ID_REGEX, "Enter a valid UPI ID like name@bank"),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  upiDisplayName: z.string().trim().max(100).nullable().optional(),
});

// GET /api/profile - Current user's profile (incl. UPI settings)
export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      upiId: true,
      upiDisplayName: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

// PATCH /api/profile - Update UPI settings (empty string removes the UPI ID)
export async function PATCH(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const updates: { upiId?: string | null; upiDisplayName?: string | null } = {};
    if (data.upiId !== undefined) {
      updates.upiId = data.upiId ? data.upiId : null;
    }
    if (data.upiDisplayName !== undefined) {
      updates.upiDisplayName = data.upiDisplayName || null;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        upiId: true,
        upiDisplayName: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
