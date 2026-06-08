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

const ingredients: Record<string, Ingredient> = {"鶏むね肉":{cat:"肉類",kcal:108,protein:22.3,fat:1.5,ca:5,p:200,note:"高タンパク・低脂肪。脂質不足に注意。"},"鶏もも肉":{cat:"肉類",kcal:190,protein:16.6,fat:14.2,ca:5,p:170,note:"脂質が増えやすい。皮あり/なしで大きく変わる。"},"牛赤身":{cat:"肉類",kcal:140,protein:20,fat:6,ca:5,p:180,note:"動物性タンパク源。脂質量は部位差あり。"},"豚赤身":{cat:"肉類",kcal:150,protein:21,fat:7,ca:4,p:190,note:"加熱推奨。脂質量は部位差あり。"},"丸鶏":{cat:"肉類",kcal:220,protein:18,fat:16,ca:10,p:170,note:"部位混合。骨なし前提の概算。"},"レバー":{cat:"内臓",kcal:111,protein:18.9,fat:3.1,ca:5,p:330,note:"栄養価が高い。入れすぎ注意。"},"ハツ":{cat:"内臓",kcal:135,protein:16.5,fat:7,ca:7,p:190,note:"筋肉寄りの内臓。比較的使いやすい。"},"砂肝":{cat:"内臓",kcal:94,protein:18.3,fat:1.8,ca:7,p:170,note:"低脂肪。食感が硬いため細かく。"},"卵":{cat:"その他",kcal:151,protein:12.3,fat:10.3,ca:51,p:180,note:"良質タンパク。加熱推奨。"},"卵殻カルシウム":{cat:"Ca源",kcal:0,protein:0,fat:0,ca:38000,p:0,note:"Ca補正用。少量で大きく変わるため注意。"},"かぼちゃ":{cat:"野菜",kcal:78,protein:1.9,fat:.3,ca:20,p:40,note:"便を硬くする方向に使いやすい。"},"大根":{cat:"野菜",kcal:18,protein:.5,fat:.1,ca:24,p:18,note:"水分多め。細かく・加熱推奨。"},"セロリ":{cat:"野菜",kcal:15,protein:.4,fat:.1,ca:39,p:24,note:"香りあり。少量から。"},"パセリ":{cat:"野菜",kcal:44,protein:3.7,fat:.7,ca:290,p:61,note:"微量栄養が豊富。多量ではなく少量利用。"},"ブロッコリー":{cat:"野菜",kcal:37,protein:4.3,fat:.5,ca:38,p:89,note:"細かく・加熱推奨。量は控えめから。"},"青梗菜":{cat:"野菜",kcal:9,protein:.6,fat:.1,ca:100,p:27,note:"低カロリー。加熱・細かく。"},"レタス":{cat:"野菜",kcal:12,protein:.6,fat:.1,ca:19,p:22,note:"水分が多い。栄養源というより補助。"},"パイナップル":{cat:"果物",kcal:54,protein:.6,fat:.1,ca:11,p:9,note:"糖質に注意。少量。"},"ブルーベリー":{cat:"果物",kcal:49,protein:.5,fat:.1,ca:8,p:9,note:"少量の補助。糖質量に注意。"},"ラズベリー":{cat:"果物",kcal:41,protein:1.1,fat:.1,ca:22,p:29,note:"少量の補助。"},"ブラックベリー":{cat:"果物",kcal:43,protein:1.4,fat:.5,ca:29,p:22,note:"少量の補助。"},"チアシード":{cat:"その他",kcal:486,protein:16.5,fat:30.7,ca:631,p:860,note:"可溶性繊維・脂質。入れすぎ注意。吸水推奨。"}};

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
const secondBrainTags = [
  "#Nutrition:Chicken",
  "#Nutrition:ChickenLiver",
  "#Nutrition:Pumpkin",
  "#Nutrition:FermentedVeg",
  "#Health:StemCell",
  "#Knowledge:CalcRules",
  "#Knowledge:Evidence",
  "#Knowledge:CommRules"
];
const quickPrompts = [
  { label: "🍖 フード分析", text: "このフードの原材料と保証成分を、犬の栄養設計として評価してください。" },
  { label: "🩺 体調相談", text: "犬の体調について、栄養・生活管理の観点から確認すべき点を整理してください。" },
  { label: "🧠 行動相談", text: "犬の行動について、体調・環境・栄養面も含めて原因候補を整理してください。" },
  { label: "🐾 シニアケア", text: "シニア犬の食事と生活管理について、注意点を整理してください。" },
  { label: "🔬 再生医療", text: "犬の再生医療について、期待できることと限界、確認すべき点を整理してください。" }
];

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
  const hasMeat = cats.includes("肉類");
  const hasOrgan = cats.includes("内臓");
  const hasCa = recipe.some(x => ingredients[x.name].cat === "Ca源");
  const hasPumpkin = recipe.some(x => x.name === "かぼちゃ");
  const hasChia = recipe.some(x => x.name === "チアシード");
  const hasBoiledChicken = recipe.some(x => x.name.includes("鶏") && x.method === "ボイル");
  const rawMeat = recipe.some(x => ingredients[x.name].cat === "肉類" && x.method === "生");
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
  if (rawMeat) flags.push("⚠️ 生肉あり。犬側の適性だけでなく、人間側の衛生管理が必要です。");
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
  const [model, setModel] = useState(modelOptions[0]);
  const [dogWeight, setDogWeight] = useState("14");
  const [activityFactor, setActivityFactor] = useState("1.6");
  const [purpose, setPurpose] = useState("維持");
  const [ingredientName, setIngredientName] = useState(firstIngredient);
  const [ingredientGram, setIngredientGram] = useState("100");
  const [processingMethod, setProcessingMethod] = useState("蒸す");
  const [recipe, setRecipe] = useState<RecipeItem[]>(seedRecipe);
  const [recipeResult, setRecipeResult] = useState(() => createRecipeText(seedRecipe, 14, 1.6, "維持").text);
  const [lastRecipeText, setLastRecipeText] = useState(recipeResult);
  const [recipeOpen, setRecipeOpen] = useState(true);
  const [userInput, setUserInput] = useState("この手作り食レシピを犬に与える前提で評価してください。");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const activeRequestId = useRef(0);

  function calculateCurrentRecipe() {
    const result = createRecipeText(recipe, Number(dogWeight), Number(activityFactor), purpose);
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

  function insertRecipeIntoPrompt() {
    const result = lastRecipeText ? { ok: true, text: lastRecipeText } : calculateCurrentRecipe();
    if (!result.ok) return;
    setUserInput(current => `${current.trim() ? current.trim() + "\n\n" : ""}${result.text}`);
  }

  async function sendMessage() {
    const content = userInput.trim();
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

  return (
    <div className="app-shell">
      <header className="rain-header">
        <div className="brand-lockup">
          <img className="brand-logo" src="/rain-bio-logo.png" alt="R.A.I.N.BIO logo" />
          <div>
            <h1>R.A.I.N.BIO</h1>
            <p>Canine Life Consultant · Life before profit</p>
          </div>
        </div>
        <span className="status-dot" aria-label="online" />
      </header>

      <nav className="second-brain" aria-label="Second Brain tags">
        <span className="second-brain-label">Second Brain:</span>
        {secondBrainTags.map(tag => <span className="brain-tag" key={tag}>{tag}</span>)}
      </nav>

      <main className="rain-main">
        <section className="recipe-panel">
          <div className="collapsible-head">
            <div>
              <h2>かんたん手作り食チェック</h2>
              <p className="sub">CaやPを直接入力せず、食材と重量から概算します。</p>
            </div>
            <button
              className="collapse-toggle"
              type="button"
              aria-expanded={recipeOpen}
              onClick={() => setRecipeOpen(open => !open)}
            >
              {recipeOpen ? "閉じる" : "開く"}
            </button>
          </div>
          <div className={`collapsible-body${recipeOpen ? "" : " collapsed"}`}>
            <div className="row3">
              <div>
                <label>犬の体重 kg</label>
                <input type="number" step="0.1" min="0.1" value={dogWeight} onChange={event => setDogWeight(event.target.value)} />
              </div>
              <div>
                <label>活動係数</label>
                <select value={activityFactor} onChange={event => setActivityFactor(event.target.value)}>
                  <option value="1.2">減量・低活動 1.2</option>
                  <option value="1.4">避妊去勢済み成犬 1.4</option>
                  <option value="1.6">通常成犬 1.6</option>
                  <option value="2.0">活動犬 2.0</option>
                  <option value="3.0">高活動・競技犬 3.0</option>
                </select>
              </div>
              <div>
                <label>目的</label>
                <select value={purpose} onChange={event => setPurpose(event.target.value)}>
                  <option value="維持">維持</option>
                  <option value="減量">減量</option>
                  <option value="体重増加">体重増加</option>
                  <option value="便改善">便改善</option>
                  <option value="競技・活動犬">競技・活動犬</option>
                </select>
              </div>
            </div>
            <h3>食材を追加</h3>
            <div className="row4">
              <div>
                <label>食材</label>
                <select value={ingredientName} onChange={event => setIngredientName(event.target.value)}>
                  {Object.entries(ingredientGroups).map(([cat, names]) => (
                    <optgroup key={cat} label={cat}>
                      {names.map(name => <option key={name} value={name}>{name}（{ingredients[name].cat}）</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label>重量 g</label>
                <input type="number" step="0.1" value={ingredientGram} onChange={event => setIngredientGram(event.target.value)} />
              </div>
              <div>
                <label>加工方法</label>
                <select value={processingMethod} onChange={event => setProcessingMethod(event.target.value)}>
                  {processingMethods.map(method => <option key={method} value={method}>{method}</option>)}
                </select>
              </div>
              <div><button className="soft" type="button" onClick={addIngredient}>追加</button></div>
            </div>
            <div className="recipe-tags">
              {recipe.map((item, index) => <span className="pill" key={`${item.name}-${index}`}>{item.name} {item.grams}g</span>)}
            </div>
            <table>
              <thead><tr><th>食材</th><th>分類</th><th>重量</th><th>加工</th><th>削除</th></tr></thead>
              <tbody>
                {recipe.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td>{item.name}</td>
                    <td>{ingredients[item.name].cat}</td>
                    <td>{item.grams}g</td>
                    <td>{item.method}</td>
                    <td><button className="danger table-action" type="button" onClick={() => removeIngredient(index)}>削除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="recipe-actions">
              <button className="green" type="button" onClick={calculateCurrentRecipe}>レシピを計算する</button>
              <button className="secondary" type="button" onClick={insertRecipeIntoPrompt}>計算結果を相談文へ入れる</button>
            </div>
            <div className="result-box">{recipeResult}</div>
          </div>
        </section>

        <section className="conversation-panel" aria-label="Rain Food専科 conversation">
          <div className="chat">
            {messages.length === 0 ? (
              <div className="welcome-note">
                <h2>Rain&apos;s words</h2>
                <p>Numbers reveal what eyes cannot see. Tell me what you seek, and I will find it.</p>
                <p className="small">レシピ計算、フード分析、体調相談を下の入力欄から始められます。</p>
              </div>
            ) : messages.map((message, index) => (
              <div className={`msg ${message.role === "user" ? "user" : "assistant"}`} key={index}>
                {(message.role === "user" ? "あなた:\n" : "Rain Food専科:\n") + message.content}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="composer-bar">
        <div className="utility-actions">
          <button className="ghost" type="button" onClick={downloadLog}>💾 保存</button>
          <button className="ghost primary-ghost" type="button" onClick={downloadLog}>📥 TXTエクスポート</button>
          <button className="ghost" type="button" disabled={isSending} onClick={clearChat}>🗑 クリア</button>
          <div className="model-control">
            <label>Model</label>
            <select value={model} onChange={event => setModel(event.target.value)}>
              {modelOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>
        <div className="quick-actions">
          {quickPrompts.map(prompt => (
            <button className="quick-chip" type="button" key={prompt.label} onClick={() => setUserInput(prompt.text)}>
              {prompt.label}
            </button>
          ))}
        </div>
        <div className="input-row">
          <button className="attach-button" type="button" aria-label="添付">📎</button>
          <textarea
            value={userInput}
            placeholder="犬種・年齢・体重・ご相談内容を入力..."
            onChange={event => setUserInput(event.target.value)}
          />
          <button className="send-button" type="button" disabled={isSending} onClick={sendMessage}>
            {isSending ? "…" : "▶"}
          </button>
        </div>
        <p className="composer-note">OpenAI APIキーはブラウザには表示・保存されません。Vercel/ローカル環境の OPENAI_API_KEY をサーバー側API Routeだけが使用します。</p>
      </footer>
    </div>
  );
}
