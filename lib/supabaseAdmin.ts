export type AppUser = {
  id: string;
  email: string;
  password_hash: string;
  status: "active" | "suspended";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  initial_password_sent_at: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

type UserPatch = Partial<Pick<
  AppUser,
  "password_hash" | "status" | "stripe_customer_id" | "stripe_subscription_id" | "stripe_checkout_session_id" | "initial_password_sent_at" | "must_change_password"
>>;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません。");
  }
  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey
  };
}

function headers(extra?: HeadersInit): HeadersInit {
  const { serviceRoleKey } = getSupabaseConfig();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Supabase request failed: ${response.status}`);
  }
  return text ? JSON.parse(text) as T : ([] as T);
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const { url } = getSupabaseConfig();
  const query = new URLSearchParams({
    email: `eq.${normalizeEmail(email)}`,
    select: "*",
    limit: "1"
  });
  const response = await fetch(`${url}/rest/v1/users?${query.toString()}`, {
    headers: headers(),
    cache: "no-store"
  });
  const users = await readJson<AppUser[]>(response);
  return users[0] ?? null;
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const { url } = getSupabaseConfig();
  const query = new URLSearchParams({
    id: `eq.${id}`,
    select: "*",
    limit: "1"
  });
  const response = await fetch(`${url}/rest/v1/users?${query.toString()}`, {
    headers: headers(),
    cache: "no-store"
  });
  const users = await readJson<AppUser[]>(response);
  return users[0] ?? null;
}

export async function getUserByCheckoutSession(sessionId: string): Promise<AppUser | null> {
  const { url } = getSupabaseConfig();
  const query = new URLSearchParams({
    stripe_checkout_session_id: `eq.${sessionId}`,
    select: "*",
    limit: "1"
  });
  const response = await fetch(`${url}/rest/v1/users?${query.toString()}`, {
    headers: headers(),
    cache: "no-store"
  });
  const users = await readJson<AppUser[]>(response);
  return users[0] ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCheckoutSessionId?: string | null;
}): Promise<AppUser> {
  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/users`, {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify({
      email: normalizeEmail(input.email),
      password_hash: input.passwordHash,
      status: "active",
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      must_change_password: true
    })
  });
  const users = await readJson<AppUser[]>(response);
  if (!users[0]) throw new Error("Supabase user insert returned no row.");
  return users[0];
}

export async function updateUser(id: string, patch: UserPatch): Promise<AppUser> {
  const { url } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch)
  });
  const users = await readJson<AppUser[]>(response);
  if (!users[0]) throw new Error("Supabase user update returned no row.");
  return users[0];
}
