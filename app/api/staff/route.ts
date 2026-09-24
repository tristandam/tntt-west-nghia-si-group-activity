import {
  addPlayer,
  archivePlayer,
  beginRound,
  releasePlayer,
  resetSession,
  saveSettings,
  setAvatar,
  setStage,
  updatePlayer,
  wipePhotos,
} from "@/lib/actions";
import { rateSubmission, rejectSubmission } from "@/lib/game";
import { clearCookie, fail, json, setStaffCookie, staffRoleForPassword, staffSession } from "@/lib/http";
import { savePhoto } from "@/lib/photos";
import { adminView, isRating, rateView } from "@/lib/present";
import { readGame, updateGame } from "@/lib/store";
import type { Stage } from "@/lib/types";

export async function GET() {
  const role = await staffSession();
  if (!role) return json({ role: null });
  const data = await readGame();
  const now = Date.now();
  if (role === "rater") return json({ role, ...rateView(data, now) });
  return json({ role, ...adminView(data, now), ratingDesk: rateView(data, now) });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const role = await staffSession();
      if (role !== "admin") return json({ error: "Admin only." }, 403);
      const form = await request.formData();
      const playerId = String(form.get("playerId") ?? "");
      const file = form.get("photo");
      if (!(file instanceof File) || file.size === 0) throw new Error("Choose a photo.");
      const stored = await savePhoto("avatars", playerId, file);
      await setAvatar(playerId, stored);
      return json({ ok: true });
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "login") {
      const role = staffRoleForPassword(String(body.password ?? ""));
      if (!role) return json({ error: "Wrong password." }, 401);
      return setStaffCookie(json({ role }), role);
    }
    if (body.action === "logout") return clearCookie(json({ ok: true }), "staff");

    const role = await staffSession();
    if (!role) return json({ error: "Sign in required." }, 401);

    if (body.action === "rate") {
      if (!isRating(body.rating)) throw new Error("Pick a rating.");
      const rating = body.rating;
      await updateGame((data) => rateSubmission(data, String(body.submissionId), rating));
      return json({ ok: true });
    }
    if (body.action === "reject") {
      await updateGame((data) => rejectSubmission(data, String(body.submissionId)));
      return json({ ok: true });
    }
    if (role !== "admin") return json({ error: "That password can only rate and reject." }, 403);

    if (body.action === "addPlayer") {
      const id = await addPlayer(body);
      return json({ id });
    }
    if (body.action === "updatePlayer") {
      await updatePlayer(String(body.playerId), body);
      return json({ ok: true });
    }
    if (body.action === "archivePlayer") {
      await archivePlayer(String(body.playerId));
      return json({ ok: true });
    }
    if (body.action === "releasePlayer") {
      await releasePlayer(String(body.playerId));
      return json({ ok: true });
    }
    if (body.action === "settings") {
      await saveSettings(body);
      return json({ ok: true });
    }
    if (body.action === "stage") {
      const stage = body.stage;
      if (stage !== "prep" && stage !== "active" && stage !== "ended") throw new Error("Unknown stage.");
      await setStage(stage as Stage);
      return json({ ok: true });
    }
    if (body.action === "startRound") {
      const round = await beginRound();
      return json({ number: round.number });
    }
    if (body.action === "reset") {
      if (body.confirm !== "RESET") throw new Error("Type RESET to clear the session.");
      await resetSession();
      return json({ ok: true });
    }
    if (body.action === "deletePhotos") {
      if (body.confirm !== "DELETE") throw new Error("Type DELETE to remove photos.");
      await wipePhotos();
      return json({ ok: true });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    return fail(error);
  }
}
