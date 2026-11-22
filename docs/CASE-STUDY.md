# DocShelf: engineering case study

## Problem and approach

Knowledge workers often hold useful information across separate files. DocShelf explores a local-first workflow for gathering documents, finding passages semantically and generating answers with links back to sources. The prototype is designed around a free local stack and the memory constraints of an 8 GB Apple Silicon laptop.

## Architecture and decisions

React and Vite provide the workspace interface. An Express API authenticates users, checks ownership and persists metadata in MongoDB. Uploads are processed by a separate BullMQ worker through Redis; the worker extracts text with page numbers, chunks it and calls Ollama for embeddings. The API ranks owner-scoped chunks and streams context-grounded answers from Qwen. Redis-backed leases coordinate generation and embedding concurrency across processes, although the two pools can overlap.

MongoDB was chosen to match the direct project request. Local cosine search keeps the first version understandable and inexpensive, but its 5,000-chunk scan cap is a real scaling limitation. The design calls for indexed vector storage and shared object storage before multi-host deployment. The API is designed for multiple instances, but replicating it cannot make one local model faster.

## Evidence

The repository includes unit tests, an isolated API/worker integration test, a small synthetic retrieval evaluation and a proxy smoke test. The real Qwen and all-MiniLM models passed a small end-to-end test including a PDF page citation. The retrieval fixture is intentionally tiny and does not establish real-world accuracy. A Node demonstration proxy distributed a small set of requests between two API processes and continued after one stopped; the actual Docker/Nginx setup was not verified in this environment. See PROGRESS.md for exact results and limitations.

## Tradeoffs and next steps

The application remains a prototype: broaden document and retrieval evaluation; harden quota accounting, file isolation and multi-tab sessions; introduce indexed retrieval and shared storage; verify Docker, observability and load balancing; and complete accessibility and security review. Generated answers and study materials need source review. The specific Qwen 2.5 3B Instruct distribution uses the Qwen Research License and should be reviewed before redistribution or deployment.
