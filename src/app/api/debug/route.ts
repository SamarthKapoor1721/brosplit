import { NextResponse } from "next/server";

export async function GET() {
  // Debug endpoint - only shows basic health status
  try {
    const { PrismaLibSql } = await import("@prisma/adapter-libsql");
    const { PrismaClient } = await import("@prisma/client");
    const url = (process.env.TURSO_DATABASE_URL || "").trim();
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
    const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url });
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.user.count();
    return NextResponse.json({ status: "ok", userCount: count });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
