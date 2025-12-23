'use client';

import { useState, useEffect, useRef } from 'react';
import { Youtube, Copy, Download, RefreshCw, Zap, ArrowUpRight, Key, ExternalLink, Shield, Lock, Settings, X, Trash2, Play, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

type SummaryResult = {
  textSummary: string;
  audioUrl: string | null;
};

const API_KEY_STORAGE_KEY = 'gemini_api_key';
const TTS_USAGE_STORAGE_KEY = 'gemini_tts_usage';
const TTS_FREE_QUOTA = 20; // Google Gemini 免費額度

type LoadingStage = 'analyzing' | 'generating-tts' | null;

type TtsUsage = {
  date: string;
  count: number;
};

export const VidCastWidget = () => {
  // ========== 狀態管理 ==========
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const [showKeyManagement, setShowKeyManagement] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null);
  const [error, setError] = useState('');
  const [storageAvailable, setStorageAvailable] = useState(false); // 修復：預設 false 避免 hydration mismatch
  const [ttsUsageCount, setTtsUsageCount] = useState<number>(0);

  // 音頻播放器狀態
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformBars] = useState(() => Array.from({ length: 20 }, () => Math.random() * 100));

  // ========== 檢測 localStorage 可用性 ==========
  const checkStorageAvailability = (): boolean => {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  // ========== TTS 使用計數器 ==========
  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const loadTtsUsage = (): number => {
    if (!storageAvailable) return 0;

    try {
      const stored = localStorage.getItem(TTS_USAGE_STORAGE_KEY);
      if (!stored) return 0;

      const usage: TtsUsage = JSON.parse(stored);
      const today = getTodayDate();

      // 如果是今天的記錄，返回計數；否則重置
      if (usage.date === today) {
        return usage.count;
      } else {
        // 新的一天，重置計數
        localStorage.setItem(TTS_USAGE_STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
        return 0;
      }
    } catch (e) {
      console.warn('無法讀取 TTS 使用記錄:', e);
      return 0;
    }
  };

  const incrementTtsUsage = (): void => {
    if (!storageAvailable) return;

    const today = getTodayDate();
    const newCount = ttsUsageCount + 1;

    try {
      localStorage.setItem(TTS_USAGE_STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
      setTtsUsageCount(newCount);
    } catch (e) {
      console.warn('無法更新 TTS 使用記錄:', e);
    }
  };

  // ========== 音頻播放器控制 ==========
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // ========== 載入儲存的 API Key 和 TTS 使用記錄 ==========
  useEffect(() => {
    const isAvailable = checkStorageAvailability();
    setStorageAvailable(isAvailable);

    if (!isAvailable) {
      setShowApiKeyInput(true);
      return;
    }

    // 載入 API Key
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setShowApiKeyInput(true);
    }

    // 載入 TTS 使用計數
    const usage = loadTtsUsage();
    setTtsUsageCount(usage);
  }, []);

  // ========== 儲存 API Key ==========
  const handleSaveApiKey = (key: string) => {
    if (storageAvailable) {
      try {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
      } catch (e) {
        console.warn('無法儲存 API Key 到 localStorage:', e);
      }
    }
    setApiKey(key);
    setShowApiKeyInput(false);
  };

  // ========== 重設 API Key ==========
  const handleResetApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setShowApiKeyInput(true);
    setResult(null);
    setVideoUrl('');
  };

  // ========== 視頻總結 ==========
  const handleGenerate = async () => {
    if (!videoUrl.trim()) {
      setError('請輸入 YouTube 連結');
      return;
    }

    setLoading(true);
    setLoadingStage('analyzing');
    setError('');
    setResult(null);

    try {
      // 第一階段：視頻分析
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, apiKey }),
      });

      // 檢查 HTTP 狀態
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || '處理失敗');
        } catch {
          throw new Error(errorText || `HTTP ${res.status}: 處理失敗`);
        }
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // 立即顯示文字摘要
      setResult({
        textSummary: data.textSummary,
        audioUrl: null,
      });

      // 第二階段：TTS 生成（異步）
      setLoadingStage('generating-tts');

      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.textSummary, apiKey }),
        });

        console.log('[TTS] API 響應狀態:', ttsRes.status);

        if (!ttsRes.ok) {
          const errorText = await ttsRes.text();
          console.error('[TTS] API 錯誤:', errorText);
          throw new Error(`TTS 生成失敗: ${errorText}`);
        }

        const ttsData = await ttsRes.json();
        console.log('[TTS] API 響應數據:', ttsData);

        if (ttsData.success && ttsData.audioUrl) {
          // 更新結果，添加音頻
          setResult({
            textSummary: data.textSummary,
            audioUrl: ttsData.audioUrl,
          });
          incrementTtsUsage();
          console.log('[TTS] 語音生成成功');
        } else {
          console.warn('[TTS] 無效的響應數據:', ttsData);
        }
      } catch (ttsError: any) {
        console.error('[TTS] 生成失敗:', ttsError);
        // TTS 失敗不影響主流程，用戶仍然可以看到文字摘要
      }
    } catch (err: any) {
      setError(err.message || '處理失敗');
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  // ========== API Key 設定頁面 ==========
  if (showApiKeyInput) {
    return (
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="p-2 bg-zinc-800/50 rounded-lg inline-block border border-white/5 text-red-400">
            <Zap size={24} className="fill-current" />
          </div>
          <ArrowUpRight className="text-zinc-600" />
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">VidCast AI</h2>
            <p className="text-zinc-400 text-sm mt-1">
              YouTube 視頻 → 播報式摘要 + AI 語音播報
            </p>
          </div>

          {/* localStorage 不可用警告 */}
          {!storageAvailable && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-2 text-red-400 text-sm">
                <Shield size={16} className="mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">⚠️ 無法使用瀏覽器儲存功能</p>
                  <p className="text-xs text-red-300/80 leading-relaxed">
                    你的瀏覽器環境（例如 LINE、微信內建瀏覽器或隱私模式）不支援資料儲存。
                    每次使用都需要重新輸入 API Key。
                  </p>
                  <p className="text-xs text-red-300/80">
                    <strong>建議：</strong>使用手機的 Safari、Chrome 等標準瀏覽器開啟此網站。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 安全說明區塊 */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
              <Shield size={16} />
              <span>安全說明</span>
            </div>
            <ul className="text-xs text-amber-300/80 space-y-1.5 leading-relaxed">
              <li>• API Key {storageAvailable ? '將儲存在你的瀏覽器本地（localStorage）' : '僅保存在記憶體中（關閉頁面後消失）'}</li>
              <li>• 不會上傳到我們的伺服器，僅用於調用 Google API</li>
              <li>• 建議使用免費配額的 API Key，避免費用風險</li>
              {storageAvailable && <li>• 離開此網站前可隨時刪除 API Key</li>}
            </ul>
            <button
              onClick={() => setShowSecurityDetails(!showSecurityDetails)}
              className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors"
            >
              {showSecurityDetails ? '隱藏' : '了解更多安全細節'}
            </button>
          </div>

          {/* 安全細節折疊面板 */}
          {showSecurityDetails && (
            <div className="bg-zinc-900/80 border border-zinc-700 rounded-xl p-4 space-y-3 text-xs text-zinc-400">
              <div>
                <h4 className="text-zinc-300 font-medium mb-1">風險說明</h4>
                <p>localStorage 是明文儲存，惡意腳本（XSS）可能讀取你的 API Key。建議：</p>
                <ul className="mt-2 space-y-1 ml-4">
                  <li>1. 僅在 Google AI Studio 設定 API Key 使用限制</li>
                  <li>2. 定期檢查配額使用情況</li>
                  <li>3. 不使用時立即刪除 API Key</li>
                </ul>
              </div>
              <div>
                <h4 className="text-zinc-300 font-medium mb-1">資料流向</h4>
                <p className="font-mono text-[10px] text-zinc-500">
                  你的瀏覽器 → cayoh.run 後端 → Google Gemini API
                </p>
                <p className="mt-1">後端僅轉發請求，不記錄或儲存你的 API Key。</p>
              </div>
            </div>
          )}

          {/* 快速開始引導 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">1</div>
              <span>點擊下方按鈕前往 Google AI Studio</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">2</div>
              <span>用 Google 帳號登入（免費）</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">3</div>
              <span>點擊「Create API Key」複製 key</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">4</div>
              <span>貼上到下方輸入框，按 Enter</span>
            </div>
          </div>

          {/* 獲取 API Key 按鈕 */}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-medium rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
          >
            <ExternalLink size={16} />
            前往 Google AI Studio 獲取免費 API Key
          </a>

          {/* API Key 輸入 */}
          <input
            type="password"
            placeholder="貼上 API Key 後按 Enter..."
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 px-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                handleSaveApiKey(e.currentTarget.value.trim());
              }
            }}
          />

          <div className="flex gap-2">
            <Badge color="red">2.5 Flash-Lite</Badge>
            <Badge>Your Quota</Badge>
            <Badge>Free</Badge>
          </div>
        </div>

        {/* 背景裝飾 */}
        <div className="absolute right-0 bottom-0 w-40 h-40 bg-gradient-to-tl from-red-500/10 to-transparent rounded-tl-full pointer-events-none" />
      </div>
    );
  }

  // ========== 顯示結果 ==========
  if (result) {
    return (
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-mono text-zinc-400">GENERATED</span>
          </div>
          <div className="flex gap-2 items-center">
            {/* TTS 計數器（緊湊版）*/}
            <div className="flex items-center gap-1 text-[10px] font-mono mr-2">
              <span className="text-zinc-600">TTS:</span>
              <span className={`font-bold ${
                ttsUsageCount >= TTS_FREE_QUOTA ? 'text-red-400' :
                ttsUsageCount >= TTS_FREE_QUOTA * 0.8 ? 'text-amber-400' :
                'text-emerald-500'
              }`}>
                {ttsUsageCount}/{TTS_FREE_QUOTA}
              </span>
            </div>
            <button
              onClick={handleResetApiKey}
              className="text-xs text-zinc-600 hover:text-red-400 transition"
              title="重設 API Key"
            >
              <Key size={14} />
            </button>
            <button
              onClick={() => setResult(null)}
              className="text-xs text-zinc-500 hover:text-white transition"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          {/* 自定義音頻播放器 */}
          {result.audioUrl && (
            <div className="bg-zinc-800/50 rounded-xl p-3 flex items-center gap-3 border border-white/5">
              {/* 播放/暫停按鈕 */}
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 hover:bg-red-400 transition-colors"
              >
                {isPlaying ? (
                  <Pause size={12} fill="white" />
                ) : (
                  <Play size={12} fill="white" className="ml-0.5" />
                )}
              </button>

              {/* 波形可視化 */}
              <div className="flex-1 h-8 flex items-center gap-0.5">
                {waveformBars.map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-zinc-600 rounded-full transition-all"
                    style={{
                      height: `${height}%`,
                      opacity: isPlaying ? 1 : 0.3,
                      backgroundColor: isPlaying ? '#ef4444' : undefined,
                    }}
                  />
                ))}
              </div>

              {/* 隱藏的原生 audio 元素 */}
              <audio
                ref={audioRef}
                src={result.audioUrl}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}

          {/* 文字總結 */}
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
            {result.textSummary}
          </p>
        </div>

        {/* 操作按鈕 */}
        <div className="mt-4 pt-2 border-t border-white/5 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.textSummary);
                alert('✅ 已複製');
              }}
              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 flex items-center justify-center gap-2 transition-colors"
            >
              <Copy size={14} /> 複製
            </button>
            {result.audioUrl && (
              <a
                href={result.audioUrl}
                download="vidcast-summary.wav"
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={14} /> 下載
              </a>
            )}
          </div>

          {/* 配額警告（結果頁面）*/}
          {ttsUsageCount >= TTS_FREE_QUOTA * 0.8 && (
            <div className={`text-[10px] text-center px-2 py-1.5 rounded-lg border ${
              ttsUsageCount >= TTS_FREE_QUOTA
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {ttsUsageCount >= TTS_FREE_QUOTA ? (
                <>⚠️ 已超過免費配額，繼續使用可能被 Google 收費</>
              ) : (
                <>⚠️ 超過 {TTS_FREE_QUOTA} 次/天可能被收費</>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== 輸入模式 ==========
  return (
    <div className="relative z-10 h-full flex flex-col justify-between">
      {/* API Key 管理彈窗 */}
      {showKeyManagement && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-20 rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-medium">API Key 管理</h3>
            <button
              onClick={() => setShowKeyManagement(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {/* 當前狀態 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-zinc-300">API Key 已設定</span>
              </div>
              <div className="font-mono text-xs text-zinc-500 bg-zinc-950 p-2 rounded">
                {apiKey.slice(0, 8)}••••••••••••{apiKey.slice(-4)}
              </div>
            </div>

            {/* 儲存位置說明 */}
            <div className="text-xs text-zinc-500 space-y-2">
              <p><strong className="text-zinc-400">儲存位置：</strong> localStorage (gemini_api_key)</p>
              <p><strong className="text-zinc-400">使用方式：</strong> 僅在你的瀏覽器調用 Google API</p>
              <p><strong className="text-zinc-400">安全建議：</strong> 不使用時請刪除</p>
            </div>

            {/* 快速操作 */}
            <div className="space-y-2">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink size={14} />
                在 Google 查看配額使用
              </a>
              <button
                onClick={() => {
                  if (confirm('確定要刪除 API Key？刪除後需重新輸入才能使用。')) {
                    handleResetApiKey();
                    setShowKeyManagement(false);
                  }
                }}
                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors border border-red-500/30"
              >
                <Trash2 size={14} />
                刪除 API Key
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-zinc-400 font-mono">READY</span>
        </div>
        <div className="flex gap-2 items-center">
          {/* API Key 狀態指示 */}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 bg-zinc-900/50 px-2 py-1 rounded-md border border-zinc-800">
            <Lock size={10} className="text-emerald-500" />
            <span>Key Active</span>
          </div>
          {/* 管理按鈕 */}
          <button
            onClick={() => setShowKeyManagement(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            title="管理 API Key"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* YouTube URL 輸入 */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Youtube
              size={18}
              className="text-zinc-500 group-focus-within:text-red-500 transition-colors"
            />
          </div>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
          />
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* 生成按鈕 / 進度指示器 */}
        {loading ? (
          <div className="space-y-3">
            {/* 進度條 */}
            <div className="relative w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-1000 ${
                  loadingStage === 'analyzing' ? 'w-1/2' : 'w-full'
                }`}
              />
            </div>

            {/* 狀態文字 */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <RefreshCw size={14} className="animate-spin text-red-400" />
                <span>
                  {loadingStage === 'analyzing' ? '步驟 1/2：分析視頻內容...' : '步驟 2/2：生成 AI 語音...'}
                </span>
              </div>
              <span className="text-zinc-500 font-mono">約 1-2 分鐘</span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!videoUrl}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-medium rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            生成播報稿
            <ArrowUpRight size={16} />
          </button>
        )}
      </div>

      {/* TTS 使用計數器和警告 */}
      <div className="space-y-2">
        {/* 計數器 */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono">
          <span className="text-zinc-600">TTS 今日已用:</span>
          <span className={`font-bold ${
            ttsUsageCount >= TTS_FREE_QUOTA ? 'text-red-400' :
            ttsUsageCount >= TTS_FREE_QUOTA * 0.8 ? 'text-amber-400' :
            'text-emerald-500'
          }`}>
            {ttsUsageCount}/{TTS_FREE_QUOTA}
          </span>
        </div>

        {/* 配額警告 */}
        {ttsUsageCount >= TTS_FREE_QUOTA * 0.8 && (
          <div className={`text-[10px] text-center px-3 py-1.5 rounded-lg border ${
            ttsUsageCount >= TTS_FREE_QUOTA
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            {ttsUsageCount >= TTS_FREE_QUOTA ? (
              <>⚠️ 已超過 Google 免費配額（20次/天），繼續使用可能被收費</>
            ) : (
              <>⚠️ 接近免費配額上限，超過 {TTS_FREE_QUOTA} 次/天可能被 Google 收費</>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-[10px] text-zinc-600 text-center font-mono">
          GEMINI 2.5 FLASH-LITE · YOUR API KEY · YOUR QUOTA
        </div>
      </div>
    </div>
  );
};
