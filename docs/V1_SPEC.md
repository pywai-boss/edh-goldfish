# EDH Mana Tool — V1 Spec

## Goal
Help EDH players understand if their deck functions in the early game.

## Core Questions
1. Do I have enough mana (lands + ramp)?
2. Do I have the right colors?
3. Can I cast my commander on curve?
4. Can I cast spells in the early turns?

---

## Simulation Scope

The simulation must cover turns 1 through 8.

Reason:
Many EDH commanders cost between 5 and 8 mana, so limiting to turn 4 would produce incorrect or incomplete results.

Turn 1–3 → early game behavior  
Turn 1–8 → mana development and commander castability  

---

## V1 Metrics

### Mana Development
- Track available mana per turn (turn 1–8)
- Report:
  - % with 2+ mana on turn 2
  - % with 3+ mana on turn 3
  - % with 4+ mana on turn 4
  - % with 5+ mana on turn 5
  - % with 6+ mana on turn 6
  - % with 7+ mana on turn 7
  - % with 8+ mana on turn 8

### Early Castability
- % of games with a castable spell:
  - turn 1
  - turn 2
  - turn 3
- % of games with no castable spell by turn 3

### Commander
- Determine commander mana value and color requirements
- % castable on curve
- Track earliest castable turn
- Failure reasons:
  - insufficient mana
  - missing colors
  - both

### Color Access
- % access to each commander color by turn N
- % access to full color identity by commander curve turn

---

## Ramp Modeling (V1)

Use Scryfall data (oracle text, mana cost, types, produced mana) to classify ramp automatically.

Scryfall provides structured card data including oracle text, mana costs, and card types, which can be used to infer behavior programmatically. :contentReference[oaicite:0]{index=0}

Classify ramp into:

- mana rock
- land ramp (tapped / untapped)
- mana dork
- ritual (one-shot mana)
- unknown ramp

Track:

- timing:
  - same turn
  - next turn
- persistence:
  - one-shot vs permanent
- mana contribution

Use rule-based parsing of oracle text and type_line.

Maintain a small manual override system for key cards (e.g. Sol Ring, Dark Ritual).

---

## Out of Scope (V1)

- Linear programming optimization
- Full mulligan simulation
- Archetype/gameplan detection
- Perfect ramp modeling
- Exact deck recommendations
- Complex conditional mana effects

---

## Principle

Measure what the deck can DO, not what it CONTAINS.

---
