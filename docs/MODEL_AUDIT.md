# Model Audit (V1 Functional-Hand Architecture)

## Scope
Audit-only review of current simulation/model structure against V1 direction:
- mana development timeline
- color access timeline
- commander-on-curve analysis
- early castability
- future functional-hand scoring
- future benchmarking / LP optimization

No code refactor or feature implementation was performed in this audit.

## Summary
The current model is close to a usable V1 foundation. Core turn-by-turn simulation logic exists, turns 1-8 are preserved, and key reusable structures have started to appear (`manaByTurn`, `colorsByTurn` aliases). The main gaps are naming consistency, duplicated compatibility structures, and some metric/UI coupling that should be reduced before later optimization/scoring work.

## Findings

### 1) Where simulation logic lives
- Primary simulation logic is centralized in `app.js`:
  - `runSimulation(...)` for opening-hand and mana timeline aggregation
  - `simulateColorAccess(...)` for color timelines
  - `simulateCurveAccess(...)` for castability timeline
  - `simulateCommanderCastAccess(...)` for commander castability
- This is workable for V1, but all logic is in one file.

Assessment: acceptable for current size, but modular split will help future scoring/optimization.

### 2) What data each simulation run produces
- `runSimulation(...)` currently returns:
  - opening-hand distribution and counters
  - `manaByTurn`
  - compatibility shape `manaDevelopment.turns`
- `simulateColorAccess(...)` returns:
  - `turns` with per-color and full-identity hit counts
  - `colorsByTurn`
  - `commanderColorAccessByTurn` alias
  - `fullCommanderColorAccessByTurn`
- `simulateCurveAccess(...)` returns:
  - `turns` with `anyCastable` and `curvePlay`

Assessment: data exists for V1 needs, but there are overlapping/alias structures.

### 3) Reusability of `manaByTurn` and `colorsByTurn`
- `manaByTurn`: reusable and normalized enough for downstream consumers.
- `colorsByTurn`: reusable, but still derived alongside a legacy `turns` structure.
- Current UI still reads mixed sources (`manaByTurn` with fallback to legacy `manaDevelopment.turns`).

Assessment: reusable, but cleanup to one canonical shape is recommended.

### 4) Turn 1-8 preservation
- Turn 1-8 loops are consistently present in:
  - mana timeline
  - color access
  - castability
- Table rendering also iterates turns 1-8.

Assessment: good; requirement is satisfied.

### 5) Commander data parsing/reuse
- Commanders are detected from section + manual selection fallback.
- Color identity is fetched/reused.
- Library excludes selected commanders.
- Commander selections are reusable for later model features.

Assessment: strong foundation for future commander timing/scoring features.

### 6) Early castability extensibility
- Existing `simulateCurveAccess(...)` already computes per-turn castability signals (`anyCastable`, `curvePlay`).
- These signals can be extended to additional early-turn features without structural rewrite.

Assessment: can be added cleanly.

### 7) Coupling between metrics and UI
- Some coupling remains:
  - UI reads both canonical and compatibility paths.
  - Legacy display-oriented names still exist (`manaDevelopment.turns`).
- Metrics are mostly produced in simulation functions before rendering, which is good.

Assessment: moderate coupling; manageable but should be reduced.

### 8) Hard-coded assumptions
- Opening-hand heuristic assumptions remain:
  - `keepableLands` uses hard-coded `2-4` rule.
  - other fixed buckets (`lowLand`, `highLand`) still exist.
- This conflicts with long-term direction to avoid hard-coded “good hand” judgments as core logic.

Assessment: acceptable as temporary descriptive metrics, but should be isolated from future scoring core.

### 9) Duplicated logic / confusing naming
- Duplicated/parallel fields:
  - `manaByTurn` and `manaDevelopment.turns`
  - `turns` and `colorsByTurn` / `commanderColorAccessByTurn`
- Terminology overlap:
  - “curve” in multiple contexts (spell curve play vs commander on-curve concept)
  - “allColors” represents full commander identity access, but naming is generic.

Assessment: naming normalization would improve maintainability and scoring integration readiness.

## Readiness Against V1 Direction
- Mana development timeline: **Ready**
- Color access timeline: **Ready**
- Commander-on-curve analysis: **Partially ready (feature exists; naming/structure cleanup needed)**
- Early castability: **Ready to extend**
- Functional-hand scoring foundation: **Partially ready (needs canonical feature schema)**
- Benchmarking / LP optimization prep: **Partially ready (needs decoupled feature output API)**

## Recommended Refactor Plan (do not implement yet)
1. Define one canonical `SimulationFeatures` output shape:
   - `manaByTurn`
   - `colorsByTurn`
   - `fullCommanderColorAccessByTurn`
   - `castabilityByTurn`
   - `commanderTiming`
2. Keep legacy fields temporarily as adapters only, then deprecate.
3. Rename ambiguous fields:
   - `allColors` -> `fullCommanderIdentityAccess`
   - `curvePlay` -> `onCurveSpellByTurnCost`
4. Isolate heuristic hand labels (`2-4 lands`, `lowLand`, `highLand`) into optional reporting layer, not core feature layer.
5. Split `app.js` simulation/model logic into focused modules:
   - draw/turn engine
   - mana engine
   - color metrics
   - castability metrics
   - commander timing metrics
6. Add feature-level tests for canonical outputs independent from UI rendering.

## Known Limitations (current model)
- Heuristic sequencing and conservative tapland handling.
- Not a full rules engine.
- Some display-driven compatibility paths still present.
