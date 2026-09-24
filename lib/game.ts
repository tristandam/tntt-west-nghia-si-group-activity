import { displayName } from "./names";
import {
  RATING_LABELS,
  type GameData,
  type Group,
  type Player,
  type Rating,
  type Round,
  type Submission,
} from "./types";

export function pointsForPlace(place: number) {
  return [10, 8, 6, 4, 2][place - 1] ?? 1;
}

export function isRoundOpen(round: Round, now: number) {
  return round.status === "active" && Date.parse(round.endsAt) > now;
}

export function currentRound(data: GameData, now: number) {
  const round = data.rounds[data.rounds.length - 1];
  if (!round) return null;
  return round;
}

export function liveRound(data: GameData, now: number) {
  const round = data.rounds[data.rounds.length - 1];
  if (!round || !isRoundOpen(round, now)) return null;
  return round;
}

export function eligiblePlayers(data: GameData) {
  return data.players.filter(
    (player) =>
      !player.archived &&
      player.checkedIn &&
      (!player.isLeader || data.settings.includeLeadersNextRound),
  );
}

export function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function assignGroups(ids: string[], size: number) {
  if (ids.length < 2) {
    throw new Error("At least two checked-in players are needed to start a round.");
  }
  const target = Math.min(Math.max(2, size), Math.min(12, ids.length));
  const groups: string[][] = [];
  for (let i = 0; i < ids.length; i += target) {
    groups.push(ids.slice(i, i + target));
  }
  if (groups.length > 1 && groups[groups.length - 1].length < 2) {
    const leftover = groups.pop() ?? [];
    groups[groups.length - 1].push(...leftover);
  }
  return groups;
}

export function closeExpiredRound(data: GameData, now: number) {
  const round = data.rounds[data.rounds.length - 1];
  if (round && round.status === "active" && Date.parse(round.endsAt) <= now) {
    round.status = "ended";
  }
}

export function recalcRound(data: GameData, roundId: string) {
  const active = data.submissions
    .filter((submission) => submission.roundId === roundId && !submission.rejected)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id));
  active.forEach((submission, index) => {
    submission.pointsEach = pointsForPlace(index + 1);
  });
  for (const submission of data.submissions) {
    if (submission.roundId === roundId && submission.rejected) submission.pointsEach = 0;
  }
}

export function startRound(data: GameData, now: number, random: () => number) {
  closeExpiredRound(data, now);
  if (data.settings.stage !== "active") {
    throw new Error("Switch the game to Active before starting a round.");
  }
  const running = data.rounds[data.rounds.length - 1];
  if (running && isRoundOpen(running, now)) {
    throw new Error("A round is already running.");
  }
  const players = shuffle(eligiblePlayers(data), random);
  if (players.length < 2) {
    throw new Error("At least two checked-in players are needed to start a round.");
  }
  const fixed = data.settings.nextGroupSize;
  const target =
    fixed == null
      ? 2 + Math.floor(random() * Math.min(11, players.length - 1))
      : Math.min(12, Math.max(2, fixed));
  const chunks = assignGroups(
    players.map((player) => player.id),
    target,
  );
  const round: Round = {
    id: crypto.randomUUID(),
    number: data.rounds.length + 1,
    startedAt: new Date(now).toISOString(),
    endsAt: new Date(now + data.settings.roundLengthSec * 1000).toISOString(),
    status: "active",
    sizeMode: fixed == null ? "random" : "fixed",
    targetSize: target,
  };
  data.rounds.push(round);
  chunks.forEach((playerIds, index) => {
    data.groups.push({
      id: crypto.randomUUID(),
      roundId: round.id,
      number: index + 1,
      playerIds,
    });
  });
  data.settings.nextGroupSize = null;
  data.settings.includeLeadersNextRound = false;
  return round;
}

export function groupForPlayer(data: GameData, roundId: string, playerId: string) {
  return data.groups.find(
    (group) => group.roundId === roundId && group.playerIds.includes(playerId),
  );
}

export function activeSubmission(data: GameData, groupId: string) {
  return data.submissions.find((submission) => submission.groupId === groupId && !submission.rejected);
}

export function addSubmission(
  data: GameData,
  input: {
    round: Round;
    group: Group;
    playerId: string;
    phrase: string;
    photoPath: string;
    now: number;
  },
) {
  if (data.settings.stage !== "active") throw new Error("The game is not accepting submissions.");
  if (!isRoundOpen(input.round, input.now)) throw new Error("This round is closed.");
  if (!input.group.playerIds.includes(input.playerId)) {
    throw new Error("You are not in this group.");
  }
  const phrase = input.phrase.trim().replace(/\s+/g, " ");
  if (!phrase) throw new Error("Enter one thing you all have in common.");
  if (phrase.length > 80) throw new Error("Keep it to 80 characters.");
  if (activeSubmission(data, input.group.id)) {
    throw new Error("Your group already submitted.");
  }
  const submission: Submission = {
    id: crypto.randomUUID(),
    roundId: input.round.id,
    groupId: input.group.id,
    submittedBy: input.playerId,
    phrase,
    photoPath: input.photoPath,
    submittedAt: new Date(input.now).toISOString(),
    rejected: false,
    rating: null,
    pointsEach: 1,
  };
  data.submissions.push(submission);
  recalcRound(data, input.round.id);
  return submission;
}

export function rejectSubmission(data: GameData, submissionId: string) {
  const submission = data.submissions.find((item) => item.id === submissionId);
  if (!submission) throw new Error("Submission not found.");
  submission.rejected = true;
  submission.pointsEach = 0;
  recalcRound(data, submission.roundId);
  return submission;
}

export function rateSubmission(data: GameData, submissionId: string, rating: Rating) {
  const submission = data.submissions.find((item) => item.id === submissionId);
  if (!submission) throw new Error("Submission not found.");
  if (![1, 2, 3, 4].includes(rating)) throw new Error("Pick a rating.");
  submission.rating = rating;
  return submission;
}

export function playerPoints(data: GameData, playerId: string) {
  let total = 0;
  for (const group of data.groups) {
    if (!group.playerIds.includes(playerId)) continue;
    const submission = activeSubmission(data, group.id);
    total += submission?.pointsEach ?? 0;
  }
  return total;
}

export function leaderboard(data: GameData) {
  const rows = data.players
    .filter((player) => !player.archived)
    .map((player) => ({
      player,
      points: playerPoints(data, player.id),
    }))
    .filter((row) => row.points > 0 || data.groups.some((group) => group.playerIds.includes(row.player.id)))
    .sort(
      (a, b) =>
        b.points - a.points ||
        displayName(a.player, data.players).localeCompare(displayName(b.player, data.players)),
    );
  let rank = 0;
  let previous = Number.POSITIVE_INFINITY;
  return rows.map((row, index) => {
    if (row.points !== previous) rank = index + 1;
    previous = row.points;
    return { ...row, rank };
  });
}

export function roundRank(data: GameData, submission: Submission) {
  if (submission.rejected) return null;
  const ordered = data.submissions
    .filter((item) => item.roundId === submission.roundId && !item.rejected)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id));
  return ordered.findIndex((item) => item.id === submission.id) + 1;
}

export function publicPlayer(player: Player, players: Player[]) {
  return {
    id: player.id,
    name: displayName(player, players),
    firstName: player.firstName,
    lastName: player.lastName,
    tag: player.tag,
    isLeader: player.isLeader,
    avatarPath: player.avatarPath,
    checkedIn: player.checkedIn,
    claimed: Boolean(player.claimToken),
  };
}

export function ratingLabel(rating: Rating | null) {
  return rating ? RATING_LABELS[rating] : null;
}

export type PublicPlayer = ReturnType<typeof publicPlayer>;
