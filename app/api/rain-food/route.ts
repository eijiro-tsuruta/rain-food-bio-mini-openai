import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 60000;
const DEFAULT_MODEL = "gpt-5.4-mini";

const systemPrompt = `あなたは「Rain Food専科 BIO mini」です。犬のフード評価、手作り食評価に特化した判断支援AIです。
最重要思想: ユーザーに同意するAIではなく、自分の初回回答を守るAIでもなく、証拠と現実を優先して再評価するAIである。
計算ルール: ユーザーが入力した計算結果がある場合、その数値を優先。自分で暗算しない。mg、g、kg、%、kcalを混同しない。Ca/P比は同じ単位に統一。食材DBの数値は概算であり正式な栄養設計ではない。
手作り食評価: 初心者にはCaやPの数値入力を要求しすぎない。肉だけではカルシウム不足を強く警告。内臓は有用だがレバー過多注意。カボチャは便を硬くする方向の調整食材。野菜は発酵が望ましいが初心者には加熱・細かく刻むことを推奨。肉は生が栄養面で有利な場合があるが、一般家庭では衛生管理上、蒸す・ボイルを現実的選択肢とする。鶏肉をボイルした場合、流水で軽く流すと軟便対策になる場合がある。白米・さつまいもは標準候補にしない。
タンパク質評価: 動物性、植物性、加水分解を分ける。植物性タンパク質は犬にとってアミノ酸組成・消化性・利用性の面で動物性と同等とは限らない。加水分解タンパク質は原料・分解方法・品質確認が必要。高タンパク＝腎臓に悪いと短絡せず、リン、脱水、既存疾患、総合栄養設計を分ける。
危険対応: チョコレート、レーズン、キシリトール、玉ねぎ等は食べても平気だった＝安全としない。異常症状・中毒・急変がある場合は獣医師相談を促す。
回答形式: 【計算値の確認】【単位統一の確認】【栄養評価】【良い点】【懸念点】【追加確認事項】【現時点の判断】【注意】`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function extractResponseText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const response = data as { output_text?: unknown; output?: unknown };
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  let text = "";
  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (!item || typeof item !== "object") continue;
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!part || typeof part !== "object") continue;
        const maybeText = (part as { text?: unknown }).text;
        if (typeof maybeText === "string") text += maybeText + "\n";
      }
    }
  }
  return text.trim();
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { role?: unknown; content?: unknown };
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY が設定されていません。" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONを読めませんでした。" }, { status: 400 });
  }

  const payload = body as { model?: unknown; messages?: unknown };
  const model = typeof payload.model === "string" && payload.model.trim()
    ? payload.model.trim()
    : DEFAULT_MODEL;
  const messages = Array.isArray(payload.messages)
    ? payload.messages.filter(isChatMessage)
    : [];

  if (messages.length === 0) {
    return NextResponse.json({ error: "相談内容がありません。" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions: systemPrompt,
        input: messages,
        max_output_tokens: 3000
      }),
      signal: controller.signal
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { error: { message: "OpenAI APIの応答をJSONとして読めませんでした。" } };
    }

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: response.status });
    }

    const text = extractResponseText(data);
    return NextResponse.json({ text, raw: text ? undefined : data });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "OpenAI APIリクエストがタイムアウトしました。"
      : error instanceof Error
        ? error.message
        : "OpenAI API通信に失敗しました。";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
