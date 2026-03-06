import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL || "NOT_SET";
  const authToken = process.env.TURSO_AUTH_TOKEN || "NOT_SET";

  try {
    // Test 1: Direct libsql client
    const client = createClient({ url, authToken });
    const result = await client.execute("SELECT COUNT(*) as cnt FROM User");
    
    return NextResponse.json({
      status: "libsql_works",
      userCount: result.rows[0]?.cnt,
      url: url.substring(0, 30),
    });
  } catch (e1) {
    const err1 = e1 instanceof Error ? e1.message : String(e1);
    
    try {
      // Test 2: Try with PrismaLibSql
      const { PrismaLibSql } = await import("@prisma/adapter-libsql");
      const { PrismaClient } = await import("@prisma/client");
      const adapter = new PrismaLibSql({ url, authToken });
      const prisma = new PrismaClient({ adapter });
      const count = await prisma.user.count();
      
      return NextResponse.json({
        status: "prisma_works",
        userCount: count,
      });
    } catch (e2) {
      const err2 = e2 instanceof Error ? e2.message : String(e2);
      return NextResponse.json({
        status: "both_failed",
        libsqlError: err1,
        prismaError: err2,
        url: url.substring(0, 30),
        tokenLen: authToken.length,
      });
    }
  }
}
