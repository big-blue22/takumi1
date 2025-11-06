from playwright.sync_api import sync_playwright, Page, expect
import time

def run_verification(page: Page):
    """
    Verifies the insight tag generation functionality by performing a full, clean
    onboarding flow from a reset state.
    """
    print("Navigating to the application...")
    page.goto("http://localhost:8000", timeout=60000)

    # --- Step 1: Reset the application to a known state ---
    print("Overriding window.confirm to auto-accept.")
    page.evaluate("window.confirm = () => true;")

    print("Resetting application state via app.resetAppData()...")
    with page.expect_navigation(wait_until="domcontentloaded"):
        page.evaluate('window.app.resetAppData()')
    print("App reset and reloaded.")

    # --- Step 2: Handle the mandatory setup flow sequentially ---

    # 2a. Handle Initial Skill Setup
    print("Waiting for initial skill setup modal...")
    expect(page.locator("#initial-setup-modal")).to_be_visible(timeout=15000)

    print("Completing skill setup...")
    page.locator('.skill-card[data-skill="intermediate"]').click()
    page.locator("#setup-skill-complete").click()
    start_app_button = page.locator("#setup-start-app")
    expect(start_app_button).to_be_enabled()

    with page.expect_navigation(wait_until="domcontentloaded"):
        start_app_button.click()
    print("Initial setup complete, page reloaded.")

    # 2b. Handle API Key Setup
    print("Waiting for API key setup modal...")
    api_setup_modal = page.locator("#api-initial-setup-modal")
    expect(api_setup_modal).to_be_visible(timeout=15000)

    print("Skipping API key setup using a direct JavaScript click...")
    page.evaluate("document.getElementById('skip-api-setup').click()")
    expect(api_setup_modal).to_be_hidden(timeout=10000)
    print("API key setup modal successfully closed.")

    # 2c. Handle Login Modal
    print("Waiting for Login modal...")
    login_modal = page.locator("#login-modal")
    expect(login_modal).to_be_visible(timeout=15000)

    print("Clicking 'Guest Access' button...")
    guest_button = page.locator("#guest-btn")
    expect(guest_button).to_be_visible()
    guest_button.click()
    expect(login_modal).to_be_hidden(timeout=10000)
    print("Login modal closed.")

    # --- Step 3: Verify the application is ready and navigate ---
    print("Waiting for dashboard to be fully interactive...")
    expect(page.locator("#dashboard")).to_be_visible(timeout=10000)

    print("Navigating to the Analysis page...")
    analysis_button = page.locator('button.nav-btn[data-page="analysis"]')
    analysis_button.click()

    analysis_page = page.locator("#analysis")
    expect(analysis_page).to_be_visible()
    print("On the Analysis page.")

    # --- Step 4: Test the tag generation ---
    print("Entering text into the feelings input...")
    feelings_input = page.locator("#match-feelings")
    feelings_input.fill("対空が出ずに負けた")

    generate_button = page.locator("#generate-tags-btn")
    expect(generate_button).to_be_enabled()
    print("Generate button is enabled.")

    print("Clicking the generate tags button...")
    generate_button.click()

    # --- Step 5: Verify the result and take a screenshot ---
    print("Waiting for generated tags to appear...")
    generated_tags_container = page.locator("#generated-tags-container")

    expect(generated_tags_container).to_be_visible(timeout=30000)

    expect(generated_tags_container.locator(".insight-tag").first).to_be_visible(timeout=20000)
    print("Tags have been generated.")

    print("Taking screenshot...")
    page.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot saved to jules-scratch/verification/verification.png")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_verification(page)
        finally:
            browser.close()

if __name__ == "__main__":
    main()