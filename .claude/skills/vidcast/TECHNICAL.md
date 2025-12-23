# VidCast 技術詳解

## 架構概覽

```
┌─────────────┐
│  User       │
│  Interface  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  VidCastWidget  │─────▶│  Firebase    │
│  (React)        │◀─────│  Auth        │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│  /api/summarize │
│  (Next.js API)  │
└────────┬────────┘
         │
         ├─────────────────┐
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  analyzeVideo() │  │  generateTTS()  │
│  (gemini.ts)    │  │  (gemini.ts)    │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌────────────────────────────────┐
│  Google Gemini API             │
│  - 2.5 Flash Lite (視頻分析)   │
│  - 2.5 Flash Preview TTS       │
└────────────────────────────────┘
```

## API 端點

### POST /api/summarize

**位置**: `app/api/summarize/route.ts`

**認證方式**:
1. **OAuth Token** (推薦)
   - 從 Firebase Auth 獲取
   - Header: `Authorization: Bearer {accessToken}`

2. **API Key**
   - 用戶自帶 Gemini API Key
   - Body: `{ apiKey: "..." }`

**請求格式**:
```typescript
interface SummarizeRequest {
  youtubeUrl: string;        // YouTube URL（必需）
  apiKey?: string;           // Gemini API Key（與 accessToken 二選一）
  accessToken?: string;      // Firebase OAuth Token（與 apiKey 二選一）
}
```

**請求範例**:
```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "accessToken": "ya29.a0AfH6SMBx..."
}
```

或

```json
{
  "youtubeUrl": "https://www.youtube.com/shorts/xxx",
  "apiKey": "AIzaSyD..."
}
```

**響應格式**:
```typescript
interface SummarizeResponse {
  summary: string;           // 播報式文字摘要
  audioUrl: string | null;   // TTS 音頻 (data:audio/wav;base64,...)
  user?: {
    email: string;
    name: string;
    picture: string;
  };
  ttsUsage?: {
    date: string;            // YYYY-MM-DD
    count: number;           // 今日使用次數
  };
}
```

**成功響應範例**:
```json
{
  "summary": "這段視頻介紹了最新的 AI 技術發展。首先，講者提到...",
  "audioUrl": "data:audio/wav;base64,UklGRiQAAABXQVZF...",
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  },
  "ttsUsage": {
    "date": "2025-12-24",
    "count": 3
  }
}
```

**錯誤響應**:
```typescript
interface ErrorResponse {
  error: string;             // 錯誤訊息
  details?: any;             // 詳細錯誤資訊（開發模式）
}
```

**錯誤範例**:
```json
{
  "error": "請輸入有效的 YouTube 連結"
}
```

---

## 核心模塊

### 1. YouTube URL 驗證

**位置**: `widgets/vidcast/gemini.ts`

**函式**: `validateYouTubeUrl(url: string)`

**支持的 URL 格式**:
```regex
/^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/
```

**範例**:
```typescript
validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
// { valid: true }

validateYouTubeUrl('https://www.youtube.com/shorts/abc123');
// { valid: true }

validateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
// { valid: true }

validateYouTubeUrl('https://example.com');
// { valid: false, error: '請輸入有效的 YouTube 連結' }
```

---

### 2. 視頻分析模塊

**位置**: `widgets/vidcast/gemini.ts`

**函式**:
- `analyzeVideo(apiKey: string, videoUrl: string)` - 使用 API Key
- `analyzeVideoWithToken(accessToken: string, videoUrl: string)` - 使用 OAuth

**Gemini 模型**: `gemini-2.5-flash-lite`

**Prompt 設計**:
```typescript
function generateBroadcastPrompt(): string {
  return `
請將這個視頻的內容改寫為一篇流暢易讀的文章摘要。

## 核心要求
- **完整性**：必須涵蓋視頻從開頭到結尾的所有重要內容
- **時間平衡**：前半段、中段、後半段必須均衡覆蓋
- **流暢性**：使用自然的段落過渡，不要使用格式標記
- **無時間戳**：不要標註時間區間

## 結構要求
1. 開頭用 1-2 句話簡潔概括視頻主題
2. 主體內容分為多個段落（依視頻長度調整）
3. 每段聚焦一個主題
4. 結尾用 1-2 句話總結全文

## 風格要求
- 語言：繁體中文
- 語氣：客觀專業、敘述流暢
- 文章形式：像新聞報導或深度文章
...
  `.trim();
}
```

**實現細節**:
```typescript
// 使用 API Key
async function analyzeVideo(apiKey: string, videoUrl: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = generateBroadcastPrompt();

  const result = await model.generateContent([
    {
      fileData: {
        mimeType: 'video/*',
        fileUri: videoUrl,
      },
    },
    { text: prompt },
  ]);

  return result.response.text();
}

// 使用 OAuth Token
async function analyzeVideoWithToken(
  accessToken: string,
  videoUrl: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { fileData: { mimeType: 'video/*', fileUri: videoUrl } },
          { text: generateBroadcastPrompt() },
        ],
      }],
    }),
  });

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
```

**錯誤處理**:
```typescript
try {
  const summary = await analyzeVideo(apiKey, videoUrl);
} catch (error: any) {
  if (error.message?.includes('API key')) {
    throw new Error('API Key 無效或已過期');
  } else if (error.message?.includes('quota') || error.message?.includes('429')) {
    throw new Error('API 配額已用完，請稍後再試');
  } else if (error.message?.includes('503') || error.message?.includes('overloaded')) {
    throw new Error('Google 服務暫時過載，請稍候 1-2 分鐘後再試');
  } else if (error.message?.includes('video')) {
    throw new Error('無法訪問該視頻，請確認視頻為公開狀態');
  }
  throw new Error('視頻分析失敗，請稍後再試');
}
```

---

### 3. TTS 語音合成模塊

**位置**: `widgets/vidcast/gemini.ts`

**函式**:
- `generateTTS(apiKey: string, text: string)` - 使用 API Key
- `generateTTSWithToken(accessToken: string, text: string)` - 使用 OAuth

**Gemini 模型**: `gemini-2.5-flash-preview-tts`

**音色**: `Kore`（自然、專業、中文友好）

**文字清理**:
```typescript
function cleanTextForTTS(text: string): string {
  return text
    // 移除 Markdown 標題符號
    .replace(/^#{1,6}\s+/gm, '')
    // 移除粗體和斜體
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // 移除列表符號
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 移除多餘空行
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

**長度限制**:
```typescript
const maxLength = 3000;  // 約 4500 tokens
const truncatedText = cleanedText.length > maxLength
  ? cleanedText.slice(0, maxLength) + '...'
  : cleanedText;
```

**PCM 轉 WAV**:
```typescript
function pcmToWav(pcmData: string): string {
  const pcmBuffer = Buffer.from(pcmData, 'base64');

  // WAV 文件頭參數
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;

  // 創建 44 bytes WAV header
  const header = Buffer.alloc(44);

  // RIFF chunk
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);          // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28);
  header.writeUInt16LE(numChannels * bitsPerSample / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  // 合併 header 和 PCM 數據
  const wavBuffer = Buffer.concat([header, pcmBuffer]);

  return `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
}
```

**完整實現**:
```typescript
async function generateTTS(apiKey: string, text: string): Promise<string | null> {
  try {
    const cleanedText = cleanTextForTTS(text);
    const truncatedText = cleanedText.length > 3000
      ? cleanedText.slice(0, 3000) + '...'
      : cleanedText;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-tts',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: truncatedText }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore',
            },
          },
        },
      },
    });

    const audioData = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      console.warn('TTS 生成失敗，未返回音頻數據');
      return null;
    }

    return pcmToWav(audioData);
  } catch (error) {
    console.error('TTS 生成錯誤:', error);
    return null;  // TTS 失敗不影響主流程
  }
}
```

---

## Firebase 認證

### 配置

**位置**: `lib/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

### OAuth 流程

```typescript
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

async function handleGoogleLogin() {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;  // 用於 Gemini API
  const user = result.user;

  return { accessToken, user };
}
```

---

## 環境變數

**必需的環境變數** (`.env.local`):

```bash
# Firebase 配置
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# 可選：Server-side Gemini API Key（用於測試）
GEMINI_API_KEY=AIzaSy...
```

---

## 性能考慮

### 視頻分析
- **平均時間**: 10-30 秒（取決於視頻長度）
- **超時設置**: 120 秒
- **重試策略**: 遇到 503 錯誤時提示用戶稍後重試

### TTS 生成
- **平均時間**: 2-5 秒/分鐘音頻
- **超時設置**: 60 秒
- **失敗處理**: 返回 null，不影響文字摘要

### 緩存策略
目前未實現緩存，每次請求都會調用 Gemini API。

**未來改進**:
```typescript
// Redis 緩存範例
const cacheKey = `vidcast:${youtubeUrl}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// ... 調用 Gemini ...

await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);  // 1 小時
```

---

## 錯誤處理

| 錯誤碼 | 說明 | 用戶友好訊息 |
|-------|------|------------|
| 400 | 無效 URL 格式 | "請輸入有效的 YouTube 連結" |
| 401 | API Key 無效 | "API Key 無效或已過期" |
| 403 | 無權訪問視頻 | "無法訪問該視頻，請確認視頻為公開狀態" |
| 429 | 配額限制 | "API 配額已用完，請稍後再試（或更換 API Key）" |
| 503 | 服務過載 | "Google 服務暫時過載，請稍候 1-2 分鐘後再試" |
| 500 | 其他錯誤 | "視頻分析失敗，請稍後再試" |

---

## 依賴項

**核心依賴**:
```json
{
  "@google/generative-ai": "^0.21.0",
  "firebase": "^10.7.0",
  "next": "^15.5.9",
  "react": "^19.0.0"
}
```

**開發依賴**:
```json
{
  "typescript": "^5.3.0",
  "@types/node": "^20.0.0",
  "@types/react": "^19.0.0"
}
```

---

## 安全性

### API Key 保護
- ✅ 用戶 API Key 存儲在 localStorage（僅客戶端）
- ✅ OAuth Token 通過 Firebase 管理
- ⚠️ 未加密存儲（瀏覽器 localStorage 本質上不安全）

### 建議改進
- 使用 Server-side API Key Pool
- 實現 Rate Limiting
- 添加 CAPTCHA 防止濫用

### CORS 設置
Next.js API Routes 默認允許所有來源，建議添加限制：

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  return NextResponse.next();
}
```

---

## 監控與日誌

### 日誌格式
```typescript
console.log('[Summarize] 開始分析視頻:', videoUrl);
console.log('[Summarize] 開始生成 TTS');
console.error('[Summarize] 錯誤:', error.message);
```

### 建議監控指標
- API 調用次數（per user, per day）
- 平均響應時間
- 錯誤率（按錯誤碼分類）
- TTS 使用量

### 未來改進
- 整合 Sentry 或 LogRocket
- 添加 Analytics 追蹤
- 實現用戶使用統計儀表板

---

## 版本歷史

### v1.0.0 (2025-12-24)
- 初始版本
- Gemini 2.5 Flash Lite 視頻分析
- Gemini 2.5 Flash Preview TTS
- Firebase Google OAuth
- TTS 使用計數器
- 播報式 Prompt 優化

---

## 相關文件

- [SKILL.md](./SKILL.md) - Skill 定義和使用說明
- [USAGE.md](./USAGE.md) - 使用示例
- [核心實現](../../../widgets/vidcast/gemini.ts)
- [API Route](../../../app/api/summarize/route.ts)
