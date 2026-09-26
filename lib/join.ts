import { fold, nameKey } from "./names";
import type { GameData, Player } from "./types";

export function selfSignup(
  data: GameData,
  input: { firstName: string; lastName: string; token: string; now?: string },
): Player {
  if (data.settings.stage !== "prep") throw new Error("Ask a leader to add you.");
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) throw new Error("Enter a first and last name.");

  const key = fold(`${firstName} ${lastName}`);
  const open = data.players
    .filter((player) => !player.archived && !player.claimToken && fold(nameKey(player)) === key)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0];
  if (open) {
    open.claimToken = input.token;
    open.checkedIn = true;
    return open;
  }

  const player: Player = {
    id: crypto.randomUUID(),
    firstName,
    lastName,
    tag: "",
    isLeader: false,
    avatarPath: null,
    claimToken: input.token,
    checkedIn: true,
    archived: false,
    createdAt: input.now ?? new Date().toISOString(),
  };
  data.players.push(player);
  return player;
}
