// coaching-plan-service.js - コーチングプラン管理サービス（SF6最適化版）
class CoachingPlanService {
    constructor() {
        this.geminiService = null;
        this.sf6KnowledgeBase = null;
        this.initializeGeminiService();
        this.loadSF6KnowledgeBase();
    }

    // Gemini APIサービスを初期化
    initializeGeminiService() {
        if (typeof GeminiService !== 'undefined' && window.unifiedApiManager?.isConfigured()) {
            try {
                this.geminiService = new GeminiService();
                console.log('CoachingPlanService: Gemini API initialized');
            } catch (error) {
                console.warn('CoachingPlanService: Failed to initialize Gemini API:', error);
            }
        }
    }

    // SF6知識ベースをロード
    async loadSF6KnowledgeBase() {
        try {
            // LocalStorageから保存されているデータソースファイルを取得
            const datasourceKeys = Object.keys(localStorage).filter(key => key.startsWith('datasource-'));
            
            if (datasourceKeys.length > 0) {
                console.log(`📚 SF6知識ベース: ${datasourceKeys.length}ファイル検出`);
                
                // 全ファイルの内容を結合
                let knowledgeBase = '';
                datasourceKeys.forEach(key => {
                    const content = localStorage.getItem(key);
                    const filename = key.replace('datasource-', '');
                    knowledgeBase += `\n--- ${filename} ---\n${content}\n`;
                });
                
                // サイズ制限（12,000文字）
                if (knowledgeBase.length > 12000) {
                    console.warn(`⚠️ 知識ベースが大きすぎます（${knowledgeBase.length}文字）。最初の12,000文字を使用します。`);
                    knowledgeBase = knowledgeBase.substring(0, 12000);
                }
                
                this.sf6KnowledgeBase = knowledgeBase;
                console.log(`✅ SF6知識ベース読み込み完了: ${knowledgeBase.length}文字`);
            } else {
                console.log('📚 SF6知識ベース: データソースファイルなし');
                this.sf6KnowledgeBase = null;
            }
        } catch (error) {
            console.error('SF6知識ベース読み込みエラー:', error);
            this.sf6KnowledgeBase = null;
        }
    }

    // 目標に基づいてコーチングプランを自動生成（SF6最適化版）
    async generateCoachingPlan(goal) {
        const { title, deadline, description, gameGenre, skillLevel } = goal;

        if (!deadline) {
            throw new Error('期限が設定されていない目標にはコーチングプランを作成できません');
        }

        try {
            // 知識ベースを再読み込み（最新のデータソースを反映）
            await this.loadSF6KnowledgeBase();
            
            const planData = this.calculatePlanStructure(deadline);

            if (!this.geminiService) {
                throw new Error('Gemini APIサービスが利用できません。APIキーを設定してください。');
            }

            console.log('🎮 SF6コーチングプラン生成開始');
            console.log(`📊 知識ベース: ${this.sf6KnowledgeBase ? '有効' : '無効'}`);
            console.log(`🎯 目標: ${title}`);
            console.log(`📅 期間: ${planData.totalWeeks}週間`);

            return await this.generatePlanWithAI(goal, planData);
        } catch (error) {
            console.error('Failed to generate coaching plan:', error);
            throw error;
        }
    }

    // プラン構造を計算（週区切り）
    calculatePlanStructure(deadline) {
        const today = new Date();
        const deadlineDate = new Date(deadline);

        // 日数計算
        const totalDays = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
        const totalWeeks = Math.ceil(totalDays / 7);

        if (totalDays <= 0) {
            throw new Error('期限が過去または今日の目標にはプランを作成できません');
        }

        const weeks = [];
        let currentDate = new Date(today);

        for (let i = 0; i < totalWeeks; i++) {
            const weekStart = new Date(currentDate);
            const weekEnd = new Date(currentDate);
            weekEnd.setDate(weekEnd.getDate() + 6);

            // 最終週は期限日まで
            if (i === totalWeeks - 1) {
                weekEnd.setTime(deadlineDate.getTime());
            }

            weeks.push({
                weekNumber: i + 1,
                startDate: weekStart.toISOString().split('T')[0],
                endDate: weekEnd.toISOString().split('T')[0],
                focus: '', // AIまたはユーザーが設定
                objectives: [], // 週の目標
                milestones: [] // 達成指標
            });

            currentDate.setDate(currentDate.getDate() + 7);
        }

        return {
            totalWeeks,
            totalDays,
            weeks
        };
    }

    // AIでコーチングプランを生成（SF6最適化版・グラウンディング対応）
    async generatePlanWithAI(goal, planStructure) {
        const prompt = this.buildPlanGenerationPrompt(goal, planStructure);

        try {
            console.log('🤖 Generating SF6 coaching plan with Gemini API...');
            
            // データソース情報の有無を確認
            const hasKnowledgeBase = this.sf6KnowledgeBase && this.sf6KnowledgeBase.length > 0;
            console.log(`📚 知識ベース: ${hasKnowledgeBase ? '有効' : '無効'}`);
            
            // グラウンディングを使用してAPI呼び出し
            const response = await this.generatePlanWithGrounding(prompt, goal);

            console.log('📡 Raw API Response:', response);

            if (!response) {
                throw new Error('Gemini APIからの応答がありません');
            }

            let responseText = null;
            if (response.response) {
                responseText = response.response;
                console.log('✅ Using response.response field');
            } else if (response.text) {
                responseText = response.text;
                console.log('✅ Using response.text field');
            } else {
                console.error('❌ Invalid API response structure:', response);
                console.error('Response type:', typeof response);
                console.error('Response keys:', Object.keys(response));
                throw new Error('APIレスポンスに有効なテキストフィールドがありません');
            }

            if (!responseText || responseText.trim().length === 0) {
                throw new Error('AIからの応答テキストが空です');
            }

            console.log('📝 Response text length:', responseText.length);
            console.log('📝 Response preview:', responseText.substring(0, 200) + '...');

            const generatedPlan = this.parsePlanResponse(responseText, planStructure);
            const planObject = this.createPlanObject(goal, generatedPlan);
            
            // グラウンディング情報があれば追加
            if (response.groundingSources) {
                planObject.metadata.groundingSources = response.groundingSources;
                planObject.metadata.knowledgeBaseUsed = hasKnowledgeBase;
            }
            
            return planObject;
        } catch (error) {
            console.error('AI plan generation failed:', error);
            throw error;
        }
    }

    // グラウンディングを使用してプラン生成
    async generatePlanWithGrounding(prompt, goal) {
        const { character } = goal;
        
        // SF6固有の検索クエリを生成
        const searchQueries = this.generateSF6SearchQueries(goal);
        
        // リクエストボディを構築
        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 8192,
                topP: 0.8,
                topK: 40
            }
        };

        // 知識ベースがある場合はコンテキストに追加
        if (this.sf6KnowledgeBase) {
            const contextPrompt = `## ストリートファイター6 参考資料\n${this.sf6KnowledgeBase}\n\n${prompt}`;
            requestBody.contents[0].parts[0].text = contextPrompt;
            console.log('📚 知識ベースをコンテキストに追加');
        }

        // Webグラウンディングを有効化
        if (searchQueries.length > 0 && this.geminiService.groundingConfig?.enableWebSearch) {
            requestBody.tools = [{
                googleSearch: {}
            }];
            
            // 検索キーワードをプロンプトに含める
            const enhancedPrompt = `${requestBody.contents[0].parts[0].text}

【最新情報検索】
以下のキーワードで最新のメタ情報を検索して参考にしてください：
${searchQueries.map(q => `- ${q}`).join('\n')}`;
            
            requestBody.contents[0].parts[0].text = enhancedPrompt;
            console.log('🔍 グラウンディング有効化:', searchQueries);
        }

        // API呼び出し
        const apiKey = this.geminiService.apiKey;
        const model = this.geminiService.chatModel;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from API');
        }

        const candidate = data.candidates[0];
        const text = candidate.content?.parts?.[0]?.text || '';
        
        // グラウンディング情報を抽出
        let groundingSources = null;
        if (candidate.groundingMetadata) {
            groundingSources = this.geminiService.processGroundingMetadata(candidate.groundingMetadata);
        }

        return {
            response: text,
            groundingSources: groundingSources
        };
    }

    // SF6固有の検索クエリを生成
    generateSF6SearchQueries(goal) {
        const { title, character, description, skillLevel } = goal;
        const queries = [];
        
        // 基本検索クエリ
        queries.push('ストリートファイター6 最新メタ 2025');
        
        // キャラクター固有の検索
        if (character && character !== 'all') {
            queries.push(`ストリートファイター6 ${character} 攻略 2025`);
            queries.push(`SF6 ${character} コンボ 最新`);
        }
        
        // スキルレベル別の検索
        if (skillLevel) {
            const levelMap = {
                'beginner': '初心者',
                'intermediate': '中級者',
                'advanced': '上級者'
            };
            const levelJp = levelMap[skillLevel] || '中級者';
            queries.push(`ストリートファイター6 ${levelJp} 上達法`);
        }
        
        // 目標タイトルからキーワード抽出
        if (title) {
            // ランク関連
            if (title.match(/ダイヤ|プラチナ|ゴールド|シルバー|ブロンズ|マスター|レジェンド/)) {
                queries.push('ストリートファイター6 ランクマッチ 攻略');
            }
            // キャラクター名が含まれている場合
            const characters = ['リュウ', 'ケン', 'キャミィ', '春麗', 'ガイル', 'ザンギエフ', 'ブランカ', 'ダルシム', 'Eホンダ', 'ジュリ', 'ジェイミー', 'マノン', 'ディージェイ', 'マリーザ', 'JP', 'キンバリー', 'リリー', 'ラシード'];
            characters.forEach(char => {
                if (title.includes(char)) {
                    queries.push(`SF6 ${char} メタ 対策`);
                }
            });
        }
        
        return queries;
    }

    // AI用プロンプトを構築（SF6最適化版）
    buildPlanGenerationPrompt(goal, planStructure) {
        const { title, character, description, skillLevel, gameGenre } = goal;
        
        // キャラクター情報
        const characterInfo = character && character !== 'all' ? `使用キャラクター: ${character}` : '全キャラクター対応';
        
        // スキルレベル情報
        const skillLevelMap = {
            'beginner': '初心者（基本操作を習得中）',
            'intermediate': '中級者（基本を理解し応用を学習中）',
            'advanced': '上級者（高度な戦術を実践中）'
        };
        const skillInfo = skillLevelMap[skillLevel] || '中級者';
        
        // ユーザープロフィールから統計情報を取得
        const userStats = this.getUserStatistics();

        return `# ストリートファイター6 コーチングプラン生成

## 目標情報
- **目標**: ${title}
- **期間**: ${planStructure.totalWeeks}週間（${planStructure.totalDays}日間）
- **キャラクター**: ${characterInfo}
- **スキルレベル**: ${skillInfo}
${description ? `- **詳細**: ${description}` : ''}

## プレイヤー統計
- 総試合数: ${userStats.totalMatches}試合
- 総合勝率: ${userStats.overallWinRate}%
- よく使うキャラ: ${userStats.topCharacters.join(', ') || 'データなし'}
- 苦手な相手: ${userStats.weakAgainst.join(', ') || 'データなし'}

## 指示
ストリートファイター6の最新メタ、キャラクター特性、フレームデータを考慮した実践的な${planStructure.totalWeeks}週間のコーチングプランを作成してください。

### 各週の構成
1. **focus**: その週のメインテーマ（SF6の実践的なスキルに特化）
2. **objectives**: 達成すべき具体的な目標（2-3個、測定可能なもの）
3. **milestones**: 達成の判断基準（具体的な数値や状況）

### SF6固有の考慮事項
- ドライブシステム（パリィ、ラッシュ、インパクト、リバーサル）の習得
- モダン/クラシック操作の特性
- キャラクター固有のコンボルート
- 対戦キャラクター別の対策
- フレーム有利・不利の理解
- 起き攻め・受け身狩りのセットプレイ
- 最新パッチでの変更点

### プランの難易度調整
- 第1週: 基礎固め（${skillInfo}向けの基本スキル）
- 中盤週: 実践応用（ランクマッチでの活用）
- 最終週: 目標達成（${title}の完遂）

## 出力形式
**必ずJSON形式のみで回答してください**：

\`\`\`json
{
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "ドライブシステムの基礎とパリィ練習",
      "objectives": [
        "トレーニングモードでパリィを20回連続成功",
        "ランクマッチでドライブラッシュを5回以上使用",
        "ドライブゲージの管理を意識して10試合"
      ],
      "milestones": [
        "パリィ成功率60%以上",
        "ドライブラッシュからコンボ完走3回",
        "ゲージ切れ0回で5試合完了"
      ]
    }
  ]
}
\`\`\`

${planStructure.totalWeeks}週分のプランを生成してください。各週は上記の例のように、SF6の実践的で測定可能な内容にしてください。`;
    }

    // ユーザー統計情報を取得
    getUserStatistics() {
        try {
            const galleryData = JSON.parse(localStorage.getItem('sf6_gallery') || '[]');
            
            if (galleryData.length === 0) {
                return {
                    totalMatches: 0,
                    overallWinRate: 0,
                    topCharacters: [],
                    weakAgainst: []
                };
            }

            // 総試合数と勝率
            const totalMatches = galleryData.length;
            const wins = galleryData.filter(m => m.result === 'WIN').length;
            const overallWinRate = ((wins / totalMatches) * 100).toFixed(1);

            // よく使うキャラクター（上位3つ）
            const characterCount = {};
            galleryData.forEach(match => {
                const char = match.playerCharacter || match.character;
                if (char) {
                    characterCount[char] = (characterCount[char] || 0) + 1;
                }
            });
            const topCharacters = Object.entries(characterCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([char]) => char);

            // 苦手な相手（勝率が低い相手キャラ上位3つ）
            const opponentStats = {};
            galleryData.forEach(match => {
                const opp = match.opponentCharacter || match.opponent;
                if (opp && opp !== 'Unknown') {
                    if (!opponentStats[opp]) {
                        opponentStats[opp] = { wins: 0, total: 0 };
                    }
                    opponentStats[opp].total++;
                    if (match.result === 'WIN') {
                        opponentStats[opp].wins++;
                    }
                }
            });
            const weakAgainst = Object.entries(opponentStats)
                .filter(([_, stats]) => stats.total >= 3) // 3試合以上のデータがある相手のみ
                .map(([char, stats]) => ({
                    char,
                    winRate: (stats.wins / stats.total) * 100
                }))
                .sort((a, b) => a.winRate - b.winRate)
                .slice(0, 3)
                .map(item => item.char);

            return {
                totalMatches,
                overallWinRate,
                topCharacters,
                weakAgainst
            };
        } catch (error) {
            console.error('統計情報の取得エラー:', error);
            return {
                totalMatches: 0,
                overallWinRate: 0,
                topCharacters: [],
                weakAgainst: []
            };
        }
    }

    // AIレスポンスを解析
    parsePlanResponse(responseText, planStructure) {
        try {
            console.log('🔍 Parsing AI response...');
            console.log('📝 Full response text:', responseText);

            let jsonText = null;

            // より堅牢なJSONパターンをチェック
            const patterns = [
                /```json\s*([\s\S]*?)\s*```/i,    // ```json ... ```
                /```\s*([\s\S]*?)\s*```/,         // ``` ... ```
                /(\{[\s\S]*?"weeks"[\s\S]*?\})/,  // weeks を含む最初の JSON オブジェクト
                /\{[\s\S]*\}/                     // { ... } 直接
            ];

            for (let i = 0; i < patterns.length; i++) {
                const pattern = patterns[i];
                const match = responseText.match(pattern);
                if (match) {
                    jsonText = match[1] || match[0];
                    console.log(`✅ Found JSON pattern ${i + 1}:`, jsonText.substring(0, 100) + '...');

                    // JSONが不完全な場合は修復を試みる
                    if (!jsonText.trim().endsWith('}')) {
                        console.log('⚠️ Incomplete JSON detected, attempting to fix...');
                        const openBraces = (jsonText.match(/\{/g) || []).length;
                        const closeBraces = (jsonText.match(/\}/g) || []).length;
                        const missingBraces = openBraces - closeBraces;

                        if (missingBraces > 0) {
                            jsonText += '}'.repeat(missingBraces);
                            console.log('🔧 Added missing closing braces:', missingBraces);
                        }
                    }
                    break;
                }
            }

            if (!jsonText) {
                console.log('❌ No JSON pattern found, using full response');
                jsonText = responseText.trim();
            }

            console.log('📝 Final JSON to parse:', jsonText);

            let parsed;
            try {
                parsed = JSON.parse(jsonText);
            } catch (parseError) {
                console.error('❌ JSON parse failed:', parseError);
                // 最後の手段：部分的なJSONを修復
                const weeksMatch = jsonText.match(/"weeks"\s*:\s*\[([\s\S]*)/);
                if (weeksMatch) {
                    console.log('🔧 Attempting partial JSON reconstruction...');
                    try {
                        parsed = { weeks: JSON.parse('[' + weeksMatch[1].split(']')[0] + ']') };
                    } catch {
                        throw parseError;
                    }
                } else {
                    throw parseError;
                }
            }

            if (!parsed.weeks || !Array.isArray(parsed.weeks)) {
                throw new Error('Response missing "weeks" array');
            }

            if (parsed.weeks.length === 0) {
                console.warn('⚠️ Empty weeks array, creating minimal plan');
                // 空の場合は最小限のプランを作成
                parsed.weeks = [{
                    weekNumber: 1,
                    focus: '基礎練習',
                    objectives: ['基本スキル向上'],
                    milestones: ['週目標達成']
                }];
            }

            console.log(`✅ Successfully parsed ${parsed.weeks.length} weeks`);

            // 構造データとマージ（AIが生成した週数が少ない場合は残りを拡張）
            return planStructure.weeks.map((week, index) => {
                if (index < parsed.weeks.length) {
                    return {
                        ...week,
                        ...parsed.weeks[index],
                        weekNumber: week.weekNumber
                    };
                } else {
                    // AIが生成しなかった週は最後の週のパターンを使用
                    const lastParsedWeek = parsed.weeks[parsed.weeks.length - 1];
                    return {
                        ...week,
                        focus: lastParsedWeek?.focus || '継続練習',
                        objectives: lastParsedWeek?.objectives || ['基本練習'],
                        milestones: lastParsedWeek?.milestones || ['週目標達成']
                    };
                }
            });

        } catch (error) {
            console.error('Failed to parse AI plan response:', error);
            console.error('Response text:', responseText);
            throw new Error('AI応答の解析に失敗しました: ' + error.message);
        }
    }


    // プランオブジェクトを作成
    createPlanObject(goal, weeks) {
        return {
            id: `plan_${Date.now()}`,
            goalId: goal.id || `goal_${Date.now()}`,
            goalTitle: goal.title,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft', // draft, active, completed, paused
            weeks: weeks,
            metadata: {
                gameGenre: goal.gameGenre,
                skillLevel: goal.skillLevel,
                totalWeeks: weeks.length,
                estimatedTimePerDay: 60 // 分
            }
        };
    }

    // プランを保存
    savePlan(plan) {
        try {
            const plans = this.getAllPlans();
            const existingIndex = plans.findIndex(p => p.id === plan.id);

            if (existingIndex >= 0) {
                plans[existingIndex] = { ...plan, updatedAt: new Date().toISOString() };
            } else {
                plans.push(plan);
            }

            localStorage.setItem('coaching_plans', JSON.stringify(plans));
            return true;
        } catch (error) {
            console.error('Failed to save coaching plan:', error);
            return false;
        }
    }

    // 全プランを取得
    getAllPlans() {
        try {
            return JSON.parse(localStorage.getItem('coaching_plans') || '[]');
        } catch (error) {
            console.warn('Failed to load coaching plans:', error);
            return [];
        }
    }

    // 特定プランを取得
    getPlan(planId) {
        const plans = this.getAllPlans();
        return plans.find(plan => plan.id === planId);
    }

    // 目標IDに基づいてプランを取得
    getPlanByGoalId(goalId) {
        const plans = this.getAllPlans();
        return plans.find(plan => plan.goalId === goalId);
    }

    // アクティブなプランを取得
    getActivePlans() {
        const plans = this.getAllPlans();
        return plans.filter(plan => plan.status === 'active');
    }

    // 今週のプラン内容を取得
    getCurrentWeekPlan(planId) {
        const plan = this.getPlan(planId);
        if (!plan) return null;

        const today = new Date().toISOString().split('T')[0];
        const currentWeek = plan.weeks.find(week =>
            week.startDate <= today && week.endDate >= today
        );

        return currentWeek;
    }


    // プランのステータスを更新
    updatePlanStatus(planId, status) {
        const plan = this.getPlan(planId);
        if (!plan) return false;

        plan.status = status;
        plan.updatedAt = new Date().toISOString();

        return this.savePlan(plan);
    }

    // プランを削除
    deletePlan(planId) {
        try {
            const plans = this.getAllPlans();
            const filteredPlans = plans.filter(plan => plan.id !== planId);
            localStorage.setItem('coaching_plans', JSON.stringify(filteredPlans));
            return true;
        } catch (error) {
            console.error('Failed to delete coaching plan:', error);
            return false;
        }
    }
}

// Export for global access
window.CoachingPlanService = CoachingPlanService;