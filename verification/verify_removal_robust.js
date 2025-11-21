const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8000');

    // Bypass initial setup modal
    await page.evaluate(() => {
        // Force hide all modals
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        // Mock setup completion
        localStorage.setItem('initialSetupCompleted', 'true');
        localStorage.setItem('playerSkillLevel', 'intermediate');
        // Reload might trigger init logic, so just manually hide
        document.getElementById('initial-setup-modal').style.display = 'none';
    });

    // 1. Verify Match Detail Modal
    await page.evaluate(() => {
        const mockMatch = {
            id: 'mock-match-1',
            result: 'WIN',
            map: 'Ascent',
            agent: 'Jett',
            score: '13-5',
            date: '2023-10-27'
        };
        localStorage.setItem('valorant_gallery', JSON.stringify([mockMatch]));
        // Force show match detail directly
        app.showMatchDetail('mock-match-1');
    });

    // Wait for modal content to update
    await page.waitForTimeout(500);

    const editMatchBtn = await page.locator('#edit-match-btn').count();
    console.log(`Match Edit Button Count: ${editMatchBtn}`);
    await page.screenshot({ path: 'verification/match_detail_modal.png' });

    // Close match modal
    await page.evaluate(() => {
        document.getElementById('match-detail-modal').classList.add('hidden');
    });

    // 2. Verify Plan Review Modal
    await page.evaluate(() => {
        app.openCoachingPlanModal({ title: 'Test Goal', deadline: '2023-12-31' });
        app.showPlanStep('plan-review-step');
    });

    await page.waitForTimeout(500);

    const editPlanBtn = await page.locator('#edit-plan-btn').count();
    console.log(`Plan Edit Button Count: ${editPlanBtn}`);
    await page.screenshot({ path: 'verification/plan_review_modal.png' });

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await browser.close();
  }
})();
