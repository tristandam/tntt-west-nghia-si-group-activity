import { addSubmission, groupForPlayer, liveRound } from "@/lib/game";
import { fail, json, playerSession, setPlayerCookie, clearCookie } from "@/lib/http";
import { playerView } from "@/lib/present";
import { savePhoto } from "@/lib/photos";
import { claimPlayer, releaseOwnClaim, setAvatar } from "@/lib/actions";
import { readGame, updateGame } from "@/lib/store";

export async function GET() {
  const data = await readGame();
  const me = await playerSession();
  return json(playerView(data, me, Date.now()));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string; playerId?: string };
    if (body.action === "claim") {
      const { player, token } = await claimPlayer(String(body.playerId ?? ""));
      return setPlayerCookie(json({ id: player.id }), player.id, token);
    }
    const me = await playerSession();
    if (!me) return json({ error: "Claim your name first." }, 401);
    if (body.action === "release") {
      await releaseOwnClaim(me.id);
      return clearCookie(json({ ok: true }), "player");
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("already claimed") ? 409 : 400;
    return fail(error, status);
  }
}

export async function PUT(request: Request) {
  try {
    const me = await playerSession();
    if (!me) return json({ error: "Claim your name first." }, 401);
    const form = await request.formData();
    const kind = String(form.get("kind") ?? "");
    const file = form.get("photo");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a photo.");
    if (kind === "avatar") {
      const stored = await savePhoto("avatars", me.id, file);
      await setAvatar(me.id, stored);
      return json({ ok: true });
    }
    if (kind === "submission") {
      const phrase = String(form.get("phrase") ?? "");
      const stored = await savePhoto("submissions", crypto.randomUUID(), file);
      await updateGame((data) => {
        const round = liveRound(data, Date.now());
        if (!round) throw new Error("This round is closed.");
        const group = groupForPlayer(data, round.id, me.id);
        if (!group) throw new Error("You are not in a group this round.");
        addSubmission(data, {
          round,
          group,
          playerId: me.id,
          phrase,
          photoPath: stored,
          now: Date.now(),
        });
      });
      return json({ ok: true });
    }
    return json({ error: "Unknown upload." }, 400);
  } catch (error) {
    return fail(error);
  }
}
