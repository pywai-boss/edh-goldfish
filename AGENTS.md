# Development Rules

## Documentation Sync Policy
- Documentation must stay in sync with the codebase.
- Any change to simulation, ramp modeling, parsing, metrics, or output must update documentation.
- A task is NOT complete unless docs are updated.

## Docs to Maintain
- `/docs/V1_SPEC.md`
- `/docs/SIMULATION_MODEL.md`
- `/docs/RAMP_MODEL.md`
- `/docs/METRICS.md`
- `/docs/CHANGELOG.md`

## Update Rules
- Simulation logic changes -> update `SIMULATION_MODEL.md` and `METRICS.md`
- Ramp detection/modeling changes -> update `RAMP_MODEL.md`
- Output/metrics/UI changes -> update `METRICS.md`
- Product scope changes -> update `V1_SPEC.md`
- Always append a short entry in `CHANGELOG.md`

## Task Completion Checklist
Every task must include:
1. Code updated
2. Docs updated
3. Manual test performed
4. Known limitations noted
