import { readPhoto } from "@/lib/photos";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") ?? "";
  const bytes = await readPhoto(path);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=60",
    },
  });
}
