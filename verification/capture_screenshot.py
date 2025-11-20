
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to the test page
        page.goto('http://localhost:8000/verification/test_goal_delete.html')

        # Reset localStorage to ensure goal exists
        page.evaluate("""
            const mockGoals = [
                { id: 12345, title: 'Test Goal', deadline: '2024-12-31', description: 'Test Description', progress: 50 }
            ];
            localStorage.setItem('goals', JSON.stringify(mockGoals));
            if(window.app && window.app.loadGoalsList) window.app.loadGoalsList();
        """)

        # Click delete button
        if page.is_visible('#delete-btn-12345'):
            page.click('#delete-btn-12345')

            # Wait for Swal dialog
            try:
                page.wait_for_selector('.swal2-popup', timeout=3000)
                # Fill in correct keyword
                page.fill('.swal2-input', '削除')
                # Take screenshot
                page.screenshot(path='verification/goal_delete_confirmation.png')
                print("Screenshot taken")
            except Exception as e:
                print(f"Error: {e}")
        else:
            print("Delete button not found")

        browser.close()

if __name__ == '__main__':
    run()
