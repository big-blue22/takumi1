// gemini-service.js - Gemini API統合サービス
class GeminiService {
    constructor() {
        this.apiKey = '';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.chatModel = 'gemini-2.0-flash-exp';
        this.visionModel = 'gemini-1.5-pro-vision';
        this.chatHistory = [];
        
        // 統一APIマネージャとの連携
        this.initializeWithUnifiedAPI();
        
        // デフォルトパラメータ
        this.chatParams = {
            temperature: 0.7,
            maxOutputTokens: 1000,
            topP: 0.8,
            topK: 10
        };
        
        this.visionParams = {
            temperature: 0.4,
            maxOutputTokens: 2000,
            topP: 0.95,
            topK: 20
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
        this.apiKey = apiKey;
        if (window.unifiedApiManager) {
            window.unifiedApiManager.setAPIKey(apiKey);
        } else {
            // フォールバック
            localStorage.setItem('gemini-api-key', apiKey);
        }
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
        if (window.unifiedApiManager) {
            return window.unifiedApiManager.isConfigured();
        }
        return this.apiKey && this.apiKey.trim().length > 0;
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
            const response = await this.sendChatMessage('こんにちは');
            return { success: true, message: '接続に成功しました' };
        } catch (error) {
            console.error('Connection test failed:', error);
            throw new Error(`接続テストに失敗しました: ${error.message}`);
        }
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

    // システムプロンプトを生成
    generateSystemPrompt(context) {
        const { game, stats, goals } = context;
        
        return `あなたは経験豊富なeSportsコーチです。以下の情報を参考に、プレイヤーの質問に答えてください：

【プレイヤー情報】
- ゲーム: ${game.name} (${game.category})
- ランク: ${stats.rank}
- 勝率: ${stats.winRate}
- 平均KDA: ${stats.avgKda}
- 試合数: ${stats.gamesPlayed}

【設定目標】
${goals.length > 0 ? goals.map(g => `- ${g.title} (期限: ${g.deadline})`).join('\n') : '- 目標未設定'}

【指示】
1. ${game.name}に特化したアドバイスを提供する
2. プレイヤーの現在のスキルレベルに適した内容にする
3. 具体的で実行可能なアドバイスを心がける
4. 励ましの言葉も含める
5. 回答は日本語で行う
6. 必要に応じて質問で詳細を確認する

プレイヤーをサポートし、パフォーマンス向上を手助けしてください。`;
    }

    // チャットメッセージ送信
    async sendChatMessage(message, includeHistory = true) {
        if (!this.isConfigured()) {
            throw new Error('Gemini APIキーが設定されていません');
        }

        try {
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

            const response = await fetch(`${this.baseUrl}/models/${this.chatModel}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

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

            return {
                response: aiResponse,
                usage: data.usageMetadata || {}
            };

        } catch (error) {
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

            const response = await fetch(`${this.baseUrl}/models/${this.visionModel}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

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
    }
}

// グローバルインスタンス
window.geminiService = new GeminiService();