export type Stage = "prep" | "active" | "ended";

export type Rating = 1 | 2 | 3 | 4;

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  tag: string;
  isLeader: boolean;
  avatarPath: string | null;
  claimToken: string | null;
  checkedIn: boolean;
  archived: boolean;
  createdAt: string;
};

export type Settings = {
  stage: Stage;
  roundLengthSec: number;
  breakSec: number;
  nextGroupSize: number | null;
  includeLeadersNextRound: boolean;
};

export type Round = {
  id: string;
  number: number;
  startedAt: string;
  endsAt: string;
  status: "active" | "ended";
  sizeMode: "random" | "fixed";
  targetSize: number | null;
};

export type Group = {
  id: string;
  roundId: string;
  number: number;
  playerIds: string[];
};

export type Submission = {
  id: string;
  roundId: string;
  groupId: string;
  submittedBy: string;
  phrase: string;
  photoPath: string;
  submittedAt: string;
  rejected: boolean;
  rating: Rating | null;
  pointsEach: number;
};

export type GameData = {
  settings: Settings;
  players: Player[];
  rounds: Round[];
  groups: Group[];
  submissions: Submission[];
};

export const RATING_LABELS: Record<Rating, string> = {
  1: "Heard it before",
  2: "Playing it safe",
  3: "Decent find",
  4: "That's the one",
};

export function emptyGame(): GameData {
  return {
    settings: {
      stage: "prep",
      roundLengthSec: 65,
      breakSec: 10,
      nextGroupSize: null,
      includeLeadersNextRound: false,
    },
    players: [],
    rounds: [],
    groups: [],
    submissions: [],
  };
}
