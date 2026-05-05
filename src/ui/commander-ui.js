(function () {
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

function getCommanderPreviewImageUrl(cardOrScryfall) {
  const source = cardOrScryfall?.scryfall ? cardOrScryfall.scryfall : cardOrScryfall || {};
  if (source.image_uris?.small) return source.image_uris.small;
  if (source.image_uris?.normal) return source.image_uris.normal;
  if (Array.isArray(source.card_faces)) {
    for (const face of source.card_faces) {
      if (face?.image_uris?.small) return face.image_uris.small;
      if (face?.image_uris?.normal) return face.image_uris.normal;
    }
  }
  return null;
}

function populateCommanderSelect({ parsed, selectedCommanderKeys, getCommanderOptions }) {
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

    commanderSelect.value = selectedCommanderKeys[slot] || "";
  });
}

function renderLegalityIssuesList(report) {
  const legalityIssues = document.querySelector("#commander-legality-issues");
  if (!legalityIssues) return;
  legalityIssues.replaceChildren();
  const issues = Array.isArray(report?.issues) ? report.issues : [];
  if (issues.length === 0) {
    legalityIssues.append(createElement("li", "", "No issues found."));
    return;
  }
  issues.forEach((issue) => {
    const label = issue.severity === "warning" ? "Warning" : "Issue";
    legalityIssues.append(createElement("li", "", `${label}: ${issue.message}`));
  });
}

function renderCommanderCandidatePreview({
  appState,
  getCommanderOptions,
  getCommanderKey,
  canCardsFormLegalPartnerPair,
  renderNotes,
  applyCommanderSelection,
  populateCommanderSelect,
  renderLoadState,
  ensureCommanderCandidateImages,
}) {
  const container = document.querySelector("#commander-candidate-preview");
  if (!container || !appState.parsed || !appState.awaitingCommanderConfirmation) return;
  const options = getCommanderOptions(appState.parsed);
  container.replaceChildren();
  const primaryKey = appState.selectedCommanderKeys[0] || null;
  const secondaryKey = appState.selectedCommanderKeys[1] || null;

  function applyCommanderChoice(slot, cardKey) {
    if (!cardKey) return;
    const nextKeys = [...appState.selectedCommanderKeys];
    const otherSlot = slot === 0 ? 1 : 0;
    if (nextKeys[otherSlot] === cardKey) {
      return;
    }
    nextKeys[slot] = cardKey;
    const uniqueKeys = [...new Set(nextKeys.filter(Boolean))].slice(0, 2);
    const orderedKeys = [nextKeys[0], nextKeys[1]].filter((key) => uniqueKeys.includes(key));
    const commanders = orderedKeys
      .map((key) => appState.parsed.cards.find((entry) => getCommanderKey(entry) === key))
      .filter(Boolean);
    if (commanders.length === 2 && !canCardsFormLegalPartnerPair(commanders[0], commanders[1])) {
      renderNotes(appState.parsed, "Selected pair is not a legal partner-style commander combination.");
      return;
    }
    if (commanders.length > 0) {
      applyCommanderSelection(commanders, "manual");
      populateCommanderSelect(appState.parsed);
      renderLoadState();
    }
  }

  options.slice(0, 12).forEach((card) => {
    const isPrimary = primaryKey === card.key;
    const isSecondary = secondaryKey === card.key;
    const cardClass = `commander-candidate-card${isPrimary ? " selected-primary" : ""}${isSecondary ? " selected-secondary" : ""}`;
    const item = createElement("article", cardClass);
    const directImage = getCommanderPreviewImageUrl(card);
    const cachedImage = appState.commanderImageCache.get(card.key);
    const imageUrl = directImage || cachedImage || null;
    if (imageUrl) {
      const image = createElement("img");
      image.src = imageUrl;
      image.alt = card.name;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      item.append(image);
    } else {
      item.append(createElement("div", "commander-candidate-fallback", "Preview unavailable"));
    }
    if (isPrimary) {
      item.append(createElement("span", "commander-candidate-badge", "Commander"));
    }
    if (isSecondary) {
      item.append(createElement("span", "commander-candidate-badge secondary", "Second commander"));
    }
    item.append(createElement("div", "commander-candidate-name", card.name));
    item.addEventListener("click", () => {
      const targetSlot = appState.secondCommanderEnabled && appState.commanderSelectionTarget === "secondary" ? 1 : 0;
      if (targetSlot === 1 && !primaryKey) {
        return;
      }
      applyCommanderChoice(targetSlot, card.key);
    });
    container.append(item);
  });

  ensureCommanderCandidateImages(options.slice(0, 12));
}

function updateCommanderModalState({
  appState,
  hasParsedDeck,
  shouldCollapseInput,
  isCommanderModalOpen,
  isAwaitingConfirmation,
  isAwaitingLegality,
  renderLegalityIssuesList,
  renderCommanderCandidatePreview,
}) {
  const modalBackdrop = document.querySelector("#commander-modal-backdrop");
  const commanderSetup = document.querySelector("#commander-setup");
  const commanderModalTitle = document.querySelector("#commander-modal-title");
  const commanderLoadingState = document.querySelector("#commander-loading-state");
  const commanderLoadingText = document.querySelector("#commander-loading-text");
  const commanderConfirmationContent = document.querySelector("#commander-confirmation-content");
  const commanderLegalityContent = document.querySelector("#commander-legality-content");
  const legalityEditDeckButton = document.querySelector("#legality-edit-deck");
  const legalityEditCommanderButton = document.querySelector("#legality-edit-commander");
  const legalityContinueButton = document.querySelector("#legality-continue-anyway");
  const commanderConfirmAnalyzeButton = document.querySelector("#commander-confirm-analyze");
  const commanderConfirmBackButton = document.querySelector("#commander-confirm-back");
  const secondCommanderPicker = document.querySelector("#second-commander-picker");
  const toggleSecondCommanderButton = document.querySelector("#toggle-second-commander");
  const commanderTargetToggle = document.querySelector("#commander-target-toggle");
  const targetPrimaryButton = document.querySelector("#target-primary");
  const targetSecondaryButton = document.querySelector("#target-secondary");
  const commanderNote = document.querySelector("#commander-note");
  const commanderSelects = document.querySelectorAll(".commander-select");
  const commanderCandidatePreview = document.querySelector("#commander-candidate-preview");

  commanderSetup.classList.toggle("is-hidden", (!hasParsedDeck && !appState.isParsing) || shouldCollapseInput);
  commanderSetup.classList.toggle("is-modal-open", isCommanderModalOpen && !shouldCollapseInput);
  modalBackdrop?.classList.toggle("is-hidden", !isCommanderModalOpen || shouldCollapseInput);
  modalBackdrop?.setAttribute("aria-hidden", isCommanderModalOpen && !shouldCollapseInput ? "false" : "true");
  commanderLoadingState?.classList.toggle("is-hidden", !appState.isParsing && !appState.isAnalyzing);
  commanderConfirmationContent?.classList.toggle(
    "is-hidden",
    appState.isParsing || appState.isAnalyzing || isAwaitingLegality,
  );
  commanderLegalityContent?.classList.toggle(
    "is-hidden",
    !isAwaitingLegality || appState.isParsing || appState.isAnalyzing,
  );
  commanderLoadingText.textContent = appState.isAnalyzing
    ? "Checking mana, colors, and commander timing..."
    : "Reading cards and finding commander options...";
  if (commanderModalTitle) {
    if (appState.isParsing) {
      commanderModalTitle.textContent = "Preparing deck";
    } else if (appState.isAnalyzing) {
      commanderModalTitle.textContent = "Running analysis";
    } else if (isAwaitingLegality) {
      commanderModalTitle.textContent = "Deck legality check";
    } else {
      commanderModalTitle.textContent = "Confirm commander";
    }
  }
  commanderConfirmAnalyzeButton.disabled =
    appState.isAnalyzing || appState.isParsing || isAwaitingLegality || appState.selectedCommanders.length === 0;
  commanderConfirmAnalyzeButton.textContent = appState.isAnalyzing ? "Analyzing mana..." : "Analyze Deck";
  commanderConfirmBackButton.disabled = appState.isAnalyzing || appState.isParsing || isAwaitingLegality;
  legalityEditDeckButton && (legalityEditDeckButton.disabled = appState.isAnalyzing || appState.isParsing);
  legalityEditCommanderButton &&
    (legalityEditCommanderButton.disabled = appState.isAnalyzing || appState.isParsing);
  legalityContinueButton && (legalityContinueButton.disabled = appState.isAnalyzing || appState.isParsing);
  commanderNote.textContent =
    appState.selectedCommanders.length === 2
      ? "Two commanders selected. Analyze Deck checks commander legality before simulation."
      : "Choose one commander, or add a second for partner-style decks. Analyze Deck uses this selection.";
  commanderSelects.forEach((select) => {
    select.disabled = !hasParsedDeck || appState.isAnalyzing || appState.isParsing;
  });
  secondCommanderPicker?.classList.toggle("is-hidden", !appState.secondCommanderEnabled);
  toggleSecondCommanderButton.textContent = appState.secondCommanderEnabled
    ? "Remove second commander"
    : "Add second commander";
  toggleSecondCommanderButton.disabled = appState.isAnalyzing || appState.isParsing || !hasParsedDeck;
  commanderTargetToggle?.classList.toggle("is-hidden", !appState.secondCommanderEnabled);
  targetPrimaryButton?.classList.toggle("is-active", appState.commanderSelectionTarget !== "secondary");
  targetSecondaryButton?.classList.toggle("is-active", appState.commanderSelectionTarget === "secondary");
  targetPrimaryButton.disabled = appState.isAnalyzing || appState.isParsing;
  targetSecondaryButton.disabled = appState.isAnalyzing || appState.isParsing;

  if (isAwaitingLegality) {
    renderLegalityIssuesList(appState.legalityReport);
  }

  if (isAwaitingConfirmation && !appState.isParsing && !appState.isAnalyzing && !isAwaitingLegality) {
    renderCommanderCandidatePreview();
  } else if (commanderCandidatePreview) {
    commanderCandidatePreview.replaceChildren();
  }
}

const exported = {
  getCommanderPreviewImageUrl,
  populateCommanderSelect,
  renderCommanderCandidatePreview,
  renderLegalityIssuesList,
  updateCommanderModalState,
};

if (typeof module !== "undefined") {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.EDHCardDomain.commanderUi = exported;
}
})();
