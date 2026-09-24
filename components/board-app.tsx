"use client";

import { Card, Face, Shell, Stars, photoUrl, usePoll } from "./ui";

type Score = { rank: number; points: number; id: string; name: string; avatarPath: string | null };
type Selfie = {
  id: string;
  roundNumber: number;
  groupNumber: number;
  phrase: string;
  photoPath: string;
  rejected: boolean;
  rating: 1 | 2 | 3 | 4 | null;
  label: string | null;
  pointsEach: number;
  place: number | null;
  members: { id: string; name: string }[];
};
type State = { scores: Score[]; selfies: Selfie[]; stage: string };

export function BoardApp() {
  const { data, error } = usePoll<State>("/api/board", { scores: [], selfies: [], stage: "prep" });
  return (
    <Shell
      title={data.stage === "ended" ? "Final scores" : "Live board"}
      action={
        <a className="rounded-full border border-white/15 px-3 py-2 text-sm" href="/">
          My phone
        </a>
      }
    >
      {error ? <p className="mb-3 text-sm font-medium text-[#8a3b2b]">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Points</h2>
          <div className="mt-3 grid gap-2">
            {data.scores.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                <span className="w-6 text-[#cbbba4]">{row.rank}</span>
                <Face name={row.name} path={row.avatarPath} />
                <span className="flex-1">{row.name}</span>
                <span className="rounded-full bg-black/30 px-3 py-1 text-[#d7b6ff]">{row.points}</span>
              </div>
            ))}
            {data.scores.length === 0 ? <p className="text-[#cbbba4]">Scores show up after the first submission.</p> : null}
          </div>
        </Card>
        <div className="grid gap-3">
          <h2 className="text-lg font-semibold">Photos</h2>
          {data.selfies.map((selfie) => (
            <Card key={selfie.id}>
              {selfie.photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl(selfie.photoPath)} alt="" className="mb-3 aspect-[4/3] w-full rounded-2xl object-cover" />
              ) : null}
              <p className="text-xs uppercase tracking-wide text-[#cbbba4]">
                Round {selfie.roundNumber} · Group {selfie.groupNumber}
                {selfie.place ? ` · #${selfie.place}` : ""} · {selfie.rejected ? "0" : selfie.pointsEach} pts
              </p>
              <p className="text-xl font-semibold">“{selfie.phrase}”</p>
              <p>
                <Stars rating={selfie.rating} /> {selfie.label ?? "Not rated yet"}
              </p>
              <p className="mt-1 text-sm text-[#cbbba4]">{selfie.members.map((member) => member.name).join(", ")}</p>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
