"use client";

import { useState } from "react";
import type { Rating } from "@/lib/types";
import { Card, Face, RatingButtons, Shell, photoUrl, usePoll } from "./ui";

type CardData = {
  id: string;
  roundNumber: number;
  groupNumber: number;
  phrase: string;
  photoPath: string;
  rejected: boolean;
  rating: Rating | null;
  label: string | null;
  pointsEach: number;
  members: { id: string; name: string; avatarPath: string | null }[];
};
type Desk = {
  roundNumber?: number;
  secondsLeft?: number;
  roundOpen?: boolean;
  cards?: CardData[];
};
type State = Desk & {
  role: "admin" | "rater" | null;
  ratingDesk?: Desk;
};

export function RateApp() {
  const { data, error, reload } = usePoll<State>("/api/staff", { role: null });
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmId, setConfirmId] = useState("");

  async function send(body: unknown) {
    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not save.");
    await reload();
  }

  if (!data.role) {
    return (
      <Shell title="Rating desk">
        <Card>
          <p className="text-[#cbbba4]">Leader password. This desk can rate and reject only.</p>
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send({ action: "login", password }).catch((err) => setNotice(err.message));
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
            />
            <button className="rounded-2xl bg-[#d7b6ff] px-4 py-3 font-semibold text-[#1a140c]">Sign in</button>
          </form>
          {notice ? <p className="mt-3 text-[#ffb4a8]">{notice}</p> : null}
        </Card>
      </Shell>
    );
  }

  const desk = data.cards ? data : (data.ratingDesk ?? data);
  const cards = desk.cards ?? [];
  return (
    <Shell
      title="Rating desk"
      action={
        <button className="text-sm text-[#cbbba4]" onClick={() => void send({ action: "logout" })}>
          Sign out
        </button>
      }
    >
      <p className="mb-4 text-[#cbbba4]">
        {desk.roundOpen ? `Round ${desk.roundNumber} · ${desk.secondsLeft}s left` : "Waiting for the next round"}
      </p>
      {error || notice ? <p className="mb-3 font-medium text-[#8a3b2b]">{notice || error}</p> : null}
      <div className="grid gap-4">
        {cards.map((card) => (
          <Card key={card.id}>
            {card.photoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl(card.photoPath)} alt="" className="mb-3 max-h-80 w-full rounded-2xl object-cover" />
            ) : null}
            <p className="text-xs uppercase tracking-wide text-[#cbbba4]">
              Round {card.roundNumber} · Group {card.groupNumber} · {card.rejected ? "0" : card.pointsEach} pts
            </p>
            <p className="text-2xl font-semibold">“{card.phrase}”</p>
            <div className="my-3 flex flex-wrap gap-2">
              {card.members.map((member) => (
                <span key={member.id} className="inline-flex items-center gap-2 rounded-full bg-black/30 px-2 py-1 text-sm">
                  <Face name={member.name} path={member.avatarPath} size={28} />
                  {member.name}
                </span>
              ))}
            </div>
            <RatingButtons
              current={card.rating}
              onPick={(rating) => {
                setNotice("");
                void send({ action: "rate", submissionId: card.id, rating }).catch((err) => setNotice(err.message));
              }}
            />
            {confirmId === card.id ? (
              <button
                className="mt-3 w-full rounded-2xl bg-[#ffb4a8] px-4 py-3 font-semibold text-[#1a140c]"
                onClick={() =>
                  void send({ action: "reject", submissionId: card.id })
                    .then(() => setConfirmId(""))
                    .catch((err) => setNotice(err.message))
                }
              >
                Confirm reject · 0 points
              </button>
            ) : (
              <button className="mt-3 text-sm text-[#ffb4a8]" onClick={() => setConfirmId(card.id)} disabled={card.rejected}>
                {card.rejected ? "Rejected" : "Reject"}
              </button>
            )}
          </Card>
        ))}
        {cards.length === 0 ? <Card>Submissions will land here as groups send them.</Card> : null}
      </div>
    </Shell>
  );
}
