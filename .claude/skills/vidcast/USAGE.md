# VidCast 使用示例

## 目錄

1. [Claude Code 使用](#claude-code-使用)
2. [Agent SDK 集成](#agent-sdk-集成)
3. [LINE Chatbot 集成](#line-chatbot-集成)
4. [直接 API 調用](#直接-api-調用)
5. [常見場景](#常見場景)

---

## Claude Code 使用

### 基本用法

VidCast Skill 會自動被 Claude Code 發現，無需手動註冊。只需在對話中提及 YouTube 視頻分析即可。

**示例 1：簡單分析**

```
分析這個視頻：https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Claude 的回應**：
```
我將使用 VidCast 分析這個視頻...

[自動調用 VidCast Skill]

視頻摘要：
這個視頻介紹了...（完整的播報式摘要）

[音頻播放器]
```

---

**示例 2：指定語言**

```
用繁體中文分析這個英文視頻：https://www.youtube.com/watch?v=xxx
```

---

**示例 3：分析 YouTube Shorts**

```
幫我總結這個 Shorts：https://www.youtube.com/shorts/abc123
```

---

**示例 4：批量分析**

```
分析這三個視頻並比較它們的觀點：
1. https://www.youtube.com/watch?v=xxx
2. https://www.youtube.com/watch?v=yyy
3. https://www.youtube.com/watch?v=zzz
```

---

### 進階用法

**示例 5：與其他 Skills 配合**

```
分析這個教程視頻，然後為我創建一個 Markdown 筆記：
https://www.youtube.com/watch?v=xxx
```

**示例 6：提取特定信息**

```
分析這個視頻，提取所有提到的工具和技術：
https://www.youtube.com/watch?v=xxx
```

**示例 7：創建部落格文章**

```
分析這個視頻，然後基於摘要創建一篇適合部落格的文章（包含引言、正文、結論）：
https://www.youtube.com/watch?v=xxx
```

---

## Agent SDK 集成

### TypeScript 使用

**安裝依賴**:
```bash
npm install @anthropic-ai/claude-agent-sdk
```

**基本範例**:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function analyzeYouTubeVideo(videoUrl: string) {
  console.log(`開始分析視頻: ${videoUrl}`);

  for await (const message of query({
    prompt: `請使用 VidCast 分析這個 YouTube 視頻並生成摘要：${videoUrl}`,
    options: {
      allowedTools: ["Read", "Glob", "Grep", "Bash"],
      settingSources: ['project']  // 載入 .claude/skills/vidcast
    }
  })) {
    if ("text" in message) {
      console.log(message.text);
    }
    if ("result" in message) {
      return message.result;
    }
  }
}

// 使用
analyzeYouTubeVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
  .then(result => console.log("分析完成:", result))
  .catch(error => console.error("錯誤:", error));
```

---

**進階範例 - 批量處理**:
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import * as fs from "fs/promises";

interface VideoAnalysis {
  url: string;
  summary: string;
  timestamp: string;
}

async function batchAnalyzeVideos(urls: string[]): Promise<VideoAnalysis[]> {
  const results: VideoAnalysis[] = [];

  for (const url of urls) {
    console.log(`處理: ${url}`);

    let summary = "";
    for await (const message of query({
      prompt: `分析這個視頻：${url}`,
      options: { settingSources: ['project'] }
    })) {
      if ("result" in message) {
        summary = message.result;
      }
    }

    results.push({
      url,
      summary,
      timestamp: new Date().toISOString()
    });

    // 避免 rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 保存到文件
  await fs.writeFile(
    'video-summaries.json',
    JSON.stringify(results, null, 2)
  );

  return results;
}

// 使用
const videoUrls = [
  "https://www.youtube.com/watch?v=xxx",
  "https://www.youtube.com/watch?v=yyy",
  "https://www.youtube.com/watch?v=zzz"
];

batchAnalyzeVideos(videoUrls);
```

---

### Python 使用

**安裝依賴**:
```bash
pip install claude-agent-sdk
```

**基本範例**:
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def analyze_youtube_video(video_url: str) -> str:
    """使用 VidCast Skill 分析 YouTube 視頻"""
    print(f"開始分析視頻: {video_url}")

    summary = ""
    async for message in query(
        prompt=f"請使用 VidCast 分析這個 YouTube 視頻：{video_url}",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Glob", "Grep", "Bash"],
            setting_sources=['project']  # 載入 .claude/skills/vidcast
        )
    ):
        if hasattr(message, "text"):
            print(message.text)
        if hasattr(message, "result"):
            summary = message.result

    return summary

# 使用
asyncio.run(
    analyze_youtube_video("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
)
```

---

**進階範例 - 自動化工作流**:
```python
import asyncio
import json
from datetime import datetime
from claude_agent_sdk import query, ClaudeAgentOptions

async def create_video_report(video_url: str, output_file: str):
    """創建完整的視頻分析報告"""

    # 步驟 1：分析視頻
    print("步驟 1/3: 分析視頻內容...")
    summary = ""
    async for message in query(
        prompt=f"分析這個視頻並生成詳細摘要：{video_url}",
        options=ClaudeAgentOptions(setting_sources=['project'])
    ):
        if hasattr(message, "result"):
            summary = message.result

    # 步驟 2：提取關鍵字
    print("步驟 2/3: 提取關鍵字...")
    keywords = ""
    async for message in query(
        prompt=f"從這段摘要中提取 5-10 個關鍵字：\n{summary}",
        options=ClaudeAgentOptions(setting_sources=['project'])
    ):
        if hasattr(message, "result"):
            keywords = message.result

    # 步驟 3：生成報告
    print("步驟 3/3: 生成報告...")
    report = {
        "video_url": video_url,
        "analyzed_at": datetime.now().isoformat(),
        "summary": summary,
        "keywords": keywords,
        "word_count": len(summary.split())
    }

    # 保存到 JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"報告已保存到: {output_file}")
    return report

# 使用
asyncio.run(
    create_video_report(
        "https://www.youtube.com/watch?v=xxx",
        "report.json"
    )
)
```

---

## LINE Chatbot 集成

### 方案 A：使用 Agent SDK（推薦）

**架構**:
```
LINE User → LINE Webhook → Agent SDK → VidCast Skill → Gemini API
```

**實現**:
```typescript
// bot/webhook.ts
import { Client, WebhookEvent, TextMessage } from '@line/bot-sdk';
import { query } from "@anthropic-ai/claude-agent-sdk";

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

async function handleMessage(event: WebhookEvent) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }

  const userMessage = event.message.text;
  const replyToken = event.replyToken;

  // 檢測 YouTube URL
  const youtubeRegex = /https:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/;
  const match = userMessage.match(youtubeRegex);

  if (!match) {
    return lineClient.replyMessage(replyToken, {
      type: 'text',
      text: '請提供有效的 YouTube 連結'
    });
  }

  const youtubeUrl = match[0];

  // 發送處理中訊息
  await lineClient.replyMessage(replyToken, {
    type: 'text',
    text: '🎬 正在分析視頻，請稍候...'
  });

  try {
    // 使用 VidCast Skill
    let summary = "";
    for await (const message of query({
      prompt: `分析這個 YouTube 視頻：${youtubeUrl}`,
      options: { settingSources: ['project'] }
    })) {
      if ("result" in message) {
        summary = message.result;
      }
    }

    // 分段發送（LINE 有字數限制）
    const maxLength = 2000;
    if (summary.length > maxLength) {
      const part1 = summary.substring(0, maxLength);
      const part2 = summary.substring(maxLength);

      await lineClient.pushMessage(event.source.userId!, {
        type: 'text',
        text: `✅ 視頻分析完成（1/2）\n\n${part1}`
      });

      await lineClient.pushMessage(event.source.userId!, {
        type: 'text',
        text: `（2/2）\n\n${part2}`
      });
    } else {
      await lineClient.pushMessage(event.source.userId!, {
        type: 'text',
        text: `✅ 視頻分析完成\n\n${summary}`
      });
    }

  } catch (error: any) {
    await lineClient.pushMessage(event.source.userId!, {
      type: 'text',
      text: `❌ 分析失敗：${error.message}`
    });
  }
}

// Express.js Webhook
import express from 'express';
import { middleware } from '@line/bot-sdk';

const app = express();

app.post('/webhook', middleware({
  channelSecret: process.env.LINE_CHANNEL_SECRET!
}), async (req, res) => {
  const events: WebhookEvent[] = req.body.events;

  await Promise.all(events.map(handleMessage));

  res.json({ success: true });
});

app.listen(3000);
```

---

### 方案 B：直接調用核心邏輯

**架構**:
```
LINE User → LINE Webhook → vidcast-core.ts → Gemini API
```

**實現**:
```typescript
// lib/vidcast-core.ts （已在任務 2 創建）
import { analyzeVideo, generateTTS } from './vidcast-core';

// bot/handlers/vidcast.ts
import { Client } from '@line/bot-sdk';
import { analyzeVideo, generateTTS, validateYouTubeUrl } from '../../lib/vidcast-core';

export async function handleVidCastRequest(
  lineClient: Client,
  userId: string,
  youtubeUrl: string
) {
  // 驗證 URL
  const validation = validateYouTubeUrl(youtubeUrl);
  if (!validation.valid) {
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: `❌ ${validation.error}`
    });
    return;
  }

  // 發送處理中訊息
  await lineClient.pushMessage(userId, {
    type: 'text',
    text: '🎬 正在分析視頻...'
  });

  try {
    const apiKey = process.env.GEMINI_API_KEY!;

    // 分析視頻
    const summary = await analyzeVideo(apiKey, youtubeUrl);

    // 生成 TTS（可選）
    const audioUrl = await generateTTS(apiKey, summary);

    // 發送摘要
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: `✅ 視頻分析完成\n\n${summary.substring(0, 2000)}`
    });

    // 發送音頻（如果成功生成）
    if (audioUrl) {
      // LINE 不支持 data URI，需要上傳到 CDN
      const audioFileUrl = await uploadToCDN(audioUrl);

      await lineClient.pushMessage(userId, {
        type: 'audio',
        originalContentUrl: audioFileUrl,
        duration: 60000  // 估計時長（毫秒）
      });
    }

  } catch (error: any) {
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: `❌ 分析失敗：${error.message}`
    });
  }
}

// 上傳音頻到 CDN 的輔助函式
async function uploadToCDN(dataUri: string): Promise<string> {
  // 實現：上傳到 AWS S3、Cloudinary 或其他 CDN
  // 返回公開可訪問的 URL
  return 'https://cdn.example.com/audio/xxx.wav';
}
```

---

## 直接 API 調用

### cURL 範例

**使用 API Key**:
```bash
curl -X POST https://cayoh.run/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "apiKey": "AIzaSy..."
  }'
```

**使用 OAuth Token**:
```bash
curl -X POST https://cayoh.run/api/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ya29.a0..." \
  -d '{
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }'
```

---

### JavaScript/Fetch 範例

```javascript
async function analyzeVideo(youtubeUrl, apiKey) {
  const response = await fetch('https://cayoh.run/api/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      youtubeUrl,
      apiKey
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data;
}

// 使用
analyzeVideo('https://www.youtube.com/watch?v=xxx', 'AIzaSy...')
  .then(result => {
    console.log('摘要:', result.summary);
    console.log('音頻:', result.audioUrl);
  })
  .catch(error => console.error(error));
```

---

## 常見場景

### 場景 1：學習筆記生成

```
我在學習 React，請分析這三個教程視頻並生成一份完整的學習筆記：
1. https://www.youtube.com/watch?v=xxx (基礎)
2. https://www.youtube.com/watch?v=yyy (進階)
3. https://www.youtube.com/watch?v=zzz (實戰)
```

---

### 場景 2：會議紀錄

```
這是我們團隊的線上會議錄影，請生成會議紀錄：
https://www.youtube.com/watch?v=xxx

要求：
- 提取所有決策點
- 列出行動項目
- 標註負責人
```

---

### 場景 3：內容創作

```
我想寫一篇關於 AI 的部落格文章，請分析這個視頻並幫我：
1. 生成摘要
2. 提取 5 個關鍵觀點
3. 創建文章大綱

視頻：https://www.youtube.com/watch?v=xxx
```

---

### 場景 4：研究助手

```
請分析這個學術講座視頻，提取：
- 主要論點
- 研究方法
- 結論
- 引用文獻（如果有提到）

視頻：https://www.youtube.com/watch?v=xxx
```

---

### 場景 5：多語言翻譯

```
這是一個英文視頻，請：
1. 用繁體中文生成摘要
2. 翻譯視頻標題
3. 提取專業術語的中英對照

視頻：https://www.youtube.com/watch?v=xxx
```

---

## 錯誤處理最佳實踐

```typescript
try {
  const result = await analyzeVideo(url, apiKey);
  console.log(result.summary);
} catch (error: any) {
  if (error.message.includes('無效')) {
    // URL 格式錯誤
    console.error('請檢查 YouTube URL 格式');
  } else if (error.message.includes('配額')) {
    // API 配額用完
    console.error('請稍後再試或更換 API Key');
  } else if (error.message.includes('過載')) {
    // 服務過載
    console.error('Google 服務暫時過載，請稍候重試');
  } else {
    // 其他錯誤
    console.error('分析失敗，請聯繫支援');
  }
}
```

---

## 性能優化建議

1. **批量處理時添加延遲**：
   ```typescript
   for (const url of urls) {
     await analyzeVideo(url);
     await sleep(2000);  // 避免 rate limiting
   }
   ```

2. **實現緩存**：
   ```typescript
   const cacheKey = `vidcast:${youtubeUrl}`;
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);
   ```

3. **使用 Queue 系統**：
   ```typescript
   import Queue from 'bull';
   const videoQueue = new Queue('video-analysis');

   videoQueue.process(async (job) => {
     return await analyzeVideo(job.data.url);
   });
   ```

---

## 相關資源

- [SKILL.md](./SKILL.md) - 完整功能說明
- [TECHNICAL.md](./TECHNICAL.md) - 技術細節
- [Agent SDK 文檔](https://github.com/anthropics/anthropic-sdk-typescript)
- [LINE Messaging API](https://developers.line.biz/en/reference/messaging-api/)
