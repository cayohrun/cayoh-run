# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# cayoh.run - 個人首頁

採用 Bento Grid Layout 的個人網站，整合多個互動 widgets，核心功能為 VidCast（YouTube 視頻播報式總結生成器）。

## 專案架構

**技術棧**: Next.js 14 + TypeScript + Tailwind CSS + Firebase Auth + Gemini API

**核心功能**:
- Bento Grid 響應式卡片佈局
- VidCast Widget: YouTube 視頻分析 + 播報式文字總結 + TTS 語音
- Firebase Google OAuth 認證
- 深色主題 + 互動式背景網格

## 專案結構

```
cayoh.run/
├── app/
│   ├── page.tsx              # 主頁面（Bento Grid Layout）
│   ├── layout.tsx            # 全局佈局
│   ├── globals.css           # 全局樣式
│   └── api/
│       └── summarize/
│           └── route.ts      # VidCast API 端點
├── lib/
│   └── firebase.ts           # Firebase Auth 配置
├── widgets/
│   └── vidcast/
│       ├── VidCastWidget.tsx # VidCast 主組件
│       └── gemini.ts         # Gemini API 封裝
├── components/
│   ├── ui/
│   │   ├── Card.tsx         # 共用卡片組件
│   │   └── Badge.tsx        # 共用徽章組件
│   ├── InteractiveGrid.tsx  # 背景互動網格
│   └── TimeWidget.tsx       # 時間小工具
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

## 部署

```bash
vercel
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel --prod
```

Firebase Console 需新增 Vercel 域名到授權列表。
