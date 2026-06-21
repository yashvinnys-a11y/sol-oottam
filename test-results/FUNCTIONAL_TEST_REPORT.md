# Automated Functional Test Report

- Application: **Sol Oottam**
- Version: **0.9.0**
- Test mode: **isolated-inline**
- Overall result: **PASS**

## Checks

| # | Check | Result | Detail |
|---:|---|---|---|
| 1 | Content bank validates | PASS | [] |
| 2 | Ten curated words load | PASS | — |
| 3 | Ten home word chips render | PASS | — |
| 4 | Four level cards render | PASS | — |
| 5 | Content-review notice is visible | PASS | — |
| 6 | No fatal content overlay | PASS | — |
| 7 | Level 1 completes all words | PASS | — |
| 8 | Level 1 saves all ten words | PASS | — |
| 9 | Level 2 completes all graphemes | PASS | graphemes=30 |
| 10 | Tracing records 30 accepted units | PASS | — |
| 11 | Level 3 completes ten sentence items | PASS | — |
| 12 | Level 4 completes ten practice items | PASS | — |
| 13 | Manual practice is recorded honestly | PASS | — |
| 14 | Results screen renders six summary values | PASS | — |
| 15 | JSON export contains events | PASS | — |
| 16 | JSON export keeps anonymous participant code | PASS | — |
| 17 | Exports contain no transcript/audio fields | PASS | — |
| 18 | CSV export is non-empty | PASS | — |
| 19 | Mobile hub has no material horizontal overflow | PASS | overflow=0px |
| 20 | Mobile controls are visible | PASS | — |
| 21 | Mobile page has no runtime errors | PASS | [] |
| 22 | No uncaught page errors | PASS | [] |
| 23 | No console errors | PASS | [] |

## Interpretation

The automated suite validated the ten-item content bank, completed all four levels through the production activity paths, confirmed local progress/event recording, exported synthetic CSV/JSON evaluation files, checked for forbidden transcript/audio fields, and ran a mobile-layout smoke check. No uncaught browser or console errors were observed.

## Limitations

- Speech recognition was not evaluated against a live microphone or external speech service.
- Automated checks do not replace qualified Tamil content review or physical-device testing.
- The tracing path was supplied through a test hook that satisfies the same production acceptance rules; it does not replace human tracing trials on a physical touchscreen.
- Export files in this folder contain synthetic test events only and must not be treated as participant results.
