import { NextRequest, NextResponse } from 'next/server';
import { validateYouTubeUrl, analyzeVideo, generateTTS } from '@/widgets/vidcast/gemini';

// 使用 Edge Runtime（更長執行時間）
export const runtime = 'edge';
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

    // 2. 驗證 YouTube URL（先驗證 URL，避免浪費 API 配額）
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

    // 4. 視頻分析（使用 API Key）
    console.log(`[Summarize] 開始分析視頻: ${videoUrl}`);
    const textSummary = await analyzeVideo(apiKey, videoUrl);

    // 5. 返回結果（暫時不生成 TTS 以避免超時）
    return NextResponse.json({
      success: true,
      textSummary,
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
