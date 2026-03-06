import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({
      status: "connected",
      userCount: count,
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      tursoUrlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 30) || "NOT SET",
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      tokenLength: process.env.TURSO_AUTH_TOKEN?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: "error",
      error: errMsg,
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      tursoUrlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 30) || "NOT SET",
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      tokenLength: process.env.TURSO_AUTH_TOKEN?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    });
  }
}
