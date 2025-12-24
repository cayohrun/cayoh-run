# cayoh.run - 待辦事項

## 🔴 高優先級

### 1. VidCast API 超時問題
**問題描述**：
- Vercel Edge Runtime 限制 30 秒執行時間
- 視頻分析 (20-40s) + TTS 生成 (10-20s) = 30-60 秒
- 當前配置可能導致長視頻處理超時

**解決方案選項**：
1. **升級 Vercel Pro** ($20/月) - 60 秒限制
2. **遷移至 Railway/Render** - 免費方案無時間限制
3. **重構為異步架構** - 使用 Firestore 儲存結果，前端輪詢

**限制條件**：
- ⚠️ **語音生成是核心功能，不可移除**
- 需保持用戶體驗流暢

**相關文件**：
- `app/api/summarize/route.ts` (line 5-6: Edge Runtime 配置)
- `vercel.json` (line 4: maxDuration 配置)

---

### 2. 播放器佔位符優化
**問題描述**：
- Step 2/2 (生成 TTS) 階段的播放器 skeleton 需要優化顯示效果
- 當前 skeleton 可能需要調整樣式或位置以提升用戶體驗

**待處理**：
- 確認播放器 skeleton 在 Step 2/2 時的顯示效果
- 優化動畫和樣式

**相關文件**：
- `widgets/vidcast/VidCastWidget.tsx` (TTS Loading 占位符區塊)

---

## ✅ 已完成

### 音頻播放器增強與 Loading 體驗優化 - ✅ 已完成
**完成內容**：
- ✅ 移除波形可視化，改用功能完整的播放器
- ✅ 新增可拖動進度條（hover 顯示 thumb）
- ✅ 新增倍速控制（0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x）
- ✅ 新增時間顯示（當前時間 / 總時長）
- ✅ 採用紅黑配色方案
- ✅ 文字生成 Loading skeleton（7行 shimmer 動畫）
- ✅ TTS 生成 Loading skeleton（播放器結構 pulse 動畫）
- ✅ 修正 skeleton 顯示邏輯錯誤（移到正確的渲染區塊）

**修改文件**：
- `widgets/vidcast/VidCastWidget.tsx`
- `app/globals.css` (shimmer 動畫)

**完成時間**：2025-12-24

---

### YouTube URL Gemini API 調用問題 - ✅ 已修復
**問題描述**：
- Gemini API 返回 "The string did not match the expected pattern"
- 根因：使用了不必要的 `mimeType: 'video/*'` 參數

**解決方案**：
- 根據官方文檔，`@google/generative-ai` SDK 處理 YouTube URL 時**不需要** `mimeType`
- 移除所有 `fileData` 中的 `mimeType` 參數，只保留 `fileUri`

**修改文件**：
- `widgets/vidcast/gemini.ts` - 2 處修復
  - Line 155-157: analyzeVideo 函式
  - Line 273-275: analyzeVideoWithToken 函式
- `lib/vidcast-core.ts` - 2 處修復
  - Line 177-179: analyzeVideo 函式
  - Line 228-230: analyzeVideoWithToken 函式

**參考資料**：
- [Video understanding | Gemini API](https://ai.google.dev/gemini-api/docs/video-understanding)
- [Use Gemini to summarize YouTube videos](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-textgen-with-youtube-video)

**修復時間**：2025-12-24

---

## 📝 備註

- 創建時間：2025-12-24
- 最後更新：2025-12-24 (播放器增強完成，新增播放器佔位符優化待辦)
