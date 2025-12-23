# 🎬 VidCast - YouTube 播報式總結生成器

## 產品概述

一個 Web 應用，輸入 YouTube 連結，利用 **Gemini API** 多模態能力直接分析視頻內容（無需字幕），一鍵生成「播報式」文字總結 + 語音版本。

---

## 🔑 核心優勢：Gemini 原生 YouTube 支援

Gemini API 直接接受 YouTube URL，**不需要下載視頻**：

```python
from google import genai
from google.genai import types

client = genai.Client(api_key=user_api_key)

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=types.Content(
        parts=[
            types.Part(
                file_data=types.FileData(
                    file_uri='https://www.youtube.com/watch?v=VIDEO_ID'
                )
            ),
            types.Part(text='請為這個視頻生成播報式總結...')
        ]
    )
)
```

### API 能力

| 功能 | 說明 |
|------|------|
| **視頻理解** | 每秒 1 幀採樣 + 音頻處理，無需字幕 |
| **最長支援** | 2 小時視頻（2M context window） |
| **原生 TTS** | Gemini 2.5 TTS 多音色、情感控制 |
| **限制** | 每日 8 小時、僅公開視頻、每次 1 個視頻 |

---

## 🏗️ 簡化架構

```
┌────────────────────────────────────────────────────────┐
│              Frontend (Next.js)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Google OAuth │  │ YouTube URL  │  │ 結果展示     │  │
│  │    登入      │  │    輸入      │  │ 文字 + 音頻  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│              API Routes (Next.js)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  /api/summarize                                  │   │
│  │  - 接收 YouTube URL + 用戶 API Key              │   │
│  │  - 調用 Gemini 分析視頻                          │   │
│  │  - 調用 Gemini TTS 生成語音                      │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│              External Services                          │
│  ┌──────────────┐              ┌──────────────────┐    │
│  │ Firebase     │              │ Gemini API       │    │
│  │ Auth         │              │ (用戶自帶 Key)   │    │
│  └──────────────┘              └──────────────────┘    │
└────────────────────────────────────────────────────────┘
```

**簡化點**：
- ✅ 純前端 + API Routes，不需要獨立後端
- ✅ 不需要視頻下載/存儲
- ✅ 部署到 Vercel 一鍵完成

---

## 📋 處理流程

```
YouTube URL 輸入
      │
      ▼
┌─────────────────┐
│  驗證 URL 格式  │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Gemini API     │  ← 直接傳 YouTube URL，無需下載
│  視頻分析       │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  生成播報稿     │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Gemini TTS     │
│  生成語音       │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  返回結果       │
│  文字 + 音頻    │
└─────────────────┘
```

---

## 🛠️ 完整代碼實現

### 專案結構

```
video-summarizer/
├── app/
│   ├── page.tsx              # 主頁面
│   ├── layout.tsx            # 佈局
│   └── api/
│       └── summarize/
│           └── route.ts      # API 端點
├── lib/
│   ├── firebase.ts           # Firebase 配置
│   └── gemini.ts             # Gemini 封裝
├── components/
│   ├── LoginButton.tsx
│   ├── ApiKeyInput.tsx
│   ├── VideoInput.tsx
│   └── ResultDisplay.tsx
└── package.json
```

### 1. Firebase 配置 (`lib/firebase.ts`)

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

### 2. API Route (`app/api/summarize/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, apiKey, style = 'news_anchor' } = await req.json();

    // 驗證 YouTube URL
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    if (!ytRegex.test(videoUrl)) {
      return NextResponse.json({ error: '請輸入有效的 YouTube 連結' }, { status: 400 });
    }

    // 初始化 Gemini
    const genai = new GoogleGenAI({ apiKey });

    // 播報式 Prompt
    const prompt = `
請以專業新聞播報員的風格，為這個視頻生成一份完整的播報稿。

要求：
1. 【開場白】簡短吸引人的開場（1-2句）
2. 【核心內容】分段落介紹視頻的主要內容（3-5段）
3. 【重點提煉】列出 3-5 個關鍵要點
4. 【結語】總結性的結尾（1-2句）

風格：${style === 'news_anchor' ? '專業新聞播報' : '輕鬆活潑'}
語言：繁體中文
長度：約 500-800 字，適合 2-3 分鐘的語音播報

重要：直接分析視頻畫面和音頻內容，不依賴字幕。
`;

    // Step 1: 視頻分析生成文字
    const textResponse = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            { fileData: { fileUri: videoUrl } },
            { text: prompt }
          ]
        }
      ]
    });

    const textSummary = textResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Step 2: TTS 語音生成
    const ttsResponse = await genai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: textSummary }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }  // 中文友好的音色
          }
        }
      }
    });

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    // 將音頻轉為 base64 data URL
    const audioUrl = audioData 
      ? `data:audio/wav;base64,${audioData}` 
      : null;

    return NextResponse.json({
      textSummary,
      audioUrl,
      success: true
    });

  } catch (error: any) {
    console.error('Summarize error:', error);
    return NextResponse.json({ 
      error: error.message || '處理失敗，請稍後再試',
      success: false 
    }, { status: 500 });
  }
}
```

### 3. 主頁面 (`app/page.tsx`)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [result, setResult] = useState<{ text: string; audio: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    const saved = localStorage.getItem('gemini_key');
    if (saved) setApiKey(atob(saved));
    return () => unsubscribe();
  }, []);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  const saveApiKey = () => {
    localStorage.setItem('gemini_key', btoa(apiKey));
    alert('✅ API Key 已保存');
  };

  const handleSubmit = async () => {
    if (!videoUrl.trim()) return setError('請輸入 YouTube 連結');
    if (!apiKey.trim()) return setError('請設定 API Key');

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, apiKey })
      });

      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }

      setResult({ text: data.textSummary, audio: data.audioUrl });
    } catch (err: any) {
      setError(err.message || '處理失敗');
    } finally {
      setLoading(false);
    }
  };

  // ========== 未登入 ==========
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-600">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-3xl font-bold mb-2">VideoSummarizer</h1>
          <p className="text-gray-500 mb-6">YouTube 視頻播報式總結生成器</p>
          <button
            onClick={handleLogin}
            className="w-full bg-white border-2 border-gray-200 hover:bg-gray-50 px-6 py-3 rounded-xl flex items-center justify-center gap-3 font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            使用 Google 帳號登入
          </button>
        </div>
      </div>
    );
  }

  // ========== 已登入 ==========
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">🎬 VideoSummarizer</h1>
          <div className="flex items-center gap-4">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" />
            <span className="text-sm text-gray-600">{user.displayName}</span>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600">
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* API Key */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-3">🔑 Gemini API Key</h2>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="輸入你的 Gemini API Key"
              className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <button onClick={saveApiKey} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg">
              保存
            </button>
          </div>
          <a 
            href="https://aistudio.google.com/apikey" 
            target="_blank" 
            className="text-sm text-red-500 hover:underline mt-2 inline-block"
          >
            前往 Google AI Studio 獲取 API Key →
          </a>
        </div>

        {/* Video Input */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-3">📹 YouTube 連結</h2>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full border rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                處理中...（約需 30-60 秒）
              </span>
            ) : (
              '🚀 一鍵生成播報式總結'
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl">
            ❌ {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">📝 播報稿</h2>
            
            {result.audio && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">🔊 語音版本</p>
                <audio controls className="w-full">
                  <source src={result.audio} type="audio/wav" />
                </audio>
              </div>
            )}
            
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {result.text}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(result.text);
                  alert('✅ 已複製到剪貼簿');
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-medium"
              >
                📋 複製文字
              </button>
              {result.audio && (
                <a 
                  href={result.audio} 
                  download="summary.wav"
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-medium text-center"
                >
                  ⬇️ 下載音頻
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

### 4. 環境變數 (`.env.local`)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### 5. 依賴 (`package.json`)

```json
{
  "name": "video-summarizer",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "firebase": "^10.7.0",
    "@google/genai": "^0.1.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 🚀 快速開始

```bash
# 1. 創建專案
npx create-next-app@latest video-summarizer --typescript --tailwind --app

# 2. 安裝依賴
cd video-summarizer
npm install firebase @google/genai

# 3. 配置環境變數
cp .env.example .env.local
# 填入 Firebase 配置

# 4. 啟動開發
npm run dev
```

---

## 📦 技術棧

| 組件 | 技術 | 說明 |
|------|------|------|
| 框架 | Next.js 14 | App Router + API Routes |
| 樣式 | Tailwind CSS | 快速響應式 UI |
| 認證 | Firebase Auth | Google OAuth |
| AI | Gemini 2.5 Flash | 視頻分析 + TTS |
| 部署 | Vercel | 一鍵部署 |

---

## ⚠️ 注意事項

1. **YouTube URL 功能是 Preview**：API 可能有變動
2. **視頻限制**：僅公開視頻、每日 8 小時、最長 2 小時
3. **API Key 安全**：存儲在用戶本地，不經過你的伺服器
4. **費用**：由用戶自行承擔（Gemini API 有免費額度）
