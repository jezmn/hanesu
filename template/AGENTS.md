<!-- hanesu:start -->
## Hanesu

Canonical workspace: `.hanesu/`.

Start as orchestrator:
1. Read `.hanesu/workflow.md`.
2. Read `.hanesu/progress/current.json` — resume interrupted work if active.
3. Read `.hanesu/feature.json` — first task with `"status": "pending"` in list order.
4. Select pipeline by type from workflow.md.
5. Write `.hanesu/progress/current.json` with { id, type, phase: "search", status: "running", attempt: 1, gate: { type: "none", reason: "none" } }.
6. Run [context-scout] first for the `search` phase.
7. Load only the needed role from `.hanesu/roles/`.
8. **Before any source edit:** confirm the git working tree is clean; if dirty, set a human gate before continuing.
9. **After source edits:** run diff review before verify — assess risk, if >2 files or critical paths, set gate=human.
10. **Verify includes smoke test** — not just unit tests.
11. Stop when `gate.type` is not `none`.
12. After human approval, clear the gate and resume from the current phase's next step.
<!-- hanesu:end -->