import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is required. Add it in Settings." },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No image provided." },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a nutrition analysis AI. When given a photo of food, identify each distinct food item visible on the plate/image. For each item, estimate:
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
}`,
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
        errorData?.error?.message || `OpenAI API error: ${response.status}`;
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
