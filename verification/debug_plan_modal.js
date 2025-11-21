
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    // Load the app
    const appUrl = 'http://localhost:8000';
    await page.goto(appUrl, { waitUntil: 'networkidle0' });

    // Inject dummy data and open modal
    await page.evaluate(() => {
        // Mock plan data
        const dummyPlan = {
            id: 'test-plan-1',
            goalTitle: 'Test Goal',
            status: 'active',
            weeks: [],
            goalId: 'test-goal-1',
            createdAt: new Date().toISOString()
        };

        // Save to local storage
        localStorage.setItem('coaching_plans', JSON.stringify([dummyPlan]));
        localStorage.setItem('goals', JSON.stringify([{
            id: 'test-goal-1',
            title: 'Test Goal',
            deadline: '2024-12-31',
            planId: 'test-plan-1',
            hasCoachingPlan: true
        }]));

        // We don't need to force reload plans because we will access it via service
        // Open the modal directly using app method
        if (window.app) {
            // Wait a bit for everything to init
            setTimeout(() => {
                window.app.viewPlanDetails('test-plan-1');
            }, 1000);
        } else {
            console.error('App not initialized');
        }
    });

    // Wait for modal to be visible
    await page.waitForSelector('#plan-detail-modal:not(.hidden)', { timeout: 5000 });

    // Get the HTML of the modal
    const modalHtml = await page.evaluate(() => {
        const modal = document.getElementById('plan-detail-modal');
        return modal ? modal.outerHTML : 'Modal not found';
    });

    console.log('--- Modal HTML Content ---');
    console.log(modalHtml);
    console.log('--------------------------');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
