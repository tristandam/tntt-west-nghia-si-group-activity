import {
  currentRound,
  groupForPlayer,
  isRoundOpen,
  leaderboard,
  playerPoints,
  pointAdjustment,
  liveRound,
  publicPlayer,
  ratingLabel,
  roundRank,
} from "./game";
import { displayName } from "./names";
import type { GameData, Player } from "./types";

function members(data: GameData, playerIds: string[]) {
  return playerIds.map((id) => {
    const player = data.players.find((item) => item.id === id);
    if (!player) return { id, name: "Removed", avatarPath: null as string | null, isLeader: false };
    return {
      id,
      name: displayName(player, data.players),
      avatarPath: player.avatarPath,
      isLeader: player.isLeader,
    };
  });
}

export function presentSubmission(data: GameData, submissionId: string) {
  const submission = data.submissions.find((item) => item.id === submissionId);
  if (!submission) return null;
  const group = data.groups.find((item) => item.id === submission.groupId);
  const round = data.rounds.find((item) => item.id === submission.roundId);
  return {
    id: submission.id,
    roundNumber: round?.number ?? 0,
    groupNumber: group?.number ?? 0,
    groupSize: group?.playerIds.length ?? 0,
    phrase: submission.phrase,
    photoPath: submission.photoPath,
    submittedAt: submission.submittedAt,
    rejected: submission.rejected,
    rating: submission.rating,
    label: ratingLabel(submission.rating),
    comment: submission.comment ?? null,
    pointsEach: submission.pointsEach,
    place: roundRank(data, submission),
    revealed: true,
    members: members(data, group?.playerIds ?? []),
  };
}

function shown<T extends { rating: 1 | 2 | 3 | 4 | null; label: string | null; comment: string | null; pointsEach: number; place: number | null; revealed: boolean }>(
  view: T,
  reveal: boolean,
): T {
  if (reveal) return view;
  return { ...view, revealed: false, rating: null, label: null, comment: null, pointsEach: 0, place: null };
}

export function boardView(data: GameData, now: number, concealOpenRound = true) {
  const round = currentRound(data, now);
  const hiddenRoundId = concealOpenRound && round && isRoundOpen(round, now) ? round.id : null;
  const scores = leaderboard(data, hiddenRoundId).map((row) => ({
    rank: row.rank,
    points: row.points,
    ...publicPlayer(row.player, data.players),
  }));
  const selfies = [...data.submissions]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((submission) => {
      const view = presentSubmission(data, submission.id);
      return view ? shown(view, submission.roundId !== hiddenRoundId) : null;
    })
    .filter((item) => item != null);
  return { scores, selfies, stage: data.settings.stage, roundOpen: Boolean(hiddenRoundId) };
}

export function playerView(data: GameData, me: Player | null, now: number) {
  const round = currentRound(data, now);
  const open = round ? isRoundOpen(round, now) : false;
  const group = me && round ? groupForPlayer(data, round.id, me.id) : null;
  const hiddenRoundId = open && round ? round.id : null;
  const scores = leaderboard(data, hiddenRoundId);
  const submissions = group
    ? data.submissions
        .filter((submission) => submission.groupId === group.id)
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
        .map((submission) => {
          const view = presentSubmission(data, submission.id);
          return view ? shown(view, !open) : null;
        })
        .filter((item) => item != null)
    : [];
  const mine = scores.find((row) => row.player.id === me?.id);
  return {
    stage: data.settings.stage,
    me: me ? publicPlayer(me, data.players) : null,
    roster: data.players.filter((player) => !player.archived).map((player) => publicPlayer(player, data.players)),
    checkedIn: data.players.filter((player) => !player.archived && player.checkedIn).length,
    round: round
      ? {
          id: round.id,
          number: round.number,
          endsAt: round.endsAt,
          open,
          secondsLeft: open ? Math.max(0, Math.ceil((Date.parse(round.endsAt) - now) / 1000)) : 0,
          group: group
            ? { number: group.number, members: members(data, group.playerIds) }
            : null,
        }
      : null,
    submissions,
    score: mine ? { rank: mine.rank, points: mine.points } : { rank: null, points: 0 },
    breakSec: data.settings.breakSec,
    leaders: scores.slice(0, 5).map((row) => ({
      rank: row.rank,
      points: row.points,
      name: publicPlayer(row.player, data.players).name,
    })),
  };
}

export function adminView(data: GameData, now: number) {
  const round = liveRound(data, now) ?? currentRound(data, now);
  return {
    settings: data.settings,
    counts: {
      roster: data.players.filter((player) => !player.archived).length,
      checkedIn: data.players.filter((player) => !player.archived && player.checkedIn).length,
      rounds: data.rounds.length,
    },
    roster: data.players
      .filter((player) => !player.archived)
      .map((player) => ({
        ...publicPlayer(player, data.players),
        points: playerPoints(data, player.id),
        adjustment: pointAdjustment(player),
      })),
    round: round
      ? {
          number: round.number,
          endsAt: round.endsAt,
          open: isRoundOpen(round, now),
          secondsLeft: isRoundOpen(round, now)
            ? Math.max(0, Math.ceil((Date.parse(round.endsAt) - now) / 1000))
            : 0,
          startedAt: round.startedAt,
          groups: data.groups
            .filter((group) => group.roundId === round.id)
            .map((group) => ({
              number: group.number,
              members: members(data, group.playerIds),
              submissions: data.submissions
                .filter((submission) => submission.groupId === group.id)
                .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
                .map((submission) => presentSubmission(data, submission.id)),
            })),
        }
      : null,
    board: boardView(data, now, false),
  };
}

