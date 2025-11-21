
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8000');

    // 1. Verify Match Detail Modal Edit Button is gone
    // Trigger match detail modal by mocking a match click (if needed) or just checking DOM if it was pre-rendered.
    // But the modal content is dynamically generated.
    // I need to open the gallery and click a match.

    // Inject a mock match into localStorage
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
        // Force reload gallery
        app.loadGallery();
    });

    // Go to Gallery
    await page.click('button[data-page="gallery"]');

    // Click the match card
    await page.waitForSelector('.valorant-match-card');
    await page.click('.valorant-match-card');

    // Wait for modal
    await page.waitForSelector('#match-detail-modal', { state: 'visible' });

    // Check for edit button
    const editMatchBtn = await page.locator('#edit-match-btn').count();
    console.log(`Match Edit Button Count: ${editMatchBtn}`);

    // Take screenshot of match detail modal
    await page.screenshot({ path: 'verification/match_detail_modal.png' });

    // Close modal
    await page.click('#match-detail-modal .btn-secondary');


    // 2. Verify Plan Creation Edit Button is gone
    // Open Coaching Plan Modal
    // I need to trigger the modal.
    await page.evaluate(() => {
        app.openCoachingPlanModal({ title: 'Test Goal', deadline: '2023-12-31' });
        app.showPlanStep('plan-review-step'); // Skip directly to review step where button was
    });

    await page.waitForSelector('#coaching-plan-modal', { state: 'visible' });

    // Check for edit button
    const editPlanBtn = await page.locator('#edit-plan-btn').count();
    console.log(`Plan Edit Button Count: ${editPlanBtn}`);

    // Take screenshot of plan review modal
    await page.screenshot({ path: 'verification/plan_review_modal.png' });

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await browser.close();
  }
})();
