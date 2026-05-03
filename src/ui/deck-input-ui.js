(function () {
function getDeckTextElement() {
  return document.querySelector("#deck-text");
}

function getDeckTextValue() {
  return getDeckTextElement()?.value || "";
}

function setDeckTextValue(text) {
  const deckText = getDeckTextElement();
  if (deckText) {
    deckText.value = text;
  }
}

function clearDeckTextValue() {
  setDeckTextValue("");
}

function focusDeckText() {
  getDeckTextElement()?.focus();
}

function renderDeckInputNotes(parsed, leadingMessage = "", { createEmptyParsedDeck, summarizeDeck }) {
  const notes = document.querySelector("#parse-notes");
  if (!notes) return;
  const safeParsed = parsed || createEmptyParsedDeck();
  const totals = safeParsed.totals || summarizeDeck([]);
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

  if ((safeParsed.ignored || []).length > 0) {
    messages.push(`${safeParsed.ignored.length} lines skipped`);
  }

  if (totals.commanders === 2) {
    messages.push("Two commanders selected");
  }

  if (totals.library > 0 && ![98, 99].includes(totals.library)) {
    messages.push("EDH libraries are usually 99 cards with one commander or 98 with two");
  }

  notes.textContent = messages.join(". ");
}

function updateContinueButton({
  parsed,
  simulationFeatures,
  isParsing,
  awaitingLegalityConfirmation,
  awaitingCommanderConfirmation,
  selectedCommanders,
}) {
  const deckText = getDeckTextElement();
  const analyzeButton = document.querySelector("#analyze-button");
  const hasDeckText = deckText.value.trim().length > 0;
  const hasParsedDeck = Boolean(parsed && parsed.cards.length > 0);
  const hasAnalysis = Boolean(simulationFeatures);
  const isAwaitingConfirmation = awaitingCommanderConfirmation && hasParsedDeck;
  const isAwaitingLegality = awaitingLegalityConfirmation && hasParsedDeck;
  const actionLabel = "Continue";

  analyzeButton.disabled =
    isParsing ||
    isAwaitingLegality ||
    (!hasParsedDeck && !hasDeckText) ||
    (isAwaitingConfirmation && selectedCommanders.length === 0);
  analyzeButton.textContent = isParsing ? `${actionLabel}...` : actionLabel;

  return {
    hasDeckText,
    hasParsedDeck,
    hasAnalysis,
    isAwaitingConfirmation,
    isAwaitingLegality,
  };
}

const exported = {
  clearDeckTextValue,
  focusDeckText,
  getDeckTextElement,
  getDeckTextValue,
  renderDeckInputNotes,
  setDeckTextValue,
  updateContinueButton,
};

if (typeof module !== "undefined") {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.EDHCardDomain.deckInputUi = exported;
}
})();
