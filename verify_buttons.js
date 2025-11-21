
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Start server first? I will assume server is running or I will run it.
  // But I need to serve the files. I'll use file:// protocol for simplicity if possible,
  // or rely on the user instructions saying "The application server can be started by running node server.js".
  // I will assume I need to start it.

  console.log('Navigating to app...');
  await page.goto('http://localhost:8000');

  // Check for edit-match-btn in DOM (it might be hidden but present)
  const matchBtnCount = await page.locator('#edit-match-btn').count();
  console.log(`Match Edit Button Count: ${matchBtnCount}`);

  // Check for edit-plan-btn in DOM
  const planBtnCount = await page.locator('#edit-plan-btn').count();
  console.log(`Plan Edit Button Count: ${planBtnCount}`);

  if (matchBtnCount > 0 && planBtnCount > 0) {
      console.log('SUCCESS: Buttons found (before removal).');
  } else {
      console.log('WARNING: Some buttons not found.');
  }

  await browser.close();
})();
