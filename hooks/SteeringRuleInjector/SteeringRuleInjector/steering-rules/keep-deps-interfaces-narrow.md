---
name: keep-deps-interfaces-narrow
events: [SessionStart]
keywords: []
---

When declaring a Deps interface for dependency injection, specify only the methods and properties the module actually calls. Never use full SDK types (S3Client, typeof fetch). If a test needs `as unknown` to satisfy a Deps interface, the interface is too broad. Narrow it so plain test objects satisfy Deps without casts.
Bad: `deps: { s3: S3Client }` — tests need `as unknown` cast to mock 40+ unused methods.
Correct: `deps: { s3: { send(cmd: object): Promise<unknown> } }` — tests satisfy with a plain object.
