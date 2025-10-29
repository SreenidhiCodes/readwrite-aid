const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function rebuildText(noisy) {
  const prompt = `
You are a Handwritten Text Reconstruction AI.
Fix the following messy OCR text.

Rules:
1. Correct grammar, spelling, and punctuation
2. Restore broken words using context
3. Make output meaningful
4. If unsure about a word, use [?]
5. Keep structure similar to handwriting
6. Output text only
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: noisy },
    ],
  });

  return res.choices[0].message.content;
}

module.exports = { rebuildText };
