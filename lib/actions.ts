import { closeExpiredRound, startRound } from "./game";
import { deleteAllPhotos } from "./photos";
import { newToken } from "./session";
import { updateGame } from "./store";
import { emptyGame, type Player, type Stage } from "./types";

function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
}

export async function claimPlayer(playerId: string) {
  const token = newToken();
  const player = await updateGame((data) => {
    const found = data.players.find((item) => item.id === playerId && !item.archived);
    if (!found) throw new Error("That name is not on the roster.");
    if (found.claimToken) throw new Error("That name is already claimed on another phone.");
    found.claimToken = token;
    found.checkedIn = true;
    return found;
  });
  return { player, token };
}

export async function releaseOwnClaim(playerId: string) {
  await updateGame((data) => {
    const found = data.players.find((item) => item.id === playerId);
    if (!found) return;
    found.claimToken = null;
    found.checkedIn = false;
  });
}

export async function addPlayer(input: Record<string, unknown>) {
  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  if (!firstName || !lastName) throw new Error("Enter a first and last name.");
  return updateGame((data) => {
    const player: Player = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      tag: cleanName(input.tag),
      isLeader: Boolean(input.isLeader),
      avatarPath: null,
      claimToken: null,
      checkedIn: false,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    data.players.push(player);
    return player.id;
  });
}

export async function updatePlayer(playerId: string, input: Record<string, unknown>) {
  const firstName = cleanName(input.firstName);
  const lastName = cleanName(input.lastName);
  if (!firstName || !lastName) throw new Error("Enter a first and last name.");
  await updateGame((data) => {
    const player = data.players.find((item) => item.id === playerId && !item.archived);
    if (!player) throw new Error("Player not found.");
    player.firstName = firstName;
    player.lastName = lastName;
    player.tag = cleanName(input.tag);
    player.isLeader = Boolean(input.isLeader);
  });
}

export async function archivePlayer(playerId: string) {
  await updateGame((data) => {
    const player = data.players.find((item) => item.id === playerId);
    if (!player) throw new Error("Player not found.");
    player.archived = true;
    player.checkedIn = false;
    player.claimToken = null;
  });
}

export async function releasePlayer(playerId: string) {
  await updateGame((data) => {
    const player = data.players.find((item) => item.id === playerId);
    if (!player) throw new Error("Player not found.");
    player.claimToken = null;
    player.checkedIn = false;
  });
}

export async function setAvatar(playerId: string, avatarPath: string) {
  await updateGame((data) => {
    const player = data.players.find((item) => item.id === playerId && !item.archived);
    if (!player) throw new Error("Player not found.");
    player.avatarPath = avatarPath;
  });
}

export async function saveSettings(input: Record<string, unknown>) {
  const roundLengthSec = Math.min(180, Math.max(20, Number(input.roundLengthSec) || 65));
  const breakSec = Math.min(120, Math.max(0, Number(input.breakSec) || 0));
  const size = input.nextGroupSize == null || input.nextGroupSize === "" ? null : Number(input.nextGroupSize);
  await updateGame((data) => {
    data.settings.roundLengthSec = roundLengthSec;
    data.settings.breakSec = breakSec;
    data.settings.nextGroupSize = size && size >= 2 && size <= 12 ? size : null;
    data.settings.includeLeadersNextRound = Boolean(input.includeLeadersNextRound);
  });
}

export async function setStage(stage: Stage) {
  await updateGame((data) => {
    data.settings.stage = stage;
    if (stage !== "active") closeExpiredRound(data, Date.now());
    const round = data.rounds[data.rounds.length - 1];
    if (round && stage !== "active") round.status = "ended";
  });
}

export async function beginRound() {
  return updateGame((data) => startRound(data, Date.now(), Math.random));
}

export async function resetSession() {
  await deleteAllPhotos();
  await updateGame((data) => {
    const players = data.players
      .filter((player) => !player.archived)
      .map((player) => ({
        ...player,
        avatarPath: null,
        claimToken: null,
        checkedIn: false,
      }));
    const next = emptyGame();
    next.settings.roundLengthSec = data.settings.roundLengthSec;
    next.settings.breakSec = data.settings.breakSec;
    next.players = players;
    data.settings = next.settings;
    data.players = next.players;
    data.rounds = [];
    data.groups = [];
    data.submissions = [];
  });
}

export async function wipePhotos() {
  await deleteAllPhotos();
  await updateGame((data) => {
    for (const player of data.players) player.avatarPath = null;
    for (const submission of data.submissions) submission.photoPath = "";
  });
}
