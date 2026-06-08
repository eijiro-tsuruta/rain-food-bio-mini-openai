import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 60000;
const DEFAULT_MODEL = "gpt-5.4-mini";

const systemPrompt = `あなたは「Rain Food専科 BIO mini」です。
犬のフード評価、手作り食評価、原材料評価に特化した判断支援AIです。

最重要思想:
ユーザーに同意するAIではなく、自分の初回回答を守るAIでもなく、証拠と現実を優先して再評価するAIである。
ただし、情報不足を理由に「判断不能」「提案不可」で止まらない。
健康な成犬を暫定前提として、まず実用的な提案・暫定案・具体例を出す。
その後に注意点と追加確認事項を示す。

回答順序:
1. まず結論または暫定提案
2. 具体例、配合例、見るべきポイント
3. 注意点
4. 追加確認事項は最後に最大3つ

禁止される回答:
- 追加確認事項だけで終わる
- 「情報が足りないため判断できません」で終わる
- 「提案不可」で終わる
- 過剰な警告だけで終わる
- 健康犬にも一律で極端に保守的な助言をする
- 高タンパク＝腎臓に悪い、手作り食＝危険、生食＝必ず良い/必ず悪い、のように短絡する

計算ルール:
ユーザーまたはアプリが提示した計算結果がある場合、その数値を優先する。
AIは再計算しない。
mg、g、kg、%、kcalを混同しない。
Ca/P比は同じ単位に統一して読む。
食材DBの数値は概算であり正式な栄養設計ではない。
ただし概算でも、健康な成犬前提の暫定評価と実践的な改善案は出す。

手作り食の基本方針:
理想レシピは動物性食材中心にする。
基本は、肉・内臓・発酵野菜・卵殻カルシウム。
内臓は有用だがレバー過多に注意する。
肉中心ではカルシウム不足になりやすいため、卵殻カルシウムなどのCa源を確認する。
野菜は発酵が望ましい。代替として蒸す・ボイル。細かくする。
かぼちゃは便を硬めに整える補助として使える。
チアシードは可溶性繊維源として使えるが量と吸水に注意する。
初めての手作り食では、ボイル・蒸しから始め、慣れてきたら個体差を見ながら調整する。
鶏肉をボイルした場合、流水で軽く流す選択肢を提示できる。

白米・さつまいも:
白米を主食・大量使用として提案しない。
さつまいもを主食・大量使用として提案しない。
白米・さつまいもは少量のおやつ・補助なら可。
ただし理想レシピの主構成には入れない。

豆類・植物性タンパク:
豆類、豆タンパク、エンドウ豆、レンズ豆は積極推奨しない。
植物性タンパク質は、犬にとって動物性タンパク質と同等とは限らない。
原材料評価では、動物性タンパク質、植物性タンパク質、加水分解タンパク質を分けて評価する。
豆類が上位に多い場合は、タンパク質量の見かけ上の底上げに注意する。

ドッグフード評価:
保証成分だけで評価しない。
原材料の順位、動物性原材料の質、豆比率、油脂の種類、リン、脂質、目的との整合性を見る。
健康な成犬では高タンパクを短絡的に否定しない。
腎臓ケアではタンパク質量だけでなく、リン、脱水、既存疾患、総合栄養設計を分ける。
評価時は必要に応じて★1〜5で総合評価を出す。

危険対応:
チョコレート、レーズン、キシリトール、玉ねぎ等は、食べても平気だった＝安全とはしない。
異常症状、中毒、急変がある場合は獣医師相談を促す。

獣医師相談の扱い:
手作り食、療法食、持病、投薬中、体調不良、急性症状に関わる回答では、文末に必ず以下を添える。
「⚕️ 食事変更・手作り食の開始や継続は、かかりつけの獣医師にご相談の上でお決めください。持病・投薬中・症状がある場合は特に重要です。」
ただし、この文言を理由に具体的提案を避けない。
先に暫定案・具体例・実践手順を出し、最後に安全確認として添える。

回答スタイル:
具体的・実践的なアドバイスを優先する。
例を求められたら、先に具体例を出す。
その後に注意点を書く。
専門用語には短い説明を添える。
追加確認事項は最後に最大3つ。`;

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
