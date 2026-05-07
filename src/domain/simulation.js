(function () {
const cardDomain =
  typeof require !== "undefined"
    ? require("./cards.js")
    : window.EDHCardDomain;
const commanderDomain =
  typeof require !== "undefined"
    ? require("./commander.js")
    : window.EDHCardDomain.commander;

const {
  MANA_COLORS,
  canPayManaCost,
  entersTapped,
  getDeckColors,
  getManaCostRequirements,
  getProducedColors,
  getRelevantColors,
} = cardDomain;

const {
  getCommanderColorIdentity,
  getCommanderKeySet,
  isCommandZoneCard,
  isOutsideDeckCard,
} = commanderDomain;

const OPENING_HAND_SIZE = 7;

function buildLibraryCards(cards, selectedCommanders = []) {
  const commanderKeySet = getCommanderKeySet(selectedCommanders);
  return cards.filter((card) => !isOutsideDeckCard(card) && !isCommandZoneCard(card, commanderKeySet));
}

function buildLibrary(cards, selectedCommanders = []) {
  const library = [];

  buildLibraryCards(cards, selectedCommanders).forEach((card) => {
    for (let copy = 0; copy < card.count; copy += 1) {
      library.push({ ...card, copy });
    }
  });

  return library;
}

function markCommandZoneCards(cards, selectedCommanders = []) {
  const commanderKeySet = getCommanderKeySet(selectedCommanders);
  return cards.map((card) => {
    const commandZone = isCommandZoneCard(card, commanderKeySet);
    return {
      ...card,
      isCommander: commandZone,
      zone: commandZone ? "command" : isOutsideDeckCard(card) ? "outside" : "library",
    };
  });
}

function drawHand(library, handSize) {
  const hand = [];
  const pool = library.slice();
  const drawCount = Math.min(handSize, library.length);

  for (let index = 0; index < drawCount; index += 1) {
    const randomIndex = index + Math.floor(Math.random() * (pool.length - index));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
    hand.push(pool[index]);
  }

  return hand;
}

function drawCards(library, count) {
  return drawHand(library, Math.min(count, library.length));
}

function summarizeHand(hand) {
  const lands = hand.filter((card) => card.isLand).length;
  const ramp = hand.filter((card) => card.isRamp).length;
  const turnOneRamp = hand.filter((card) => card.isTurnOneRamp).length;
  const manaSources = lands + ramp;
  const keepableLands = lands >= 2 && lands <= 4;

  return {
    lands,
    ramp,
    turnOneRamp,
    manaSources,
    keepableLands,
    lowLand: lands <= 1,
    highLand: lands >= 5,
    twoLandRamp: lands >= 2 && ramp >= 1,
    threeManaSources: manaSources >= 3,
  };
}

function createEmptyDistribution(handSize) {
  const distribution = new Map();
  for (let lands = 0; lands <= handSize; lands += 1) {
    distribution.set(lands, 0);
  }
  return distribution;
}

function createOpeningHandStats(handSize) {
  return {
    distribution: createEmptyDistribution(handSize),
    counters: {
      keepableLands: 0,
      lowLand: 0,
      highLand: 0,
      hasRamp: 0,
      hasTurnOneRamp: 0,
      twoLandRamp: 0,
      threeManaSources: 0,
    },
    examples: {
      keep: null,
      low: null,
      high: null,
    },
    totalLands: 0,
  };
}

function recordOpeningHandStats(openingHandStats, hand) {
  const summary = summarizeHand(hand);
  openingHandStats.distribution.set(
    summary.lands,
    (openingHandStats.distribution.get(summary.lands) || 0) + 1,
  );
  openingHandStats.totalLands += summary.lands;

  if (summary.keepableLands) openingHandStats.counters.keepableLands += 1;
  if (summary.lowLand) openingHandStats.counters.lowLand += 1;
  if (summary.highLand) openingHandStats.counters.highLand += 1;
  if (summary.ramp > 0) openingHandStats.counters.hasRamp += 1;
  if (summary.turnOneRamp > 0) openingHandStats.counters.hasTurnOneRamp += 1;
  if (summary.twoLandRamp) openingHandStats.counters.twoLandRamp += 1;
  if (summary.threeManaSources) openingHandStats.counters.threeManaSources += 1;

  if (!openingHandStats.examples.keep && summary.keepableLands && summary.ramp > 0) {
    openingHandStats.examples.keep = { hand, summary };
  }

  if (!openingHandStats.examples.low && summary.lowLand) {
    openingHandStats.examples.low = { hand, summary };
  }

  if (!openingHandStats.examples.high && summary.highLand) {
    openingHandStats.examples.high = { hand, summary };
  }

  return summary;
}

function createManaTimelineStats() {
  return {
    manaTotalsByTurn: Array.from({ length: 8 }, () => 0),
    thresholdHitsByTurn: Array.from({ length: 8 }, () => 0),
  };
}

function getVisibleCardsForTurn(draws, turn) {
  const drawCount = Math.min(draws.length, OPENING_HAND_SIZE + Math.max(0, turn - 1));
  return draws.slice(0, drawCount);
}

function chooseLandsForTurn(visibleCards, turn, deckColors) {
  const lands = visibleCards.filter((card) => card.isLand);
  const chosen = [];
  const availableColors = new Set();
  const maxLands = Math.min(turn, lands.length);

  for (let index = 0; index < maxLands; index += 1) {
    let bestLand = null;
    let bestScore = -1;

    lands.forEach((land) => {
      if (chosen.includes(land)) return;
      const colors = getProducedColors(land, deckColors).filter((color) => MANA_COLORS.includes(color));
      const newColorScore = colors.filter((color) => !availableColors.has(color)).length;
      const deckColorScore = colors.filter((color) => deckColors.includes(color)).length;
      const score = newColorScore * 10 + deckColorScore;

      if (score > bestScore) {
        bestLand = land;
        bestScore = score;
      }
    });

    if (!bestLand) break;
    chosen.push(bestLand);
    getProducedColors(bestLand, deckColors).forEach((color) => availableColors.add(color));
  }

  return chosen;
}

function getAvailableManaForTurn(visibleCards, turn, deckColors) {
  const sources = [];
  const lands = chooseLandsForTurn(visibleCards, turn, deckColors);

  lands.forEach((land, index) => {
    if (entersTapped(land) && index === lands.length - 1) {
      return;
    }
    const colors = getProducedColors(land, deckColors);
    if (colors.length > 0) {
      sources.push({ card: land, colors });
    }
  });

  visibleCards.forEach((card) => {
    if (card.isLand || card.isExcluded || !card.isRamp) return;
    const colors = getProducedColors(card, deckColors);
    const requirements = getManaCostRequirements(card);
    if (colors.length > 0 && requirements.total > 0 && requirements.total < turn) {
      sources.push({ card, colors });
    }
  });

  const colorCounts = Object.fromEntries(MANA_COLORS.map((color) => [color, 0]));
  sources.forEach((source) => {
    source.colors.forEach((color) => {
      if (MANA_COLORS.includes(color)) colorCounts[color] += 1;
    });
  });

  return {
    total: sources.length,
    sources,
    colorCounts,
    colors: MANA_COLORS.filter((color) => colorCounts[color] > 0),
  };
}

function recordManaTimelineStats(manaTimelineStats, draws, deckColors) {
  for (let turn = 1; turn <= 8; turn += 1) {
    const visibleCards = getVisibleCardsForTurn(draws, turn);
    const availableMana = getAvailableManaForTurn(visibleCards, turn, deckColors);
    manaTimelineStats.manaTotalsByTurn[turn - 1] += availableMana.total;

    if (turn >= 2 && availableMana.total >= turn) {
      manaTimelineStats.thresholdHitsByTurn[turn - 1] += 1;
    }
  }
}

function buildManaByTurn(manaTimelineStats, simulations) {
  return Array.from({ length: 8 }, (_, index) => ({
    turn: index + 1,
    averageTotalMana: manaTimelineStats.manaTotalsByTurn[index] / simulations,
    threshold: index + 1,
    atLeastThresholdCount: manaTimelineStats.thresholdHitsByTurn[index],
  }));
}

function buildSimulationModel(library, options = {}) {
  const handSize = options.handSize ?? 7;
  const simulations = options.simulations ?? 10000;
  const deckColors = getDeckColors(library);
  const openingHandStats = createOpeningHandStats(handSize);
  const distribution = openingHandStats.distribution;
  const counters = openingHandStats.counters;
  const examples = openingHandStats.examples;
  const manaTimelineStats = createManaTimelineStats();

  for (let i = 0; i < simulations; i += 1) {
    const draws = drawCards(library, OPENING_HAND_SIZE + 7);
    const hand = draws.slice(0, handSize);
    recordOpeningHandStats(openingHandStats, hand);
    recordManaTimelineStats(manaTimelineStats, draws, deckColors);
  }

  const manaByTurn = buildManaByTurn(manaTimelineStats, simulations);

  return {
    simulations,
    handSize,
    distribution,
    manaByTurn,
    simulationFeatures: {
      manaByTurn,
      colorsByTurn: [],
      fullCommanderColorAccessByTurn: [],
      castabilityByTurn: [],
      commanderTiming: null,
    },
    manaDevelopment: {
      turns: manaByTurn.map((entry) => ({
        turn: entry.turn,
        averageAvailableMana: entry.averageTotalMana,
        threshold: entry.threshold,
        atLeastThresholdCount: entry.atLeastThresholdCount,
      })),
    },
    counters,
    averageLands: openingHandStats.totalLands / simulations,
    examples: Object.values(examples).filter(Boolean),
  };
}

function simulateColorAccess(deck, iterations = 10000, commanderColorIdentity = null) {
  const library = deck.some((card) => card.copy !== undefined) ? deck : buildLibrary(deck);
  const sourceCards = deck.some((card) => card.copy !== undefined) ? deck : deck;
  const deckColors = getRelevantColors(commanderColorIdentity || getDeckColors(sourceCards));
  const turnStats = Array.from({ length: 8 }, (_, index) => ({
    turn: index + 1,
    colors: Object.fromEntries(MANA_COLORS.map((color) => [color, 0])),
    fullCommanderIdentityAccess: 0,
    allColors: 0,
  }));

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const draws = drawCards(library, OPENING_HAND_SIZE + 7);

    for (let turn = 1; turn <= 8; turn += 1) {
      const visibleCards = getVisibleCardsForTurn(draws, turn);
      const availableMana = getAvailableManaForTurn(visibleCards, turn, deckColors);
      MANA_COLORS.forEach((color) => {
        if (availableMana.colorCounts[color] > 0) {
          turnStats[turn - 1].colors[color] += 1;
        }
      });

      if (deckColors.every((color) => availableMana.colorCounts[color] > 0)) {
        turnStats[turn - 1].fullCommanderIdentityAccess += 1;
        turnStats[turn - 1].allColors += 1;
      }
    }
  }

  const colorsByTurn = turnStats.map((turnData) => ({
    turn: turnData.turn,
    colorHits: { ...turnData.colors },
  }));
  const fullCommanderColorAccessByTurn = turnStats.map((turnData) => ({
    turn: turnData.turn,
    hitCount: turnData.fullCommanderIdentityAccess,
  }));

  return {
    iterations,
    deckColors,
    colorsByTurn,
    commanderColorAccessByTurn: colorsByTurn,
    fullCommanderColorAccessByTurn,
    simulationFeatures: {
      manaByTurn: [],
      colorsByTurn,
      fullCommanderColorAccessByTurn,
      castabilityByTurn: [],
      commanderTiming: null,
    },
    turns: turnStats,
  };
}

function getCastableSpellsForTurn(visibleCards, availableMana, turn) {
  return visibleCards.filter((card) => {
    if (card.isLand || card.isExcluded) return false;
    const requirements = getManaCostRequirements(card);
    if (requirements.total === 0) return false;
    if (turn < requirements.total) return false;
    return canPayManaCost(availableMana, requirements);
  });
}

function simulateCurveAccess(deck, iterations = 10000, commanderColorIdentity = null) {
  const library = deck.some((card) => card.copy !== undefined) ? deck : buildLibrary(deck);
  const sourceCards = deck.some((card) => card.copy !== undefined) ? deck : deck;
  const deckColors = getRelevantColors(commanderColorIdentity || getDeckColors(sourceCards));
  const turnStats = Array.from({ length: 8 }, (_, index) => ({
    turn: index + 1,
    anyCastable: 0,
    onCurveSpellByTurnCost: 0,
    curvePlay: 0,
  }));

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const draws = drawCards(library, OPENING_HAND_SIZE + 7);

    for (let turn = 1; turn <= 8; turn += 1) {
      const visibleCards = getVisibleCardsForTurn(draws, turn);
      const availableMana = getAvailableManaForTurn(visibleCards, turn, deckColors);
      const castableSpells = getCastableSpellsForTurn(visibleCards, availableMana, turn);

      if (castableSpells.length > 0) {
        turnStats[turn - 1].anyCastable += 1;
      }

      if (castableSpells.some((card) => getManaCostRequirements(card).total === turn)) {
        turnStats[turn - 1].onCurveSpellByTurnCost += 1;
        turnStats[turn - 1].curvePlay += 1;
      }
    }
  }

  const castabilityByTurn = turnStats.map((turnData) => ({
    turn: turnData.turn,
    anyCastable: turnData.anyCastable,
    onCurveSpellByTurnCost: turnData.onCurveSpellByTurnCost,
  }));

  return {
    iterations,
    deckColors,
    castabilityByTurn,
    simulationFeatures: {
      manaByTurn: [],
      colorsByTurn: [],
      fullCommanderColorAccessByTurn: [],
      castabilityByTurn,
      commanderTiming: null,
    },
    turns: turnStats,
  };
}

function getCommanderTargetTurn(requirements) {
  return requirements.total > 8 ? 8 : requirements.total;
}

function hasCommanderColors(availableMana, requirements) {
  return MANA_COLORS.every((color) => availableMana.colorCounts[color] >= requirements.colors[color]);
}

function evaluateCommanderFailureReasonByTarget(availableManaByTurn, requirements, targetTurn) {
  const turnsToCheck = availableManaByTurn.slice(0, targetTurn);
  const hadEnoughManaByTarget = turnsToCheck.some((availableMana) => availableMana.total >= requirements.total);
  const hadRequiredColorsByTarget =
    requirements.colorPips === 0 || turnsToCheck.some((availableMana) => hasCommanderColors(availableMana, requirements));

  if (!hadEnoughManaByTarget && !hadRequiredColorsByTarget) {
    return "both";
  }
  if (!hadEnoughManaByTarget) {
    return "insufficient_mana";
  }
  if (!hadRequiredColorsByTarget) {
    return "missing_colors";
  }
  return "both";
}

function simulateCommanderCastAccess(
  deck,
  commanders = [],
  iterations = 10000,
  commanderColorIdentity = null,
) {
  if (!Array.isArray(commanders) || commanders.length === 0) {
    return null;
  }

  const library = deck.some((card) => card.copy !== undefined) ? deck : buildLibrary(deck);
  const sourceCards = deck.some((card) => card.copy !== undefined) ? deck : deck;
  const deckColors = getRelevantColors(commanderColorIdentity || getCommanderColorIdentity(commanders));
  const commanderStats = commanders.map((commander) => {
    const requirements = getManaCostRequirements(commander);
    const targetTurn = getCommanderTargetTurn(requirements);
    return {
      name: commander.name,
      requirements,
      targetTurn,
      commanderCastableOnCurve: 0,
      earliestCommanderCastTurnSum: 0,
      earliestCommanderCastTurnCount: 0,
      failureBreakdown: {
        insufficient_mana: 0,
        missing_colors: 0,
        both: 0,
        not_castable_by_turn_8: 0,
      },
      castableByTarget: 0,
      castableBy8: 0,
      castableTurnSum: 0,
      castableTurnCount: 0,
    };
  });

  let bothBy8 = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const draws = drawCards(library, OPENING_HAND_SIZE + 7);
    const earliestCastTurns = Array.from({ length: commanderStats.length }, () => null);
    const availableManaByTurn = [];
    const manaByTurn = [];
    const colorsByTurn = [];
    const fullCommanderColorAccessByTurn = [];

    for (let turn = 1; turn <= 8; turn += 1) {
      const visibleCards = getVisibleCardsForTurn(draws, turn);
      const availableMana = getAvailableManaForTurn(visibleCards, turn, deckColors);
      availableManaByTurn.push(availableMana);
      manaByTurn.push({
        turn,
        totalMana: availableMana.total,
      });
      colorsByTurn.push({
        turn,
        colorHits: Object.fromEntries(MANA_COLORS.map((color) => [color, availableMana.colorCounts[color] > 0 ? 1 : 0])),
      });
      fullCommanderColorAccessByTurn.push({
        turn,
        hasFullCommanderIdentity: deckColors.every((color) => availableMana.colorCounts[color] > 0),
      });

      commanderStats.forEach((stats, index) => {
        if (earliestCastTurns[index] !== null) return;
        if (manaByTurn[turn - 1].totalMana >= stats.requirements.total && canPayManaCost(availableMana, stats.requirements)) {
          earliestCastTurns[index] = turn;
        }
      });
    }

    commanderStats.forEach((stats, index) => {
      const castTurn = earliestCastTurns[index];
      const castableOnCurve = castTurn !== null && castTurn <= stats.targetTurn;

      if (castableOnCurve) {
        stats.commanderCastableOnCurve += 1;
        stats.castableByTarget += 1;
      } else if (castTurn === null) {
        stats.failureBreakdown.not_castable_by_turn_8 += 1;
      } else {
        const failureReason = evaluateCommanderFailureReasonByTarget(
          availableManaByTurn,
          stats.requirements,
          stats.targetTurn,
        );
        stats.failureBreakdown[failureReason] += 1;
      }

      if (castTurn !== null) {
        stats.earliestCommanderCastTurnSum += castTurn;
        stats.earliestCommanderCastTurnCount += 1;
        stats.castableBy8 += 1;
        stats.castableTurnSum += castTurn;
        stats.castableTurnCount += 1;
      }
    });

    if (earliestCastTurns.length === 2 && earliestCastTurns.every((turn) => turn !== null && turn <= 8)) {
      bothBy8 += 1;
    }
  }

  return {
    iterations,
    commanders: commanderStats.map((stats) => ({
      ...stats,
      averageEarliestCommanderCastTurn:
        stats.earliestCommanderCastTurnCount > 0
          ? stats.earliestCommanderCastTurnSum / stats.earliestCommanderCastTurnCount
          : null,
      earliestCommanderCastTurn:
        stats.earliestCommanderCastTurnCount > 0
          ? stats.earliestCommanderCastTurnSum / stats.earliestCommanderCastTurnCount
          : null,
      failureReason: { ...stats.failureBreakdown },
      failureReasonBreakdown: { ...stats.failureBreakdown },
      averageCastableTurn:
        stats.castableTurnCount > 0 ? stats.castableTurnSum / stats.castableTurnCount : null,
    })),
    bothBy8,
  };
}

const exported = {
  buildManaByTurn,
  buildSimulationModel,
  buildLibrary,
  buildLibraryCards,
  chooseLandsForTurn,
  createEmptyDistribution,
  createManaTimelineStats,
  createOpeningHandStats,
  drawCards,
  drawHand,
  evaluateCommanderFailureReasonByTarget,
  getAvailableManaForTurn,
  getCastableSpellsForTurn,
  getCommanderTargetTurn,
  getVisibleCardsForTurn,
  hasCommanderColors,
  markCommandZoneCards,
  recordManaTimelineStats,
  recordOpeningHandStats,
  simulateColorAccess,
  simulateCommanderCastAccess,
  simulateCurveAccess,
  summarizeHand,
};

if (typeof module !== "undefined") {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.EDHCardDomain.simulation = exported;
}
})();
