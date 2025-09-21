// coaching-plan-service.js - コーチングプラン管理サービス
class CoachingPlanService {
    constructor() {
        this.geminiService = null;
        this.initializeGeminiService();
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

    // 目標に基づいてコーチングプランを自動生成
    async generateCoachingPlan(goal) {
        const { title, deadline, description, gameGenre, skillLevel } = goal;

        if (!deadline) {
            throw new Error('期限が設定されていない目標にはコーチングプランを作成できません');
        }

        try {
            const planData = this.calculatePlanStructure(deadline);

            if (!this.geminiService) {
                throw new Error('Gemini APIサービスが利用できません。APIキーを設定してください。');
            }

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

    // AIでコーチングプランを生成
    async generatePlanWithAI(goal, planStructure) {
        const prompt = this.buildPlanGenerationPrompt(goal, planStructure);

        try {
            console.log('🤖 Generating plan with Gemini API...');
            const response = await this.geminiService.sendChatMessage(prompt, false);

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
            return this.createPlanObject(goal, generatedPlan);
        } catch (error) {
            console.error('AI plan generation failed:', error);
            throw error;
        }
    }

    // AI用プロンプトを構築
    buildPlanGenerationPrompt(goal, planStructure) {
        const { title } = goal;

        return `目標「${title}」の${planStructure.totalWeeks}週練習プラン。JSON形式のみ回答:

{
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "基礎練習",
      "objectives": ["目標1", "目標2"],
      "milestones": ["達成1", "達成2"]
    }
  ]
}

${planStructure.totalWeeks}週分生成。`;
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