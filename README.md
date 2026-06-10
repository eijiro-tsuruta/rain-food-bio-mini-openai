# Rain Food専科 BIO mini Next.js

HTML単体版を Next.js + Vercel 向けにした最小構成です。

## 目的

- レシピ計算部分はブラウザ側で実行
- Rain Food専科のAI回答だけ `app/api/rain-food/route.ts` 経由でOpenAI APIへ送信
- OpenAI APIキーはブラウザへ出さず、環境変数 `OPENAI_API_KEY` を使用
- Supabase `users` テーブルで `active / suspended` を管理
- Stripe Checkout完了Webhookで購入者を自動登録
- Resendで初期ログイン情報をメール送信

## ローカル起動

```bash
npm install
cp .env.example .env.local
# .env.local の各種環境変数を設定
npm run dev
```

## Vercel

Vercel Project Settings の Environment Variables に以下を設定してください。

```txt
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
MAIL_FROM
LOGIN_URL
AUTH_SESSION_SECRET
```

`SUPABASE_SERVICE_ROLE_KEY`、`STRIPE_WEBHOOK_SECRET`、`RESEND_API_KEY`、`AUTH_SESSION_SECRET` は秘密情報です。GitHubやブラウザ側コードには入れないでください。

Stripe Webhook URL:

```txt
https://<your-domain>/api/stripe/webhook
```

初期版で処理するStripeイベント:

```txt
checkout.session.completed
```

## 主なファイル

- `app/page.tsx`: UI、レシピ計算、会話状態
- `app/api/rain-food/route.ts`: OpenAI APIを呼ぶサーバー側API
- `app/api/stripe/webhook/route.ts`: Stripe購入完了Webhook
- `app/api/auth/login/route.ts`: メールアドレス＋パスワード認証
- `app/api/auth/me/route.ts`: ログイン状態確認
- `app/api/auth/logout/route.ts`: ログアウト
- `lib/`: Supabase、認証、メール、Stripe署名検証
- `app/globals.css`: HTML版から移したデザイン
