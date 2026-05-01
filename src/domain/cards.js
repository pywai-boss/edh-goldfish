(function () {
const MANA_COLORS = ["W", "U", "B", "R", "G"];

const BASIC_LAND_COLORS = {
  plains: "W",
  island: "U",
  swamp: "B",
  mountain: "R",
  forest: "G",
};

function normalizeKey(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[â€™]/g, "'")
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

function getRelevantColors(commanderColorIdentity = []) {
  return MANA_COLORS.filter((color) => commanderColorIdentity.includes(color));
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

const exported = {
  BASIC_LAND_COLORS,
  MANA_COLORS,
  canPayManaCost,
  cleanCardName,
  entersTapped,
  getCardScryfall,
  getDeckColors,
  getFrontFaceTypeLine,
  getManaCostRequirements,
  getOracleText,
  getProducedColors,
  getRelevantColors,
  getScryfallTypeLines,
  hasAnyTag,
  hasOtag,
  isLandTypeLine,
  normalizeKey,
  normalizeOtag,
};

if (typeof module !== "undefined") {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.EDHCardDomain = exported;
}
})();
