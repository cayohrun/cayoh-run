---
name: vidcast-youtube-analyzer
description: 使用字幕優先架構分析 YouTube 視頻、生成播報式文字摘要和 TTS 語音。基於 Gemini 2.5 Flash Lite，支持可信度指標和事實驗證。
---

# VidCast - YouTube 視頻分析器

一個強大的 YouTube 視頻分析工具，利用 Gemini AI 理解視頻內容並生成播報式摘要。

## 核心功能

### 1. 字幕優先分析（v1.1.0 新增）
- **字幕抓取**：自動抓取 YouTube 字幕（優先官方，次選自動生成）
- **前處理**：清理口頭語、分段、預抽取數字
- **Facts-based 生成**：輸出結構化 JSON（facts + summary）
- **後處理校驗**：驗證 summary 中的數字是否在 facts 中
- **可信度指標**：high / medium / low

### 2. 文字分析
- 使用 Gemini 2.5 Flash Lite 模型
- 基於字幕文字進行語義分析
- 自動提取關鍵信息和要點
- 支持 YouTube 標準視頻和 Shorts

### 3. 播報式摘要生成
- 生成適合語音朗讀的流暢文章
- 自然敘述風格，避免條列式
- 無時間戳，無格式標記
- 支持多語言輸出（繁體中文、英文等）
- **新增**：可展開查看事實清單（facts）

### 4. TTS 語音合成
- Gemini 2.5 Flash Preview TTS API
- 音色：Kore（自然、專業、中文友好）
- WAV 格式輸出（PCM 轉 WAV）
- 自動清理 Markdown 格式

### 5. 用戶認證
- Firebase Google OAuth 登入
- 支持兩種模式：
  - OAuth Token（推薦）
  - 用戶自帶 API Key（localStorage）

## 使用場景

- **內容總結**：快速理解視頻核心內容
- **學習輔助**：將視頻轉換為可聆聽的摘要
- **內容創建**：為播客或文章創建文稿
- **多媒體轉換**：將視頻內容轉為文本和語音
- **研究分析**：提取視頻中的關鍵數據和觀點

## 前置要求

**方式 1：Firebase Google OAuth（推薦）**
- 用戶通過 Google 登入
- 自動獲取 OAuth Token
- 無需管理 API Key

**方式 2：自帶 API Key**
- 從 [Google AI Studio](https://aistudio.google.com/) 獲取
- 存儲在 localStorage（瀏覽器）
- 需要手動管理配額

**YouTube URL 格式**：
```
https://www.youtube.com/watch?v=VIDEO_ID
https://www.youtube.com/shorts/VIDEO_ID
https://youtu.be/VIDEO_ID
```

## 工作流程詳解

### 步驟 1：用戶認證
```
1. 用戶訪問 cayoh.run
2. 點擊 Google 登入（或輸入 API Key）
3. 完成 Firebase 認證
```

### 步驟 2：提供視頻 URL
```
輸入 YouTube URL：https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### 步驟 3：字幕抓取與前處理（v1.1.0）
- 嘗試抓取 YouTube 字幕（zh-TW, zh, en）
- 清理口頭語（嗯嗯、那個、這個）
- 分段（每 2-3 分鐘或 500-800 字）
- 預抽取數字（金額、年份、百分比）

### 步驟 4：Gemini 分析
- **有字幕**：Facts-based 分析（輸出 JSON）
- **無字幕**：降級模式（僅基於標題+作者，低可信度）
- 調用 Gemini 2.5 Flash Lite
- 後處理校驗數字

### 步驟 5：生成播報文稿
- 創建流暢的文章形式摘要
- 長度：500-1500 字，視內容豐富度調整
- 無時間戳、無格式標記

### 步驟 6：TTS 語音合成
- 清理 Markdown 格式（移除 #、**、* 等）
- 限制文字長度（5000 字以內）
- 調用 Gemini 2.5 Flash Preview TTS
- 將 PCM 數據轉換為 WAV 格式
- 返回 base64 編碼的音頻

### 步驟 7：輸出結果
- 文字摘要（完整文章）
- 事實清單（facts，可展開查看）
- 可信度指標（high / medium / low）
- 音頻文件（可直接播放）
- 警告訊息（如有未驗證的數字）

## 高級用法

### 基本分析
```
分析這個視頻：https://www.youtube.com/watch?v=xxx
```

### 指定語言
```
用繁體中文分析這個視頻：https://www.youtube.com/watch?v=xxx
```

### 分析 Shorts
```
分析這個 YouTube Shorts：https://www.youtube.com/shorts/xxx
```

### 長視頻分析
```
分析這個 1 小時的教程視頻：https://www.youtube.com/watch?v=xxx
```

## API 端點

### POST /api/summarize

**請求格式**：
```json
{
  "videoUrl": "https://www.youtube.com/watch?v=xxx",
  "apiKey": "AIzaSy..."
}
```

**響應格式（v1.1.0）**：
```json
{
  "success": true,
  "textSummary": "這是一篇流暢的播報式摘要...",
  "facts": [
    { "id": 1, "time": "00:00-02:30", "fact": "具體事實描述" },
    { "id": 2, "time": "02:30-05:00", "fact": "另一個事實" }
  ],
  "confidence": "high",
  "warnings": [],
  "hasSubtitles": true,
  "audioUrl": null
}
```

**注意**：`audioUrl` 永遠為 `null`。音頻需透過 `/api/tts` 單獨獲取。

### POST /api/tts

**請求格式**：
```json
{
  "text": "要轉換的文字...",
  "apiKey": "AIzaSy..."
}
```

**響應格式**：
```json
{
  "success": true,
  "audioUrl": "data:audio/wav;base64,..."
}
```

**可信度說明**：
- `high`：有字幕 + 所有數字已驗證 + 3+ facts
- `medium`：有字幕 + 部分數字未驗證
- `low`：無字幕（僅基於標題+作者，由 oEmbed 獲取）

## 技術規範

詳見 [TECHNICAL.md](./TECHNICAL.md)

## 使用示例

詳見 [USAGE.md](./USAGE.md)

## 常見問題

### Q: 支持多長的視頻？
A: 字幕優先架構理論上支持任意長度視頻（依賴字幕可用性），建議在 1 小時以內以確保效能。無字幕時降級為標題+作者分析。

### Q: 支持哪些語言？
A: 支持英文、簡體中文、繁體中文、日文、韓文等 30+ 語言。TTS 主要優化中文（Kore 音色）。

### Q: TTS 有配額限制嗎？
A: 是的，Gemini 2.5 Flash Preview TTS 免費配額約 20 次/天。系統會顯示使用計數並警告。

### Q: 為什麼有時候摘要只涵蓋視頻前半部分？
A: 已優化 Prompt，確保完整分析視頻從開頭到結尾。如果仍有問題，請嘗試較短的視頻。

### Q: 如何使用自己的 API Key？
A: 在首頁輸入 Gemini API Key，系統會存儲在 localStorage。或使用 Firebase Google 登入（推薦）。

### Q: 音頻格式是什麼？
A: WAV 格式（PCM 16-bit, 24kHz, Mono），通過 base64 編碼返回，可直接在瀏覽器播放。

## 限制

- 視頻必須公開可訪問（非私人、非地區限制）
- TTS 輸出受 Gemini 配額限制（約 20 次/天免費）
- 文字摘要長度：500-1500 字（視內容豐富度調整）
- TTS 文字長度上限 5000 字（約 7500 tokens）
- OAuth Token 和 API Key 需要用戶提供

## 相關資源

- [Gemini API 文檔](https://ai.google.dev/gemini-api/docs)
- [Firebase 認證文檔](https://firebase.google.com/docs/auth)
- [VidCast 原始實現](../../../widgets/vidcast/)
- [技術文檔](./TECHNICAL.md)
- [使用示例](./USAGE.md)

## 版本歷史

- **v1.1.0** (2025-12-25)
  - 字幕優先架構：提升摘要準確性
  - 新增 `lib/vidcast/subtitle.ts`：字幕抓取模組
  - 新增 `lib/vidcast/preprocess.ts`：前處理模組
  - 新增 `lib/vidcast/postprocess.ts`：後處理校驗模組
  - Facts-based 生成：輸出結構化 JSON
  - 可信度指標：high / medium / low
  - 數字驗證：未驗證的數字會標記「待驗證」
  - 無字幕降級：僅基於標題+作者（oEmbed），嚴格限制輸出
  - Runtime 改為 Node.js（字幕套件 + Buffer 需要）

- **v1.0.0** (2025-12-24)
  - 初始版本
  - 支持 YouTube 視頻分析
  - 播報式摘要生成
  - TTS 語音合成
  - Firebase Google OAuth 認證
  - TTS 使用計數器

## 授權

MIT License

## 作者

Cayoh - [cayoh.run](https://cayoh.run)
