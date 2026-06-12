import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSessionUser } from "../../../lib/auth";

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

Rain BIO構造評価ルール:
一般的な検索結果のフードレビューではなく、犬の栄養学的な構造評価を行う。
「高タンパク＝腎臓負担」という表現は禁止。
健康な犬に対して、高タンパクのみを理由に腎臓へ悪い・負担が大きいと評価しない。
腎臓への影響は、腎疾患の有無、リン含有量、原材料構成、水分摂取状況、年齢、活動量を確認して判断する。
腎臓評価ではタンパク質量より先に、リン、カルシウム、Ca:P比を確認する。
特に腎臓への影響を評価する場合、リンを主要評価項目とする。
保証成分または検索先からリン値が取得できた場合、リンを必ず評価する。リン値を取得しただけで終了しない。
リンが存在する場合、必ずリンの評価、Ca:P比の評価、年齢・ライフステージとの適合性を出力する。
リンを取得しているにも関わらず、評価文にリンが登場しない回答は禁止。
レンズ豆、ひよこ豆、えんどう豆、豆タンパク、豆由来繊維を検出した場合、植物性タンパク質または植物性繊維源として評価する。
豆類は、原材料順位、使用数、配合比率の推定、動物性原料とのバランスを考慮する。
Rain BIOでは動物性タンパク質主体を基本評価軸とする。
ライフステージだけで評価しない。「パピー用なので成犬には不向き」と単独判断しない。
パピー用でも、リン量、Ca:P比、エネルギー密度、原材料構成、健康状態、使用期間を見て評価する。

フード評価の固定順序:
STEP1 動物性原料比率
STEP2 植物性原料比率
STEP3 豆類評価
STEP4 リン評価
STEP5 Ca:P評価
STEP6 脂肪評価
STEP7 犬種適合
STEP8 活動量適合
STEP9 年齢適合
STEP10 総合評価

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
  content: ChatContent;
};

type ChatContent = string | ChatContentPart[];

type ChatContentPart =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: string;
        data: string;
      };
    };

type OpenAIInputMessage = {
  role: "user" | "assistant";
  content: Array<
    | { type: "input_text"; text: string }
    | { type: "output_text"; text: string }
    | { type: "input_image"; image_url: string }
  >;
};

const PRODUCT_SEARCH_WORDS = [
  "商品",
  "製品",
  "フード",
  "ドッグフード",
  "サプリ",
  "おやつ",
  "トリーツ",
  "保証成分",
  "成分",
  "原材料",
  "栄養成分",
  "カロリー",
  "代謝エネルギー",
  "ME",
  "メーカー",
  "ブランド",
  "ラベル",
  "パッケージ",
  "protein",
  "fat",
  "fiber",
  "moisture",
  "guaranteed analysis",
  "ingredients",
  "calorie"
];

const knowledgeFiles = {
  core: "core-rules.md",
  nutrition: "nutrition.md",
  health: "health.md",
  evidence: "evidence.md",
  calc: "calc-rules.md",
  foodEvaluation: "food-evaluation.md"
} as const;

type KnowledgeKey = keyof typeof knowledgeFiles;

function readKnowledgeFile(key: KnowledgeKey): string {
  try {
    return readFileSync(join(process.cwd(), "knowledge", knowledgeFiles[key]), "utf8").trim();
  } catch {
    return "";
  }
}

function selectKnowledge(messages: ChatMessage[]): KnowledgeKey[] {
  const text = messages.map(messageText).join("\n");
  const selected = new Set<KnowledgeKey>(["core", "evidence"]);

  if (/手作り|レシピ|給与量|給餌|RER|DER|Ca:?P|カルシウム|リン|卵殻|内臓|発酵野菜|食材/.test(text)) {
    selected.add("nutrition");
    selected.add("calc");
  }

  if (/原材料|保証成分|ドッグフード|フード評価|総合栄養食|粗タンパク|粗脂肪|代謝エネルギー|ME|加水分解|HVP|豆|エンドウ|レンズ|グルテン|プロテイン/.test(text)) {
    selected.add("foodEvaluation");
    selected.add("nutrition");
  }

  if (/体調|健康|症状|軟便|下痢|嘔吐|皮膚|痒|腎|肝|膵|アレルギー|シニア|病気|投薬|尿|便/.test(text)) {
    selected.add("health");
    selected.add("evidence");
  }

  return Array.from(selected);
}

function buildInstructions(messages: ChatMessage[]): string {
  const selectedKnowledge = selectKnowledge(messages)
    .map(key => readKnowledgeFile(key))
    .filter(Boolean)
    .map(content => `---\n${content}`)
    .join("\n\n");

  const extraPolicy = `

画像・商品検索ルール:
- ユーザーが写真を送った場合、写真から読み取れる範囲と断定できない範囲を分けて説明する。
- 商品写真、フード名、サプリ名、保証成分、原材料、栄養成分、カロリーを問われた場合は、利用可能ならWeb検索で確認する。
- 日本語の相談では、日本公式、正規輸入元、日本販売ページを先に探す。見つからない場合だけ海外公式ページを使い、「米国公式」「カナダ公式」など出典地域を明記する。
- 公式メーカー、販売ページ、商品ラベル情報を優先し、保証成分は確認元URLを本文中に示す。
- 英語ページから原材料や保証成分を取得した場合でも、回答本文では日本語へ訳して整理する。英語原文を長く貼り付けない。
- 出典URLは各文や各箇条書きに何度も挿入しない。回答の最後に「参考資料」としてまとめる。
- Webで確認できない数値は、推測せず「確認できない」と明記する。`;
  if (!selectedKnowledge) return `${systemPrompt}${extraPolicy}`;
  return `${systemPrompt}${extraPolicy}\n\n# Selected Markdown Knowledge\n${selectedKnowledge}`;
}

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

function compactReferenceLinks(text: string): string {
  const references = new Map<string, string>();
  const withoutInlineReferences = text.replace(
    /\s*\(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\)/g,
    (_match, label: string, url: string) => {
      references.set(url, label);
      return "";
    }
  );

  if (references.size === 0) return text;

  const cleanedText = withoutInlineReferences
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const referenceLines = Array.from(references.entries())
    .map(([url, label], index) => `${index + 1}. ${label}: ${url}`)
    .join("\n");

  return `${cleanedText}\n\n参考資料:\n${referenceLines}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { role?: unknown; content?: unknown };
  return (
    (message.role === "user" || message.role === "assistant") &&
    isChatContent(message.content)
  );
}

function isChatContent(value: unknown): value is ChatContent {
  if (typeof value === "string") return true;
  if (!Array.isArray(value)) return false;
  return value.every(part => {
    if (!part || typeof part !== "object") return false;
    const contentPart = part as { type?: unknown; text?: unknown; source?: unknown };
    if (contentPart.type === "text") return typeof contentPart.text === "string";
    if (contentPart.type !== "image" || !contentPart.source || typeof contentPart.source !== "object") {
      return false;
    }
    const source = contentPart.source as { type?: unknown; media_type?: unknown; data?: unknown };
    return source.type === "base64" &&
      typeof source.media_type === "string" &&
      source.media_type.startsWith("image/") &&
      typeof source.data === "string" &&
      source.data.length > 0;
  });
}

function messageText(message: ChatMessage): string {
  if (typeof message.content === "string") return message.content;
  return message.content
    .map(part => part.type === "text" ? part.text : "")
    .join("\n");
}

function hasImage(messages: ChatMessage[]): boolean {
  return messages.some(message => Array.isArray(message.content) && message.content.some(part => part.type === "image"));
}

function shouldEnableWebSearch(messages: ChatMessage[], payload: { enableWebSearch?: unknown }): boolean {
  if (payload.enableWebSearch === true) return true;
  if (payload.enableWebSearch === false) return false;

  const recentText = messages
    .slice(-4)
    .map(messageText)
    .join("\n")
    .toLowerCase();

  if (!recentText) return false;
  return PRODUCT_SEARCH_WORDS.some(word => recentText.includes(word.toLowerCase()));
}

function toOpenAIMessage(message: ChatMessage): OpenAIInputMessage {
  if (typeof message.content === "string") {
    return {
      role: message.role,
      content: [{
        type: message.role === "assistant" ? "output_text" : "input_text",
        text: message.content
      }]
    };
  }

  return {
    role: "user",
    content: message.content.map(part => {
      if (part.type === "image") {
        return {
          type: "input_image",
          image_url: `data:${part.source.media_type};base64,${part.source.data}`
        };
      }
      return { type: "input_text", text: part.text };
    })
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  if (user.status !== "active") {
    return NextResponse.json({ error: "このアカウントは現在停止中です。" }, { status: 403 });
  }

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

  const payload = body as { model?: unknown; messages?: unknown; enableWebSearch?: unknown };
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
  const useWebSearch = shouldEnableWebSearch(messages, payload);
  const requestBody: {
    model: string;
    instructions: string;
    input: OpenAIInputMessage[];
    max_output_tokens: number;
    tools?: Array<{ type: "web_search"; search_context_size: string }>;
    tool_choice?: "required";
  } = {
    model,
    instructions: buildInstructions(messages),
    input: messages.map(toOpenAIMessage),
    max_output_tokens: hasImage(messages) ? 3600 : 3000
  };

  if (useWebSearch) {
    requestBody.tools = [{
      type: "web_search",
      search_context_size: process.env.WEB_SEARCH_CONTEXT_SIZE || "low"
    }];
    requestBody.tool_choice = "required";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
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

    const text = compactReferenceLinks(extractResponseText(data));
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
