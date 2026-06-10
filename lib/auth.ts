import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getUserById, type AppUser } from "./supabaseAdmin";

export const SESSION_COOKIE_NAME = "rain_food_session";

type SessionPayload = {
  userId: string;
  email: string;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("AUTH_SESSION_SECRET は24文字以上で設定してください。");
  }
  return secret;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

export function generateInitialPassword() {
  return randomBytes(12).toString("base64url");
}

export function hashPassword(password: string) {
  const iterations = 210000;
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [scheme, iterationText, salt, hash] = storedHash.split("$");
  if (scheme !== "pbkdf2_sha256" || !iterationText || !salt || !hash) return false;
  const iterations = Number(iterationText);
  if (!Number.isFinite(iterations) || iterations < 100000) return false;
  const actual = Buffer.from(hash, "base64url");
  const candidate = pbkdf2Sync(password, salt, iterations, actual.length, "sha256");
  return actual.length === candidate.length && timingSafeEqual(actual, candidate);
}

export function createSessionToken(user: Pick<AppUser, "id" | "email">) {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = sign(encodedPayload);
  const sig = Buffer.from(signature);
  const exp = Buffer.from(expected);
  if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.email || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };
}
