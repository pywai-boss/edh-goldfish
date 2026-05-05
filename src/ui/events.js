(function () {
function setupEventListeners({
  deckInputUi,
  sampleDeck,
  setDeckText,
  clearDeck,
  editDeckList,
  analyzeDeck,
  confirmCommanderAndAnalyze,
  closeCommanderConfirmation,
  editDeckFromLegalityWarning,
  editCommanderFromLegalityWarning,
  continueAnalysisAnyway,
  toggleSecondCommanderMode,
  setCommanderSelectionTarget,
  toggleDeckReviewOpen,
  toggleDeckReviewDetails,
  handleCommanderSelectChange,
  handleDeckTextInput,
}) {
  const deckText = deckInputUi.getDeckTextElement();
  const sampleButton = document.querySelector("#sample-button");
  const clearButton = document.querySelector("#clear-button");
  const clearStartOverButton = document.querySelector("#clear-start-over-button");
  const editInputButton = document.querySelector("#edit-input-button");
  const analyzeButton = document.querySelector("#analyze-button");
  const commanderConfirmAnalyzeButton = document.querySelector("#commander-confirm-analyze");
  const commanderConfirmBackButton = document.querySelector("#commander-confirm-back");
  const legalityEditDeckButton = document.querySelector("#legality-edit-deck");
  const legalityEditCommanderButton = document.querySelector("#legality-edit-commander");
  const legalityContinueButton = document.querySelector("#legality-continue-anyway");
  const toggleSecondCommanderButton = document.querySelector("#toggle-second-commander");
  const targetPrimaryButton = document.querySelector("#target-primary");
  const targetSecondaryButton = document.querySelector("#target-secondary");
  const toggleReviewButton = document.querySelector("#toggle-review-button");
  const toggleReviewDetailsButton = document.querySelector("#toggle-review-details-button");
  const commanderSelects = document.querySelectorAll(".commander-select");

  sampleButton?.addEventListener("click", () => {
    setDeckText(sampleDeck);
  });

  clearButton?.addEventListener("click", clearDeck);
  clearStartOverButton?.addEventListener("click", clearDeck);
  editInputButton?.addEventListener("click", editDeckList);
  analyzeButton?.addEventListener("click", analyzeDeck);
  commanderConfirmAnalyzeButton?.addEventListener("click", confirmCommanderAndAnalyze);
  commanderConfirmBackButton?.addEventListener("click", closeCommanderConfirmation);
  legalityEditDeckButton?.addEventListener("click", editDeckFromLegalityWarning);
  legalityEditCommanderButton?.addEventListener("click", editCommanderFromLegalityWarning);
  legalityContinueButton?.addEventListener("click", continueAnalysisAnyway);
  toggleSecondCommanderButton?.addEventListener("click", toggleSecondCommanderMode);
  targetPrimaryButton?.addEventListener("click", () => setCommanderSelectionTarget("primary"));
  targetSecondaryButton?.addEventListener("click", () => setCommanderSelectionTarget("secondary"));
  toggleReviewButton?.addEventListener("click", toggleDeckReviewOpen);
  toggleReviewDetailsButton?.addEventListener("click", toggleDeckReviewDetails);
  commanderSelects.forEach((select) => {
    select.addEventListener("change", handleCommanderSelectChange);
  });
  deckText?.addEventListener("input", handleDeckTextInput);
}

const exported = {
  setupEventListeners,
};

if (typeof module !== "undefined") {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.EDHCardDomain.events = exported;
}
})();
