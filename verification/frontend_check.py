
from playwright.sync_api import sync_playwright, expect

def verify_app_loads(page):
    # Navigate to the local server
    page.goto("http://localhost:8000/index.html")

    # Wait for the app to initialize (loading overlay to disappear)
    page.wait_for_selector("#loading", state="hidden", timeout=10000)

    # Check if the title is correct (sanity check)
    expect(page).to_have_title("e-Bridge - eSports Performance Bridge")

    # Check if the dashboard is visible
    page.wait_for_selector("#dashboard", state="visible")

    # Take a screenshot of the dashboard
    page.screenshot(path="verification/dashboard_check.png")
    print("Dashboard screenshot taken.")

    # Check console for errors (optional but good practice)
    # Note: We can't easily assert on console logs in sync mode without event listeners,
    # but if the page loaded and dashboard is visible, it's a good sign.

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console errors
        page.on("console", lambda msg: print(f"CONSOLE {msg.type}: {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        try:
            verify_app_loads(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            # Take a screenshot on failure too
            page.screenshot(path="verification/failure.png")
        finally:
            browser.close()
