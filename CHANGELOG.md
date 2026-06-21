# Changelog

## v0.9.0 — evaluation candidate

### Project structure
- Consolidated duplicated prototype files into one official static-web build.
- Split the application into `index.html`, `styles.css`, `words.js` and `app.js`.
- Added a standalone single-file demonstration build.
- Added Git exclusions for private participant exports and local tooling files.

### Content and reliability
- Completed the ten-word content bank with IDs, grapheme units, meanings, examples, bilingual sentence prompts, accepted speech variants, curated distractors, feedback and difficulty metadata.
- Added startup validation for missing fields, duplicate IDs, broken grapheme joins, invalid sentence placeholders and unknown distractors.
- Corrected the grapheme sequence for `விளையாடு` to `வி + ளை + யா + டு`.
- Added clear content-review status: qualified Tamil educator sign-off remains required.

### Learning activities
- Level 1 now covers all ten words and supports pause, keyboard, touch and swipe controls.
- Level 2 now evaluates guided tracing using movement, guide proximity, guide coverage and spatial reach; scribbling or a simple pointer-count no longer automatically passes.
- Level 3 uses complete curated sentence data and item-specific hints for all ten words.
- Level 4 uses optional browser Tamil speech recognition with similarity checking, retries and an honest self-confirmation fallback.

### Data, privacy and evaluation
- Added versioned local progress storage and migration from legacy keys.
- Added anonymous event logging for task type, item, outcome, attempt, duration, replays, trace measures, confidence/similarity and device summary.
- Added participant-code generation and CSV/JSON export.
- Added explicit rules preventing transcript or raw-audio persistence.

### Accessibility and quality
- Added semantic landmarks, accessible labels, live status regions, keyboard focus styling, reduced-motion support and responsive mobile layouts.
- Added content validation and end-to-end automated tests.
- Added deployment, manual testing, ethics, content-review and report-alignment documents.
