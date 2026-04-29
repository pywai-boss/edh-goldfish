# Ramp Model

## Purpose
Document how ramp is currently identified and used by the simulation.

## Ramp Classification System
- Ramp is classified using available card metadata and tags.
- Current categories to maintain in docs:
  - mana rock
  - land ramp (tapped / untapped)
  - mana dork
  - ritual (one-shot mana)
  - unknown ramp

## Detection Rules from Oracle Text and Card Data
- Use Scryfall-backed fields where available:
  - type information
  - mana cost
  - produced mana
  - oracle text
- Use rule-based parsing and local heuristics.
- Preserve manual overrides for known key cards when needed.

## Timing Model
- Same-turn ramp:
  - Mana contribution available on the turn the ramp is cast, if rules/heuristics permit.
- Next-turn ramp:
  - Mana contribution deferred to a later turn when immediate contribution is not available.

## Persistence Model
- Persistent ramp:
  - Ongoing mana sources (for example, many permanents).
- One-shot ramp:
  - Temporary mana effects (for example, ritual-style effects).

## Known Limitations
- Conditional and context-heavy card text may be simplified.
- Complex board-state dependencies are not fully modeled.
- Classification may depend on conservative assumptions when metadata is incomplete.
