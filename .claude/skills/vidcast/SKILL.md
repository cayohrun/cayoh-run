---
name: vidcast-youtube-analyzer
description: 使用 Gemini 2.0 Flash 分析 YouTube 視頻、生成播報式文字摘要和 TTS 語音。支持多語言文本提取和語音合成。當需要分析 YouTube 視頻內容、生成摘要文稿或創建視頻播報時使用。
---

# VidCast - YouTube 視頻分析器

一個強大的 YouTube 視頻分析工具，利用 Gemini AI 理解視頻內容並生成播報式摘要。

## 核心功能

### 1. 視頻分析
- 使用 Gemini 2.5 Flash Lite 模型
- 原生支持 YouTube URL（包括 Shorts）
- 自動提取關鍵信息和要點
- 完整覆蓋視頻內容（開頭、中段、結尾）

### 2. 播報式摘要生成
- 生成適合語音朗讀的流暢文章
- 自然敘述風格，避免條列式
- 無時間戳，無格式標記
- 支持多語言輸出（繁體中文、英文等）

### 3. TTS 語音合成
- Gemini 2.5 Flash Preview TTS API
- 音色：Kore（自然、專業、中文友好）
- WAV 格式輸出（PCM 轉 WAV）
- 自動清理 Markdown 格式

### 4. 用戶認證
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

### 步驟 3：Gemini 分析視頻
- 調用 Gemini 2.5 Flash Lite
- 使用播報式 Prompt
- 自動訪問並分析視頻內容
- 提取完整內容（不只是開頭）

### 步驟 4：生成播報文稿
- 創建流暢的文章形式摘要
- 依視頻長度調整段落數：
  - 短視頻（<5分鐘）：600-800 字
  - 中長視頻（5-15分鐘）：1000-1400 字
  - 長視頻（>15分鐘）：1600-2000 字
- 無時間戳、無格式標記

### 步驟 5：TTS 語音合成
- 清理 Markdown 格式（移除 #、**、* 等）
- 限制文字長度（3000 字以內）
- 調用 Gemini 2.5 Flash Preview TTS
- 將 PCM 數據轉換為 WAV 格式
- 返回 base64 編碼的音頻

### 步驟 6：輸出結果
- 文字摘要（完整文章）
- 音頻文件（可直接播放）
- 用戶資訊和 TTS 使用計數

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
  "youtubeUrl": "https://www.youtube.com/watch?v=xxx",
  "apiKey": "AIzaSy...",           // 可選（如果使用 OAuth）
  "accessToken": "ya29.a0..."      // 可選（如果使用 API Key）
}
```

**響應格式**：
```json
{
  "summary": "這是一篇流暢的播報式摘要...",
  "audioUrl": "data:audio/wav;base64,...",
  "user": {
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://..."
  },
  "ttsUsage": {
    "date": "2025-12-24",
    "count": 3
  }
}
```

## 技術規範

詳見 [TECHNICAL.md](./TECHNICAL.md)

## 使用示例

詳見 [USAGE.md](./USAGE.md)

## 常見問題

### Q: 支持多長的視頻？
A: Gemini 2.5 Flash Lite 支持長達數小時的視頻分析，但建議在 1 小時以內以確保效能。

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
- 文字摘要長度上限約 2000 字
- TTS 文字長度上限 3000 字（約 4500 tokens）
- OAuth Token 和 API Key 需要用戶提供

## 相關資源

- [Gemini API 文檔](https://ai.google.dev/gemini-api/docs)
- [Firebase 認證文檔](https://firebase.google.com/docs/auth)
- [VidCast 原始實現](../../../widgets/vidcast/)
- [技術文檔](./TECHNICAL.md)
- [使用示例](./USAGE.md)

## 版本歷史

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
