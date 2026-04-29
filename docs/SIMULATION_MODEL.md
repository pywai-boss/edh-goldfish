# Simulation Model

## Purpose
Describe the current turn-by-turn simulation model and how game-state estimates are derived.

## Turn-by-Turn Simulation Flow
- Define iteration count from the simulation input.
- Build a library-only pool (commander cards excluded from opening-hand draws).
- For each iteration:
  - Draw opening hand plus future draws (through turn 8).
  - Compute opening-hand metrics from the opening hand.
  - Evaluate turn states from turn 1 through turn 8.
  - Aggregate mana timeline values for each turn.

## Hand + Draw Model
- Opening hand size is fixed by implementation.
- Draws are random without replacement.
- Visible cards for turn N include opening hand plus draws up to turn N.

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
- Commander castability is evaluated from command zone assumptions, not from hand draws.
- Partner-style selection combines color identity while evaluating each commander cost independently.

## Castability Logic
- A spell/card is castable when:
  - available mana count meets total mana requirement, and
  - required colors/pips are payable from available mana sources.
- Turn-based castability metrics are evaluated for turns 1-8.
- X-cost handling follows the project current fixed heuristic.

## Mana Development Aggregation
- Per simulation run, the model tracks available mana for turn 1 through turn 8.
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
  - `manaDevelopment.turns` (legacy-compatible timeline)

## Color Access Aggregation
- Color access is tracked turn-by-turn for turns 1-8.
- Reusable result structure includes:
  - `colorsByTurn` (per-turn per-color hit counts)
  - `commanderColorAccessByTurn` (alias to per-turn commander color hits)
  - `fullCommanderColorAccessByTurn` (per-turn full identity access hit counts)
- Existing UI still uses the same underlying `turns` structure, with reusable aliases added for V1 foundation use.

## Known Limitations
- This model is heuristic and intentionally not a full rules engine.
- Interaction, replacement effects, cost reducers, and many conditional effects are simplified or omitted.
- Mana development currently uses heuristic turn sequencing rather than full rules-accurate sequencing.
