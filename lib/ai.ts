import { RATING_LABELS, type Rating } from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export function parseRating(raw: string): { rating: Rating; comment: string } | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: { rating?: unknown; comment?: unknown };
  try {
    parsed = JSON.parse(match[0]) as { rating?: unknown; comment?: unknown };
  } catch {
    return null;
  }
  const rating = Number(parsed.rating);
  const comment = String(parsed.comment ?? "").trim().replace(/\s+/g, " ");
  if (![1, 2, 3, 4].includes(rating) || !comment) return null;
  return { rating: rating as Rating, comment: comment.slice(0, 200) };
}

export async function ratePhrase(phrase: string, earlier: string[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");
  const prior = earlier
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(-30)
    .map((item) => `- ${item}`)
    .join("\n");
  const prompt = `Rate how original this answer is to "name one thing everyone in the group has in common."
Earlier answers this session:
${prior || "(none yet)"}

New answer: "${phrase}"

Use exactly one rating:
1 ${RATING_LABELS[1]} — true of almost anyone, or nearly the same as an earlier answer
2 ${RATING_LABELS[2]} — a real connection, but broad
3 ${RATING_LABELS[3]} — specific enough to be a real discovery
4 ${RATING_LABELS[4]} — surprising and specific to this group

Return only JSON like {"rating":2,"comment":"one short sentence"}.
The comment explains the rating in plain words. Do not mention points or stars.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 120,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini rating failed (${response.status}).`);
  }
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const parsed = parseRating(text);
  if (!parsed) throw new Error("Gemini returned an unreadable rating.");
  return parsed;
}
