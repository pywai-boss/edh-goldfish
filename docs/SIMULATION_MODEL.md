# Simulation Model

## Purpose
Describe the current turn-by-turn simulation model and how game-state estimates are derived.

## Automated Testability
- Simulation logic is testable from Node without browser/UI dependencies.
- Core functions are exported from `app.js` and can be validated with fixture-based unit tests.
- The simulation model wrapper, commander-aware library setup, draw primitives, opening-hand statistics helpers, mana timeline helpers, and color access simulation live in `src/domain/simulation.js`; `app.js` keeps compatibility references for existing UI and tests.
- Simulation result rendering lives in `src/ui/simulation-render.js`; it consumes existing result objects without changing model output shapes.
- Test execution command:
  - `npm test`
- The paste-first UX flow ("Paste decklist -> Confirm commander(s) -> Analyze Deck -> Results") is wired without changing simulation/model outputs.
- Current automated test scope focuses on:
  - timeline shape stability (turns 1-8)
  - canonical feature output fields
  - color access outputs
  - castability outputs
  - commander exclusion from library construction
- Tests use mocked card objects and do not call Scryfall.

## Canonical Feature Shape
The simulation layer now exposes a canonical `SimulationFeatures`-style shape for reuse by V1 and future scoring/benchmarking work:

- `manaByTurn`
- `colorsByTurn`
- `fullCommanderColorAccessByTurn`
- `castabilityByTurn`
- `commanderTiming`

Legacy fields are still returned for compatibility while UI migration remains incremental.

## Turn-by-Turn Simulation Flow
- `buildSimulationModel` is the domain-level entry point for the main opening-hand and mana-development simulation result.
- Define iteration count from the simulation input.
- Build a library-only pool (commander cards excluded from opening-hand draws).
- For each iteration:
  - Draw opening hand plus future draws (through turn 8).
  - Compute opening-hand metrics from the opening hand.
  - Evaluate turn states from turn 1 through turn 8.
  - Aggregate mana timeline values for each turn.

## Pre-Simulation Gate
- After deck parse and commander confirmation, a legality validation step runs before simulation:
  - deck size check (100 including commander(s))
  - commander pair legality check for two-commanders
  - color identity inclusion check for non-commander cards
  - banned-card check when metadata provides commander legality
- Validation issues do not hard-block simulation; the user can continue anyway.

## Hand + Draw Model
- Opening hand size is fixed by implementation.
- Draws are random without replacement.
- Visible cards for turn N include opening hand plus draws up to turn N.
- Low-level draw helpers (`drawHand`, `drawCards`) are implemented once in `src/domain/simulation.js` and reused by `app.js`.
- Opening-hand land/ramp counters, land distribution, and sample-hand selection are recorded by pure helpers in `src/domain/simulation.js`.

## Mana Tracking (Lands + Ramp)
- Land availability is estimated from visible land cards and one land play per turn.
- Ramp contributes based on current modeling rules and available card metadata.
- Produced mana/color availability is derived from card-level mana production data.
- Available mana is tracked each turn (1-8) as `availableMana.total`.
- The current implementation uses the same mana availability helper for:
  - color access simulation
  - curve/castability simulation
  - mana development timeline aggregation

## Commander Evaluation
- Commander cards are selected from commander section detection or manual selection.
- One or two commanders are supported.
- Commander-aware simulation setup marks selected commanders as command-zone cards and builds the simulation library in `src/domain/simulation.js`.
- Commander castability is evaluated from command zone assumptions, not from hand draws.
- Partner-style selection combines color identity while evaluating each commander cost independently.
- When no commander section is present, commander suggestions are filtered by deck-required color identity:
  - legal single commanders that cover required colors
  - legal two-commander partner-style pairs whose combined identities cover required colors
- Supported partner-style mechanics in candidate pairing:
  - `Partner`
  - `Choose a Background` + `Background`
  - `Friends forever`
  - `Doctor's companion` + `Doctor`

## Castability Logic
- A spell/card is castable when:
  - available mana count meets total mana requirement, and
  - required colors/pips are payable from available mana sources.
- Turn-based castability metrics are evaluated for turns 1-8.
- X-cost handling follows the project current fixed heuristic.

## Mana Development Aggregation
- Per simulation run, the model tracks available mana for turn 1 through turn 8.
- Turn-by-turn mana counters are recorded by pure helpers in `src/domain/simulation.js`, then assembled into the existing `manaByTurn` result shape.
- Aggregate outputs include:
  - average available mana on each turn
  - threshold hit counts/percentages for:
    - 2+ mana on turn 2
    - 3+ mana on turn 3
    - 4+ mana on turn 4
    - 5+ mana on turn 5
    - 6+ mana on turn 6
    - 7+ mana on turn 7
    - 8+ mana on turn 8
- Reusable result structure includes:
  - `manaByTurn` (normalized timeline for turn 1-8)
  - `simulationFeatures.manaByTurn` (canonical feature path)
  - `manaDevelopment.turns` (legacy-compatible timeline)

## Color Access Aggregation
- Color access is tracked turn-by-turn for turns 1-8.
- The color access cluster is implemented as pure domain logic in `src/domain/simulation.js` and has no DOM or Scryfall/network dependencies.
- Reusable result structure includes:
  - `colorsByTurn` (per-turn per-color hit counts)
  - `simulationFeatures.colorsByTurn` (canonical feature path)
  - `commanderColorAccessByTurn` (alias to per-turn commander color hits)
  - `fullCommanderColorAccessByTurn` (per-turn full identity access hit counts)
  - `simulationFeatures.fullCommanderColorAccessByTurn` (canonical feature path)
- Naming cleanup in progress:
  - canonical full-identity metric name: `fullCommanderIdentityAccess`
  - legacy compatibility alias still present: `allColors`

## Castability Aggregation
- Castability is tracked turn-by-turn for turns 1-8.
- Reusable result structure includes:
  - `castabilityByTurn` (canonical feature path with `anyCastable` and `onCurveSpellByTurnCost`)
  - `turns` (legacy-compatible path with `curvePlay` alias)
- Naming cleanup in progress:
  - canonical on-curve metric name: `onCurveSpellByTurnCost`
  - legacy compatibility alias still present: `curvePlay`

## Commander Timing Data
- Commander castability output is carried as `SimulationFeatures.commanderTiming` when a commander simulation is run.
- If commander castability is not run, `commanderTiming` is `null`.
- Commander timing evaluation scans turns 1-8 and tracks, per simulation:
  - earliest commander cast turn
  - commander castable on curve status
  - failure reason when curve is missed
- Failure reason categories:
  - `insufficient_mana`
  - `missing_colors`
  - `both`
  - `not_castable_by_turn_8`
- The model uses the existing turn-state helpers and canonical feature concepts (mana-by-turn + color access checks) without changing the current mana/color timeline behavior.

## Reporting Heuristics vs Core Features
- Heuristic hand labels (for example 2-4 lands, low-land, high-land) remain available as reporting metrics.
- They are intentionally separate from the canonical feature shape so future functional-hand scoring can use neutral inputs.

## Known Limitations
- This model is heuristic and intentionally not a full rules engine.
- Interaction, replacement effects, cost reducers, and many conditional effects are simplified or omitted.
- Mana development currently uses heuristic turn sequencing rather than full rules-accurate sequencing.
