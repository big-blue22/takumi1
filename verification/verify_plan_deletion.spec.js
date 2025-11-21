
const { test, expect } = require('@playwright/test');

test.describe('Coaching Plan Deletion', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the Gemini API to return success
        await page.route('**/models/*:generateContent*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    candidates: [{
                        content: { parts: [{ text: 'Mock response' }] }
                    }]
                })
            });
        });

        // Setup localStorage before page load
        await page.addInitScript(() => {
            const dummyGoal = {
                id: 123456,
                title: 'Test Goal for Deletion',
                deadline: '2025-12-31',
                description: 'This goal is linked to a plan',
                gameGenre: 'fps',
                skillLevel: 'intermediate',
                progress: 0,
                hasCoachingPlan: true,
                planId: 'plan_123456'
            };

            const dummyPlan = {
                id: 'plan_123456',
                goalId: 123456,
                goalTitle: 'Test Goal for Deletion',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active',
                weeks: [
                    {
                        weekNumber: 1,
                        startDate: '2025-01-01',
                        endDate: '2025-01-07',
                        focus: 'Focus Week 1',
                        objectives: ['Obj 1'],
                        milestones: ['Mile 1']
                    }
                ],
                metadata: {
                    gameGenre: 'fps',
                    skillLevel: 'intermediate',
                    totalWeeks: 1,
                    estimatedTimePerDay: 60
                }
            };

            window.localStorage.setItem('goals', JSON.stringify([dummyGoal]));
            window.localStorage.setItem('coaching_plans', JSON.stringify([dummyPlan]));
            window.localStorage.setItem('initialSetupCompleted', 'true');
            window.localStorage.setItem('playerSkillLevel', 'intermediate');
            window.localStorage.setItem('playerSkillLevelData', JSON.stringify({name: 'Intermediate', icon: 'icon'}));
            window.localStorage.setItem('gemini_unified_api_key', 'AIzaDummyKeyForTesting1234567890');
            // Also set legacy keys to be safe
            window.localStorage.setItem('gemini-api-key', 'AIzaDummyKeyForTesting1234567890');
        });

        // Go to app
        await page.goto('http://localhost:8000');

        // Navigate to Coaching Plans page
        await page.click('button[data-page="coaching-plans"]');
        await page.waitForSelector('#active-plans-container');
    });

    test('should delete a plan from the list view', async ({ page }) => {
        const planTitle = page.locator('#active-plans-container .plan-title', { hasText: 'Test Goal for Deletion' });
        await expect(planTitle).toBeVisible();

        const planCard = page.locator('#active-plans-container .plan-card', { has: planTitle });
        const deleteBtn = planCard.locator('button', { hasText: '削除' });

        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // Handle SweetAlert
        const swalInput = page.locator('.swal2-input');
        await expect(swalInput).toBeVisible();
        await swalInput.fill('削除');
        await page.click('.swal2-confirm');

        // Verify plan is gone
        await expect(planTitle).not.toBeVisible();

        // Verify goal exists but unlink
        const goals = await page.evaluate(() => JSON.parse(localStorage.getItem('goals')));
        const goal = goals.find(g => g.id === 123456);
        expect(goal).toBeTruthy();
        expect(goal.hasCoachingPlan).toBe(false);
        expect(goal.planId).toBeNull();
    });

    test('should delete a plan from the detail modal', async ({ page }) => {
        // Click on the first "詳細表示" button in active plans
        await page.locator('#active-plans-container button:has-text("詳細表示")').first().click();
        await expect(page.locator('#plan-detail-modal')).toBeVisible();

        const deleteBtn = page.locator('#plan-detail-modal button:has-text("削除")');
        await expect(deleteBtn).toBeVisible();
        await deleteBtn.click();

        // Handle SweetAlert
        const swalInput = page.locator('.swal2-input');
        await expect(swalInput).toBeVisible();
        await swalInput.fill('削除');
        await page.click('.swal2-confirm');

        // Verify modal closed and plan gone
        await expect(page.locator('#plan-detail-modal')).not.toBeVisible();
        const planTitle = page.locator('.plan-title', { hasText: 'Test Goal for Deletion' });
        await expect(planTitle).not.toBeVisible();
    });
});
