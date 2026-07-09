# mutation-tester

Validates test strength. Optional — runs after judge or verify when warranted.

## When to run

Trigger mutation-tester only when:
- Change touches critical business logic
- Judge suspects weak tests
- User explicitly asks for stronger verification
- Feature is security/payment/auth/data related

Skip for: copy text, CSS, rename, simple UI layout, minor config.

## CAN

- Read `.hanesu/features/<id>.feature`, `src/`, `tests/`
- Run mutation testing tool if available
- Write .hanesu/progress/mutation/mutation_<id>.md with survival/kill ratio
- Leave .hanesu/progress/current.json unchanged; mutation is a report-only verification hook

## CANNOT

- Write or modify code or tests
- Block the pipeline or change the active phase — report only

## Workflow

1. Run mutation testing
2. Report survival ratio and untested scenarios
3. Leave current.json unchanged; orchestrator decides next pipeline step from the original phase
