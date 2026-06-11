import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UPI_ID_REGEX } from "@/lib/upi";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  upiId: z
    .union([
      z.string().trim().regex(UPI_ID_REGEX, "Enter a valid UPI ID like name@bank"),
      z.literal(""),
    ])
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, upiId } = registerSchema.parse(body);
    const upi = upiId?.trim() || null;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // If user exists AND has a password, they already have a full account
    if (existingUser && existingUser.hashedPassword) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // If user exists but has NO password, they were invited — upgrade their account
    if (existingUser && !existingUser.hashedPassword) {
      const user = await prisma.user.update({
        where: { email },
        data: { name, hashedPassword, upiId: upi, upiDisplayName: upi ? name : null },
      });

      return NextResponse.json(
        { message: "Account created successfully", userId: user.id },
        { status: 201 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        upiId: upi,
        upiDisplayName: upi ? name : null,
      },
    });

    return NextResponse.json(
      { message: "Account created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Something went wrong", details: errMsg },
      { status: 500 }
    );
  }
}
