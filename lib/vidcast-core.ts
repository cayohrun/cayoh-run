/**
 * VidCast 核心邏輯模塊
 *
 * 提取自 widgets/vidcast/gemini.ts 的核心功能
 * 可在 Claude Code Skill、LINE Chatbot、Agent SDK 等環境中重用
 *
 * @module vidcast-core
 * @version 1.0.0
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ========== 類型定義 ==========

/**
 * URL 驗證結果
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 視頻分析配置
 */
export interface AnalysisConfig {
  language?: 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko';
  detailLevel?: 'brief' | 'medium' | 'detailed';
  includeTimestamps?: boolean;
}

/**
 * TTS 配置
 */
export interface TTSConfig {
  voice?: 'Kore' | 'Aoede' | 'Charon' | 'Fenrir' | 'Puck';
  maxLength?: number;
}

/**
 * 分析結果
 */
export interface AnalysisResult {
  summary: string;
  wordCount: number;
  language: string;
}

// ========== YouTube URL 驗證 ==========

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
 *
 * @param url - YouTube URL
 * @returns 驗證結果，包含 video ID
 */
export function validateYouTubeUrl(url: string): ValidationResult & { videoId?: string } {
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

// ========== Prompt 生成 ==========

/**
 * 生成播報式 Prompt（繁體中文）
 *
 * @param config - 分析配置
 * @returns Prompt 字串
 */
export function generateBroadcastPrompt(config: AnalysisConfig = {}): string {
  const language = config.language || 'zh-TW';
  const detailLevel = config.detailLevel || 'medium';

  // 根據詳細程度調整字數要求
  const wordCounts = {
    brief: { short: '300-500', medium: '500-700', long: '800-1000' },
    medium: { short: '600-800', medium: '1000-1400', long: '1600-2000' },
    detailed: { short: '1000-1500', medium: '1500-2500', long: '2500-3500' }
  };

  const counts = wordCounts[detailLevel];

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
   - 短視頻（<5分鐘）：3-4 段
   - 中長視頻（5-15分鐘）：5-7 段
   - 長視頻（>15分鐘）：8-10 段
3. 每段聚焦一個主題，使用自然的段落過渡
4. 結尾用 1-2 句話總結全文

## 風格要求
- 語言：${language === 'zh-TW' ? '繁體中文' : language === 'zh-CN' ? '简体中文' : language === 'en' ? 'English' : language}
- 語氣：客觀專業、敘述流暢
- 文章形式：像新聞報導或深度文章，而非條列式筆記
- 長度：
  - 短視頻（<5分鐘）：${counts.short} 字
  - 中長視頻（5-15分鐘）：${counts.medium} 字
  - 長視頻（>15分鐘）：${counts.long} 字

## 分析要求
- 從視頻第一秒到最後一秒完整分析
- 確保開頭、中段、結尾都有充分描述
- 捕捉關鍵轉折點和核心觀點
- 直接分析畫面和音頻內容

請直接輸出文章，不需要標題、不需要格式標記、不需要時間戳。
從第一句話開始就是正文內容。
`.trim();
}

// ========== 視頻分析 ==========

/**
 * 分析 YouTube 視頻生成播報稿（使用 API Key）
 *
 * @param apiKey - Gemini API Key
 * @param videoUrl - YouTube URL
 * @param config - 分析配置
 * @returns 播報式摘要
 *
 * @throws {Error} API Key 無效、配額用完、視頻無法訪問等錯誤
 *
 * @example
 * ```typescript
 * try {
 *   const summary = await analyzeVideo(
 *     'AIzaSy...',
 *     'https://www.youtube.com/watch?v=xxx'
 *   );
 *   console.log(summary);
 * } catch (error) {
 *   console.error(error.message);
 * }
 * ```
 */
export async function analyzeVideo(
  apiKey: string,
  videoUrl: string,
  config: AnalysisConfig = {}
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = generateBroadcastPrompt(config);

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
    throw new Error(`視頻分析失敗：${error.message}`);
  }
}

/**
 * 使用 OAuth token 分析 YouTube 視頻
 *
 * @param accessToken - Firebase OAuth Token
 * @param videoUrl - YouTube URL
 * @param config - 分析配置
 * @returns 播報式摘要
 */
export async function analyzeVideoWithToken(
  accessToken: string,
  videoUrl: string,
  config: AnalysisConfig = {}
): Promise<string> {
  const prompt = generateBroadcastPrompt(config);

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
      throw new Error('API 配額已用完，請稍後再試');
    } else if (error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('Service Unavailable')) {
      throw new Error('Google 服務暫時過載，請稍候 1-2 分鐘後再試');
    } else if (error.message?.includes('video')) {
      throw new Error('無法訪問該視頻，請確認視頻為公開狀態');
    }
    throw new Error(`視頻分析失敗：${error.message}`);
  }
}

// ========== TTS 生成 ==========

/**
 * 清理 Markdown 格式，保留純文字用於 TTS
 *
 * @param text - 原始文本
 * @returns 清理後的文本
 */
export function cleanTextForTTS(text: string): string {
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
 * 將 PCM 音頻數據包裝成 WAV 格式
 *
 * @param pcmData - Base64 編碼的 PCM 數據
 * @returns WAV 格式的 data URI
 */
export function pcmToWav(pcmData: string): string {
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
 * 生成 TTS 語音（使用 API Key）
 *
 * @param apiKey - Gemini API Key
 * @param text - 要轉換的文本
 * @param config - TTS 配置
 * @returns WAV 格式的 data URI，失敗時返回 null
 *
 * @example
 * ```typescript
 * const audioUrl = await generateTTS('AIzaSy...', '這是測試文本');
 * if (audioUrl) {
 *   console.log('音頻生成成功');
 * }
 * ```
 */
export async function generateTTS(
  apiKey: string,
  text: string,
  config: TTSConfig = {}
): Promise<string | null> {
  try {
    // 清理 Markdown 格式
    const cleanedText = cleanTextForTTS(text);

    // 限制文字長度（避免超過 32k token 限制）
    const maxLength = config.maxLength || 3000;
    const truncatedText = cleanedText.length > maxLength
      ? cleanedText.slice(0, maxLength) + '...'
      : cleanedText;

    const genAI = new GoogleGenerativeAI(apiKey);

    // 使用 Gemini 2.5 Flash TTS 專用模型
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-tts',
    });

    // Gemini TTS API 支持 responseModalities，但 SDK 類型定義尚未更新
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: truncatedText }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voice || 'Kore',
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
 * 使用 OAuth token 生成 TTS 語音
 *
 * @param accessToken - Firebase OAuth Token
 * @param text - 要轉換的文本
 * @param config - TTS 配置
 * @returns WAV 格式的 data URI，失敗時返回 null
 */
export async function generateTTSWithToken(
  accessToken: string,
  text: string,
  config: TTSConfig = {}
): Promise<string | null> {
  try {
    // 清理 Markdown 格式
    const cleanedText = cleanTextForTTS(text);

    // 限制文字長度
    const maxLength = config.maxLength || 3000;
    const truncatedText = cleanedText.length > maxLength
      ? cleanedText.slice(0, maxLength) + '...'
      : cleanedText;

    const result = await callGeminiWithToken(
      accessToken,
      'gemini-2.5-flash-preview-tts',
      [{
        role: 'user',
        parts: [{ text: truncatedText }],
      }],
      {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voice || 'Kore',
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

// ========== 輔助函式 ==========

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

// ========== 高級功能 ==========

/**
 * 批量分析多個視頻
 *
 * @param apiKey - Gemini API Key
 * @param videoUrls - YouTube URL 列表
 * @param config - 分析配置
 * @param onProgress - 進度回調
 * @returns 分析結果列表
 *
 * @example
 * ```typescript
 * const results = await batchAnalyze(
 *   'AIzaSy...',
 *   ['url1', 'url2', 'url3'],
 *   {},
 *   (current, total) => console.log(`${current}/${total}`)
 * );
 * ```
 */
export async function batchAnalyze(
  apiKey: string,
  videoUrls: string[],
  config: AnalysisConfig = {},
  onProgress?: (current: number, total: number) => void
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];

    try {
      const summary = await analyzeVideo(apiKey, url, config);
      results.push({
        summary,
        wordCount: summary.length,
        language: config.language || 'zh-TW'
      });

      if (onProgress) {
        onProgress(i + 1, videoUrls.length);
      }

      // 避免 rate limiting
      if (i < videoUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      console.error(`分析 ${url} 失敗:`, error.message);
      results.push({
        summary: `錯誤：${error.message}`,
        wordCount: 0,
        language: config.language || 'zh-TW'
      });
    }
  }

  return results;
}

/**
 * 完整的視頻處理管線（分析 + TTS）
 *
 * @param apiKey - Gemini API Key
 * @param videoUrl - YouTube URL
 * @param config - 配置
 * @returns 摘要和音頻
 */
export async function processVideo(
  apiKey: string,
  videoUrl: string,
  config: { analysis?: AnalysisConfig; tts?: TTSConfig } = {}
): Promise<{ summary: string; audioUrl: string | null }> {
  // 驗證 URL
  const validation = validateYouTubeUrl(videoUrl);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 分析視頻
  const summary = await analyzeVideo(apiKey, videoUrl, config.analysis);

  // 生成 TTS
  const audioUrl = await generateTTS(apiKey, summary, config.tts);

  return { summary, audioUrl };
}
