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
    this.chatModel = 'gemini-2.5-flash-latest'; // 指定モデル：Gemini 2.5 Flash
        this.chatHistory = [];
        this.retryDelay = 1000; // 初期リトライ間隔（指数バックオフの基準）
        this.maxRetries = 3; // 503エラー用の最大リトライ回数
        
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
            enableWebSearch: false, // Web検索を一時的に無効化（gemini-2.5-flash互換性のため）
            enableDynamicRetrieval: false, // 動的な情報取得を無効化
            searchQueries: {
                valorant: 'VALORANT',
                tactics: 'VALORANT tactics strategies',
                meta: 'VALORANT tournament meta analysis agents'
            }
        };
        
        // フォールバック制御フラグ
        this.enableModelFallback = false;   // モデル変更はデフォルト無効（常に gemini-2.5-flash-latest を使用）
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

        // 試すべきモデル名のリスト（優先順）
        const modelNamesToTry = [
            'gemini-2.5-flash-latest',
            'gemini-2.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-pro'
        ];

        let lastError = null;

        for (const modelName of modelNamesToTry) {
            try {
                console.log('🔄 Gemini API接続テスト中...');
                console.log('🔑 APIキー:', this.apiKey.substring(0, 10) + '...');
                console.log('🎯 試行モデル:', modelName);
                
                // 最もシンプルなリクエストでテスト
                const simpleRequestBody = {
                    contents: [{
                        parts: [{ text: 'Hello' }]
                    }]
                };
                
                const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;
                console.log('📍 テストURL:', url.replace(/key=[^&]+/, 'key=***'));
                
                const response = await this.makeAPIRequest(url, simpleRequestBody);
                const data = await response.json();
                
                // 成功した場合、このモデル名を保存
                this.chatModel = modelName;
                console.log('✅ Gemini API接続テスト成功! 使用モデル:', modelName);
                return { 
                    success: true, 
                    message: '接続に成功しました',
                    model: this.chatModel,
                    usage: data.usageMetadata || {}
                };
            } catch (error) {
                console.warn(`⚠️ モデル ${modelName} での接続失敗:`, error.message);
                lastError = error;
                
                // 404エラーの場合は次のモデルを試す
                if (error.message.includes('API エンドポイントが見つかりません') || 
                    error.message.includes('404')) {
                    continue;
                }
                
                // 404以外のエラー（認証エラーなど）の場合は即座に失敗
                break;
            }
        }

        // すべてのモデルで失敗した場合
        console.error('❌ すべてのモデルでGemini API接続テスト失敗');
        
        let userFriendlyMessage = '接続テストに失敗しました';
        if (lastError.message.includes('API エンドポイントが見つかりません') || lastError.message.includes('404')) {
            userFriendlyMessage = 'APIモデルが見つかりません。Google Cloud ConsoleでGemini APIが有効になっているか確認してください';
        } else if (lastError.message.includes('APIキーが無効') || lastError.message.includes('401') || lastError.message.includes('403')) {
            userFriendlyMessage = 'APIキーが無効か、権限がありません';
        } else if (lastError.message.includes('レート制限') || lastError.message.includes('429')) {
            userFriendlyMessage = 'APIの利用制限に達しています';
        } else if (lastError.message.includes('ネットワーク接続')) {
            userFriendlyMessage = 'インターネット接続を確認してください';
        } else if (lastError.message.includes('503')) {
            userFriendlyMessage = 'Gemini APIサービスに問題があります';
        }
        
        throw new Error(`${userFriendlyMessage}: ${lastError.message}`);
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
- エージェント使用率: ${stats.driveRushSuccess}
- ヘッドショット率: ${stats.antiAirAccuracy}
- 総試合数: ${stats.gamesPlayed}

【設定目標】
${goals.length > 0 ? goals.map(g => `- ${g.title} (期限: ${g.deadline})`).join('\n') : '- まだ目標が設定されていません'}

【対話方針 (VALORANT専門 - Gemini 2.5 Flash Enhanced)】
1. ${game.name}の最新メタとトレンド(エージェント構成、マップ戦略)を考慮した具体的アドバイス
2. エージェント別の立ち回り、アビリティ使用タイミング、マップコントロールに関する実践的な提案
3. プレイヤーの現在レベルに適した段階的スキルアップ計画(エイム練習、ポジショニング、チーム連携)
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

            // 503エラーの場合、指数バックオフでリトライ
            if (response.status === 503) {
                const errorData = await response.json().catch(() => null);
                console.error(`🔍 503エラーの詳細:`, {
                    errorData: errorData,
                    responseHeaders: Object.fromEntries(response.headers.entries()),
                    url: maskUrl(url),
                    requestBodySample: JSON.stringify(requestBody).substring(0, 200) + '...'
                });
                
                // 最大リトライ回数をチェック
                if (retryCount < this.maxRetries) {
                    // 指数バックオフ: 1秒 -> 2秒 -> 4秒
                    const waitSeconds = this.retryDelay * Math.pow(2, retryCount) / 1000;
                    const waitMs = waitSeconds * 1000;
                    
                    console.log(`⏳ 503エラー: ${retryCount + 1}回目のリトライを${waitSeconds}秒後に実行します...`);
                    await this.delay(waitMs);
                    return await this.makeAPIRequest(url, requestBody, retryCount + 1);
                }
                
                // 最大リトライ回数に達した場合、エラーをスロー
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

            // コンテキストを短縮してトークンエラーを回避
            const truncatedContext = context.length > 200 ? context.substring(0, 200) : context;

            let tagPrompt = `VALORANTの戦術分析用タグを3～5個生成。必ず#で始めてください。

分析内容: "${truncatedContext}"

例: #エイム練習 #スキル管理 #立ち回り改善 #チーム連携

タグのみ出力:`;

            const useGrounding = analysisMode === 'browsing';
            const requestBody = this.createGroundedRequest(tagPrompt, truncatedContext, useGrounding);
            requestBody.generationConfig.maxOutputTokens = 8192; // APIの最大値
            requestBody.generationConfig.temperature = 0.7;
            requestBody.generationConfig.topK = 40;
            requestBody.generationConfig.topP = 0.95;

            const url = `${this.baseUrl}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;
            const response = await this.makeAPIRequest(url, requestBody);
            const data = await response.json();

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('タグ生成の応答が得られませんでした');
            }

            const candidate = data.candidates[0];
            const aiResponse = candidate.content?.parts?.[0]?.text || '';

            // デバッグログを追加
            console.log('🔍 Step 3 レスポンス詳細:', {
                finishReason: candidate.finishReason,
                hasResponse: !!aiResponse,
                responseLength: aiResponse.length,
                responsePreview: aiResponse.substring(0, 200)
            });

            // SAFETYエラーの場合
            if (candidate.finishReason === 'SAFETY') {
                console.error('❌ Step 3: 安全性フィルタによりブロックされました。');
                throw new Error('AIの安全性フィルタにより、この内容は処理できませんでした。入力内容を確認してください。');
            }

            if (candidate.finishReason === 'RECITATION') {
                console.warn('⚠️ Step 3: RECITATION検出。部分応答を使用します。');
            }

            if (candidate.finishReason === 'MAX_TOKENS') {
                console.warn('⚠️ Step 3: トークン制限。部分応答を使用します。');
            }

            // 応答がない場合はエラー
            if (!aiResponse) {
                console.error('❌ Step 3: AIからテキスト応答がありません。');
                throw new Error('AIから応答が得られませんでした。時間をおいて再試行してください。');
            }

            const tags = this.extractTags(aiResponse);
            console.log('✅ Step 3完了 - 生成されたタグ:', tags);
            
            // タグが生成できなかった場合はエラー
            if (!tags || tags.length === 0) {
                console.error('❌ タグ抽出失敗。AI応答:', aiResponse);
                throw new Error('タグを抽出できませんでした。AIの応答: ' + aiResponse.substring(0, 100));
            }

            return {
                tags: tags,
                originalResponse: aiResponse,
                refinedContent: refinedResult,
                groundingSources: candidate.groundingMetadata ? this.processGroundingMetadata(candidate.groundingMetadata) : null,
                usage: data.usageMetadata || {},
                processingSteps: processingSteps,
            };

        } catch (error) {
            console.error('❌ 気づきタグ生成エラー:', error);
            throw new Error('タグの生成に失敗しました: ' + error.message);
        }
    }

    // Step 2: ファイルから関連コンテキストを検索
    async findRelevantContextInFile(query, fileContent) {
        if (!fileContent) {
            return ''; // ファイル内容がなければ空文字を返す
        }

        console.log('🔎 Step 2: ファイルから関連コンテキストを検索中...');
        const MAX_FILE_CHUNK_SIZE = 6000; // APIに渡すファイル内容を削減してトークンエラーを回避
        const truncatedFileContent = fileContent.length > MAX_FILE_CHUNK_SIZE
            ? fileContent.substring(0, MAX_FILE_CHUNK_SIZE) + '\n...(以下省略)'
            : fileContent;

        const searchPrompt = `クエリに関連する情報を文書から200文字以内で抽出。なければ「関連情報なし」とだけ返答。

クエリ: "${query}"

文書:
${truncatedFileContent}

抽出結果:`;

        const requestBody = {
            contents: [{ parts: [{ text: searchPrompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192, // APIの最大値
                topK: 1,
                topP: 0.8,
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

        // エージェント名を検出して検索クエリを生成
        const agents = ['ジェット', 'レイナ', 'セージ', 'ソーヴァ', 'ブリムストーン', 'フェニックス', 'ヴァイパー', 'サイファー', 'レイズ', 'キルジョイ', 'スカイ', 'ヨル', 'アストラ', 'KAY/O', 'チェンバー', 'ネオン', 'フェイド', 'ハーバー', 'ゲッコー', 'デッドロック', 'クローヴ'];
        const foundAgents = agents.filter(agent => rawInput.includes(agent));

        foundAgents.forEach(agent => {
            queries.push(`VALORANT ${agent} 立ち回り 攻略`);
            queries.push(`VALORANT ${agent} アビリティ 使い方`);
        });

        // マップ戦略の検出
        const maps = ['バインド', 'ヘイヴン', 'スプリット', 'アセント', 'アイスボックス', 'ブリーズ', 'フラクチャー', 'パール', 'ロータス', 'サンセット'];
        const foundMaps = maps.filter(map => rawInput.includes(map));

        foundMaps.forEach(map => {
            queries.push(`VALORANT ${map} 戦略 攻略`);
        });

        // 技術的要素の検出
        if (rawInput.includes('エイム')) {
            queries.push('VALORANT エイム練習 上達方法');
        }
        if (rawInput.includes('スキル')) {
            queries.push('VALORANT スキル管理 タイミング');
        }
        if (rawInput.includes('立ち回り')) {
            queries.push('VALORANT 立ち回り ポジショニング 戦術');
        }

        // 最新メタ情報
        queries.push('VALORANT 最新 メタ 大会結果 2024');
        queries.push('VALORANT プロ選手 戦術 解説');

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
            // 入力を制限して、トークン制限エラーを回避
            const truncatedInput = rawInput.length > 300 ? rawInput.substring(0, 300) + '...' : rawInput;
            
            let refinePrompt = `試合感想を分析用に要約してください。

入力: "${truncatedInput}"

指示:
- 感情表現を具体的な状況に変換
- VALORANTのエージェント名、マップ名、戦術用語を抽出
- 150字以内で要約

出力形式(JSON):
{"structuredContent":"要約文","extractedElements":["キーワード1","キーワード2"]}`;

            // ブラウジングモードは推敲では使用しないため、useGroundingは常にfalse
            const requestBody = this.createGroundedRequest(refinePrompt, truncatedInput, false);
            requestBody.generationConfig.maxOutputTokens = 8192; // APIの最大値
            requestBody.generationConfig.temperature = 0.3;

            const url = `${this.baseUrl}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;
            const response = await this.makeAPIRequest(url, requestBody);
            const data = await response.json();

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('入力文推敲の応答が得られませんでした');
            }

            const candidate = data.candidates[0];

            // デバッグログを追加
            console.log('🔍 推敲レスポンス詳細:', {
                finishReason: candidate.finishReason,
                hasContent: !!candidate.content?.parts?.[0]?.text,
                contentLength: candidate.content?.parts?.[0]?.text?.length || 0
            });

            if (candidate.finishReason === 'SAFETY') {
                console.warn('⚠️ 推敲: 安全性フィルタによってブロックされました。フォールバック実行。');
                return this.createFallbackRefinement(rawInput);
            }
            
            if (candidate.finishReason === 'MAX_TOKENS') {
                console.warn('⚠️ 推敲: 応答がトークン制限で切り詰められました。部分応答を使用します。');
            }

            let aiResponse = candidate.content?.parts?.[0]?.text || '';

            if (!aiResponse) {
                console.warn('⚠️ 推敲: AIからのテキスト応答がありません。フォールバック実行。');
                return this.createFallbackRefinement(rawInput);
            }

            try {
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log('✅ 推敲: JSON解析成功');
                    return parsed;
                }
                console.warn('⚠️ 推敲: 応答がJSON形式でないため、フォールバックします。');
            } catch (parseError) {
                console.warn('⚠️ 推敲: JSON解析失敗、フォールバック実行:', parseError);
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

        // 技術面の要素（VALORANT用）
        const techKeywords = ['エイム', 'スキル', 'アビリティ', 'ウルト', 'ピーク'];
        const foundTech = techKeywords.filter(keyword => text.includes(keyword));
        if (foundTech.length > 0) {
            elements.push(`技術面: ${foundTech.join('、')}に関する課題`);
        }

        // エージェント要素
        const agentKeywords = ['ジェット', 'レイナ', 'セージ', 'ソーヴァ', 'ブリムストーン', 'フェニックス'];
        const foundAgents = agentKeywords.filter(keyword => text.includes(keyword));
        if (foundAgents.length > 0) {
            elements.push(`エージェント対策: ${foundAgents.join('、')}戦での課題`);
        }

        // 戦術面
        const tacticKeywords = ['立ち回り', 'ポジション', '連携', 'マップコントロール'];
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
        console.log('🔍 タグ抽出開始:', { inputText: text.substring(0, 200), textLength: text.length });
        
        // ハッシュタグの正規表現を拡張（英数字、ひらがな、カタカナ、漢字、アンダースコア、ハイフンに対応）
        const tagRegex = /#[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\w\-_]+/g;
        const matches = text.match(tagRegex);

        console.log('🔍 正規表現マッチ結果:', matches);

        if (matches) {
            // タグをクリーンアップし、重複削除
            const cleanTags = matches
                .map(tag => tag.trim())
                .filter(tag => tag.length > 2) // 短すぎるタグを除外
                .filter(tag => !tag.includes('例')) // 「例」を含むタグを除外
                .slice(0, 5); // 最大5個

            console.log('🔍 クリーンアップ後のタグ:', cleanTags);

            if (cleanTags.length > 0) {
                return [...new Set(cleanTags)];
            }
        }

        // ハッシュタグが見つからない場合は空配列を返す
        console.warn('⚠️ ハッシュタグが見つかりませんでした');
        return [];
    }

    // チャット履歴クリア
    clearChatHistory() {
        this.chatHistory = [];
        console.log('チャット履歴をクリアしました');
    }

    // 画像から試合データを分析（VALORANT専用 - 現在無効化中）
    async analyzeMatchImage(imageFile) {
        // この機能は現在VALORANTでは利用できません
        throw new Error('画像分析機能は現在VALORANTでは利用できません。個別入力をご利用ください。');
        
        /*
        if (!this.isConfigured()) {
            throw new Error('Gemini APIキーが設定されていません');
        }

        try {
            console.log('📸 画像分析開始:', imageFile.name, imageFile.size);
            
            // 画像をBase64に変換
            const base64Image = await this.fileToBase64(imageFile);
            const imageData = base64Image.split(',')[1]; // data:image/png;base64, を除去
            
            // 画像の形式を判定
            const mimeType = imageFile.type || 'image/png';
            
            const analysisPrompt = `あなたは画像認識の専門家です。この画像はVALORANTの戦績統計画面のスクリーンショットです。
以下の詳細な手順に従って、画像から正確にデータを抽出し、JSON形式で出力してください。

═══════════════════════════════════════════════════════
📋 ステップ1: 画像形式の判定
═══════════════════════════════════════════════════════
まず、この画像が以下のどちらの形式かを判定してください：

【形式A: 使用キャラクター別成績】
- 画面上部に「FIGHTERS PROFILE」タブが表示
- ユーザーコードとSteam IDが表示されている
- 「絞り込み」オプションと「Act 5 モード すべて」などのフィルタ
- 「ALL」行に総合成績が表示
- キャラクター名(LUKE, JAMIE, MANON等)とその戦績が一覧表示
- 各行の形式: キャラクター名 | 試合数(例: 14勝/23戦) | 勝率%(例: 60.87%)

【形式B: 対戦相手別成績】  
- 画面上部に「FIGHTERS PROFILE」タブが表示
- ユーザーコードが表示されている(Steam IDは隠されている場合あり)
- 「キャラクター別対戦数」セクション
- 「絞り込み」オプションと「Act 0 モード ランクマッチ」などのフィルタ
- 使用キャラクター名(MARISA等)が大きく表示
- 対戦相手キャラクター(KIMBERLY, ZANGIEF, LILY等)とその戦績
- 各行の形式: 対戦相手名 | 試合数(例: 33戦) | 勝率%(例: 54.55%)

═══════════════════════════════════════════════════════
📋 ステップ2: データ抽出の具体的手順
═══════════════════════════════════════════════════════

【形式A: 使用キャラクター別成績の場合】
1. 「ALL」行を見つけ、総合戦績を抽出
   - 「14勝/23戦」のような表記から勝利数と試合数を分離
   - 「60.87%」のような表記から勝率を抽出
   
2. 各キャラクター行を処理（LUKE, JAMIE, MANON, KIMBERLY, MARISA等）
   - キャラクター名: 画像表示通りに抽出（LUKE, JAMIE等）
   - 「14勝/23戦」形式の場合:
     * wins = 14, totalMatches = 23
     * winRate = (14/23)*100 = 60.87
   - 勝率が直接表示されている場合はその値を使用
   
3. 試合数が0のキャラクター（0勝/0戦, 0.00%）も含める

【形式B: 対戦相手別成績の場合】
1. 使用キャラクター名を抽出（画面に大きく表示されているキャラ名）
   - この情報はメタデータとして使用可能
   
2. 各対戦相手行を処理（KIMBERLY, ZANGIEF, LILY, GUILE, JP等）
   - キャラクター名: 画像表示通りに抽出
   - 試合数: 「33戦」→ totalMatches = 33
   - 勝率: 「54.55%」→ winRate = 54.55
   - 勝利数を計算: wins = Math.round(33 × 54.55 / 100) = 18
   
3. 試合数が0の対戦相手も含める

═══════════════════════════════════════════════════════
📋 ステップ3: データの計算と検証
═══════════════════════════════════════════════════════

すべてのエントリーに対して以下を実行：
1. **必須値の確保**
   - character: 画像表示通りのキャラクター名（例: LUKE, KIMBERLY）
   - totalMatches: 試合数（整数）
   - winRate: 勝率（小数、0-100）
   - wins: 勝利数（整数）

2. **不足データの計算**
   - 勝利数が不明な場合: wins = Math.round(totalMatches × winRate / 100)
   - 勝率が不明な場合: winRate = (wins / totalMatches) × 100
   
3. **データの妥当性チェック**
   - totalMatches >= wins であることを確認
   - winRate は 0 から 100 の範囲内
   - 小数点以下は2桁まで

═══════════════════════════════════════════════════════
📋 ステップ4: JSON出力形式
═══════════════════════════════════════════════════════

以下の形式で、抽出したすべてのデータを出力してください：

{
  "dataType": "player_characters" または "opponent_characters",
  "matches": [
    {
      "character": "LUKE",
      "totalMatches": 23,
      "winRate": 60.87,
      "wins": 14
    }
  ]
}

**dataTypeの値:**
- "player_characters": 形式A（使用キャラクター別成績）の場合
- "opponent_characters": 形式B（対戦相手別成績）の場合

═══════════════════════════════════════════════════════
📋 出力例
═══════════════════════════════════════════════════════

【形式A: 使用キャラクター別成績の出力例】
{
  "dataType": "player_characters",
  "matches": [
    {"character": "ALL", "totalMatches": 23, "winRate": 60.87, "wins": 14},
    {"character": "LUKE", "totalMatches": 23, "winRate": 60.87, "wins": 14},
    {"character": "JAMIE", "totalMatches": 0, "winRate": 0.00, "wins": 0},
    {"character": "MANON", "totalMatches": 0, "winRate": 0.00, "wins": 0}
  ]
}

【形式B: 対戦相手別成績の出力例】
{
  "dataType": "opponent_characters",
  "matches": [
    {"character": "KIMBERLY", "totalMatches": 33, "winRate": 54.55, "wins": 18},
    {"character": "ZANGIEF", "totalMatches": 33, "winRate": 69.70, "wins": 23},
    {"character": "LILY", "totalMatches": 25, "winRate": 76.00, "wins": 19},
    {"character": "GUILE", "totalMatches": 25, "winRate": 52.00, "wins": 13},
    {"character": "JP", "totalMatches": 23, "winRate": 47.83, "wins": 11}
  ]
}

═══════════════════════════════════════════════════════
⚠️ 重要な注意事項
═══════════════════════════════════════════════════════
1. **出力形式**: JSON形式のみ。説明文や追加コメント不要
2. **キャラクター名**: 画像に表示されている通りの大文字英語をそのまま使用（例: LUKE, KIMBERLY, ZANGIEF）
3. **数値精度**: 画像から読み取った数値を正確に抽出・計算
4. **完全性**: 試合数0のキャラクターも含める
5. **ALL扱い**: 「ALL」は形式Aでのみ出現（総合成績）
6. **不明瞭な場合**: 画像が不鮮明でも推測せず、読み取れる範囲で正確に抽出

それでは、画像を分析して上記の手順に従ってJSON出力を生成してください。`;

            const requestBody = {
                contents: [{
                    parts: [
                        { text: analysisPrompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: imageData
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1, // 低い温度で正確性を優先
                    maxOutputTokens: 2048,
                    topP: 0.8,
                    topK: 10
                }
            };

            const url = `${this.baseUrl}/models/${this.chatModel}:generateContent?key=${this.apiKey}`;
            const response = await this.makeAPIRequest(url, requestBody);
            const data = await response.json();

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('画像分析の応答が得られませんでした');
            }

            const candidate = data.candidates[0];
            
            if (candidate.finishReason === 'SAFETY') {
                throw new Error('画像の内容が安全性フィルタによりブロックされました');
            }

            const aiResponse = candidate.content?.parts?.[0]?.text || '';
            
            if (!aiResponse) {
                throw new Error('画像分析の応答が空です');
            }

            console.log('🔍 AI応答:', aiResponse);

            // JSONを抽出
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('JSONデータを抽出できませんでした: ' + aiResponse.substring(0, 200));
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            
            // データ検証
            if (!parsedData.matches || !Array.isArray(parsedData.matches)) {
                throw new Error('不正なデータ形式です');
            }

            // dataTypeの検証（オプショナル）
            const dataType = parsedData.dataType || 'unknown';
            const validDataTypes = ['player_characters', 'opponent_characters'];
            if (!validDataTypes.includes(dataType)) {
                console.warn('⚠️ 不明なdataType:', dataType, '- デフォルト値を使用します');
            }

            // 各マッチデータの検証と補完
            const validatedMatches = parsedData.matches.map(match => {
                // 勝利数が未設定の場合は計算
                if (match.wins === undefined && match.totalMatches && match.winRate !== undefined) {
                    match.wins = Math.round(match.totalMatches * match.winRate / 100);
                }
                
                // 勝率が未設定の場合は計算
                if (match.winRate === undefined && match.wins !== undefined && match.totalMatches) {
                    match.winRate = (match.wins / match.totalMatches) * 100;
                }
                
                return {
                    character: match.character || 'Unknown',
                    totalMatches: parseInt(match.totalMatches) || 0,
                    winRate: parseFloat(match.winRate) || 0,
                    wins: parseInt(match.wins) || 0
                };
            });

            console.log('✅ 画像分析完了:', {
                dataType: dataType,
                matchCount: validatedMatches.length,
                matches: validatedMatches
            });

            return {
                dataType: dataType,
                matches: validatedMatches,
                rawResponse: aiResponse,
                usage: data.usageMetadata || {}
            };

        } catch (error) {
            console.error('❌ 画像分析エラー:', error);
            throw new Error('画像の分析に失敗しました: ' + error.message);
        }
        */
    }

    // ファイルをBase64に変換
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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