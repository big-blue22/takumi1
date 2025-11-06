from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    Verifies the multi-file selection feature.
    """
    # 1. Go to the application
    page.goto("http://localhost:8000")

    # 2. Handle initial skill setup modal
    skill_card = page.locator('.skill-card[data-skill="intermediate"]')
    expect(skill_card).to_be_visible(timeout=10000)
    skill_card.click()

    complete_skill_button = page.locator('#setup-skill-complete')
    expect(complete_skill_button).to_be_enabled()
    complete_skill_button.click()

    # 3. Complete the setup and start the app
    start_app_button = page.locator('#setup-start-app')
    expect(start_app_button).to_be_visible(timeout=5000)
    start_app_button.click()

    # 4. The page will reload; handle the API setup modal by skipping it
    skip_api_button = page.locator('#skip-api-setup')
    expect(skip_api_button).to_be_visible(timeout=10000)
    skip_api_button.scroll_into_view_if_needed()
    skip_api_button.click()

    # 5. Handle guest login
    guest_button = page.locator('#guest-btn')
    expect(guest_button).to_be_visible(timeout=5000)
    guest_button.click()

    # 6. Set up dummy files for the test and reload
    page.evaluate("() => { \
        localStorage.setItem('datasource-test-file-1.txt', 'This is the first test file.'); \
        localStorage.setItem('datasource-test-file-2.txt', 'This is the second test file.'); \
    }")
    page.reload() # Reload so loadAnalysis can see the new files

    # 7. Navigate to the Analysis page
    analysis_button = page.locator('button[data-page="analysis"]')
    expect(analysis_button).to_be_visible()
    analysis_button.click()

    # 8. Enable file-based analysis
    file_radio_button = page.locator('#source-file-radio')
    expect(file_radio_button).to_be_enabled()
    file_radio_button.click()

    # 7. Verify the file list is visible
    file_list_container = page.locator('#source-file-list')
    expect(file_list_container).to_be_visible()

    # 8. Check the "Select All" checkbox
    select_all_checkbox = page.locator('#select-all-files')
    expect(select_all_checkbox).to_be_visible()
    select_all_checkbox.check()

    # 9. Assert that all file checkboxes are now checked
    file_checkboxes = page.locator('input[name="source-file"]')
    for i in range(file_checkboxes.count()):
        expect(file_checkboxes.nth(i)).to_be_checked()

    # 10. Take a screenshot for visual verification
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()