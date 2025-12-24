# LINE Chatbot 整合 VidCast - 網頁連結方案

## 目標

在 LINE Chatbot 中貼上 YouTube URL，處理完成後發送可分享的**網頁連結**，用戶點擊連結即可看到音頻播放器 + 文字摘要。

---

## 方案概述

**流程**：
```
用戶在 LINE 貼上 YouTube URL
    ↓
LINE Webhook 接收訊息
    ↓
調用 VidCast API (/api/summarize)
    ↓
儲存結果到 Firebase Firestore
    ↓
生成分享連結 (cayoh.run/v/abc123)
    ↓
透過 LINE Messaging API 發送連結
    ↓
用戶點擊連結 → 看到播放頁面（音頻 + 文字）
```

**優點**：
- ✅ 不需要處理音頻格式轉換
- ✅ 不需要處理 LINE 1 分鐘時長限制
- ✅ 不需要上傳音頻到雲端儲存（已有 base64 data URI）
- ✅ 用戶可以在瀏覽器中播放音頻
- ✅ 可以分享連結給其他人
- ✅ 實現簡單

---

## 技術架構

### 1. LINE Chatbot Backend

**位置**：新建 `/app/api/line/webhook/route.ts`

**功能**：
- 接收 LINE webhook 事件
- 驗證 LINE signature
- 提取 YouTube URL
- 調用 `/api/summarize` API
- 儲存結果到 Firestore
- 生成分享 ID
- 發送 LINE 訊息（包含連結）

### 2. 結果儲存（Firebase Firestore）

**Collection**: `vidcast_results`

**Document 結構（v1.1.0）**：
```typescript
{
  id: string;              // 短 ID (例如: "abc123")
  videoUrl: string;        // 原始 YouTube URL（v1.1.0: 統一使用 videoUrl）
  textSummary: string;     // 文字摘要（v1.1.0: textSummary 非 summary）
  facts: Array<{id, time, fact}>;  // v1.1.0: 事實清單
  confidence: 'high' | 'medium' | 'low';  // v1.1.0: 可信度指標
  audioUrl: string;        // base64 audio data URI（來自 /api/tts）
  createdAt: Timestamp;    // 建立時間
  userId?: string;         // LINE 用戶 ID（可選）
  expiresAt?: Timestamp;   // 過期時間（可選，7天後）
}
```

### 3. 結果展示頁面

**位置**：新建 `/app/v/[id]/page.tsx`

**功能**：
- 從 Firestore 讀取結果
- 渲染音頻播放器（HTML5 audio）
- 顯示文字摘要
- 類似截圖中的 UI 設計

---

## 實作步驟

### Step 1：建立 Firestore Collection

**文件**：`lib/firebase.ts`（已存在）

**操作**：
1. 確認 Firestore 已初始化
2. 新增 `vidcast_results` collection 規則到 Firebase Console

### Step 2：建立 LINE Webhook API

**新建文件**：`/app/api/line/webhook/route.ts`

**關鍵邏輯**：
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Client, WebhookEvent, MessageEvent } from '@line/bot-sdk';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// LINE 配置
const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-line-signature');

  // 驗證 LINE signature
  // ...

  const events: WebhookEvent[] = JSON.parse(body).events;

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const youtubeUrl = extractYouTubeUrl(event.message.text);

      if (youtubeUrl) {
        // 1. 發送處理中訊息
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '正在分析視頻，請稍候...'
        });

        // 2. 調用 VidCast API（字幕優先架構 v1.1.0）
        const summarizeResult = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: youtubeUrl,  // v1.1.0: 參數名為 videoUrl
            apiKey: process.env.GEMINI_API_KEY, // 使用伺服器端 API Key
          }),
        });

        const { textSummary, facts, confidence } = await summarizeResult.json();  // v1.1.0: textSummary（非 summary）

        // 3. 調用 TTS API（分離的端點）
        const ttsResult = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textSummary,
            apiKey: process.env.GEMINI_API_KEY,
          }),
        });

        const { audioUrl } = await ttsResult.json();

        // 4. 儲存到 Firestore
        const shortId = generateShortId(); // 6 位隨機字串
        await addDoc(collection(db, 'vidcast_results'), {
          id: shortId,
          videoUrl: youtubeUrl,  // v1.1.0: 統一使用 videoUrl
          textSummary,           // v1.1.0: textSummary（非 summary）
          facts,                 // v1.1.0: 事實清單
          confidence,            // v1.1.0: 可信度指標
          audioUrl,
          createdAt: new Date(),
          userId: event.source.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天後過期
        });

        // 5. 發送結果連結
        const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/v/${shortId}`;
        await client.pushMessage(event.source.userId!, {
          type: 'text',
          text: `✅ 視頻分析完成！\n\n🔗 查看結果：${shareUrl}`
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

function extractYouTubeUrl(text: string): string | null {
  const patterns = [
    /https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  return null;
}
```

### Step 3：建立結果展示頁面

**新建文件**：`/app/v/[id]/page.tsx`

**關鍵邏輯**：
```typescript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';

export default async function ResultPage({ params }: { params: { id: string } }) {
  // 從 Firestore 讀取結果
  const docRef = doc(db, 'vidcast_results', params.id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    notFound();
  }

  const { textSummary, facts, confidence, audioUrl, videoUrl, createdAt } = docSnap.data();  // v1.1.0

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 可信度指標 */}
        {confidence && (
          <div className={`mb-4 px-3 py-1 rounded inline-block text-sm ${
            confidence === 'high' ? 'bg-green-900 text-green-200' :
            confidence === 'medium' ? 'bg-yellow-900 text-yellow-200' :
            'bg-red-900 text-red-200'
          }`}>
            可信度：{confidence === 'high' ? '高' : confidence === 'medium' ? '中' : '低'}
          </div>
        )}

        {/* 音頻播放器 */}
        <div className="mb-8 bg-zinc-900 rounded-lg p-6">
          <audio
            controls
            className="w-full"
            src={audioUrl}
          >
          </audio>
        </div>

        {/* 文字摘要 */}
        <div className="bg-zinc-900 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">視頻摘要</h2>
          <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {textSummary}
          </p>
        </div>

        {/* 元數據 */}
        <div className="mt-4 text-sm text-zinc-500">
          <p>YouTube URL: {videoUrl}</p>
          <p>生成時間: {new Date(createdAt).toLocaleString('zh-TW')}</p>
        </div>
      </div>
    </div>
  );
}
```

### Step 4：配置環境變數

**文件**：`.env.local`

**新增**：
```env
# LINE Bot 配置
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Gemini API Key（伺服器端使用）
GEMINI_API_KEY=your_gemini_api_key

# Base URL
NEXT_PUBLIC_BASE_URL=https://cayoh.run
```

### Step 5：部署 LINE Webhook

**操作**：
1. 部署到 Vercel
2. 在 LINE Developers Console 設定 Webhook URL:
   `https://cayoh.run/api/line/webhook`
3. 啟用 Webhook

---

## 關鍵文件

**新建文件**：
- `/app/api/line/webhook/route.ts` - LINE webhook 處理
- `/app/v/[id]/page.tsx` - 結果展示頁面

**修改文件**：
- `lib/firebase.ts` - 確認 Firestore 已初始化
- `.env.local` - 新增 LINE 配置

**現有可重用**：
- `/app/api/summarize/route.ts` - VidCast API（無需修改）
- `lib/vidcast-core.ts` - 核心邏輯（無需修改）

---

## 用戶體驗流程

1. **用戶在 LINE 貼上 URL**：
   ```
   用戶: https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```

2. **Bot 回覆處理中**：
   ```
   Bot: 正在分析視頻，請稍候...
   ```

3. **處理完成發送連結**：
   ```
   Bot: ✅ 視頻分析完成！

   🔗 查看結果：https://cayoh.run/v/abc123
   ```

4. **用戶點擊連結**：
   - 開啟瀏覽器
   - 看到播放頁面（音頻播放器 + 文字摘要）
   - 可以播放音頻、閱讀摘要、分享連結

---

## 技術考量

### 1. Firestore 成本

- **讀取**：每次訪問結果頁面 = 1 次讀取
- **寫入**：每次生成結果 = 1 次寫入
- **免費額度**：50K 讀取/天，20K 寫入/天（足夠個人使用）

### 2. 音頻儲存

- **方式**：直接儲存 base64 data URI 到 Firestore
- **大小**：約 2-3 分鐘音頻 ≈ 1-2 MB（Firestore 單文件限制 1 MB）
- **如果超過 1 MB**：需改用 Firebase Storage 儲存音頻檔案

### 3. 過期處理

- **TTL**：7 天後自動過期
- **清理**：使用 Firebase Functions 定期刪除過期文件

### 4. 安全性

- **LINE Signature 驗證**：防止偽造請求
- **Firestore Rules**：限制讀取權限
- **API Key**：使用伺服器端 Gemini API Key，不暴露給客戶端

---

## 預估開發時間

- **Step 1**：10 分鐘（Firestore 初始化）
- **Step 2**：30 分鐘（LINE Webhook API）
- **Step 3**：20 分鐘（結果展示頁面）
- **Step 4**：5 分鐘（環境變數配置）
- **Step 5**：10 分鐘（部署和測試）

**總計**：約 1.5 小時

---

## 後續優化

1. **短連結優化**：改用更短的 ID（例如 4 位）
2. **UI 美化**：結果頁面使用 cayoh.run 的設計風格
3. **錯誤處理**：YouTube URL 無效、API 失敗時的友好提示
4. **使用追蹤**：記錄用戶使用次數、熱門視頻等
5. **音頻下載**：提供下載音頻檔案的按鈕

---

## VidCast Skill 位置

VidCast 已包裝為 Claude Code Skill，位於：

```
.claude/skills/vidcast/
├── SKILL.md           # Skill 定義（YAML frontmatter）
├── TECHNICAL.md       # 技術文檔（API 規範、架構）
└── USAGE.md          # 使用範例（Claude Code、Agent SDK、LINE Chatbot）
```

核心邏輯模組位於：
```
lib/vidcast-core.ts    # 可重用的核心函式
```
