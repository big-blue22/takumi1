const { test, expect } = require('@playwright/test');
const path = require('path');

test('visual verification of dashboard goal progress', async ({ page }) => {
    // 1. Go to the app
    await page.goto('http://localhost:8000');

    // 2. Inject data into localStorage
    const goalId = 12345;
    const planId = 'plan_12345';
    const now = new Date();
    const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const deadline = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
    // Total 20 days, elapsed 10 days -> 50% progress by time

    const goal = {
        id: goalId,
        title: 'Test Goal',
        description: 'Description',
        deadline: deadline.toISOString().split('T')[0],
        createdAt: createdAt.toISOString(),
        progress: 0, // Initial progress
        hasCoachingPlan: true,
        planId: planId
    };

    const todayStr = now.toISOString().split('T')[0];

    const plan = {
        id: planId,
        goalId: goalId,
        goalTitle: 'Test Goal',
        status: 'active',
        weeks: [
            {
                weekNumber: 1,
                startDate: todayStr, // Starts today, so it is current
                endDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                objectives: ['Obj 1'],
                milestones: ['Mile 1']
            },
            { weekNumber: 2, startDate: '2025-01-01', endDate: '2025-01-07', objectives: [], milestones: [] },
            { weekNumber: 3, startDate: '2025-01-08', endDate: '2025-01-14', objectives: [], milestones: [] },
            { weekNumber: 4, startDate: '2025-01-15', endDate: '2025-01-21', objectives: [], milestones: [] }
        ],
        metadata: { totalWeeks: 4 }
    };

    await page.evaluate(({ goal, plan }) => {
        localStorage.setItem('goals', JSON.stringify([goal]));
        localStorage.setItem('coaching_plans', JSON.stringify([plan]));

        // Bypass initial setup
        localStorage.setItem('initialSetupCompleted', 'true');
        localStorage.setItem('playerSkillLevel', 'intermediate');
        sessionStorage.setItem('isGuest', 'true'); // Avoid login modal

        // Bypass API key setup
        localStorage.setItem('gemini_unified_api_key', 'AIzaSyDUMMYKEYForTest');

        // Mock validateAPIKey to succeed
        if (window.unifiedApiManager) {
            window.unifiedApiManager.validateAPIKey = async () => {
                return { valid: true, message: 'Mocked success' };
            };
        }
    }, { goal, plan });

    // Add init script to mock API validation on reload
    await page.addInitScript(() => {
        Object.defineProperty(window, 'unifiedApiManager', {
            configurable: true,
            set: function(val) {
                this._unifiedApiManager = val;
                if (val) {
                    val.validateAPIKey = async () => {
                        return { valid: true, message: 'Mocked success' };
                    };
                }
            },
            get: function() {
                return this._unifiedApiManager;
            }
        });
    });

    // 3. Reload page to pick up localStorage changes and apply init script
    await page.reload();

    // 4. Wait for dashboard content
    await page.waitForSelector('#dashboard-goals-list .dashboard-goal-item', { timeout: 10000 });

    // 5. Take screenshot
    await page.screenshot({ path: 'verification/dashboard_goal_progress.png' });
});
