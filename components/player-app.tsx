"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fold } from "@/lib/names";
import { ACTIVITY_TITLE, Card, Face, Shell, Stars, usePoll } from "./ui";

type Member = { id: string; name: string; avatarPath: string | null; isLeader: boolean };
type Submission = {
  id: string;
  phrase: string;
  photoPath: string;
  rejected: boolean;
  rating: 1 | 2 | 3 | 4 | null;
  label: string | null;
  pointsEach: number;
  place: number | null;
};
type State = {
  stage: "prep" | "active" | "ended";
  me: { id: string; name: string; avatarPath: string | null; checkedIn: boolean; isLeader: boolean } | null;
  roster: { id: string; name: string; avatarPath: string | null; claimed: boolean; isLeader: boolean; checkedIn: boolean }[];
  checkedIn: number;
  round: {
    number: number;
    open: boolean;
    secondsLeft: number;
    group: { number: number; members: Member[] } | null;
  } | null;
  submissions: Submission[];
  score: { rank: number | null; points: number };
  leaders: { rank: number; points: number; name: string }[];
};

const empty: State = {
  stage: "prep",
  me: null,
  roster: [],
  checkedIn: 0,
  round: null,
  submissions: [],
  score: { rank: null, points: 0 },
  leaders: [],
};

async function post(body: unknown) {
  const response = await fetch("/api/player", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Could not save.");
}

export function PlayerApp() {
  const { data, error, reload } = usePoll<State>("/api/player", empty);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [phrase, setPhrase] = useState("");
  const [notice, setNotice] = useState("");

  const names = useMemo(() => {
    const needle = fold(query.trim());
    return data.roster.filter((person) => !needle || fold(person.name).includes(needle));
  }, [data.roster, query]);

  async function run(label: string, task: () => Promise<void>) {
    setBusy(label);
    setNotice("");
    try {
      await task();
      await reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy("");
    }
  }

  const latest = data.submissions[data.submissions.length - 1];
  const canSubmit = Boolean(data.round?.open && data.round.group && (!latest || latest.rejected));

  return (
    <Shell
      title={ACTIVITY_TITLE}
      action={
        <Link className="rounded-full border border-white/15 px-3 py-2 text-sm" href="/board">
          Leaderboard
        </Link>
      }
    >
      {error || notice ? <p className="mb-3 text-sm font-medium text-[#8a3b2b]">{notice || error}</p> : null}

      {!data.me ? (
        <Card tone="yellow">
          <p className="text-[#6d5430]">Find your name. This phone stays signed in as you.</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names"
            className="mt-3 w-full rounded-2xl border border-[#e4c56a] bg-[#fffdf4] px-4 py-3 text-[#3f2a1c] placeholder:text-[#a18455]"
          />
          <div className="mt-3 grid gap-2">
            {names.map((person) => (
              <button
                key={person.id}
                disabled={person.claimed || busy === person.id}
                onClick={() => run(person.id, () => post({ action: "claim", playerId: person.id }))}
                className="flex items-center gap-3 rounded-2xl bg-[#f8e7a4] px-3 py-2 text-left disabled:opacity-40"
              >
                <Face name={person.name} path={person.avatarPath} />
                <span className="flex-1">
                  {person.name}
                  {person.isLeader ? <span className="ml-2 text-xs text-[#8a5a12]">Leader</span> : null}
                </span>
                <span className="text-sm text-[#6d5430]">{person.claimed ? "Taken" : "This is me"}</span>
              </button>
            ))}
            {data.roster.length === 0 ? <p className="text-[#6d5430]">Names will show up once a leader adds them.</p> : null}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card className="flex items-center gap-3">
            <Face name={data.me.name} path={data.me.avatarPath} size={56} />
            <div className="flex-1">
              <p className="font-semibold">{data.me.name}</p>
              <p className="text-sm text-[#cbbba4]">
                {data.score.rank ? `Rank ${data.score.rank} · ${data.score.points} pts` : `${data.score.points} pts`}
                {" · "}
                {data.checkedIn} checked in
              </p>
            </div>
            <button className="text-sm text-[#cbbba4]" onClick={() => run("release", () => post({ action: "release" }))}>
              Not me
            </button>
          </Card>

          {!data.me.avatarPath ? (
            <Card>
              <p className="font-medium">Add a face photo so your group can find you.</p>
              <label className="mt-3 block rounded-2xl bg-[#f0c56e] px-4 py-3 text-center font-semibold text-[#1a140c]">
                Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void run("avatar", async () => {
                      const form = new FormData();
                      form.set("kind", "avatar");
                      form.set("photo", file);
                      const response = await fetch("/api/player", { method: "PUT", body: form });
                      const body = (await response.json()) as { error?: string };
                      if (!response.ok) throw new Error(body.error || "Upload failed.");
                    });
                  }}
                />
              </label>
            </Card>
          ) : null}

          {data.stage === "prep" ? (
            <Card>
              <p className="text-lg font-semibold">You are in</p>
              <p className="mt-1 text-[#cbbba4]">Keep this page open. A leader will start the round, and your group will show up here.</p>
            </Card>
          ) : null}

          {data.stage === "ended" ? (
            <Card>
              <p className="text-sm text-[#d7b6ff]">Final</p>
              <p className="text-3xl font-semibold">{data.score.points} pts</p>
              <p className="text-[#cbbba4]">{data.score.rank ? `You finished rank ${data.score.rank}.` : "No score yet."}</p>
            </Card>
          ) : null}

          {data.stage === "active" && data.round?.open && data.round.group ? (
            <Card>
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">
                  Round {data.round.number} · Group {data.round.group.number}
                </p>
                <p className="text-2xl font-semibold text-[#f0c56e]">{data.round.secondsLeft}s</p>
              </div>
              <p className="mt-1 text-[#cbbba4]">Find these people and agree on one thing you all have in common.</p>
              <div className="mt-3 grid gap-2">
                {data.round.group.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-2">
                    <Face name={member.name} path={member.avatarPath} />
                    <span>{member.name}</span>
                  </div>
                ))}
              </div>
              {canSubmit ? (
                <form
                  className="mt-4 grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void run("submit", async () => {
                      form.set("kind", "submission");
                      const response = await fetch("/api/player", { method: "PUT", body: form });
                      const body = (await response.json()) as { error?: string };
                      if (!response.ok) throw new Error(body.error || "Upload failed.");
                      setPhrase("");
                    });
                  }}
                >
                  <input
                    name="phrase"
                    value={phrase}
                    onChange={(event) => setPhrase(event.target.value)}
                    maxLength={80}
                    required
                    placeholder="One thing you all have in common"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                  />
                  <input name="photo" type="file" accept="image/*" capture="environment" required className="text-sm" />
                  <button disabled={busy === "submit"} className="rounded-2xl bg-[#d7b6ff] px-4 py-3 font-semibold text-[#1a140c]">
                    Submit for the group
                  </button>
                </form>
              ) : null}
            </Card>
          ) : null}

          {data.stage === "active" && (!data.round || !data.round.open) ? (
            <Card>
              <p className="text-lg font-semibold">Hold tight</p>
              <p className="text-[#cbbba4]">The next round has not started. Keep this page open.</p>
            </Card>
          ) : null}

          {data.stage === "active" && data.round?.open && !data.round.group ? (
            <Card>
              <p className="text-lg font-semibold">{data.me.isLeader ? "Leaders are sitting this round out" : "This round already started"}</p>
              <p className="text-[#cbbba4]">
                {data.me.isLeader
                  ? "You'll play only if a leader includes leaders in the next round."
                  : "Stay on this page. You'll be placed in the next round."}
              </p>
            </Card>
          ) : null}

          {latest ? (
            <Card>
              <p className="text-sm text-[#cbbba4]">{latest.rejected ? "Rejected · 0 pts" : `${latest.pointsEach} pts each`}</p>
              <p className="text-2xl font-semibold">“{latest.phrase}”</p>
              <p className="mt-1">
                <Stars rating={latest.rating} /> {latest.label ?? "Waiting for a rating"}
              </p>
              {latest.rejected ? <p className="mt-2 text-[#ffb4a8]">A leader rejected this. Submit another before the round ends.</p> : null}
            </Card>
          ) : null}

          {data.leaders.length ? (
            <Card>
              <p className="mb-2 text-sm text-[#cbbba4]">Top scores</p>
              {data.leaders.map((row) => (
                <p key={`${row.rank}-${row.name}`} className="flex justify-between py-1">
                  <span>
                    {row.rank}. {row.name}
                  </span>
                  <span className="text-[#f0c56e]">{row.points}</span>
                </p>
              ))}
            </Card>
          ) : null}
        </div>
      )}
    </Shell>
  );
}
