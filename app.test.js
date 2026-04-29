const assert = require("assert");
const {
  buildLibrary,
  buildLibraryCards,
  canPayManaCost,
  classifyCard,
  detectCommandersFromSections,
  drawHand,
  getCommanderColorIdentity,
  getManaCostRequirements,
  getProducedColors,
  getRelevantColors,
  hasOtag,
  runSimulation,
  simulateCommanderCastAccess,
  simulateColorAccess,
  summarizeDeck,
  summarizeRoleCounts,
} = require("./app.js");

function mockCard(name, typeLine, otags = [], extraScryfall = {}) {
  return classifyCard({
    count: 1,
    name,
    section: "main",
    tags: [],
    scryfall: { type_line: typeLine, ...extraScryfall },
    otags,
  });
}

const cultivate = mockCard("Cultivate", "Sorcery", ["ramp"]);
const rhysticStudy = mockCard("Rhystic Study", "Enchantment", ["card-draw"]);
const swords = mockCard("Swords to Plowshares", "Instant", ["removal"]);
const demonicTutor = mockCard("Demonic Tutor", "Sorcery", ["tutor"]);
const wrath = mockCard("Wrath of God", "Sorcery", ["board-wipe"]);
const commandTower = mockCard("Command Tower", "Land", []);
const forest = mockCard("Forest", "Basic Land - Forest", [], { produced_mana: ["G"] });
const fakeLandOtag = mockCard("Not a Land", "Artifact", ["land"]);
const balaGedRecovery = mockCard("Bala Ged Recovery // Bala Ged Sanctuary", "Sorcery // Land", [], {
  card_faces: [
    { name: "Bala Ged Recovery", type_line: "Sorcery" },
    { name: "Bala Ged Sanctuary", type_line: "Land" },
  ],
});
const seaGateRestoration = mockCard("Sea Gate Restoration // Sea Gate, Reborn", "Sorcery // Land", [], {
  card_faces: [
    { name: "Sea Gate Restoration", type_line: "Sorcery" },
    { name: "Sea Gate, Reborn", type_line: "Land" },
  ],
});
const valakutAwakening = mockCard("Valakut Awakening // Valakut Stoneforge", "Instant // Land", [], {
  card_faces: [
    { name: "Valakut Awakening", type_line: "Instant" },
    { name: "Valakut Stoneforge", type_line: "Land" },
  ],
});
const frontFaceLandDfc = mockCard("Front Face Land // Back Face Spell", "Land // Sorcery", [], {
  card_faces: [
    { name: "Front Face Land", type_line: "Land" },
    { name: "Back Face Spell", type_line: "Sorcery" },
  ],
});
const monoBlackCommander = mockCard("Tinybones", "Legendary Creature", [], {
  color_identity: ["B"],
  colors: ["B"],
});
const orzhovCommander = mockCard("Teysa Karlov", "Legendary Creature", [], {
  color_identity: ["W", "B"],
  colors: ["W", "B"],
});
const fiveColorCommander = mockCard("Kenrith, the Returned King", "Legendary Creature", [], {
  color_identity: ["W", "U", "B", "R", "G"],
  colors: ["W"],
});
const tasigur = mockCard("Tasigur, the Golden Fang", "Legendary Creature", [], {
  color_identity: ["B", "G", "U"],
  colors: ["B"],
});
const redPartner = mockCard("Rograkh, Son of Rohgahh", "Legendary Creature", [], {
  color_identity: ["R"],
  colors: ["R"],
});
const greenPartner = mockCard("Tana, the Bloodsower", "Legendary Creature", [], {
  color_identity: ["G"],
  colors: ["R", "G"],
});

assert.equal(hasOtag(cultivate, "ramp"), true);
assert.equal(hasOtag(rhysticStudy, "card-draw"), true);
assert.equal(hasOtag(swords, "removal"), true);
assert.equal(hasOtag(demonicTutor, "tutor"), true);
assert.equal(hasOtag(wrath, "board-wipe"), true);

assert.equal(cultivate.isRamp, true);
assert.equal(rhysticStudy.isLand, false);
assert.equal(commandTower.isLand, true);
assert.equal(forest.isLand, true);
assert.equal(fakeLandOtag.isLand, false);
assert.equal(balaGedRecovery.isLand, false);
assert.equal(seaGateRestoration.isLand, false);
assert.equal(valakutAwakening.isLand, false);
assert.equal(frontFaceLandDfc.isLand, true);

const roleCounts = summarizeRoleCounts([
  cultivate,
  rhysticStudy,
  swords,
  demonicTutor,
  wrath,
  commandTower,
]);

assert.equal(roleCounts.ramp, 1);
assert.equal(roleCounts["card-draw"], 1);
assert.equal(roleCounts.removal, 1);
assert.equal(roleCounts.tutor, 1);
assert.equal(roleCounts["board-wipe"], 1);

assert.deepEqual(getCommanderColorIdentity([monoBlackCommander]), ["B"]);
assert.deepEqual(getCommanderColorIdentity([orzhovCommander]), ["W", "B"]);
assert.deepEqual(getCommanderColorIdentity([fiveColorCommander]), ["W", "U", "B", "R", "G"]);
assert.deepEqual(getCommanderColorIdentity([tasigur]), ["U", "B", "G"]);
assert.deepEqual(getCommanderColorIdentity([redPartner, greenPartner]), ["R", "G"]);
assert.deepEqual(getRelevantColors([]), []);

const parsedWithCommanderSection = {
  cards: [
    { ...monoBlackCommander, section: "commander" },
    { ...cultivate, section: "sorceries" },
  ],
};
assert.equal(detectCommandersFromSections(parsedWithCommanderSection).length, 1);

const island = mockCard("Island", "Basic Land - Island", [], { produced_mana: ["U"] });
const solRing = mockCard("Sol Ring", "Artifact", ["ramp"], {
  mana_cost: "{1}",
  produced_mana: ["C"],
});
const arcaneSignet = mockCard("Arcane Signet", "Artifact", ["ramp"], {
  mana_cost: "{2}",
  produced_mana: ["W", "U", "B", "R", "G"],
});

assert.deepEqual(getProducedColors(forest), ["G"]);
assert.deepEqual(getProducedColors(island), ["U"]);
assert.deepEqual(getProducedColors(commandTower, ["U", "B"]), ["U", "B"]);
assert.deepEqual(getProducedColors(solRing, ["U", "B"]), ["C"]);
assert.deepEqual(getProducedColors(arcaneSignet, ["U", "B"]), ["U", "B"]);

function mockSpell(name, manaCost) {
  return mockCard(name, "Sorcery", [], { mana_cost: manaCost });
}

assert.deepEqual(getManaCostRequirements(mockSpell("Fireball", "{X}{R}")), {
  manaCost: "{X}{R}",
  generic: 3,
  colors: { W: 0, U: 0, B: 0, R: 1, G: 0 },
  colorPips: 1,
  xCount: 1,
  total: 4,
});
assert.equal(getManaCostRequirements(mockSpell("Torment of Hailfire", "{X}{B}{B}")).total, 5);
assert.equal(getManaCostRequirements(mockSpell("Finale of Devastation", "{X}{G}{G}")).total, 5);
assert.equal(getManaCostRequirements(mockSpell("Double X", "{X}{X}{G}")).total, 5);
assert.equal(getManaCostRequirements(mockSpell("Triple X", "{X}{X}{X}{G}")).total, 4);
assert.equal(getManaCostRequirements(mockSpell("Torment of Hailfire", "{X}{B}{B}")).colors.B, 2);
assert.equal(getManaCostRequirements(mockSpell("Finale of Devastation", "{X}{G}{G}")).colors.G, 2);

assert.equal(
  canPayManaCost(
    { total: 2, sources: [{ colors: ["B"] }, { colors: ["C"] }] },
    getManaCostRequirements(mockSpell("Sign in Blood", "{B}{B}")),
  ),
  false,
);
assert.equal(
  canPayManaCost(
    { total: 3, sources: [{ colors: ["G"] }, { colors: ["C"] }, { colors: ["C"] }] },
    getManaCostRequirements(mockSpell("Cultivate", "{2}{G}")),
  ),
  true,
);

const monoBlackColorRun = simulateColorAccess(
  [
    mockCard("Swamp", "Basic Land - Swamp", [], {
      produced_mana: ["B"],
      color_identity: [],
    }),
    mockSpell("Sign in Blood", "{B}{B}"),
  ],
  5,
  ["B"],
);
assert.deepEqual(monoBlackColorRun.deckColors, ["B"]);

const noCommanderColorRun = simulateColorAccess([forest], 5, []);
assert.deepEqual(noCommanderColorRun.deckColors, []);

function cardWithCount(card, count, section = "main") {
  return { ...card, count, section };
}

function totalCopies(cards) {
  return cards.reduce((sum, card) => sum + card.count, 0);
}

const oneCommanderDeck = [
  cardWithCount(monoBlackCommander, 1, "commander"),
  cardWithCount(forest, 99),
];
const oneCommanderSelection = detectCommandersFromSections({ cards: oneCommanderDeck });
const oneCommanderLibraryCards = buildLibraryCards(oneCommanderDeck, oneCommanderSelection);
const oneCommanderLibrary = buildLibrary(oneCommanderDeck, oneCommanderSelection);
assert.equal(totalCopies(oneCommanderLibraryCards), 99);
assert.equal(oneCommanderLibrary.length, 99);
assert.equal(oneCommanderLibrary.some((card) => card.name === monoBlackCommander.name), false);
assert.equal(drawHand(oneCommanderLibrary, 7).some((card) => card.name === monoBlackCommander.name), false);

const partnerDeck = [
  cardWithCount(redPartner, 1, "commander"),
  cardWithCount(greenPartner, 1, "commander"),
  cardWithCount(forest, 98),
];
const partnerSelection = detectCommandersFromSections({ cards: partnerDeck });
const partnerLibrary = buildLibrary(partnerDeck, partnerSelection);
assert.equal(partnerLibrary.length, 98);
assert.equal(partnerLibrary.some((card) => card.name === redPartner.name || card.name === greenPartner.name), false);
assert.equal(drawHand(partnerLibrary, 7).some((card) => card.section === "commander"), false);

const landCommander = mockCard("The Land Commander", "Legendary Land", [], {
  color_identity: [],
});
const landCommanderDeck = [
  cardWithCount(landCommander, 1, "commander"),
  cardWithCount(forest, 99),
];
const landCommanderTotals = summarizeDeck(landCommanderDeck, [landCommanderDeck[0]]);
assert.equal(landCommanderTotals.total, 100);
assert.equal(landCommanderTotals.library, 99);
assert.equal(landCommanderTotals.lands, 99);

const duplicatedCommanderDeck = [
  cardWithCount(monoBlackCommander, 1, "commander"),
  cardWithCount(monoBlackCommander, 1),
  cardWithCount(forest, 99),
];
const duplicatedCommanderLibrary = buildLibrary(
  duplicatedCommanderDeck,
  detectCommandersFromSections({ cards: duplicatedCommanderDeck }),
);
const duplicatedCommanderTotals = summarizeDeck(
  duplicatedCommanderDeck,
  detectCommandersFromSections({ cards: duplicatedCommanderDeck }),
);
assert.equal(duplicatedCommanderLibrary.some((card) => card.name === monoBlackCommander.name), false);
assert.equal(duplicatedCommanderTotals.total, 100);
assert.equal(duplicatedCommanderTotals.commanders, 1);

const manualCommanderLibrary = buildLibrary([cardWithCount(monoBlackCommander, 1), cardWithCount(forest, 99)], [
  monoBlackCommander,
]);
assert.equal(manualCommanderLibrary.length, 99);
assert.equal(manualCommanderLibrary.some((card) => card.name === monoBlackCommander.name), false);

const partnerColorRun = simulateColorAccess(partnerLibrary, 5, getCommanderColorIdentity(partnerSelection));
assert.deepEqual(partnerColorRun.deckColors, ["R", "G"]);

const mountain = mockCard("Mountain", "Basic Land - Mountain", [], { produced_mana: ["R"] });
const wastes = mockCard("Wastes", "Basic Land - Wastes", [], { produced_mana: ["C"] });
const rgDual = mockCard("RG Dual", "Land", [], { produced_mana: ["R", "G"] });

const redCommander = mockCard("Red Commander", "Legendary Creature", [], {
  mana_cost: "{3}{R}",
  color_identity: ["R"],
});
const greenCommander = mockCard("Green Commander", "Legendary Creature", [], {
  mana_cost: "{1}{G}",
  color_identity: ["G"],
});
const blackCommander = mockCard("Black Commander", "Legendary Creature", [], {
  mana_cost: "{2}{B}",
  color_identity: ["B"],
});
const bigCommander = mockCard("Big Commander", "Legendary Creature", [], {
  mana_cost: "{9}{G}",
  color_identity: ["G"],
});
const xCommander = mockCard("X Commander", "Legendary Creature", [], {
  mana_cost: "{X}{R}",
  color_identity: ["R"],
});
const colorlessCommander = mockCard("Colorless Commander", "Legendary Creature", [], {
  mana_cost: "{4}",
  color_identity: [],
});

const redLibrary = buildLibrary([cardWithCount(mountain, 99)]);
const redCommanderRun = simulateCommanderCastAccess(redLibrary, [redCommander], 5, ["R"]);
assert.equal(redCommanderRun.commanders.length, 1);
assert.equal(redCommanderRun.commanders[0].targetTurn, 4);
assert.equal(redCommanderRun.commanders[0].castableByTarget, 5);
assert.equal(redCommanderRun.commanders[0].averageCastableTurn, 4);

const partnerLibraryForCast = buildLibrary([cardWithCount(rgDual, 99)]);
const partnerCommanderRun = simulateCommanderCastAccess(
  partnerLibraryForCast,
  [redCommander, greenCommander],
  5,
  ["R", "G"],
);
assert.equal(partnerCommanderRun.commanders.length, 2);
assert.equal(partnerCommanderRun.bothBy8, 5);

const blackCommanderRun = simulateCommanderCastAccess(redLibrary, [blackCommander], 5, ["B"]);
assert.equal(blackCommanderRun.commanders[0].castableBy8, 0);
assert.equal(blackCommanderRun.commanders[0].averageCastableTurn, null);

const bigCommanderRun = simulateCommanderCastAccess(buildLibrary([cardWithCount(forest, 99)]), [bigCommander], 5, ["G"]);
assert.equal(bigCommanderRun.commanders[0].targetTurn, 8);
assert.equal(bigCommanderRun.commanders[0].castableByTarget, 0);

const xCommanderRun = simulateCommanderCastAccess(redLibrary, [xCommander], 5, ["R"]);
assert.equal(xCommanderRun.commanders[0].targetTurn, 4);
assert.equal(xCommanderRun.commanders[0].castableByTarget, 5);

const colorlessCommanderRun = simulateCommanderCastAccess(
  buildLibrary([cardWithCount(wastes, 99)]),
  [colorlessCommander],
  5,
  [],
);
assert.equal(colorlessCommanderRun.commanders[0].targetTurn, 4);
assert.equal(colorlessCommanderRun.commanders[0].castableByTarget, 5);

const allForestTimelineRun = runSimulation(buildLibrary([cardWithCount(forest, 99)]), {
  simulations: 5,
  handSize: 7,
});
assert.equal(allForestTimelineRun.manaDevelopment.turns.length, 8);
assert.equal(allForestTimelineRun.manaDevelopment.turns[0].averageAvailableMana, 1);
assert.equal(allForestTimelineRun.manaDevelopment.turns[1].averageAvailableMana, 2);
assert.equal(allForestTimelineRun.manaDevelopment.turns[7].averageAvailableMana, 8);
assert.equal(allForestTimelineRun.manaDevelopment.turns[1].atLeastThresholdCount, 5);
assert.equal(allForestTimelineRun.manaDevelopment.turns[7].atLeastThresholdCount, 5);

console.log("otag-role-tests-ok");
