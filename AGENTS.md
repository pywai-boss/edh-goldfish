# Development Rules

## Architecture Rules
- Keep a clear separation of concerns:
  - `src/domain/` -> domain and simulation logic (no DOM, no network)
  - `src/data/` -> external data access (Scryfall and other I/O)
  - `src/ui/` -> rendering, UI state, and event wiring
  - `src/app.js` -> orchestration/composition only
- Simulation, parsing, commander, and legality logic must be implemented as pure functions in `src/domain/`.
- Domain functions must be deterministic for the same inputs and must not read/write global UI state.
- Data-access modules may perform network/file I/O, but they must not contain simulation or UI logic.
- UI modules may read/write UI state and DOM, but they must not implement core simulation/parsing/legality rules.
- Do not add large new logic blocks to the root `app.js` monolith. New feature logic must be placed in the appropriate `src/` module.
- Prefer adding or extending reusable module functions over duplicating logic across UI handlers.
- Preserve behavior during refactors: structural moves should not change output semantics unless explicitly requested.

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

## Test Execution Rules
When making changes to simulation logic, data models, or feature computation:
- Run tests using:
  - `npm test`
- Ensure all tests pass before considering the task complete.
- If tests fail:
  - Do NOT disable or weaken tests
  - Fix the underlying issue

Do NOT run tests for:
- documentation-only changes
- pure UI layout changes that do not affect data or logic
