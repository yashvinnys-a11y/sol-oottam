# Functional and Device Test Plan

## Automated baseline

The included tests cover source validation and an accelerated end-to-end path through all ten words and all four levels. Automated results are written to `test-results/smoke-test-results.json`.

## Manual release checklist

Record the build, browser, device, result and evidence for every test. Do not mark a test as passed unless it was observed on the stated device.

| ID | Area | Procedure | Expected result |
|---|---|---|---|
| F01 | Startup | Serve the project over `localhost` and open `index.html`. | Hub loads with four level cards, ten words and no fatal error. |
| F02 | Level locking | Start with cleared storage. | Only Level 1 is unlocked; later levels unlock sequentially. |
| F03 | Runner controls | Test Arrow Up/Down, W/S, on-screen arrows and swipe. | Player changes one lane per valid input without leaving the three lanes. |
| F04 | Runner content | Complete Level 1. | All ten words are revealed in order and saved to the passport. |
| F05 | Runner penalties | Collide with a wrong letter and obstacle. | Score/lives change according to the interface and no duplicate collision is recorded. |
| F06 | Pause/resume | Pause during Level 1, then resume. | Game motion stops and restarts without resetting progress. |
| F07 | Tracing reject | Make a short mark or scribble away from the guide. | Check is rejected with targeted feedback; no life is lost for a retry. |
| F08 | Tracing accept | Follow the visible guide across enough of the character. | On-guide/coverage measures update and the item advances. |
| F09 | Tracing completion | Complete every grapheme. | All 30 grapheme activities finish and Level 3 unlocks. |
| F10 | Sentence correct | Choose the target word for each item. | Correct word fills the blank, feedback appears and all ten items complete. |
| F11 | Sentence incorrect | Select an incorrect distractor. | One life is lost, a hint appears and retry remains possible. |
| F12 | Speech synthesis | Press Listen on word reveal, sentence and read-aloud screens. | Tamil audio plays where the browser/device provides a Tamil voice; the UI remains usable if no voice is available. |
| F13 | Speech recognition | On a supported HTTPS/localhost browser, allow microphone access and read the sentence. | Tamil recognition starts, similarity is evaluated and uncertain results allow retries. |
| F14 | Speech fallback | Deny microphone permission or use an unsupported browser. | Clearly labelled self-confirmation becomes available after listening; it is recorded as self-confirmed, not recognised. |
| F15 | Privacy | Complete speech practice and inspect exported JSON/CSV. | No raw audio or recognised transcript field is present. |
| F16 | Export | Enter an anonymous code and export CSV and JSON. | Both files download and contain events, version and anonymous participant code. |
| F17 | Reset | Export data, then reset progress and clear evaluation data. | Confirmations appear and only the selected local data is removed. |
| F18 | Persistence | Close and reopen the browser at the same origin. | Progress remains until reset or site data is cleared. |
| F19 | Mobile layout | Test at approximately 390×844 and rotate orientation. | No material horizontal overflow; controls remain reachable. |
| F20 | Accessibility | Navigate with Tab/Shift+Tab and activate controls with keyboard. | Focus is visible, order is logical and status changes are announced where supported. |

## Required device/browser matrix

At minimum, record results for:

- desktop Chrome;
- desktop Edge or another Chromium browser;
- one physical Android tablet/phone;
- one additional mobile/tablet browser available to the project team.

Speech recognition must be recorded separately because browser support and service availability vary. A failure of optional speech recognition is not a failure of the whole application when the self-confirmation fallback works and is labelled honestly.
