import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 將 PCM 音頻數據包裝成 WAV 格式
 */
function pcmToWav(pcmData: string): string {
  const pcmBuffer = Buffer.from(pcmData, 'base64');

  // WAV 文件頭參數
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmBuffer.length;

  // 創建 WAV 文件頭
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  // 合併 header 和 PCM 數據
  const wavBuffer = Buffer.concat([header, pcmBuffer]);

  // 返回 base64 編碼的 WAV
  return `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
}

/**
 * 提取 YouTube Video ID
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * 驗證並標準化 YouTube URL（轉換為 Gemini API 要求的格式）
 */
export function validateYouTubeUrl(url: string): { valid: boolean; error?: string; videoId?: string } {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return {
      valid: false,
      error: '請輸入有效的 YouTube 連結'
    };
  }

  return { valid: true, videoId };
}

/**
 * 將 Video ID 轉換為 Gemini API 標準格式
 */
export function normalizeYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * 使用 OAuth token 調用 Gemini API（REST API 方式）
 */
async function callGeminiWithToken(
  accessToken: string,
  model: string,
  contents: any,
  generationConfig?: any
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Gemini API] 錯誤響應:', {
      status: response.status,
      statusText: response.statusText,
      body: error,
    });
    throw new Error(`Gemini API 錯誤: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * 生成播報式 Prompt（繁體中文）
 */
export function generateBroadcastPrompt(): string {
  return `
請將這個視頻的內容改寫為一篇流暢易讀的文章摘要。

## 核心要求
- **完整性**：必須涵蓋視頻從開頭到結尾的所有重要內容
- **時間平衡**：前半段、中段、後半段必須均衡覆蓋，避免只關注開頭
- **流暢性**：使用自然的段落過渡，不要使用格式標記（如【開場】、【內容】等）
- **無時間戳**：不要標註時間區間（如 0:00-2:00），直接描述內容

## 結構要求
1. 開頭用 1-2 句話簡潔概括視頻主題
2. 主體內容分為多個段落，依視頻長度調整：
   - Shorts（<1分鐘）：1-2 段（精簡直接）
   - 極短視頻（1-2分鐘）：2 段
   - 短視頻（2-3分鐘）：2-3 段
   - 標準短視頻（3-5分鐘）：2-3 段
   - 中長視頻（5-15分鐘）：3-5 段
   - 長視頻（>15分鐘）：基礎 5 段，每增加 5 分鐘 +1 段，上限 11 段
3. 每段聚焦一個主題，使用自然的段落過渡
4. 結尾用 1-2 句話總結全文

## 風格要求
- 語言：繁體中文
- 語氣：客觀專業、敘述流暢
- 文章形式：像新聞報導或深度文章，而非條列式筆記
- 長度：
  - Shorts（<1分鐘）：100-150 字
  - 極短視頻（1-2分鐘）：150-250 字
  - 短視頻（2-3分鐘）：200-300 字
  - 標準短視頻（3-5分鐘）：300-400 字
  - 中長視頻（5-15分鐘）：500-800 字
  - 長視頻（>15分鐘）：基礎 800 字，每增加 5 分鐘 +200 字，上限 2000 字

## Shorts 特別說明（<1分鐘視頻）
- 直接點出核心內容，無需鋪陳
- 一句話總結即可，不需要段落過渡
- 捕捉視頻的「hook」和主要賣點

## 長視頻特別說明（>15分鐘視頻）
- 識別並貫穿主要敘事線，避免被細節淹沒
- 將相關內容整合為連貫段落，按重要性分配篇幅
- 捕捉視頻的「起承轉合」結構
- 使用過渡句連接不同主題段落
- 若視頻有章節標記，可參考其結構

## 分析要求
- 從視頻第一秒到最後一秒完整分析
- 確保開頭、中段、結尾都有充分描述
- 捕捉關鍵轉折點和核心觀點
- 直接分析畫面和音頻內容

請直接輸出文章，不需要標題、不需要格式標記、不需要時間戳。
從第一句話開始就是正文內容。
`.trim();
}

/**
 * 分析 YouTube 視頻生成播報稿
 */
export async function analyzeVideo(
  apiKey: string,
  videoUrl: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = generateBroadcastPrompt();

  // 提取並標準化 YouTube URL
  const validation = validateYouTubeUrl(videoUrl);
  if (!validation.valid || !validation.videoId) {
    throw new Error(validation.error || '無效的 YouTube URL');
  }
  const normalizedUrl = normalizeYouTubeUrl(validation.videoId);

  try {
    const result = await model.generateContent([
      {
        fileData: {
          fileUri: normalizedUrl,
        } as any,
      },
      { text: prompt },
    ]);

    const text = result.response.text();

    if (!text) {
      throw new Error('Gemini API 未返回任何內容');
    }

    return text;
  } catch (error: any) {
    if (error.message?.includes('API key')) {
      throw new Error('API Key 無效或已過期');
    } else if (error.message?.includes('quota') || error.message?.includes('Resource exhausted') || error.message?.includes('429')) {
      throw new Error('API 配額已用完，請稍後再試（或更換 API Key）');
    } else if (error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('Service Unavailable')) {
      throw new Error('Google 服務暫時過載，請稍候 1-2 分鐘後再試');
    } else if (error.message?.includes('video')) {
      throw new Error('無法訪問該視頻，請確認視頻為公開狀態');
    }
    throw new Error('視頻分析失敗，請稍後再試');
  }
}

/**
 * 清理 Markdown 格式，保留純文字用於 TTS
 */
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
    // 移除多餘空行（保留單個換行）
    .replace(/\n{3,}/g, '\n\n')
    // 移除行首行尾空白
    .trim();
}

/**
 * 生成 TTS 語音（音色: Kore）
 */
export async function generateTTS(
  apiKey: string,
  text: string
): Promise<string | null> {
  try {
    // 清理 Markdown 格式
    const cleanedText = cleanTextForTTS(text);

    // 限制文字長度（避免超過 Gemini API token 限制）
    const maxLength = 5000; // 約 7500 tokens，支持長視頻完整播報
    const truncatedText = cleanedText.length > maxLength
      ? cleanedText.slice(0, maxLength) + '...'
      : cleanedText;

    const genAI = new GoogleGenerativeAI(apiKey);

    // 使用 Gemini 2.5 Flash TTS 專用模型
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
      } as any,
    });

    // 提取音頻數據（PCM 格式）
    const audioData = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      console.warn('TTS 生成失敗，未返回音頻數據');
      return null;
    }

    // 將 PCM 數據包裝成 WAV 格式
    return pcmToWav(audioData);
  } catch (error) {
    console.error('TTS 生成錯誤:', error);
    return null; // TTS 失敗不影響主流程
  }
}

/**
 * 使用 OAuth token 分析 YouTube 視頻
 */
export async function analyzeVideoWithToken(
  accessToken: string,
  videoUrl: string
): Promise<string> {
  const prompt = generateBroadcastPrompt();

  try {
    const result = await callGeminiWithToken(
      accessToken,
      'gemini-2.5-flash-lite',
      [{
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: videoUrl,
            } as any,
          },
          { text: prompt },
        ],
      }]
    );

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Gemini API 未返回任何內容');
    }

    return text;
  } catch (error: any) {
    if (error.message?.includes('401') || error.message?.includes('403')) {
      throw new Error('OAuth 認證失敗，請重新登入');
    } else if (error.message?.includes('quota') || error.message?.includes('Resource exhausted') || error.message?.includes('429')) {
      throw new Error('API 配額已用完，請稍後再試（或更換 API Key）');
    } else if (error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('Service Unavailable')) {
      throw new Error('Google 服務暫時過載，請稍候 1-2 分鐘後再試');
    } else if (error.message?.includes('video')) {
      throw new Error('無法訪問該視頻，請確認視頻為公開狀態');
    }
    throw new Error('視頻分析失敗，請稍後再試');
  }
}

/**
 * 使用 OAuth token 生成 TTS 語音
 */
export async function generateTTSWithToken(
  accessToken: string,
  text: string
): Promise<string | null> {
  try {
    // 清理 Markdown 格式
    const cleanedText = cleanTextForTTS(text);

    // 限制文字長度（避免超過 Gemini API token 限制）
    const maxLength = 5000; // 約 7500 tokens，支持長視頻完整播報
    const truncatedText = cleanedText.length > maxLength
      ? cleanedText.slice(0, maxLength) + '...'
      : cleanedText;

    const result = await callGeminiWithToken(
      accessToken,
      'gemini-2.5-flash',
      [{
        role: 'user',
        parts: [{ text: truncatedText }],
      }],
      {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore',
            },
          },
        },
      }
    );

    const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      console.warn('TTS 生成失敗，未返回音頻數據');
      return null;
    }

    // 將 PCM 數據包裝成 WAV 格式
    return pcmToWav(audioData);
  } catch (error) {
    console.error('TTS 生成錯誤:', error);
    return null;
  }
}

/**
 * 生成 Facts-based Prompt（用於字幕分析）
 */
export function generateFactsBasedPrompt(preprocessedContent: string): string {
  return `
你將收到一個 YouTube 視頻的分段字幕和預抽取的數字清單。請分析內容並輸出 JSON 格式的結果。

${preprocessedContent}

---

## 輸出要求

請輸出以下 JSON 格式（不要包含 Markdown 代碼塊標記）：

{
  "facts": [
    { "id": 1, "time": "00:00-02:30", "fact": "具體事實描述，必須包含準確的數字和單位" },
    { "id": 2, "time": "02:30-05:00", "fact": "..." }
  ],
  "summary": "摘要文字..."
}

## 約束規則

### Facts 規則
1. 每個事實必須包含具體的數字、人名或事件
2. 數字必須帶完整單位（如：1000億美元，而非 1000）
3. 按時間順序排列
4. 優先記錄：金額、百分比、年份、人數、重要人名、關鍵事件

### Summary 規則
1. **只能使用 facts 中已記錄的資訊**
2. 若要提及數字，該數字必須先出現在 facts 中
3. 若某資訊不確定，標註「未明確提及」
4. 禁止推測或編造 facts 中沒有的內容
5. 長度：500-1500 字，視內容豐富度調整
6. 語言：繁體中文
7. 風格：流暢的敘述文，像新聞報導

### 禁止事項
- 不要混淆數字（如把「1000億」寫成「1000」）
- 不要忽略爭議性或負面內容
- 不要只關注前半段，必須涵蓋完整內容
- 不要在 summary 中使用 facts 沒有的數字

直接輸出 JSON，不要加任何說明文字。
`.trim();
}

/**
 * 生成降級模式 Prompt（無字幕時使用）
 */
export function generateFallbackPrompt(title: string, description: string): string {
  return `
僅基於以下資訊生成概述：

- 標題：${title}
- 描述：${description || '（無描述）'}

## 嚴格規則
- 只描述視頻的大致主題和可能內容
- **禁止**包含任何具體數字（金額、年份、百分比）
- **禁止**提及具體人名
- **禁止**做出精細結論或預測
- **禁止**使用「視頻中提到」這類措辭
- 使用「這個視頻似乎討論了...」「可能涉及...」等不確定語氣

## 輸出要求
請輸出 JSON 格式：

{
  "facts": [],
  "summary": "這個視頻似乎討論了..."
}

長度：100-200 字
語言：繁體中文

直接輸出 JSON，不要加任何說明文字。
`.trim();
}

/**
 * 使用字幕分析視頻（Facts-based 方法）
 */
export async function analyzeWithSubtitles(
  apiKey: string,
  preprocessedContent: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = generateFactsBasedPrompt(preprocessedContent);

  try {
    const result = await model.generateContent([{ text: prompt }]);
    const text = result.response.text();

    if (!text) {
      throw new Error('Gemini API 未返回任何內容');
    }

    return text;
  } catch (error: any) {
    if (error.message?.includes('API key')) {
      throw new Error('API Key 無效或已過期');
    } else if (error.message?.includes('quota') || error.message?.includes('Resource exhausted') || error.message?.includes('429')) {
      throw new Error('API 配額已用完，請稍後再試（或更換 API Key）');
    } else if (error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('Service Unavailable')) {
      throw new Error('Google 服務暫時過載，請稍候 1-2 分鐘後再試');
    }
    throw new Error('分析失敗，請稍後再試');
  }
}

/**
 * 降級模式分析（無字幕時使用）
 */
export async function analyzeWithFallback(
  apiKey: string,
  title: string,
  description: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = generateFallbackPrompt(title, description);

  try {
    const result = await model.generateContent([{ text: prompt }]);
    const text = result.response.text();

    if (!text) {
      throw new Error('Gemini API 未返回任何內容');
    }

    return text;
  } catch (error: any) {
    if (error.message?.includes('API key')) {
      throw new Error('API Key 無效或已過期');
    }
    throw new Error('分析失敗，請稍後再試');
  }
}
