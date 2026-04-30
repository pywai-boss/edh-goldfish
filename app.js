const SECTION_ALIASES = new Map([
  ["commander", "commander"],
  ["commanders", "commander"],
  ["oathbreaker", "commander"],
  ["signature spell", "commander"],
  ["main", "main"],
  ["mainboard", "main"],
  ["deck", "main"],
  ["creature", "creatures"],
  ["creatures", "creatures"],
  ["artifact", "artifacts"],
  ["artifacts", "artifacts"],
  ["instant", "instants"],
  ["instants", "instants"],
  ["sorcery", "sorceries"],
  ["sorceries", "sorceries"],
  ["enchantment", "enchantments"],
  ["enchantments", "enchantments"],
  ["planeswalker", "planeswalkers"],
  ["planeswalkers", "planeswalkers"],
  ["battle", "battles"],
  ["battles", "battles"],
  ["land", "lands"],
  ["lands", "lands"],
  ["mana base", "lands"],
  ["manabase", "lands"],
  ["ramp", "ramp"],
  ["mana rocks", "ramp"],
  ["acceleration", "ramp"],
  ["sideboard", "sideboard"],
  ["side board", "sideboard"],
  ["maybeboard", "maybeboard"],
  ["maybe board", "maybeboard"],
  ["considering", "maybeboard"],
]);

const OUTSIDE_DECK_SECTIONS = new Set(["sideboard", "maybeboard"]);
const EXCLUDED_SECTIONS = new Set(["commander", ...OUTSIDE_DECK_SECTIONS]);
const OPENING_HAND_SIZE = 7;
const SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection";
const SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/search";
const ROLE_OTAGS = [
  "ramp",
  "card-draw",
  "removal",
  "tutor",
  "board-wipe",
  "protection",
  "graveyard",
  "treasure",
  "lifegain",
];

const ROLE_LABELS = {
  "ramp": "Ramp",
  "card-draw": "Card draw",
  "removal": "Removal",
  "tutor": "Tutor",
  "board-wipe": "Board wipe",
  "protection": "Protection",
  "graveyard": "Graveyard",
  "treasure": "Treasure",
  "lifegain": "Lifegain",
};

const MANA_COLORS = ["W", "U", "B", "R", "G"];
const MANA_SYMBOL_URLS = {
  W: "https://svgs.scryfall.io/card-symbols/W.svg",
  U: "https://svgs.scryfall.io/card-symbols/U.svg",
  B: "https://svgs.scryfall.io/card-symbols/B.svg",
  R: "https://svgs.scryfall.io/card-symbols/R.svg",
  G: "https://svgs.scryfall.io/card-symbols/G.svg",
  C: "https://svgs.scryfall.io/card-symbols/C.svg",
};
const BASIC_LAND_COLORS = {
  plains: "W",
  island: "U",
  swamp: "B",
  mountain: "R",
  forest: "G",
};

const TURN_ONE_MANA = new Set([
  "birds of paradise",
  "chrome mox",
  "dark ritual",
  "elvish mystic",
  "fyndhorn elves",
  "jeweled lotus",
  "llanowar elves",
  "lotus petal",
  "mana crypt",
  "mox amber",
  "mox diamond",
  "mox opal",
  "noble hierarch",
  "sol ring",
  "utopia sprawl",
  "wild growth",
]);

const SAMPLE_DECK = `COMMANDER
1 Atraxa, Praetors' Voice

LANDS
1 Command Tower
1 Exotic Orchard
1 Path of Ancestry
1 Reflecting Pool
1 City of Brass
1 Mana Confluence
1 Fabled Passage
1 Evolving Wilds
1 Prismatic Vista
1 Flooded Strand
1 Verdant Catacombs
1 Shattered Sanctum
1 Breeding Pool
1 Hallowed Fountain
1 Overgrown Tomb
1 Godless Shrine
1 Watery Grave
1 Temple Garden
1 Windswept Heath
1 Polluted Delta
1 Misty Rainforest
1 Marsh Flats
4 Forest
4 Island
4 Plains
3 Swamp

ARTIFACTS
1 Sol Ring #ramp
1 Arcane Signet #ramp
1 Fellwar Stone #ramp
1 Talisman of Dominance #ramp
1 Talisman of Progress #ramp
1 Chromatic Lantern #ramp

CREATURES
1 Birds of Paradise #ramp
1 Noble Hierarch #ramp
1 Bloom Tender #ramp
1 Eternal Witness
1 Esper Sentinel
1 Faeburrow Elder #ramp
1 Tireless Provisioner #ramp
1 Reclamation Sage
1 Seedborn Muse
1 Solemn Simulacrum #ramp
1 Baleful Strix
1 Coiling Oracle
1 Oracle of Mul Daya #ramp
1 Deepglow Skate
1 Avacyn's Pilgrim #ramp
1 Kinnan, Bonder Prodigy #ramp
1 Thrasios, Triton Hero
1 Sun Titan
1 Consecrated Sphinx

SORCERIES
1 Farseek #ramp
1 Nature's Lore #ramp
1 Three Visits #ramp
1 Cultivate #ramp
1 Kodama's Reach #ramp
1 Demonic Tutor
1 Toxic Deluge
1 Farewell
1 Ponder
1 Preordain
1 Supreme Verdict
1 Austere Command
1 Finale of Devastation

INSTANTS
1 Swords to Plowshares
1 Path to Exile
1 Arcane Denial
1 Swan Song
1 Cyclonic Rift
1 Heroic Intervention
1 Vampiric Tutor
1 Beast Within
1 Counterspell
1 Teferi's Protection
1 Anguished Unmaking
1 Generous Gift
1 Mystical Tutor
1 Fact or Fiction

ENCHANTMENTS
1 Rhystic Study
1 Smothering Tithe #ramp
1 Mystic Remora
1 Mirari's Wake #ramp
1 Sylvan Library
1 Phyrexian Arena
1 Guardian Project
1 Black Market Connections

PLANESWALKERS
1 Teferi, Time Raveler
1 Tamiyo, Field Researcher`;

function normalizeKey(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’]/g, "'")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOtag(value) {
  return normalizeKey(value).replace(/\s+/g, "-");
}

function hasOtag(card, tag) {
  const target = normalizeOtag(tag);
  return (card.otags || []).some((otag) => normalizeOtag(otag) === target);
}

function cleanCardName(rawName) {
  return rawName
    .replace(/\s+\([A-Z0-9]{2,8}\)\s*[A-Za-z0-9-]*.*$/i, "")
    .replace(/\s+\[[^\]]+\]\s*$/i, "")
    .replace(/\s+\*[^*]+\*\s*$/i, "")
    .replace(/\s+<[^>]+>\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractInlineTags(rawLine) {
  const tags = [];
  const cleanLine = rawLine.replace(/(?:^|\s)#!?([A-Za-z][A-Za-z0-9_-]*)/g, (match, tag) => {
    tags.push(tag.toLowerCase());
    return "";
  });
  return {
    line: cleanLine.replace(/\s+/g, " ").trim(),
    tags,
  };
}

function detectSection(rawLine) {
  const bare = rawLine
    .replace(/^[#*\-\s]+/, "")
    .replace(/[:]+$/, "")
    .replace(/\s+\(\d+\)$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!bare || /^\d+/.test(bare)) {
    return null;
  }

  if (SECTION_ALIASES.has(bare)) {
    return SECTION_ALIASES.get(bare);
  }

  if (/\blands?\b/.test(bare) || /\bmana base\b/.test(bare)) {
    return "lands";
  }

  if (/\bramp\b/.test(bare) || /\bmana rocks?\b/.test(bare) || /\bacceler/.test(bare)) {
    return "ramp";
  }

  if (/\bmaybe\b/.test(bare)) {
    return "maybeboard";
  }

  return null;
}

function parseCountLine(rawLine) {
  const sideboardLine = /^SB:\s*/i.test(rawLine);
  const workingLine = rawLine.replace(/^SB:\s*/i, "").trim();
  const match = workingLine.match(/^(\d+)\s*x?\s+(.+)$/i);

  if (!match) {
    return null;
  }

  return {
    count: Number.parseInt(match[1], 10),
    name: match[2].trim(),
    sectionOverride: sideboardLine ? "sideboard" : null,
  };
}

function hasAnyTag(tagSet, candidates) {
  return candidates.some((tag) => tagSet.has(tag));
}

function getScryfallTypeLines(scryfallCard) {
  if (!scryfallCard) {
    return [];
  }

  const typeLines = [];

  if (scryfallCard.type_line) {
    typeLines.push(scryfallCard.type_line);
  }

  if (Array.isArray(scryfallCard.card_faces)) {
    scryfallCard.card_faces.forEach((face) => {
      if (face.type_line) {
        typeLines.push(face.type_line);
      }
    });
  }

  return typeLines;
}

function isLandTypeLine(typeLine) {
  return /\bLand\b/i.test(typeLine);
}

function getFrontFaceTypeLine(scryfallCard) {
  if (!scryfallCard) {
    return "";
  }

  if (Array.isArray(scryfallCard.card_faces) && scryfallCard.card_faces[0]?.type_line) {
    return scryfallCard.card_faces[0].type_line;
  }

  return scryfallCard.type_line || "";
}

function getCardScryfall(card) {
  return card.scryfall || {};
}

function getOracleText(card) {
  const scryfall = getCardScryfall(card);
  const textParts = [];
  if (scryfall.oracle_text) textParts.push(scryfall.oracle_text);
  if (Array.isArray(scryfall.card_faces)) {
    scryfall.card_faces.forEach((face) => {
      if (face.oracle_text) textParts.push(face.oracle_text);
    });
  }
  return textParts.join(" ");
}

function entersTapped(card) {
  return /enters(?: the battlefield)? tapped/i.test(getOracleText(card));
}

function getDeckColors(cards) {
  const colors = new Set();

  cards.forEach((card) => {
    const scryfall = getCardScryfall(card);
    const identity = Array.isArray(scryfall.color_identity) ? scryfall.color_identity : [];
    const printedColors = Array.isArray(scryfall.colors) ? scryfall.colors : [];
    [...identity, ...printedColors].forEach((color) => {
      if (MANA_COLORS.includes(color)) colors.add(color);
    });

    const requirements = getManaCostRequirements(card);
    MANA_COLORS.forEach((color) => {
      if (requirements.colors[color] > 0) colors.add(color);
    });
  });

  return MANA_COLORS.filter((color) => colors.has(color));
}

function detectCommandersFromSections(parsedDeck) {
  return (parsedDeck.cards || []).filter((card) => card.section === "commander");
}

function getCommanderKey(commander) {
  if (typeof commander === "string") {
    return normalizeKey(commander.split("//")[0]);
  }

  return commander.key || normalizeKey((commander.name || "").split("//")[0]);
}

function getCommanderKeySet(commanders = []) {
  return new Set(commanders.map(getCommanderKey));
}

function isOutsideDeckCard(card) {
  return OUTSIDE_DECK_SECTIONS.has(card.section);
}

function isCommandZoneCard(card, commanderKeySet = new Set()) {
  return card.section === "commander" || commanderKeySet.has(getCommanderKey(card));
}

function getCommanderColorIdentity(commanders) {
  const colors = new Set();

  commanders.forEach((commander) => {
    const identity = getCardScryfall(commander).color_identity;
    if (Array.isArray(identity)) {
      identity.forEach((color) => {
        if (MANA_COLORS.includes(color)) colors.add(color);
      });
    }
  });

  return getRelevantColors([...colors]);
}

function getRelevantColors(commanderColorIdentity = []) {
  return MANA_COLORS.filter((color) => commanderColorIdentity.includes(color));
}

function formatColorIdentity(colors) {
  return colors.length > 0 ? colors.join("") : "Colorless";
}

function createManaIcon(color) {
  const icon = createElement("img", "mana-icon");
  icon.src = MANA_SYMBOL_URLS[color] || MANA_SYMBOL_URLS.C;
  icon.alt = color;
  icon.loading = "lazy";
  return icon;
}

function createManaIconGroup(colors = [], includeColorlessWhenEmpty = true) {
  const group = createElement("span", "mana-icons");
  const normalized = colors.filter((color) => MANA_SYMBOL_URLS[color]);
  const iconColors = normalized.length > 0 ? normalized : includeColorlessWhenEmpty ? ["C"] : [];
  iconColors.forEach((color) => {
    group.append(createManaIcon(color));
  });
  return group;
}

function getProducedColors(card, deckColors = []) {
  const key = card.key || normalizeKey(card.name || "");
  const scryfall = getCardScryfall(card);
  const producedMana = Array.isArray(scryfall.produced_mana) ? scryfall.produced_mana : [];

  if (key === "command tower" || key === "arcane signet") {
    return deckColors.slice();
  }

  const basicColor = BASIC_LAND_COLORS[key];
  if (basicColor) {
    return [basicColor];
  }

  if (producedMana.length > 0) {
    return producedMana.filter((color) => MANA_COLORS.includes(color) || color === "C");
  }

  if (key === "sol ring") {
    return ["C"];
  }

  return [];
}

function getManaCostRequirements(card) {
  const scryfall = getCardScryfall(card);
  const manaCost = scryfall.mana_cost || "";
  const symbols = [...manaCost.matchAll(/\{([^}]+)\}/g)].map((match) => match[1].toUpperCase());
  const colors = Object.fromEntries(MANA_COLORS.map((color) => [color, 0]));
  let generic = 0;
  let colored = 0;
  let xCount = 0;

  symbols.forEach((symbol) => {
    if (/^\d+$/.test(symbol)) {
      generic += Number.parseInt(symbol, 10);
      return;
    }

    if (symbol === "X") {
      xCount += 1;
      return;
    }

    if (MANA_COLORS.includes(symbol)) {
      colors[symbol] += 1;
      colored += 1;
      return;
    }

    if (symbol === "C") {
      generic += 1;
    }
  });

  if (xCount === 1) {
    generic += 3;
  } else if (xCount === 2) {
    generic += 4;
  } else if (xCount >= 3) {
    generic += 3;
  }

  return {
    manaCost,
    generic,
    colors,
    colorPips: colored,
    xCount,
    total: generic + colored,
  };
}

function canPayManaCost(availableMana, manaCost) {
  const requiredPips = [];

  MANA_COLORS.forEach((color) => {
    for (let index = 0; index < (manaCost.colors[color] || 0); index += 1) {
      requiredPips.push(color);
    }
  });

  const sources = (availableMana.sources || []).map((source) => ({
    colors: Array.isArray(source.colors) ? source.colors : [],
  }));

  if ((availableMana.total || sources.length) < manaCost.total) {
    return false;
  }

  function assignPip(index, usedSources) {
    if (index >= requiredPips.length) {
      return true;
    }

    const color = requiredPips[index];
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
      if (!usedSources.has(sourceIndex) && sources[sourceIndex].colors.includes(color)) {
        usedSources.add(sourceIndex);
        if (assignPip(index + 1, usedSources)) return true;
        usedSources.delete(sourceIndex);
      }
    }

    return false;
  }

  if (!assignPip(0, new Set())) {
    return false;
  }

  return (availableMana.total || sources.length) >= manaCost.total;
}

function classifyCard(card) {
  const key = normalizeKey(card.name.split("//")[0]);
  const fullKey = normalizeKey(card.name);
  const tagSet = new Set(card.tags);
  const section = card.section;
  const isExcluded = EXCLUDED_SECTIONS.has(section);
  const isCommander = section === "commander";
  const otags = (card.otags || []).map(normalizeOtag);
  const typeLines = getScryfallTypeLines(card.scryfall);
  const isLand = isLandTypeLine(getFrontFaceTypeLine(card.scryfall));
  const isRamp = !isLand && hasOtag({ otags }, "ramp");
  const turnOneByName = TURN_ONE_MANA.has(key);
  const turnOneByTag = hasAnyTag(tagSet, ["t1", "turn1", "one-drop"]);
  const isTurnOneRamp = !isLand && (turnOneByName || turnOneByTag);
  const classificationReasons = [];

  if (isExcluded) classificationReasons.push(`excluded ${section} section`);
  if (typeLines.length > 0) {
    classificationReasons.push(`Scryfall type_line: ${typeLines.join(" / ")}`);
  } else {
    classificationReasons.push("no Scryfall type_line yet");
  }
  ROLE_OTAGS.forEach((roleTag) => {
    if (hasOtag({ otags }, roleTag)) {
      classificationReasons.push(`otag:${roleTag}`);
    }
  });
  if (turnOneByName) classificationReasons.push("turn-one mana list");
  if (turnOneByTag) classificationReasons.push("inline turn-one tag");

  return {
    ...card,
    key,
    otags,
    typeLines,
    isExcluded,
    isCommander,
    zone: isCommander ? "command" : "library",
    isLand,
    isRamp,
    isTurnOneRamp,
    isManaSource: isLand || isRamp,
    classificationReasons,
  };
}

function parseDeck(text) {
  const lines = text.split(/\r?\n/);
  let currentSection = "main";
  const cards = [];
  const ignored = [];
  let sectionLineCount = 0;

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("//")) {
      return;
    }

    const section = detectSection(trimmed);
    if (section) {
      currentSection = section;
      sectionLineCount += 1;
      return;
    }

    const { line, tags } = extractInlineTags(trimmed);
    const parsed = parseCountLine(line);

    if (!parsed || !Number.isFinite(parsed.count) || parsed.count <= 0) {
      ignored.push({ line: index + 1, text: rawLine });
      return;
    }

    const card = {
      count: parsed.count,
      name: cleanCardName(parsed.name),
      section: parsed.sectionOverride || currentSection,
      tags,
      sourceLine: index + 1,
    };

    if (card.name) {
      cards.push(classifyCard(card));
    }
  });

  return {
    cards,
    ignored,
    sectionLineCount,
    totals: summarizeDeck(cards),
  };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getUniqueCardNames(cards) {
  const namesByKey = new Map();

  cards.forEach((card) => {
    if (!namesByKey.has(card.key)) {
      namesByKey.set(card.key, card.name);
    }
  });

  return [...namesByKey.values()];
}

async function fetchScryfallCardsByName(cards) {
  const cardsByName = new Map();
  const missing = [];
  const uniqueNames = getUniqueCardNames(cards);
  const chunks = chunkArray(uniqueNames, 75);

  for (const names of chunks) {
    const response = await fetch(SCRYFALL_COLLECTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifiers: names.map((name) => ({ name })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Scryfall card lookup failed with ${response.status}`);
    }

    const payload = await response.json();

    (payload.data || []).forEach((scryfallCard) => {
      cardsByName.set(normalizeKey(scryfallCard.name), scryfallCard);
      cardsByName.set(normalizeKey(scryfallCard.name.split("//")[0]), scryfallCard);
    });

    (payload.not_found || []).forEach((item) => {
      if (item.name) {
        missing.push(item.name);
      }
    });
  }

  return { cardsByName, missing };
}

function escapeScryfallExactName(name) {
  return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function fetchBroadOtagsByName(cards) {
  const otagsByName = new Map();
  const uniqueNames = getUniqueCardNames(cards);
  const chunks = chunkArray(uniqueNames, 12);

  for (const roleTag of ROLE_OTAGS) {
    for (const names of chunks) {
      const exactNames = names.map((name) => `!"${escapeScryfallExactName(name)}"`).join(" or ");
      const query = `(${exactNames}) otag:${roleTag} unique:cards`;
      const url = `${SCRYFALL_SEARCH_URL}?q=${encodeURIComponent(query)}`;
      const response = await fetch(url);

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        throw new Error(`Scryfall otag lookup failed with ${response.status}`);
      }

      const payload = await response.json();
      (payload.data || []).forEach((scryfallCard) => {
        const keys = [normalizeKey(scryfallCard.name), normalizeKey(scryfallCard.name.split("//")[0])];
        keys.forEach((key) => {
          if (!otagsByName.has(key)) {
            otagsByName.set(key, new Set());
          }
          otagsByName.get(key).add(roleTag);
        });
      });
    }
  }

  return otagsByName;
}

function enrichParsedDeck(parsed, cardsByName = new Map(), otagsByName = new Map()) {
  const cards = parsed.cards.map((card) => {
    const key = card.key || normalizeKey(card.name.split("//")[0]);
    const fullKey = normalizeKey(card.name);
    const scryfall = cardsByName.get(fullKey) || cardsByName.get(key) || card.scryfall || null;
    const otagSet = otagsByName.get(fullKey) || otagsByName.get(key);
    const otags = otagSet ? [...otagSet] : card.otags || [];

    return classifyCard({
      ...card,
      scryfall,
      otags,
    });
  });

  return {
    ...parsed,
    cards,
    totals: summarizeDeck(cards),
  };
}

function summarizeDeck(cards, selectedCommanders = []) {
  const commanderKeySet = getCommanderKeySet(selectedCommanders);
  const countedCommanderKeys = new Set();
  const roles = summarizeRoleCounts(cards, selectedCommanders);

  return cards.reduce(
    (acc, card) => {
      const count = card.count;

      if (isOutsideDeckCard(card)) {
        acc.excluded += count;
        return acc;
      }

      if (isCommandZoneCard(card, commanderKeySet)) {
        const commanderKey = getCommanderKey(card);
        if (!countedCommanderKeys.has(commanderKey)) {
          acc.total += 1;
          acc.commanders += 1;
          countedCommanderKeys.add(commanderKey);
        }
        return acc;
      }

      acc.total += count;
      acc.library += count;

      if (card.isLand) {
        acc.lands += count;
      }

      if (card.isRamp) {
        acc.ramp += count;
      }

      if (card.isTurnOneRamp) {
        acc.turnOneRamp += count;
      }

      return acc;
    },
    {
      total: 0,
      library: 0,
      commanders: 0,
      excluded: 0,
      lands: 0,
      ramp: 0,
      turnOneRamp: 0,
      roles,
    },
  );
}

function summarizeRoleCounts(cards, selectedCommanders = []) {
  const counts = Object.fromEntries(ROLE_OTAGS.map((roleTag) => [roleTag, 0]));
  const commanderKeySet = getCommanderKeySet(selectedCommanders);

  cards.forEach((card) => {
    if (isOutsideDeckCard(card) || isCommandZoneCard(card, commanderKeySet)) {
      return;
    }

    ROLE_OTAGS.forEach((roleTag) => {
      if (hasOtag(card, roleTag)) {
        counts[roleTag] += card.count;
      }
    });
  });

  return counts;
}

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

function runSimulation(library, options = {}) {
  const handSize = options.handSize ?? 7;
  const simulations = options.simulations ?? 10000;
  const deckColors = getDeckColors(library);
  const distribution = createEmptyDistribution(handSize);
  const manaTotalsByTurn = Array.from({ length: 8 }, () => 0);
  const thresholdHitsByTurn = Array.from({ length: 8 }, () => 0);
  const counters = {
    keepableLands: 0,
    lowLand: 0,
    highLand: 0,
    hasRamp: 0,
    hasTurnOneRamp: 0,
    twoLandRamp: 0,
    threeManaSources: 0,
  };
  const examples = {
    keep: null,
    low: null,
    high: null,
  };
  let totalLands = 0;

  for (let i = 0; i < simulations; i += 1) {
    const draws = drawCards(library, OPENING_HAND_SIZE + 7);
    const hand = draws.slice(0, handSize);
    const summary = summarizeHand(hand);
    distribution.set(summary.lands, (distribution.get(summary.lands) || 0) + 1);
    totalLands += summary.lands;

    if (summary.keepableLands) counters.keepableLands += 1;
    if (summary.lowLand) counters.lowLand += 1;
    if (summary.highLand) counters.highLand += 1;
    if (summary.ramp > 0) counters.hasRamp += 1;
    if (summary.turnOneRamp > 0) counters.hasTurnOneRamp += 1;
    if (summary.twoLandRamp) counters.twoLandRamp += 1;
    if (summary.threeManaSources) counters.threeManaSources += 1;

    if (!examples.keep && summary.keepableLands && summary.ramp > 0) {
      examples.keep = { hand, summary };
    }

    if (!examples.low && summary.lowLand) {
      examples.low = { hand, summary };
    }

    if (!examples.high && summary.highLand) {
      examples.high = { hand, summary };
    }

    for (let turn = 1; turn <= 8; turn += 1) {
      const visibleCards = getVisibleCardsForTurn(draws, turn);
      const availableMana = getAvailableManaForTurn(visibleCards, turn, deckColors);
      manaTotalsByTurn[turn - 1] += availableMana.total;

      if (turn >= 2 && availableMana.total >= turn) {
        thresholdHitsByTurn[turn - 1] += 1;
      }
    }
  }

  const manaByTurn = Array.from({ length: 8 }, (_, index) => ({
    turn: index + 1,
    averageTotalMana: manaTotalsByTurn[index] / simulations,
    threshold: index + 1,
    atLeastThresholdCount: thresholdHitsByTurn[index],
  }));

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
    averageLands: totalLands / simulations,
    examples: Object.values(examples).filter(Boolean),
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

function getCastableSpellsForTurn(visibleCards, availableMana, turn) {
  return visibleCards.filter((card) => {
    if (card.isLand || card.isExcluded) return false;
    const requirements = getManaCostRequirements(card);
    if (requirements.total === 0) return false;
    if (turn < requirements.total) return false;
    return canPayManaCost(availableMana, requirements);
  });
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

function percent(value, total) {
  if (!total) {
    return "0.0%";
  }
  return `${((value / total) * 100).toFixed(1)}%`;
}

function clampNumber(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

// Use this component instead of creating new UI patterns.
function StatCard({
  label,
  value,
  detail = "",
  accent = "",
  compact = false,
  cardClass = "",
  labelClass = "",
  valueClass = "",
  detailClass = "",
}) {
  const baseClass = compact ? "mini-metric" : "metric";
  const compactClass = compact ? baseClass : `${baseClass} ${accent || ""}`.trim();
  const className = `${compactClass} ${cardClass}`.trim();
  const card = createElement("article", className);
  card.append(createElement("span", labelClass, label));
  card.append(createElement("strong", valueClass, value));
  if (!compact) {
    card.append(createElement("small", detailClass, detail));
  }
  return card;
}

// Use this component instead of creating new UI patterns.
function Section({
  tagName = "section",
  className = "",
  title = "",
  summary = "",
  headingClass = "section-heading",
  titleTag = "h2",
  titleClass = "",
  summaryTag = "span",
  summaryClass = "muted-value",
  body = null,
}) {
  const section = createElement(tagName, className);
  const heading = createElement("div", headingClass);
  heading.append(createElement(titleTag, titleClass, title));
  heading.append(createElement(summaryTag, summaryClass, summary));
  section.append(heading);
  if (body) {
    section.append(body);
  }
  return section;
}

// Use this component instead of creating new UI patterns.
function Toolbar({ className = "", children = [] }) {
  const toolbar = createElement("div", className);
  children.forEach((child) => {
    toolbar.append(child);
  });
  return toolbar;
}

function renderMetric(container, label, value, detail, accent) {
  container.append(
    StatCard({
      label,
      value,
      detail,
      accent,
      compact: false,
    }),
  );
}

function renderDeckMetrics(parsed, result) {
  const container = document.querySelector("#deck-metrics");
  container.replaceChildren();

  const totals = parsed.totals;
  const commandDetail =
    totals.commanders > 0
      ? `${totals.total} total, ${totals.commanders} in command zone`
      : `${totals.total} total, commander not selected`;
  renderMetric(container, "Library", String(totals.library), commandDetail, "");
  renderMetric(container, "Lands", String(totals.lands), `${percent(totals.lands, totals.library)} of library`, "land");
  renderMetric(container, "Nonland mana", String(totals.ramp), `${totals.turnOneRamp} tagged as turn-one`, "ramp");

  if (result) {
    renderMetric(
      container,
      "2-4 land hands",
      percent(result.counters.keepableLands, result.simulations),
      `${result.counters.keepableLands.toLocaleString()} of ${result.simulations.toLocaleString()}`,
      "keep",
    );
    renderMetric(
      container,
      "0-1 land hands",
      percent(result.counters.lowLand, result.simulations),
      `${result.counters.lowLand.toLocaleString()} of ${result.simulations.toLocaleString()}`,
      "risk",
    );
  } else {
    renderMetric(container, "2-4 land hands", "--", "Run a simulation", "keep");
    renderMetric(container, "0-1 land hands", "--", "Run a simulation", "risk");
  }
}

const REVIEW_GROUP_ORDER = [
  "land",
  "ramp",
  "card-draw",
  "removal",
  "tutor",
  "board-wipe",
  "protection",
  "graveyard",
  "treasure",
  "lifegain",
  "other",
  "excluded",
];

const REVIEW_GROUP_LABELS = {
  "land": "Land",
  "ramp": "Nonland Mana / Ramp",
  "card-draw": "Draw",
  "removal": "Removal",
  "tutor": "Tutor",
  "board-wipe": "Board Wipe",
  "protection": "Protection",
  "graveyard": "Graveyard",
  "treasure": "Treasure",
  "lifegain": "Lifegain",
  "other": "Other",
  "excluded": "Excluded",
};

function getReviewGroupTag(card) {
  if (card.isExcluded) return "excluded";
  if (card.isLand) return "land";
  if (hasOtag(card, "ramp")) return "ramp";
  if (hasOtag(card, "card-draw")) return "card-draw";
  if (hasOtag(card, "removal")) return "removal";
  if (hasOtag(card, "tutor")) return "tutor";
  if (hasOtag(card, "board-wipe")) return "board-wipe";
  if (hasOtag(card, "protection")) return "protection";
  if (hasOtag(card, "graveyard")) return "graveyard";
  if (hasOtag(card, "treasure")) return "treasure";
  if (hasOtag(card, "lifegain")) return "lifegain";
  return "other";
}

function groupCardsForReview(parsed) {
  const grouped = new Map(REVIEW_GROUP_ORDER.map((tag) => [tag, []]));
  const cards = parsed.cards.slice().sort((a, b) => a.sourceLine - b.sourceLine);

  cards.forEach((card) => {
    grouped.get(getReviewGroupTag(card)).push(card);
  });

  return REVIEW_GROUP_ORDER
    .map((tag) => ({ tag, cards: grouped.get(tag) }))
    .filter((group) => group.cards.length > 0);
}

function buildCardDetail(card) {
  const detailParts = [];
  detailParts.push(`section: ${card.section}`);
  detailParts.push(`type: ${card.typeLines.length > 0 ? card.typeLines.join(" / ") : "Unknown"}`);
  detailParts.push(`otags: ${card.otags.length > 0 ? card.otags.join(", ") : "none"}`);
  detailParts.push(`list tags: ${card.tags.length > 0 ? card.tags.join(", ") : "none"}`);
  detailParts.push(`why: ${card.classificationReasons.join(", ")}`);
  return detailParts.join(" | ");
}

function renderDeckTagReview(parsed) {
  const summary = document.querySelector("#deck-review-summary");
  const groupsContainer = document.querySelector("#deck-review-groups");
  const toggleReviewButton = document.querySelector("#toggle-review-button");
  const reviewPanel = document.querySelector("#deck-review-panel");
  const toggleDetailsButton = document.querySelector("#toggle-review-details-button");
  const hasParsedDeck = Boolean(parsed && parsed.cards.length > 0);
  const shouldShowReview = hasParsedDeck && appState.reviewOpen;
  groupsContainer.replaceChildren();

  if (!hasParsedDeck) {
    summary.textContent = "Analyze deck";
    toggleReviewButton.disabled = true;
    toggleReviewButton.textContent = "Review Tags";
    toggleDetailsButton.disabled = true;
    toggleDetailsButton.textContent = "Show Details";
    reviewPanel.classList.add("is-hidden");
    groupsContainer.classList.add("is-hidden");
    groupsContainer.classList.remove("show-details");
    return;
  }

  const groups = groupCardsForReview(parsed);
  summary.textContent = `Review Tags: ${parsed.cards.length} rows grouped into ${groups.length} categories`;
  toggleReviewButton.disabled = false;
  toggleReviewButton.textContent = appState.reviewOpen ? "Hide Review Tags" : "Review Tags";
  toggleDetailsButton.disabled = !shouldShowReview;
  toggleDetailsButton.textContent = appState.reviewShowDetails ? "Hide Details" : "Show Details";
  reviewPanel.classList.toggle("is-hidden", !shouldShowReview);

  groupsContainer.classList.toggle("is-hidden", !shouldShowReview);
  groupsContainer.classList.toggle("show-details", appState.reviewShowDetails);

  if (!shouldShowReview) {
    return;
  }

  groups.forEach((group) => {
    const uniqueCards = group.cards.length;
    const totalCopies = group.cards.reduce((sum, card) => sum + card.count, 0);
    const list = createElement("ul", "review-card-list");
    group.cards.forEach((card) => {
      const item = createElement("li");
      const row = Toolbar({
        className: "review-card-row",
        children: [
          createElement("span", "review-card-name", card.name),
          createElement("span", "review-card-count", `x${card.count}`),
        ],
      });
      item.append(row);
      item.append(createElement("div", "review-card-detail", buildCardDetail(card)));
      list.append(item);
    });

    const wrapper = Section({
      tagName: "article",
      className: "review-group",
      title: REVIEW_GROUP_LABELS[group.tag] || group.tag,
      summary: `${uniqueCards} cards / ${totalCopies} copies`,
      headingClass: "review-group-header",
      titleTag: "h3",
      titleClass: "review-group-title",
      summaryTag: "span",
      summaryClass: "review-group-meta",
      body: list,
    });
    groupsContainer.append(wrapper);
  });
}

const appState = {
  parsed: null,
  libraryCards: [],
  library: [],
  simulationFeatures: null,
  awaitingCommanderConfirmation: false,
  isDeckPanelCollapsed: false,
  isParsing: false,
  isAnalyzing: false,
  reviewOpen: false,
  reviewShowDetails: false,
  selectedCommanders: [],
  selectedCommanderKeys: [],
  commanderColorIdentity: [],
  commanderSelectionMode: null,
};

function createEmptyParsedDeck() {
  return {
    cards: [],
    ignored: [],
    sectionLineCount: 0,
    totals: summarizeDeck([]),
  };
}

function renderNotes(parsed, leadingMessage = "") {
  const notes = document.querySelector("#parse-notes");
  const totals = parsed.totals;
  const messages = [];

  if (leadingMessage) {
    messages.push(leadingMessage);
  }

  if (totals.library > 0) {
    messages.push(`Parsed ${totals.total} deck cards and ${totals.library} library cards`);
  }

  if (totals.excluded > 0) {
    messages.push(`${totals.excluded} side or maybe cards excluded`);
  }

  if (parsed.ignored.length > 0) {
    messages.push(`${parsed.ignored.length} lines skipped`);
  }

  if (totals.commanders === 2) {
    messages.push("Two commanders selected; legality is not validated yet.");
  }

  if (totals.library > 0 && ![98, 99].includes(totals.library)) {
    messages.push("EDH libraries are usually 99 cards with one commander or 98 with two");
  }

  notes.textContent = messages.join(". ");
}

function renderLoadState() {
  const deckText = document.querySelector("#deck-text");
  const workspace = document.querySelector(".workspace");
  const importPanel = document.querySelector(".import-panel");
  const modalBackdrop = document.querySelector("#commander-modal-backdrop");
  const resultsPanel = document.querySelector(".results-panel");
  const loadedDeckToolbar = document.querySelector("#loaded-deck-toolbar");
  const loadedDeckStatus = document.querySelector("#loaded-deck-status");
  const commanderSetup = document.querySelector("#commander-setup");
  const commanderModalTitle = document.querySelector("#commander-modal-title");
  const commanderLoadingState = document.querySelector("#commander-loading-state");
  const commanderLoadingText = document.querySelector("#commander-loading-text");
  const commanderConfirmationContent = document.querySelector("#commander-confirmation-content");
  const commanderConfirmAnalyzeButton = document.querySelector("#commander-confirm-analyze");
  const commanderConfirmBackButton = document.querySelector("#commander-confirm-back");
  const commanderNote = document.querySelector("#commander-note");
  const commanderSelects = document.querySelectorAll(".commander-select");
  const analyzeButton = document.querySelector("#analyze-button");
  const hasDeckText = deckText.value.trim().length > 0;
  const hasParsedDeck = Boolean(appState.parsed && appState.parsed.cards.length > 0);
  const hasAnalysis = Boolean(appState.simulationFeatures);
  const isAwaitingConfirmation = appState.awaitingCommanderConfirmation && hasParsedDeck;
  const shouldCollapseInput = appState.isDeckPanelCollapsed && hasParsedDeck && hasAnalysis;
  const actionLabel = "Continue";
  const isCommanderModalOpen = appState.isParsing || isAwaitingConfirmation;

  workspace.classList.toggle("results-focus", shouldCollapseInput);
  importPanel.classList.toggle("is-hidden", shouldCollapseInput);
  loadedDeckToolbar.classList.toggle("is-hidden", !shouldCollapseInput);
  analyzeButton.disabled =
    appState.isParsing ||
    (!hasParsedDeck && !hasDeckText) ||
    (isAwaitingConfirmation && appState.selectedCommanders.length === 0);
  analyzeButton.textContent = appState.isParsing ? `${actionLabel}...` : actionLabel;

  if (shouldCollapseInput) {
    const parsed = appState.parsed;
    const commanderLabel = appState.selectedCommanders.length === 2 ? "Commanders" : "Commander";
    const partnerNote =
      appState.selectedCommanders.length === 2 ? " · Two commanders selected; legality is not validated yet." : "";
    loadedDeckStatus.replaceChildren();
    loadedDeckStatus.append(document.createTextNode(`Loaded Deck: ${parsed.totals.total} cards total · ${parsed.totals.library}-card library · `));

    if (appState.selectedCommanders.length > 0) {
      loadedDeckStatus.append(
        document.createTextNode(`${commanderLabel}: ${appState.selectedCommanders.join(" + ")} `),
      );
      loadedDeckStatus.append(createManaIconGroup(appState.commanderColorIdentity, true));
    } else {
      loadedDeckStatus.append(document.createTextNode("Commander: Confirm selection"));
    }

    loadedDeckStatus.append(document.createTextNode(` · ${parsed.totals.lands} lands${partnerNote}`));
  }

  commanderSetup.classList.toggle("is-hidden", (!hasParsedDeck && !appState.isParsing) || shouldCollapseInput);
  commanderSetup.classList.toggle("is-modal-open", isCommanderModalOpen && !shouldCollapseInput);
  modalBackdrop?.classList.toggle("is-hidden", !isCommanderModalOpen || shouldCollapseInput);
  modalBackdrop?.setAttribute("aria-hidden", isCommanderModalOpen && !shouldCollapseInput ? "false" : "true");
  commanderLoadingState?.classList.toggle("is-hidden", !appState.isParsing && !appState.isAnalyzing);
  commanderConfirmationContent?.classList.toggle("is-hidden", appState.isParsing || appState.isAnalyzing);
  commanderLoadingText.textContent = appState.isAnalyzing
    ? "Checking mana, colors, and commander timing..."
    : "Reading cards and finding commander options...";
  if (commanderModalTitle) {
    if (appState.isParsing) {
      commanderModalTitle.textContent = "Preparing deck";
    } else if (appState.isAnalyzing) {
      commanderModalTitle.textContent = "Running analysis";
    } else {
      commanderModalTitle.textContent = "Confirm commander";
    }
  }
  commanderConfirmAnalyzeButton.disabled =
    appState.isAnalyzing || appState.isParsing || appState.selectedCommanders.length === 0;
  commanderConfirmAnalyzeButton.textContent = appState.isAnalyzing ? "Analyzing mana..." : "Analyze Deck";
  commanderConfirmBackButton.disabled = appState.isAnalyzing || appState.isParsing;
  commanderNote.textContent =
    appState.selectedCommanders.length === 2
      ? "Two commanders selected; legality is not validated yet."
      : "Choose one commander, or add a second for partner-style decks. Analyze Deck uses this selection.";
  commanderSelects.forEach((select) => {
    select.disabled = !hasParsedDeck || appState.isAnalyzing || appState.isParsing;
  });

  resultsPanel?.classList.toggle("results-pending", appState.isAnalyzing);
  resultsPanel?.classList.toggle("results-enter", hasAnalysis && !appState.isAnalyzing);

  renderDeckTagReview(appState.parsed);
}

function renderLandChart(result) {
  const chart = document.querySelector("#land-chart");
  const average = document.querySelector("#land-average");
  chart.replaceChildren();

  if (!result) {
    chart.append(createElement("div", "empty-state", "No run yet"));
    average.textContent = "";
    return;
  }

  average.textContent = `${result.averageLands.toFixed(2)} average lands`;
  const max = Math.max(...result.distribution.values(), 1);

  result.distribution.forEach((count, lands) => {
    const row = createElement("div", "bar-row");
    const label = String(lands);
    row.append(createElement("span", "bar-label", label));

    const track = createElement("div", "bar-track");
    const fill = createElement("div", "bar-fill");
    fill.style.setProperty("--width", `${Math.max(2, (count / max) * 100)}%`);

    if (lands <= 1) {
      fill.style.setProperty("--bar-color", "var(--red)");
    } else if (lands >= 5) {
      fill.style.setProperty("--bar-color", "var(--amber)");
    } else {
      fill.style.setProperty("--bar-color", "var(--green)");
    }

    track.append(fill);
    row.append(track);
    row.append(createElement("span", "bar-value", percent(count, result.simulations)));
    chart.append(row);
  });
}

function renderManaStats(result) {
  const stats = document.querySelector("#mana-stats");
  const keepRate = document.querySelector("#keep-rate");
  stats.replaceChildren();

  if (!result) {
    stats.append(createElement("div", "empty-state", "No run yet"));
    keepRate.textContent = "";
    return;
  }

  keepRate.textContent = `${result.simulations.toLocaleString()} hands`;
  const items = [
    {
      title: "Has nonland mana",
      detail: "Rocks, dorks, rituals, or cards tagged as ramp",
      count: result.counters.hasRamp,
    },
    {
      title: "2+ lands and ramp",
      detail: "Opening hands with a stable land base plus acceleration",
      count: result.counters.twoLandRamp,
    },
    {
      title: "3+ mana sources",
      detail: "Lands plus nonland mana sources in hand",
      count: result.counters.threeManaSources,
    },
    {
      title: "Turn-one mana piece",
      detail: "Known one-mana accelerants or cards tagged t1",
      count: result.counters.hasTurnOneRamp,
    },
    {
      title: "5+ land hands",
      detail: "Likely mana-heavy openers",
      count: result.counters.highLand,
    },
  ];

  items.forEach((item) => {
    stats.append(
      StatCard({
        label: item.title,
        value: percent(item.count, result.simulations),
        detail: item.detail,
        cardClass: "stat-item",
        labelClass: "stat-title",
        valueClass: "stat-percent",
        detailClass: "stat-detail",
      }),
    );
  });
}

function renderMiniMetric(container, label, value) {
  container.append(
    StatCard({
      label,
      value,
      compact: true,
    }),
  );
}

function createSimulationFeatures({
  simulationResult = null,
  colorResult = null,
  curveResult = null,
  commanderCastResult = null,
} = {}) {
  const manaByTurn =
    simulationResult?.simulationFeatures?.manaByTurn ||
    simulationResult?.manaByTurn ||
    simulationResult?.manaDevelopment?.turns?.map((turnData) => ({
      turn: turnData.turn,
      averageTotalMana: turnData.averageAvailableMana,
      threshold: turnData.threshold,
      atLeastThresholdCount: turnData.atLeastThresholdCount,
    })) ||
    [];
  const colorsByTurn =
    colorResult?.simulationFeatures?.colorsByTurn ||
    colorResult?.colorsByTurn ||
    colorResult?.turns?.map((turnData) => ({
      turn: turnData.turn,
      colorHits: { ...turnData.colors },
    })) ||
    [];
  const fullCommanderColorAccessByTurn =
    colorResult?.simulationFeatures?.fullCommanderColorAccessByTurn ||
    colorResult?.fullCommanderColorAccessByTurn ||
    colorResult?.turns?.map((turnData) => ({
      turn: turnData.turn,
      hitCount: turnData.fullCommanderIdentityAccess ?? turnData.allColors ?? 0,
    })) ||
    [];
  const castabilityByTurn =
    curveResult?.simulationFeatures?.castabilityByTurn ||
    curveResult?.castabilityByTurn ||
    curveResult?.turns?.map((turnData) => ({
      turn: turnData.turn,
      anyCastable: turnData.anyCastable || 0,
      onCurveSpellByTurnCost: turnData.onCurveSpellByTurnCost ?? turnData.curvePlay ?? 0,
    })) ||
    [];

  return {
    manaByTurn,
    colorsByTurn,
    fullCommanderColorAccessByTurn,
    castabilityByTurn,
    commanderTiming: commanderCastResult || null,
  };
}

function formatAverageTurn(value) {
  return value === null ? "--" : `T${value.toFixed(1)}`;
}

function formatFailureBreakdown(failureBreakdown, iterations) {
  return [
    `Insufficient mana ${percent(failureBreakdown.insufficient_mana, iterations)}`,
    `Missing colors ${percent(failureBreakdown.missing_colors, iterations)}`,
    `Both ${percent(failureBreakdown.both, iterations)}`,
    `Not castable by T8 ${percent(failureBreakdown.not_castable_by_turn_8, iterations)}`,
  ].join(" | ");
}

function renderCommanderCastMetrics(container, commanderCastResult) {
  if (!commanderCastResult || !commanderCastResult.iterations) {
    return;
  }

  const metricsWrap = createElement("div", "mini-metric-grid commander-metric-grid");
  const failureWrap = createElement("div", "commander-failure-wrap");

  commanderCastResult.commanders.forEach((commander) => {
    const isByT8 = commander.requirements.total > 8;
    const label = isByT8 ? `${commander.name} by T8` : `${commander.name} on curve`;
    renderMiniMetric(metricsWrap, label, percent(commander.commanderCastableOnCurve, commanderCastResult.iterations));
    renderMiniMetric(
      metricsWrap,
      `${commander.name} avg turn`,
      formatAverageTurn(commander.averageEarliestCommanderCastTurn ?? commander.averageCastableTurn),
    );
    failureWrap.append(
      createElement(
        "p",
        "muted-value commander-failure-line",
        `${commander.name} failures: ${formatFailureBreakdown(commander.failureBreakdown, commanderCastResult.iterations)}`,
      ),
    );
  });

  if (commanderCastResult.commanders.length === 2) {
    renderMiniMetric(
      metricsWrap,
      "Both commanders by T8",
      percent(commanderCastResult.bothBy8, commanderCastResult.iterations),
    );
  }

  const sectionBody = createElement("div", "commander-analysis-body");
  sectionBody.append(metricsWrap);
  sectionBody.append(failureWrap);
  const commanderSection = Section({
    className: "commander-analysis-section",
    title: "Commander Timing",
    summary: "Castability by turn 8",
    body: sectionBody,
  });
  container.append(commanderSection);
}

function renderColorCurveAnalysis(
  colorResult,
  curveResult,
  commanderCastResult = null,
  simulationResult = null,
  simulationFeatures = null,
) {
  const summary = document.querySelector("#color-curve-summary");
  const cards = document.querySelector("#color-curve-cards");
  const tableWrap = document.querySelector("#color-curve-table");
  cards.replaceChildren();
  tableWrap.replaceChildren();

  if (appState.parsed && appState.selectedCommanders.length === 0) {
    summary.textContent = "Commander needed";
    tableWrap.append(createElement("div", "empty-state", "Select a commander to analyze color access."));
    return;
  }

  if (!colorResult || !curveResult) {
    summary.textContent = "Run a simulation";
    tableWrap.append(createElement("div", "empty-state", "No color or curve run yet"));
    return;
  }

  const relevantColors = getRelevantColors(appState.commanderColorIdentity);
  const featureSet =
    simulationFeatures ||
    createSimulationFeatures({
      simulationResult,
      colorResult,
      curveResult,
      commanderCastResult,
    });
  summary.textContent = "Color and curve from current analysis";
  if (relevantColors.length > 0) {
    renderMiniMetric(
      cards,
      "Commander Colors T2",
      percent(featureSet.fullCommanderColorAccessByTurn[1]?.hitCount || 0, colorResult.iterations),
    );
    renderMiniMetric(
      cards,
      "Commander Colors T3",
      percent(featureSet.fullCommanderColorAccessByTurn[2]?.hitCount || 0, colorResult.iterations),
    );
    renderMiniMetric(
      cards,
      "Commander Colors T4",
      percent(featureSet.fullCommanderColorAccessByTurn[3]?.hitCount || 0, colorResult.iterations),
    );
  } else {
    renderMiniMetric(cards, "Color Identity", "Colorless");
  }
  renderMiniMetric(
    cards,
    "Turn 1 Play",
    percent(featureSet.castabilityByTurn[0]?.onCurveSpellByTurnCost || 0, curveResult.iterations),
  );
  renderMiniMetric(
    cards,
    "Turn 2 Play",
    percent(featureSet.castabilityByTurn[1]?.onCurveSpellByTurnCost || 0, curveResult.iterations),
  );
  renderMiniMetric(
    cards,
    "Turn 3 Play",
    percent(featureSet.castabilityByTurn[2]?.onCurveSpellByTurnCost || 0, curveResult.iterations),
  );
  renderMiniMetric(
    cards,
    "Turn 4 Play",
    percent(featureSet.castabilityByTurn[3]?.onCurveSpellByTurnCost || 0, curveResult.iterations),
  );
  renderCommanderCastMetrics(cards, featureSet.commanderTiming || commanderCastResult);

  const table = createElement("table", "curve-table");
  const head = createElement("thead");
  const headRow = createElement("tr");
  const headers =
    relevantColors.length > 0
      ? ["Turn", ...relevantColors, "Commander Colors", "Total Mana", "Castable Spell"]
      : ["Turn", "Color Access", "Total Mana", "Castable Spell"];
  headers.forEach((label) => {
    const cell = createElement("th");
    if (MANA_COLORS.includes(label)) {
      cell.append(createManaIcon(label));
    } else {
      cell.textContent = label;
    }
    headRow.append(cell);
  });
  head.append(headRow);
  table.append(head);

  const body = createElement("tbody");
  for (let turn = 1; turn <= 8; turn += 1) {
    const row = createElement("tr");
    row.append(createElement("td", "", String(turn)));
    relevantColors.forEach((color) => {
      row.append(
        createElement(
          "td",
          "",
          percent(featureSet.colorsByTurn[turn - 1]?.colorHits?.[color] || 0, colorResult.iterations),
        ),
      );
    });
    row.append(
      createElement(
        "td",
        "",
        relevantColors.length > 0
          ? percent(featureSet.fullCommanderColorAccessByTurn[turn - 1]?.hitCount || 0, colorResult.iterations)
          : "Not needed",
      ),
    );
    row.append(
      createElement(
        "td",
        "",
        featureSet?.manaByTurn?.[turn - 1]?.averageTotalMana?.toFixed(2) ||
          simulationResult?.manaByTurn?.[turn - 1]?.averageTotalMana?.toFixed(2) ||
          simulationResult?.manaDevelopment?.turns?.[turn - 1]?.averageAvailableMana?.toFixed(2) ||
          "--",
      ),
    );
    row.append(
      createElement(
        "td",
        "",
        percent(featureSet.castabilityByTurn[turn - 1]?.anyCastable || 0, curveResult.iterations),
      ),
    );
    body.append(row);
  }
  table.append(body);
  tableWrap.append(table);

  if (featureSet?.manaByTurn?.length > 0 || simulationResult?.manaByTurn || simulationResult?.manaDevelopment?.turns) {
    const timeline = featureSet?.manaByTurn?.length
      ? featureSet.manaByTurn
      : simulationResult.manaByTurn || simulationResult.manaDevelopment.turns;
    const thresholdSummary = createElement(
      "div",
      "muted-value",
      [
        `2+ on T2 ${percent(timeline[1].atLeastThresholdCount, simulationResult.simulations)}`,
        `3+ on T3 ${percent(timeline[2].atLeastThresholdCount, simulationResult.simulations)}`,
        `4+ on T4 ${percent(timeline[3].atLeastThresholdCount, simulationResult.simulations)}`,
        `5+ on T5 ${percent(timeline[4].atLeastThresholdCount, simulationResult.simulations)}`,
        `6+ on T6 ${percent(timeline[5].atLeastThresholdCount, simulationResult.simulations)}`,
        `7+ on T7 ${percent(timeline[6].atLeastThresholdCount, simulationResult.simulations)}`,
        `8+ on T8 ${percent(timeline[7].atLeastThresholdCount, simulationResult.simulations)}`,
      ].join(" | "),
    );
    tableWrap.append(thresholdSummary);
  }
}

function renderSampleHands(result) {
  const container = document.querySelector("#sample-hands");
  container.replaceChildren();

  if (!result || result.examples.length === 0) {
    container.append(createElement("div", "empty-state", "No sample hands yet"));
    return;
  }

  result.examples.slice(0, 3).forEach((example, index) => {
    const card = createElement("article", "hand-card");
    const title = ["Balanced mana", "Low land", "Land heavy"][index] || "Sample";
    card.append(createElement("h3", "", title));

    const tags = Toolbar({ className: "tag-row" });
    tags.append(createElement("span", "tag-pill green", `${example.summary.lands} lands`));
    tags.append(createElement("span", "tag-pill blue", `${example.summary.ramp} ramp`));
    if (example.summary.lowLand || example.summary.highLand) {
      tags.append(createElement("span", "tag-pill red", "risk"));
    }
    card.append(tags);

    const list = createElement("ul", "hand-list");
    example.hand.forEach((handCard) => {
      const suffix = handCard.isLand ? " - land" : handCard.isRamp ? " - mana" : "";
      list.append(createElement("li", "", `${handCard.name}${suffix}`));
    });
    card.append(list);
    container.append(card);
  });
}

function renderEmpty(message = "Load a deck list to begin.") {
  const parsed = createEmptyParsedDeck();
  renderDeckMetrics(appState.parsed, null);
  renderDeckTagReview(appState.parsed);
  renderLandChart(null);
  renderManaStats(null);
  renderColorCurveAnalysis(null, null);
  renderSampleHands(null);
  renderNotes(parsed, message);
  renderLoadState();
}

function renderUnparsedDeck(message = "Deck loaded. Click Analyze Deck to parse and run.") {
  appState.parsed = null;
  appState.libraryCards = [];
  appState.library = [];
  appState.simulationFeatures = null;
  appState.awaitingCommanderConfirmation = false;
  appState.isDeckPanelCollapsed = false;
  appState.reviewOpen = false;
  appState.reviewShowDetails = false;
  appState.selectedCommanders = [];
  appState.selectedCommanderKeys = [];
  appState.commanderColorIdentity = [];
  appState.commanderSelectionMode = null;
  const parsed = createEmptyParsedDeck();
  renderDeckMetrics(appState.parsed, null);
  renderDeckTagReview(appState.parsed);
  renderLandChart(null);
  renderManaStats(null);
  renderColorCurveAnalysis(null, null);
  renderSampleHands(null);
  renderNotes(parsed, message);
  renderLoadState();
}

function setDeckText(text) {
  const deckText = document.querySelector("#deck-text");
  deckText.value = text;
  renderUnparsedDeck();
}

function isLikelyCommanderCandidate(card) {
  if (!card || isOutsideDeckCard(card)) return false;
  const typeLineText = (card.typeLines || []).join(" | ");
  return /legendary creature|legendary planeswalker/i.test(typeLineText);
}

function getDeckRequiredColorIdentityFromNonCommanders(parsed) {
  const cards = (parsed?.cards || []).filter((card) => !isOutsideDeckCard(card) && card.section !== "commander");
  return getDeckColors(cards);
}

function getCandidateColorIdentity(card) {
  const scryfall = getCardScryfall(card);
  const identity = Array.isArray(scryfall.color_identity)
    ? scryfall.color_identity.filter((color) => MANA_COLORS.includes(color))
    : [];
  if (identity.length > 0) {
    return identity;
  }

  const printedColors = Array.isArray(scryfall.colors)
    ? scryfall.colors.filter((color) => MANA_COLORS.includes(color))
    : [];
  if (printedColors.length > 0) {
    return printedColors;
  }

  const requirements = getManaCostRequirements(card);
  return MANA_COLORS.filter((color) => requirements.colors[color] > 0);
}

function getCommanderOptions(parsed) {
  const seen = new Set();
  const all = (parsed.cards || []).filter((card) => {
    if (isOutsideDeckCard(card) || seen.has(card.key)) return false;
    seen.add(card.key);
    return true;
  });
  const filtered = all.filter(isLikelyCommanderCandidate);
  const baseCandidates = filtered.length > 0 ? filtered : all;
  const hasCommanderSection = detectCommandersFromSections(parsed).length > 0;

  if (hasCommanderSection) {
    return baseCandidates;
  }

  const requiredColors = getDeckRequiredColorIdentityFromNonCommanders(parsed);
  if (requiredColors.length === 0) {
    return baseCandidates;
  }

  const legalCandidates = baseCandidates.filter((card) => {
    const candidateIdentity = getCandidateColorIdentity(card);
    const candidateColorSet = new Set(candidateIdentity);
    return requiredColors.every((color) => candidateColorSet.has(color));
  });

  return legalCandidates.length > 0 ? legalCandidates : baseCandidates;
}

function populateCommanderSelect(parsed) {
  const commanderSelects = document.querySelectorAll(".commander-select");
  const options = getCommanderOptions(parsed);

  commanderSelects.forEach((commanderSelect) => {
    const slot = Number.parseInt(commanderSelect.dataset.commanderSlot || "0", 10);
    commanderSelect.replaceChildren();
    const placeholder = slot === 0 ? "Select commander" : "Optional second commander";
    commanderSelect.append(createElement("option", "", placeholder));
    commanderSelect.options[0].value = "";

    options.forEach((card) => {
      const option = createElement("option", "", card.name);
      option.value = card.key;
      commanderSelect.append(option);
    });

    commanderSelect.value = appState.selectedCommanderKeys[slot] || "";
  });
}

function applyCommanderSelection(commanders, mode) {
  appState.selectedCommanders = commanders.map((commander) => commander.name);
  appState.selectedCommanderKeys = commanders.map(getCommanderKey);
  appState.commanderColorIdentity = getCommanderColorIdentity(commanders);
  appState.commanderSelectionMode = mode;
  refreshLibraryForCommanders();
}

function detectAndApplyCommanders(parsed) {
  const sectionCommanders = detectCommandersFromSections(parsed);

  if (sectionCommanders.length === 1 || sectionCommanders.length === 2) {
    applyCommanderSelection(sectionCommanders, "section");
    return;
  }

  appState.selectedCommanders = [];
  appState.selectedCommanderKeys = [];
  appState.commanderColorIdentity = [];
  appState.commanderSelectionMode = "manual";
  refreshLibraryForCommanders();
}

function getSelectedCommanderCards(parsed = appState.parsed) {
  if (!parsed || appState.selectedCommanderKeys.length === 0) {
    return [];
  }

  const selectedKeys = new Set(appState.selectedCommanderKeys);
  const commanders = [];
  const seen = new Set();

  (parsed.cards || []).forEach((card) => {
    const key = getCommanderKey(card);
    if (!selectedKeys.has(key) || seen.has(key)) return;
    commanders.push(card);
    seen.add(key);
  });

  return commanders;
}

function refreshLibraryForCommanders() {
  if (!appState.parsed) {
    appState.libraryCards = [];
    appState.library = [];
    return;
  }

  const commanders = getSelectedCommanderCards(appState.parsed);
  const commanderKeySet = getCommanderKeySet(commanders);
  const cards = appState.parsed.cards.map((card) => {
    const commandZone = isCommandZoneCard(card, commanderKeySet);
    return {
      ...card,
      isCommander: commandZone,
      zone: commandZone ? "command" : isOutsideDeckCard(card) ? "outside" : "library",
    };
  });
  appState.libraryCards = buildLibraryCards(cards, commanders);
  appState.library = buildLibrary(cards, commanders);
  appState.parsed = {
    ...appState.parsed,
    cards,
    totals: summarizeDeck(cards, commanders),
  };
}

function clearDeck() {
  const deckText = document.querySelector("#deck-text");
  deckText.value = "";
  appState.parsed = null;
  appState.libraryCards = [];
  appState.library = [];
  appState.simulationFeatures = null;
  appState.awaitingCommanderConfirmation = false;
  appState.isAnalyzing = false;
  appState.isDeckPanelCollapsed = false;
  appState.reviewOpen = false;
  appState.reviewShowDetails = false;
  appState.selectedCommanders = [];
  appState.selectedCommanderKeys = [];
  appState.commanderColorIdentity = [];
  appState.commanderSelectionMode = null;
  renderEmpty();
}

function editDeckList() {
  appState.isDeckPanelCollapsed = false;
  appState.awaitingCommanderConfirmation = false;
  appState.reviewOpen = false;
  appState.reviewShowDetails = false;
  renderLoadState();
  document.querySelector("#deck-text")?.focus();
}

async function parseLoadedDeck() {
  const rawText = document.querySelector("#deck-text").value;
  const previousCommanderKeys = [...appState.selectedCommanderKeys];

  if (!rawText.trim()) {
    appState.parsed = null;
    appState.libraryCards = [];
    appState.library = [];
    appState.simulationFeatures = null;
    appState.awaitingCommanderConfirmation = false;
    appState.isAnalyzing = false;
    appState.isDeckPanelCollapsed = false;
    appState.reviewOpen = false;
    appState.reviewShowDetails = false;
    appState.selectedCommanders = [];
    appState.selectedCommanderKeys = [];
    appState.commanderColorIdentity = [];
    appState.commanderSelectionMode = null;
    renderEmpty("Paste a deck list first.");
    return false;
  }

  appState.isParsing = true;
  renderLoadState();

  let parsed = parseDeck(rawText);
  let lookupMessage = "Deck parsed and tagged";
  let cardsByName = new Map();

  try {
    const scryfallLookup = await fetchScryfallCardsByName(parsed.cards);
    cardsByName = scryfallLookup.cardsByName;
    parsed = enrichParsedDeck(parsed, cardsByName);

    if (scryfallLookup.missing.length > 0) {
      lookupMessage = `Deck parsed. ${scryfallLookup.missing.length} cards were not found on Scryfall`;
    }
  } catch (error) {
    parsed = enrichParsedDeck(parsed);
    lookupMessage = "Deck parsed, but Scryfall type lookup failed";
  }

  try {
    const otagsByName = await fetchBroadOtagsByName(parsed.cards);
    parsed = enrichParsedDeck(parsed, cardsByName, otagsByName);
  } catch (error) {
    lookupMessage = `${lookupMessage}. Otag lookup failed`;
  } finally {
    appState.isParsing = false;
  }

  appState.parsed = parsed;
  appState.simulationFeatures = null;
  appState.awaitingCommanderConfirmation = false;
  appState.isAnalyzing = false;
  appState.reviewOpen = false;
  appState.reviewShowDetails = false;

  if (!parsed.cards || parsed.cards.length === 0) {
    renderDeckMetrics(parsed, null);
    renderDeckTagReview(parsed);
    renderLandChart(null);
    renderManaStats(null);
    renderColorCurveAnalysis(null, null);
    renderSampleHands(null);
    renderNotes(parsed, "Could not parse any deck cards from input.");
    renderLoadState();
    return false;
  }

  detectAndApplyCommanders(parsed);
  if (appState.selectedCommanders.length === 0 && previousCommanderKeys.length > 0) {
    const previousCommanders = previousCommanderKeys
      .map((key) => parsed.cards.find((card) => getCommanderKey(card) === key))
      .filter(Boolean);
    if (previousCommanders.length > 0) {
      applyCommanderSelection(previousCommanders, "manual");
    }
  }
  populateCommanderSelect(parsed);
  appState.isDeckPanelCollapsed = false;
  appState.awaitingCommanderConfirmation = true;

  renderDeckMetrics(parsed, null);
  renderDeckTagReview(parsed);
  renderLandChart(null);
  renderManaStats(null);
  renderColorCurveAnalysis(null, null);
  renderSampleHands(null);
  renderNotes(
    appState.parsed,
    appState.library.length > 0 ? lookupMessage : "No library cards found",
  );
  renderLoadState();
  if (appState.selectedCommanders.length === 0) {
    renderNotes(
      appState.parsed,
      "Commander confirmation needed. Select one or two commanders, then click Analyze Deck.",
    );
    return false;
  }
  renderNotes(appState.parsed, "Commander preselected. Confirm or edit, then click Analyze Deck.");
  renderLoadState();
  return false;
}

function simulateCurrentDeck() {
  const parsed = appState.parsed;
  const library = appState.library;
  const simulations = clampNumber(document.querySelector("#simulation-count").value, 100, 250000, 10000);
  document.querySelector("#simulation-count").value = simulations;

  if (!parsed || library.length === 0) {
    const currentParsed = parsed || createEmptyParsedDeck();
    renderDeckMetrics(currentParsed, null);
    renderDeckTagReview(currentParsed);
    renderLandChart(null);
    renderManaStats(null);
    renderColorCurveAnalysis(null, null);
    renderSampleHands(null);
    renderNotes(currentParsed, "Analyze a deck first.");
    renderLoadState();
    return;
  }

  const result = runSimulation(library, { simulations, handSize: OPENING_HAND_SIZE });
  const colorResult =
    appState.selectedCommanders.length > 0
      ? simulateColorAccess(library, simulations, appState.commanderColorIdentity)
      : null;
  const curveResult =
    appState.selectedCommanders.length > 0
      ? simulateCurveAccess(library, simulations, appState.commanderColorIdentity)
      : null;
  const commanderCastResult =
    appState.selectedCommanders.length > 0
      ? simulateCommanderCastAccess(
          library,
          getSelectedCommanderCards(appState.parsed),
          simulations,
          appState.commanderColorIdentity,
        )
      : null;
  const simulationFeatures = createSimulationFeatures({
    simulationResult: result,
    colorResult,
    curveResult,
    commanderCastResult,
  });
  appState.simulationFeatures = simulationFeatures;
  appState.awaitingCommanderConfirmation = false;
  appState.isAnalyzing = false;
  renderDeckMetrics(parsed, result);
  renderDeckTagReview(parsed);
  renderLandChart(result);
  renderManaStats(result);
  renderColorCurveAnalysis(colorResult, curveResult, commanderCastResult, result, simulationFeatures);
  renderSampleHands(result);
  renderNotes(parsed, "Simulation complete");
  appState.isDeckPanelCollapsed = true;
  renderLoadState();
}

function handleDeckTextInput() {
  appState.isDeckPanelCollapsed = false;
  renderLoadState();

  if (!document.querySelector("#deck-text").value.trim()) {
    renderNotes(createEmptyParsedDeck(), "Paste a deck list to begin");
    return;
  }

  if (appState.parsed) {
    renderNotes(appState.parsed, "Deck list changed. Analyze Deck to refresh results");
    return;
  }

  renderNotes(createEmptyParsedDeck(), "Deck text loaded. Click Analyze Deck");
}

async function analyzeDeck() {
  await parseLoadedDeck();
}

function confirmCommanderAndAnalyze() {
  if (!appState.parsed || !appState.awaitingCommanderConfirmation) {
    return;
  }
  if (appState.selectedCommanders.length === 0) {
    renderNotes(appState.parsed, "Select one or two commanders before analysis.");
    return;
  }
  appState.isAnalyzing = true;
  renderLoadState();
  setTimeout(() => {
    simulateCurrentDeck();
  }, 0);
}

function closeCommanderConfirmation() {
  if (!appState.parsed) {
    return;
  }
  if (appState.isAnalyzing || appState.isParsing) {
    return;
  }
  appState.awaitingCommanderConfirmation = false;
  renderNotes(appState.parsed, "Commander confirmation paused. Click Continue to reopen.");
  renderLoadState();
}

function toggleDeckReviewOpen() {
  if (!appState.parsed || appState.parsed.cards.length === 0) {
    return;
  }
  appState.reviewOpen = !appState.reviewOpen;
  if (!appState.reviewOpen) {
    appState.reviewShowDetails = false;
  }
  renderDeckTagReview(appState.parsed);
}

function toggleDeckReviewDetails() {
  if (!appState.reviewOpen) {
    return;
  }
  appState.reviewShowDetails = !appState.reviewShowDetails;
  renderDeckTagReview(appState.parsed);
}

function handleCommanderSelectChange(event) {
  if (!appState.parsed) return;
  const selectRoot = event.currentTarget.closest("#commander-setup");
  const selectedKeys = [...selectRoot.querySelectorAll(".commander-select")]
    .map((select) => select.value)
    .filter(Boolean);
  const uniqueKeys = [...new Set(selectedKeys)].slice(0, 2);
  const commanders = uniqueKeys
    .map((key) => appState.parsed.cards.find((card) => getCommanderKey(card) === key))
    .filter(Boolean);

  if (commanders.length === 0) {
    appState.selectedCommanders = [];
    appState.selectedCommanderKeys = [];
    appState.commanderColorIdentity = [];
    appState.simulationFeatures = null;
    appState.awaitingCommanderConfirmation = true;
    refreshLibraryForCommanders();
    populateCommanderSelect(appState.parsed);
    renderDeckMetrics(appState.parsed, null);
    renderLandChart(null);
    renderManaStats(null);
    renderColorCurveAnalysis(null, null);
    renderSampleHands(null);
    renderLoadState();
    return;
  }

  applyCommanderSelection(commanders, "manual");
  appState.simulationFeatures = null;
  appState.awaitingCommanderConfirmation = true;
  populateCommanderSelect(appState.parsed);
  renderDeckMetrics(appState.parsed, null);
  renderLandChart(null);
  renderManaStats(null);
  renderColorCurveAnalysis(null, null);
  renderSampleHands(null);
  renderLoadState();
}

function initApp() {
  const deckText = document.querySelector("#deck-text");
  const sampleButton = document.querySelector("#sample-button");
  const clearButton = document.querySelector("#clear-button");
  const clearStartOverButton = document.querySelector("#clear-start-over-button");
  const editInputButton = document.querySelector("#edit-input-button");
  const analyzeButton = document.querySelector("#analyze-button");
  const commanderConfirmAnalyzeButton = document.querySelector("#commander-confirm-analyze");
  const commanderConfirmBackButton = document.querySelector("#commander-confirm-back");
  const toggleReviewButton = document.querySelector("#toggle-review-button");
  const toggleReviewDetailsButton = document.querySelector("#toggle-review-details-button");
  const commanderSelects = document.querySelectorAll(".commander-select");

  sampleButton?.addEventListener("click", () => {
    setDeckText(SAMPLE_DECK);
  });

  clearButton?.addEventListener("click", clearDeck);
  clearStartOverButton?.addEventListener("click", clearDeck);
  editInputButton?.addEventListener("click", editDeckList);
  analyzeButton?.addEventListener("click", analyzeDeck);
  commanderConfirmAnalyzeButton?.addEventListener("click", confirmCommanderAndAnalyze);
  commanderConfirmBackButton?.addEventListener("click", closeCommanderConfirmation);
  toggleReviewButton?.addEventListener("click", toggleDeckReviewOpen);
  toggleReviewDetailsButton?.addEventListener("click", toggleDeckReviewDetails);
  commanderSelects.forEach((select) => {
    select.addEventListener("change", handleCommanderSelectChange);
  });
  deckText?.addEventListener("input", handleDeckTextInput);

  renderEmpty();
}

if (typeof document !== "undefined") {
  initApp();
}

if (typeof module !== "undefined") {
  module.exports = {
    buildLibrary,
    buildLibraryCards,
    canPayManaCost,
    classifyCard,
    createSimulationFeatures,
    detectCommandersFromSections,
    enrichParsedDeck,
    getCommanderColorIdentity,
    getManaCostRequirements,
    getProducedColors,
    getRelevantColors,
    hasOtag,
    parseDeck,
    drawHand,
    getCommanderOptions,
    Section,
    StatCard,
    Toolbar,
    runSimulation,
    SAMPLE_DECK,
    simulateCommanderCastAccess,
    simulateColorAccess,
    simulateCurveAccess,
    summarizeRoleCounts,
    summarizeDeck,
    summarizeHand,
  };
}
