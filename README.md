# Sol Oottam — Tamil Word Runner v0.9.0

Sol Oottam is a browser-based bilingual Tamil learning prototype for children aged 7–12. It combines a lane runner with ten curated words and three follow-on activities: guided tracing, sentence completion and read-aloud practice.

## Current implementation status

The code is organised as one official static-web build:

- `index.html` — accessible page structure and activity screens
- `styles.css` — responsive desktop, tablet and mobile styling
- `words.js` — validated ten-word Tamil content bank
- `app.js` — runner, learning activities, local progress, speech support and evaluation logging
- `sol-oottam-v0.9.0-standalone.html` — single-file demonstration build
- `tests/` — content validation and end-to-end smoke tests
- `docs/` — deployment, evaluation, content review and report-alignment guidance

Implemented features include:

- all ten words in the runner and all four levels;
- complete sentence data for every word;
- Tamil speech synthesis and optional browser speech recognition using `ta-IN`;
- a clearly labelled self-confirmation fallback when recognition is unavailable or unreliable;
- guided tracing assessed using path length, on-guide accuracy, coverage and spatial reach rather than pointer-count alone;
- anonymous local event logs and CSV/JSON export;
- local progress migration from earlier prototype storage keys;
- keyboard, touch, swipe and on-screen controls;
- responsive layout, focus indicators, reduced-motion support and semantic labels.

## Accuracy and privacy boundaries

- Guided tracing is **practice**, not a diagnostic or formal handwriting assessment.
- Browser speech checking is optional and should not be described as an OpenAI feature. No OpenAI API is used in this release.
- Sol Oottam does not save raw audio or recognised transcript text. It logs only anonymous task measures such as outcome, attempts, duration, replay count, confidence and similarity.
- The Tamil content bank is technically complete for software testing but still requires sign-off by a qualified Tamil educator before formal testing with children.

## Run locally

A local web server is recommended because microphone access and browser storage are more reliable on `localhost` than when opening the file directly.

```bash
cd Sol-Oottam-v0.9.0
python3 -m http.server 8000
```

Open `http://localhost:8000` in Chrome or Edge. Stop the server with `Ctrl+C`.

The standalone HTML file is convenient for a quick non-microphone demonstration, but use the local server or HTTPS deployment for speech testing.

## Run the tests

Content-bank test:

```bash
node tests/content_test.cjs
```

End-to-end browser smoke test:

```bash
python3 tests/smoke_test.py
```

The browser test requires Python Playwright and a Chromium-based browser. Installation commands are documented in `tests/README.md`.

## Recommended next milestone

Treat this package as **v0.9.0 / evaluation candidate**. Before calling it v1.0:

1. obtain Tamil-language content sign-off;
2. complete supervisor/ethics approval for participant testing;
3. run the manual device and microphone test matrix;
4. conduct a small adult/peer pilot before testing with children;
5. analyse exported data and update the final report with actual results rather than planned claims.
