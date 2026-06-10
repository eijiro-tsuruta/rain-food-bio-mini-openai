export async function sendLoginInfoEmail(input: {
  to: string;
  password: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const loginUrl = process.env.LOGIN_URL;

  if (!apiKey || !from || !loginUrl) {
    throw new Error("RESEND_API_KEY、MAIL_FROM、LOGIN_URL のいずれかが未設定です。");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: "Food専科 BIO mini ログイン情報",
      text: `Food専科 BIO mini のご購入ありがとうございます。

以下のログイン情報でご利用ください。

ログインURL:
${loginUrl}

メールアドレス:
${input.to}

初期パスワード:
${input.password}

初回ログイン後は、今後追加予定のパスワード変更機能で変更してください。
このメールに心当たりがない場合は、購入時のメールアドレスからお問い合わせください。`,
      html: `<p>Food専科 BIO mini のご購入ありがとうございます。</p>
<p>以下のログイン情報でご利用ください。</p>
<p><strong>ログインURL:</strong><br><a href="${loginUrl}">${loginUrl}</a></p>
<p><strong>メールアドレス:</strong><br>${input.to}</p>
<p><strong>初期パスワード:</strong><br>${input.password}</p>
<p>初回ログイン後は、今後追加予定のパスワード変更機能で変更してください。</p>
<p>このメールに心当たりがない場合は、購入時のメールアドレスからお問い合わせください。</p>`
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Resend request failed: ${response.status}`);
  }
}
