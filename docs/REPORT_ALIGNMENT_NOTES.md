# Report Alignment Notes for v0.9.0

Use these statements consistently in the interim/final report, presentation, poster and demonstration.

## Accurate implementation description

> Sol Oottam v0.9.0 is a tablet-friendly static web prototype implemented with HTML5, CSS3, JavaScript and the Canvas API. Its four sequential levels are: a three-lane Tamil grapheme runner, guided tracing practice, curated sentence completion, and read-aloud practice. Progress and anonymous evaluation events are stored locally in the browser and can be exported as CSV or JSON.

## Speech wording

Use:

> Read-aloud practice optionally uses the browser Web Speech API configured for Tamil (`ta-IN`). The prototype compares the recognised phrase with curated expected variants and allows retries. Because support and accuracy vary by browser and device, a clearly labelled self-confirmation fallback is provided. Sol Oottam does not store raw audio or recognised transcript text.

Do not claim that pressing a button proves correct pronunciation. Do not call the browser feature an OpenAI service.

## Writing/tracing wording

Use:

> Level 2 provides guided handwriting practice. The prototype checks path length, proximity to the rendered guide, guide coverage and spatial reach. It does not diagnose handwriting quality or assess free-form Tamil writing.

Do not describe this release as typed-writing assessment or formal handwriting evaluation.

## AI wording

Use:

> OpenAI is not integrated into the v0.9.0 client application. The item bank and feedback are curated and static. Any future generative-AI extension would require a server-side service, validated structured outputs, an approved content boundary and a static fallback; API keys must never be placed in browser JavaScript.

Literature about responsible AI may remain in the review, but clearly separate literature/future work from implemented functionality.

## Architecture and flow

Use:

> The browser implementation replaced the earlier Unity plan. The runner itself contains Tamil letter collection. The other activities are separate sequential levels rather than checkpoints interrupting the runner.

## Evaluation status

Use past tense only for tests that were actually completed. At v0.9.0:

- source validation and automated end-to-end smoke testing are complete;
- physical-device, live microphone and participant testing remain to be completed;
- Tamil educator content approval remains pending.

Do not report planned participants, learning gains, usability scores or speech-recognition rates as results before collecting them.
