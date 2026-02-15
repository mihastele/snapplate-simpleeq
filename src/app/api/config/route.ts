import { NextResponse } from "next/server";

export async function GET() {
  const provider = process.env.AI_PROVIDER || "";
  const apiKey = process.env.AI_API_KEY || "";
  const model = process.env.AI_MODEL || "";
  const customApiUrl = process.env.AI_CUSTOM_API_URL || "";

  // If custom URL is configured, report as custom provider
  const effectiveProvider = customApiUrl ? "custom" : provider;

  return NextResponse.json({
    hasServerKey: !!apiKey,
    serverProvider: effectiveProvider || null,
    serverModel: model || null,
    serverCustomApiUrl: customApiUrl || null,
  });
}
