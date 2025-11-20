
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to the test page
        page.goto('http://localhost:8000/verification/test_goal_delete.html')

        # Reset localStorage to ensure goal exists (in case previous test deleted it)
        page.evaluate("""
            const mockGoals = [
                { id: 12345, title: 'Test Goal', deadline: '2024-12-31', description: 'Test Description', progress: 50 }
            ];
            localStorage.setItem('goals', JSON.stringify(mockGoals));
            if(window.app && window.app.loadGoalsList) window.app.loadGoalsList();
        """)

        print("Page loaded and goals reset")

        if not page.is_visible('#goal-12345'):
            print("Goal not found after reset")
            browser.close()
            return

        # Click delete button
        page.click('#delete-btn-12345')
        print("Clicked delete button")

        # Wait for Swal dialog
        try:
            page.wait_for_selector('.swal2-popup', timeout=3000)
            print("Confirmation dialog appeared")

            # Check if it has an input field
            input_field = page.query_selector('.swal2-input')
            if input_field and input_field.is_visible():
                print("Input field found (Correct)")
            else:
                print("No input field found (Incorrect)")
                browser.close()
                return

            # Test 1: Click Confirm without input (or wrong input)
            # By default input is empty
            confirm_btn = page.query_selector('.swal2-confirm')
            confirm_btn.click()
            time.sleep(0.5)

            # Check for validation error
            validation_msg = page.query_selector('.swal2-validation-message')
            if validation_msg and validation_msg.is_visible():
                print("Validation message appeared (Correct)")
                msg_text = validation_msg.text_content()
                print(f"Message: {msg_text}")
            else:
                print("No validation message appeared (Incorrect)")

            # Test 2: Enter wrong keyword
            input_field.fill("wrong")
            confirm_btn.click()
            time.sleep(0.5)

            if validation_msg and validation_msg.is_visible():
                 print("Validation message appeared for wrong input (Correct)")
            else:
                 print("No validation message for wrong input (Incorrect)")

            # Test 3: Enter correct keyword "削除"
            input_field.fill("削除")
            confirm_btn.click()
            time.sleep(1)

            # Check if goal is gone
            goals = page.evaluate("localStorage.getItem('goals')")
            if '12345' not in goals:
                print("Goal deleted successfully with correct keyword")
            else:
                print("Goal NOT deleted even with correct keyword")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path='verification/error_verify.png')

        browser.close()

if __name__ == '__main__':
    run()
