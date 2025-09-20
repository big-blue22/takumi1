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

            if (this.geminiService) {
                return await this.generatePlanWithAI(goal, planData);
            } else {
                return this.generateFallbackPlan(goal, planData);
            }
        } catch (error) {
            console.error('Failed to generate coaching plan:', error);
            return this.generateFallbackPlan(goal, this.calculatePlanStructure(deadline));
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
            const response = await this.geminiService.sendChatMessage(prompt, false);

            let responseText = null;
            if (response && response.response) {
                responseText = response.response;
            } else if (response && response.text) {
                responseText = response.text;
            } else {
                console.error('Invalid API response:', response);
                throw new Error('Invalid response from AI');
            }

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

        return `あなたは経験豊富なeスポーツコーチです。以下の目標達成のための${planStructure.totalWeeks}週間のコーチングプランを作成してください。

## 目標情報
- タイトル: ${title}
- 詳細: ${description || 'なし'}
- ゲームジャンル: ${gameGenre || '未設定'}
- スキルレベル: ${skillLevel || '中級'}
- 期間: ${planStructure.totalDays}日間（${planStructure.totalWeeks}週間）

## プラン作成指針
1. 週ごとに段階的にスキルアップできる構成にしてください
2. 各週は明確なフォーカス（重点項目）を設定してください
3. 実践的で測定可能な目標を設定してください
4. プレイヤーのスキルレベルに適した難易度にしてください

## 出力形式
以下のJSON形式で回答してください：

\`\`\`json
{
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "第1週の重点項目（例：基礎固め）",
      "objectives": [
        "この週で達成すべき具体的な目標1",
        "この週で達成すべき具体的な目標2"
      ],
      "dailyTasks": [
        "月曜日の推奨練習内容",
        "火曜日の推奨練習内容",
        "水曜日の推奨練習内容",
        "木曜日の推奨練習内容",
        "金曜日の推奨練習内容",
        "土曜日の推奨練習内容",
        "日曜日の推奨練習内容"
      ],
      "milestones": [
        "週末までに達成すべき測定可能な指標1",
        "週末までに達成すべき測定可能な指標2"
      ]
    }
  ]
}
\`\`\`

## 注意事項
- 各週のフォーカスは段階的に進歩するように設計してください
- 日別タスクは30分-1時間程度で実行可能な内容にしてください
- マイルストーンは数値で測定できるものを含めてください
- 実際のゲーム環境で実践できる具体的な内容にしてください`;
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

    // フォールバックプランを生成
    generateFallbackPlan(goal, planStructure) {
        const weeks = planStructure.weeks.map((week, index) => ({
            ...week,
            focus: this.getFallbackFocus(index + 1, planStructure.totalWeeks, goal.gameGenre),
            objectives: this.getFallbackObjectives(index + 1, goal.gameGenre),
            dailyTasks: this.getFallbackDailyTasks(goal.gameGenre),
            milestones: this.getFallbackMilestones(index + 1, goal.gameGenre)
        }));

        return this.createPlanObject(goal, weeks);
    }

    // フォールバック用フォーカス
    getFallbackFocus(weekNumber, totalWeeks, gameGenre) {
        const phase = Math.ceil((weekNumber / totalWeeks) * 3); // 3段階に分割

        const focuses = {
            1: '基礎スキルの習得と改善',
            2: '応用技術の練習と実戦投入',
            3: '総仕上げと目標達成の確認'
        };

        return focuses[phase] || '総合的なスキル向上';
    }

    // フォールバック用目標
    getFallbackObjectives(weekNumber, gameGenre) {
        const baseObjectives = [
            '毎日30分以上の集中練習を実行',
            '週末に進捗を確認し、次週の計画を調整'
        ];

        const gameSpecificObjectives = {
            'fps': ['エイム精度の向上', 'マップ知識の習得'],
            'moba': ['ラストヒット精度の向上', 'ワード配置の最適化'],
            'fighting': ['基本コンボの安定化', '対戦相手への対応力向上'],
            'strategy': ['資源管理の効率化', '戦略判断力の向上']
        };

        return [
            ...baseObjectives,
            ...(gameSpecificObjectives[gameGenre] || ['スキル全般の向上'])
        ];
    }

    // フォールバック用日別タスク
    getFallbackDailyTasks(gameGenre) {
        const baseTasks = [
            '基礎練習（20分）',
            '実戦練習（30分）',
            '復習と分析（10分）',
            'スキル練習（25分）',
            '対戦練習（35分）',
            '総合練習（45分）',
            '休憩・軽い練習（15分）'
        ];

        return baseTasks;
    }

    // フォールバック用マイルストーン
    getFallbackMilestones(weekNumber, gameGenre) {
        return [
            '週間練習時間5時間以上達成',
            '設定した練習メニューを80%以上実行'
        ];
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