import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error("No text provided");
    }

    // Call Lovable AI to correct OCR errors
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a Handwritten Text Reconstruction AI.
Your input will be noisy OCR text extracted from messy cursive handwriting.
Perform the following improvements:

1️⃣ Restore broken & misrecognized words using context
2️⃣ Correct grammar, spelling, capitalization, and punctuation
3️⃣ Merge fragmented parts into meaningful, fluent sentences
4️⃣ Preserve original meaning as much as possible
5️⃣ Never output random unrelated words — if unsure, put [?]
6️⃣ Maintain the handwritten structure (spacing, bullets if visible)
7️⃣ Avoid adding explanations or comments. Output clean corrected text only.

Example:
Input: "Ho Tring fag thon nous Ras connie"
Output: "Hello, trying for those new concepts."

If the content appears like formulas or special symbols, keep them unchanged.`
          },
          {
            role: "user",
            content: `Correct the following OCR text extracted from handwritten/scanned document:\n\n${text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", error);
      throw new Error("Failed to correct text with AI");
    }

    const data = await response.json();
    const correctedText = data.choices[0]?.message?.content || text;

    return new Response(
      JSON.stringify({ correctedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
