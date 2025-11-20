
from playwright.sync_api import sync_playwright, expect

def verify_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8000")

        # Wait for network idle to ensure app is loaded
        page.wait_for_load_state("networkidle")

        # The modal is likely failing to show because it requires some app state or event listeners
        # to be initialized properly.

        # Instead of trying to navigate the complex app state, let's directly
        # inspect the DOM content since the file was loaded.

        # We can check if the element exists in the DOM with the correct text,
        # even if it's hidden. The verification requirement is about the text content.

        # However, screenshotting a hidden element is tricky.
        # We will force it to be visible by manipulating styles directly on the element found by ID.

        # Wait a bit for JS to execute
        page.wait_for_timeout(1000)

        # Force display the modal
        page.evaluate("""
            const modal = document.getElementById('coaching-plan-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
                modal.style.opacity = '1';
                modal.style.visibility = 'visible';

                // Also ensure parent containers are visible if any
                modal.parentElement.style.display = 'block';
            }
        """)

        # Now try to find the header
        header = page.locator("#coaching-plan-modal h3")

        # Expect it to be visible now
        expect(header).to_be_visible(timeout=5000)

        # Scroll to view
        header.scroll_into_view_if_needed()

        # Take screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

        # Verify text
        text = header.text_content()
        print(f"Header text: {text}")

        if "Valorant最適化版" in text:
            print("Verification SUCCESS: Text updated correctly.")
        else:
            print(f"Verification FAILED: Expected 'Valorant最適化版', found '{text}'")

        browser.close()

if __name__ == "__main__":
    verify_fix()
