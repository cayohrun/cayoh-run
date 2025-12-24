import { NextRequest, NextResponse } from 'next/server';
import { validateYouTubeUrl, analyzeWithSubtitles, analyzeWithFallback } from '@/widgets/vidcast/gemini';
import { fetchSubtitles, fetchVideoMetadata } from '@/lib/vidcast/subtitle';
import { preprocessSubtitles, formatForPrompt } from '@/lib/vidcast/preprocess';
import { parseModelOutput, validateAndClean, createLowConfidenceResult, ValidatedResult } from '@/lib/vidcast/postprocess';

// 使用 Node.js Runtime（字幕套件需要）
export const runtime = 'nodejs';
export const maxDuration = 60;

// Rate Limiting
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 分鐘
const MAX_REQUESTS = 3; // 每分鐘最多 3 次

function checkRateLimit(ip: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];

  // 清理過期記錄
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (validTimestamps.length >= MAX_REQUESTS) {
    return {
      allowed: false,
      error: '請求過於頻繁，請稍後再試（每分鐘最多 3 次）'
    };
  }

  validTimestamps.push(now);
  requestTimestamps.set(ip, validTimestamps);

  return { allowed: true };
}

function validateApiKey(apiKey: string): { valid: boolean; error?: string } {
  // Google API Key 格式驗證 (AIza 開頭，39 字符)
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API Key 格式錯誤' };
  }

  if (!apiKey.startsWith('AIza')) {
    return { valid: false, error: 'API Key 必須以 AIza 開頭' };
  }

  if (apiKey.length !== 39) {
    return { valid: false, error: 'API Key 長度錯誤（應為 39 字符）' };
  }

  return { valid: true };
}

export async function POST(req: NextRequest) {
  try {
    // Rate Limiting 檢查
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.error },
        { status: 429 }
      );
    }

    const { videoUrl, apiKey } = await req.json();

    // 1. 驗證輸入
    if (!videoUrl || !apiKey) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }

    // 2. 驗證 YouTube URL
    const validation = validateYouTubeUrl(videoUrl);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 3. 驗證 API Key 格式
    const keyValidation = validateApiKey(apiKey);
    if (!keyValidation.valid) {
      return NextResponse.json(
        { error: keyValidation.error },
        { status: 400 }
      );
    }

    // 4. 抓取字幕
    console.log(`[Summarize] 開始抓取字幕: ${videoUrl}`);
    const subtitleResult = await fetchSubtitles(videoUrl);

    let result: ValidatedResult;

    if (subtitleResult.available && subtitleResult.segments.length > 0) {
      // ===== 有字幕：使用 Facts-based 分析 =====
      console.log(`[Summarize] 字幕可用 (${subtitleResult.language}), 共 ${subtitleResult.segments.length} 段`);

      // 5. 前處理
      const preprocessed = preprocessSubtitles(subtitleResult.segments);
      const promptContent = formatForPrompt(preprocessed);
      console.log(`[Summarize] 前處理完成: ${preprocessed.metadata.segmentCount} 段, ${preprocessed.extractedNumbers.length} 個數字`);

      // 6. 調用模型（單次調用）
      console.log(`[Summarize] 開始分析...`);
      const rawOutput = await analyzeWithSubtitles(apiKey, promptContent);

      // 7. 解析 JSON
      const parsed = parseModelOutput(rawOutput);
      if (!parsed) {
        console.error('[Summarize] JSON 解析失敗，原始輸出:', rawOutput.slice(0, 500));
        throw new Error('模型輸出格式錯誤，請重試');
      }

      // 8. 校驗
      result = validateAndClean(parsed, true);
      console.log(`[Summarize] 分析完成, 可信度: ${result.confidence}, facts: ${result.facts.length}`);

    } else {
      // ===== 無字幕：降級模式 =====
      console.log(`[Summarize] 無字幕可用: ${subtitleResult.error || '未知原因'}`);

      // Server-side 抓取視頻 metadata
      console.log(`[Summarize] 抓取視頻 metadata...`);
      const metadata = await fetchVideoMetadata(videoUrl);

      if (!metadata || !metadata.title) {
        // 連 metadata 都抓不到，直接報錯
        return NextResponse.json({
          success: false,
          error: '此視頻沒有可用字幕，且無法獲取視頻資訊',
          confidence: 'low',
        }, { status: 400 });
      }

      // 使用降級模式（基於 oEmbed metadata）
      console.log(`[Summarize] 使用降級模式，標題: ${metadata.title}`);
      const rawOutput = await analyzeWithFallback(apiKey, metadata.title, `作者: ${metadata.author}`);

      const parsed = parseModelOutput(rawOutput);
      if (!parsed) {
        result = createLowConfidenceResult(metadata.title, metadata.author, '無法生成摘要');
      } else {
        result = {
          ...parsed,
          confidence: 'low',
          warnings: ['無字幕，僅基於標題描述生成，不含具體數據'],
        };
      }
    }

    // 9. 返回結果
    return NextResponse.json({
      success: true,
      textSummary: result.summary,
      facts: result.facts,
      confidence: result.confidence,
      warnings: result.warnings,
      hasSubtitles: subtitleResult.available,
      audioUrl: null, // TTS 暫時禁用
    });

  } catch (error: any) {
    console.error('[Summarize] 錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || '處理失敗，請稍後再試',
      },
      { status: 500 }
    );
  }
}
