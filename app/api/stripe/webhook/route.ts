import { NextResponse } from "next/server";
import { generateInitialPassword, hashPassword } from "../../../../lib/auth";
import { sendLoginInfoEmail } from "../../../../lib/mailer";
import { createUser, getUserByCheckoutSession, getUserByEmail, updateUser } from "../../../../lib/supabaseAdmin";
import { verifyStripeSignature } from "../../../../lib/stripe";

export const runtime = "nodejs";

type StripeCheckoutSession = {
  id?: string;
  customer?: string | null;
  subscription?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
};

type StripeEvent = {
  type?: string;
  data?: {
    object?: unknown;
  };
};

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Stripe署名検証に失敗しました。" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Webhook JSONを読めませんでした。" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const session = event.data?.object as StripeCheckoutSession | undefined;
  const sessionId = stringOrNull(session?.id);
  const email = stringOrNull(session?.customer_details?.email)?.toLowerCase();

  if (!sessionId || !email) {
    return NextResponse.json({ error: "Checkout SessionのIDまたは購入者メールが取得できません。" }, { status: 400 });
  }

  const alreadyProcessed = await getUserByCheckoutSession(sessionId);
  if (alreadyProcessed?.initial_password_sent_at) {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  const initialPassword = generateInitialPassword();
  const passwordHash = hashPassword(initialPassword);
  const stripeCustomerId = stringOrNull(session?.customer);
  const stripeSubscriptionId = stringOrNull(session?.subscription);
  const existingUser = alreadyProcessed ?? await getUserByEmail(email);

  let user;
  if (existingUser) {
    user = await updateUser(existingUser.id, {
      password_hash: passwordHash,
      status: "active",
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_checkout_session_id: sessionId,
      must_change_password: true
    });
  } else {
    user = await createUser({
      email,
      passwordHash,
      stripeCustomerId,
      stripeSubscriptionId,
      stripeCheckoutSessionId: sessionId
    });
  }

  await sendLoginInfoEmail({ to: email, password: initialPassword });
  await updateUser(user.id, { initial_password_sent_at: new Date().toISOString() });

  return NextResponse.json({ received: true, userId: user.id });
}
