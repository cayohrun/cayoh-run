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

## ✅ 已完成

### 2. YouTube URL Gemini API 調用問題 - ✅ 已修復
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
- 最後更新：2025-12-24
