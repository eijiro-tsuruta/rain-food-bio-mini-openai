import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME, verifyPassword } from "../../../../lib/auth";
import { getUserByEmail } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONを読めませんでした。" }, { status: 400 });
  }

  const payload = body as { email?: unknown; password?: unknown };
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "メールアドレスとパスワードを入力してください。" }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います。" }, { status: 401 });
  }

  if (user.status === "suspended") {
    return NextResponse.json({ error: "このアカウントは現在停止中です。" }, { status: 403 });
  }

  const response = NextResponse.json({
    user: {
      email: user.email,
      status: user.status,
      mustChangePassword: user.must_change_password
    }
  });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), sessionCookieOptions());
  return response;
}
