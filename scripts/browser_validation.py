"""Owned, isolated browser evidence runner for the fixed weapon dialog case."""
from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import Error as PlaywrightError, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS_ROOT = ROOT / "artifacts"


def resolve_output(case_id: str, output_arg: str | None) -> Path:
    """Resolve one repository-local artifact folder and reject path escapes."""
    name = output_arg or f"browser-validation-{case_id}"
    candidate = Path(name)
    if candidate.is_absolute() or len(candidate.parts) != 1 or candidate.name in {"", ".", ".."}:
        raise ValueError("output must be a single folder name under repository artifacts/")
    resolved = (ARTIFACTS_ROOT / candidate.name).resolve()
    if resolved.parent != ARTIFACTS_ROOT.resolve():
        raise ValueError("output must stay under repository artifacts/")
    return resolved


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_for(url: str, process: subprocess.Popen[bytes], timeout: float = 30) -> None:
    import urllib.request

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"owned process exited while waiting for {url}")
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if 200 <= response.status < 500:
                    return
        except Exception:
            time.sleep(.2)
    raise TimeoutError(f"timed out waiting for {url}")


def _listener_exists(port: int) -> bool:
    if os.name != "nt":
        return False
    completed = subprocess.run(["netstat", "-ano", "-p", "tcp"], capture_output=True, text=True, check=False)
    return any(f":{port}" in line and "LISTENING" in line.upper() for line in completed.stdout.splitlines())


def descendants(processes: list[subprocess.Popen[bytes]], ports: list[int]) -> bool:
    cleanup_ok = True
    for process in reversed(processes):
        if process.poll() is None:
            if os.name == "nt":
                killed = subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True, check=False)
                cleanup_ok = cleanup_ok and killed.returncode == 0
            else:
                process.terminate()
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                cleanup_ok = False
                process.kill()
                process.wait(timeout=8)
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline and any(_listener_exists(port) for port in ports):
        time.sleep(.2)
    return cleanup_ok and not any(_listener_exists(port) for port in ports)


def run(case_id: str, scenario: str, output: Path) -> dict[str, Any]:
    if scenario != "weapon-edit-dialog":
        return {"status": "INFRA_FAIL", "case_id": case_id, "error": "unsupported scenario"}
    output.mkdir(parents=True, exist_ok=True)
    lock = output / f"{case_id}.lock"
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
    except FileExistsError:
        return {"status": "INFRA_FAIL", "case_id": case_id, "error": "duplicate case"}
    processes: list[subprocess.Popen[bytes]] = []
    owned_ports: list[int] = []
    profile = Path(tempfile.mkdtemp(prefix=f"browser-validation-{case_id}-"))
    result: dict[str, Any] = {"status": "INFRA_FAIL", "case_id": case_id, "scenario": scenario,
                              "evidence": [], "console": [], "failed_network": [], "print_intercepted": False}
    try:
        backend_port, frontend_port = free_port(), free_port()
        owned_ports = [backend_port, frontend_port]
        backend = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", str(backend_port)], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        processes.append(backend)
        env = os.environ.copy(); env["VITE_API_PROXY_TARGET"] = f"http://127.0.0.1:{backend_port}"
        frontend = subprocess.Popen(["npm.cmd", "run", "dev", "--", "--host", "127.0.0.1", "--port", str(frontend_port)], cwd=ROOT / "frontend", env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        processes.append(frontend)
        wait_for(f"http://127.0.0.1:{backend_port}/openapi.json", backend)
        wait_for(f"http://127.0.0.1:{frontend_port}/", frontend)
        with sync_playwright() as playwright:
            context = playwright.chromium.launch_persistent_context(str(profile), headless=True)
            page = context.pages[0]
            page.on("console", lambda message: result["console"].append({"type": message.type, "text": message.text}))
            page.on("requestfailed", lambda request: result["failed_network"].append({"url": request.url, "failure": request.failure}))
            page.add_init_script("window.__browserValidationPrint = false; window.print = () => { window.__browserValidationPrint = true; };")
            page.goto(f"http://127.0.0.1:{frontend_port}/weapons", wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle")
            page.get_by_role("button", name="Edit").first.click()
            dialog = page.get_by_role("dialog")
            dialog.wait_for()
            if not dialog.get_by_text("Edit Weapon:").is_visible():
                raise AssertionError("Edit Weapon dialog was not shown")
            # Reach the print path while the verified dialog is present. Print CSS may
            # intentionally hide the dialog, so retain its accessibility snapshot before
            # switching media rather than waiting on a print-hidden locator.
            dialog_aria = dialog.aria_snapshot()
            page.evaluate("window.print()")
            for label, media in (("desktop", None), ("narrow", "screen and (max-width: 640px)"), ("print", "print")):
                if media:
                    page.emulate_media(media="print" if media == "print" else "screen")
                    if media != "print":
                        page.set_viewport_size({"width": 390, "height": 844})
                path = output / f"{label}.png"; page.screenshot(path=str(path), full_page=True)
                (output / f"{label}.json").write_text(json.dumps({"url": page.url, "title": page.title(), "aria": dialog_aria}), encoding="utf-8")
                result["evidence"].append(label)
            result["print_intercepted"] = bool(page.evaluate("window.__browserValidationPrint"))
            context.close()
        result["status"] = "PASS"
    except AssertionError as exc:
        result.update(status="PRODUCT_FAIL", error=str(exc))
    except (Exception) as exc:
        result.update(status="INFRA_FAIL", error=str(exc))
    finally:
        if not descendants(processes, owned_ports):
            result.update(status="INFRA_FAIL", error="owned process-tree cleanup failed")
        import shutil
        shutil.rmtree(profile, ignore_errors=True)
        lock.unlink(missing_ok=True)
    (output / "result.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", required=True); parser.add_argument("--scenario", required=True); parser.add_argument("--output")
    args = parser.parse_args()
    try:
        output = resolve_output(args.case, args.output)
    except ValueError as exc:
        print(json.dumps({"status": "INFRA_FAIL", "case_id": args.case, "error": str(exc)}))
        return 1
    result = run(args.case, args.scenario, output)
    print(json.dumps(result)); return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
