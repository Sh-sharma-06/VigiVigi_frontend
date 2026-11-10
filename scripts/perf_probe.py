"""Measure real FPS in key states + verify sidebar list scrolls with a scrollbar."""
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3000/"
FPS_JS = """() => new Promise(res => {
    let frames = 0; const t0 = performance.now();
    function tick(){ frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(frames / ((performance.now() - t0) / 1000)); }
    requestAnimationFrame(tick);
})"""

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])

    # --- short viewport: force the sidebar list to overflow ---
    page = browser.new_context(viewport={"width": 1440, "height": 700}).new_page()
    page.goto(URL, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    info = page.evaluate("""() => {
        const el = document.querySelector('[role="list"]');
        return { sh: el.scrollHeight, ch: el.clientHeight, canScroll: el.scrollHeight > el.clientHeight };
    }""")
    print(f"sidebar list: scrollHeight={info['sh']} clientHeight={info['ch']} scrollable={info['canScroll']}")
    page.locator('[role="listitem"]').first.click(timeout=6000)
    page.wait_for_timeout(1800)
    page.evaluate("""() => { const el = document.querySelector('[role="list"]'); el.scrollTop = el.scrollHeight; }""")
    page.wait_for_timeout(400)
    st = page.evaluate("""() => document.querySelector('[role="list"]').scrollTop""")
    print(f"after scrollTo bottom, scrollTop={st} (should be > 0)")
    page.screenshot(path="/tmp/render/06_scrolled_short.png")
    print(f"FPS @700h verdict+scrolled: {page.evaluate(FPS_JS):.1f}")
    page.close()

    # --- standard viewport: visuals + idle FPS ---
    page = browser.new_context(viewport={"width": 1440, "height": 900}).new_page()
    page.goto(URL, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1800)
    print(f"FPS idle (home): {page.evaluate(FPS_JS):.1f}")
    page.screenshot(path="/tmp/render/01_empty.png")
    page.locator('[role="listitem"]').first.click(timeout=6000)
    page.wait_for_timeout(2200)
    print(f"FPS verdict view: {page.evaluate(FPS_JS):.1f}")
    page.screenshot(path="/tmp/render/02_verdict.png")
    try:
        page.get_by_role("button", name="Replay scan").click(timeout=5000)
        page.wait_for_timeout(1200)
        print(f"FPS during replay FX: {page.evaluate(FPS_JS):.1f}")
        page.wait_for_timeout(1800)
        page.screenshot(path="/tmp/render/05_replay_stamp.png")
    except Exception as e:
        print("replay miss:", e)
    browser.close()
    print("OK probe complete")
