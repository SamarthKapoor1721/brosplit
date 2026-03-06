import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL || "NOT_SET";
  const authToken = process.env.TURSO_AUTH_TOKEN || "NOT_SET";
  const results: Record<string, unknown> = {
    envCheck: {
      url: url.substring(0, 60),
      urlFull: url,
      tokenLen: authToken.length,
      tokenStart: authToken.substring(0, 20),
    },
  };

  // Test 1: Can we parse the URL with native URL?
  try {
    const parsed = new URL(url);
    results.nativeUrlParse = {
      ok: true,
      protocol: parsed.protocol,
      host: parsed.host,
      hostname: parsed.hostname,
    };
  } catch (e) {
    results.nativeUrlParse = { ok: false, error: String(e) };
  }

  // Test 2: Try createClient from @libsql/client
  try {
    const { createClient } = await import("@libsql/client");
    const client = createClient({ url, authToken });
    results.libsqlCreateClient = { ok: true };

    // Test 3: Try executing a query
    try {
      const result = await client.execute("SELECT 1 as test");
      results.libsqlQuery = { ok: true, rows: result.rows };
    } catch (e) {
      results.libsqlQuery = { ok: false, error: e instanceof Error ? { message: e.message, name: e.name, stack: e.stack?.split("\n").slice(0, 5) } : String(e) };
    }
  } catch (e) {
    results.libsqlCreateClient = { ok: false, error: e instanceof Error ? { message: e.message, name: e.name, stack: e.stack?.split("\n").slice(0, 5) } : String(e) };
  }

  // Test 4: Try PrismaClient with adapter
  try {
    const { PrismaLibSql } = await import("@prisma/adapter-libsql");
    const { PrismaClient } = await import("@prisma/client");
    const adapter = new PrismaLibSql({ url, authToken });
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.user.count();
    results.prisma = { ok: true, userCount: count };
  } catch (e) {
    results.prisma = { ok: false, error: e instanceof Error ? { message: e.message, name: e.name, stack: e.stack?.split("\n").slice(0, 5) } : String(e) };
  }

  return NextResponse.json(results);
}
