(function () {
const cardDomain =
  typeof require !== "undefined"
    ? require("./cards.js")
    : window.EDHCardDomain;

const {
  MANA_COLORS,
  getCardScryfall,
  getDeckColors,
  getManaCostRequirements,
  getOracleText,
  getRelevantColors,
  normalizeKey,
} = cardDomain;

const OUTSIDE_DECK_SECTIONS = new Set(["sideboard", "maybeboard"]);

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

function isLikelyCommanderCandidate(card) {
  if (!card || isOutsideDeckCard(card)) return false;
  const typeLineText = getTypeLineText(card);
  return (
    /legendary creature|legendary planeswalker/i.test(typeLineText) ||
    isBackgroundCommanderCard(card)
  );
}

function getDeckRequiredColorIdentityFromNonCommanders(parsed) {
  const cards = (parsed?.cards || []).filter((card) => !isOutsideDeckCard(card) && card.section !== "commander");
  return getDeckColors(cards);
}

function getTypeLineText(card) {
  const typeLines = Array.isArray(card?.typeLines) ? card.typeLines : [];
  if (typeLines.length > 0) {
    return typeLines.join(" | ");
  }
  return (getCardScryfall(card).type_line || "").toString();
}

function getOracleTextLower(card) {
  return getOracleText(card).toLowerCase();
}

function isBackgroundCommanderCard(card) {
  return /\blegendary enchantment\b/i.test(getTypeLineText(card)) && /\bbackground\b/i.test(getTypeLineText(card));
}

function isDoctorCommanderCard(card) {
  const typeLineText = getTypeLineText(card);
  return /\blegendary creature\b/i.test(typeLineText) && /\bdoctor\b/i.test(typeLineText);
}

function getPartnerWithTargetKey(card) {
  const oracleText = getOracleTextLower(card);
  const match = oracleText.match(/\bpartner with\s+([^(.]+)/i);
  if (!match || !match[1]) return null;
  return normalizeKey(match[1].trim());
}

function getCommanderPartnerProfile(card) {
  const scryfall = getCardScryfall(card);
  const keywords = Array.isArray(scryfall.keywords)
    ? scryfall.keywords.map((keyword) => keyword.toLowerCase())
    : [];
  const oracleText = getOracleTextLower(card);

  const hasPartner =
    keywords.includes("partner") || (/\bpartner\b/i.test(oracleText) && !/\bpartner with\b/i.test(oracleText));
  const hasFriendsForever = keywords.includes("friends forever") || /\bfriends forever\b/i.test(oracleText);
  const hasChooseBackground =
    keywords.includes("choose a background") || /\bchoose a background\b/i.test(oracleText);
  const hasDoctorsCompanion =
    keywords.includes("doctor's companion") ||
    keywords.includes("doctors companion") ||
    /\bdoctor(?:'|\u00e2\u20ac\u2122)?s companion\b/i.test(oracleText);
  const partnerWithTargetKey = getPartnerWithTargetKey(card);

  return {
    hasPartner,
    hasFriendsForever,
    hasChooseBackground,
    hasDoctorsCompanion,
    partnerWithTargetKey,
    isBackground: isBackgroundCommanderCard(card),
    isDoctor: isDoctorCommanderCard(card),
  };
}

function canCardsFormLegalPartnerPair(cardA, cardB) {
  if (!cardA || !cardB) return false;
  if (getCommanderKey(cardA) === getCommanderKey(cardB)) return false;

  const a = getCommanderPartnerProfile(cardA);
  const b = getCommanderPartnerProfile(cardB);

  if (a.hasPartner && b.hasPartner) return true;
  if (a.hasFriendsForever && b.hasFriendsForever) return true;
  if ((a.hasChooseBackground && b.isBackground) || (b.hasChooseBackground && a.isBackground)) return true;
  if ((a.hasDoctorsCompanion && b.isDoctor) || (b.hasDoctorsCompanion && a.isDoctor)) return true;

  if (a.partnerWithTargetKey && a.partnerWithTargetKey === getCommanderKey(cardB)) return true;
  if (b.partnerWithTargetKey && b.partnerWithTargetKey === getCommanderKey(cardA)) return true;

  return false;
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

function getCombinedCommanderColorIdentity(cards) {
  const colors = new Set();
  cards.forEach((card) => {
    getCandidateColorIdentity(card).forEach((color) => colors.add(color));
  });
  return getRelevantColors([...colors]);
}

function getCommanderCandidatePool(parsed) {
  const seen = new Set();
  const all = (parsed.cards || []).filter((card) => {
    if (isOutsideDeckCard(card) || seen.has(card.key)) return false;
    seen.add(card.key);
    return true;
  });
  const filtered = all.filter(isLikelyCommanderCandidate);
  const baseCandidates = filtered.length > 0 ? filtered : all;
  const hasCommanderSection = detectCommandersFromSections(parsed).length > 0;
  const requiredColors = getDeckRequiredColorIdentityFromNonCommanders(parsed);
  const legalSingles = requiredColors.length === 0
    ? baseCandidates
    : baseCandidates.filter((card) => {
        const candidateColorSet = new Set(getCandidateColorIdentity(card));
        return requiredColors.every((color) => candidateColorSet.has(color));
      });

  const legalPartnerPairs = [];
  if (!hasCommanderSection && requiredColors.length > 0) {
    for (let i = 0; i < baseCandidates.length; i += 1) {
      for (let j = i + 1; j < baseCandidates.length; j += 1) {
        const first = baseCandidates[i];
        const second = baseCandidates[j];
        if (!canCardsFormLegalPartnerPair(first, second)) continue;
        const combined = new Set(getCombinedCommanderColorIdentity([first, second]));
        if (requiredColors.every((color) => combined.has(color))) {
          legalPartnerPairs.push([first, second]);
        }
      }
    }
  }

  return {
    all,
    baseCandidates,
    hasCommanderSection,
    requiredColors,
    legalSingles,
    legalPartnerPairs,
  };
}

function getCommanderOptions(parsed) {
  const {
    baseCandidates,
    hasCommanderSection,
    requiredColors,
    legalSingles,
    legalPartnerPairs,
  } = getCommanderCandidatePool(parsed);

  if (hasCommanderSection) {
    return baseCandidates;
  }

  if (requiredColors.length === 0) {
    return baseCandidates;
  }

  const legalCandidates = new Set(legalSingles.map((card) => card.key));
  legalPartnerPairs.forEach((pair) => {
    pair.forEach((card) => legalCandidates.add(card.key));
  });

  if (legalCandidates.size === 0) {
    return [];
  }

  return baseCandidates.filter((card) => legalCandidates.has(card.key));
}

function dedupeNames(names = []) {
  const seen = new Set();
  const ordered = [];
  names.forEach((name) => {
    const key = normalizeKey(name || "");
    if (!name || seen.has(key)) return;
    seen.add(key);
    ordered.push(name);
  });
  return ordered;
}

function cardFitsCommanderIdentity(card, commanderColorSet) {
  const identity = getCandidateColorIdentity(card);
  if (!Array.isArray(identity) || identity.length === 0) {
    return true;
  }
  return identity.every((color) => commanderColorSet.has(color));
}

function getCommanderLegalityIssueMessage(type, cards = [], details = "") {
  if (type === "deck_size") return details;
  if (type === "commander_pair") return "These two commanders cannot be paired.";
  if (type === "color_identity") {
    if (cards.length === 1) return `${cards[0]} is outside your commanders' color identity.`;
    return `${cards.slice(0, 3).join(", ")}${cards.length > 3 ? ` and ${cards.length - 3} more` : ""} are outside your commanders' color identity.`;
  }
  if (type === "banned_card") {
    if (cards.length === 1) return `${cards[0]} is banned in Commander.`;
    return `${cards.slice(0, 3).join(", ")}${cards.length > 3 ? ` and ${cards.length - 3} more` : ""} are banned in Commander.`;
  }
  return details || "Commander legality issue found.";
}

function validateCommanderDeckLegality(parsed, commanders = [], summarizeDeck = null) {
  const cards = Array.isArray(parsed?.cards) ? parsed.cards : [];
  const selectedCommanders = Array.isArray(commanders) ? commanders.filter(Boolean) : [];
  const commanderKeySet = getCommanderKeySet(selectedCommanders);
  const totals = parsed?.totals || (summarizeDeck ? summarizeDeck(cards, selectedCommanders) : {
    total: 0,
    library: 0,
    commanders: 0,
    excluded: 0,
    lands: 0,
    ramp: 0,
    turnOneRamp: 0,
  });
  const issues = [];

  if (totals.total !== 100) {
    issues.push({
      type: "deck_size",
      severity: "error",
      message: `Deck has ${totals.total} cards. Commander decks should have exactly 100 including commander(s).`,
    });
  }

  if (selectedCommanders.length === 2 && !canCardsFormLegalPartnerPair(selectedCommanders[0], selectedCommanders[1])) {
    issues.push({
      type: "commander_pair",
      severity: "error",
      message: getCommanderLegalityIssueMessage("commander_pair"),
      cards: selectedCommanders.map((card) => card.name),
    });
  }

  const commanderIdentitySet = new Set(getCommanderColorIdentity(selectedCommanders));
  const hasCommanderIdentityMetadata = selectedCommanders.every((commander) =>
    Array.isArray(getCardScryfall(commander)?.color_identity),
  );
  const outsideIdentityCards = [];
  const bannedCards = [];

  cards.forEach((card) => {
    if (isOutsideDeckCard(card) || isCommandZoneCard(card, commanderKeySet)) return;
    if (hasCommanderIdentityMetadata && !cardFitsCommanderIdentity(card, commanderIdentitySet)) {
      outsideIdentityCards.push(card.name);
    }
    const commanderLegality = getCardScryfall(card)?.legalities?.commander;
    if (commanderLegality === "banned") {
      bannedCards.push(card.name);
    }
  });

  const uniqueOutsideIdentityCards = dedupeNames(outsideIdentityCards);
  if (uniqueOutsideIdentityCards.length > 0) {
    issues.push({
      type: "color_identity",
      severity: "error",
      message: getCommanderLegalityIssueMessage("color_identity", uniqueOutsideIdentityCards),
      cards: uniqueOutsideIdentityCards,
    });
  }

  const uniqueBannedCards = dedupeNames(bannedCards);
  if (uniqueBannedCards.length > 0) {
    issues.push({
      type: "banned_card",
      severity: "error",
      message: getCommanderLegalityIssueMessage("banned_card", uniqueBannedCards),
      cards: uniqueBannedCards,
    });
  }

  return {
    isLegal: issues.length === 0,
    issues,
  };
}

const exported = {
  canCardsFormLegalPartnerPair,
  cardFitsCommanderIdentity,
  dedupeNames,
  detectCommandersFromSections,
  getCandidateColorIdentity,
  getCombinedCommanderColorIdentity,
  getCommanderCandidatePool,
  getCommanderColorIdentity,
  getCommanderKey,
  getCommanderKeySet,
  getCommanderLegalityIssueMessage,
  getCommanderOptions,
  getCommanderPartnerProfile,
  getDeckRequiredColorIdentityFromNonCommanders,
  getOracleTextLower,
  getPartnerWithTargetKey,
  getTypeLineText,
  isBackgroundCommanderCard,
  isCommandZoneCard,
  isDoctorCommanderCard,
  isLikelyCommanderCandidate,
  isOutsideDeckCard,
  validateCommanderDeckLegality,
};

if (typeof module !== "undefined") {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.EDHCardDomain.commander = exported;
}
})();
