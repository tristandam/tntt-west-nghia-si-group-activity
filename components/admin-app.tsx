"use client";

import { useState } from "react";
import type { Rating, Stage } from "@/lib/types";
import { Card, Face, RatingButtons, Shell, photoUrl, usePoll } from "./ui";

type RosterPerson = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  tag: string;
  isLeader: boolean;
  avatarPath: string | null;
  claimed: boolean;
  checkedIn: boolean;
};
type Submission = {
  id: string;
  phrase: string;
  photoPath: string;
  rejected: boolean;
  rating: Rating | null;
  pointsEach: number;
  members: { id: string; name: string; avatarPath: string | null }[];
};
type State = {
  role: "admin" | "rater" | null;
  settings?: {
    stage: Stage;
    roundLengthSec: number;
    breakSec: number;
    nextGroupSize: number | null;
    includeLeadersNextRound: boolean;
  };
  counts?: { roster: number; checkedIn: number; rounds: number };
  roster?: RosterPerson[];
  round?: {
    number: number;
    open: boolean;
    secondsLeft: number;
    groups: { number: number; members: { id: string; name: string; avatarPath: string | null }[]; submissions: Submission[] }[];
  } | null;
};

const blank = { firstName: "", lastName: "", tag: "", isLeader: false };

export function AdminApp() {
  const { data, error, reload } = usePoll<State>("/api/staff", { role: null });
  const [password, setPassword] = useState(process.env.NODE_ENV === "production" ? "" : "admin");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(blank);
  const [resetText, setResetText] = useState("");
  const [deleteText, setDeleteText] = useState("");

  async function send(body: unknown) {
    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string; role?: string };
    if (!response.ok) throw new Error(payload.error || "Could not save.");
    await reload();
    return payload;
  }

  if (!data.role) {
    return (
      <Shell title="Admin">
        <Card>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send({ action: "login", password }).catch((err) => setNotice(err.message));
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Admin password"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
            />
            <button className="rounded-2xl bg-[#f0c56e] px-4 py-3 font-semibold text-[#1a140c]">Sign in</button>
          </form>
          {process.env.NODE_ENV !== "production" ? (
            <p className="mt-3 text-sm text-[#cbbba4]">Default password is admin.</p>
          ) : null}
          {notice ? <p className="mt-3 text-[#ffb4a8]">{notice}</p> : null}
          <a className="mt-4 inline-block text-sm" href="/rate">
            Rating desk
          </a>
        </Card>
      </Shell>
    );
  }

  if (data.role === "rater") {
    return (
      <Shell title="Admin">
        <Card>
          <p>This password is for the rating desk.</p>
          <a className="mt-3 inline-block rounded-2xl bg-[#d7b6ff] px-4 py-3 font-semibold text-[#1a140c]" href="/rate">
            Open rating desk
          </a>
        </Card>
      </Shell>
    );
  }

  const settings = data.settings;
  if (!settings) return null;

  return (
    <Shell
      title="Admin"
      action={
        <div className="flex gap-3 text-sm">
          <a href="/board">Board</a>
          <a href="/rate">Rate</a>
          <button className="text-[#cbbba4]" onClick={() => void send({ action: "logout" })}>
            Sign out
          </button>
        </div>
      }
    >
      {error || notice ? <p className="mb-3 font-medium text-[#8a3b2b]">{notice || error}</p> : null}
      <div className="grid gap-4">
        <Card>
          <div className="grid grid-cols-3 gap-2">
            {(["prep", "active", "ended"] as Stage[]).map((stage) => (
              <button
                key={stage}
                onClick={() => void send({ action: "stage", stage }).catch((err) => setNotice(err.message))}
                className={`rounded-2xl px-3 py-3 capitalize ${settings.stage === stage ? "bg-[#d7b6ff] text-[#1a140c]" : "bg-black/30"}`}
              >
                {stage}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-[#cbbba4]">
            {data.counts?.checkedIn} checked in · {data.counts?.roster} on the roster · {data.counts?.rounds} rounds
          </p>
        </Card>

        <Card className="grid gap-3">
          <label className="grid gap-1 text-sm">
            Round length (seconds)
            <input
              type="number"
              min={20}
              max={180}
              defaultValue={settings.roundLengthSec}
              onBlur={(event) =>
                void send({ action: "settings", ...settings, roundLengthSec: Number(event.target.value) }).catch((err) =>
                  setNotice(err.message),
                )
              }
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Break between rounds (seconds)
            <input
              type="number"
              min={0}
              max={120}
              defaultValue={settings.breakSec}
              onBlur={(event) =>
                void send({ action: "settings", ...settings, breakSec: Number(event.target.value) }).catch((err) =>
                  setNotice(err.message),
                )
              }
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Group size for the next round
            <select
              value={settings.nextGroupSize ?? ""}
              onChange={(event) =>
                void send({
                  action: "settings",
                  ...settings,
                  nextGroupSize: event.target.value ? Number(event.target.value) : null,
                }).catch((err) => setNotice(err.message))
              }
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
            >
              <option value="">Random (2–12)</option>
              {Array.from({ length: 11 }, (_, index) => index + 2).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.includeLeadersNextRound}
              onChange={(event) =>
                void send({ action: "settings", ...settings, includeLeadersNextRound: event.target.checked }).catch((err) =>
                  setNotice(err.message),
                )
              }
            />
            Include leaders in the next round
          </label>
          <button
            className="rounded-2xl bg-[#f0c56e] px-4 py-3 font-semibold text-[#1a140c] disabled:opacity-40"
            disabled={settings.stage !== "active" || Boolean(data.round?.open)}
            onClick={() => void send({ action: "startRound" }).catch((err) => setNotice(err.message))}
          >
            {data.round?.open ? `Round ${data.round.number} · ${data.round.secondsLeft}s` : "Start round"}
          </button>
        </Card>

        {data.round ? (
          <Card>
            <h2 className="text-lg font-semibold">Round {data.round.number}</h2>
            <div className="mt-3 grid gap-3">
              {data.round.groups.map((group) => (
                <div key={group.number} className="rounded-2xl bg-black/25 p-3">
                  <p className="mb-2 text-sm text-[#cbbba4]">
                    Group {group.number} ({group.members.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.members.map((member) => (
                      <span key={member.id} className="inline-flex items-center gap-2 rounded-full bg-black/30 px-2 py-1 text-sm">
                        <Face name={member.name} path={member.avatarPath} size={24} />
                        {member.name}
                      </span>
                    ))}
                  </div>
                  {group.submissions.map((submission) => (
                    <div key={submission.id} className="mt-3">
                      {submission.photoPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl(submission.photoPath)} alt="" className="mb-2 max-h-48 rounded-2xl object-cover" />
                      ) : null}
                      <p>
                        “{submission.phrase}” · {submission.rejected ? "0" : submission.pointsEach} pts
                      </p>
                      <div className="mt-2">
                        <RatingButtons
                          current={submission.rating}
                          onPick={(rating) =>
                            void send({ action: "rate", submissionId: submission.id, rating }).catch((err) => setNotice(err.message))
                          }
                        />
                      </div>
                      <button
                        className="mt-2 text-sm text-[#ffb4a8]"
                        disabled={submission.rejected}
                        onClick={() => {
                          if (!window.confirm("Reject this submission? It scores 0 and the group can send another.")) return;
                          void send({ action: "reject", submissionId: submission.id }).catch((err) => setNotice(err.message));
                        }}
                      >
                        {submission.rejected ? "Rejected" : "Reject"}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <h2 className="text-lg font-semibold">Roster</h2>
          <form
            className="mt-3 grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send({ action: "addPlayer", ...form })
                .then(() => setForm(blank))
                .catch((err) => setNotice(err.message));
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                placeholder="First name"
                value={form.firstName}
                onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
              />
              <input
                required
                placeholder="Last name"
                value={form.lastName}
                onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
              />
            </div>
            <input
              placeholder="Tag if the name is shared"
              value={form.tag}
              onChange={(event) => setForm({ ...form, tag: event.target.value })}
              className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isLeader} onChange={(event) => setForm({ ...form, isLeader: event.target.checked })} />
              Youth leader, sitting out unless included
            </label>
            <button className="rounded-2xl bg-white/10 px-4 py-3">Add name</button>
          </form>
          <div className="mt-4 grid gap-2">
            {(data.roster ?? []).map((person) => (
              <div key={person.id} className="flex items-center gap-2 rounded-2xl bg-black/25 px-3 py-2">
                <Face name={person.name} path={person.avatarPath} />
                <span className="flex-1">
                  {person.name}
                  <span className="ml-2 text-xs text-[#cbbba4]">
                    {person.isLeader ? "Leader" : "Player"}
                    {person.checkedIn ? " · in" : ""}
                    {person.claimed ? " · claimed" : ""}
                  </span>
                </span>
                {person.claimed ? (
                  <button className="text-xs text-[#cbbba4]" onClick={() => void send({ action: "releasePlayer", playerId: person.id })}>
                    Release
                  </button>
                ) : null}
                <button className="text-xs text-[#ffb4a8]" onClick={() => void send({ action: "archivePlayer", playerId: person.id })}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="grid gap-3">
          <h2 className="text-lg font-semibold">After the event</h2>
          <input
            value={deleteText}
            onChange={(event) => setDeleteText(event.target.value)}
            placeholder="Type DELETE to remove photos"
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
          />
          <button className="rounded-2xl border border-white/15 px-4 py-3" onClick={() => void send({ action: "deletePhotos", confirm: deleteText }).catch((err) => setNotice(err.message))}>
            Delete all photos
          </button>
          <input
            value={resetText}
            onChange={(event) => setResetText(event.target.value)}
            placeholder="Type RESET to clear the session"
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
          />
          <button className="rounded-2xl border border-[#ffb4a8] px-4 py-3" onClick={() => void send({ action: "reset", confirm: resetText }).catch((err) => setNotice(err.message))}>
            Reset scores and rounds
          </button>
        </Card>
      </div>
    </Shell>
  );
}
