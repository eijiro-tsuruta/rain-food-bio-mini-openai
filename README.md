# Rain Food専科 BIO mini Next.js

HTML単体版を Next.js + Vercel 向けにした最小構成です。

## 目的

- レシピ計算部分はブラウザ側で実行
- Rain Food専科のAI回答だけ `app/api/rain-food/route.ts` 経由でOpenAI APIへ送信
- OpenAI APIキーはブラウザへ出さず、環境変数 `OPENAI_API_KEY` を使用

## ローカル起動

```bash
npm install
cp .env.example .env.local
# .env.local の OPENAI_API_KEY を設定
npm run dev
```

## Vercel

Vercel Project Settings の Environment Variables に `OPENAI_API_KEY` を設定してください。

## 主なファイル

- `app/page.tsx`: UI、レシピ計算、会話状態
- `app/api/rain-food/route.ts`: OpenAI APIを呼ぶサーバー側API
- `app/globals.css`: HTML版から移したデザイン
