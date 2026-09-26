import Link from "next/link";

export default function RatePage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-[#3f2a1c]">Ratings are automatic</h1>
      <p className="mt-3 text-[#4a3422]">
        A short comment and star rating show up on each answer a few seconds after it is submitted. Youth leaders do not grade them.
      </p>
      <Link className="mt-6 inline-block font-medium" href="/admin">
        Admin
      </Link>
    </main>
  );
}
