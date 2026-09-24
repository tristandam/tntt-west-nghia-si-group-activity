import assert from "node:assert/strict";
import test from "node:test";
import { assignGroups, pointsForPlace, rateSubmission, rejectSubmission, startRound } from "./game";
import { displayName } from "./names";
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

test("points follow submission order and then stay at 1", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(pointsForPlace), [10, 8, 6, 4, 2, 1]);
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
      pointsEach: 8,
    },
  );
  rejectSubmission(data, "s1");
  assert.equal(data.submissions[0].pointsEach, 0);
  assert.equal(data.submissions[1].pointsEach, 10);
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
    pointsEach: 1,
  });
  rejectSubmission(data, "s2");
  rateSubmission(data, "s3", 4);
  assert.equal(data.submissions[1].pointsEach, 0);
  assert.equal(data.submissions[2].pointsEach, 10);
  assert.equal(data.submissions[2].rating, 4);
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
