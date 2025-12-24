import 'server-only';

/**
 * 事實項目
 */
export interface Fact {
  id: number;
  time: string;
  fact: string;
}

/**
 * 模型原始輸出
 */
export interface RawModelOutput {
  facts: Fact[];
  summary: string;
}

/**
 * 校驗後的結果
 */
export interface ValidatedResult {
  facts: Fact[];
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

/**
 * 從 summary 中提取所有數字
 */
function extractNumbersFromText(text: string): string[] {
  const numbers: string[] = [];

  const patterns = [
    // 阿拉伯數字 + 單位
    /\d+(?:,\d{3})*(?:\.\d+)?\s*(?:億|萬|千|百|%|美元|美金|人民幣|元|台|人|年|月|日|天|小時|分鐘|秒)?/g,
    // 年份
    /(19|20)\d{2}\s*年?/g,
  ];

  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      const value = match[0].trim();
      if (value && !numbers.includes(value)) {
        numbers.push(value);
      }
    }
  }

  return numbers;
}

/**
 * 檢查數字是否存在於 facts 中
 */
function isNumberInFacts(num: string, facts: Fact[]): boolean {
  const normalizedNum = num.replace(/[,\s]/g, '');

  for (const fact of facts) {
    const normalizedFact = fact.fact.replace(/[,\s]/g, '');
    if (normalizedFact.includes(normalizedNum)) {
      return true;
    }
  }

  return false;
}

/**
 * 解析模型返回的 JSON
 */
export function parseModelOutput(rawText: string): RawModelOutput | null {
  try {
    // 嘗試直接解析
    const parsed = JSON.parse(rawText);
    if (parsed.facts && parsed.summary) {
      return parsed;
    }
  } catch {
    // 嘗試從 Markdown 代碼塊中提取 JSON
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.facts && parsed.summary) {
          return parsed;
        }
      } catch {
        // 繼續嘗試其他方法
      }
    }

    // 嘗試找到 JSON 對象
    const objectMatch = rawText.match(/\{[\s\S]*"facts"[\s\S]*"summary"[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (parsed.facts && parsed.summary) {
          return parsed;
        }
      } catch {
        // 解析失敗
      }
    }
  }

  return null;
}

/**
 * 校驗並清理模型輸出
 *
 * @param rawOutput - 模型原始輸出
 * @param hasSubtitles - 是否有字幕（影響 confidence）
 */
export function validateAndClean(
  rawOutput: RawModelOutput,
  hasSubtitles: boolean = true
): ValidatedResult {
  const warnings: string[] = [];

  // 提取 summary 中的數字
  const summaryNumbers = extractNumbersFromText(rawOutput.summary);

  // 檢查每個數字是否在 facts 中
  let cleanedSummary = rawOutput.summary;
  let unmatchedCount = 0;

  for (const num of summaryNumbers) {
    if (!isNumberInFacts(num, rawOutput.facts)) {
      unmatchedCount++;
      warnings.push(`數字 "${num}" 未在事實清單中找到`);

      // 將未驗證的數字標記為「待驗證」
      const markedNum = `${num}（待驗證）`;
      if (!cleanedSummary.includes(markedNum)) {
        cleanedSummary = cleanedSummary.replace(num, markedNum);
      }
    }
  }

  // 計算 confidence
  let confidence: 'high' | 'medium' | 'low';

  if (!hasSubtitles) {
    confidence = 'low';
  } else if (unmatchedCount === 0 && rawOutput.facts.length >= 3) {
    confidence = 'high';
  } else if (unmatchedCount <= 2 && rawOutput.facts.length >= 1) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    facts: rawOutput.facts,
    summary: cleanedSummary,
    confidence,
    warnings,
  };
}

/**
 * 生成低可信度結果（無字幕時使用）
 */
export function createLowConfidenceResult(
  title: string,
  description: string,
  summary: string
): ValidatedResult {
  return {
    facts: [],
    summary,
    confidence: 'low',
    warnings: ['無字幕，僅基於標題描述生成，不含具體數據'],
  };
}
