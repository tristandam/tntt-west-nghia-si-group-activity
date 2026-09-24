import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emptyGame, type GameData } from "./types";

const localFile = path.join(process.cwd(), "data", "game.json");

let chain: Promise<unknown> = Promise.resolve();

function driver() {
  return process.env.DATA_DRIVER === "supabase" ? "supabase" : "local";
}

function supabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL and service role key are required.");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readLocal(): Promise<GameData> {
  try {
    const raw = await readFile(localFile, "utf8");
    return { ...emptyGame(), ...JSON.parse(raw) } as GameData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyGame();
    throw error;
  }
}

async function writeLocal(data: GameData) {
  await mkdir(path.dirname(localFile), { recursive: true });
  const temp = `${localFile}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(data));
  await rename(temp, localFile);
}

async function readSupabase(client: SupabaseClient): Promise<{ version: number; data: GameData }> {
  const { data, error } = await client.from("game_state").select("version, data").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return { version: data.version as number, data: { ...emptyGame(), ...(data.data as GameData) } };
}

async function writeSupabase(client: SupabaseClient, version: number, data: GameData) {
  const { data: row, error } = await client
    .from("game_state")
    .update({ version: version + 1, data })
    .eq("id", 1)
    .eq("version", version)
    .select("version")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("conflict");
}

export async function readGame() {
  if (driver() === "local") return readLocal();
  return (await readSupabase(supabase())).data;
}

export async function updateGame<T>(fn: (data: GameData) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    if (driver() === "local") {
      const data = await readLocal();
      const result = await fn(data);
      await writeLocal(data);
      return result;
    }
    const client = supabase();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const current = await readSupabase(client);
      const draft = structuredClone(current.data);
      const result = await fn(draft);
      try {
        await writeSupabase(client, current.version, draft);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message === "conflict") continue;
        throw error;
      }
    }
    throw new Error("The game was busy. Try again.");
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
