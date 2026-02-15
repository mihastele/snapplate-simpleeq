import { NextResponse } from "next/server";

export async function GET() {
  const provider = process.env.AI_PROVIDER || "";
  const apiKey = process.env.AI_API_KEY || "";
  const model = process.env.AI_MODEL || "";

  return NextResponse.json({
    hasServerKey: !!apiKey,
    serverProvider: provider || null,
    serverModel: model || null,
  });
}
