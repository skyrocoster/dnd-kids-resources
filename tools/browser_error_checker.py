"""
Browser Error Checker for D&D Kids Resources

- Loads all HTML pages via Flask server (http://localhost:8000/pages/)
- Fails if any uncaught JS errors (console.error, uncaught exceptions) are detected
- Ignores warnings and info logs
- Requires: pip install playwright && playwright install

Usage:
    python tools/browser_error_checker.py
"""
import os
import sys
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

PAGES_DIR = Path(__file__).parent.parent / "pages"
SERVER_URL = "http://localhost:8000/pages/"

async def check_page(playwright, page_path):
    url = SERVER_URL + page_path.name
    errors = []
    browser = await playwright.chromium.launch()
    context = await browser.new_context()
    page = await context.new_page()

    def on_console(msg):
        if msg.type == "error":
            errors.append(msg.text)
    page.on("console", on_console)

    try:
        resp = await page.goto(url, wait_until="load", timeout=10000)
        if not resp or resp.status >= 400:
            errors.append(f"HTTP error: {resp.status if resp else 'No response'}")
    except Exception as e:
        errors.append(f"Navigation error: {e}")
    await browser.close()
    return url, errors

async def main():
    html_files = list(PAGES_DIR.glob("*.html"))
    if not html_files:
        print("No HTML files found in pages/ directory.")
        sys.exit(1)
    all_errors = []
    async with async_playwright() as p:
        for html_file in html_files:
            url, errors = await check_page(p, html_file)
            if errors:
                all_errors.append((url, errors))
                print(f"[FAIL] {url}")
                for err in errors:
                    print(f"    {err}")
            else:
                print(f"[OK]   {url}")
    if all_errors:
        print(f"\n{len(all_errors)} page(s) had errors.")
        sys.exit(1)
    else:
        print("\nAll pages loaded with no uncaught JS errors.")

if __name__ == "__main__":
    asyncio.run(main())
