# Five-minute demo

Use the local app and the fictional [Orion brief](../examples/orion-project-brief.md). Start MongoDB, Redis, Ollama, the API, worker and web app as described in the README. The Qwen 2.5 3B Instruct model has a Qwen Research License; review it before deployment or redistribution.

1. Open the app, create a local account, and enter the workspace. Explain that account data and files stay in the configured local services.
2. Upload the Orion brief. Point out the queued/processing/ready status. Wait for ready; if the model is unavailable, check Ollama and retry.
3. Open Search and ask “Who owns the Orion release?” Open a matching passage.
4. In AI workspace ask “Who owns the release, and what must happen before launch?” Follow a citation. Ask a question not answered by the brief and inspect whether the answer correctly acknowledges missing evidence.
5. In Study, select the brief and generate a summary and flashcards. Explain that these features use at most the first five extracted passages, so they may omit later content. Check generated material against the source.
6. Open Activity to show saved conversations and counts. Delete the sample document when finished.

The model may take time to load and can make errors. This walkthrough is a demonstration, not a benchmark or proof of production readiness.
