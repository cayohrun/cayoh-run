# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# cayoh.run - 個人首頁

採用 Bento Grid Layout 的個人網站（PLAYGROUND），整合多個互動 widgets，核心功能為 VidCast（YouTube 視頻播報式總結生成器）。

## 專案架構

**技術棧**: Next.js 15.5.9 + TypeScript + Tailwind CSS + Firebase Auth + Gemini API

**核心功能**:
- Bento Grid 響應式卡片佈局
- VidCast Widget: YouTube 視頻分析 + 播報式文字總結 + TTS 語音播放
  - 自定義音頻播放器（進度條、倍速控制、時間顯示）
  - Loading skeleton（文字生成 shimmer 動畫 + TTS 生成 pulse 動畫）
- Firebase Google OAuth 認證
- 深色主題 + 互動式背景網格
- 自適應 Favicon（SVG 深色模式支援 + PNG 手機瀏覽器備援）

## 專案結構

```
cayoh.run/
├── app/
│   ├── page.tsx              # 主頁面（Bento Grid Layout）
│   ├── layout.tsx            # 全局佈局（含 favicon metadata 配置）
│   ├── globals.css           # 全局樣式（含 shimmer 動畫）
│   ├── icon.svg              # 自適應 SVG favicon（深色模式支援）
│   ├── icon.png              # PNG favicon (96x96)
│   ├── icon-192.png          # PNG favicon (192x192, PWA)
│   ├── icon-512.png          # PNG favicon (512x512, PWA)
│   ├── apple-icon.png        # Apple touch icon (180x180)
│   ├── favicon.ico           # 舊瀏覽器 favicon
│   └── api/
│       ├── summarize/
│       │   └── route.ts      # VidCast 視頻分析 API
│       └── tts/
│           └── route.ts      # VidCast TTS 語音生成 API
├── lib/
│   ├── firebase.ts           # Firebase Auth 配置
│   └── vidcast-core.ts       # VidCast 核心邏輯模組
├── widgets/
│   └── vidcast/
│       ├── VidCastWidget.tsx # VidCast 主組件（含自定義播放器）
│       └── gemini.ts         # Gemini API 封裝
├── components/
│   ├── ui/
│   │   ├── Card.tsx         # 共用卡片組件
│   │   └── Badge.tsx        # 共用徽章組件
│   ├── InteractiveGrid.tsx  # 背景互動網格
│   └── TimeWidget.tsx       # 時間小工具
├── .claude/
│   └── skills/
│       └── vidcast/         # VidCast Skill 套件
│           ├── SKILL.md     # Skill 功能說明
│           ├── TECHNICAL.md # 技術規格文檔
│           └── USAGE.md     # 使用範例（Agent SDK、LINE Bot 等）
├── tasks/
│   └── TODO.md              # 專案待辦事項追蹤
├── CHANGELOG.md             # 變更歷史記錄
└── ...
```

## 開發指令

```bash
# 安裝依賴
npm install

# 本地開發
npm run dev

# 生產構建
npm run build
```

## 環境變數

建立 `.env.local`：
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

## VidCast Widget

YouTube 視頻播報式總結生成器，使用 Gemini API 進行視頻分析和 TTS 語音生成。

**運作流程**: Google 登入 → 輸入 Gemini API Key → 貼上 YouTube URL → 生成播報式總結 + 語音

**技術細節**:
- Gemini 2.0 Flash 視頻分析（原生支援 YouTube URL）
- Gemini TTS 語音生成（音色: Kore）
- 用戶自帶 API Key（localStorage）

**音頻播放器特色**:
- 紅黑配色方案（紅色播放按鈕 + 黑色背景）
- 可拖動進度條（hover 顯示 thumb）
- 6 段倍速控制（0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x）
- 時間顯示（當前時間 / 總時長，等寬字體）
- 基於 HTML5 Audio API，完全自定義 UI

**Loading 體驗**:
- **Step 1/2（分析視頻）**: 7 行 shimmer skeleton 動畫（光波掃過效果）
- **Step 2/2（生成語音）**: 播放器結構 pulse skeleton 動畫
- 確保用戶清楚了解當前進度

## Favicon 系統

**多格式支援**:
- `icon.svg` - 主要 favicon，支援深色/淺色模式自動切換（CSS variables）
- `icon.png` (96x96) - 通用 PNG favicon
- `icon-192.png` (192x192) - PWA 用
- `icon-512.png` (512x512) - PWA 用
- `apple-icon.png` (180x180) - iOS Safari 專用（必須包含 sizes 屬性）
- `favicon.ico` - 舊瀏覽器支援

**優先順序**: 瀏覽器優先使用 SVG（桌面版，深色模式支援），手機瀏覽器回退到 PNG

**配置**: `app/layout.tsx` 的 `metadata.icons` 配置優先順序和尺寸

## API 路由

### `/api/summarize` (POST)
- 接收 YouTube URL 和 Gemini API Key
- 使用 Gemini 2.0 Flash 分析視頻
- 返回播報式文字總結
- Edge Runtime 配置

### `/api/tts` (POST)
- 接收文字內容和 Gemini API Key
- 使用 Gemini TTS 生成語音
- 返回 WAV 格式音頻 (base64)
- 音色：Kore

**注意**: Vercel Edge Runtime 有 30 秒執行時間限制，長視頻可能超時

## 部署

### Render (當前使用)
- 自動從 GitHub main 分支部署
- 無執行時間限制（免費方案）
- 環境變數透過 Render Dashboard 配置

### Vercel (備用)
```bash
vercel
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel --prod
```

Firebase Console 需新增部署域名到授權列表。

## VidCast Skill 套件

專案包含完整的 VidCast Skill，可用於不同平台集成。

### 套件結構

```
.claude/skills/vidcast/
├── SKILL.md      # Skill 功能說明與 API 文檔
├── TECHNICAL.md  # 技術實現細節
└── USAGE.md      # 使用範例（多平台集成）
```

### 支援的使用場景

1. **Claude Code 整合**：自動偵測 YouTube URL 並提供分析
2. **Agent SDK (TypeScript/Python)**：程式化調用 VidCast 功能
3. **LINE Chatbot**：將 VidCast 整合到 LINE 聊天機器人
4. **直接 API 調用**：透過 `/api/summarize` 端點使用

### Skill 特色

- ✅ Gemini 2.5 Flash Lite 視頻分析
- ✅ 播報式文字摘要生成（600-2000 字）
- ✅ TTS 語音合成（Kore 音色）
- ✅ Firebase Google OAuth 認證
- ✅ 支援 YouTube 標準視頻 + Shorts
- ✅ 完整的錯誤處理與使用計數

### 快速開始

**Claude Code**：
```
分析這個視頻：https://www.youtube.com/watch?v=xxx
```

**Agent SDK (TypeScript)**：
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: `分析這個視頻：${youtubeUrl}`,
  options: { settingSources: ['project'] }
})) {
  if ("result" in message) {
    console.log(message.result);
  }
}
```

**詳細文檔**：請參閱 `.claude/skills/vidcast/` 目錄中的文件

## 已知問題

詳見 `tasks/TODO.md` 和 `CHANGELOG.md`

**主要技術債務**:
- VidCast API 超時問題（Vercel Edge Runtime 30s 限制）
- 播放器 skeleton 優化（Step 2/2 顯示效果）
