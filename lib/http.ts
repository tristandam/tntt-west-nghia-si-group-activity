import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, sign, staffRoleForPassword, unsign, type StaffRole } from "./session";
import { readGame } from "./store";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return json({ error: message }, status);
}

export async function playerSession() {
  const jar = await cookies();
  const raw = unsign(jar.get("player")?.value);
  if (!raw) return null;
  const [playerId, token] = raw.split(":");
  if (!playerId || !token) return null;
  const data = await readGame();
  const player = data.players.find((item) => item.id === playerId && item.claimToken === token && !item.archived);
  return player ?? null;
}

export async function staffSession(): Promise<StaffRole | null> {
  const jar = await cookies();
  const role = unsign(jar.get("staff")?.value);
  return role === "admin" || role === "rater" ? role : null;
}

export function setPlayerCookie(response: NextResponse, playerId: string, token: string) {
  response.headers.append("Set-Cookie", `player=${sign(`${playerId}:${token}`)}; ${cookieOptions()}`);
  return response;
}

export function setStaffCookie(response: NextResponse, role: StaffRole) {
  response.headers.append("Set-Cookie", `staff=${sign(role)}; ${cookieOptions()}`);
  return response;
}

export function clearCookie(response: NextResponse, name: string) {
  response.headers.append("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}

export { staffRoleForPassword };
