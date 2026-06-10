import { createHmac, timingSafeEqual } from "node:crypto";

function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET が設定されていません。");
  return secret;
}

function parseSignatureHeader(header: string) {
  const parts = header.split(",").map(part => part.trim());
  const timestamp = parts.find(part => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter(part => part.startsWith("v1="))
    .map(part => part.slice(3));
  return { timestamp, signatures };
}

export function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  if (!signatureHeader) return false;
  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  if (!timestamp || signatures.length === 0) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", getStripeWebhookSecret())
    .update(signedPayload)
    .digest("hex");

  return signatures.some(signature => {
    const actual = Buffer.from(signature, "hex");
    const exp = Buffer.from(expected, "hex");
    return actual.length === exp.length && timingSafeEqual(actual, exp);
  });
}
