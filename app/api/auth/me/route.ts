import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: {
      email: user.email,
      status: user.status,
      mustChangePassword: user.must_change_password
    }
  });
}
