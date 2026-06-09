"use client";

import { useMemo, useRef, useState } from "react";

type Ingredient = {
  cat: string;
  kcal: number;
  protein: number;
  fat: number;
  ca: number;
  p: number;
  note: string;
};

type RecipeItem = {
  name: string;
  grams: number;
  method: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const ingredients: Record<string, Ingredient> = {"鶏むね肉":{cat:"肉類",kcal:108,protein:22.3,fat:1.5,ca:5,p:200,note:"高タンパク・低脂肪。脂質不足に注意。"},"鶏もも肉":{cat:"肉類",kcal:190,protein:16.6,fat:14.2,ca:5,p:170,note:"脂質が増えやすい。皮あり/なしで大きく変わる。"},"牛赤身":{cat:"肉類",kcal:140,protein:20,fat:6,ca:5,p:180,note:"動物性タンパク源。脂質量は部位差あり。"},"豚赤身":{cat:"肉類",kcal:150,protein:21,fat:7,ca:4,p:190,note:"加熱推奨。脂質量は部位差あり。"},"丸鶏":{cat:"肉類",kcal:220,protein:18,fat:16,ca:10,p:170,note:"部位混合。骨なし前提の概算。"},"レバー":{cat:"内臓",kcal:111,protein:18.9,fat:3.1,ca:5,p:330,note:"栄養価が高い。入れすぎ注意。"},"ハツ":{cat:"内臓",kcal:135,protein:16.5,fat:7,ca:7,p:190,note:"筋肉寄りの内臓。比較的使いやすい。"},"砂肝":{cat:"内臓",kcal:94,protein:18.3,fat:1.8,ca:7,p:170,note:"低脂肪。食感が硬いため細かく。"},"卵":{cat:"その他",kcal:151,protein:12.3,fat:10.3,ca:51,p:180,note:"良質タンパク。加熱推奨。"},"卵殻カルシウム":{cat:"Ca源",kcal:0,protein:0,fat:0,ca:38000,p:0,note:"Ca補正用。少量で大きく変わるため注意。"},"かぼちゃ":{cat:"野菜",kcal:78,protein:1.9,fat:.3,ca:20,p:40,note:"便を硬くする方向に使いやすい。"},"大根":{cat:"野菜",kcal:18,protein:.5,fat:.1,ca:24,p:18,note:"水分多め。細かく・加熱推奨。"},"セロリ":{cat:"野菜",kcal:15,protein:.4,fat:.1,ca:39,p:24,note:"香りあり。少量から。"},"パセリ":{cat:"野菜",kcal:44,protein:3.7,fat:.7,ca:290,p:61,note:"微量栄養が豊富。多量ではなく少量利用。"},"ブロッコリー":{cat:"野菜",kcal:37,protein:4.3,fat:.5,ca:38,p:89,note:"細かく・加熱推奨。量は控えめから。"},"青梗菜":{cat:"野菜",kcal:9,protein:.6,fat:.1,ca:100,p:27,note:"低カロリー。加熱・細かく。"},"レタス":{cat:"野菜",kcal:12,protein:.6,fat:.1,ca:19,p:22,note:"水分が多い。栄養源というより補助。"},"パイナップル":{cat:"果物",kcal:54,protein:.6,fat:.1,ca:11,p:9,note:"糖質に注意。少量。"},"ブルーベリー":{cat:"果物",kcal:49,protein:.5,fat:.1,ca:8,p:9,note:"少量の補助。糖質量に注意。"},"ラズベリー":{cat:"果物",kcal:41,protein:1.1,fat:.1,ca:22,p:29,note:"少量の補助。"},"ブラックベリー":{cat:"果物",kcal:43,protein:1.4,fat:.5,ca:29,p:22,note:"少量の補助。"},"チアシード":{cat:"その他",kcal:486,protein:16.5,fat:30.7,ca:631,p:860,note:"可溶性繊維・脂質。入れすぎ注意。吸水推奨。"},"キビナゴ":{cat:"魚類",kcal:93,protein:18,fat:1.4,ca:100,p:190,note:"EPA/DHA・ビタミンD補助。小型魚で大型魚より水銀蓄積リスクは低め。無塩・加熱推奨。骨ごと利用時はCaが上振れしやすい。"},"子アジ":{cat:"魚類",kcal:112,protein:19.7,fat:4.5,ca:66,p:230,note:"EPA/DHA・ビタミンD補助。小型魚で大型魚より水銀蓄積リスクは低め。無塩・加熱推奨。骨ごと利用時はCaが上振れしやすい。"},"イワシ":{cat:"魚類",kcal:156,protein:19.2,fat:9.2,ca:74,p:230,note:"EPA/DHA・ビタミンD補助。小型魚で大型魚より水銀蓄積リスクは低め。脂質が増えやすいため量に注意。無塩・加熱推奨。"},"ニンジン":{cat:"野菜",kcal:35,protein:.7,fat:.2,ca:28,p:26,note:"βカロテン補給。発酵野菜材料として使いやすい。細かく刻み、加熱または発酵推奨。"}};

const seedRecipe: RecipeItem[] = [
  {name:"鶏むね肉",grams:250,method:"ボイル"},
  {name:"レバー",grams:15,method:"ボイル"},
  {name:"かぼちゃ",grams:30,method:"蒸す"},
  {name:"パセリ",grams:5,method:"蒸す"},
  {name:"ブルーベリー",grams:10,method:"そのまま"},
  {name:"チアシード",grams:3,method:"そのまま"}
];

const modelOptions = ["gpt-5.4-mini", "gpt-5.4", "gpt-5.5"];
const processingMethods = ["生", "蒸す", "ボイル", "発酵", "そのまま"];
const chatChips = [
  "ドッグフード原材料を評価して",
  "植物性タンパク質の注意点は？",
  "豆類が多いフードのリスクは？",
  "腎臓ケアフードの選び方",
  "加水分解タンパクとは？",
  "手作り食のCa:P比について"
];
const tabs = [
  { id: "chat", label: "💬 相談チャット" },
  { id: "homemade", label: "🥩 手作り食計算" },
  { id: "eval", label: "🔍 原材料評価" }
] as const;
type ActiveTab = typeof tabs[number]["id"];

function round(n: number, d = 2) {
  return Number.isFinite(n) ? Number(n.toFixed(d)).toString() : "計算不可";
}

function buildIngredientGroups() {
  const groups: Record<string, string[]> = {};
  for (const [name, data] of Object.entries(ingredients)) {
    (groups[data.cat] ??= []).push(name);
  }
  return groups;
}

function createRecipeText(recipe: RecipeItem[], weight: number, factor: number, purpose: string) {
  if (recipe.length === 0) return { ok: false, text: "食材を追加してください。" };
  if (!Number.isFinite(weight) || weight <= 0) {
    return { ok: false, text: "犬の体重は0より大きい数値で入力してください。" };
  }

  const totalG = recipe.reduce((s, x) => s + x.grams, 0);
  const sumBy = (fn: (item: RecipeItem, data: Ingredient) => number) =>
    recipe.reduce((s, it) => s + fn(it, ingredients[it.name]) * it.grams / 100, 0);
  const kcal = sumBy((i, d) => d.kcal);
  const protein = sumBy((i, d) => d.protein);
  const fat = sumBy((i, d) => d.fat);
  const ca = sumBy((i, d) => d.ca);
  const p = sumBy((i, d) => d.p);
  const rer = 70 * Math.pow(weight, .75);
  const der = rer * factor;
  const caP = p > 0 ? ca / p : NaN;
  const kcal100 = totalG > 0 ? kcal / totalG * 100 : NaN;
  const ca1000 = kcal > 0 ? ca / kcal * 1000 : NaN;
  const p1000 = kcal > 0 ? p / kcal * 1000 : NaN;
  const pe = kcal > 0 ? (protein * 4) / kcal * 100 : NaN;
  const fe = kcal > 0 ? (fat * 9) / kcal * 100 : NaN;
  const cats = recipe.map(x => ingredients[x.name].cat);
  const hasMeat = cats.includes("肉類") || cats.includes("魚類");
  const hasOrgan = cats.includes("内臓");
  const hasCa = recipe.some(x => ingredients[x.name].cat === "Ca源");
  const hasPumpkin = recipe.some(x => x.name === "かぼちゃ");
  const hasChia = recipe.some(x => x.name === "チアシード");
  const hasBoiledChicken = recipe.some(x => x.name.includes("鶏") && x.method === "ボイル");
  const rawMeat = recipe.some(x => (ingredients[x.name].cat === "肉類" || ingredients[x.name].cat === "魚類") && x.method === "生");
  const vegRaw = recipe.some(x => ingredients[x.name].cat === "野菜" && x.method === "そのまま");
  const liverG = recipe.filter(x => x.name === "レバー").reduce((s, x) => s + x.grams, 0);
  const flags: string[] = [];

  if (!hasMeat) flags.push("⚠️ 主たる動物性タンパク源が見当たりません。");
  if (!hasCa) flags.push("⚠️ 明確なカルシウム源がありません。肉中心ではCa不足になりやすいです。");
  if (!hasOrgan) flags.push("ℹ️ 内臓が入っていません。長期設計では微量栄養の確認が必要です。");
  if (liverG / totalG > .08) flags.push("⚠️ レバー比率が高めです。入れすぎに注意。");
  if (hasPumpkin) flags.push("✅ かぼちゃ入り。便を硬めに整える方向で役立つ場合があります。");
  if (hasChia) flags.push("✅ チアシード入り。可溶性繊維・脂質源として使えますが吸水と量に注意。");
  if (hasBoiledChicken) flags.push("ℹ️ 鶏肉ボイルあり。軟便対策として流水で軽く流す選択肢があります。");
  if (rawMeat) flags.push("⚠️ 生の動物性食材あり。犬側の適性だけでなく、人間側の衛生管理が必要です。");
  if (vegRaw) flags.push("⚠️ そのままの野菜があります。初心者は細かく刻み、加熱または発酵が無難です。");
  if (kcal <= 0) flags.push("⚠️ 総カロリーが0kcalのため、1000kcalあたりのCa/Pやエネルギー比は計算できません。");
  if (p <= 0) flags.push("⚠️ リンが0mgのため、Ca:P比は計算できません。");
  if (Number.isFinite(caP) && (caP < 1 || caP > 2)) flags.push("⚠️ Ca:P比が目安から外れている可能性があります。");

  const lines = recipe.map(x => `- ${x.name}: ${x.grams}g / ${ingredients[x.name].cat} / ${x.method} / ${ingredients[x.name].note}`).join("\n");
  const text = `【手作り食レシピ・初心者モード計算結果】\n目的: ${purpose}\n体重: ${round(weight,1)} kg\n活動係数: ${round(factor,1)}\nRER: ${round(rer,0)} kcal/day\nDER目安: ${round(der,0)} kcal/day\n\n【食材】\n${lines}\n\n【概算合計】\n総重量: ${round(totalG,0)} g\n総カロリー: ${round(kcal,0)} kcal\nkcal密度: ${round(kcal100,1)} kcal/100g\nタンパク質: ${round(protein,1)} g\n脂質: ${round(fat,1)} g\nタンパク質エネルギー比: ${round(pe,1)} %\n脂質エネルギー比: ${round(fe,1)} %\n\n【ミネラル概算】\nカルシウム: ${round(ca,0)} mg\nリン: ${round(p,0)} mg\nCa:P比: ${round(caP,2)}\nCa密度: ${round(ca1000,0)} mg/1000kcal\nP密度: ${round(p1000,0)} mg/1000kcal\n\n【自動チェック】\n${flags.length ? flags.join("\n") : "大きな自動警告はありません。ただし正式な栄養設計ではありません。"}\n\n【単位統一】\nCaとPはmgへ統一済みです。\nkcal、RER、DER、Ca:P比、1000kcalあたりCa/PはJavaScriptで計算済みです。\n\n【重要】\nこの数値は内蔵データベースによる概算です。正式な栄養設計、療法食、持病対応には使わず、評価の入口として扱ってください。`;
  return { ok: true, text };
}

export default function Page() {
  const ingredientGroups = useMemo(buildIngredientGroups, []);
  const firstIngredient = Object.keys(ingredients)[0];
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [model, setModel] = useState(modelOptions[0]);
  const [dogWeight, setDogWeight] = useState("14");
  const [dogAge, setDogAge] = useState("3");
  const [activityFactor, setActivityFactor] = useState("1.6");
  const [purpose, setPurpose] = useState("維持");
  const [ingredientName, setIngredientName] = useState(firstIngredient);
  const [ingredientGram, setIngredientGram] = useState("100");
  const [processingMethod, setProcessingMethod] = useState("蒸す");
  const [recipe, setRecipe] = useState<RecipeItem[]>(seedRecipe);
  const [recipeResult, setRecipeResult] = useState(() => createRecipeText(seedRecipe, 14, 1.6, "維持").text);
  const [lastRecipeText, setLastRecipeText] = useState(recipeResult);
  const [userInput, setUserInput] = useState("この手作り食レシピを犬に与える前提で評価してください。");
  const [evalInput, setEvalInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [meatCook, setMeatCook] = useState("ボイル");
  const [vegCook, setVegCook] = useState("発酵");
  const activeRequestId = useRef(0);

  function methodForIngredient(name: string) {
    const cat = ingredients[name].cat;
    if (cat === "肉類" || cat === "内臓" || cat === "魚類") return meatCook;
    if (cat === "野菜") return vegCook;
    return "そのまま";
  }

  function updateRecipeItem(name: string, patch: Partial<RecipeItem>) {
    setRecipe(current => current.map(item => item.name === name ? { ...item, ...patch } : item));
    setLastRecipeText("");
  }

  function toggleRecipeIngredient(name: string) {
    setRecipe(current => {
      const exists = current.some(item => item.name === name);
      if (exists) return current.filter(item => item.name !== name);
      return [...current, { name, grams: 100, method: methodForIngredient(name) }];
    });
    setLastRecipeText("");
  }

  function selectedItem(name: string) {
    return recipe.find(item => item.name === name);
  }

  function calculateCurrentRecipe() {
    const recipeForCalculation = recipe.map(item => ({ ...item, method: methodForIngredient(item.name) }));
    const result = createRecipeText(recipeForCalculation, Number(dogWeight), Number(activityFactor), purpose);
    setRecipeResult(result.text);
    setLastRecipeText(result.ok ? result.text : "");
    return result;
  }

  function addIngredient() {
    const grams = Number(ingredientGram);
    if (!ingredientName || !Number.isFinite(grams) || grams <= 0) {
      alert("食材と重量を確認してください。");
      return;
    }
    setRecipe(current => [...current, { name: ingredientName, grams, method: processingMethod }]);
    setLastRecipeText("");
  }

  function removeIngredient(index: number) {
    setRecipe(current => current.filter((_, i) => i !== index));
    setLastRecipeText("");
  }

  function activityLabel() {
    if (activityFactor === "1.2") return "低め";
    if (activityFactor === "2.0" || activityFactor === "3.0") return "高め";
    return "普通";
  }

  function makeHomemadePrompt(resultText: string) {
    return `以下の手作り食の計算値を評価してください。AIは再計算せず、この数値をそのまま使って評価してください。

【犬の情報】
- 体重: ${dogWeight}kg
- 年齢: ${dogAge || "不明"}歳
- 活動レベル: ${activityLabel()}
- 目的: ${purpose}

【調理方針】
- 肉・内臓: ${meatCook}
- 野菜: ${vegCook}

${resultText}

このバランスを評価し、改善点があれば承認食材リスト内で具体的に提案してください。
給与量については「ドライフードと同じ重量からスタートして徐々に調整する」前提で、実践しやすい順番でアドバイスしてください。`;
  }

  async function calculateAndAskAi() {
    const result = calculateCurrentRecipe();
    if (!result.ok) return;
    setActiveTab("chat");
    await sendMessage(makeHomemadePrompt(result.text));
  }

  function insertRecipeIntoPrompt() {
    const result = lastRecipeText ? { ok: true, text: lastRecipeText } : calculateCurrentRecipe();
    if (!result.ok) return;
    setUserInput(current => `${current.trim() ? current.trim() + "\n\n" : ""}${result.text}`);
    setActiveTab("chat");
  }

  async function sendMessage(overrideText?: string) {
    const content = (overrideText ?? userInput).trim();
    if (isSending) return;
    if (!content) {
      alert("相談内容を入力してください。");
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    const requestId = ++activeRequestId.current;
    setMessages(nextMessages);
    setUserInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/rain-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: nextMessages })
      });
      const data = await response.json();
      if (requestId !== activeRequestId.current) return;
      if (!response.ok) {
        setMessages(current => [...current, { role: "assistant", content: "エラー:\n" + JSON.stringify(data.error ?? data, null, 2) }]);
        return;
      }
      const text = typeof data.text === "string" && data.text.trim()
        ? data.text.trim()
        : JSON.stringify(data.raw ?? data, null, 2);
      setMessages(current => [...current, { role: "assistant", content: text }]);
    } catch (error) {
      if (requestId === activeRequestId.current) {
        const message = error instanceof Error ? error.message : "通信に失敗しました。";
        setMessages(current => [...current, { role: "assistant", content: "通信エラー:\n" + message }]);
      }
    } finally {
      if (requestId === activeRequestId.current) setIsSending(false);
    }
  }

  function clearChat() {
    if (isSending) {
      alert("送信中は会話履歴をクリアできません。通信完了後にもう一度実行してください。");
      return;
    }
    if (confirm("会話履歴をクリアしますか？")) {
      activeRequestId.current++;
      setMessages([]);
      setSaveStatus("");
    }
  }

  function saveConversation() {
    try {
      localStorage.setItem("rain_food_bio_mini_history", JSON.stringify(messages));
      setSaveStatus("✓ 保存しました " + new Date().toLocaleTimeString("ja-JP"));
      window.setTimeout(() => setSaveStatus(""), 3000);
    } catch {
      alert("保存に失敗しました");
    }
  }

  function downloadLog() {
    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    let text = "Rain Food専科 BIO mini v4.2 会話ログ\n日時: " + now.toLocaleString() + "\n\n";
    for (const m of messages) {
      text += (m.role === "user" ? "あなた:\n" : "Rain Food専科:\n") + m.content + "\n\n---\n\n";
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rain_food_senka_bio_mini_v4_2_log_" + stamp + ".txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function evalIngredients() {
    const input = evalInput.trim();
    if (!input) {
      alert("原材料を入力してください");
      return;
    }
    const prompt = `以下のドッグフードの原材料を詳しく評価してください。

${input}

以下の観点で評価してください：
1. 動物性タンパク質の質と原材料順位
2. 植物性タンパク質・豆類の確認と注意点
3. 油脂の種類と質
4. 総合評価（★1〜5）
5. 推奨する犬・注意が必要な犬
6. 改善点または代替フードの方向性

情報不足があっても、まず暫定評価と実践的な見方を出してください。追加確認事項だけで終えないでください。`;
    setActiveTab("chat");
    await sendMessage(prompt);
  }

  return (
    <div className="app">
      <header className="header">
        <img className="header-logo-img" src="/rain-bio-logo.png" alt="Rain Bio" />
        <div className="header-info">
          <div className="header-title">Food専科 BIO mini</div>
          <div className="header-sub">DOG FOOD EVALUATION AI · OpenAI/Vercel</div>
        </div>
        <div className="model-select">
          <select value={model} onChange={event => setModel(event.target.value)} aria-label="Model">
            {modelOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="status-dot" />
      </header>

      <nav className="tab-bar" aria-label="Main tabs">
        {tabs.map(tab => (
          <button
            className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {activeTab === "chat" && (
          <section className="chat-view">
            <div className="messages">
              {messages.length === 0 ? (
                <div className="msg-row">
                  <div className="avatar ai-av">🐾</div>
                  <div className="bubble ai-bubble">
                    <h2>Food専科 BIO mini へようこそ！</h2>
                    <p>ドッグフードの評価・手作り食サポートに特化したAIです。</p>
                    <ul>
                      <li>🔬 ドッグフードの原材料・成分評価</li>
                      <li>🥩 タンパク質の種類の詳細分析</li>
                      <li>🧮 手作り食の栄養計算とAI評価</li>
                      <li>💡 フード選びの実践的なアドバイス</li>
                    </ul>
                    <p>気になるフードの原材料を教えてください。「原材料評価」タブも便利です。</p>
                  </div>
                </div>
              ) : messages.map((message, index) => (
                <div className={`msg-row${message.role === "user" ? " user" : ""}`} key={index}>
                  <div className={`avatar ${message.role === "user" ? "user-av" : "ai-av"}`}>
                    {message.role === "user" ? "👤" : "🐾"}
                  </div>
                  <div className={`bubble ${message.role === "user" ? "user-bubble" : "ai-bubble"}`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="msg-row">
                  <div className="avatar ai-av">🐾</div>
                  <div className="bubble ai-bubble">
                    <div className="typing-dots"><span /><span /><span /></div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "homemade" && (
          <section className="homemade-view">
            <div className="card">
              <div className="card-title">🐕 犬の基本情報</div>
              <div className="amount-row">
                <div className="amount-label">体重</div>
                <input className="amount-input" type="number" min="0.1" step="0.1" value={dogWeight} onChange={event => setDogWeight(event.target.value)} />
                <div className="amount-unit">kg</div>
              </div>
              <div className="amount-row">
                <div className="amount-label">年齢</div>
                <input className="amount-input" type="number" min="0" max="25" value={dogAge} onChange={event => setDogAge(event.target.value)} />
                <div className="amount-unit">歳</div>
              </div>
              <div className="cooking-group">
                <div className="cooking-label">活動レベル</div>
                <div className="cooking-options">
                  {[
                    ["1.2", "低め"],
                    ["1.6", "普通"],
                    ["2.0", "高め"]
                  ].map(([value, label]) => (
                    <button className={`radio-btn${activityFactor === value ? " active" : ""}`} type="button" key={value} onClick={() => setActivityFactor(value)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cooking-group">
                <div className="cooking-label">目的</div>
                <div className="cooking-options">
                  {["維持","減量","体重増加","便改善","競技・活動犬"].map(value => (
                    <button className={`radio-btn${purpose === value ? " active" : ""}`} type="button" key={value} onClick={() => setPurpose(value)}>
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">🥩 食材を選ぶ（グラム数を入力）</div>
              {Object.entries(ingredientGroups).map(([cat, names]) => (
                <div key={cat}>
                  <div className="section-label">{cat}</div>
                  <div className="ingredient-grid">
                    {names.map(name => {
                      const item = selectedItem(name);
                      return (
                        <div
                          className={`ingredient-item${item ? " selected" : ""}`}
                          key={name}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleRecipeIngredient(name)}
                          onKeyDown={event => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleRecipeIngredient(name);
                            }
                          }}
                        >
                          <span className="ingredient-check">✓</span>
                          <span className="ingredient-label">{name}</span>
                          {item && (
                            <span className="gram-input-wrap" onClick={event => event.stopPropagation()}>
                              <input className="gram-input" type="number" min="1" step="5" value={item.grams} onChange={event => updateRecipeItem(name, { grams: Number(event.target.value) || 0 })} />
                              <span className="gram-unit">g</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title">🍳 調理方法</div>
              <div className="cooking-group">
                <div className="cooking-label">肉・内臓の調理</div>
                <div className="cooking-options">
                  {["生","蒸す","ボイル"].map(value => (
                    <button className={`radio-btn${meatCook === value ? " active" : ""}`} type="button" key={value} onClick={() => setMeatCook(value)}>
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cooking-group">
                <div className="cooking-label">野菜の調理</div>
                <div className="cooking-options">
                  {["発酵","蒸す","ボイル","生"].map(value => (
                    <button className={`radio-btn${vegCook === value ? " active" : ""}`} type="button" key={value} onClick={() => setVegCook(value)}>
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <button className="calc-btn" type="button" onClick={calculateAndAskAi}>🧮 栄養を計算してAIに評価してもらう</button>
              <button className="calc-sub-btn" type="button" onClick={insertRecipeIntoPrompt}>計算結果だけ相談欄へ入れる</button>
              <div className="result-box">{recipeResult}</div>
            </div>
          </section>
        )}

        {activeTab === "eval" && (
          <section className="eval-view">
            <div className="card">
              <div className="card-title">🔬 ドッグフード原材料評価</div>
              <div className="hint-box">
                <strong>入力のヒント：</strong>パッケージの「原材料名」欄の内容をそのまま貼り付けてください。
                保証成分（タンパク質○%など）も一緒に入力するとより詳しく評価できます。
              </div>
              <textarea
                className="eval-textarea"
                value={evalInput}
                onChange={event => setEvalInput(event.target.value)}
                placeholder={"例：鶏肉、エンドウ豆タンパク、玄米、サーモン、鶏脂、エンドウ豆デンプン、乾燥ビート果肉...\n\n保証成分：粗タンパク質 26%以上、粗脂肪 14%以上、粗繊維 5%以下、水分 10%以下"}
              />
              <button className="eval-btn" type="button" onClick={evalIngredients}>🔍 原材料を評価する</button>
            </div>
          </section>
        )}
      </main>

      <footer className="input-area">
        <div className="chips">
          {chatChips.map(chip => (
            <button className="chip" type="button" key={chip} onClick={() => { setActiveTab("chat"); void sendMessage(chip); }}>
              {chip}
            </button>
          ))}
        </div>
        <div className="action-row">
          <button className="btn-action" type="button" onClick={saveConversation}>💾 保存</button>
          <button className="btn-action" type="button" onClick={downloadLog}>📤 エクスポート</button>
          <button className="btn-action danger" type="button" disabled={isSending} onClick={clearChat}>🗑 クリア</button>
          <span className="save-status">{saveStatus}</span>
        </div>
        <div className="input-row">
          <textarea
            value={userInput}
            placeholder="ドッグフードについて質問してください..."
            rows={1}
            onChange={event => setUserInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button className="send-btn" type="button" disabled={isSending} onClick={() => void sendMessage()}>
            {isSending ? "…" : "➤"}
          </button>
        </div>
      </footer>
    </div>
  );
}
