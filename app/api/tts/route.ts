import { NextRequest, NextResponse } from 'next/server';
import { generateTTS } from '@/widgets/vidcast/gemini';

// 使用 Edge Runtime
export const runtime = 'edge';
export const maxDuration = 60;

// Rate Limiting
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 分鐘
const MAX_REQUESTS = 5; // 每分鐘最多 5 次

function checkRateLimit(ip: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];

  // 清理過期記錄
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (validTimestamps.length >= MAX_REQUESTS) {
    return {
      allowed: false,
      error: '請求過於頻繁，請稍後再試（每分鐘最多 5 次）'
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

    const { text, apiKey } = await req.json();

    // 1. 驗證輸入
    if (!text || !apiKey) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }

    // 2. 驗證 API Key 格式
    const keyValidation = validateApiKey(apiKey);
    if (!keyValidation.valid) {
      return NextResponse.json(
        { error: keyValidation.error },
        { status: 400 }
      );
    }

    // 3. TTS 生成
    console.log('[TTS] 開始生成語音');
    const audioUrl = await generateTTS(apiKey, text);

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'TTS 生成失敗' },
        { status: 500 }
      );
    }

    // 4. 返回結果
    return NextResponse.json({
      success: true,
      audioUrl,
    });

  } catch (error: any) {
    console.error('[TTS] 錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'TTS 生成失敗，請稍後再試',
      },
      { status: 500 }
    );
  }
}
