# Changelog

本文件記錄 cayoh.run 專案的重要變更歷史。

---

## 2025-12-24

### 🎨 Favicon 系統實作 (13:36 - 14:10)

**問題**：
- 本地開發環境顯示來自其他專案（chatbot-ui）的快取 favicon
- 手機版 Chrome 和 iOS Safari 不顯示 favicon
- 需要支援深色/淺色模式自動切換

**解決方案**：

1. **創建自適應 SVG Favicon** (13:36)
   - 檔案：`app/icon.svg`
   - 使用 CSS 變數實現深色/淺色模式自動切換
   - 淺色模式：黑色 C 形 + 白色輪廓
   - 深色模式：白色 C 形 + 黑色輪廓
   - Commit: `08c99f5`

2. **添加 PNG Favicon 支援** (14:05)
   - 使用 realfavicongenerator.net 生成多尺寸 PNG 檔案
   - 新增檔案：
     - `app/icon.png` (96x96)
     - `app/icon-192.png` (192x192，PWA 用)
     - `app/icon-512.png` (512x512，PWA 用)
     - `app/apple-icon.png` (180x180，iOS 用)
     - `app/favicon.ico` (舊瀏覽器用)
   - 配置 `app/layout.tsx` 的 metadata，優先使用 SVG，PNG 作為備援
   - Commit: `a418d20`

3. **修正 iOS Safari 顯示問題** (14:10)
   - 為 `apple-touch-icon` 添加 `sizes="180x180"` 屬性
   - iOS Safari 需要明確的尺寸屬性才能正確顯示 favicon
   - Commit: `0094490`

**技術細節**：
- 桌面瀏覽器使用 SVG（支援深色模式）
- 手機瀏覽器使用 PNG（確保顯示）
- Next.js 15 自動處理 favicon 生成與 HTML 標籤注入

**相關檔案**：
- `app/icon.svg` - 主要 SVG favicon
- `app/icon.png`, `app/icon-192.png`, `app/icon-512.png` - PNG 備援
- `app/apple-icon.png` - iOS 專用圖示
- `app/favicon.ico` - 舊瀏覽器支援
- `app/layout.tsx` - Metadata 配置

---

### 🎵 VidCast 音頻播放器增強 (05:05 - 06:02)

**需求**：
- 移除波形視覺化（用戶不需要）
- 新增可拖動進度條（seekbar）
- 新增倍速控制（0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x）
- 新增時間顯示（當前時間 / 總時長）
- 採用紅黑配色方案

**實作內容**：

1. **自定義音頻播放器** (05:05 - 05:26)
   - 移除原有的波形視覺化組件
   - 實作新的播放器 UI：
     - 紅色圓形播放/暂停按鈕
     - 可拖動進度條（hover 顯示 thumb）
     - 時間顯示（使用等寬字體）
     - 6 個倍速選項按鈕
   - Commits: `17fd45b`, `3adede2`

2. **Loading 占位符實作** (05:26)
   - **文字生成階段**：
     - 7 行不同寬度的 shimmer skeleton
     - 使用 CSS keyframes 創建光波掃過效果
   - **TTS 生成階段**：
     - 播放器結構的 pulse skeleton
     - 模擬最終播放器的佈局
   - Commit: `3adede2`

3. **Bug 修正：Skeleton 顯示邏輯錯誤** (05:38 - 06:02)
   - **問題**：文字 skeleton 放在 `if (result) {}` 區塊內，但條件要求 `!result`，導致永遠不顯示
   - **根因分析**：Codex 協助發現邏輯矛盾
   - **解決方案**：將文字 skeleton 移至 loading 區塊
   - **錯誤嘗試**：曾錯誤改變播放器位置（284db61），後來恢復（2f417da）
   - **最終修正**：19646c1

**技術實現**：
- React Hooks：`useState`, `useRef` 管理播放狀態
- HTML5 Audio API：程式化控制音頻播放
- Custom Range Input：使用 webkit-slider-thumb 自定義進度條樣式
- CSS Keyframes：shimmer 動畫效果
- Tailwind CSS：`animate-pulse` 用於 TTS skeleton

**相關檔案**：
- `widgets/vidcast/VidCastWidget.tsx` - 主要修改檔案
- `app/globals.css` - shimmer 動畫定義

**已知問題**：
- 播放器 skeleton 在 Step 2/2 時可能需要優化顯示效果（已記錄在 TODO.md）

---

### 📝 UI/UX 小幅調整

**首頁標語簡化** (06:11)
- 原本：「數位工藝實驗室。Design, Product, and Code Experiments.」（雙行）
- 修改為：「PLAYGROUND」（單行）
- 檔案：`app/page.tsx`
- Commit: `dd5a4e5`

---

### 🚀 部署與基礎設施

**Render 部署配置** (04:05)
- 新增 Render.com 部署配置
- 配置環境變數與建構設定
- Commit: `e4b5fba`

**TTS 超時問題優化** (03:29 - 03:59)
- 實作 TTS 異步架構以避免 Vercel Edge Runtime 30 秒限制
- 調整 TTS 文字長度限制：5000 → 1500 → 5000 字元
- 新增錯誤日誌記錄
- Commits: `813fe6d`, `747cc47`, `16df9bb`, `a5702e4`

**React Hydration 修正** (03:36)
- 修正 React hydration mismatch 錯誤
- Commit: `b0d1e53`

---

### 📋 TODO 更新

**完成項目**：
- ✅ 移除波形可視化，改用功能完整的播放器
- ✅ 新增可拖動進度條（hover 顯示 thumb）
- ✅ 新增倍速控制（0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x）
- ✅ 新增時間顯示（當前時間 / 總時長）
- ✅ 採用紅黑配色方案
- ✅ 文字生成 Loading skeleton（7行 shimmer 動畫）
- ✅ TTS 生成 Loading skeleton（播放器結構 pulse 動畫）
- ✅ 修正 skeleton 顯示邏輯錯誤

**新增待辦**：
- 🔲 播放器佔位符優化（Step 2/2 時的顯示效果）

檔案：`tasks/TODO.md`

---

## 技術債務與已知問題

### VidCast API 超時問題
- **描述**：Vercel Edge Runtime 限制 30 秒執行時間，視頻分析 + TTS 生成可能超時
- **臨時方案**：已實作異步架構
- **長期方案選項**：
  1. 升級 Vercel Pro ($20/月) - 60 秒限制
  2. 遷移至 Railway/Render - 免費方案無時間限制
  3. 完全重構為異步架構 - 使用 Firestore 儲存結果，前端輪詢

### 播放器佔位符優化
- **描述**：Step 2/2 (生成 TTS) 階段的播放器 skeleton 可能需要調整樣式
- **優先級**：低
- **追蹤**：tasks/TODO.md

---

## 統計數據

**本次工作時間**：約 9 小時（2025-12-24 01:00 - 14:10）

**Commits 數量**：16 個

**檔案變更**：
- 新增：7 個檔案（6 個 favicon 檔案 + 1 個配置）
- 修改：4 個檔案（VidCastWidget.tsx, layout.tsx, page.tsx, globals.css, TODO.md）

**程式碼行數變更**：
- 新增：約 150 行（播放器控制 + loading skeleton + favicon 配置）
- 刪除：約 50 行（波形視覺化相關代碼）
- 淨增長：約 100 行

---

## 致謝

本次開發由 **Claude Sonnet 4.5** (claude.ai/code) 協助完成。

特別感謝：
- **Codex** 協助定位 skeleton 顯示邏輯 bug
- **realfavicongenerator.net** 提供 favicon 生成工具
