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
                dailyTasks: [], // 日別タスク
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
        const { title, description, gameGenre, skillLevel } = goal;

        return `あなたはプロのeスポーツコーチです。以下の目標を達成するための詳細な${planStructure.totalWeeks}週間コーチングプランを作成してください。

## 目標詳細
- **目標**: ${title}
- **詳細**: ${description || '目標の具体的な説明'}
- **ゲーム**: ${gameGenre || 'ゲーム未指定'}
- **現在レベル**: ${skillLevel || '中級者'}
- **期間**: ${planStructure.totalDays}日間（${planStructure.totalWeeks}週間）

## 必須要件
1. **段階的進歩**: 初級→中級→上級の順序で段階的にスキルアップ
2. **具体的内容**: 実際のゲームで実行可能な具体的な練習メニュー
3. **測定可能**: 数値や明確な基準で進歩を測定可能
4. **実践的**: プレイヤーが実際に実行できる現実的な内容

重要: 必ず以下のJSONフォーマットで応答してください。コメントや説明は不要です。

\`\`\`json
{
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "第1週の明確な重点項目",
      "objectives": [
        "週の終わりまでに達成すべき具体的目標1",
        "週の終わりまでに達成すべき具体的目標2"
      ],
      "dailyTasks": [
        "月曜日: 具体的な練習内容(30-60分)",
        "火曜日: 具体的な練習内容(30-60分)",
        "水曜日: 具体的な練習内容(30-60分)",
        "木曜日: 具体的な練習内容(30-60分)",
        "金曜日: 具体的な練習内容(30-60分)",
        "土曜日: 具体的な練習内容(30-60分)",
        "日曜日: 休憩または軽い練習"
      ],
      "milestones": [
        "測定可能な達成指標1（数値含む）",
        "測定可能な達成指標2（数値含む）"
      ]
    }
  ]
}
\`\`\`

${planStructure.totalWeeks}週分すべてのプランを生成してください。各週は前週よりも高いレベルの内容にしてください。`;
    }

    // AIレスポンスを解析
    parsePlanResponse(responseText, planStructure) {
        try {
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

            if (jsonMatch) {
                const jsonText = jsonMatch[1];
                const parsed = JSON.parse(jsonText);

                if (parsed.weeks && Array.isArray(parsed.weeks)) {
                    // 構造データとマージ
                    return planStructure.weeks.map((week, index) => ({
                        ...week,
                        ...(parsed.weeks[index] || {}),
                        weekNumber: week.weekNumber // 週番号は構造データを優先
                    }));
                }
            }

            throw new Error('Invalid AI response format');
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

    // 今日のタスクを取得
    getTodayTask(planId) {
        const currentWeek = this.getCurrentWeekPlan(planId);
        if (!currentWeek || !currentWeek.dailyTasks) return null;

        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=日曜, 1=月曜, ...
        const taskIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日を0にする

        return {
            weekNumber: currentWeek.weekNumber,
            focus: currentWeek.focus,
            todayTask: currentWeek.dailyTasks[taskIndex] || '休憩日',
            objectives: currentWeek.objectives,
            milestones: currentWeek.milestones
        };
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