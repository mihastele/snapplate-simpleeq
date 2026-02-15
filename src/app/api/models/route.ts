import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider");
  const apiKey = req.nextUrl.searchParams.get("apiKey");
  const customApiUrl = req.nextUrl.searchParams.get("customApiUrl");
  const useServerKey = req.nextUrl.searchParams.get("useServerKey") === "true";

  const key = useServerKey ? (process.env.AI_API_KEY || "") : (apiKey || "");

  if (!key) {
    return NextResponse.json(
      { error: "API key is required to fetch models." },
      { status: 400 }
    );
  }

  try {
    if (provider === "openrouter") {
      return await fetchOpenRouterModels(key);
    } else {
      // Handle custom provider detection
      let resolvedProvider: string;
      let resolvedCustomUrl: string;
      
      if (useServerKey) {
        // Use server configuration
        const serverCustomUrl = process.env.AI_CUSTOM_API_URL || "";
        const serverProvider = process.env.AI_PROVIDER || "openai";
        
        if (serverCustomUrl) {
          // If custom URL is configured, use custom provider
          resolvedProvider = "custom";
          resolvedCustomUrl = serverCustomUrl;
        } else {
          // Otherwise use the configured provider
          resolvedProvider = serverProvider;
          resolvedCustomUrl = "";
        }
      } else {
        // Use client configuration
        resolvedProvider = provider || "openai";
        resolvedCustomUrl = customApiUrl || "";
      }
      
      if (resolvedProvider === "custom") {
        if (!resolvedCustomUrl) {
          return NextResponse.json(
            { error: "Custom API URL is required when using Custom provider. Configure it in Settings or server .env." },
            { status: 400 }
          );
        }
        return await fetchOpenAIModels(key, resolvedCustomUrl);
      } else if (resolvedProvider === "openrouter") {
        return await fetchOpenRouterModels(key);
      } else {
        return await fetchOpenAIModels(key);
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchOpenAIModels(apiKey: string, baseUrl: string = "https://api.openai.com/v1") {
  const res = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  const models = (data.data || [])
    .filter((m: { id: string }) => m.id.includes("gpt") || m.id.includes("o1") || m.id.includes("o3") || m.id.includes("o4"))
    .map((m: { id: string }) => ({ id: m.id, name: m.id }))
    .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));

  return NextResponse.json({ models });
}

async function fetchOpenRouterModels(apiKey: string) {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenRouter API error: ${res.status}`);
  }

  const data = await res.json();
  const models = (data.data || [])
    .filter((m: { id: string; name?: string }) => {
      const id = m.id.toLowerCase();
      return id.includes("vision") || id.includes("gpt-4") || id.includes("gemini") || id.includes("claude") || id.includes("llava") || id.includes("pixtral") || id.includes("qwen");
    })
    .map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name || m.id,
    }))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

  return NextResponse.json({ models });
}
