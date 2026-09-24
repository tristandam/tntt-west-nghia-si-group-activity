"use client";

import { useEffect, useState } from "react";
import { RATING_LABELS, type Rating } from "@/lib/types";

export function photoUrl(path: string | null | undefined) {
  return path ? `/api/media?path=${encodeURIComponent(path)}` : "";
}

export function Face({ name, path, size = 40 }: { name: string; path?: string | null; size?: number }) {
  const letter = name.trim().slice(0, 1).toUpperCase() || "?";
  if (path) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl(path)}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-[#4a3b28] font-semibold text-[#f0c56e]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {letter}
    </span>
  );
}

export function Stars({ rating }: { rating: Rating | null }) {
  return (
    <span className="tracking-wide text-[#f0c56e]" aria-hidden="true">
      {[1, 2, 3, 4].map((star) => (
        <span key={star} className={rating != null && star <= rating ? "" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function RatingButtons({
  current,
  onPick,
}: {
  current: Rating | null;
  onPick: (rating: Rating) => void;
}) {
  return (
    <div className="grid gap-2">
      {([1, 2, 3, 4] as Rating[]).map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onPick(rating)}
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left ${
            current === rating ? "border-[#f0c56e] bg-[#4a3b22]" : "border-white/10 bg-black/20"
          }`}
        >
          <span>{RATING_LABELS[rating]}</span>
          <Stars rating={rating} />
        </button>
      ))}
    </div>
  );
}

export const ACTIVITY_TITLE = "Doan Thang Thien Nghia Si Activity";

export function Shell({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-5">
      <header className="mb-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Doan Thang Thien" className="h-16 w-16 shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold leading-tight text-[#3f2a1c]">{ACTIVITY_TITLE}</h1>
            {title !== ACTIVITY_TITLE ? <p className="mt-1 text-sm font-medium text-[#7a5a32]">{title}</p> : null}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scarf.png" alt="" className="h-28 w-32 shrink-0 object-contain object-top mix-blend-multiply" />
        </div>
        {action ? <div className="brand-actions mt-3 flex justify-end gap-3">{action}</div> : null}
      </header>
      {children}
    </main>
  );
}

export function Card({
  children,
  className = "",
  tone = "dark",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "dark" | "yellow";
}) {
  const surface =
    tone === "yellow"
      ? "border-[#e4c56a] bg-[#fff6d2] text-[#3f2a1c]"
      : "border-white/10 bg-[#272016] text-[#f6efe2]";
  return <section className={`rounded-3xl border p-4 ${surface} ${className}`}>{children}</section>;
}

export function usePoll<T>(url: string, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState("");
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not refresh.");
        const next = (await response.json()) as T;
        if (!stop) {
          setData(next);
          setError("");
        }
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : "Offline");
      }
    }
    void load();
    const timer = window.setInterval(load, 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [url]);
  return {
    data,
    setData,
    error,
    reload: async () => setData((await (await fetch(url, { cache: "no-store" })).json()) as T),
  };
}
