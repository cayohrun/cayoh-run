import 'server-only';
import { SubtitleSegment } from './subtitle';

/**
 * 前處理後的分段
 */
export interface ProcessedSegment {
  timeRange: string;  // "00:00-02:30"
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/**
 * 抽取的數字
 */
export interface ExtractedNumber {
  value: string;      // 原始數字字串（含單位）
  context: string;    // 前後文（約 20 字）
  timeRange: string;  // 所在時間區間
}

/**
 * 前處理結果
 */
export interface PreprocessResult {
  segments: ProcessedSegment[];
  extractedNumbers: ExtractedNumber[];
  metadata: {
    totalDuration: number;
    segmentCount: number;
    totalCharacters: number;
  };
}

/**
 * 格式化時間（秒 → MM:SS）
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 清理字幕文字
 * - 移除口頭語（使用精確匹配，避免誤刪）
 * - 移除重複詞
 * - 正規化標點
 */
function cleanText(text: string): string {
  return text
    // 移除重複的語氣詞（嗯嗯、啊啊 等）
    .replace(/[嗯啊呃唉哦喔欸]{2,}/g, '')
    // 移除常見口頭填充語（完整詞彙匹配）
    .replace(/那個|這個|就是說|然後呢|對不對|你知道嗎|怎麼說呢/g, '')
    // 移除重複的標點
    .replace(/[，,]{2,}/g, '，')
    .replace(/[。.]{2,}/g, '。')
    .replace(/[、]{2,}/g, '、')
    // 移除多餘空白
    .replace(/\s+/g, ' ')
    // 正規化引號
    .replace(/["']/g, '"')
    .replace(/["']/g, '"')
    .trim();
}

/**
 * 將字幕分段（每 2-3 分鐘或 500-800 字一段）
 */
function segmentSubtitles(
  subtitles: SubtitleSegment[],
  options: { maxDuration?: number; maxChars?: number } = {}
): ProcessedSegment[] {
  const maxDuration = options.maxDuration || 180;  // 3 分鐘
  const maxChars = options.maxChars || 800;

  const segments: ProcessedSegment[] = [];
  let currentSegment: SubtitleSegment[] = [];
  let currentStart = 0;
  let currentChars = 0;

  for (const sub of subtitles) {
    const cleanedText = cleanText(sub.text);
    const duration = sub.end - currentStart;

    // 檢查是否需要開始新段落
    if (
      currentSegment.length > 0 &&
      (duration >= maxDuration || currentChars + cleanedText.length >= maxChars)
    ) {
      // 保存當前段落
      const lastSub = currentSegment[currentSegment.length - 1];
      segments.push({
        timeRange: `${formatTime(currentStart)}-${formatTime(lastSub.end)}`,
        startSeconds: currentStart,
        endSeconds: lastSub.end,
        text: currentSegment.map((s) => cleanText(s.text)).join(' '),
      });

      // 重置
      currentSegment = [];
      currentStart = sub.start;
      currentChars = 0;
    }

    if (currentSegment.length === 0) {
      currentStart = sub.start;
    }

    currentSegment.push(sub);
    currentChars += cleanedText.length;
  }

  // 處理最後一個段落
  if (currentSegment.length > 0) {
    const lastSub = currentSegment[currentSegment.length - 1];
    segments.push({
      timeRange: `${formatTime(currentStart)}-${formatTime(lastSub.end)}`,
      startSeconds: currentStart,
      endSeconds: lastSub.end,
      text: currentSegment.map((s) => cleanText(s.text)).join(' '),
    });
  }

  return segments;
}

/**
 * 從文字中抽取數字（含單位）
 */
function extractNumbers(segments: ProcessedSegment[]): ExtractedNumber[] {
  const numbers: ExtractedNumber[] = [];

  // 數字模式
  const patterns = [
    // 阿拉伯數字 + 單位
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(億|萬|千|百|%|美元|美金|人民幣|元|台|人|年|月|日|天|小時|分鐘|秒)/g,
    // 年份
    /\b(19|20)\d{2}\s*年/g,
    // 百分比
    /\d+(?:\.\d+)?%/g,
    // 金額（帶貨幣符號）
    /[$¥€£]\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(億|萬|千|百))?/g,
  ];

  for (const segment of segments) {
    const text = segment.text;

    for (const pattern of patterns) {
      let match;
      // 重置 regex 狀態
      pattern.lastIndex = 0;

      while ((match = pattern.exec(text)) !== null) {
        const value = match[0];
        const index = match.index;

        // 提取上下文（前後約 10 個字）
        const contextStart = Math.max(0, index - 10);
        const contextEnd = Math.min(text.length, index + value.length + 10);
        const context = text.slice(contextStart, contextEnd);

        // 避免重複
        const exists = numbers.some(
          (n) => n.value === value && n.timeRange === segment.timeRange
        );

        if (!exists) {
          numbers.push({
            value,
            context: context.trim(),
            timeRange: segment.timeRange,
          });
        }
      }
    }
  }

  return numbers;
}

/**
 * 前處理字幕
 *
 * @param subtitles - 原始字幕片段
 * @returns 處理後的結果（分段 + 數字清單）
 */
export function preprocessSubtitles(subtitles: SubtitleSegment[]): PreprocessResult {
  // 分段
  const segments = segmentSubtitles(subtitles);

  // 抽取數字
  const extractedNumbers = extractNumbers(segments);

  // 計算總字數
  const totalCharacters = segments.reduce((sum, s) => sum + s.text.length, 0);

  // 計算總時長
  const lastSegment = segments[segments.length - 1];
  const totalDuration = lastSegment ? lastSegment.endSeconds : 0;

  return {
    segments,
    extractedNumbers,
    metadata: {
      totalDuration,
      segmentCount: segments.length,
      totalCharacters,
    },
  };
}

/**
 * 將前處理結果格式化為 Prompt 用的文字
 */
export function formatForPrompt(result: PreprocessResult): string {
  let output = '## 分段字幕\n\n';

  for (const segment of result.segments) {
    output += `【${segment.timeRange}】\n${segment.text}\n\n`;
  }

  if (result.extractedNumbers.length > 0) {
    output += '## 預抽取數字清單\n\n';
    for (const num of result.extractedNumbers) {
      output += `- ${num.value}（${num.timeRange}）: "${num.context}"\n`;
    }
  }

  return output;
}
