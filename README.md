# Why Hanesu

Hanesu is an experimental workflow layer for AI coding agents.

It applies ideas from Harness Engineering to repository-level software work: instead of asking an agent to code from one long prompt, Hanesu gives it a visible process made of task files, phases, role handoffs, quality gates, and progress artifacts.

Hanesu does not replace tools like OpenCode, Codex, Claude Code, or other agent runtimes. It sits inside your repo and gives those agents a small control layer for moving through work more predictably.

It is not meant for every task. For small, obvious edits, a direct prompt plus code search is usually faster. Hanesu is most useful for ambiguous, risky, or multi-step work where you want the agent to search first, write artifacts, stop at human gates, and verify before calling the task done.

The workflow borrows from Spec-Driven Development and Test-Driven Development: search for context, define intent, write scenarios or tests, implement, review, and verify.

## Principles

- **Workflow over improvisation.** The agent follows a defined path, not a long free-form chat.
- **Context before code.** Search comes before reading or editing source files.
- **Artifacts over memory.** Important decisions are written down, not buried in chat history.
- **Gates where judgment matters.** Human review appears at risky or semantic points.
- **Rigor proportional to risk.** Features, bugfixes, patches, refactors, and audits use different flows.
- **Verification before completion.** A task is not done until the required checks pass.
- **Small harness, large project.** Hanesu should guide the run without becoming the main work.
- **Portable by design.** The workflow lives in repo files so different agents can follow it.
- **Roles are ephemeral.** Enter a phase, write the artifact, exit.
- **Diagnose before fix, plan before refactor.**
- **Diff review before verify.** Every applied change is assessed for risk before final verification.
- **Clean-tree checkpoint before edit.** If the working tree is dirty, stop for human review before changing files.
- **Smoke test in verify.** Tests alone don't prove the app works.
- **Risk-based gates for patch.** Security, models, deps, and >2 files trigger human review.

## Quick start

```bash
# In your project directory
npx create-hanesu
# Creates .hanesu/
npx create-hanesu --update
# Updates an existing .hanesu/ from the latest template
```

## Configuration

After init, customize these files:

| File | What to change |
|------|----------------|
| `.hanesu/config.md` | project preferences, workarounds, and conventions |
| `.hanesu/feature.json` | your feature backlog (feature/bugfix/patch/refactor/audit) |
| `.hanesu/prompts/<id>.prompt` | task description, logs, error output, links |

Project stack and architecture go in a separate `ARCHITECTURE.md` at root.

## How It Works

One task at a time. Pipeline selected by type.

The agent starts from `.hanesu/workflow.md`, reads the compact workflow definition, checks
the current task in `.hanesu/feature.json`, then runs the first phase:
`context-scout`.

`context-scout` searches the codebase before any role reads source. The next role receives a small candidate file list instead of exploring the repository blindly.

### Why One Agent At A Time

Hanesu is intentionally sequential.

1. **Fresh context for real work.** The orchestrator stays lightweight and only
   coordinates. Roles like spec, implementation, diagnosis, and review can run
   with focused instructions and a small handoff.

2. **Deterministic handoff.** Parallel agents can race on files, tests, and
   `current.json`. Sequential execution keeps the system debuggable:
   write artifact -> update status -> next role reads.


## State Model

Two files track task progress. No overlap.

### `feature.json` — the backlog

Decides what to work on. Lists all tasks with lifecycle status only.

| Field | Values | Meaning |
|-------|--------|---------|
| `id` | `f1`, `f2`, ... | Task identifier |
| `type` | `feature`, `bugfix`, `patch`, `refactor`, `audit` | Pipeline selector |
| `status` | `pending`, `done`, `blocked` | Lifecycle status. Gates and in-progress phase state live in `current.json` |

### `current.json` — the session

Decides where the work is. Single task, real-time phase tracking.

```json
{
  "id": "f1",
  "type": "feature",
  "phase": "search",
  "status": "running",
  "attempt": 1,
  "gate": { "type": "none", "reason": "none" }
}
```

| Field | Values | Meaning |
|-------|--------|---------|
| `phase` | Pipeline phase from `workflow.md` | Where in the pipeline |
| `status` | `running`, `done`, `failed`, `blocked` | Phase sub-status |
| `attempt` | 1, 2, ... | Retry counter (judge reject, verify fail) |
| `gate` | `{ type, reason }` | Human gate blocker |

### Flow

```
feature.json decides what to work on.
current.json decides where the work is.
workflow.md decides what comes next and which role owns each phase.
```

The first persisted phase is always `search`.

## Daily Workflow

### 1. Define a task

Edit `.hanesu/feature.json` to register the task:

```json
{
  "features": [
    { "id": "f1", "type": "feature", "status": "pending" },
    { "id": "f2", "type": "bugfix", "status": "pending" },
    { "id": "f3", "type": "patch", "status": "pending" },
    { "id": "f4", "type": "refactor", "status": "pending" },
    { "id": "f5", "type": "audit", "status": "pending" }
  ]
}
```

Then write the real request in the matching prompt file:

```text
.hanesu/prompts/f1.prompt
```

Use the prompt for logs, acceptance notes, error output, links, and constraints.

### 2. Tell the AI

```
Implement f1 using Hanesu.
```

The orchestrator reads `.hanesu/workflow.md`, `.hanesu/feature.json`,
and the matching `.hanesu/prompts/<id>.prompt`.
It selects the pipeline by type from workflow.md and executes.

### 3. Follow the pipeline

Each mode has its own flow, but ALL start with `search`. `workflow.md` is the canonical phase map and lists the owning role for every phase explicitly:

```text
feature
1. search - owner: context-scout
2. spec - owner: spec-partner
3. gherkin - owner: gherkin-author - gate: human approval before tdd
4. tdd - owner: craftsman
5. judge - owner: judge
6. verify - owner: orchestrator

bugfix
1. search - owner: context-scout
2. diagnose - owner: craftsman
3. patch - owner: craftsman
4. verify - owner: orchestrator

patch
1. search - owner: context-scout
2. apply - owner: craftsman
3. verify - owner: orchestrator

refactor
1. search - owner: context-scout
2. plan - owner: craftsman - gate: human approval before test
3. test - owner: craftsman
4. refactor - owner: craftsman
5. verify - owner: orchestrator

audit
1. search - owner: context-scout
2. scan - owner: audit
3. report - owner: audit
```

Mutation testing is an optional report-only hook after judge or verify; it writes a report without changing `current.json` phase.

### 4. Check artifacts

Common outputs:

```text
.hanesu/progress/scout/context_<id>.json
.hanesu/progress/diagnosis/diagnosis_<id>.md
.hanesu/progress/diff/diff_<id>.md         ← diff review output (risk assessment)
.hanesu/progress/judge/judge_<id>.md
.hanesu/progress/mutation/mutation_<id>.md
.hanesu/progress/refactor/plan_<id>.md
.hanesu/progress/audit/audit_<id>.md
```

Feature specs and Gherkin scenarios are written to:

```text
.hanesu/specs/<id>.md
.hanesu/features/<id>.feature
```

### 5. Rinse

Task reaches `done`. Orchestrator picks next pending task.

## Updating Hanesu

Run `npx create-hanesu --update` from a project that already has `.hanesu/`.
It refreshes framework-owned files: `roles/` and `workflow.md`.
It preserves project state and authored work: `config.md`, prompts, features, progress, specs, and `feature.json`.

## Roles

| Role | What it does |
|------|--------------|
| orchestrator | Coordinates pipelines, gates, checkpoints, diff review, and verify + smoke |
| context-scout | Searches codebase before any role reads source (step 0) |
| spec-partner | Clarifies intent and writes spec |
| gherkin-author | Writes `.feature` files from spec |
| craftsman | Implements (TDD), diagnoses bugs, applies fixes |
| judge | Reviews implementation against spec/gherkin, approves or rejects |
| mutation-tester | Optional — validates test quality on critical logic |
| audit | Read-only scan/report for audit pipeline |

## Adding a role

Drop a `.md` file in `.hanesu/roles/` with:
- CAN / CANNOT sections
- Workflow
- Output format (handoff JSON template)

Add the role to the appropriate pipeline in `workflow.md`.
Orchestrator spawns it when the pipeline step is reached.

## Inspiration

Inspired by spec-first AI coding workflows and Robert C. Martin's
[SwarmForge](https://github.com/unclebob/swarm-forge).

## Tips

- Pair Hanesu with [caveman](https://github.com/JuliusBrussee/caveman) — cuts output tokens ~65%.
- Pair Hanesu with [codebase-memory MCP](https://github.com/DeusData/codebase-memory-mcp) — context-scout uses it for structural search.

### Recommended agent skills

The template references these skills via `if exists` — optional, enhances sub-agent behavior:

| Skill | Role | What it adds |
|---|---|---|
| `systematic-debugging` | craftsman (diagnose) | Root cause protocol before fixing bugs |
| `caveman-review` | judge | Terse one-line review format |
