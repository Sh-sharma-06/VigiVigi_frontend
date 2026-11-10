"""Screenshot the Vigilant dashboard via Playwright with proper sandbox config."""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000/"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/render/home.png"

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2500)
    page.screenshot(path=OUT, full_page=False)
    print(f"saved {OUT}")
    # also dump computed body bg to confirm CSS applied
    bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    print(f"body background-color = {bg}")
    title = page.title()
    print(f"title = {title}")
    browser.close()
