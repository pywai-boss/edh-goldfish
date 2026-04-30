const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildLibrary,
  buildLibraryCards,
  canCardsFormLegalPartnerPair,
  classifyCard,
  detectCommandersFromSections,
  getCommanderOptions,
  getCommanderPreviewImageUrl,
  runSimulation,
  simulateColorAccess,
  simulateCurveAccess,
  simulateCommanderCastAccess,
  getCommanderColorIdentity,
  parseDeck,
  summarizeDeck,
  validateCommanderDeckLegality,
} = require("../app.js");

function fixtureCard(name, typeLine, extraScryfall = {}, section = "main", count = 1, otags = []) {
  return classifyCard({
    name,
    count,
    section,
    tags: [],
    otags,
    scryfall: {
      type_line: typeLine,
      ...extraScryfall,
    },
  });
}

function expandLibrary(cards) {
  return buildLibrary(cards.map((card) => ({ ...card, section: card.section || "main" })));
}

function makeManaOnlyFixture() {
  return expandLibrary([
    fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }, "main", 5),
    fixtureCard("Llanowar Elves", "Creature - Elf Druid", { mana_cost: "{G}", produced_mana: ["G"] }, "main", 1, [
      "ramp",
    ]),
    fixtureCard("Elvish Mystic", "Creature - Elf Druid", { mana_cost: "{G}", produced_mana: ["G"] }, "main", 1, [
      "ramp",
    ]),
  ]);
}

function makeColorAccessFixture() {
  return expandLibrary([
    fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }),
    fixtureCard("Island", "Basic Land - Island", { produced_mana: ["U"] }),
    fixtureCard("Command Tower", "Land", { produced_mana: ["W", "U", "B", "R", "G"] }),
    fixtureCard("Simic Signet", "Artifact", { mana_cost: "{2}", produced_mana: ["G", "U"] }, "main", 1, ["ramp"]),
    fixtureCard("Growth Spiral", "Instant", { mana_cost: "{G}{U}" }),
    fixtureCard("Counterspell", "Instant", { mana_cost: "{U}{U}" }),
  ]);
}

function makeCommanderFixture() {
  const commander = fixtureCard(
    "Aesi, Tyrant of Gyre Strait",
    "Legendary Creature - Serpent",
    { mana_cost: "{4}{G}{U}", color_identity: ["G", "U"] },
    "commander",
    1,
  );

  const cards = [
    commander,
    fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }),
    fixtureCard("Island", "Basic Land - Island", { produced_mana: ["U"] }),
    fixtureCard("Command Tower", "Land", { produced_mana: ["W", "U", "B", "R", "G"] }),
    fixtureCard("Sol Ring", "Artifact", { mana_cost: "{1}", produced_mana: ["C"] }, "main", 1, ["ramp"]),
    fixtureCard(
      "Arcane Signet",
      "Artifact",
      { mana_cost: "{2}", produced_mana: ["W", "U", "B", "R", "G"] },
      "main",
      1,
      ["ramp"],
    ),
    fixtureCard("Cultivate", "Sorcery", { mana_cost: "{2}{G}" }, "main", 1, ["ramp"]),
    fixtureCard("Growth Spiral", "Instant", { mana_cost: "{G}{U}" }),
  ];

  return { cards, commander };
}

function makeCastabilityFixture() {
  return expandLibrary([
    fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }),
    fixtureCard("Llanowar Elves", "Creature - Elf Druid", { mana_cost: "{G}", produced_mana: ["G"] }, "main", 1, [
      "ramp",
    ]),
    fixtureCard("Elvish Mystic", "Creature - Elf Druid", { mana_cost: "{G}", produced_mana: ["G"] }, "main", 1, [
      "ramp",
    ]),
    fixtureCard("Rampant Growth", "Sorcery", { mana_cost: "{1}{G}" }, "main", 1, ["ramp"]),
    fixtureCard("Cultivate", "Sorcery", { mana_cost: "{2}{G}" }, "main", 1, ["ramp"]),
    fixtureCard("Beast Within", "Instant", { mana_cost: "{2}{G}" }),
  ]);
}

function makeParsedDeck(cards, commanders = []) {
  return {
    cards,
    totals: summarizeDeck(cards, commanders),
  };
}

test("simulation runs and exposes stable mana timeline shape", () => {
  const library = makeManaOnlyFixture();
  const result = runSimulation(library, { simulations: 25, handSize: 7 });

  assert.equal(typeof result, "object");
  assert.equal(result.manaByTurn.length, 8);
  assert.deepEqual(
    result.manaByTurn.map((entry) => entry.turn),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.ok(result.simulationFeatures);
  assert.equal(result.simulationFeatures.manaByTurn.length, 8);
  assert.ok(Array.isArray(result.simulationFeatures.colorsByTurn));
});

test("color access simulation exposes turn 1-8 color timelines", () => {
  const library = makeColorAccessFixture();
  const colorResult = simulateColorAccess(library, 25, ["G", "U"]);

  assert.equal(colorResult.colorsByTurn.length, 8);
  assert.equal(colorResult.fullCommanderColorAccessByTurn.length, 8);
  assert.deepEqual(
    colorResult.colorsByTurn.map((entry) => entry.turn),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.ok(colorResult.simulationFeatures);
  assert.equal(colorResult.simulationFeatures.colorsByTurn.length, 8);
  assert.equal(colorResult.simulationFeatures.fullCommanderColorAccessByTurn.length, 8);
});

test("commander can be excluded from simulation library", () => {
  const { cards, commander } = makeCommanderFixture();
  const detectedCommanders = detectCommandersFromSections({ cards });
  const libraryCards = buildLibraryCards(cards, detectedCommanders);
  const library = buildLibrary(cards, detectedCommanders);

  assert.equal(detectedCommanders.length, 1);
  assert.equal(detectedCommanders[0].name, commander.name);
  assert.equal(libraryCards.some((card) => card.name === commander.name), false);
  assert.equal(library.some((card) => card.name === commander.name), false);
});

test("castability output exists and exposes canonical fields", () => {
  const library = makeCastabilityFixture();
  const curveResult = simulateCurveAccess(library, 25, ["G"]);

  assert.equal(curveResult.turns.length, 8);
  assert.ok(curveResult.castabilityByTurn);
  assert.equal(curveResult.castabilityByTurn.length, 8);
  assert.ok(curveResult.simulationFeatures);
  assert.equal(curveResult.simulationFeatures.castabilityByTurn.length, 8);
  assert.equal(
    typeof curveResult.castabilityByTurn[0].onCurveSpellByTurnCost,
    "number",
  );
});

test("commander castability simulation returns stable output shape", () => {
  const { cards } = makeCommanderFixture();
  const detectedCommanders = detectCommandersFromSections({ cards });
  const commanderColors = getCommanderColorIdentity(detectedCommanders);
  const library = buildLibrary(cards, detectedCommanders);
  const commanderResult = simulateCommanderCastAccess(library, detectedCommanders, 25, commanderColors);

  assert.ok(commanderResult);
  assert.equal(commanderResult.commanders.length, 1);
  assert.equal(typeof commanderResult.commanders[0].targetTurn, "number");
  assert.ok(Object.hasOwn(commanderResult.commanders[0], "castableByTarget"));
  assert.ok(Object.hasOwn(commanderResult.commanders[0], "commanderCastableOnCurve"));
  assert.ok(Object.hasOwn(commanderResult.commanders[0], "earliestCommanderCastTurn"));
  assert.ok(Object.hasOwn(commanderResult.commanders[0], "averageEarliestCommanderCastTurn"));
  assert.ok(Object.hasOwn(commanderResult.commanders[0], "failureBreakdown"));
  assert.ok(Object.hasOwn(commanderResult.commanders[0], "failureReason"));
  assert.ok(Object.hasOwn(commanderResult.commanders[0], "castableBy8"));
});

test("commander section preselect detection supports one or two commanders", () => {
  const singleCommanderDeck = parseDeck("COMMANDER\n1 Aesi, Tyrant of Gyre Strait\n\nLANDS\n1 Forest");
  assert.equal(detectCommandersFromSections(singleCommanderDeck).length, 1);

  const partnerDeck = parseDeck("COMMANDERS\n1 Tymna the Weaver\n1 Thrasios, Triton Hero\n\nLANDS\n1 Forest");
  assert.equal(detectCommandersFromSections(partnerDeck).length, 2);
});

test("missing commander section uses filtered commander candidate list", () => {
  const parsed = parseDeck(
    "CREATURES\n1 Meren of Clan Nel Toth\n1 Llanowar Elves\n\nSORCERIES\n1 Cultivate\n\nLANDS\n1 Forest",
  );
  const enriched = {
    ...parsed,
    cards: parsed.cards.map((card) => {
      if (card.name === "Meren of Clan Nel Toth") {
        return {
          ...card,
          typeLines: ["Legendary Creature - Human Shaman"],
        };
      }
      if (card.name === "Llanowar Elves") {
        return {
          ...card,
          typeLines: ["Creature - Elf Druid"],
        };
      }
      return card;
    }),
  };
  const options = getCommanderOptions(enriched);
  assert.equal(options.some((card) => card.name === "Meren of Clan Nel Toth"), true);
  assert.equal(options.some((card) => card.name === "Llanowar Elves"), false);
});

test("mardu deck filtering excludes mono-white and includes mardu commander", () => {
  const marduCommander = fixtureCard(
    "Mardu Leader",
    "Legendary Creature - Human",
    { color_identity: ["W", "B", "R"], mana_cost: "{1}{W}{B}{R}" },
  );
  const monoWhiteCommander = fixtureCard(
    "Mono White Leader",
    "Legendary Creature - Human",
    { color_identity: ["W"], mana_cost: "{2}{W}" },
  );
  const parsed = {
    cards: [
      marduCommander,
      monoWhiteCommander,
      fixtureCard("Boros Charm", "Instant", { mana_cost: "{R}{W}" }),
      fixtureCard("Terminate", "Instant", { mana_cost: "{B}{R}" }),
      fixtureCard("Swamp", "Basic Land - Swamp", { produced_mana: ["B"] }),
      fixtureCard("Mountain", "Basic Land - Mountain", { produced_mana: ["R"] }),
      fixtureCard("Plains", "Basic Land - Plains", { produced_mana: ["W"] }),
    ],
  };

  const options = getCommanderOptions(parsed);
  assert.equal(options.some((card) => card.name === "Mardu Leader"), true);
  assert.equal(options.some((card) => card.name === "Mono White Leader"), false);
});

test("simic deck accepts a single UG commander candidate", () => {
  const ugCommander = fixtureCard(
    "Simic Leader",
    "Legendary Creature - Merfolk",
    { color_identity: ["G", "U"], mana_cost: "{2}{G}{U}" },
  );
  const parsed = {
    cards: [
      ugCommander,
      fixtureCard("Growth Spiral", "Instant", { mana_cost: "{G}{U}" }),
      fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }),
      fixtureCard("Island", "Basic Land - Island", { produced_mana: ["U"] }),
    ],
  };
  const options = getCommanderOptions(parsed).map((card) => card.name);
  assert.equal(options.includes("Simic Leader"), true);
});

test("simic deck accepts one G partner plus one U partner as candidates", () => {
  const greenPartner = fixtureCard(
    "Green Partner",
    "Legendary Creature - Elf",
    { color_identity: ["G"], oracle_text: "Partner (You can have two commanders if both have partner.)" },
  );
  const bluePartner = fixtureCard(
    "Blue Partner",
    "Legendary Creature - Wizard",
    { color_identity: ["U"], oracle_text: "Partner (You can have two commanders if both have partner.)" },
  );
  const parsed = {
    cards: [
      greenPartner,
      bluePartner,
      fixtureCard("Growth Spiral", "Instant", { mana_cost: "{G}{U}" }),
      fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }),
      fixtureCard("Island", "Basic Land - Island", { produced_mana: ["U"] }),
    ],
  };
  const options = getCommanderOptions(parsed).map((card) => card.name);
  assert.equal(options.includes("Green Partner"), true);
  assert.equal(options.includes("Blue Partner"), true);
  assert.equal(canCardsFormLegalPartnerPair(greenPartner, bluePartner), true);
});

test("simic deck rejects non-partner G+U pair suggestions", () => {
  const greenLegend = fixtureCard(
    "Green Legend",
    "Legendary Creature - Elf",
    { color_identity: ["G"] },
  );
  const blueLegend = fixtureCard(
    "Blue Legend",
    "Legendary Creature - Wizard",
    { color_identity: ["U"] },
  );
  const parsed = {
    cards: [
      greenLegend,
      blueLegend,
      fixtureCard("Growth Spiral", "Instant", { mana_cost: "{G}{U}" }),
      fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }),
      fixtureCard("Island", "Basic Land - Island", { produced_mana: ["U"] }),
    ],
  };
  const options = getCommanderOptions(parsed);
  assert.equal(options.length, 0);
  assert.equal(canCardsFormLegalPartnerPair(greenLegend, blueLegend), false);
});

test("three-color deck accepts partner pair whose combined colors cover all colors", () => {
  const partnerGruul = fixtureCard(
    "Gruul Partner",
    "Legendary Creature - Human",
    { color_identity: ["R", "G"], oracle_text: "Partner (You can have two commanders if both have partner.)" },
  );
  const partnerBlue = fixtureCard(
    "Blue Partner",
    "Legendary Creature - Merfolk",
    { color_identity: ["U"], oracle_text: "Partner (You can have two commanders if both have partner.)" },
  );
  const parsed = {
    cards: [
      partnerGruul,
      partnerBlue,
      fixtureCard("Growth Spiral", "Instant", { mana_cost: "{G}{U}" }),
      fixtureCard("Lightning Bolt", "Instant", { mana_cost: "{R}" }),
      fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }),
      fixtureCard("Island", "Basic Land - Island", { produced_mana: ["U"] }),
      fixtureCard("Mountain", "Basic Land - Mountain", { produced_mana: ["R"] }),
    ],
  };
  const options = getCommanderOptions(parsed).map((card) => card.name);
  assert.equal(options.includes("Gruul Partner"), true);
  assert.equal(options.includes("Blue Partner"), true);
});

test("five-color deck accepts partner pair whose combined colors cover WUBRG", () => {
  const partnerWub = fixtureCard(
    "Esper Partner",
    "Legendary Creature - Human",
    { color_identity: ["W", "U", "B"], oracle_text: "Partner (You can have two commanders if both have partner.)" },
  );
  const partnerRg = fixtureCard(
    "Gruul Partner",
    "Legendary Creature - Human",
    { color_identity: ["R", "G"], oracle_text: "Partner (You can have two commanders if both have partner.)" },
  );
  const parsed = {
    cards: [
      partnerWub,
      partnerRg,
      fixtureCard("Naya Charm", "Instant", { mana_cost: "{R}{G}{W}" }),
      fixtureCard("Counterspell", "Instant", { mana_cost: "{U}{U}" }),
      fixtureCard("Terminate", "Instant", { mana_cost: "{B}{R}" }),
      fixtureCard("Plains", "Basic Land - Plains", { produced_mana: ["W"] }),
      fixtureCard("Island", "Basic Land - Island", { produced_mana: ["U"] }),
      fixtureCard("Swamp", "Basic Land - Swamp", { produced_mana: ["B"] }),
      fixtureCard("Mountain", "Basic Land - Mountain", { produced_mana: ["R"] }),
      fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }),
    ],
  };
  const options = getCommanderOptions(parsed).map((card) => card.name);
  assert.equal(options.includes("Esper Partner"), true);
  assert.equal(options.includes("Gruul Partner"), true);
});

test("mono-color deck can suggest mono-color commander", () => {
  const monoGreenCommander = fixtureCard(
    "Mono Green Leader",
    "Legendary Creature - Elf",
    { color_identity: ["G"], mana_cost: "{2}{G}" },
  );
  const parsed = {
    cards: [
      monoGreenCommander,
      fixtureCard("Llanowar Elves", "Creature - Elf Druid", { mana_cost: "{G}" }),
      fixtureCard("Cultivate", "Sorcery", { mana_cost: "{2}{G}" }),
      fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"] }),
    ],
  };

  const options = getCommanderOptions(parsed);
  assert.equal(options.some((card) => card.name === "Mono Green Leader"), true);
});

test("missing candidate color metadata does not crash commander filtering", () => {
  const parsed = {
    cards: [
      fixtureCard("Unknown Legend", "Legendary Creature - Human", {}),
      fixtureCard("Rakdos Charm", "Instant", { mana_cost: "{B}{R}" }),
      fixtureCard("Swamp", "Basic Land - Swamp", { produced_mana: ["B"] }),
      fixtureCard("Mountain", "Basic Land - Mountain", { produced_mana: ["R"] }),
    ],
  };

  const options = getCommanderOptions(parsed);
  assert.ok(Array.isArray(options));
});

test("legal 100-card single commander deck passes legality validation", () => {
  const commander = fixtureCard(
    "Mono Black Commander",
    "Legendary Creature - Human",
    { color_identity: ["B"], mana_cost: "{3}{B}" },
    "commander",
  );
  const cards = [
    commander,
    fixtureCard("Swamp", "Basic Land - Swamp", { produced_mana: ["B"], color_identity: ["B"] }, "main", 99),
  ];
  const parsed = makeParsedDeck(cards, [commander]);
  const report = validateCommanderDeckLegality(parsed, [commander]);
  assert.equal(report.isLegal, true);
  assert.equal(report.issues.length, 0);
});

test("legal 98-card library plus 2 partner commanders passes legality validation", () => {
  const commanderA = fixtureCard(
    "Green Partner",
    "Legendary Creature - Elf",
    { color_identity: ["G"], oracle_text: "Partner (You can have two commanders if both have partner.)" },
    "commander",
  );
  const commanderB = fixtureCard(
    "Blue Partner",
    "Legendary Creature - Merfolk",
    { color_identity: ["U"], oracle_text: "Partner (You can have two commanders if both have partner.)" },
    "commander",
  );
  const cards = [
    commanderA,
    commanderB,
    fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"], color_identity: ["G"] }, "main", 98),
  ];
  const parsed = makeParsedDeck(cards, [commanderA, commanderB]);
  const report = validateCommanderDeckLegality(parsed, [commanderA, commanderB]);
  assert.equal(report.isLegal, true);
  assert.equal(report.issues.length, 0);
});

test("invalid deck size is flagged", () => {
  const commander = fixtureCard(
    "Mono Green Commander",
    "Legendary Creature - Elf",
    { color_identity: ["G"], mana_cost: "{2}{G}" },
    "commander",
  );
  const cards = [
    commander,
    fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"], color_identity: ["G"] }, "main", 100),
  ];
  const parsed = makeParsedDeck(cards, [commander]);
  const report = validateCommanderDeckLegality(parsed, [commander]);
  assert.equal(report.isLegal, false);
  assert.equal(report.issues.some((issue) => issue.type === "deck_size"), true);
});

test("card outside commander color identity is flagged", () => {
  const commander = fixtureCard(
    "Mono Green Commander",
    "Legendary Creature - Elf",
    { color_identity: ["G"], mana_cost: "{2}{G}" },
    "commander",
  );
  const cards = [
    commander,
    fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"], color_identity: ["G"] }, "main", 98),
    fixtureCard("Island", "Basic Land - Island", { produced_mana: ["U"], color_identity: ["U"] }, "main", 1),
  ];
  const parsed = makeParsedDeck(cards, [commander]);
  const report = validateCommanderDeckLegality(parsed, [commander]);
  assert.equal(report.isLegal, false);
  assert.equal(report.issues.some((issue) => issue.type === "color_identity"), true);
  const colorIssue = report.issues.find((issue) => issue.type === "color_identity");
  assert.equal(colorIssue.cards.includes("Island"), true);
});

test("invalid two-commander pair is flagged", () => {
  const commanderA = fixtureCard(
    "Green Legend",
    "Legendary Creature - Elf",
    { color_identity: ["G"] },
    "commander",
  );
  const commanderB = fixtureCard(
    "Blue Legend",
    "Legendary Creature - Merfolk",
    { color_identity: ["U"] },
    "commander",
  );
  const cards = [
    commanderA,
    commanderB,
    fixtureCard("Forest", "Basic Land - Forest", { produced_mana: ["G"], color_identity: ["G"] }, "main", 49),
    fixtureCard("Island", "Basic Land - Island", { produced_mana: ["U"], color_identity: ["U"] }, "main", 49),
  ];
  const parsed = makeParsedDeck(cards, [commanderA, commanderB]);
  const report = validateCommanderDeckLegality(parsed, [commanderA, commanderB]);
  assert.equal(report.isLegal, false);
  assert.equal(report.issues.some((issue) => issue.type === "commander_pair"), true);
});

test("banned card metadata is flagged", () => {
  const commander = fixtureCard(
    "Mono Red Commander",
    "Legendary Creature - Human",
    { color_identity: ["R"], mana_cost: "{2}{R}" },
    "commander",
  );
  const cards = [
    commander,
    fixtureCard("Mountain", "Basic Land - Mountain", { produced_mana: ["R"], color_identity: ["R"] }, "main", 98),
    fixtureCard(
      "Dockside Extortionist",
      "Creature - Goblin Pirate",
      { mana_cost: "{1}{R}", color_identity: ["R"], legalities: { commander: "banned" } },
      "main",
      1,
    ),
  ];
  const parsed = makeParsedDeck(cards, [commander]);
  const report = validateCommanderDeckLegality(parsed, [commander]);
  assert.equal(report.isLegal, false);
  assert.equal(report.issues.some((issue) => issue.type === "banned_card"), true);
});

test("missing metadata does not crash legality validation", () => {
  const commander = fixtureCard(
    "Unknown Commander",
    "Legendary Creature - Human",
    {},
    "commander",
  );
  const cards = [
    commander,
    fixtureCard("Unknown Card", "Creature - Human", {}, "main", 99),
  ];
  const parsed = makeParsedDeck(cards, [commander]);
  const report = validateCommanderDeckLegality(parsed, [commander]);
  assert.ok(report);
  assert.ok(Array.isArray(report.issues));
});

test("commander preview uses root image_uris when available", () => {
  const card = fixtureCard("Preview Card", "Legendary Creature - Human", {
    image_uris: { small: "https://img.test/small.jpg", normal: "https://img.test/normal.jpg" },
  });
  assert.equal(getCommanderPreviewImageUrl(card), "https://img.test/small.jpg");
});

test("commander preview falls back to card_faces image when root image_uris missing", () => {
  const card = fixtureCard("DFC Preview", "Legendary Creature // Land", {
    card_faces: [{ image_uris: { normal: "https://img.test/face-normal.jpg" } }],
  });
  assert.equal(getCommanderPreviewImageUrl(card), "https://img.test/face-normal.jpg");
});

test("malformed input does not crash parser flow", () => {
  const malformed = "???\n@@@\n\n";
  const parsed = parseDeck(malformed);
  assert.ok(parsed);
  assert.ok(Array.isArray(parsed.cards));
});
