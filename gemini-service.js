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
    this.visionModel = 'gemini-2.5-flash';
        this.chatHistory = [];
        this.retryDelay = 1000; // リトライ間隔を短縮
        this.maxRetries = 2; // リトライ回数を減らして即座に問題を特定
        
        // 統一APIマネージャとの連携
        this.initializeWithUnifiedAPI();
        
        // Gemini 2.5 Flash用の最適化されたパラメータ
        this.chatParams = {
            temperature: 0.7,
            maxOutputTokens: 2048, // Gemini 2.5 Flashの性能を活用
            topP: 0.9,
            topK: 40 // より幅広い回答生成
        };
        
        this.visionParams = {
            temperature: 0.4,
            maxOutputTokens: 4096, // ビジョン分析用により大きなトークン数
            topP: 0.95,
            topK: 40
        };
        
        // サーバー状態監視
        this.serverStatus = {
            isAvailable: true,
            lastError: null,
            overloadDetectedAt: null,
            nextRetryAfter: null
        };
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
        if (window.unifiedApiManager) {
            window.unifiedApiManager.setAPIKey(apiKey);
        } else {
            // フォールバック
            localStorage.setItem('gemini-api-key', apiKey);
        }
        
        console.log('✓ Gemini APIキーが設定されました');
    }

    getApiKey() {
        // 統一APIマネージャから取得を試行
        if (window.unifiedApiManager && window.unifiedApiManager.isConfigured()) {
            this.apiKey = window.unifiedApiManager.getAPIKey();
        }
        return this.apiKey;
    }

    // APIキーが設定されているかチェック
    isConfigured() {
        let isValid;
        if (window.unifiedApiManager) {
            isValid = window.unifiedApiManager.isConfigured();
            this.apiKey = window.unifiedApiManager.getAPIKey() || '';
        } else {
            isValid = this.apiKey && this.apiKey.trim().length > 0;
        }
        
        console.log('🔍 API設定状況:', {
            hasApiKey: !!this.apiKey,
            apiKeyLength: this.apiKey?.length,
            apiKeyPrefix: this.apiKey?.substring(0, 10),
            isConfigured: isValid,
            hasUnifiedManager: !!window.unifiedApiManager
        });
        
        // APIキーの形式検証も実行
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
                avgKda: document.getElementById('avg-kda')?.textContent || '0.0',
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
                stats: { winRate: '0%', avgKda: '0.0', rank: 'Unranked', gamesPlayed: '0' },
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
- 平均KDA: ${stats.avgKda}
- 総試合数: ${stats.gamesPlayed}

【設定目標】
${goals.length > 0 ? goals.map(g => `- ${g.title} (期限: ${g.deadline})`).join('\n') : '- まだ目標が設定されていません'}

【コーチング方針 (Gemini 2.5 Flash Enhanced)】
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

        console.log(`🔍 API Request Details:`, {
            url: url,
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

            // 503エラーの場合、詳細な診断を実行
            if (response.status === 503) {
                const errorData = await response.json().catch(() => null);
                console.error(`🔍 503エラーの詳細:`, {
                    errorData: errorData,
                    responseHeaders: Object.fromEntries(response.headers.entries()),
                    url: url,
                    requestBodySample: JSON.stringify(requestBody).substring(0, 200) + '...'
                });
                
                // 代替エンドポイントやAPIバージョンを試す
                if (retryCount === 0) {
                    // 1. 異なるAPIバージョンを試す
                    if (url.includes('/v1beta/')) {
                        console.log('🔄 Trying v1 API version...');
                        const alternativeUrl = url.replace('/v1beta/', '/v1/');
                        try {
                            return await this.makeAPIRequest(alternativeUrl, requestBody, retryCount + 1);
                        } catch (alternativeError) {
                            console.log('❌ v1 API also failed:', alternativeError.message);
                        }
                    }
                    
                    // 2. 異なるモデルを試す
                    if (url.includes('gemini-2.5-flash')) {
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
                    throw new Error(`APIクォータまたは制限に達しています: ${detailMessage}`);
                } else if (detailMessage.includes('billing') || detailMessage.includes('payment')) {
                    throw new Error(`課金またはAPIキーの問題があります: ${detailMessage}`);
                } else if (detailMessage.includes('region') || detailMessage.includes('location')) {
                    throw new Error(`地域制限またはアクセス制限があります: ${detailMessage}`);
                } else {
                    throw new Error(`API接続エラー (503): ${detailMessage}`);
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

            const aiResponse = data.candidates[0].content.parts[0].text;

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

    // 画像分析
    async analyzeImage(imageData, fileName, gameContext = null) {
        if (!this.isConfigured()) {
            throw new Error('Gemini APIキーが設定されていません');
        }

        try {
            const context = gameContext || this.getGameContext();
            
            const analysisPrompt = `これは${context.game.name}のゲーム画面です。以下の点について詳細に分析してください：

【分析項目】
1. ゲーム状況の把握
   - 試合の進行状況
   - マップ上のポジション
   - リソース状況

2. プレイヤーのパフォーマンス
   - 良いプレイポイント
   - 改善すべき点
   - ミスや問題点

3. 戦術的アドバイス
   - この場面での最適な行動
   - リスク管理
   - 次の展開への準備

4. スキル向上のための提案
   - 練習すべき要素
   - 類似場面での対処法

【回答形式】
以下のJSON形式で回答してください：
{
  "gameTitle": "ゲームタイトル",
  "matchStatus": "試合状況",
  "playerPosition": "プレイヤーのポジション",
  "strengths": ["良い点1", "良い点2", "良い点3"],
  "weaknesses": ["改善点1", "改善点2", "改善点3"],
  "suggestions": ["提案1", "提案2", "提案3"],
  "overallScore": "10点満点の評価",
  "summary": "総合評価コメント"
}

日本語で詳細な分析を行い、プレイヤーのスキル向上に役立つ具体的なアドバイスを提供してください。`;

            const requestBody = {
                contents: [{
                    role: 'user',
                    parts: [
                        { text: analysisPrompt },
                        {
                            inline_data: {
                                mime_type: this.getMimeType(fileName),
                                data: imageData.split(',')[1] // base64データ部分のみ
                            }
                        }
                    ]
                }],
                generationConfig: this.visionParams
            };

            const url = `${this.baseUrl}/models/${this.visionModel}:generateContent?key=${this.apiKey}`;
            const response = await this.makeAPIRequest(url, requestBody);

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('APIから有効な応答が得られませんでした');
            }

            const analysisResult = data.candidates[0].content.parts[0].text;
            
            // JSON部分を抽出して解析
            try {
                const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const analysis = JSON.parse(jsonMatch[0]);
                    return {
                        ...analysis,
                        fileName: fileName,
                        timestamp: new Date().toLocaleString('ja-JP'),
                        usage: data.usageMetadata || {}
                    };
                } else {
                    // JSONが見つからない場合はテキストとして処理
                    return {
                        gameTitle: context.game.name,
                        matchStatus: '分析完了',
                        summary: analysisResult,
                        fileName: fileName,
                        timestamp: new Date().toLocaleString('ja-JP')
                    };
                }
            } catch (parseError) {
                // JSON解析エラーの場合もテキストとして処理
                return {
                    gameTitle: context.game.name,
                    matchStatus: '分析完了',
                    summary: analysisResult,
                    fileName: fileName,
                    timestamp: new Date().toLocaleString('ja-JP')
                };
            }

        } catch (error) {
            console.error('Gemini vision error:', error);
            throw error;
        }
    }

    // 動画分析（フレーム抽出）
    async analyzeVideo(videoFile) {
        if (!this.isConfigured()) {
            throw new Error('Gemini APIキーが設定されていません');
        }

        try {
            // 動画から5フレームを抽出
            const frames = await this.extractVideoFrames(videoFile, 5);
            const analyses = [];

            // 各フレームを順次分析
            for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                try {
                    const analysis = await this.analyzeImage(frame.data, `${videoFile.name}_frame_${i + 1}`);
                    analysis.frameTime = frame.time;
                    analysis.frameNumber = i + 1;
                    analyses.push(analysis);
                } catch (error) {
                    console.warn(`Frame ${i + 1} analysis failed:`, error);
                }
            }

            // 統合分析結果を生成
            const summary = await this.generateVideoSummary(analyses, videoFile.name);
            
            return {
                fileName: videoFile.name,
                frameAnalyses: analyses,
                summary: summary,
                timestamp: new Date().toLocaleString('ja-JP')
            };

        } catch (error) {
            console.error('Video analysis error:', error);
            throw error;
        }
    }

    // 動画フレーム抽出
    async extractVideoFrames(videoFile, frameCount = 5) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const frames = [];

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const duration = video.duration;
                const interval = duration / (frameCount + 1);
                let currentFrame = 0;

                const extractFrame = () => {
                    if (currentFrame >= frameCount) {
                        resolve(frames);
                        return;
                    }

                    const time = interval * (currentFrame + 1);
                    video.currentTime = time;

                    video.onseeked = () => {
                        ctx.drawImage(video, 0, 0);
                        const frameData = canvas.toDataURL('image/jpeg', 0.8);
                        
                        frames.push({
                            data: frameData,
                            time: time,
                            timeString: this.formatTime(time)
                        });

                        currentFrame++;
                        setTimeout(extractFrame, 100); // 次のフレーム処理まで少し待機
                    };
                };

                extractFrame();
            };

            video.onerror = () => reject(new Error('動画の読み込みに失敗しました'));
            video.src = URL.createObjectURL(videoFile);
        });
    }

    // 動画統合分析
    async generateVideoSummary(frameAnalyses, fileName) {
        const summaryPrompt = `以下の動画フレーム分析結果から、統合的な分析を行ってください：

${frameAnalyses.map((analysis, index) => `
フレーム ${index + 1} (${analysis.frameTime}秒):
- 状況: ${analysis.matchStatus || '不明'}
- 評価: ${analysis.overallScore || 'N/A'}点
- 問題点: ${(analysis.weaknesses || []).join(', ')}
- 良い点: ${(analysis.strengths || []).join(', ')}
`).join('\n')}

【統合分析要求】
1. 動画全体を通してのパフォーマンス評価
2. 一貫している問題点
3. 時系列での変化や改善点
4. 総合的な改善提案

JSON形式で回答してください：
{
  "overallScore": "総合評価(10点満点)",
  "timelineAnalysis": "時系列分析",
  "consistentIssues": ["一貫した問題1", "問題2"],
  "improvements": ["改善提案1", "提案2"],
  "summary": "総合評価コメント"
}`;

        try {
            const response = await this.sendChatMessage(summaryPrompt, false);
            
            const jsonMatch = response.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                return {
                    summary: response.response,
                    overallScore: 'N/A',
                    timelineAnalysis: '統合分析完了'
                };
            }
        } catch (error) {
            console.warn('Summary generation failed:', error);
            return {
                summary: '統合分析中にエラーが発生しました',
                overallScore: 'N/A',
                timelineAnalysis: 'エラー'
            };
        }
    }

    // ファイルのMIMEタイプを取得
    getMimeType(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };
        return mimeTypes[extension] || 'image/jpeg';
    }

    // 時間フォーマット
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // チャット履歴クリア
    clearChatHistory() {
        this.chatHistory = [];
        console.log('チャット履歴をクリアしました');
    }

    // デバッグ情報取得
    getDebugInfo() {
        return {
            isConfigured: this.isConfigured(),
            chatModel: this.chatModel,
            visionModel: this.visionModel,
            baseUrl: this.baseUrl,
            chatHistoryLength: this.chatHistory.length,
            retrySettings: {
                maxRetries: this.maxRetries,
                retryDelay: this.retryDelay
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