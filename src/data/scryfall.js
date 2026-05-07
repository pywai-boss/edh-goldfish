(function () {
const cardDomain =
  typeof require !== "undefined"
    ? require("../domain/cards.js")
    : window.EDHCardDomain;

const { normalizeKey } = cardDomain;

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

const exported = {
  chunkArray,
  escapeScryfallExactName,
  fetchBroadOtagsByName,
  fetchScryfallCardsByName,
  getUniqueCardNames,
};

if (typeof module !== "undefined") {
  module.exports = exported;
}

if (typeof window !== "undefined") {
  window.EDHCardDomain.scryfall = exported;
}
})();
