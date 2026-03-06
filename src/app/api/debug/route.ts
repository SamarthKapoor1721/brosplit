import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
    tursoUrlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 20) || "NOT SET",
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
    tokenLength: process.env.TURSO_AUTH_TOKEN?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  });
}
