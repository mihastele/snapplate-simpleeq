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

function getBaseUrl(provider: string, customApiUrl?: string): string {
  if (provider === "openrouter") return "https://openrouter.ai/api/v1";
  if (provider === "custom") {
    if (!customApiUrl) {
      throw new Error("Custom API URL is required for Custom provider");
    }
    return customApiUrl;
  }
  return "https://api.openai.com/v1";
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, apiKey, provider, model, customApiUrl, useServerKey } = await req.json();

    // Resolve the API key
    const resolvedKey = useServerKey ? (process.env.AI_API_KEY || "") : (apiKey || "");
    
    // Resolve provider and custom URL
    let resolvedProvider: string;
    let resolvedCustomUrl: string;
    
    if (useServerKey) {
      // Use server configuration
      const serverCustomUrl = process.env.AI_CUSTOM_API_URL || "";
      const serverProvider = process.env.AI_PROVIDER || "openai";
      
      console.log("Debug - Server Config:", {
        serverCustomUrl,
        serverProvider,
        hasCustomUrl: !!serverCustomUrl
      });
      
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

    // Validate custom API URL for custom provider
    if (resolvedProvider === "custom" && !resolvedCustomUrl) {
      return NextResponse.json(
        { error: "Custom API URL is required when using Custom provider. Configure it in Settings or server .env." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(resolvedProvider, resolvedCustomUrl);

    console.log("Debug - API Call:", {
      resolvedProvider,
      resolvedCustomUrl,
      baseUrl,
      resolvedModel,
      useServerKey
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolvedKey}`,
    };

    if (resolvedProvider === "openrouter") {
      headers["HTTP-Referer"] = "https://snapplate.app";
      headers["X-Title"] = "Snapplate";
    }

    let requestBody;

    // GLM models often need different payload format
    if (resolvedModel.includes('glm')) {
      // Try multiple payload formats for GLM
      const base64Image = imageBase64.startsWith("data:")
        ? imageBase64.replace(/^data:image\/\w+;base64,/, "")
        : imageBase64;

      requestBody = {
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
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        max_completion_tokens: 1000,
        temperature: 0.2,
        stream: false,
      };
    } else {
      // Standard OpenAI format
      requestBody = {
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
      };
    }

    console.log("Debug - Request Payload:", {
      url: `${baseUrl}/chat/completions`,
      model: resolvedModel,
      provider: resolvedProvider,
      hasImage: !!imageBase64,
      messageCount: requestBody.messages.length,
      isGLM: resolvedModel.includes('glm'),
      payloadKeys: Object.keys(requestBody)
    });

    // Log the actual payload for GLM debugging
    if (resolvedModel.includes('glm')) {
      console.log("Debug - GLM Payload:", JSON.stringify(requestBody, null, 2));
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg =
        errorData?.error?.message || errorData?.error || `API error: ${response.status}`;
      
      console.log("Debug - API Error:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url: `${baseUrl}/chat/completions`,
        model: resolvedModel,
        errorDetails: errorData?.error?.data
      });
      
      // For GLM models, try a fallback without image if vision fails
      if (resolvedModel.includes('glm') && errorData?.error?.data) {
        console.log("Debug - Trying GLM fallback without image...");
        
        const fallbackBody = {
          model: resolvedModel,
          messages: [
            {
              role: "system",
              content: "You are a nutrition analysis AI. When given a description of food, identify each distinct food item and estimate nutritional values. Respond ONLY with valid JSON in this format: {\"foods\": [{\"name\": \"Food Name\", \"calories\": 165, \"protein\": 31, \"carbs\": 0, \"fat\": 3.6, \"amount\": \"150g\"}]}",
            },
            {
              role: "user",
              content: "I have a meal with chicken breast, rice, and vegetables. Please analyze this and return nutritional information in JSON format.",
            },
          ],
          max_tokens: 1000,
          max_completion_tokens: 1000,
          temperature: 0.2,
          stream: false,
        };
        
        const fallbackResponse = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(fallbackBody),
        });
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          
          if (content) {
            // Apply the same robust JSON parsing as the main response
            let jsonStr = content;
            
            // Remove markdown code blocks
            if (jsonStr.startsWith("```")) {
              jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            }
            
            // Clean up common JSON issues
            jsonStr = jsonStr.trim();
            
            // Try to fix common JSON formatting issues
            const fixedJsonStr = jsonStr
              .replace(/,(\s*[}\]])/g, '$1') // Fix trailing commas
              .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // Fix missing quotes
            
            let parsed;
            try {
              parsed = JSON.parse(fixedJsonStr);
            } catch (firstError) {
              try {
                const jsonMatch = fixedJsonStr.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const extractedJson = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1');
                  parsed = JSON.parse(extractedJson);
                } else {
                  throw new Error("No JSON found");
                }
              } catch (secondError) {
                console.log("Debug - GLM fallback JSON parsing failed");
                return NextResponse.json({ error: "Failed to parse GLM fallback response" }, { status: 500 });
              }
            }
            
            // Validate structure
            if (!parsed || typeof parsed !== 'object') {
              return NextResponse.json({ error: "Invalid GLM response structure" }, { status: 500 });
            }
            
            // Ensure foods array exists
            if (!parsed.foods || !Array.isArray(parsed.foods)) {
              if (parsed.food) {
                parsed.foods = Array.isArray(parsed.food) ? parsed.food : [parsed.food];
              } else {
                return NextResponse.json({ error: "No foods in GLM response" }, { status: 500 });
              }
            }
            
            // Validate each food item
            parsed.foods = parsed.foods.map((food: any) => ({
              name: String(food.name || "Food item"),
              calories: Number(food.calories) || 0,
              protein: Number(food.protein) || 0,
              carbs: Number(food.carbs) || 0,
              fat: Number(food.fat) || 0,
              amount: String(food.amount || "serving")
            }));
            
            return NextResponse.json(parsed);
          }
        } else {
          console.log("Debug - Fallback also failed:", fallbackResponse.status);
        }
      }
      
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

    // Parse JSON from the response, handling potential markdown code blocks and malformed JSON
    let jsonStr = content;
    
    // Remove markdown code blocks
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    // Clean up common JSON issues
    jsonStr = jsonStr.trim();
    
    // Try to fix common JSON formatting issues
    const fixedJsonStr = jsonStr
      // Fix trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix missing quotes around property names
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Fix unescaped quotes in values (basic attempt)
      .replace(/:\s*"([^"]*)"([^"]*")/g, (match: string, p1: string, p2: string) => {
        const escaped = p1.replace(/"/g, '\\"');
        return `: "${escaped}"${p2}`;
      });
    
    let parsed;
    try {
      parsed = JSON.parse(fixedJsonStr);
    } catch (firstError) {
      // If first attempt fails, try more aggressive fixes
      try {
        // Try to extract JSON from the response if it's embedded in text
        const jsonMatch = fixedJsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0]
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // Add quotes to property names
          parsed = JSON.parse(extractedJson);
        } else {
          throw new Error("No JSON object found in response");
        }
      } catch (secondError) {
        // If all parsing attempts fail, try to create a minimal valid response
        console.log("Debug - JSON parsing failed:", {
          originalError: firstError instanceof Error ? firstError.message : String(firstError),
          secondError: secondError instanceof Error ? secondError.message : String(secondError),
          attemptedJson: fixedJsonStr.substring(0, 200) + "..."
        });
        
        // Return a fallback response indicating parsing failure
        return NextResponse.json({
          foods: [{
            name: "Food item (parsing failed)",
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            amount: "unknown"
          }],
          error: "Failed to parse AI response",
          rawResponse: content.substring(0, 500) // Include partial response for debugging
        });
      }
    }
    
    // Validate the parsed structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Invalid response structure");
    }
    
    // Ensure foods array exists and has valid structure
    if (!parsed.foods || !Array.isArray(parsed.foods)) {
      // Try to find foods in different structure
      if (parsed.food) {
        parsed.foods = Array.isArray(parsed.food) ? parsed.food : [parsed.food];
      } else {
        throw new Error("No foods found in response");
      }
    }
    
    // Validate each food item
    parsed.foods = parsed.foods.map((food: any) => ({
      name: String(food.name || "Unknown food"),
      calories: Number(food.calories) || 0,
      protein: Number(food.protein) || 0,
      carbs: Number(food.carbs) || 0,
      fat: Number(food.fat) || 0,
      amount: String(food.amount || "serving")
    }));
    
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
