import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const root = path.join(process.cwd(), "data", "photos");
const types = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
]);

function driver() {
  return process.env.DATA_DRIVER === "supabase" ? "supabase" : "local";
}

function supabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL and service role key are required.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function savePhoto(kind: "avatars" | "submissions", id: string, file: File) {
  const ext = types.get(file.type);
  if (!ext) throw new Error("Use a JPEG, PNG, or WebP photo.");
  if (file.size > 12 * 1024 * 1024) throw new Error("That photo is over 12 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  const size = kind === "avatars" ? 640 : 1600;
  const bytes = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer();
  const stored = `${kind}/${id}.jpg`;
  if (driver() === "local") {
    const full = path.join(root, stored);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
    return stored;
  }
  const client = supabase();
  const { error } = await client.storage.from("photos").upload(stored, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return stored;
}

export async function readPhoto(stored: string) {
  if (!/^(avatars|submissions)\/[a-zA-Z0-9-]+\.jpg$/.test(stored)) return null;
  if (driver() === "local") {
    try {
      const bytes = await readFile(path.join(root, stored));
      return bytes;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  const client = supabase();
  const { data, error } = await client.storage.from("photos").download(stored);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteAllPhotos() {
  if (driver() === "local") {
    await rm(root, { recursive: true, force: true });
    return;
  }
  const client = supabase();
  for (const folder of ["avatars", "submissions"]) {
    const { data } = await client.storage.from("photos").list(folder, { limit: 1000 });
    const paths = (data ?? []).map((item) => `${folder}/${item.name}`);
    if (paths.length) await client.storage.from("photos").remove(paths);
  }
}

