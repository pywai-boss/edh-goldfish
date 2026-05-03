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
  getCardScryfall,
  normalizeKey,
} = cardDomain;

const {
  canCardsFormLegalPartnerPair,
  getCandidateColorIdentity,
  getCommanderColorIdentity,
  getCommanderKeySet,
  isCommandZoneCard,
  isOutsideDeckCard,
} = commanderDomain;

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
  cardFitsCommanderIdentity,
  dedupeNames,
  getCommanderLegalityIssueMessage,
  validateCommanderDeckLegality,
};

if (typeof module !== "undefined") {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.EDHCardDomain.legality = exported;
}
})();
