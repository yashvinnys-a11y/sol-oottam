# Test Instructions

## 1. Content validation

Requires Node.js:

```bash
node tests/content_test.cjs
```

## 2. End-to-end smoke test

Requires Python 3, Playwright and Chromium.

```bash
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/smoke_test.py
```

By default the script builds an in-memory page from the local HTML/CSS/JS files. This avoids modifying your browser data and does not test a real network origin.

To test a locally served or deployed copy instead:

```bash
python3 tests/smoke_test.py --url http://localhost:8000/index.html
```

The URL mode clears the test origin's local storage. Use a dedicated testing browser/profile and do not point it at a production origin containing participant data.

Automated testing does not replace physical-device, live microphone, Tamil-content or participant testing.
