import { after } from "next/server";
import { ratePhrase } from "./ai";
import { applyAiRating } from "./game";
import { readGame, updateGame } from "./store";

const inflight = new Set<string>();

export function scheduleRating(submissionId: string) {
  if (!process.env.GEMINI_API_KEY || inflight.has(submissionId)) return;
  inflight.add(submissionId);
  after(async () => {
    try {
      const data = await readGame();
      const submission = data.submissions.find((item) => item.id === submissionId);
      if (!submission || submission.rejected || submission.rating != null) return;
      const earlier = data.submissions
        .filter((item) => item.id !== submissionId && !item.rejected)
        .map((item) => item.phrase);
      const result = await ratePhrase(submission.phrase, earlier);
      await updateGame((draft) => {
        applyAiRating(draft, submissionId, result.rating, result.comment);
      });
    } catch (error) {
      console.error("AI rating failed", error);
    } finally {
      inflight.delete(submissionId);
    }
  });
}
