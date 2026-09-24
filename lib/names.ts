import type { Player } from "./types";

export function nameKey(player: Pick<Player, "firstName" | "lastName">) {
  return `${player.firstName.trim().toLowerCase()} ${player.lastName.trim().toLowerCase()}`;
}

export function displayName(player: Player, players: Player[]) {
  const base = `${player.firstName.trim()} ${player.lastName.trim()}`.replace(/\s+/g, " ").trim();
  if (player.tag.trim()) return `${base} · ${player.tag.trim()}`;
  const twins = players
    .filter((other) => !other.archived && !other.tag.trim() && nameKey(other) === nameKey(player))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  if (twins.length <= 1) return base;
  const index = twins.findIndex((other) => other.id === player.id) + 1;
  return `${base} · ${index}`;
}

export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}
