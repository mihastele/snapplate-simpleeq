import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a nutrition analysis AI. When given a photo of food, identify each distinct food item visible on the plate/image. For each item, estimate:
- name (string)
- calories (number, kcal)
- protein (number, grams)
- carbs (number, grams)  
- fat (number, grams)
- amount (string, e.g. "1 cup", "150g", "1 medium piece")

Be as accurate as possible with typical serving sizes visible in the image.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no markdown, no extra text:
{
  "foods": [
    {
      "name": "Grilled Chicken Breast",
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6,
      "amount": "150g"
    }
  ]
}`;

function getBaseUrl(provider: string): string {
  if (provider === "openrouter") return "https://openrouter.ai/api/v1";
  return "https://api.openai.com/v1";
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, apiKey, provider, model, useServerKey } = await req.json();

    // Resolve the API key
    const resolvedKey = useServerKey ? (process.env.AI_API_KEY || "") : (apiKey || "");
    const resolvedProvider = useServerKey && !provider
      ? (process.env.AI_PROVIDER || "openai")
      : (provider || "openai");
    const resolvedModel = model
      || (useServerKey ? process.env.AI_MODEL : null)
      || "gpt-4o";

    if (!resolvedKey) {
      return NextResponse.json(
        { error: "API key is required. Configure it in Settings or server .env." },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No image provided." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(resolvedProvider);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolvedKey}`,
    };

    if (resolvedProvider === "openrouter") {
      headers["HTTP-Referer"] = "https://snapplate.app";
      headers["X-Title"] = "Snapplate";
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this food image. Identify every food item and estimate its nutritional values. Return JSON only.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:")
                    ? imageBase64
                    : `data:image/jpeg;base64,${imageBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg =
        errorData?.error?.message || `API error: ${response.status}`;
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI model." },
        { status: 500 }
      );
    }

    // Parse JSON from the response, handling potential markdown code blocks
    let jsonStr = content;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
