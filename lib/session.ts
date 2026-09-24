import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type StaffRole = "admin" | "rater";

function secret() {
  return process.env.SESSION_SECRET || "dev-only-session-secret";
}

export function sign(value: string) {
  const mac = createHmac("sha256", secret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function unsign(signed: string | undefined) {
  if (!signed) return null;
  const index = signed.lastIndexOf(".");
  if (index <= 0) return null;
  const value = signed.slice(0, index);
  const expected = sign(value);
  const left = Buffer.from(signed);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return value;
}

export function newToken() {
  return randomBytes(18).toString("base64url");
}

function matches(input: string, expected: string | undefined) {
  if (!expected) return false;
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const DEFAULT_ADMIN_PASSWORD = "admin";

export function staffRoleForPassword(password: string): StaffRole | null {
  const admin =
    process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : DEFAULT_ADMIN_PASSWORD);
  const rater = process.env.RATER_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "rate-dev");
  if (matches(password, admin)) return "admin";
  if (matches(password, rater)) return "rater";
  return null;
}

export function cookieOptions() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`;
}
