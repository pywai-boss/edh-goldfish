# Simulation Model

## Purpose
Describe the current turn-by-turn simulation model and how game-state estimates are derived.

## Turn-by-Turn Simulation Flow
- Define iteration count from the simulation input.
- Build a library-only pool (commander cards excluded from opening-hand draws).
- For each iteration:
  - Draw opening hand.
  - Simulate one draw per turn.
  - Evaluate turn states from turn 1 through turn 8.

## Hand + Draw Model
- Opening hand size is fixed by implementation.
- Draws are random without replacement.
- Visible cards for turn N include opening hand plus draws up to turn N.

## Mana Tracking (Lands + Ramp)
- Land availability is estimated from visible land cards and one land play per turn.
- Ramp contributes based on current modeling rules and available card metadata.
- Produced mana/color availability is derived from card-level mana production data.

## Commander Evaluation
- Commander cards are selected from commander section detection or manual selection.
- One or two commanders are supported.
- Commander castability is evaluated from command zone assumptions, not from hand draws.
- Partner-style selection combines color identity while evaluating each commander’s cost independently.

## Castability Logic
- A spell/card is castable when:
  - available mana count meets total mana requirement, and
  - required colors/pips are payable from available mana sources.
- Turn-based castability metrics are evaluated for turns 1–8.
- X-cost handling follows the project’s current fixed heuristic.

## Known Limitations
- This model is heuristic and intentionally not a full rules engine.
- Interaction, replacement effects, cost reducers, and many conditional effects are simplified or omitted.
