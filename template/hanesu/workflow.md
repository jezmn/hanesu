# Hanesu Workflow

One task at a time. Pipeline selected by type in `feature.json`.
State on disk via `progress/current.json`. Roles run as sub-agents when supported, sequentially otherwise.
This file is the canonical pipeline map: every phase lists its owning role explicitly.

## Pipeline Reference

### feature

Full SDD. Mutation is optional after judge or verify as a report-only hook.

1. search - owner: context-scout
2. spec - owner: spec-partner
3. gherkin - owner: gherkin-author - gate: human approval before tdd
4. tdd - owner: craftsman
5. judge - owner: judge
6. verify - owner: orchestrator

### bugfix

Diagnose before patch. Human gate is risk-based.

1. search - owner: context-scout
2. diagnose - owner: craftsman
3. patch - owner: craftsman
4. verify - owner: orchestrator

### patch

Apply a narrow requested change. Human gate is risk-based.

1. search - owner: context-scout
2. apply - owner: craftsman
3. verify - owner: orchestrator

Internal controls before verify: diff review, clean-tree checkpoint, smoke test, and human gate on risk.

### refactor

Behavior-preserving refactor. Human gate after plan approval.

1. search - owner: context-scout
2. plan - owner: craftsman - gate: human approval before test
3. test - owner: craftsman
4. refactor - owner: craftsman
5. verify - owner: orchestrator

Tests must pass before and after refactor.

### audit

Read-only audit. Human gate on critical findings.

1. search - owner: context-scout
2. scan - owner: audit
3. report - owner: audit

## Optional Hooks

| Hook | Runs After | Owner | Effect |
|---|---|---|---|
| mutation | judge or verify | mutation-tester | Writes `.hanesu/progress/mutation/mutation_<id>.md`; does not change `current.json` phase |