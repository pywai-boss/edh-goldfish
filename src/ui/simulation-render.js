(function () {
const cardDomain =
  typeof require !== "undefined"
    ? require("../domain/cards.js")
    : window.EDHCardDomain;

const {
  MANA_COLORS,
  getRelevantColors,
} = cardDomain;

const MANA_SYMBOL_URLS = {
  W: "https://svgs.scryfall.io/card-symbols/W.svg",
  U: "https://svgs.scryfall.io/card-symbols/U.svg",
  B: "https://svgs.scryfall.io/card-symbols/B.svg",
  R: "https://svgs.scryfall.io/card-symbols/R.svg",
  G: "https://svgs.scryfall.io/card-symbols/G.svg",
  C: "https://svgs.scryfall.io/card-symbols/C.svg",
};

function percent(value, total) {
  if (!total) {
    return "0.0%";
  }
  return `${((value / total) * 100).toFixed(1)}%`;
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

function createManaIcon(color) {
  const icon = createElement("img", "mana-icon");
  icon.src = MANA_SYMBOL_URLS[color] || MANA_SYMBOL_URLS.C;
  icon.alt = color;
  icon.loading = "lazy";
  return icon;
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

function createSimulationRenderer({ summarizeDeck, getAppState }) {
  function renderDeckMetrics(parsed, result) {
    const container = document.querySelector("#deck-metrics");
    if (!container) return;
    container.replaceChildren();

    const totals = parsed?.totals || summarizeDeck([]);
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
    const appState = getAppState();
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

  return {
    createSimulationFeatures,
    renderColorCurveAnalysis,
    renderDeckMetrics,
    renderLandChart,
    renderManaStats,
    renderSampleHands,
  };
}

const exported = {
  createSimulationRenderer,
};

if (typeof module !== "undefined") {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.EDHCardDomain.simulationRender = exported;
}
})();
