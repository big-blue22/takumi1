import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Automatically accept any confirm dialogs
        page.on("dialog", lambda dialog: dialog.accept())

        # Go to the application's index.html page
        file_path = "file://" + os.path.abspath("index.html")
        await page.goto(file_path, wait_until="load")
        print("Page loaded.")

        # --- Force a clean state by clearing localStorage ---
        print("Clearing localStorage to ensure a clean state...")
        await page.evaluate("localStorage.clear()")
        print("localStorage cleared. Reloading page...")
        await page.reload(wait_until="load")
        print("Page reloaded.")

        # --- Part 1: Get the app into a configurable state ---
        # At this point, the skill setup modal MUST be visible.
        print("Handling initial skill setup...")
        await expect(page.locator("#initial-setup-modal")).to_be_visible(timeout=10000)
        await page.locator('.skill-card[data-skill="intermediate"]').click()
        await page.locator("#setup-skill-complete").click()
        await expect(page.locator("#setup-step-complete")).to_be_visible(timeout=5000)

        # This button triggers a reload
        async with page.expect_navigation(wait_until="load"):
            await page.locator("#setup-start-app").click()
        print("Initial skill setup complete. Page reloaded.")

        # Now, the API key modal should be visible.
        print("Handling API key setup...")
        await expect(page.locator("#api-initial-setup-modal")).to_be_visible(timeout=10000)
        await page.locator("#skip-api-setup").click()
        await expect(page.locator("#api-initial-setup-modal")).to_be_hidden(timeout=5000)
        print("API key setup skipped.")

        # Now, the dashboard must be visible.
        await expect(page.locator("#dashboard")).to_be_visible(timeout=10000)
        print("Dashboard is visible. App is in a configurable state.")

        # --- Part 2: Test the reset functionality ---
        print("Navigating to settings page...")
        await page.get_by_role("button", name="⚙️ 設定").click()
        await expect(page.locator("#settings h2")).to_have_text("⚙️ 設定")

        print("Clicking reset button...")
        async with page.expect_navigation(wait_until="load"):
            await page.locator("#reset-app-btn").click()
        print("Page reloaded after reset.")

        # --- Part 3: Verify the result ---
        print("Verifying initial setup modal is visible after reset...")
        final_setup_modal = page.locator("#initial-setup-modal")
        await expect(final_setup_modal).to_be_visible(timeout=10000)

        modal_title = final_setup_modal.locator("h2")
        await expect(modal_title).to_have_text("📊 スキルレベルを選択")
        print("Verification successful!")

        # Take screenshot
        screenshot_path = "jules-scratch/verification/verification.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())