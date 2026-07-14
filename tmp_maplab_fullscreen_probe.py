from pathlib import Path

from playwright.sync_api import sync_playwright


OUT_DIR = Path("F:/TMP/maplab-fullscreen-probe")
OUT_DIR.mkdir(parents=True, exist_ok=True)
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=CHROME_PATH)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        messages: list[str] = []
        page.on("console", lambda msg: messages.append(f"{msg.type}: {msg.text}"))

        page.goto("http://127.0.0.1:5173/dungeons/map-lab/edit", wait_until="networkidle")

        page.screenshot(path=str(OUT_DIR / "before.png"), full_page=True)
        page.get_by_role("button", name="Enter fullscreen map editor").click()
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT_DIR / "after.png"), full_page=True)

        wrapper = page.locator(".maplab-canvas-wrapper")
        viewport = page.locator(".maplab-canvas-viewport")
        state = {
            "wrapper_outer_html": wrapper.evaluate("node => node.outerHTML"),
            "wrapper_data_fullscreen": wrapper.get_attribute("data-fullscreen"),
            "viewport_client_height": viewport.evaluate("node => node.clientHeight"),
            "viewport_scroll_height": viewport.evaluate("node => node.scrollHeight"),
            "wrapper_style": wrapper.evaluate(
                """node => {
                    const style = getComputedStyle(node);
                    return {
                        position: style.position,
                        inset: style.inset,
                        zIndex: style.zIndex,
                        padding: style.padding,
                        width: style.width,
                        height: style.height,
                    };
                }"""
            ),
            "viewport_style": viewport.evaluate(
                """node => {
                    const style = getComputedStyle(node);
                    return {
                        height: style.height,
                        overflow: style.overflow,
                        touchAction: style.touchAction,
                    };
                }"""
            ),
            "console": messages,
        }

        (OUT_DIR / "state.txt").write_text(str(state), encoding="utf-8")
        browser.close()


if __name__ == "__main__":
    main()
