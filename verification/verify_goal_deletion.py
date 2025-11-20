
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to the test page
        page.goto('http://localhost:8000/verification/test_goal_delete.html')

        print("Page loaded")

        # Check if goal exists
        if page.is_visible('#goal-12345'):
            print("Goal exists")
        else:
            print("Goal not found")
            browser.close()
            return

        # Click delete button
        page.click('#delete-btn-12345')
        print("Clicked delete button")

        # Wait for Swal dialog
        # Swal dialogs typically have class .swal2-popup
        try:
            page.wait_for_selector('.swal2-popup', timeout=3000)
            print("Confirmation dialog appeared")

            # Check if it has an input field (should NOT have one initially)
            input_field = page.query_selector('.swal2-input')
            if input_field and input_field.is_visible():
                print("Input field found (Unexpected for initial state)")
            else:
                print("No input field found (Expected for initial state)")

            # Click the confirm button "削除する"
            confirm_btn = page.query_selector('.swal2-confirm')
            if confirm_btn:
                print("Found confirm button, clicking...")
                confirm_btn.click()

                # Wait a bit for deletion to process
                time.sleep(1)

                # Check if goal is gone
                goals = page.evaluate("localStorage.getItem('goals')")
                if '12345' not in goals:
                    print("Goal deleted successfully")
                else:
                    print("Goal NOT deleted")
            else:
                print("Confirm button not found")

        except Exception as e:
            print(f"Error finding dialog: {e}")
            page.screenshot(path='verification/error_screenshot.png')

        browser.close()

if __name__ == '__main__':
    run()
