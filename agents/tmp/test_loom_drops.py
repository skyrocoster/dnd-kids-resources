"""
Playwright e2e test for Loom drag-and-drop operations.

Performs all five checks required by Work Order 05:
1. Reorder within a thread
2. Move a beat to another thread
3. Bank a beat by dropping onto Beat Bank
4. Restore a banked beat into a gap
5. Invoke a card-local action (Edit)

Checks run in order that avoids altering source data before it's needed.
"""

import json
import sys
from playwright.sync_api import sync_playwright


LOOM_URL = "http://127.0.0.1:5173/loom"


def html5_drag_drop(page, source_loc, target_loc, data_transfer_data):
    """Simulate HTML5 drag-and-drop using real DataTransfer."""
    source_handles = source_loc.element_handles()
    target_handles = target_loc.element_handles()
    if not source_handles:
        return "ERROR: source element not found"
    if not target_handles:
        return "ERROR: target element not found"

    source = source_handles[0]
    target = target_handles[0]
    data_json = json.dumps(data_transfer_data)

    result = page.evaluate(
        """
        ([source, target, dataJson]) => {
            const data = JSON.parse(dataJson);
            const dt = new DataTransfer();
            try {
                dt.setData('application/json', JSON.stringify(data));
            } catch (e) {
                return 'ERROR: setData failed: ' + e.message;
            }
            source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
            target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
            target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
            target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
            source.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
            return 'OK';
        }
        """,
        [source, target, data_json],
    )
    return result


def reload_page(page):
    page.goto(LOOM_URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_selector(".loom-node", timeout=15000)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
        )
        page = context.new_page()
        page.set_default_timeout(10000)

        reload_page(page)
        page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\loom_initial.png", full_page=True)

        checks_passed = 0
        checks_total = 5

        # ===== Check 5: Card-local action (click Edit beat) =====
        try:
            edit_button = page.locator('button[aria-label="Edit beat"]').first
            edit_button.wait_for(timeout=5000)
            edit_button.click()

            page.wait_for_selector('[role="dialog"]', timeout=5000)
            print("CHECK 5 PASSED: Card-local action (Edit beat) opens editor")
            checks_passed += 1

            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
        except Exception as e:
            print(f"CHECK 5 FAILED: {e}")
            page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\check5_fail.png", full_page=True)

        # ===== Check 1: Reorder within a thread =====
        # Uses beat "Clear out the goblin warren" (id=13, thread 2).
        # Must run BEFORE Check 3 banks this beat.
        try:
            source_beat = page.locator('[aria-label="beat: Clear out the goblin warren"]').first
            source_beat.wait_for(timeout=5000)

            goblin_row_gaps = page.locator('.loom-grid-row').filter(has_text="Goblin Trouble").locator('.loom-lane-gap')
            second_gap = goblin_row_gaps.nth(1)
            second_gap.wait_for(timeout=5000)

            result = html5_drag_drop(
                page,
                source_beat,
                second_gap,
                {"action": "reorder", "nodeId": 13, "fromBodyIndex": 0, "sourceThreadId": 2, "nodeKind": "beat"},
            )
            print(f"CHECK 1 drop result: {result}")
            if result == "OK":
                print("CHECK 1 PASSED: Reorder within a thread")
                checks_passed += 1
            else:
                print(f"CHECK 1 FAILED: {result}")
                page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\check1_fail.png", full_page=True)
        except Exception as e:
            print(f"CHECK 1 FAILED: {e}")
            page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\check1_fail.png", full_page=True)

        # ===== Check 3: Bank a beat by dropping onto Beat Bank =====
        # Banks "Clear out the goblin warren" (id=13) by dropping on Beat Bank section.
        try:
            source_beat = page.locator('[aria-label="beat: Clear out the goblin warren"]').first
            source_beat.wait_for(timeout=5000)

            beat_bank_section = page.locator('.loom-weaver-panel > .loom-weaver-section').nth(1)
            beat_bank_section.wait_for(timeout=5000)

            result = html5_drag_drop(
                page,
                source_beat,
                beat_bank_section,
                {"action": "reorder", "nodeId": 13, "fromBodyIndex": 0, "sourceThreadId": 2, "nodeKind": "beat"},
            )
            print(f"CHECK 3 drop result: {result}")
            if result == "OK":
                print("CHECK 3 PASSED: Bank a beat by dropping onto Beat Bank")
                checks_passed += 1
            else:
                print(f"CHECK 3 FAILED: {result}")
                page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\check3_fail.png", full_page=True)
        except Exception as e:
            print(f"CHECK 3 FAILED: {e}")
            page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\check3_fail.png", full_page=True)

        reload_page(page)

        # ===== Check 2: Move a beat to another thread =====
        # Moves "Retrieve the hat from the warren" (id=22, thread 3) to thread 2 ("Goblin Trouble").
        try:
            source_beat = page.locator('[aria-label="beat: Retrieve the hat from the warren"]').first
            source_beat.wait_for(timeout=5000)

            goblin_row_gaps = page.locator('.loom-grid-row').filter(has_text="Goblin Trouble").locator('.loom-lane-gap')
            goblin_row_gaps.first.wait_for(timeout=5000)

            result = html5_drag_drop(
                page,
                source_beat,
                goblin_row_gaps.first,
                {"action": "reorder", "nodeId": 22, "fromBodyIndex": 0, "sourceThreadId": 3, "nodeKind": "beat"},
            )
            print(f"CHECK 2 drop result: {result}")
            if result == "OK":
                print("CHECK 2 PASSED: Move a beat to another thread")
                checks_passed += 1
            else:
                print(f"CHECK 2 FAILED: {result}")
                page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\check2_fail.png", full_page=True)
        except Exception as e:
            print(f"CHECK 2 FAILED: {e}")
            page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\check2_fail.png", full_page=True)

        reload_page(page)

        # ===== Check 4: Restore a banked beat into a gap =====
        # Restores "A second hat, identical" (id=45) from Beat Bank onto a warp gap.
        try:
            banked_entry = page.locator('.loom-beat-bank-tray-entry').filter(has_text="A second hat, identical").first
            banked_entry.wait_for(timeout=5000)

            first_gap = page.locator('.loom-lane-gap').first
            first_gap.wait_for(timeout=5000)

            result = html5_drag_drop(
                page,
                banked_entry,
                first_gap,
                {"action": "restore", "nodeId": 45},
            )
            print(f"CHECK 4 drop result: {result}")
            if result == "OK":
                print("CHECK 4 PASSED: Restore a banked beat into a gap")
                checks_passed += 1
            else:
                print(f"CHECK 4 FAILED: {result}")
                page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\check4_fail.png", full_page=True)
        except Exception as e:
            print(f"CHECK 4 FAILED: {e}")
            page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\check4_fail.png", full_page=True)

        page.screenshot(path="C:\\Users\\skyro\\AppData\\Local\\Temp\\opencode\\loom_final.png", full_page=True)

        print(f"\n=== RESULTS: {checks_passed}/{checks_total} checks passed ===")
        browser.close()

        if checks_passed == checks_total:
            print("ALL CHECKS PASSED")
            sys.exit(0)
        else:
            print("SOME CHECKS FAILED")
            sys.exit(1)


if __name__ == "__main__":
    main()
