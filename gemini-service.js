// gemini-service.js - Gemini API統合サービス
class GeminiService {
    constructor() {
        this.apiKey = '';
        // 複数のAPIバージョンを試す
        this.baseUrls = [
            'https://generativelanguage.googleapis.com/v1beta',
            'https://generativelanguage.googleapis.com/v1'
        ];
    this.baseUrl = this.baseUrls[0]; // デフォルト
    this.chatModel = 'gemini-2.5-flash'; // 指定モデル：Gemini 2.5 Flash
        this.chatHistory = [];
        this.retryDelay = 1000; // リトライ間隔を短縮
        this.maxRetries = 2; // リトライ回数を減らして即座に問題を特定
        
        // 統一APIマネージャとの連携
        this.initializeWithUnifiedAPI();
        
        // Gemini 2.5 Flash用の最適化されたパラメータ
        this.chatParams = {
            temperature: 0.7,
            maxOutputTokens: 8192, // より大きなトークン数に緩和
            topP: 0.9,
            topK: 40 // より幅広い回答生成
        };

        // グラウンディング設定（正しいAPI構造で再有効化）
        this.groundingConfig = {
            enableWebSearch: true, // Web検索を再有効化
            enableDynamicRetrieval: true, // 動的な情報取得を有効化
            searchQueries: {
                sf6: 'Street Fighter 6',
                tactics: 'fighting game tactics',
                meta: 'tournament meta analysis'
            }
        };
        
        // フォールバック制御フラグ
        this.enableModelFallback = false;   // モデル変更はデフォルト無効（常に gemini-2.5-flash を使用）
        this.enableVersionFallback = true;  // v1beta→v1 などエンドポイントのバージョン切替は既定で許可
        
        // サーバー状態監視
        this.serverStatus = {
            isAvailable: true,
            lastError: null,
            overloadDetectedAt: null,
            nextRetryAfter: null
        };
    }

    // ブラウザ環境でのデバッグモード判定
    isDebugMode() {
        try {
            return (typeof window !== 'undefined' &&
                   (window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:' ||
                    window.location.search.includes('debug=true')));
        } catch (error) {
            return false;
        }
    }

    // 統一APIマネージャとの連携初期化
    initializeWithUnifiedAPI() {
        if (window.unifiedApiManager) {
            this.apiKey = window.unifiedApiManager.getAPIKey() || '';
        }
    }

    // APIキー設定（統一APIマネージャ経由）
    setApiKey(apiKey) {
        // APIキーの基本的な検証
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
            throw new Error('有効なAPIキーを入力してください');
        }
        
        // Gemini APIキーの形式チェック（基本的なパターン）
        if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
            console.warn('APIキーの形式が正しくない可能性があります。Gemini APIキーは通常"AIza"で始まり30文字以上です。');
        }
        
        this.apiKey = apiKey;
        // 循環参照を避けるため、統一APIマネージャーへの逆呼び出しは削除
        // 統一APIマネージャーから一方向でのみAPIキーを受け取る
        
        console.log('✓ Gemini APIキーが設定されました');
    }

    getApiKey() {
        // 1) 統一APIマネージャから取得（利用可能かつ設定済みなら最優先）
        if (window.unifiedApiManager) {
            try {
                if (window.unifiedApiManager.isConfigured()) {
                    this.apiKey = window.unifiedApiManager.getAPIKey() || this.apiKey;
                    return this.apiKey;
                }
            } catch (e) {
                console.debug('UnifiedAPIManager getAPIKey failed, falling back:', e?.message);
            }
        }

        // 2) レガシー保存のフォールバック（過去の入力を尊重）
        const legacy = localStorage.getItem('gemini-api-key')
            || localStorage.getItem('ai_api_key')
            || localStorage.getItem('gemini_unified_api_key');
        if (legacy) {
            this.apiKey = legacy.trim();
        }
        return this.apiKey;
    }

    // APIキーが設定されているかチェック
    isConfigured() {
        let isValid = false;

        // 1) 統一APIマネージャがあり設定済みならそれを使用
        if (window.unifiedApiManager) {
            try {
                if (window.unifiedApiManager.isConfigured()) {
                    this.apiKey = window.unifiedApiManager.getAPIKey() || '';
                    isValid = !!this.apiKey;
                }
            } catch (e) {
                console.debug('UnifiedAPIManager isConfigured check failed:', e?.message);
            }
        }

        // 2) マネージャが未設定の場合はローカル保存をフォールバック
        if (!isValid) {
            // 既に this.apiKey に値があればそれを優先
            let candidate = this.apiKey && this.apiKey.trim().length > 0 ? this.apiKey : null;
            if (!candidate) {
                candidate = localStorage.getItem('gemini-api-key')
                    || localStorage.getItem('ai_api_key')
                    || localStorage.getItem('gemini_unified_api_key');
            }
            if (candidate) {
                this.apiKey = candidate.trim();
                isValid = this.apiKey.length > 0;
            }
        }

        console.log('🔍 API設定状況:', {
            hasApiKey: !!this.apiKey,
            apiKeyLength: this.apiKey?.length,
            apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) : '',
            isConfigured: isValid,
            hasUnifiedManager: !!window.unifiedApiManager
        });

        // APIキーの形式検証も実行（ログ用途）
        this.validateApiKeyFormat();

        return isValid;
    }
    
    // APIキーの形式検証 (Gemini 2.5 Flash対応)
    validateApiKeyFormat() {
        if (!this.apiKey) return false;
        
        // Gemini APIキーの基本的な形式チェック (2024年以降の形式にも対応)
        const isValidFormat = this.apiKey.startsWith('AIza') && this.apiKey.length >= 35 && this.apiKey.length <= 45;
        console.log('🔍 Gemini 2.5 Flash用APIキー形式チェック:', {
            startsWithAIza: this.apiKey.startsWith('AIza'),
            length: this.apiKey.length,
            lengthInRange: this.apiKey.length >= 35 && this.apiKey.length <= 45,
            isValidFormat: isValidFormat,
            apiKeyExample: this.apiKey.substring(0, 15) + '...'
        });
        
        return isValidFormat;
    }

    // APIキーをクリア
    clearApiKey() {
        this.apiKey = '';
        if (window.unifiedApiManager) {
            window.unifiedApiManager.clearAPIKey();
        } else {
            localStorage.removeItem('gemini-api-key');
        }
    }

    // 接続テスト
    async testConnection() {
        if (!this.isConfigured()) {
            throw new Error('APIキーが設定されていません');
        }

        try {
            console.log('🔄 Gemini 2.5 Flash API接続テスト中...');
            console.log('🔑 APIキー:', this.apiKey.substring(0, 10) + '...');
            console.log('🎯 使用モデル:', this.chatModel, '(Gemini 2.5 Flash)');
            
            // 最もシンプルなリクエストでテスト
            const simpleRequestBody = {
                contents: [{
                    parts: [{ text: 'Hello from Gemini 2.5 Flash' }]
                }]
            };
            
            const url = `${this.baseUrl}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;
            console.log('📍 テストURL:', url);
            
            const response = await this.makeAPIRequest(url, simpleRequestBody);
            const data = await response.json();
            
            console.log('✅ Gemini API接続テスト成功:', data);
            return { 
                success: true, 
                message: '接続に成功しました',
                model: this.chatModel,
                usage: data.usageMetadata || {}
            };
        } catch (error) {
            console.error('❌ Gemini API接続テスト失敗:', error);
            
            let userFriendlyMessage = '接続テストに失敗しました';
            if (error.message.includes('API エンドポイントが見つかりません')) {
                userFriendlyMessage = 'APIモデルまたはエンドポイントに問題があります';
            } else if (error.message.includes('APIキーが無効') || error.message.includes('401') || error.message.includes('403')) {
                userFriendlyMessage = 'APIキーが無効か、権限がありません';
            } else if (error.message.includes('レート制限') || error.message.includes('429')) {
                userFriendlyMessage = 'APIの利用制限に達しています';
            } else if (error.message.includes('ネットワーク接続')) {
                userFriendlyMessage = 'インターネット接続を確認してください';
            } else if (error.message.includes('503')) {
                userFriendlyMessage = 'Gemini APIサービスに問題があります';
            }
            
            throw new Error(`${userFriendlyMessage}: ${error.message}`);
        }
    }

    // サーバー状態チェック（リクエスト前に呼び出し）- 診断モード用に無効化
    checkServerStatus() {
        console.log('🔍 診断モード: サーバー状態チェックをスキップ');
        return true;
    }

    // サーバー過負荷状態を記録（診断モード用に無効化）
    recordServerOverload() {
        console.log('� 診断モード: 過負荷状態の記録をスキップ');
    }

    // サーバー状態をリセット（成功時）
    resetServerStatus() {
        console.log('🔍 診断モード: サーバー状態リセットをスキップ');
    }

    // ゲームコンテキスト情報を取得
    getGameContext() {
        try {
            // アプリからゲーム情報を取得
            const currentGame = window.app?.gameManager?.getCurrentGame?.() || {
                name: 'League of Legends',
                category: 'MOBA'
            };

            // プレイヤー統計を取得
            const playerStats = {
                winRate: document.getElementById('win-rate')?.textContent || '0%',
                driveRushSuccess: document.getElementById('drive-rush-success')?.textContent || '0.0',
                antiAirAccuracy: document.getElementById('anti-air-accuracy')?.textContent || '0.0%',
                rank: document.getElementById('player-rank')?.textContent || 'Unranked',
                gamesPlayed: document.getElementById('games-played')?.textContent || '0'
            };

            // 目標リストを取得
            const goals = this.getCurrentGoals();

            return {
                game: currentGame,
                stats: playerStats,
                goals: goals
            };
        } catch (error) {
            console.warn('Failed to get game context:', error);
            return {
                game: { name: 'League of Legends', category: 'MOBA' },
                stats: { winRate: '0%', driveRushSuccess: '0.0', antiAirAccuracy: '0.0%', rank: 'Unranked', gamesPlayed: '0' },
                goals: []
            };
        }
    }

    // 現在の目標を取得
    getCurrentGoals() {
        try {
            const goalElements = document.querySelectorAll('#goals-list .goal-item');
            const goals = [];
            goalElements.forEach(element => {
                const title = element.querySelector('.goal-title')?.textContent;
                const deadline = element.querySelector('.goal-deadline')?.textContent;
                if (title) {
                    goals.push({ title, deadline });
                }
            });
            return goals;
        } catch (error) {
            console.warn('Failed to get goals:', error);
            return [];
        }
    }

    // Gemini 2.5 Flash用の高度なシステムプロンプトを生成
    generateSystemPrompt(context) {
        const { game, stats, goals } = context;
        
        return `あなたは Gemini 2.5 Flash を活用した最新のeSportsパフォーマンスコーチです。高度な分析能力と迅速な応答を特徴とし、以下の情報を基に専門的なアドバイスを提供してください：

【プレイヤー情報】
- ゲーム: ${game.name} (${game.category})
- 現在のランク: ${stats.rank}
- 勝率: ${stats.winRate}
- ドライブラッシュ成功: ${stats.driveRushSuccess}
- 対空精度: ${stats.antiAirAccuracy}
- 総試合数: ${stats.gamesPlayed}

【設定目標】
${goals.length > 0 ? goals.map(g => `- ${g.title} (期限: ${g.deadline})`).join('\n') : '- まだ目標が設定されていません'}

【対話方針 (Gemini 2.5 Flash Enhanced)】
1. ${game.name}の最新メタとトレンドを考慮した具体的アドバイス
2. データドリブンな改善提案と実践的な練習方法
3. プレイヤーの現在レベルに適した段階的スキルアップ計画
4. メンタル面も含む総合的なパフォーマンス向上支援
5. 迅速で的確な回答（Gemini 2.5 Flashの高速処理能力を活用）

回答は具体的で実践しやすく、プレイヤーのモチベーション向上にも配慮してください。
2. プレイヤーの現在のスキルレベルに適した内容にする
3. 具体的で実行可能なアドバイスを心がける
4. 励ましの言葉も含める
5. 回答は日本語で行う
6. 必要に応じて質問で詳細を確認する

プレイヤーをサポートし、パフォーマンス向上を手助けしてください。`;
    }

    // エラーハンドリングとリトライロジック
    async makeAPIRequest(url, requestBody, retryCount = 0) {
        // ローディング開始（初回のみ表示）
        try { window.app?.showLoading(retryCount === 0 ? 'AIに問い合わせ中...' : '再試行中...'); } catch {}

        const maskUrl = (u) => {
            try {
                const obj = new URL(u);
                if (obj.searchParams.has('key')) obj.searchParams.set('key', '***');
                return obj.toString();
            } catch { return u.replace(/key=[^&]+/, 'key=***'); }
        };

        console.log(`🔍 API Request Details:`, {
            url: maskUrl(url),
            method: 'POST',
            hasApiKey: !!this.apiKey,
            apiKeyLength: this.apiKey?.length,
            requestBodySize: JSON.stringify(requestBody).length,
            retryCount: retryCount
        });
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log(`📡 API Response:`, {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            // 503エラーの場合、詳細な診断と再試行方針（Retry-After尊重）
            if (response.status === 503) {
                const errorData = await response.json().catch(() => null);
                console.error(`🔍 503エラーの詳細:`, {
                    errorData: errorData,
                    responseHeaders: Object.fromEntries(response.headers.entries()),
                    url: maskUrl(url),
                    requestBodySample: JSON.stringify(requestBody).substring(0, 200) + '...'
                });
                // サーバー状態へ記録
                try {
                    const retryAfterHeader = response.headers.get('retry-after');
                    const parseRetryAfter = (h) => {
                        if (!h) return null;
                        const s = parseInt(h, 10);
                        if (!Number.isNaN(s)) return Math.max(1, s);
                        const dt = new Date(h);
                        if (!Number.isNaN(dt.getTime())) {
                            const secs = Math.ceil((dt.getTime() - Date.now()) / 1000);
                            return Math.max(1, secs);
                        }
                        return null;
                    };
                    const retryAfterSec = parseRetryAfter(retryAfterHeader) ?? 20;
                    this.serverStatus.isAvailable = false;
                    this.serverStatus.lastError = '503-overloaded';
                    this.serverStatus.overloadDetectedAt = Date.now();
                    this.serverStatus.nextRetryAfter = Date.now() + retryAfterSec * 1000;

                    // まずは同一URLでRetry-Afterに従いリトライ
                    if (retryCount < (this.maxRetries ?? 0)) {
                        const waitMs = Math.min(retryAfterSec, 30) * 1000; // 上限30秒
                        console.log(`⏳ Retry-After ${retryAfterSec}s. Waiting ${waitMs}ms before retry...`);
                        await this.delay(waitMs);
                        return await this.makeAPIRequest(url, requestBody, retryCount + 1);
                    }
                } catch (_) { /* 記録/待機に失敗してもフォールバックへ */ }
                
                // 代替エンドポイントやAPIバージョンを試す（上記リトライ後も失敗した場合）
                if (retryCount >= (this.maxRetries ?? 0)) {
                    // 1. 異なるAPIバージョンを試す
                    if (this.enableVersionFallback && url.includes('/v1beta/')) {
                        console.log('🔄 Trying v1 API version...');
                        const alternativeUrl = url.replace('/v1beta/', '/v1/');
                        try {
                            return await this.makeAPIRequest(alternativeUrl, requestBody, retryCount + 1);
                        } catch (alternativeError) {
                            console.log('❌ v1 API also failed:', alternativeError.message);
                        }
                    }
                    
                    // 2. 異なるモデルを試す
                    if (this.enableModelFallback && url.includes('gemini-2.5-flash')) {
                        // Gemini 2.5 Flash が失敗した場合、代替モデルを試す
                        console.log('🔄 Trying gemini-1.5-flash model as fallback...');
                        const alternativeUrl = url.replace('gemini-2.5-flash', 'gemini-1.5-flash');
                        try {
                            return await this.makeAPIRequest(alternativeUrl, requestBody, retryCount + 1);
                        } catch (alternativeError) {
                            console.log('❌ gemini-1.5-flash also failed, trying gemini-pro...');
                            const fallbackUrl = url.replace('gemini-2.5-flash', 'gemini-pro');
                            try {
                                return await this.makeAPIRequest(fallbackUrl, requestBody, retryCount + 2);
                            } catch (fallbackError) {
                                console.log('❌ All models failed:', fallbackError.message);
                            }
                        }
                    }
                }
                
                // すべての代替手段が失敗した場合
                const detailMessage = errorData?.error?.message || 'Service Unavailable';
                if (detailMessage.includes('quota') || detailMessage.includes('exceeded')) {
                    throw new Error(`APIクォータまたは制限に達しています。しばらく待ってから再試行してください。`);
                } else if (detailMessage.includes('billing') || detailMessage.includes('payment')) {
                    throw new Error(`課金またはAPIキーの問題があります。Google Cloudコンソールで設定を確認してください。`);
                } else if (detailMessage.includes('region') || detailMessage.includes('location')) {
                    throw new Error(`地域制限またはアクセス制限があります。お住まいの地域での利用可能性を確認してください。`);
                } else if (detailMessage.includes('overloaded') || detailMessage.includes('Overloaded')) {
                    throw new Error(`Gemini AIサービスが一時的に過負荷状態です。数分後に再試行してください。`);
                } else {
                    throw new Error(`Gemini AIサービスが一時的に利用できません (503)。しばらく待ってから再試行してください。`);
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

                console.error(`❌ API Error:`, {
                    status: response.status,
                    errorData: errorData,
                    url: url
                });

                // グラウンディング関連のエラーを検出
                if (errorMessage.includes('Search Grounding') ||
                    errorMessage.includes('grounding') ||
                    errorMessage.includes('googleSearchRetrieval')) {
                    // グラウンディングを無効化して再試行する可能性をユーザーに通知
                    this.groundingConfig.enableWebSearch = false;
                    console.warn('⚠️ グラウンディング機能が無効化されました。通常モードで続行します。');
                    throw new Error('Search Grounding is not supported.');
                }

                if (response.status === 404) {
                    throw new Error('API エンドポイントが見つかりません。モデル名またはURLを確認してください。');
                } else if (response.status === 401 || response.status === 403) {
                    throw new Error('APIキーが無効か、権限がありません。APIキーを確認してください。');
                } else if (response.status === 429) {
                    throw new Error('レート制限に達しました。しばらく待ってから再試行してください。');
                } else {
                    throw new Error(errorMessage);
                }
            }

            console.log(`✅ API Request successful`);
            try { window.app?.hideLoading(); } catch {}
            return response;
        } catch (error) {
            console.error(`💥 API Request failed:`, error);
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error('ネットワーク接続に失敗しました。インターネット接続を確認してください。');
            }
            try { if (retryCount >= (this.maxRetries || 0)) window.app?.hideLoading(); } catch {}
            throw error;
        }
    }

    // 遅延処理
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // チャットメッセージ送信
    async sendChatMessage(message, includeHistory = true) {
        if (!this.isConfigured()) {
            throw new Error('Gemini APIキーが設定されていません');
        }

        try {
            try { window.app?.showLoading('AIが考え中...'); } catch {}
            const context = this.getGameContext();
            const systemPrompt = this.generateSystemPrompt(context);

            // メッセージ履歴を構築
            const messages = [];
            
            // システムプロンプトを追加
            messages.push({
                role: 'user',
                parts: [{ text: systemPrompt }]
            });
            
            messages.push({
                role: 'model',
                parts: [{ text: 'eSportsコーチとして、あなたをサポートします。何でも聞いてください！' }]
            });

            // 履歴を含める場合は追加
            if (includeHistory && this.chatHistory.length > 0) {
                this.chatHistory.forEach(item => {
                    messages.push({
                        role: 'user',
                        parts: [{ text: item.user }]
                    });
                    
                    messages.push({
                        role: 'model',
                        parts: [{ text: item.assistant }]
                    });
                });
            }

            // 現在のメッセージを追加
            messages.push({
                role: 'user',
                parts: [{ text: message }]
            });

            const requestBody = {
                contents: messages,
                generationConfig: this.chatParams
            };

            const url = `${this.baseUrl}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;
            const response = await this.makeAPIRequest(url, requestBody);

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('APIから有効な応答が得られませんでした');
            }

            const candidate = data.candidates[0];

            // MAX_TOKENSエラーのチェック（警告のみで処理継続）
            if (candidate.finishReason === 'MAX_TOKENS') {
                console.warn('⚠️ Response truncated due to token limit, but continuing with partial content:', candidate);
                // エラーを投げずに部分的なレスポンスを使用
            }

            if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                console.error('Invalid API response structure:', JSON.stringify(data, null, 2));
                console.error('Candidate structure:', candidate);
                throw new Error('APIレスポンスの形式が無効です');
            }

            if (!candidate.content.parts[0].text) {
                console.error('No text in response part:', candidate.content.parts[0]);
                throw new Error('AIからのテキスト応答がありません');
            }

            const aiResponse = candidate.content.parts[0].text;

            // チャット履歴を更新（最新20件まで保持）
            this.chatHistory.push({
                user: message,
                assistant: aiResponse
            });

            if (this.chatHistory.length > 20) {
                this.chatHistory = this.chatHistory.slice(-20);
            }

            const result = {
                response: aiResponse,
                usage: data.usageMetadata || {}
            };

            try { window.app?.hideLoading(); } catch {}
            return result;

        } catch (error) {
            try { window.app?.hideLoading(); } catch {}
            console.error('Gemini chat error:', error);
            throw error;
        }
    }







    // 気づきタグ生成 (3ステップ版)
    async generateInsightTags(feelings, analysisMode = 'browsing', fileContent = null) {
        if (!this.isConfigured()) {
            throw new Error('Gemini APIキーが設定されていません');
        }

        try {
            // Step 1: 入力文の推敲
            console.log('📝 Step 1: 入力文を推敲・構造化中...');
            const refinedResult = await this.refineInputContent(feelings);
            const refinedQuery = refinedResult.structuredContent;
            console.log('✅ Step 1完了 - 推敲されたクエリ:', refinedQuery);

            let context = '';
            let processingSteps = ['推敲'];

            // Step 2: モードに応じてコンテキストを取得
            if (analysisMode === 'file' && fileContent) {
                context = await this.findRelevantContextInFile(refinedQuery, fileContent);
                processingSteps.push('コンテキスト検索');
            } else {
                // ブラウジングモードまたはファイルがない場合は、推敲されたクエリをそのままコンテキストとして扱う
                context = refinedQuery;
            }

            // コンテキストがない場合は、元の入力でフォールバック
            if (!context) {
                console.warn('⚠️ 関連コンテキストが見つからなかったため、元の入力を使用します。');
                context = feelings;
            }

            // Step 3: コンテキストからタグ生成
            console.log('🏷️ Step 3: コンテキストからタグ生成中...');
            processingSteps.push('タグ生成');

            let tagPrompt = `以下の分析内容から、Street Fighter 6の戦術分析に使える気づきタグを3～5個、日本語で生成してください。

【分析内容】
"${context}"

【タグ生成のヒント】
- #対空反応 #コンボミス #投げ抜け失敗 のような具体的な課題
- #立ち回り改善 #起き攻め対策 のような戦術的な課題
- #ジュリ対策 #対空キャラ のようなキャラクターに関する課題
- #ドライブ管理 #バーンアウト のようなシステムに関する課題

【出力形式】
#タグ1 #タグ2 #タグ3`;

            const useGrounding = analysisMode === 'browsing';
            const requestBody = this.createGroundedRequest(tagPrompt, context, useGrounding);
            requestBody.generationConfig.maxOutputTokens = 200;

            const url = `${this.baseUrl}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;
            const response = await this.makeAPIRequest(url, requestBody);
            const data = await response.json();

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('タグ生成の応答が得られませんでした');
            }

            const candidate = data.candidates[0];
            const aiResponse = candidate.content?.parts?.[0]?.text || '';

            if (!aiResponse || candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
                 throw new Error('AIからの応答が無効か、コンテンツがブロックされました。');
            }

            const tags = this.extractTags(aiResponse);
            console.log('✅ Step 3完了 - 生成されたタグ:', tags);

            return {
                tags: tags,
                originalResponse: aiResponse,
                refinedContent: refinedResult,
                groundingSources: candidate.groundingMetadata ? this.processGroundingMetadata(candidate.groundingMetadata) : null,
                usage: data.usageMetadata || {},
                processingSteps: processingSteps,
            };

        } catch (error) {
            console.error('気づきタグ生成エラー:', error);
            throw new Error('タグの生成に失敗しました。入力内容やファイルを確認して、時間をおいて再試行してください。');
        }
    }

    // Step 2: ファイルから関連コンテキストを検索
    async findRelevantContextInFile(query, fileContent) {
        if (!fileContent) {
            return ''; // ファイル内容がなければ空文字を返す
        }

        console.log('🔎 Step 2: ファイルから関連コンテキストを検索中...');
        const MAX_FILE_CHUNK_SIZE = 8000; // APIに渡すファイル内容の最大文字数
        const truncatedFileContent = fileContent.length > MAX_FILE_CHUNK_SIZE
            ? fileContent.substring(0, MAX_FILE_CHUNK_SIZE)
            : fileContent;

        const searchPrompt = `以下の「検索クエリ」に最も関連する部分を、「ドキュメント」から最大300文字で抽出してください。関連部分がない場合は「関連情報なし」とだけ出力してください。

【検索クエリ】
"${query}"

【ドキュメント】
---
${truncatedFileContent}
---

【抽出結果】`;

        const requestBody = {
            contents: [{ parts: [{ text: searchPrompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 300, // 抽出するテキストは短く
            }
        };

        const url = `${this.baseUrl}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;
        const response = await this.makeAPIRequest(url, requestBody);
        const data = await response.json();

        const relevantText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (relevantText.trim() === '関連情報なし') {
            console.log('✅ Step 2完了 - 関連情報なし');
            return '';
        }

        console.log('✅ Step 2完了 - 抽出されたコンテキスト:', relevantText);
        return relevantText;
    }

    // グラウンディング対応の検索クエリ生成
    generateSearchQueries(rawInput) {
        const queries = [];

        // キャラクター名を検出して検索クエリを生成
        const characters = ['ジュリ', 'ルーク', 'ケン', '春麗', 'チュンリー', 'ザンギエフ', 'ガイル', 'リュウ', 'キャミィ', 'JP', 'マリーザ', 'マノン', 'リリー'];
        const foundChars = characters.filter(char => rawInput.includes(char));

        foundChars.forEach(char => {
            queries.push(`Street Fighter 6 ${char} 対策 攻略`);
            queries.push(`SF6 ${char} フレームデータ 技性能`);
        });

        // 技術的要素の検出
        if (rawInput.includes('対空')) {
            queries.push('Street Fighter 6 対空技 タイミング コツ');
        }
        if (rawInput.includes('コンボ')) {
            queries.push('Street Fighter 6 コンボ 精度 練習方法');
        }
        if (rawInput.includes('立ち回り')) {
            queries.push('Street Fighter 6 立ち回り 距離管理 戦術');
        }

        // 最新メタ情報
        queries.push('Street Fighter 6 最新 メタ 大会結果 2024');
        queries.push('SF6 プロ選手 戦術 解説');

        return queries.slice(0, 5); // 最大5つのクエリに制限
    }

    // グラウンディング設定を含むリクエストボディ生成（フォールバック対応）
    createGroundedRequest(prompt, rawInput, useGrounding = true) {
        const baseRequest = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1000,
                topP: 0.8,
                topK: 20
            }
        };

        // グラウンディングが有効な場合は正しいAPI構造でツール設定
        if (useGrounding && this.groundingConfig.enableWebSearch) {
            const searchQueries = this.generateSearchQueries(rawInput);

            if (searchQueries.length > 0) {
                // Python例に基づく正しいGoogle Search Tool構造
                baseRequest.tools = [{
                    googleSearch: {}  // Python例: google_search=types.GoogleSearch()
                }];

                // 検索を活用するよう指示を追加
                const enhancedPrompt = `${prompt}

【重要指示】
以下のキーワードについて最新の情報を検索して参考にしてください:
${searchQueries.map(query => `- ${query}`).join('\n')}

検索結果を踏まえて、最新で正確な情報に基づいた分析を行ってください。`;

                baseRequest.contents[0].parts[0].text = enhancedPrompt;

                console.log('🔍 グラウンディング有効化:', {
                    searchQueries: searchQueries,
                    toolsEnabled: true
                });
            }
        }

        return baseRequest;
    }


    // グラウンディングメタデータ処理
    processGroundingMetadata(metadata) {
        if (!metadata || !metadata.groundingChunks) {
            return null;
        }

        const sources = [];
        metadata.groundingChunks.forEach(chunk => {
            if (chunk.web) {
                sources.push({
                    title: chunk.web.title || 'タイトル不明',
                    url: chunk.web.uri || '#',
                    snippet: chunk.web.snippet || ''
                });
            }
        });

        return {
            searchPerformed: metadata.searchQueries || [],
            sources: sources,
            totalSources: sources.length
        };
    }

    // 入力文の推敲・構造化
    async refineInputContent(rawInput) {
        try {
            let refinePrompt = `以下のプレイヤーの試合感想を分析し、Street Fighter 6の戦術分析に適した、簡潔で具体的な内容に要約してください。

【プレイヤーの生の感想】
"${rawInput}"

【指示】
- 感情的な表現（「悔しい」「嬉しい」など）を、具体的な状況や課題（「対空が出なかった」「読み合いに勝てた」など）に変換する。
- 重要なキーワードや課題点を箇条書きで抽出する。
- 全体として150字程度の簡潔な文章にまとめる。

【出力形式】
以下のJSONフォーマットで出力してください：
{
  "structuredContent": "（ここに150字程度の要約を記述）",
  "extractedElements": [
    "（抽出した課題点やキーワード1）",
    "（抽出した課題点やキーワード2）"
  ]
}

必ずJSONフォーマットで出力してください。`;

            // ブラウジングモードは推敲では使用しないため、useGroundingは常にfalse
            const requestBody = this.createGroundedRequest(refinePrompt, rawInput, false);
            requestBody.generationConfig.maxOutputTokens = 500;

            const url = `${this.baseUrl}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;
            const response = await this.makeAPIRequest(url, requestBody);
            const data = await response.json();

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('入力文推敲の応答が得られませんでした');
            }

            const candidate = data.candidates[0];

            if (candidate.finishReason === 'SAFETY') {
                throw new Error('推敲処理でコンテンツが安全性フィルタによってブロックされました。');
            }
            if (candidate.finishReason === 'MAX_TOKENS') {
                console.warn('⚠️ 推敲: 応答がトークン制限で切り詰められました。');
            }

            let aiResponse = candidate.content?.parts?.[0]?.text || '';

            if (!aiResponse) {
                throw new Error('推敲AIからのテキスト応答がありません');
            }

            try {
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                console.warn('推敲応答がJSON形式でないため、フォールバックします。');
            } catch (parseError) {
                console.warn('JSON解析失敗、フォールバック実行:', parseError);
            }

            return this.createFallbackRefinement(rawInput, aiResponse);

        } catch (error) {
            console.warn('入力文推敲でエラー、フォールバック実行:', error);
            return this.createFallbackRefinement(rawInput);
        }
    }

    // フォールバック用の推敲
    createFallbackRefinement(rawInput, aiResponse = '') {
        return {
            structuredContent: rawInput, // 元の入力をそのまま使用
            extractedElements: this.extractBasicElements(rawInput),
            keyPoints: this.identifyKeyPoints(rawInput)
        };
    }

    // 基本要素抽出
    extractBasicElements(text) {
        const elements = [];

        // 技術面の要素
        const techKeywords = ['対空', 'コンボ', '投げ', '確反', 'パリィ'];
        const foundTech = techKeywords.filter(keyword => text.includes(keyword));
        if (foundTech.length > 0) {
            elements.push(`技術面: ${foundTech.join('、')}に関する課題`);
        }

        // キャラクター要素
        const charKeywords = ['ジュリ', 'ルーク', 'ケン', '春麗', 'ザンギエフ', 'ガイル'];
        const foundChars = charKeywords.filter(keyword => text.includes(keyword));
        if (foundChars.length > 0) {
            elements.push(`キャラ対策: ${foundChars.join('、')}戦での課題`);
        }

        // 戦術面
        const tacticKeywords = ['立ち回り', '距離', '読み', 'プレッシャー'];
        const foundTactics = tacticKeywords.filter(keyword => text.includes(keyword));
        if (foundTactics.length > 0) {
            elements.push(`戦術面: ${foundTactics.join('、')}の調整が必要`);
        }

        return elements.length > 0 ? elements : ['一般的な試合振り返り'];
    }

    // キーポイント特定
    identifyKeyPoints(text) {
        const points = [];

        // ネガティブな表現から改善点を抽出
        if (text.includes('できなかった') || text.includes('失敗') || text.includes('やられた')) {
            points.push('技術精度の向上が必要');
        }

        if (text.includes('勝てた') || text.includes('成功') || text.includes('良かった')) {
            points.push('成功した戦術を継続');
        }

        if (text.includes('焦り') || text.includes('判断')) {
            points.push('メンタル管理の改善');
        }

        return points.length > 0 ? points : ['総合的な実力向上'];
    }

    // テキストからハッシュタグを抽出（改良版）
    extractTags(text) {
        // ハッシュタグの正規表現を拡張（英数字、ひらがな、カタカナ、漢字、アンダースコア、ハイフンに対応）
        const tagRegex = /#[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\w\-_]+/g;
        const matches = text.match(tagRegex);

        if (matches) {
            // タグをクリーンアップし、重複削除
            const cleanTags = matches
                .map(tag => tag.trim())
                .filter(tag => tag.length > 2) // 短すぎるタグを除外
                .filter(tag => !tag.includes('例')) // 「例」を含むタグを除外
                .slice(0, 5); // 最大5個

            if (cleanTags.length > 0) {
                return [...new Set(cleanTags)];
            }
        }

        // フォールバック：AIが返したテキストから要素を推測してタグを生成
        const fallbackTags = this.generateFallbackTags(text);
        return fallbackTags;
    }

    // フォールバック用のタグ生成
    generateFallbackTags(text) {
        const defaultTags = [];

        // キーワードベースでのタグ生成（拡充版）
        const keywordMap = {
            // 基本技術
            '対空': '#対空反応遅れ',
            'コンボ': '#コンボドロップ',
            '投げ': '#投げ抜け失敗',
            'パリィ': '#パリィタイミング',
            '確反': '#確反取れず',
            '起き攻め': '#起き攻め対応',
            '中段': '#中段見切り',
            '下段': '#下段ガード',

            // 戦術面
            '立ち回り': '#立ち回り改善',
            '距離': '#距離管理',
            '読み': '#読み合い成功',
            'プレッシャー': '#プレッシャー継続',
            '攻め': '#攻め継続',
            '守り': '#守備重視',
            'リズム': '#リズム変化',

            // キャラクター対策
            'ジュリ': '#ジュリ対策',
            'ルーク': '#ルーク対策',
            'ケン': '#ケン対策',
            '春麗': '#春麗対策',
            'チュンリー': '#春麗対策',
            'ザンギエフ': '#ザンギエフ対策',
            'ガイル': '#対飛び道具キャラ',
            '飛び道具': '#対飛び道具',
            'グラップラー': '#対グラップラー',

            // システム要素
            'ドライブ': '#ドライブ管理',
            'バーンアウト': '#バーンアウト回避',
            'OD': '#ODアーツ有効活用',
            'ゲージ': '#ゲージ管理',
            'クリティカル': '#クリティカルアーツ',

            // メンタル・状況
            '焦り': '#メンタル管理',
            '冷静': '#冷静判断',
            '判断': '#判断力向上',
            '集中': '#集中力維持'
        };

        for (const [keyword, tag] of Object.entries(keywordMap)) {
            if (text.includes(keyword) && defaultTags.length < 3) {
                defaultTags.push(tag);
            }
        }

        // デフォルトタグを追加
        if (defaultTags.length === 0) {
            defaultTags.push('#試合振り返り', '#気づき');
        }

        return defaultTags.slice(0, 5);
    }

    // チャット履歴クリア
    clearChatHistory() {
        this.chatHistory = [];
        console.log('チャット履歴をクリアしました');
    }

    // デバッグ情報取得（グラウンディング情報追加）
    getDebugInfo() {
        return {
            isConfigured: this.isConfigured(),
            chatModel: this.chatModel,
            baseUrl: this.baseUrl,
            chatHistoryLength: this.chatHistory.length,
            retrySettings: {
                maxRetries: this.maxRetries,
                retryDelay: this.retryDelay
            },
            grounding: {
                webSearchEnabled: this.groundingConfig.enableWebSearch,
                dynamicRetrievalEnabled: this.groundingConfig.enableDynamicRetrieval,
                availableSearchQueries: Object.keys(this.groundingConfig.searchQueries),
                status: this.groundingConfig.enableWebSearch ? 'enabled' : 'disabled (API不支持)'
            },
            apiKeyLength: this.apiKey ? this.apiKey.length : 0,
            apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'なし'
        };
    }

    // 設定リセット
    reset() {
        this.clearApiKey();
        this.clearChatHistory();
        console.log('Gemini Serviceの設定をリセットしました');
    }
}

// グローバルインスタンス
window.geminiService = new GeminiService();