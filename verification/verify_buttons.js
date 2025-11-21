
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

    // Mock data for match to show the match detail modal
    await page.evaluate(() => {
        const matchData = {
            id: 'test-match-1',
            result: 'WIN',
            map: 'Ascent',
            agent: 'Jett',
            score: '13-10',
            date: '2024-01-01',
            insightTags: ['Tag1', 'Tag2']
        };
        // Save to localStorage
        localStorage.setItem('valorant_matches', JSON.stringify([matchData]));
    });

    // Reload to apply data
    await page.reload({ waitUntil: 'networkidle0' });

    // Navigate to Gallery
    await page.evaluate(() => {
        window.app.showPage('gallery');
        // Force load gallery
        window.app.loadGallery();
    });

    // Wait for match card
    await page.waitForSelector('.valorant-match-card', { timeout: 5000 });

    // Click the match card to open modal
    await page.click('.valorant-match-card');

    // Wait for modal
    await page.waitForSelector('#match-detail-modal:not(.hidden)', { timeout: 5000 });

    // Take a screenshot of the modal actions area
    const actionsElement = await page.$('.match-detail-actions');
    if (actionsElement) {
        await actionsElement.screenshot({ path: 'verification/match_detail_actions.png' });
        console.log('Screenshot taken: verification/match_detail_actions.png');
    } else {
        console.error('Actions element not found');
    }

    // Also check the Gallery delete button (top)
    // Switch to selection mode
    await page.evaluate(() => {
        document.getElementById('toggle-selection-mode').click();
    });

    // Take a screenshot of the gallery filters/actions area
    const galleryFilters = await page.$('.gallery-filters');
    if (galleryFilters) {
        await galleryFilters.screenshot({ path: 'verification/gallery_actions.png' });
        console.log('Screenshot taken: verification/gallery_actions.png');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
