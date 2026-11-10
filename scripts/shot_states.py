"""Capture empty + verdict + replay states in one browser session."""
from playwright.sync_api import sync_playwright
import sys, time

URL = "http://127.0.0.1:3000/"
OUT = "/tmp/render"

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    page = ctx.new_page()
    page.goto(URL, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2200)
    page.screenshot(path=f"{OUT}/01_empty.png", full_page=False)

    # Click the first sample file in the sidebar to open a verdict
    # The sample buttons live in the empty-state "Or scan a sample" card
    clicked = False
    for sel in ["text=resnet50-malicious.pkl", "text=mnist-clean.safetensors"]:
        try:
            page.get_by_text(sel.split("=")[1], exact=True).first.click(timeout=4000)
            clicked = True
            print(f"clicked sample: {sel}")
            break
        except Exception as e:
            print(f"miss {sel}: {e}")
    if not clicked:
        # fallback: click any listitem in the sidebar file list
        try:
            page.locator('[role="listitem"]').first.click(timeout=4000)
            clicked = True
            print("clicked first sidebar listitem")
        except Exception as e:
            print(f"listitem miss: {e}")

    page.wait_for_timeout(2500)
    page.screenshot(path=f"{OUT}/02_verdict.png", full_page=False)

    # full-page verdict for completeness
    page.screenshot(path=f"{OUT}/03_verdict_full.png", full_page=True)

    # Try to click the "Replay scan" button
    try:
        page.get_by_role("button", name="Replay scan").click(timeout=5000)
        print("clicked Replay scan")
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT}/04_replay_mid.png", full_page=False)
        page.wait_for_timeout(2500)
        page.screenshot(path=f"{OUT}/05_replay_stamp.png", full_page=False)
    except Exception as e:
        print(f"replay miss: {e}")

    print("OK all states captured")
    browser.close()
