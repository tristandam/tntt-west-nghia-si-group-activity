import assert from "node:assert/strict";
import test from "node:test";
import {
  addSubmission,
  adjustPoints,
  applyAiRating,
  assignGroups,
  contentPoints,
  extendRound,
  leaderboard,
  playerPoints,
  rejectSubmission,
  setManualRating,
  speedBonus,
  startRound,
  SUBMISSION_GRACE_MS,
} from "./game";
import { parseRating } from "./ai";
import { selfSignup } from "./join";
import { displayName } from "./names";
import { playerView } from "./present";
import { emptyGame, type Player } from "./types";

function player(partial: Partial<Player> & Pick<Player, "id" | "firstName" | "lastName">): Player {
  return {
    tag: "",
    isLeader: false,
    avatarPath: null,
    claimToken: "token",
    checkedIn: true,
    archived: false,
    createdAt: partial.id,
    ...partial,
  };
}

test("a strong answer outscores a fast weak one", () => {
  assert.equal(contentPoints(1) + speedBonus(1), 3);
  assert.equal(contentPoints(4) + speedBonus(2), 11);
  assert.equal(contentPoints(null) + speedBonus(1), 2);
  assert.equal(speedBonus(6), 0);
});

test("a leftover single player joins the previous group", () => {
  const groups = assignGroups(["a", "b", "c", "d", "e"], 2);
  assert.deepEqual(groups, [
    ["a", "b"],
    ["c", "d", "e"],
  ]);
});

test("leaders sit out unless the next round includes them", () => {
  const data = emptyGame();
  data.settings.stage = "active";
  data.players = [
    player({ id: "1", firstName: "An", lastName: "Le" }),
    player({ id: "2", firstName: "Bo", lastName: "Le" }),
    player({ id: "3", firstName: "Chi", lastName: "Le", isLeader: true }),
  ];
  startRound(data, 1_000, () => 0);
  const grouped = data.groups.flatMap((group) => group.playerIds);
  assert.deepEqual(grouped.sort(), ["1", "2"]);
  data.settings.includeLeadersNextRound = true;
  startRound(data, 90_000, () => 0);
  const second = data.groups.filter((group) => group.roundId === data.rounds[1].id);
  assert.equal(second.flatMap((group) => group.playerIds).length, 3);
  assert.equal(data.settings.includeLeadersNextRound, false);
});

test("reject zeros a submission and a new one is scored by its own time", () => {
  const data = emptyGame();
  data.settings.stage = "active";
  data.settings.roundLengthSec = 100;
  data.players = [
    player({ id: "1", firstName: "An", lastName: "Le" }),
    player({ id: "2", firstName: "Bo", lastName: "Le" }),
    player({ id: "3", firstName: "Chi", lastName: "Le" }),
    player({ id: "4", firstName: "Dao", lastName: "Le" }),
  ];
  data.settings.nextGroupSize = 2;
  const round = startRound(data, 1_000, () => 0);
  const [first, second] = data.groups.filter((group) => group.roundId === round.id);
  data.submissions.push(
    {
      id: "s1",
      roundId: round.id,
      groupId: first.id,
      submittedBy: first.playerIds[0],
      phrase: "teeth",
      photoPath: "a.jpg",
      submittedAt: new Date(2_000).toISOString(),
      rejected: false,
      rating: null,
      comment: null,
      pointsEach: 10,
    },
    {
      id: "s2",
      roundId: round.id,
      groupId: second.id,
      submittedBy: second.playerIds[0],
      phrase: "nam",
      photoPath: "b.jpg",
      submittedAt: new Date(3_000).toISOString(),
      rejected: false,
      rating: null,
      comment: null,
      pointsEach: 8,
    },
  );
  rejectSubmission(data, "s1");
  assert.equal(data.submissions[0].pointsEach, 0);
  assert.equal(data.submissions[1].pointsEach, 2);
  data.submissions.push({
    id: "s3",
    roundId: round.id,
    groupId: first.id,
    submittedBy: first.playerIds[0],
    phrase: "younger sibling named Nam",
    photoPath: "c.jpg",
    submittedAt: new Date(4_000).toISOString(),
    rejected: false,
    rating: null,
    comment: null,
    pointsEach: 1,
  });
  rejectSubmission(data, "s2");
  applyAiRating(data, "s3", 4, "A specific family detail is a real find.");
  assert.equal(data.submissions[1].pointsEach, 0);
  assert.equal(data.submissions[2].pointsEach, 12);
  assert.equal(data.submissions[2].rating, 4);
  assert.equal(data.submissions[2].comment, "A specific family detail is a real find.");
  applyAiRating(data, "s3", 1, "should not replace the first rating");
  assert.equal(data.submissions[2].rating, 4);
});

test("a model reply becomes a label and a comment", () => {
  const parsed = parseRating('{"rating":2,"comment":"Pink is a real link, but it is pretty broad."}');
  assert.deepEqual(parsed, { rating: 2, comment: "Pink is a real link, but it is pretty broad." });
  assert.equal(parseRating("no json"), null);
});

test("blank duplicate names stay distinct", () => {
  const players = [
    player({ id: "a", firstName: "Jaden", lastName: "Nguyen", createdAt: "1", claimToken: null, checkedIn: false }),
    player({ id: "b", firstName: "Jaden", lastName: "Nguyen", createdAt: "2", claimToken: null, checkedIn: false }),
    player({
      id: "c",
      firstName: "Jaden",
      lastName: "Nguyen",
      tag: "An",
      createdAt: "3",
      claimToken: null,
      checkedIn: false,
    }),
  ];
  assert.equal(displayName(players[0], players), "Jaden Nguyen · 1");
  assert.equal(displayName(players[1], players), "Jaden Nguyen · 2");
  assert.equal(displayName(players[2], players), "Jaden Nguyen · An");
});

test("a player can add their own name during prep and claims a free match", () => {
  const data = emptyGame();
  data.players = [
    player({ id: "leader", firstName: "Chi", lastName: "Lê", isLeader: true, claimToken: null, checkedIn: false }),
    player({ id: "taken", firstName: "Mai", lastName: "Tran", claimToken: "busy", checkedIn: true }),
  ];

  const claimed = selfSignup(data, { firstName: "chi", lastName: "Le", token: "phone" });
  assert.equal(claimed.id, "leader");
  assert.equal(claimed.isLeader, true);
  assert.equal(claimed.checkedIn, true);
  assert.equal(data.players.length, 2);

  const added = selfSignup(data, { firstName: "Mai", lastName: "Tran", token: "other", now: "9" });
  assert.notEqual(added.id, "taken");
  assert.equal(added.isLeader, false);
  assert.equal(added.claimToken, "other");
  assert.equal(added.checkedIn, true);
  assert.equal(data.players.length, 3);

  data.settings.stage = "active";
  assert.throws(() => selfSignup(data, { firstName: "Bo", lastName: "Le", token: "late" }), /Ask a leader/);
});

test("extra time stacks, and a finished answer still scores just after the buzzer", () => {
  const data = emptyGame();
  data.settings.stage = "active";
  data.settings.roundLengthSec = 30;
  data.settings.nextGroupSize = 2;
  data.players = [
    player({ id: "1", firstName: "An", lastName: "Le" }),
    player({ id: "2", firstName: "Bo", lastName: "Le" }),
    player({ id: "3", firstName: "Chi", lastName: "Le" }),
    player({ id: "4", firstName: "Dao", lastName: "Le" }),
  ];
  const round = startRound(data, 1_000, () => 0);
  const ends = Date.parse(round.endsAt);
  extendRound(data, 5_000);
  extendRound(data, 5_000);
  assert.equal(Date.parse(round.endsAt) - ends, 60_000);

  const expired = Date.parse(round.endsAt);
  extendRound(data, expired + 1_000);
  assert.equal(Date.parse(round.endsAt), expired + 1_000 + 30_000);
  assert.throws(() => extendRound(data, Date.parse(round.endsAt) + SUBMISSION_GRACE_MS), /already closed/);

  const first = startRound(data, Date.parse(round.endsAt) + 1_000, () => 0);
  const buzzer = Date.parse(first.endsAt);
  const groups = data.groups.filter((item) => item.roundId === first.id);
  const saved = addSubmission(data, {
    round: first,
    group: groups[0],
    playerId: groups[0].playerIds[0],
    phrase: "both like pho",
    photoPath: "a.jpg",
    now: buzzer + 1_000,
  });
  assert.equal(saved.pointsEach, 2);
  assert.throws(
    () =>
      addSubmission(data, {
        round: first,
        group: groups[1],
        playerId: groups[1].playerIds[0],
        phrase: "too late",
        photoPath: "b.jpg",
        now: buzzer + SUBMISSION_GRACE_MS + 1,
      }),
    /closed/,
  );
});

test("a manual adjustment adds to the score and a deduct can go below it", () => {
  const data = emptyGame();
  data.settings.stage = "active";
  data.settings.nextGroupSize = 2;
  data.players = [
    player({ id: "1", firstName: "An", lastName: "Le" }),
    player({ id: "2", firstName: "Bo", lastName: "Le" }),
  ];
  const round = startRound(data, 1_000, () => 0);
  const group = data.groups[0];
  addSubmission(data, {
    round,
    group,
    playerId: group.playerIds[0],
    phrase: "both like pho",
    photoPath: "a.jpg",
    now: 2_000,
  });
  adjustPoints(data, group.playerIds[0], 3);
  assert.equal(playerPoints(data, group.playerIds[0]), 5);
  adjustPoints(data, group.playerIds[0], -20);
  assert.equal(playerPoints(data, group.playerIds[0]), -15);
  assert.equal(leaderboard(data).some((row) => row.points === -15), true);
  assert.throws(() => adjustPoints(data, group.playerIds[0], 0), /number/);
  assert.throws(() => adjustPoints(data, group.playerIds[0], 101), /100/);
});

test("scores and comments stay hidden until the round ends", () => {
  const data = emptyGame();
  data.settings.stage = "active";
  data.settings.roundLengthSec = 30;
  data.settings.nextGroupSize = 2;
  data.players = [
    player({ id: "1", firstName: "An", lastName: "Le" }),
    player({ id: "2", firstName: "Bo", lastName: "Le" }),
  ];
  const round = startRound(data, 1_000, () => 0);
  const group = data.groups[0];
  const me = data.players.find((item) => item.id === group.playerIds[0]);
  if (!me) throw new Error("missing player");
  const saved = addSubmission(data, {
    round,
    group,
    playerId: me.id,
    phrase: "both like pho",
    photoPath: "a.jpg",
    now: 2_000,
  });
  applyAiRating(data, saved.id, 4, "A specific shared detail.");
  const during = playerView(data, me, 3_000);
  assert.equal(during.submissions[0]?.revealed, false);
  assert.equal(during.submissions[0]?.comment, null);
  assert.equal(during.submissions[0]?.rating, null);
  assert.equal(during.submissions[0]?.pointsEach, 0);
  assert.equal(during.score.points, 0);
  const after = playerView(data, me, Date.parse(round.endsAt) + 1);
  assert.equal(after.submissions[0]?.revealed, true);
  assert.equal(after.submissions[0]?.pointsEach, 12);
  assert.equal(after.submissions[0]?.comment, "A specific shared detail.");
  assert.equal(after.score.points, 12);
});

test("a leader can set the score when the model did not", () => {
  const data = emptyGame();
  data.settings.stage = "active";
  data.settings.nextGroupSize = 2;
  data.players = [
    player({ id: "1", firstName: "An", lastName: "Le" }),
    player({ id: "2", firstName: "Bo", lastName: "Le" }),
  ];
  const round = startRound(data, 1_000, () => 0);
  const group = data.groups[0];
  const saved = addSubmission(data, {
    round,
    group,
    playerId: group.playerIds[0],
    phrase: "both like pho",
    photoPath: "a.jpg",
    now: 2_000,
  });
  setManualRating(data, saved.id, 3);
  assert.equal(saved.rating, 3);
  assert.equal(saved.pointsEach, 9);
  assert.equal(saved.comment, "Scored by a leader.");
  applyAiRating(data, saved.id, 1, "should not replace a leader score");
  assert.equal(saved.rating, 3);
  setManualRating(data, saved.id, 1);
  assert.equal(saved.rating, 1);
  assert.equal(saved.pointsEach, 3);
});
