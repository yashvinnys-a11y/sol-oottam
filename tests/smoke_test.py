#!/usr/bin/env python3
"""End-to-end smoke test for Sol Oottam v0.9.0.

Default mode assembles the local static files into an isolated in-memory page and
uses a memory-backed localStorage shim. Pass --url to test a served/deployed
copy instead. URL mode clears localStorage for that origin.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "test-results"
SCREENSHOTS = RESULTS / "screenshots"
RESULTS.mkdir(exist_ok=True)
SCREENSHOTS.mkdir(exist_ok=True)


def assert_true(value: Any, message: str) -> None:
    if not value:
        raise AssertionError(message)


def debug_url(url: str) -> str:
    parts = list(urlparse(url))
    query = dict(parse_qsl(parts[4], keep_blank_values=True))
    query["debug"] = "1"
    parts[4] = urlencode(query)
    return urlunparse(parts)


def build_inline_html() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    words = (ROOT / "words.js").read_text(encoding="utf-8")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    app = app.replace(
        "const debugEnabled = new URLSearchParams(window.location.search).has('debug');",
        "const debugEnabled = true;",
    )
    html = re.sub(r"<link[^>]+>", "", html)
    html = re.sub(r'<script[^>]+src="(?:words|app)\\.js"[^>]*></script>', "", html)
    local_storage_shim = r"""
<script>
(() => {
  const map = new Map();
  const storage = {
    getItem: key => map.has(String(key)) ? map.get(String(key)) : null,
    setItem: (key, value) => map.set(String(key), String(value)),
    removeItem: key => map.delete(String(key)),
    clear: () => map.clear(),
    key: index => Array.from(map.keys())[index] ?? null,
    get length() { return map.size; }
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
})();
</script>
"""
    html = html.replace("</head>", f"<style>{css}</style>{local_storage_shim}</head>")
    html = html.replace("</body>", f"<script>{words}</script><script>{app}</script></body>")
    return html


def prepare_page(page: Page, url: str | None, inline_html: str) -> None:
    if url:
        page.goto(debug_url(url), wait_until="domcontentloaded", timeout=60_000)
        page.evaluate("window.localStorage.clear()")
        page.reload(wait_until="domcontentloaded", timeout=60_000)
    else:
        page.set_content(inline_html, wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector("#hubScreen.active", timeout=30_000)
    page.wait_for_function(
        "window.__SOL_DEBUG__ && window.__SOL_DEBUG__.WORDS.length === 10",
        timeout=30_000,
    )
    # Accelerate only application timeouts. This leaves requestAnimationFrame and
    # the activity logic intact while keeping the test practical.
    page.evaluate(
        """
        (() => {
          const nativeTimeout = window.setTimeout.bind(window);
          window.setTimeout = (fn, delay, ...args) => nativeTimeout(fn, Math.min(Number(delay) || 0, 35), ...args);
        })();
        """
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="Optional served/deployed index URL. URL mode clears that origin's localStorage.")
    args = parser.parse_args()

    console_errors: list[str] = []
    page_errors: list[str] = []
    checks: list[dict[str, Any]] = []

    def check(name: str, condition: Any, detail: str = "") -> None:
        assert_true(condition, f"{name}: {detail or 'failed'}")
        checks.append({"check": name, "status": "PASS", "detail": detail})

    inline_html = build_inline_html()
    executable = next(
        (shutil.which(name) for name in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable") if shutil.which(name)),
        None,
    )

    with sync_playwright() as playwright:
        launch_args: dict[str, Any] = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
        if executable:
            launch_args["executable_path"] = executable
        browser = playwright.chromium.launch(**launch_args)
        context = browser.new_context(viewport={"width": 1280, "height": 900}, accept_downloads=True)
        page = context.new_page()
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        prepare_page(page, args.url, inline_html)
        validation_errors = page.evaluate("window.__SOL_DEBUG__.validateWordBank()")
        check("Content bank validates", validation_errors == [], str(validation_errors))
        check("Ten curated words load", page.evaluate("window.__SOL_DEBUG__.WORDS.length") == 10)
        check("Ten home word chips render", page.locator("#homeChips .word-chips span").count() == 10)
        check("Four level cards render", page.locator("#levelGrid .level-card").count() == 4)
        check("Content-review notice is visible", page.locator(".review-banner").is_visible())
        check("No fatal content overlay", not page.locator("#fatalOverlay").evaluate("el => el.classList.contains('active')"))
        page.screenshot(path=str(SCREENSHOTS / "home-desktop.png"), full_page=True)

        # Level 1: exercise the normal reveal/continue lifecycle for all ten words.
        page.evaluate("window.__SOL_DEBUG__.startLevel1()")
        page.wait_for_selector("#gameScreen.active")
        page.screenshot(path=str(SCREENSHOTS / "runner-desktop.png"), full_page=True)
        for _ in range(10):
            page.evaluate("window.__SOL_DEBUG__.completeRunnerWord()")
            page.wait_for_selector("#revealOverlay.active")
            page.evaluate("window.__SOL_DEBUG__.continueAfterReveal()")
        page.wait_for_selector("#levelWinOverlay.active")
        state = page.evaluate("window.__SOL_DEBUG__.getState()")
        check("Level 1 completes all words", state["progress"]["levelsComplete"][0] is True)
        check("Level 1 saves all ten words", len(state["progress"]["learned"]) == 10)
        page.locator("#levelWinOverlay .homeReturn").click()
        page.wait_for_selector("#hubScreen.active")

        # Level 2: validate every grapheme via the production check/advance path.
        total_letters = page.evaluate("window.__SOL_DEBUG__.WORDS.reduce((n,w)=>n+w.letters.length,0)")
        page.evaluate("window.__SOL_DEBUG__.startLevel2()")
        page.wait_for_selector("#traceScreen.active")
        page.screenshot(path=str(SCREENSHOTS / "guided-tracing.png"), full_page=True)
        for _ in range(total_letters):
            page.evaluate("window.__SOL_DEBUG__.forceValidTrace(); window.__SOL_DEBUG__.checkTrace();")
            page.wait_for_timeout(55)
        page.wait_for_selector("#levelWinOverlay.active")
        state = page.evaluate("window.__SOL_DEBUG__.getState()")
        check("Level 2 completes all graphemes", state["progress"]["levelsComplete"][1] is True, f"graphemes={total_letters}")
        check("Tracing records 30 accepted units", state["progress"]["tracedLetters"] == total_letters)
        page.locator("#levelWinOverlay .homeReturn").click()
        page.wait_for_selector("#hubScreen.active")

        # Level 3: answer every curated sentence using its target word.
        words = page.evaluate("window.__SOL_DEBUG__.WORDS.map(w => w.tamil)")
        page.evaluate("window.__SOL_DEBUG__.startLevel3()")
        page.wait_for_selector("#sentenceScreen.active")
        page.screenshot(path=str(SCREENSHOTS / "sentence-desktop.png"), full_page=True)
        for answer in words:
            page.evaluate("answer => window.__SOL_DEBUG__.answerSentenceByText(answer)", answer)
            page.wait_for_timeout(60)
        page.wait_for_selector("#levelWinOverlay.active")
        state = page.evaluate("window.__SOL_DEBUG__.getState()")
        check("Level 3 completes ten sentence items", state["progress"]["levelsComplete"][2] is True)
        page.locator("#levelWinOverlay .homeReturn").click()
        page.wait_for_selector("#hubScreen.active")

        # Level 4: exercise the honest self-confirmation fallback path.
        page.evaluate("window.__SOL_DEBUG__.startLevel4()")
        page.wait_for_selector("#readScreen.active")
        page.screenshot(path=str(SCREENSHOTS / "read-aloud-desktop.png"), full_page=True)
        for _ in words:
            page.evaluate("window.__SOL_DEBUG__.completeReadForTest()")
            page.wait_for_timeout(60)
        page.wait_for_selector("#levelWinOverlay.active")
        state = page.evaluate("window.__SOL_DEBUG__.getState()")
        check("Level 4 completes ten practice items", state["progress"]["levelsComplete"][3] is True)
        check("Manual practice is recorded honestly", state["progress"]["manualSpeechConfirmations"] == 10)
        page.locator("#nextLevelBtn").click()
        page.wait_for_selector("#resultsScreen.active")
        check("Results screen renders six summary values", page.locator("#resultsGrid .stat").count() == 6)
        page.screenshot(path=str(SCREENSHOTS / "results-desktop.png"), full_page=True)
        page.locator("#resultsScreen .homeReturn").click()
        page.wait_for_selector("#hubScreen.active")

        # Evaluation-data export and privacy checks.
        page.locator("#dataBtn").click()
        page.wait_for_selector("#dataScreen.active")
        page.locator("#participantCode").fill("PILOT-001")
        page.locator("#participantCode").press("Tab")
        with page.expect_download() as json_info:
            page.locator("#exportJsonBtn").click()
        json_path = RESULTS / "sample-evaluation-export.json"
        json_info.value.save_as(str(json_path))
        payload = json.loads(json_path.read_text(encoding="utf-8"))
        events = payload.get("events", [])
        check("JSON export contains events", len(events) > 0)
        check("JSON export keeps anonymous participant code", payload.get("participantCode") == "PILOT-001")
        check(
            "Exports contain no transcript/audio fields",
            all("transcript" not in event and "audio" not in event for event in events),
        )
        with page.expect_download() as csv_info:
            page.locator("#exportCsvBtn").click()
        csv_path = RESULTS / "sample-evaluation-export.csv"
        csv_info.value.save_as(str(csv_path))
        check("CSV export is non-empty", csv_path.stat().st_size > 100)

        # Mobile layout smoke check on an isolated page.
        mobile_errors: list[str] = []
        mobile_page = context.new_page()
        mobile_page.set_viewport_size({"width": 390, "height": 844})
        mobile_page.on("pageerror", lambda exc: mobile_errors.append(str(exc)))
        prepare_page(mobile_page, args.url, inline_html)
        overflow = mobile_page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check("Mobile hub has no material horizontal overflow", overflow <= 2, f"overflow={overflow}px")
        mobile_page.screenshot(path=str(SCREENSHOTS / "home-mobile.png"), full_page=True)
        mobile_page.evaluate("window.__SOL_DEBUG__.startLevel1()")
        mobile_page.wait_for_selector("#gameScreen.active")
        check("Mobile controls are visible", mobile_page.locator("#upBtn").is_visible() and mobile_page.locator("#downBtn").is_visible())
        mobile_page.screenshot(path=str(SCREENSHOTS / "runner-mobile.png"), full_page=True)
        check("Mobile page has no runtime errors", not mobile_errors, str(mobile_errors))
        mobile_page.close()

        check("No uncaught page errors", not page_errors, str(page_errors))
        check("No console errors", not console_errors, str(console_errors))
        browser.close()

    report = {
        "application": "Sol Oottam",
        "version": "0.9.0",
        "mode": f"url:{args.url}" if args.url else "isolated-inline",
        "checks": checks,
        "result": "PASS",
        "limitations": [
            "Speech recognition was not evaluated against a live microphone or external speech service.",
            "Automated checks do not replace qualified Tamil content review or physical-device testing.",
        ],
    }
    (RESULTS / "smoke-test-results.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
