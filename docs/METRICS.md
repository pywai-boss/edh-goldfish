# Metrics

## Purpose
Define all reported metrics and how each one is calculated.

## Deck Context Metrics
- Total deck cards
- Commander count (command zone)
- Library size (draw-eligible cards)
- Land count in library
- Nonland mana/ramp count

## Opening Hand Metrics
- Land-count distribution in opening hands
- Average lands in opener
- Keep-style heuristics (for example, low-land/high-land buckets)
- Early mana-source availability summaries

## Mana Development Metrics
- Average available mana for each turn 1-8.
- Threshold percentages:
  - % with 2+ mana on turn 2
  - % with 3+ mana on turn 3
  - % with 4+ mana on turn 4
  - % with 5+ mana on turn 5
  - % with 6+ mana on turn 6
  - % with 7+ mana on turn 7
  - % with 8+ mana on turn 8

### Calculation
- For each simulation run and each turn 1-8:
  - compute available mana using the current mana availability helper
  - add that value to the turn total
- After all runs:
  - average available mana for turn N = sum turn N mana / total simulations
  - threshold % for turn N = runs meeting threshold / total simulations
- UI presentation:
  - average available mana is shown in the existing turn-by-turn Color & Curve table as a `Total Mana` column
  - threshold percentages are shown as a compact summary line under that table

## Color Access Metrics
- Per-turn access to each relevant commander color.
- Per-turn access to full commander color identity.
- Colorless identities are treated as having no color requirements.

## Spell Castability Metrics
- Per-turn % with at least one castable nonland spell.
- Turn-X curve metrics (for example, turn 1/2/3/4 play rates).
- Early dead-turn style metrics (for example, no castable spell by turn 3).

## Commander Castability Metrics
- Per selected commander:
  - Castable on curve (or by turn 8 for high MV)
  - Average earliest castable turn
- Two-commander case:
  - Both castable by turn 8 %

## Calculation Notes
- All percentages are computed over simulation iterations.
- Castability combines total mana requirement and color/pip requirement checks.
- Heuristic assumptions are used; this is not a full game rules engine.
