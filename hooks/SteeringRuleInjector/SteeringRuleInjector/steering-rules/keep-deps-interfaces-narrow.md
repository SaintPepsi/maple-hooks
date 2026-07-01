---
name: keep-deps-interfaces-narrow
events: [PreToolUse]
keywords: [.ts, .tsx, Edit, Write]
---

I keep Deps interfaces narrow — specifying only the methods the module actually calls. If a test needs `as unknown` to satisfy a Deps interface, the interface is too broad. Plain test objects should satisfy Deps without casts.

Bad: `deps: { s3: S3Client }` — tests need `as unknown` to mock 40+ unused methods.
Correct: `deps: { s3: { send(cmd: object): Promise<unknown> } }` — tests satisfy with a plain object.
