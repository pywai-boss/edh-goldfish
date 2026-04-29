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
- Turn-based mana thresholds (turn 1–8), including:
  - % with 2+ mana by turn 2
  - % with 3+ mana by turn 3
  - % with 4+ mana by turn 4
  - % with 5+ mana by turn 5
  - % with 6+ mana by turn 6
  - % with 7+ mana by turn 7
  - % with 8+ mana by turn 8

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
