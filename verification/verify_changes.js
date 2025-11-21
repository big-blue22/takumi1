const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Inject mock data into localStorage to simulate active plans
  await page.addInitScript(() => {
    const mockPlan = {
      id: 'plan_123',
      goalTitle: 'Reach Immortal',
      status: 'active',
      weeks: [
        { weekNumber: 1, startDate: '2023-10-01', endDate: '2023-10-07', focus: 'Aim', objectives: ['DM 30mins'], milestones: ['K/D 1.5'] },
        { weekNumber: 2, startDate: '2023-10-08', endDate: '2023-10-14', focus: 'Strategy', objectives: ['Watch VODs'], milestones: ['Win rate 55%'] }
      ],
      metadata: { totalWeeks: 2 }
    };

    const mockGoal = {
        id: 123,
        title: 'Reach Immortal',
        deadline: '2023-12-31',
        description: 'Become the best',
        progress: 50,
        hasCoachingPlan: true,
        planId: 'plan_123'
    };

    localStorage.setItem('coaching_plans', JSON.stringify([mockPlan]));
    localStorage.setItem('goals', JSON.stringify([mockGoal]));
    localStorage.setItem('initialSetupCompleted', 'true'); // Skip setup

    // Mock unifiedApiManager to avoid modals
    window.unifiedApiManager = {
      isConfigured: () => true,
      validateAPIKey: async () => ({ valid: true }),
      getAPIKey: () => 'mock-key',
      updateLegacyAPIKeys: () => {},
      needsInitialSetup: () => false
    };
  });

  // Go to the app
  await page.goto('http://localhost:8000');

  // Wait for app to initialize and hide loading
  // Also need to handle the setup modal if it appears (though we tried to prevent it)
  await page.waitForTimeout(2000);

  // Manually hide any modals just in case
  await page.evaluate(() => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(m => {
        m.classList.add('hidden');
        m.style.display = 'none';
    });

    // Also remove overlays if any
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(o => o.style.display = 'none');
  });

  // Navigate to 'coaching-plans' page
  console.log('Clicking coaching-plans button...');
  await page.click('button[data-page="coaching-plans"]', { force: true });

  // Wait for plans to render
  await page.waitForSelector('.plan-card');

  // Screenshot the plan card to verify trash button removal
  await page.screenshot({ path: 'verification/plan_card_verification.png', fullPage: true });
  console.log('Plan card screenshot taken.');

  // Click "Show Details" to open the modal
  console.log('Clicking detail button...');
  await page.click('.plan-card .btn-primary', { force: true });

  // Wait for modal
  await page.waitForSelector('#plan-detail-modal:not(.hidden)');

  // Screenshot the modal header to verify trash button removal
  await page.screenshot({ path: 'verification/plan_modal_verification.png', fullPage: true });
  console.log('Modal screenshot taken.');

  await browser.close();
})();
