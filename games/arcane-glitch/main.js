const app = document.querySelector("#app");
const startRunButton = document.querySelector("#start-run");
const loadGameButton = document.querySelector("#load-game");
const loadGameFileInput = document.querySelector("#load-game-file");
const testModeButton = document.querySelector("#test-mode");
const runeRain = document.querySelector("#rune-rain");
const backgroundMusic = new Audio("sound/Moonglass Relay (Menu Uplink Mix).mp3");

backgroundMusic.loop = true;
backgroundMusic.volume = 0.42;

const DEBUG_GAME = true;
const saveGameVersion = 1;
const cyclesCurrencyImage = "cycles_currency.png";
const debugEvents = [];
const metadata = window.arcaneMetadata || {};

window.arcaneDebugEvents = debugEvents;

function gameLog(eventName, details = {}) {
  if (!DEBUG_GAME) {
    return;
  }

  const event = {
    sequence: debugEvents.length + 1,
    at: new Date().toISOString(),
    event: eventName,
    details,
  };

  debugEvents.push(event);

  if (debugEvents.length > 250) {
    debugEvents.shift();
  }

  console.debug(`[ArcaneGlitch #${event.sequence}] ${eventName}`, details);
}

function gameError(eventName, details = {}) {
  const event = {
    sequence: debugEvents.length + 1,
    at: new Date().toISOString(),
    event: eventName,
    details,
  };

  debugEvents.push(event);
  console.error(`[ArcaneGlitch #${event.sequence}] ${eventName}`, details);
}

window.addEventListener("error", (event) => {
  gameError("window.error", {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error?.stack,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  gameError("window.unhandledrejection", {
    reason: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
  });
});

window.addEventListener("pagehide", (event) => {
  gameLog("pagehide", { persisted: event.persisted, eventsCaptured: debugEvents.length });
});

const runeSymbols = [
  "transparent/Mind_1.png",
  "transparent/Mind_2.png",
  "transparent/Mind_3.png",
  "transparent/Surge_1.png",
  "transparent/Surge_2.png",
  "transparent/Surge_3.png",
  "transparent/Void_1.png",
  "transparent/Void_2.png",
  "transparent/Void_3.png",
  "transparent/Life_1.png",
  "transparent/Life_2.png",
  "transparent/Life_3.png",
];

const defaultCharacterToken = "characters/encantra_character_stand.png";
const glitchSpawnToken = "pixel art/glitchspawn_1_px.png";

const enemies = metadata.glitchspawn || {
  voidRaider: {
    id: "voidRaider",
    name: "Void Raider",
    image: glitchSpawnToken,
    xpValue: 25,
    behavior: "hyperAggressive",
    stats: {
      integrity: 4,
      physicalDefense: 0,
      arcaneDefense: 0,
      power: 1,
      accuracy: 0.4,
    },
  },
  surgeCrawler: {
    id: "surgeCrawler",
    name: "Surge Crawler",
    image: glitchSpawnToken,
    xpValue: 30,
    behavior: "aggressive",
    stats: {
      integrity: 3,
      physicalDefense: 0,
      arcaneDefense: 0,
      power: 3,
      accuracy: 0.45,
    },
  },
  mindPhantom: {
    id: "mindPhantom",
    name: "Mind Phantom",
    image: glitchSpawnToken,
    xpValue: 40,
    behavior: "neutral",
    stats: {
      integrity: 5,
      physicalDefense: 0,
      arcaneDefense: 1,
      power: 1,
      accuracy: 0.4,
    },
  },
  plasmoid: {
    id: "plasmoid",
    name: "Plasmoid",
    image: "characters/glitchspawn_4.png",
    xpValue: 35,
    behavior: "stationary",
    proximityAttack: true,
    stats: {
      integrity: 4,
      physicalDefense: 0,
      arcaneDefense: 0,
      power: 2,
      accuracy: 0.78,
    },
  },
  shadowclaw: {
    id: "shadowclaw",
    name: "Shadowclaw",
    image: "characters/glitchspawn_5.png",
    xpValue: 45,
    behavior: "hyperAggressive",
    stats: {
      integrity: 5,
      physicalDefense: 3,
      arcaneDefense: 0,
      power: 2,
      accuracy: 0.5,
    },
  },
  riftGhoul: {
    id: "riftGhoul",
    name: "Rift Ghoul",
    image: "characters/Rift_Ghoul.png",
    xpValue: 65,
    behavior: "aggressive",
    fixedStats: true,
    stats: {
      integrity: 7,
      physicalDefense: 2,
      arcaneDefense: 2,
      power: 4,
      accuracy: 0.5,
      range: 2,
    },
  },
  skinEater: {
    id: "skinEater",
    name: "Skin-Eater",
    image: "characters/Skineater.png",
    xpValue: 50,
    behavior: "stationary",
    fixedStats: true,
    spawnChance: 0.1,
    spawnType: "skinSpawn",
    stats: {
      integrity: 6,
      physicalDefense: 1,
      arcaneDefense: 0,
      power: 3,
      accuracy: 0.6,
      move: 0,
    },
  },
  skinSpawn: {
    id: "skinSpawn",
    name: "Skin-Spawn",
    image: "characters/skinspawn.png",
    xpValue: 15,
    behavior: "hyperAggressive",
    fixedStats: true,
    stats: {
      integrity: 2,
      physicalDefense: 0,
      arcaneDefense: 0,
      power: 1,
      accuracy: 0.5,
      move: 2,
    },
  },
};

const startingStats = {
  cache: 4,
  exec: 1,
  integrity: 10,
  maxIntegrity: 10,
  move: 2,
};

const startingProgression = {
  level: 1,
  xp: 0,
  xpToNextLevel: 50,
  pendingRewards: 0,
};

const worldMapImage = "map/map_without_nodes.png";
const worldMapCoordinateSpace = {
  width: 650,
  height: 1220,
};

const worldZones = [
  {
    id: "cindera",
    name: "Cindera",
    element: "Surge",
    accent: "#BA7517",
    dark: "#633806",
    light: "#FAEEDA",
    nodes: [
      ["start", "The Foundry Floor", 160, 40, "start"],
      ["n1", "Smelting Pits", 90, 120, "combat"],
      ["n2", "Exhaust Vents", 230, 120, "combat"],
      ["n3", "The Furnace", 60, 210, "combat"],
      ["n4", "Market 1", 175, 200, "market"],
      ["n5", "Conveyor Fields", 275, 210, "combat"],
      ["n6", "Coal Run", 40, 295, "combat"],
      ["n7", "Slag Heap", 130, 295, "combat"],
      ["n8", "The Grinder", 215, 295, "combat"],
      ["n9", "Pressure Valve", 295, 295, "combat"],
      ["n10", "Market 2", 55, 375, "market"],
      ["n11", "Coolant Pipes", 155, 375, "combat"],
      ["n12", "Spark Yard", 240, 375, "combat"],
      ["n13", "Engine Core", 310, 375, "combat"],
      ["n14", "Meltdown Row", 90, 455, "combat"],
      ["n15", "Market 3", 185, 455, "market"],
      ["n16", "Red Line", 275, 455, "combat"],
      ["boss", "Cindera Rift", 185, 530, "boss"],
    ],
    edges: [
      ["start", "n1"],
      ["start", "n2"],
      ["n1", "n3"],
      ["n1", "n4"],
      ["n2", "n4"],
      ["n2", "n5"],
      ["n3", "n6"],
      ["n3", "n7"],
      ["n4", "n7"],
      ["n4", "n8"],
      ["n5", "n8"],
      ["n5", "n9"],
      ["n6", "n10"],
      ["n7", "n11"],
      ["n8", "n11"],
      ["n8", "n12"],
      ["n9", "n12"],
      ["n9", "n13"],
      ["n10", "n14"],
      ["n11", "n15"],
      ["n12", "n15"],
      ["n13", "n16"],
      ["n14", "boss"],
      ["n15", "boss"],
      ["n16", "boss"],
    ],
  },
  {
    id: "conclave",
    name: "The Conclave",
    element: "Mind",
    accent: "#534AB7",
    dark: "#26215C",
    light: "#EEEDFE",
    nodes: [
      ["start", "Registry Hall", 490, 34, "start"],
      ["n1", "Processing Ward", 490, 108, "combat"],
      ["n2", "The Archives", 415, 188, "combat"],
      ["n3", "Holding Block", 555, 188, "combat"],
      ["n4", "Market 1", 415, 262, "market"],
      ["n5", "Interrogation Wing", 555, 262, "combat"],
      ["n6", "Council Chambers", 435, 336, "combat"],
      ["n7", "Black Site Annex", 555, 336, "combat"],
      ["n8", "The Vault", 390, 410, "combat"],
      ["n9", "Signals Office", 490, 410, "combat"],
      ["n10", "Market 2", 580, 410, "market"],
      ["n11", "Deep Records", 425, 470, "combat"],
      ["n12", "Suppression Engine", 555, 470, "combat"],
      ["boss", "Conclave Rift", 490, 535, "boss"],
    ],
    edges: [
      ["start", "n1"],
      ["n1", "n2"],
      ["n1", "n3"],
      ["n2", "n4"],
      ["n3", "n5"],
      ["n4", "n6"],
      ["n5", "n6"],
      ["n5", "n7"],
      ["n6", "n8"],
      ["n6", "n9"],
      ["n7", "n9"],
      ["n7", "n10"],
      ["n8", "n11"],
      ["n9", "n11"],
      ["n9", "n12"],
      ["n10", "n12"],
      ["n11", "boss"],
      ["n12", "boss"],
    ],
  },
  {
    id: "parcel7",
    name: "Parcel 7",
    element: "Void",
    accent: "#5F5E5A",
    dark: "#2C2C2A",
    light: "#F1EFE8",
    nodes: [
      ["start", "Summit Gate", 160, 640, "start"],
      ["n1", "Ore Trail", 95, 720, "combat"],
      ["n2", "The Ridge", 235, 720, "combat"],
      ["n3", "Shaft One", 75, 805, "combat"],
      ["n4", "Collapsed Pass", 220, 805, "combat"],
      ["n5", "Market 1", 55, 890, "market"],
      ["n6", "The Dark Vein", 155, 878, "combat"],
      ["n7", "Sinkhole Fields", 265, 878, "combat"],
      ["n8", "Cavern Depths", 115, 960, "combat"],
      ["n9", "Forgotten Shaft", 245, 960, "combat"],
      ["n10", "Pressurized Chamber", 95, 1040, "combat"],
      ["n11", "Glitch Seam", 215, 1040, "combat"],
      ["n12", "Dead End Cache", 310, 1040, "combat"],
      ["n13", "Market 2", 160, 1115, "market"],
      ["boss", "Parcel 7 Rift", 160, 1185, "boss"],
    ],
    edges: [
      ["start", "n1"],
      ["start", "n2"],
      ["n1", "n3"],
      ["n2", "n4"],
      ["n3", "n5"],
      ["n3", "n6"],
      ["n4", "n7"],
      ["n6", "n8"],
      ["n6", "n9"],
      ["n7", "n9"],
      ["n8", "n10"],
      ["n9", "n11"],
      ["n9", "n12"],
      ["n10", "n13"],
      ["n11", "n13"],
      ["n13", "boss"],
    ],
  },
  {
    id: "sestra",
    name: "Sestra Jungle",
    element: "Life",
    accent: "#3B6D11",
    dark: "#173404",
    light: "#EAF3DE",
    nodes: [
      ["start", "Canopy Gate", 490, 640, "start"],
      ["n1", "Rootway", 395, 725, "combat"],
      ["n2", "Farm Rows", 490, 725, "combat"],
      ["n3", "Outer Shrine", 590, 725, "combat"],
      ["n4", "Undergrowth", 370, 810, "combat"],
      ["n5", "Market 1", 470, 810, "market"],
      ["n6", "Temple Steps", 580, 810, "combat"],
      ["n7", "The Bog", 345, 895, "combat"],
      ["n8", "Spore Field", 435, 895, "combat"],
      ["n9", "Seed Vault", 510, 895, "combat"],
      ["n10", "Acolyte Halls", 590, 895, "combat"],
      ["n11", "The Reliquary", 640, 895, "combat"],
      ["n12", "Market 2", 370, 975, "market"],
      ["n13", "Canopy Bridge", 455, 975, "combat"],
      ["n14", "Root Network", 535, 975, "combat"],
      ["n15", "Grand Sanctum", 610, 975, "combat"],
      ["n16", "The Overgrowth", 415, 1050, "combat"],
      ["n17", "Market 3", 500, 1050, "market"],
      ["n18", "Seed Chamber", 585, 1050, "combat"],
      ["boss", "Sestra Rift", 500, 1120, "boss"],
    ],
    edges: [
      ["start", "n1"],
      ["start", "n2"],
      ["start", "n3"],
      ["n1", "n4"],
      ["n2", "n5"],
      ["n3", "n6"],
      ["n4", "n7"],
      ["n4", "n8"],
      ["n5", "n8"],
      ["n5", "n9"],
      ["n6", "n9"],
      ["n6", "n10"],
      ["n6", "n11"],
      ["n7", "n12"],
      ["n8", "n13"],
      ["n9", "n13"],
      ["n9", "n14"],
      ["n10", "n14"],
      ["n10", "n15"],
      ["n11", "n15"],
      ["n12", "n16"],
      ["n13", "n16"],
      ["n13", "n17"],
      ["n14", "n17"],
      ["n15", "n18"],
      ["n16", "boss"],
      ["n17", "boss"],
      ["n18", "boss"],
    ],
  },
];

function getWorldNodeTier(node) {
  if (node.type === "start") {
    return 1;
  }

  if (node.type === "boss") {
    return 6;
  }

  const zoneTop = node.y < 620 ? 40 : 640;
  return Math.max(2, Math.min(5, Math.ceil((node.y - zoneTop) / 125) + 1));
}

const zoneSigilElements = {
  cindera: "surge",
  conclave: "mind",
  parcel7: "void",
  sestra: "life",
};
const sigilElementIds = ["void", "life", "surge", "mind"];
const sigilRarityLabels = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
};

function getWorldNodeSigilProfile(node) {
  const zoneElement = zoneSigilElements[node.zoneId] || "surge";
  const tier = getWorldNodeTier(node);
  const otherElements = sigilElementIds.filter((element) => element !== zoneElement);

  if (tier === 1) {
    return {
      elements: [
        { element: zoneElement, chance: 85 },
        ...otherElements.map((element) => ({ element, chance: 5 })),
      ],
      rarities: [
        { face: 1, chance: 100 },
        { face: 2, chance: 0 },
        { face: 3, chance: 0 },
      ],
    };
  }

  const routeCommonChance = node.type === "boss" ? 35 : Math.max(45, 65 - tier * 4);
  const routeUncommonChance = Math.min(30, 8 + tier * 3);
  const routeRareChance = node.type === "boss" ? 12 : Math.max(0, tier - 2) * 2;
  const primaryElementChance = node.type === "boss" ? 55 : Math.max(55, 85 - tier * 5);
  const secondaryChance = Math.floor((100 - primaryElementChance) / otherElements.length);
  const elementWeights = [{ element: zoneElement, chance: primaryElementChance }];
  let assignedChance = primaryElementChance;

  otherElements.forEach((element, index) => {
    const chance = index === otherElements.length - 1 ? 100 - assignedChance : secondaryChance;
    elementWeights.push({ element, chance });
    assignedChance += chance;
  });

  return {
    elements: elementWeights,
    rarities: [
      { face: 1, chance: Math.max(0, 100 - routeUncommonChance - routeRareChance) },
      { face: 2, chance: routeUncommonChance },
      { face: 3, chance: routeRareChance },
    ],
  };
}

function rollWeightedEntry(weights = [], fallback) {
  const totalChance = weights.reduce((total, entry) => total + Math.max(0, entry.chance || 0), 0);
  let roll = Math.random() * (totalChance || 100);

  for (const entry of weights) {
    roll -= Math.max(0, entry.chance || 0);

    if (roll <= 0) {
      return entry;
    }
  }

  return weights[weights.length - 1] || fallback;
}

function rollSigilFromProfile(sigilProfile = {}) {
  const elementEntry = rollWeightedEntry(
    sigilProfile.elements || [],
    { element: sigilElementIds[Math.floor(Math.random() * sigilElementIds.length)], chance: 100 }
  );
  const rarityEntry = rollWeightedEntry(sigilProfile.rarities || [], { face: 1, chance: 100 });

  return { element: elementEntry.element, face: rarityEntry.face || 1 };
}

function renderSigilSpawnRates(node) {
  const sigilProfile = node.sigilProfile || { elements: [], rarities: [] };

  return `
    <div class="world-sigil-rates" id="level-sigil-rates" aria-label="Sigil spawn chances">
      ${sigilProfile.elements
        .map((entry) => {
          const die = getDieById(entry.element);

          return `
            <span class="world-sigil-rate" style="--die-accent: ${die?.accent || "#f6f8ff"}">
              ${die ? `<img src="${die.files[1]}" alt="">` : ""}
              <span>${die?.name || entry.element}</span>
              <b>${entry.chance}%</b>
            </span>
          `;
        })
        .join("")}
      ${sigilProfile.rarities
        .map((entry) => `
          <span class="world-sigil-rate rarity-rate">
            <span>${sigilRarityLabels[entry.face || 1]}</span>
            <b>${entry.chance}%</b>
          </span>
        `)
        .join("")}
    </div>
  `;
}

function buildWorldLevelNodes() {
  return worldZones.flatMap((zone) => {
    const zoneNodes = zone.nodes.map(([localId, label, x, y, type]) => {
      const node = {
        id: `${zone.id}-${localId}`,
        localId,
        zoneId: zone.id,
        zoneName: zone.name,
        element: zone.element,
        label,
        x,
        y,
        type,
        accent: zone.accent,
        dark: zone.dark,
        light: zone.light,
      };

      return {
        ...node,
        tier: getWorldNodeTier(node),
        sigilProfile: getWorldNodeSigilProfile(node),
        unlocks: zone.edges.filter(([from]) => from === localId).map(([, to]) => `${zone.id}-${to}`),
      };
    });

    return zoneNodes;
  });
}

const levelNodes = buildWorldLevelNodes();
const startingUnlockedNodes = levelNodes.filter((node) => node.type === "start").map((node) => node.id);

const startingMapState = {
  selectedNode: startingUnlockedNodes[0],
  completedNodes: [],
  unlockedNodes: [...startingUnlockedNodes],
  visitedMarkets: [],
};

const programs = metadata.programs || {
  teleport: {
    id: "teleport",
    name: "BLINK",
    requirement: [{ element: "void", face: 1 }],
    summary: "Move 3 spaces in a straight line.",
    details: "Teleport exactly 3 hex spaces in a single straight-line direction.",
    cooldown: 0,
    effect: {
      type: "blinkStraight",
      distance: 3,
    },
  },
  spark: {
    id: "spark",
    name: "SPARK",
    requirement: [{ element: "surge", face: 1 }],
    summary: "Deal 2 PD 2 spaces away.",
    details: "Spend one common Surge symbol to deal 2 physical damage to an enemy exactly 2 spaces away.",
    cooldown: 1,
    effect: {
      type: "damageRange",
      amount: 2,
      damageType: "physical",
      distance: 2,
    },
  },
  rebuild: {
    id: "rebuild",
    name: "REBUILD",
    requirement: [{ element: "life", face: 1 }],
    summary: "Heal 1 Integrity.",
    details: "Spend one common Life symbol to restore 1 Integrity.",
    cooldown: 3,
    effect: {
      type: "healIntegrity",
      amount: 1,
    },
  },
  focus: {
    id: "focus",
    name: "FOCUS",
    requirement: [{ element: "mind", face: 1 }],
    summary: "Gain 1 Execution now and next turn.",
    details: "Spend one common Mind symbol to gain 1 temporary Execution for the current Sigil-Cast and 1 temporary Execution on your next turn.",
    cooldown: 1,
    effect: {
      type: "nextTurnExec",
      amount: 1,
      currentAmount: 1,
    },
  },
  entangle: {
    id: "entangle",
    name: "ENTANGLE",
    requirement: [{ element: "life", face: 2 }],
    summary: "Adjacent enemies miss next turn.",
    details: "All adjacent enemies have 0% accuracy during their next enemy turn.",
    cooldown: 1,
    effect: {
      type: "entangleAdjacent",
      duration: 1,
    },
  },
  phase: {
    id: "phase",
    name: "PHASE",
    requirement: [{ element: "mind", face: 2 }],
    summary: "Move and attack through walls.",
    details: "Move and attack through walls for the next 5 turns.",
    cooldown: 2,
    effect: {
      type: "phaseThroughWalls",
      playerTurns: 5,
    },
  },
  deathTouch: {
    id: "deathTouch",
    name: "DEATHTOUCH",
    requirement: [{ element: "void", face: 2 }],
    summary: "Teleport and destroy a lined enemy.",
    details: "Teleport onto an enemy exactly 2 spaces away in a straight line. The enemy is destroyed.",
    cooldown: 2,
    effect: {
      type: "deathTouchLine",
      distance: 2,
    },
  },
  plasma: {
    id: "plasma",
    name: "BOLT II",
    requirement: [{ element: "surge", face: 2 }],
    summary: "Deal 4 AD adjacent.",
    details: "Deal 4 Arcane Damage to an adjacent enemy.",
    cooldown: 2,
    effect: {
      type: "damageAdjacent",
      amount: 4,
      damageType: "arcane",
    },
  },
};

const artifacts = metadata.artifacts || [
  {
    id: "powerGlyph",
    name: "Power Glyph",
    type: "permanent",
    rarity: "uncommon",
    image: "artifacts/art_powerglyph.png",
    stat: "exec",
    amount: 1,
    label: "EXECUTIONS +1",
  },
  {
    id: "cacheCore",
    name: "Cache Core",
    type: "permanent",
    rarity: "uncommon",
    image: "artifacts/art_cachecore.png",
    stat: "cache",
    amount: 1,
    label: "CACHE +1",
  },
  {
    id: "integrityLattice",
    name: "Integrity Lattice",
    type: "permanent",
    rarity: "common",
    image: "artifacts/art_integritylattice.png",
    stat: "maxIntegrity",
    amount: 1,
    label: "Max Integrity +1",
  },
  {
    id: "biomechanics",
    name: "Biomechanics",
    type: "permanent",
    rarity: "rare",
    image: "artifacts/art_biomechanics.png",
    stat: "move",
    amount: 1,
    label: "Actions +1",
  },
  {
    id: "psychicResonator",
    name: "Psychic Resonator",
    type: "temporary",
    rarity: "rare",
    image: "artifacts/psychic_resonator.png",
    label: "1 Use: reveal all enemies and deal 4 Arcane Damage to one",
    uses: 1,
    effect: { type: "revealEnemiesDamage", amount: 4, damageType: "arcane" },
  },
  {
    id: "magShield",
    name: "Mag Shield",
    type: "temporary",
    rarity: "uncommon",
    image: "artifacts/mag_shield.png",
    label: "1 Use: shield all damage for 3 turns",
    uses: 1,
    effect: { type: "shieldDamage", turns: 3 },
  },
  {
    id: "skyWalkers",
    name: "Sky Walkers",
    type: "temporary",
    rarity: "common",
    image: "artifacts/Sky_Walkers.png",
    label: "1 Use: each Move action goes 1 extra space for 5 turns",
    uses: 1,
    effect: { type: "moveActionRangeBonus", amount: 1, turns: 5 },
  },
  {
    id: "arcaneKnowledge",
    name: "Arcane Knowledge",
    type: "permanent",
    rarity: "rare",
    image: "artifacts/arcane_knowledge.png",
    label: "Gain a new 8-sided blank die",
    effect: { type: "addBlankDie", sides: 8 },
  },
  {
    id: "cyclesPip",
    name: "Cycles Pip",
    type: "pip",
    rarity: "uncommon",
    label: "Crafting pip: +10 Cycles when this die side rolls",
    effect: { type: "pip", pipType: "cycles" },
  },
  {
    id: "fortunePip",
    name: "Fortune Pip",
    type: "pip",
    rarity: "uncommon",
    label: "Crafting pip: this die side is 10% more likely to roll",
    effect: { type: "pip", pipType: "fortune" },
  },
  {
    id: "arcanePip",
    name: "Arcane Pip",
    type: "pip",
    rarity: "rare",
    label: "Crafting pip: +1 Execution for this Sigil-Cast when this die side rolls",
    effect: { type: "pip", pipType: "arcane" },
  },
];

function getRandomOptions(items, count) {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

function createArtifactInstance(artifact, sigilProfile = {}) {
  if (artifact?.id === "sigilGlyph") {
    return {
      ...artifact,
      instanceId: `artifact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sigil: rollSigilFromProfile(sigilProfile),
    };
  }

  return artifact
    ? {
        ...artifact,
        instanceId: `artifact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      }
    : null;
}

function rollArtifactFromPool(artifactPool = artifacts, excludedArtifactIds = new Set()) {
  const rarityWeights = [
    { rarity: "common", chance: 58 },
    { rarity: "uncommon", chance: 32 },
    { rarity: "rare", chance: 10 },
  ];
  const rarity = rollWeightedEntry(rarityWeights, rarityWeights[0]).rarity;
  const availableArtifacts = artifactPool.filter((artifact) => !excludedArtifactIds.has(artifact.id));
  const matchingArtifacts = availableArtifacts.filter((artifact) => (artifact.rarity || "common") === rarity);
  const options = matchingArtifacts.length ? matchingArtifacts : availableArtifacts;
  const artifact = options[Math.floor(Math.random() * options.length)];

  return createArtifactInstance(artifact);
}

function rollUniqueArtifactsFromPool(count, artifactPool = artifacts) {
  const selectedArtifacts = [];
  const selectedIds = new Set();

  for (let index = 0; index < count; index += 1) {
    const artifact = rollArtifactFromPool(artifactPool, selectedIds);

    if (!artifact) {
      break;
    }

    selectedArtifacts.push(artifact);
    selectedIds.add(artifact.id);
  }

  return selectedArtifacts;
}

function rollArtifactFromRarity(rarity, artifactPool = artifacts) {
  const options = artifactPool.filter(
    (artifact) => artifact.id !== "sigilGlyph" && (artifact.rarity || "common") === rarity
  );
  const artifact = options[Math.floor(Math.random() * options.length)];

  return artifact
    ? {
        ...artifact,
        instanceId: `artifact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      }
    : null;
}

function getPipDefinition(pipType) {
  return pipDefinitions[pipType] || null;
}

function createPipInstance(pipType) {
  const pip = getPipDefinition(pipType);

  return pip
    ? {
        type: pip.id,
        instanceId: `pip-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      }
    : null;
}

// Die positions 1-3 are always common, positions 4-5 are uncommon, and position 6 is rare.
const dieFaces = [1, 1, 1, 2, 2, 3];
const customDieFaceCount = 6;
const customDieMaxFaceCount = 8;
const pipDefinitions = {
  cycles: {
    id: "cycles",
    name: "Cycles Pip",
    shortName: "Cycles",
    label: "+10 Cycles on roll",
    className: "cycles-pip",
  },
  fortune: {
    id: "fortune",
    name: "Fortune Pip",
    shortName: "Fortune",
    label: "+10% roll chance",
    className: "fortune-pip",
  },
  arcane: {
    id: "arcane",
    name: "Arcane Pip",
    shortName: "Arcane",
    label: "+1 Execution on roll",
    className: "arcane-pip",
  },
};
const levelRewardDieSideWeights = [
  { sides: 6, chance: 45 },
  { sides: 5, chance: 30 },
  { sides: 4, chance: 20 },
  { sides: 3, chance: 5 },
];
const startingCustomFaceLimit = 3;
const baseSightRange = 2;
const baseProgramIds = ["teleport", "spark", "rebuild", "focus"];
const supportedProgramEffectTypes = [
  "damageAdjacent",
  "damageLine",
  "damageRange",
  "debuffDefense",
  "damageAdjacentAll",
  "confuseEnemy",
  "resetOtherCooldowns",
  "healIntegrity",
  "blinkStraight",
  "nextTurnExec",
  "revealRiftThreads",
  "pushEnemy",
  "sightRangeBonus",
  "phaseThroughEnemies",
  "entangleAdjacent",
  "phaseThroughWalls",
  "deathTouchLine",
  "implodeVisible",
  "temporaryExecBoost",
  "invertIncomingDamage",
  "stunAllEnemies",
  "damageLineFalloff",
  "manifestDieFace",
  "blinkAnywhere",
];
const dice = [
  {
    id: "void",
    name: "Void",
    accent: "#c5b7ff",
    files: {
      1: "pixel art/void1_px_large.png",
      2: "pixel art/void2_px_large.png",
      3: "pixel art/void3_px_large.png",
    },
  },
  {
    id: "life",
    name: "Life",
    accent: "#8dffb4",
    files: {
      1: "pixel art/life1_px_large.png",
      2: "pixel art/life2_px_large.png",
      3: "pixel art/life3_px_large.png",
    },
  },
  {
    id: "surge",
    name: "Surge",
    accent: "#ff4fd8",
    files: {
      1: "pixel art/surge1_px_large.png",
      2: "pixel art/surge2_px_large.png",
      3: "pixel art/surge3_px_large.png",
    },
  },
  {
    id: "mind",
    name: "Mind",
    accent: "#b06cff",
    files: {
      1: "pixel art/mind1_px_large.png",
      2: "pixel art/mind2_px_large.png",
      3: "pixel art/mind3_px_large.png",
    },
  },
];

const characters = [
  {
    id: "arax",
    name: "Arax",
    portrait: "characters/Arax_profile_img_px.jpg",
    nameImage: "characters/arax_name.png",
    bio: "Arax is a rogue loner, vigilante, and no one knows about his real past. His realm of origin was a mining district in the mountains called Parcel 7. If you look for his home town you will not find it - it was the first realm consumed entirely by a Glitch Rift event.",
    token: "characters/arax_character.png",
    programs: ["teleport"],
    startingDie: "void",
  },
  {
    id: "dextritus",
    name: "Dextritus",
    portrait: "characters/Dextritus_profile_img_px.jpg",
    nameImage: "characters/dextritus_name.png",
    bio: "Dextritus was raised in a Seed temple - one of the religious institutions that venerates the Seed as a deity and teaches that the Seed's choices are sacred. When his Sigilant ability manifested at thirteen, the temple elders did not report him. They trained him in secret, incorporating his Sigil-casting into their existing ritual practices. He left the temple at age eighteen and joined the underground society to share his medical knowledge with others in need.",
    token: "characters/dextritus_character.png",
    programs: ["rebuild"],
    startingDie: "life",
  },
  {
    id: "encantra",
    name: "Encantra",
    portrait: "characters/encantra_profile_img_px.jpg",
    nameImage: "characters/encantra_name.png",
    bio: "Encantra grew up in the slums of Cindera - a smoke-filled industrial sector where Sigilants were registered and used for labor. She slipped her collar at fifteen, went underground, and spent the next nine years running illegal Sigil-casting circuits.",
    token: "characters/encantra_character_stand.png",
    programs: ["spark"],
    startingDie: "surge",
  },
  {
    id: "jin-ra",
    name: "Jin-Ra",
    portrait: "characters/Jin-Ra_profile_img_px.jpg",
    nameImage: "characters/jin-ra_name.png",
    bio: "Jin-Ra was identified and registered at age seven - a boy genius. Rather than collaring him, the grand-council saw him as a weapon. He spent his formative years in a facility that called itself a school and functioned as a lab. He discovered more about the simulation than any researchers before him. He was never allowed to leave unsupervised.",
    token: "characters/jinra_character.png",
    programs: ["focus"],
    startingDie: "mind",
  },
];

const roomDirections = [
  { q: 1, r: 0, exitClass: "exit-east" },
  { q: 1, r: 1, exitClass: "exit-south-east" },
  { q: 0, r: 1, exitClass: "exit-south-west" },
  { q: -1, r: 0, exitClass: "exit-west" },
  { q: -1, r: -1, exitClass: "exit-north-west" },
  { q: 0, r: -1, exitClass: "exit-north-east" },
];

const roomTileAssets = {
  basic: "hex_basic.png",
  cache: "hexes/hex_cache.png",
  haven: "hexes/haven_hex_active.png",
  havenInactive: "hexes/haven_hex_deactive.png",
  powerHub: "hexes/hex_powerhub.png",
  powerHubOff: "hexes/hex_powerhub_off.png",
  rift: "hexes/rift_hex.png",
  hidden: "hex_hidden.png",
  wallSegments: [
    "hexes/wall_segment_1.png",
    "hexes/wall_segment_2.png",
    "hexes/wall_segment_3.png",
    "hexes/wall_segment_4.png",
    "hexes/wall_segment_5.png",
    "hexes/wall_segment_6.png",
  ],
};

const wallSegmentByDirectionSide = [3, 4, 5, 6, 1, 2];

const cinderaBasicTileAssets = [
  "hexes/cindera_hex_basic1.png",
  "hexes/cindera_hex_basic2.png",
  "hexes/cindera_hex_basic3.png",
  "hexes/cindera_hex_basic4.png",
];

const jungleBasicTileAssets = [
  "hexes/jungle_hex_basic1.png",
  "hexes/jungle_hex_basic2.png",
  "hexes/jungle_hex_basic3.png",
  "hexes/jungle_hex_basic4.png",
];

const conclaveBasicTileAssets = [
  "hexes/conclave_hex_basic1.png",
  "hexes/conclave_hex_basic2.png",
  "hexes/conclave_hex_basic3.png",
  "hexes/conclave_hex_basic4.png",
];

const parcel7BasicTileAssets = [
  "hexes/parcel7_hex_basic1.png",
  "hexes/parcel7_hex_basic2.png",
  "hexes/parcel7_hex_basic3.png",
  "hexes/parcel7_hex_basic4.png",
];

let runeRainTimer;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnFallingRune() {
  if (!runeRain) {
    return;
  }

  const rune = document.createElement("img");
  const symbol = runeSymbols[Math.floor(Math.random() * runeSymbols.length)];

  rune.className = "falling-rune";
  rune.src = symbol;
  rune.alt = "";
  rune.style.setProperty("--x", `${randomBetween(-4, 100)}vw`);
  rune.style.setProperty("--size", `${randomBetween(24, 68)}px`);
  rune.style.setProperty("--duration", `${randomBetween(5.5, 12)}s`);
  rune.style.setProperty("--drift", `${randomBetween(-70, 70)}px`);
  rune.style.setProperty("--rotation", `${randomBetween(-18, 18)}deg`);
  rune.style.setProperty("--spin", `${randomBetween(-70, 70)}deg`);
  rune.style.setProperty("--alpha", randomBetween(0.2, 0.64).toFixed(2));

  rune.addEventListener("animationend", () => rune.remove());
  runeRain.appendChild(rune);
}

function startRuneRain() {
  for (let i = 0; i < 18; i += 1) {
    window.setTimeout(spawnFallingRune, i * 140);
  }

  runeRainTimer = window.setInterval(spawnFallingRune, 260);
}

function startBackgroundMusic() {
  if (!backgroundMusic.paused) {
    return;
  }

  backgroundMusic.play().catch(() => {
    gameLog("audio.autoplayBlocked");
    document.addEventListener("pointerdown", startBackgroundMusic, { once: true });
    document.addEventListener("keydown", startBackgroundMusic, { once: true });
  });
}

function tileKey(q, r) {
  return `${q},${r}`;
}

function getNeighborCoords(tile) {
  return roomDirections.map((direction) => ({
    q: tile.q + direction.q,
    r: tile.r + direction.r,
  }));
}

function getWallEdgeKeyForTiles(tileA, tileB) {
  return [tileKey(tileA.q, tileA.r), tileKey(tileB.q, tileB.r)].sort().join("|");
}

function getNeighborTileForSide(roomTiles, tile, sideIndex) {
  const direction = roomDirections[sideIndex];

  return direction
    ? roomTiles.find((candidate) => candidate.q === tile.q + direction.q && candidate.r === tile.r + direction.r)
    : null;
}

function hasWallBetweenTiles(wallEdges, tileA, tileB) {
  if (!tileA || !tileB || !wallEdges?.length) {
    return false;
  }

  const edgeKey = getWallEdgeKeyForTiles(tileA, tileB);
  return wallEdges.some((wallEdge) => wallEdge.edgeKey === edgeKey);
}

function buildEnemyRoster(count, tier = 1) {
  if (tier >= 4) {
    const weightedPool = [
      { id: "surgeCrawler", chance: 28 },
      { id: "mindPhantom", chance: 24 },
      { id: "plasmoid", chance: 18 },
      { id: "skinEater", chance: 14 },
      { id: "shadowclaw", chance: 8 },
      { id: "riftGhoul", chance: 8 },
    ];

    return Array.from({ length: count }, () => rollWeightedEntry(weightedPool, weightedPool[0]).id);
  }

  const pattern = ["voidRaider", "surgeCrawler", "mindPhantom", "surgeCrawler", "voidRaider"];

  if (tier >= 3) {
    pattern.splice(2, 0, "plasmoid", "skinEater");
  }

  return Array.from({ length: count }, (_, index) => pattern[index % pattern.length]);
}

function getRoomConfigForTier(tier) {
  const normalizedTier = Math.max(1, tier);

  if (normalizedTier === 1) {
    return { tier, tileCount: 30, threadCount: 1, sigilCount: 1, enemyTypes: ["voidRaider"] };
  }

  if (normalizedTier === 2) {
    return { tier, tileCount: 48, threadCount: 2, sigilCount: 1, enemyTypes: buildEnemyRoster(2, normalizedTier) };
  }

  if (normalizedTier === 3) {
    return { tier, tileCount: 60, threadCount: 2, sigilCount: 1, enemyTypes: buildEnemyRoster(3, normalizedTier) };
  }

  if (normalizedTier === 4) {
    return { tier, tileCount: 72, threadCount: 3, sigilCount: 1, enemyTypes: buildEnemyRoster(4, normalizedTier) };
  }

  if (normalizedTier === 5) {
    return { tier, tileCount: 84, threadCount: 4, sigilCount: 1, enemyTypes: buildEnemyRoster(5, normalizedTier) };
  }

  if (normalizedTier === 6) {
    return { tier, tileCount: 96, threadCount: 4, sigilCount: 1, enemyTypes: buildEnemyRoster(6, normalizedTier) };
  }

  return {
    tier,
    tileCount: Math.min(120, 96 + (normalizedTier - 6) * 8),
    threadCount: Math.min(6, 4 + Math.floor((normalizedTier - 5) / 2)),
    sigilCount: 1,
    enemyTypes: buildEnemyRoster(Math.min(9, normalizedTier), normalizedTier),
  };
}

function getRoomConfigForLevelNode(levelNode) {
  const roomConfig = getRoomConfigForTier(levelNode?.tier || 1);

  if (levelNode?.zoneId === "sestra") {
    if (roomConfig.tier <= 1) {
      return { ...roomConfig, tileCount: 24 };
    }

    if (roomConfig.tier === 2) {
      return { ...roomConfig, tileCount: 36, threadCount: 1 };
    }
  }

  return roomConfig;
}

function getRandomFromPool(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function createRoomTileCoords(tileCount, levelNode = null) {
  const zoneId = levelNode?.zoneId || "default";
  const tier = Math.max(1, levelNode?.tier || 1);
  let coords;

  if (tier >= 4) {
    coords = createIslandRoomCoords(tileCount, levelNode);
  } else if (zoneId === "cindera") {
    coords = createClusteredRoomCoords(tileCount);
  } else if (zoneId === "conclave") {
    coords = createOrderedRoomCoords(tileCount, levelNode);
  } else if (zoneId === "parcel7") {
    coords = createIslandRoomCoords(tileCount, levelNode);
  } else if (zoneId === "sestra") {
    coords = createMeanderingRoomCoords(tileCount);
  } else {
    coords = createDefaultRoomCoords(tileCount);
  }

  if (zoneId === "cindera" && tier >= 3) {
    return addCinderaEmptyHexes(coords, tier);
  }

  return coords;
}

function createDefaultRoomCoords(tileCount) {
  const coords = [{ q: 0, r: 0 }];
  const occupied = new Set([tileKey(0, 0)]);

  while (coords.length < tileCount) {
    const anchor = coords[Math.floor(Math.random() * coords.length)];
    const candidates = getNeighborCoords(anchor).filter((coord) => !occupied.has(tileKey(coord.q, coord.r)));

    if (!candidates.length) {
      continue;
    }

    const next = candidates[Math.floor(Math.random() * candidates.length)];
    coords.push(next);
    occupied.add(tileKey(next.q, next.r));
  }

  return coords;
}

function getRoomCoordDistance(coord) {
  return (Math.abs(coord.q) + Math.abs(coord.r) + Math.abs(coord.q - coord.r)) / 2;
}

function countOccupiedNeighborCoords(coord, occupied) {
  return getNeighborCoords(coord).filter((neighbor) => occupied.has(tileKey(neighbor.q, neighbor.r))).length;
}

function addRoomCoord(coords, occupied, coord) {
  const key = tileKey(coord.q, coord.r);

  if (occupied.has(key)) {
    return false;
  }

  coords.push({ q: coord.q, r: coord.r });
  occupied.add(key);
  return true;
}

function fillRoomCoordsFromFrontier(coords, occupied, tileCount, scoreCandidate) {
  let guard = 0;

  while (coords.length < tileCount && guard < tileCount * 80) {
    guard += 1;
    const candidateMap = new Map();

    coords.forEach((coord) => {
      getNeighborCoords(coord).forEach((neighbor) => {
        const key = tileKey(neighbor.q, neighbor.r);

        if (!occupied.has(key)) {
          candidateMap.set(key, neighbor);
        }
      });
    });

    const candidates = [...candidateMap.values()];

    if (!candidates.length) {
      break;
    }

    candidates.sort((a, b) => scoreCandidate(b, occupied) - scoreCandidate(a, occupied));
    addRoomCoord(coords, occupied, candidates[0]);
  }
}

function createClusteredRoomCoords(tileCount) {
  const coords = [{ q: 0, r: 0 }];
  const occupied = new Set([tileKey(0, 0)]);

  fillRoomCoordsFromFrontier(coords, occupied, tileCount, (candidate, currentOccupied) => {
    const screenX = candidate.q - candidate.r * 0.5;
    return countOccupiedNeighborCoords(candidate, currentOccupied) * 12 + Math.abs(screenX) * 0.35 - Math.abs(candidate.r) * 0.18 + Math.random() * 4;
  });

  return coords.length >= tileCount ? coords : createDefaultRoomCoords(tileCount);
}

function areRoomCoordsConnected(coords) {
  if (coords.length <= 1) {
    return true;
  }

  const coordKeys = new Set(coords.map((coord) => tileKey(coord.q, coord.r)));
  const visited = new Set([tileKey(coords[0].q, coords[0].r)]);
  const queue = [coords[0]];

  while (queue.length) {
    const current = queue.shift();

    getNeighborCoords(current).forEach((neighbor) => {
      const key = tileKey(neighbor.q, neighbor.r);

      if (!coordKeys.has(key) || visited.has(key)) {
        return;
      }

      visited.add(key);
      queue.push(neighbor);
    });
  }

  return visited.size === coords.length;
}

function addCinderaEmptyHexes(coords, tier) {
  if (coords.length < 18 || Math.random() > 0.82) {
    return coords;
  }

  const targetEmptyHexes = Math.max(1, Math.min(4, Math.floor(coords.length / 28) + Math.floor((tier - 3) / 3)));
  let nextCoords = [...coords];
  let occupied = new Set(nextCoords.map((coord) => tileKey(coord.q, coord.r)));
  const candidates = nextCoords
    .filter((coord) => tileKey(coord.q, coord.r) !== tileKey(0, 0))
    .filter((coord) => countOccupiedNeighborCoords(coord, occupied) >= 4)
    .sort(() => Math.random() - 0.5);
  let removedCount = 0;

  for (const candidate of candidates) {
    if (removedCount >= targetEmptyHexes) {
      break;
    }

    const candidateKey = tileKey(candidate.q, candidate.r);
    const trialCoords = nextCoords.filter((coord) => tileKey(coord.q, coord.r) !== candidateKey);

    if (!areRoomCoordsConnected(trialCoords)) {
      continue;
    }

    nextCoords = trialCoords;
    occupied = new Set(nextCoords.map((coord) => tileKey(coord.q, coord.r)));
    removedCount += 1;
  }

  return nextCoords;
}

function addOrderedRoomBlock(coords, occupied, center, width, height) {
  const qStart = center.q - Math.floor(width / 2);
  const rStart = center.r - Math.floor(height / 2);

  for (let qOffset = 0; qOffset < width; qOffset += 1) {
    for (let rOffset = 0; rOffset < height; rOffset += 1) {
      addRoomCoord(coords, occupied, { q: qStart + qOffset, r: rStart + rOffset });
    }
  }
}

function addOrderedCorridor(coords, occupied, start, axis, direction, length, width) {
  let end = { ...start };

  for (let step = 1; step <= length; step += 1) {
    const center = axis === "q"
      ? { q: start.q + direction * step, r: start.r }
      : { q: start.q, r: start.r + direction * step };

    if (axis === "q") {
      addOrderedRoomBlock(coords, occupied, center, 1, width);
    } else {
      addOrderedRoomBlock(coords, occupied, center, width, 1);
    }

    end = center;
  }

  return end;
}

function createOrderedRoomCoords(tileCount, levelNode = null) {
  const coords = [{ q: 0, r: 0 }];
  const occupied = new Set([tileKey(0, 0)]);
  const tier = Math.max(1, levelNode?.tier || Math.round(tileCount / 18));
  const moduleCount = Math.max(4, Math.min(10, Math.round(tileCount / 16) + Math.floor(tier / 2)));
  const anchors = [{ q: 0, r: 0 }];
  let current = { q: 0, r: 0 };
  let axis = Math.random() < 0.5 ? "q" : "r";

  addOrderedRoomBlock(coords, occupied, current, Math.random() < 0.55 ? 3 : 2, Math.random() < 0.55 ? 3 : 2);

  for (let moduleIndex = 0; moduleIndex < moduleCount && coords.length < tileCount; moduleIndex += 1) {
    const branchFromExisting = moduleIndex > 1 && Math.random() < Math.min(0.52, 0.22 + tier * 0.055);
    const anchor = branchFromExisting ? anchors[Math.floor(Math.random() * anchors.length)] : current;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const corridorWidth = Math.random() < Math.min(0.72, 0.38 + tier * 0.07) ? 3 : 2;
    const length = 3 + Math.floor(Math.random() * (4 + Math.min(4, tier)));
    const end = addOrderedCorridor(coords, occupied, anchor, axis, direction, length, corridorWidth);
    const roomSize = Math.random() < Math.min(0.7, 0.36 + tier * 0.06) ? 3 : 2;
    const roomWide = axis === "q" ? roomSize + Math.floor(Math.random() * 2) : roomSize;
    const roomTall = axis === "r" ? roomSize + Math.floor(Math.random() * 2) : roomSize;

    addOrderedRoomBlock(coords, occupied, end, roomWide, roomTall);
    anchors.push(end);
    current = end;

    if (Math.random() < Math.min(0.78, 0.42 + tier * 0.055)) {
      axis = axis === "q" ? "r" : "q";
    }
  }

  fillRoomCoordsFromFrontier(coords, occupied, tileCount, (candidate, currentOccupied) =>
    countOccupiedNeighborCoords(candidate, currentOccupied) * 8 - Math.max(0, 2 - countOccupiedNeighborCoords(candidate, currentOccupied)) * 10 + Math.random() * 3
  );

  return coords.slice(0, tileCount);
}

function addIslandCluster(coords, occupied, center, maxSize, blockedKeys = new Set()) {
  const cluster = [];

  if (!blockedKeys.has(tileKey(center.q, center.r)) && addRoomCoord(coords, occupied, center)) {
    cluster.push(center);
  }

  let guard = 0;
  while (cluster.length < maxSize && guard < maxSize * 24) {
    guard += 1;
    const anchor = cluster[Math.floor(Math.random() * cluster.length)] || center;
    const candidates = getNeighborCoords(anchor).filter((coord) => {
      const key = tileKey(coord.q, coord.r);
      return !occupied.has(key) && !blockedKeys.has(key);
    });

    if (!candidates.length) {
      continue;
    }

    const next = candidates[Math.floor(Math.random() * candidates.length)];
    addRoomCoord(coords, occupied, next);
    cluster.push(next);
  }
}

function getRoomCoordBufferKeys(coords) {
  return new Set(
    coords.flatMap((coord) =>
      getNeighborCoords(coord).map((neighbor) => tileKey(neighbor.q, neighbor.r))
    )
  );
}

function getParcel7ExtraIslandCount(levelNode) {
  const tier = Math.max(1, levelNode?.tier || 1);

  if (tier <= 1) {
    return 1;
  }

  if (tier === 2) {
    return 1;
  }

  return Math.min(3, 1 + Math.floor(Math.random() * Math.min(3, Math.max(1, tier - 1))));
}

function createIslandRoomCoords(tileCount, levelNode = null) {
  const extraIslandCount = getParcel7ExtraIslandCount(levelNode);
  const clusterCount = extraIslandCount + 1;

  if (extraIslandCount <= 0) {
    return createDefaultRoomCoords(tileCount);
  }

  const coords = [];
  const occupied = new Set();
  let currentCenter = { q: 0, r: 0 };
  let islandsPlaced = 0;
  let islandSize = Math.min(tileCount, Math.max(6, Math.ceil(tileCount / clusterCount)));

  addIslandCluster(coords, occupied, currentCenter, islandSize);
  islandsPlaced += 1;

  let guard = 0;

  while (coords.length < tileCount && coords.length && guard < tileCount * 20 && islandsPlaced < clusterCount) {
    guard += 1;
    const direction = roomDirections[Math.floor(Math.random() * roomDirections.length)];
    const edge = [...coords]
      .sort((a, b) => (b.q * direction.q + b.r * direction.r) - (a.q * direction.q + a.r * direction.r))[0] || currentCenter;
    const gapOne = { q: edge.q + direction.q, r: edge.r + direction.r };
    const center = { q: edge.q + direction.q * 2, r: edge.r + direction.r * 2 };
    const remaining = tileCount - coords.length;
    const blockedKeys = new Set([tileKey(gapOne.q, gapOne.r), ...getRoomCoordBufferKeys(coords)]);
    const remainingClusters = Math.max(1, clusterCount - islandsPlaced);
    const coordsBeforeIsland = coords.length;

    islandSize = Math.min(remaining, Math.max(5, Math.ceil(remaining / remainingClusters) + Math.floor(Math.random() * 3) - 1));
    addIslandCluster(coords, occupied, center, islandSize, blockedKeys);

    if (coords.length === coordsBeforeIsland) {
      continue;
    }

    currentCenter = center;
    islandsPlaced += 1;

    if (islandSize <= 0) {
      break;
    }
  }

  return coords.length >= tileCount ? coords.slice(0, tileCount) : createDefaultRoomCoords(tileCount);
}

function getConnectedTileGroups(tiles) {
  const unvisited = new Set(tiles.map((tile) => tile.id));
  const tileByCoord = new Map(tiles.map((tile) => [tileKey(tile.q, tile.r), tile]));
  const groups = [];

  while (unvisited.size) {
    const startId = unvisited.values().next().value;
    const startTile = tiles.find((tile) => tile.id === startId);
    const group = [];
    const queue = [startTile];

    unvisited.delete(startId);

    while (queue.length) {
      const current = queue.shift();
      group.push(current);

      getNeighborCoords(current).forEach((neighborCoord) => {
        const neighbor = tileByCoord.get(tileKey(neighborCoord.q, neighborCoord.r));

        if (!neighbor || !unvisited.has(neighbor.id)) {
          return;
        }

        unvisited.delete(neighbor.id);
        queue.push(neighbor);
      });
    }

    groups.push(group);
  }

  return groups;
}

function createMeanderingRoomCoords(tileCount) {
  const coords = [{ q: 0, r: 0 }];
  const occupied = new Set([tileKey(0, 0)]);
  let current = coords[0];
  let directionIndex = Math.floor(Math.random() * roomDirections.length);
  let guard = 0;
  const maxScreenWidth = Math.max(5.5, Math.min(9, Math.ceil(tileCount / 7)));
  const maxVerticalSpan = Math.max(5, Math.min(10, Math.ceil(tileCount / 6)));

  function isWithinMeanderBounds(coord) {
    const screenXs = coords.map((item) => item.q - item.r * 0.5);
    const candidateScreenX = coord.q - coord.r * 0.5;
    const minScreenX = Math.min(candidateScreenX, ...screenXs);
    const maxScreenX = Math.max(candidateScreenX, ...screenXs);
    const minR = Math.min(coord.r, ...coords.map((item) => item.r));
    const maxR = Math.max(coord.r, ...coords.map((item) => item.r));

    return maxScreenX - minScreenX <= maxScreenWidth && maxR - minR <= maxVerticalSpan;
  }

  while (coords.length < tileCount && guard < tileCount * 120) {
    guard += 1;

    if (Math.random() < 0.38) {
      directionIndex = (directionIndex + (Math.random() < 0.5 ? 1 : -1) + roomDirections.length) % roomDirections.length;
    }

    const preferredDirections = [
      roomDirections[directionIndex],
      roomDirections[(directionIndex + 1) % roomDirections.length],
      roomDirections[(directionIndex + roomDirections.length - 1) % roomDirections.length],
      ...[...roomDirections].sort(() => Math.random() - 0.5),
    ];
    const nextDirection = preferredDirections.find((direction) => {
      const candidate = { q: current.q + direction.q, r: current.r + direction.r };
      return !occupied.has(tileKey(candidate.q, candidate.r)) &&
        countOccupiedNeighborCoords(candidate, occupied) <= 2 &&
        isWithinMeanderBounds(candidate);
    });

    if (!nextDirection) {
      current = coords[Math.floor(Math.random() * coords.length)];
      continue;
    }

    const next = { q: current.q + nextDirection.q, r: current.r + nextDirection.r };
    addRoomCoord(coords, occupied, next);
    current = next;

    if (coords.length < tileCount && Math.random() < 0.3) {
      const branchCandidates = getNeighborCoords(current).filter((coord) =>
        !occupied.has(tileKey(coord.q, coord.r)) &&
        countOccupiedNeighborCoords(coord, occupied) <= 2 &&
        isWithinMeanderBounds(coord)
      );
      const branch = branchCandidates[Math.floor(Math.random() * branchCandidates.length)];

      if (branch) {
        addRoomCoord(coords, occupied, branch);
      }
    }
  }

  fillRoomCoordsFromFrontier(coords, occupied, tileCount, (candidate, currentOccupied) =>
    (isWithinMeanderBounds(candidate) ? 10 : -200) +
      (countOccupiedNeighborCoords(candidate, currentOccupied) <= 2 ? 8 : -8) -
      getRoomCoordDistance(candidate) * 0.05 +
      Math.random() * 3
  );

  return coords;
}

function applyRoomTileTheme(roomTiles, levelNode) {
  const zoneBasicTileAssets = {
    cindera: cinderaBasicTileAssets,
    conclave: conclaveBasicTileAssets,
    parcel7: parcel7BasicTileAssets,
    sestra: jungleBasicTileAssets,
  };
  const basicTileAssetPool = zoneBasicTileAssets[levelNode.zoneId] || null;

  if (!basicTileAssetPool) {
    return;
  }

  roomTiles.forEach((tile) => {
    if (tile.type === "basic") {
      tile.asset = getRandomFromPool(basicTileAssetPool);
    }
  });
}

function getRoomTileImage(tile, isRevealed) {
  if (!isRevealed) {
    return roomTileAssets.hidden;
  }

  return tile.asset || roomTileAssets[tile.type] || roomTileAssets.basic;
}

function getWallGenerationProfile(levelNode) {
  if (levelNode?.zoneId === "conclave") {
    return { divisor: 12, maxGroups: 10, groupOdds: { five: 0.22, four: 0.48, three: 0.78 } };
  }

  if (levelNode?.zoneId === "cindera") {
    return { divisor: 15, maxGroups: 8, groupOdds: { five: 0.12, four: 0.34, three: 0.68 } };
  }

  return { divisor: 24, maxGroups: 5, groupOdds: { five: 0.04, four: 0.16, three: 0.42 } };
}

function getWallGroupSize(groupOdds) {
  const roll = Math.random();

  if (roll < groupOdds.five) {
    return 5;
  }

  if (roll < groupOdds.four) {
    return 4;
  }

  if (roll < groupOdds.three) {
    return 3;
  }

  return 2;
}

function doWallEdgesPreserveConnectivity(tiles, blockedEdgeKeys) {
  const startTile = tiles[0];

  if (!startTile) {
    return true;
  }

  const visited = new Set([startTile.id]);
  const queue = [startTile];

  while (queue.length) {
    const currentTile = queue.shift();

    roomDirections.forEach((_, sideIndex) => {
      const neighbor = getNeighborTileForSide(tiles, currentTile, sideIndex);

      if (!neighbor || visited.has(neighbor.id) || blockedEdgeKeys.has(getWallEdgeKeyForTiles(currentTile, neighbor))) {
        return;
      }

      visited.add(neighbor.id);
      queue.push(neighbor);
    });
  }

  return tiles.every((tile) => visited.has(tile.id));
}

function generateWallEdges(tiles, reservedTileIds, roomConfig, levelNode = null) {
  const wallProfile = getWallGenerationProfile(levelNode);
  const wallGroupCount = Math.max(1, Math.min(wallProfile.maxGroups, Math.floor(roomConfig.tileCount / wallProfile.divisor)));
  const wallEdges = [];
  const usedEdgeKeys = new Set();
  let placedGroups = 0;
  const wallCandidates = tiles
    .filter((tile) => tile.type === "basic" && !reservedTileIds.has(tile.id))
    .sort(() => Math.random() - 0.5);

  for (const tile of wallCandidates) {
    if (placedGroups >= wallGroupCount) {
      break;
    }

    const preferredGroupSize = getWallGroupSize(wallProfile.groupOdds);
    const groupSizesToTry = Array.from({ length: preferredGroupSize - 1 }, (_, index) => preferredGroupSize - index);
    const group = groupSizesToTry
      .flatMap((groupSize) =>
        roomDirections
          .map((_, sideIndex) =>
            Array.from({ length: groupSize }, (__, offset) => (sideIndex + offset) % roomDirections.length)
          )
          .sort(() => Math.random() - 0.5)
      )
      .find((candidateGroup) => {
        const candidateEdgeKeys = candidateGroup.map((sideIndex) => {
          const neighbor = getNeighborTileForSide(tiles, tile, sideIndex);
          return neighbor ? getWallEdgeKeyForTiles(tile, neighbor) : null;
        });

        return candidateGroup.every((sideIndex, index) => {
          const neighbor = getNeighborTileForSide(tiles, tile, sideIndex);

          if (!neighbor || reservedTileIds.has(neighbor.id) || neighbor.type !== "basic") {
            return false;
          }

          return candidateEdgeKeys[index] && !usedEdgeKeys.has(candidateEdgeKeys[index]);
        }) && doWallEdgesPreserveConnectivity(tiles, new Set([...usedEdgeKeys, ...candidateEdgeKeys]));
      });

    if (!group) {
      continue;
    }

    group.forEach((sideIndex) => {
      const neighbor = getNeighborTileForSide(tiles, tile, sideIndex);
      const edgeKey = getWallEdgeKeyForTiles(tile, neighbor);

      usedEdgeKeys.add(edgeKey);
      wallEdges.push({
        tileId: tile.id,
        neighborTileId: neighbor.id,
        sideIndex,
        edgeKey,
      });
    });
    placedGroups += 1;
  }

  return wallEdges;
}

function generateRoomTiles(roomConfig = getRoomConfigForTier(1), levelNode = null) {
  const tileCount = roomConfig.tileCount;
  const roomCoords = createRoomTileCoords(tileCount, levelNode);
  const tiles = roomCoords.map((coord, index) => ({
    id: `tile-${index}`,
    q: coord.q,
    r: coord.r,
    type: "basic",
  }));
  const occupied = new Set(tiles.map((tile) => tileKey(tile.q, tile.r)));
  const connectedTileGroups = getConnectedTileGroups(tiles);
  const startIslandTileIds = new Set((connectedTileGroups.find((group) => group.some((tile) => tile.id === "tile-0")) || []).map((tile) => tile.id));
  const parcel7TierTwoRiftIsland = levelNode?.zoneId === "parcel7" && roomConfig.tier === 2
    ? connectedTileGroups.find((group) => group.every((tile) => !startIslandTileIds.has(tile.id)))
    : null;

  const riftCandidates = tiles
    .filter((tile) => tile.id !== "tile-0")
    .filter((tile) => !parcel7TierTwoRiftIsland || parcel7TierTwoRiftIsland.some((islandTile) => islandTile.id === tile.id))
    .filter((tile) =>
      getNeighborCoords(tile).some((coord) => !occupied.has(tileKey(coord.q, coord.r)))
    )
    .sort((a, b) => getHexDistance(b, tiles[0]) - getHexDistance(a, tiles[0]));
  const fallbackRiftCandidates = tiles
    .filter((tile) => tile.id !== "tile-0")
    .filter((tile) =>
      getNeighborCoords(tile).some((coord) => !occupied.has(tileKey(coord.q, coord.r)))
    )
    .sort((a, b) => getHexDistance(b, tiles[0]) - getHexDistance(a, tiles[0]));
  const riftCandidatePool = riftCandidates.length ? riftCandidates : fallbackRiftCandidates;
  const riftPool = riftCandidatePool.slice(0, Math.max(1, Math.ceil(riftCandidatePool.length / 2)));
  const riftTile = riftPool[Math.floor(Math.random() * riftPool.length)];

  riftTile.type = "rift";

  const threadCandidates = tiles
    .filter((tile) => tile.id !== "tile-0" && tile.id !== riftTile.id)
    .filter((tile) =>
      getNeighborCoords(tile).some((coord) => !occupied.has(tileKey(coord.q, coord.r)))
    )
    .sort((a, b) => getHexDistance(b, tiles[0]) - getHexDistance(a, tiles[0]));
  const threadPool = threadCandidates.length ? threadCandidates : tiles.filter((tile) => tile.id !== "tile-0" && tile.id !== riftTile.id);
  const threadTileIds = [];
  const shuffledThreadPool = [...threadPool].sort(() => Math.random() - 0.5);

  shuffledThreadPool.some((tile) => {
    if (threadTileIds.length >= roomConfig.threadCount) {
      return true;
    }

    threadTileIds.push(tile.id);
    return false;
  });
  const shouldSpawnCache = roomConfig.tier > 1;
  const cacheCandidates = shouldSpawnCache
    ? tiles.filter((tile) => tile.id !== "tile-0" && tile.id !== riftTile.id && !threadTileIds.includes(tile.id))
    : [];
  const cacheTile = cacheCandidates[Math.floor(Math.random() * cacheCandidates.length)];
  const cacheBecomesPipArtifact = Boolean(cacheTile) && Math.random() < 0.3;
  const actualCacheTile = cacheBecomesPipArtifact ? null : cacheTile;
  const pipArtifactTile = cacheBecomesPipArtifact ? cacheTile : null;
  const artifactCandidates = shouldSpawnCache
    ? tiles.filter(
        (tile) =>
          tile.id !== "tile-0" &&
          tile.id !== riftTile.id &&
          tile.id !== actualCacheTile?.id &&
          tile.id !== pipArtifactTile?.id &&
          !threadTileIds.includes(tile.id)
      )
    : [];
  const artifactTile = artifactCandidates[Math.floor(Math.random() * artifactCandidates.length)];

  if (actualCacheTile) {
    actualCacheTile.type = "cache";
  }

  const sigilCandidates = tiles.filter(
    (tile) =>
      tile.id !== "tile-0" &&
      tile.id !== riftTile.id &&
      tile.id !== actualCacheTile?.id &&
      tile.id !== artifactTile?.id &&
      tile.id !== pipArtifactTile?.id &&
      !threadTileIds.includes(tile.id)
  );
  const distantSigilCandidates = sigilCandidates.filter((tile) => getHexDistance(tile, tiles[0]) >= 3);
  const sigilPickups = getRandomOptions(distantSigilCandidates.length ? distantSigilCandidates : sigilCandidates, roomConfig.sigilCount || 0).map((tile) => ({
    tileId: tile.id,
    sigil: rollSigilFromProfile(levelNode?.sigilProfile || {}),
  }));

  const reservedTileIds = new Set([
    "tile-0",
    riftTile.id,
    ...threadTileIds,
    ...(actualCacheTile ? [actualCacheTile.id] : []),
    ...(artifactTile ? [artifactTile.id] : []),
    ...(pipArtifactTile ? [pipArtifactTile.id] : []),
    ...sigilPickups.map((pickup) => pickup.tileId),
  ]);
  const extraTileCandidates = tiles.filter((tile) => !reservedTileIds.has(tile.id));

  if (roomConfig.tier > 1) {
    const havenChecks = Math.max(1, Math.round(tileCount / 15));

    for (let index = 0; index < havenChecks; index += 1) {
      if (Math.random() >= 0.5) {
        continue;
      }

      const candidates = extraTileCandidates.filter((tile) => tile.type === "basic");
      const havenTile = candidates[Math.floor(Math.random() * candidates.length)];

      if (havenTile) {
        havenTile.type = "haven";
      }
    }

    const powerHubCandidates = extraTileCandidates.filter((tile) => tile.type === "basic");
    const powerHubTile = Math.random() < 0.5
      ? powerHubCandidates[Math.floor(Math.random() * powerHubCandidates.length)]
      : null;

    if (powerHubTile) {
      powerHubTile.type = "powerHub";
    }
  }

  const wallEdges = generateWallEdges(tiles, reservedTileIds, roomConfig, levelNode);

  return {
    tiles,
    riftTileId: riftTile.id,
    threadTileIds,
    cacheTileIds: actualCacheTile ? [actualCacheTile.id] : [],
    artifactTileIds: artifactTile ? [artifactTile.id] : [],
    pipArtifactTileIds: pipArtifactTile ? [pipArtifactTile.id] : [],
    sigilPickups,
    wallEdges,
  };
}

function getDieById(dieId) {
  return dice.find((item) => item.id === dieId);
}

function getSigilDefinition(element, face = 1) {
  const die = getDieById(element);

  return die
    ? {
        element: die.id,
        face,
        name: die.name,
        accent: die.accent,
        image: die.files[face],
      }
    : null;
}

function getLoadoutDieFaces(loadoutDie) {
  if (typeof loadoutDie === "string") {
    return dieFaces.map((face) => getSigilDefinition(loadoutDie, face));
  }

  return Array.from({ length: getCustomDieSideCount(loadoutDie) }, (_, index) => {
    const sigil = loadoutDie?.faces?.[index];
    const definition = sigil?.element ? getSigilDefinition(sigil.element, sigil.face || 1) : null;
    return definition ? { ...definition, pips: [...(sigil.pips || [])] } : null;
  });
}

function getCustomDieSideCount(loadoutDie) {
  if (Number.isFinite(loadoutDie?.sides)) {
    return Math.max(3, Math.min(customDieMaxFaceCount, loadoutDie.sides));
  }

  return Math.max(3, Math.min(customDieMaxFaceCount, loadoutDie?.faces?.length || customDieFaceCount));
}

function getLoadoutDieLabel(loadoutDie, index = 0) {
  if (typeof loadoutDie === "string") {
    return getDieById(loadoutDie)?.name || `Die ${index + 1}`;
  }

  return loadoutDie?.name || `Custom Die ${index + 1}`;
}

function getLoadoutDieAccent(loadoutDie) {
  if (typeof loadoutDie === "string") {
    return getDieById(loadoutDie)?.accent || "#f6f8ff";
  }

  const firstSigil = getLoadoutDieFaces(loadoutDie).find(Boolean);
  return firstSigil?.accent || "#f6f8ff";
}

function getLoadoutDiePreviewSigil(loadoutDie) {
  return getLoadoutDieFaces(loadoutDie).find(Boolean);
}

function getCharacterLoadoutElements(character) {
  return new Set(
    (character.loadout || [])
      .flatMap((loadoutDie) => getLoadoutDieFaces(loadoutDie))
      .filter(Boolean)
      .map((sigil) => sigil.element)
  );
}

function createCustomDie(faces = [], sideCount = customDieFaceCount) {
  const sides = Math.max(3, Math.min(customDieMaxFaceCount, sideCount));

  return {
    id: `crafted-${Date.now()}`,
    type: "custom",
    name: sides === customDieFaceCount ? "Crafted Die" : `${sides}-Sided Die`,
    sides,
    faces: Array.from({ length: sides }, (_, index) => {
      const sigil = faces[index];
      return sigil
        ? {
            ...(sigil.element ? { element: sigil.element, face: sigil.face || 1 } : {}),
            ...(Array.isArray(sigil.pips) && sigil.pips.length ? { pips: [...sigil.pips] } : {}),
          }
        : null;
    }),
  };
}

function createCommonTestDie(index = 0) {
  const commonFaces = ["void", "life", "surge", "mind", "surge", "mind"];
  const rotatedFaces = commonFaces.map((_, faceIndex) => commonFaces[(faceIndex + index * 2) % commonFaces.length]);

  return {
    ...createCustomDie(rotatedFaces.map((element) => ({ element, face: 1 }))),
    id: `test-die-${index + 1}`,
    name: `Test Die ${index + 1}`,
  };
}

function createTestModeCharacter() {
  const character = characters.find((item) => item.id === "encantra") || characters[0];
  const testNodeId = "cindera-n1";

  return {
    ...character,
    programs: [...baseProgramIds],
    loadout: [createCommonTestDie(0), createCommonTestDie(1)],
    programLibrary: [...baseProgramIds],
    stats: { ...startingStats },
    progression: { ...startingProgression },
    artifacts: [],
    cycles: 0,
    sigilInventory: sigilElementIds.map((element) => ({ element, face: 1 })),
    pipInventory: [createPipInstance("cycles"), createPipInstance("fortune")].filter(Boolean),
    mapState: {
      selectedNode: testNodeId,
      completedNodes: [],
      unlockedNodes: [...new Set([...startingUnlockedNodes, testNodeId])],
      visitedMarkets: [],
    },
  };
}

function rollLevelRewardDieSideCount() {
  return rollWeightedEntry(levelRewardDieSideWeights, levelRewardDieSideWeights[0]).sides;
}

function rollCycleDropAmount() {
  return 5 + Math.floor(Math.random() * 10) * 5;
}

function getArtifactCycleCost(artifact) {
  const costs = {
    common: 600,
    uncommon: 1100,
    rare: 1800,
  };

  return costs[artifact?.rarity || "common"] || costs.common;
}

function getSigilGlyphCycleCost(artifact) {
  const costs = {
    1: 600,
    2: 1000,
    3: 1500,
  };

  return costs[artifact?.sigil?.face || 1] || costs[1];
}

function applyArtifactToCharacter(character, artifact, sigilProfile = {}) {
  character.artifacts = character.artifacts || [];
  character.pipInventory = character.pipInventory || [];
  const artifactInstance = {
    ...artifact,
    instanceId: artifact.instanceId || `artifact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
  const amount = Number.isFinite(artifact.amount) ? artifact.amount : 1;

  if (artifact.type === "pip" || artifact.effect?.type === "pip") {
    const pip = createPipInstance(artifact.effect?.pipType || artifact.pipType || artifact.id?.replace(/Pip$/, ""));
    if (pip) {
      character.pipInventory.push(pip);
    }
    return artifactInstance;
  }

  if (artifact.effect?.type === "sigilGlyph" && !artifactInstance.sigil) {
    artifactInstance.sigil = rollSigilFromProfile(sigilProfile);
  }

  if (artifact.type !== "temporary" || artifact.uses > 0 || artifact.effect?.type === "sigilGlyph") {
    character.artifacts.push(artifactInstance);
  }

  if (artifact.effect?.type === "temporaryActions" && !(artifactInstance.uses > 0)) {
    character.temporaryActionBoostAmount = Math.max(character.temporaryActionBoostAmount || 0, artifact.effect.amount || 1);
    character.temporaryActionBoostTurns = Math.max(character.temporaryActionBoostTurns || 0, artifact.effect.turns || 3);
    return artifactInstance;
  }

  if (artifact.effect?.type === "healIntegrity") {
    const healAmount = Number.isFinite(artifact.effect.amount) ? artifact.effect.amount : 1;
    character.stats.integrity = Math.min(character.stats.maxIntegrity, character.stats.integrity + healAmount);
    return artifactInstance;
  }

  if (artifact.effect?.type === "addBlankDie") {
    character.loadout = character.loadout || [];
    character.loadout.push(createBlankDie(artifact.effect.sides || customDieFaceCount));
    return artifactInstance;
  }

  if (artifact.stat === "maxIntegrity") {
    character.stats.maxIntegrity += amount;
    character.stats.integrity = Math.min(character.stats.maxIntegrity, character.stats.integrity + amount);
    return artifactInstance;
  }

  if (Number.isFinite(character.stats[artifact.stat])) {
    character.stats[artifact.stat] += amount;
  }

  return artifactInstance;
}

function createBlankDie(sideCount = customDieFaceCount) {
  return {
    ...createCustomDie([], sideCount),
    name: `${sideCount}-Sided Blank Die`,
  };
}

function getBlankDieFaceSlots(character) {
  return (character.loadout || []).flatMap((loadoutDie, dieIndex) => {
    if (typeof loadoutDie === "string" || loadoutDie?.type !== "custom") {
      return [];
    }

    return Array.from({ length: getCustomDieSideCount(loadoutDie) }, (_, faceIndex) =>
      loadoutDie.faces?.[faceIndex] ? null : { dieIndex, faceIndex }
    ).filter(Boolean);
  });
}

function addSigilToDieFace(character, sigil, dieIndex, faceIndex) {
  const loadoutDie = character.loadout?.[dieIndex];

  if (!loadoutDie || typeof loadoutDie === "string" || loadoutDie.type !== "custom") {
    return false;
  }

  loadoutDie.faces = Array.from({ length: getCustomDieSideCount(loadoutDie) }, (_, index) => loadoutDie.faces?.[index] || null);

  if (faceIndex < 0 || faceIndex >= loadoutDie.faces.length || loadoutDie.faces[faceIndex]) {
    return false;
  }

  loadoutDie.faces[faceIndex] = { element: sigil.element, face: sigil.face || 1 };
  return true;
}

function getProgramById(programId) {
  return programs[programId];
}

function ensureProgramLibrary(character) {
  character.programLibrary = [...new Set([...(character.programLibrary || []), ...(character.programs || [])])];
  character.programs = (character.programs || []).filter((programId) => character.programLibrary.includes(programId));
  return character.programLibrary;
}

function getLoadoutDieRawFaces(loadoutDie) {
  if (typeof loadoutDie === "string") {
    return dieFaces.map((face) => ({ element: loadoutDie, face, pips: [] }));
  }

  return Array.from({ length: getCustomDieSideCount(loadoutDie) }, (_, index) => {
    const face = loadoutDie?.faces?.[index] || null;

    return face
      ? {
          element: face.element || null,
          face: face.face || 1,
          pips: Array.isArray(face.pips) ? [...face.pips] : [],
        }
      : { element: null, face: 1, pips: [] };
  });
}

function getDieFaceRollIndex(rawFaces) {
  const sideCount = rawFaces.length;
  const fortuneFaceIndices = rawFaces
    .map((face, index) => (face.pips || []).some((pip) => pip.type === "fortune") ? index : null)
    .filter((index) => index !== null);

  if (!fortuneFaceIndices.length || fortuneFaceIndices.length >= sideCount) {
    return Math.floor(Math.random() * sideCount);
  }

  const baseChance = 1 / sideCount;
  const boostedChance = baseChance + 0.1;
  const boostedTotal = boostedChance * fortuneFaceIndices.length;
  const otherChance = boostedTotal >= 1 ? 0 : (1 - boostedTotal) / (sideCount - fortuneFaceIndices.length);
  const weights = rawFaces.map((_, index) => fortuneFaceIndices.includes(index) ? boostedChance : otherChance);
  const roll = Math.random() * weights.reduce((total, weight) => total + weight, 0);
  let cursor = 0;

  for (let index = 0; index < weights.length; index += 1) {
    cursor += weights[index];
    if (roll <= cursor) {
      return index;
    }
  }

  return sideCount - 1;
}

function rollDie(loadoutDie) {
  const rawFaces = getLoadoutDieRawFaces(loadoutDie);
  const faceIndex = getDieFaceRollIndex(rawFaces);
  const rawFace = rawFaces[faceIndex];
  const sigil = rawFace?.element ? getSigilDefinition(rawFace.element, rawFace.face || 1) : null;

  return {
    faceIndex,
    sigil: sigil ? { element: sigil.element, face: sigil.face } : null,
    pips: rawFace?.pips || [],
  };
}

function renderProgramRequirement(program) {
  return program.requirement
    .map((requirement, index) => {
      const die = getDieById(requirement.element);

      return `
        <span class="program-symbol" style="--die-accent: ${die.accent}">
          <img src="${die.files[requirement.face]}" alt="${die.name} symbol ${requirement.face}">
          <span>${index + 1}</span>
        </span>
      `;
    })
    .join("");
}

function getProgramRequirementSymbols(program) {
  return Array.isArray(program?.requirement) ? program.requirement : [];
}

function getProgramRequiredElements(program) {
  return [...new Set(getProgramRequirementSymbols(program).map((requirement) => requirement.element).filter(Boolean))];
}

function getProgramAccent(program) {
  const firstRequirement = getProgramRequirementSymbols(program)[0];
  return getDieById(firstRequirement?.element)?.accent || "#f6f8ff";
}

function getProgramCooldownLabel(program) {
  return program?.oncePerLevel || program?.cooldown === null || program?.cooldown === "-"
    ? "-"
    : Number.isFinite(program?.cooldown)
      ? program.cooldown
      : 0;
}

function renderProgramRewardChoice(program, attributes = "", className = "") {
  const accent = getProgramAccent(program);

  return `
    <button class="secondary-action reward-choice program-reward-choice ${className}" type="button" ${attributes} style="--die-accent: ${accent}">
      <span class="program-reward-heading">
        <span class="program-reward-symbols" aria-hidden="true">
          ${renderProgramRequirement(program)}
        </span>
        <strong>${program.name}</strong>
      </span>
      <small>${program.summary}</small>
      <em>${program.details}</em>
    </button>
  `;
}

function canCastProgram(program, castSymbols, cooldownLockedProgramIds = new Set()) {
  if (cooldownLockedProgramIds.has(program.id)) {
    return false;
  }

  if (castSymbols === null) {
    return true;
  }

      const availableSymbols = castSymbols.filter((symbol) => isUsableSigilSymbol(symbol) && !symbol.spent).map((symbol) => ({ ...symbol }));

  return program.requirement.every((requirement) => {
    const symbolIndex = availableSymbols.findIndex(
      (symbol) => symbol.element === requirement.element && symbol.face === requirement.face
    );

    if (symbolIndex < 0) {
      return false;
    }

    availableSymbols.splice(symbolIndex, 1);
    return true;
  });
}

function getPhysicalDamage(castSymbols) {
  const availableSymbols = Array.isArray(castSymbols)
    ? castSymbols.filter((symbol) => isUsableSigilSymbol(symbol) && !symbol.spent && !symbol.artifactInstanceId)
    : [];

  if (!availableSymbols.length) {
    return 1;
  }

  const symbolCounts = availableSymbols.reduce((counts, symbol) => {
    const key = `${symbol.element}:${symbol.face}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
  const highestMatch = Math.max(...symbolCounts.values());

  return highestMatch >= 3 ? 5 : highestMatch === 2 ? 3 : 1;
}

function isUsableSigilSymbol(symbol) {
  return Boolean(symbol && !symbol.blank && symbol.element && Number.isFinite(symbol.face));
}

function renderAllocatedSymbols(symbols) {
  if (!symbols?.length) {
    return "";
  }

  return `
    <div class="program-allocation" aria-label="Allocated symbols">
      ${symbols
        .map((symbol) => {
          const die = getDieById(symbol.element);

          return `
            <span class="allocated-die" style="--die-accent: ${die.accent}">
              <img src="${die.files[symbol.face]}" alt="${die.name} allocated symbol">
              <span>${symbol.slotIndex + 1}</span>
            </span>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSigilDieImage(symbol, label = "") {
  if (!symbol || symbol.blank) {
    return `
      <span class="blank-roll-face" aria-label="Blank face">
        <i></i>
      </span>
    `;
  }

  const die = getDieById(symbol.element);

  return `<img src="${die.files[symbol.face]}" alt="${die.name}${label ? ` ${label}` : ""}">`;
}

function renderPhysicalDamageProgram(castSymbols, allocatedSymbols = []) {
  const isAvailable = Array.isArray(castSymbols) && castSymbols.some((symbol) => isUsableSigilSymbol(symbol) && !symbol.spent && !symbol.artifactInstanceId);
  const damage = getPhysicalDamage(castSymbols);

  return `
    <article class="program-card physical-damage ${isAvailable ? "" : "unavailable"}" data-program-id="physical-damage" style="--program-accent: #f6f8ff" tabindex="${isAvailable ? "0" : "-1"}" aria-disabled="${!isAvailable}">
      <div class="program-row">
        <strong>Physical Damage</strong>
        <div class="program-requirement">
          <span class="program-damage-value">
            ${damage}
          </span>
        </div>
      </div>
      ${renderAllocatedSymbols(allocatedSymbols)}
      <div class="program-tooltip">
        <strong>Physical Damage</strong>
        <span>Fallback Attack</span>
        <p>Spend any one rolled symbol to deal ${damage} physical damage to an adjacent enemy. Matching rolled symbols increase the damage.</p>
      </div>
    </article>
  `;
}

function renderPrograms(programIds, castSymbols = null, options = {}) {
  const cacheLimit = Number.isFinite(options.cacheLimit) ? options.cacheLimit : programIds.length;
  const cooldownLockedProgramIds = options.cooldownLockedProgramIds || new Set();
  const levelLockedProgramIds = options.levelLockedProgramIds || new Set();
  const cooldowns = options.cooldowns || {};
  const renderedPrograms = programIds
    .map((programId) => {
      const program = getProgramById(programId);
      const accent = getProgramAccent(program);
      const isOnCooldown = cooldownLockedProgramIds.has(program.id);
      const isLevelLocked = levelLockedProgramIds.has(program.id);
      const cooldownRemaining = cooldowns[program.id] || 0;
      const cooldownText = isLevelLocked ? "Used This Level" : isOnCooldown ? `Cooling Down (${cooldownRemaining})` : "Ready";
      const isAvailable = canCastProgram(program, castSymbols, cooldownLockedProgramIds);
      const allocatedSymbols = options.allocations?.[program.id] || [];

      return `
        <article class="program-card ${isAvailable ? "" : "unavailable"}" data-program-id="${program.id}" style="--program-accent: ${accent}" tabindex="${isAvailable ? "0" : "-1"}" aria-disabled="${!isAvailable}">
          <div class="program-row">
            <strong>${program.name}</strong>
            <div class="program-requirement">
              ${renderProgramRequirement(program)}
            </div>
          </div>
          <p class="program-status ${isOnCooldown ? "cooling" : "ready"}">Status: ${cooldownText}</p>
          ${renderAllocatedSymbols(allocatedSymbols)}
          <div class="program-tooltip">
            <strong>${program.name}</strong>
            <span>Cooldown ${getProgramCooldownLabel(program)}</span>
            <p>${program.details}</p>
          </div>
        </article>
      `;
    })
    .join("");
  const emptySlots = Array.from({ length: Math.max(0, cacheLimit - programIds.length) }, () => `
    <article class="program-card empty-program-slot" aria-disabled="true">
      <div class="program-row">
        <strong>Empty Cache</strong>
      </div>
      <div class="program-tooltip">
        <strong>Empty Cache</strong>
        <span>Open Program Slot</span>
        <p>This CACHE slot can hold a program gained from rewards.</p>
      </div>
    </article>
  `).join("");
  const physicalFallback =
    options.showPhysicalFallback && castSymbols !== null
      ? renderPhysicalDamageProgram(castSymbols, options.allocations?.["physical-damage"] || [])
      : "";

  return `${renderedPrograms}${emptySlots}${physicalFallback}`;
}

function renderSetupProgramPreview() {
  return baseProgramIds
    .map((programId) => {
      const program = getProgramById(programId);

      return `
        <article class="setup-program-card">
          <div class="program-row">
            <strong>${program.name}</strong>
            <div class="program-requirement">
              ${renderProgramRequirement(program)}
            </div>
          </div>
          <div class="program-tooltip">
            <strong>${program.name}</strong>
            <span>Base Program</span>
            <p>${program.details}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRunDice(loadout) {
  return loadout
    .map((loadoutDie, index) => {
      const previewSigil = getLoadoutDiePreviewSigil(loadoutDie);
      const accent = getLoadoutDieAccent(loadoutDie);
      const label = getLoadoutDieLabel(loadoutDie, index);

      return `
        <div class="run-die" style="--die-accent: ${accent}">
          ${renderSigilDieImage(previewSigil, "die preview")}
          <span>Die ${index + 1}</span>
          <strong>${label}</strong>
        </div>
      `;
    })
    .join("");
}

function renderThreadTracker(collectedCount, totalCount) {
  return `
    <div class="thread-tracker" aria-label="Rift threads collected">
      <span>Rift Threads</span>
      <strong>${collectedCount}/${totalCount}</strong>
      <i aria-hidden="true"></i>
    </div>
  `;
}

function renderCycleTracker(cycles = 0) {
  return `
    <div class="cycle-tracker" aria-label="Cycles">
      <img src="${cyclesCurrencyImage}" alt="">
      <span>Cycles</span>
      <strong>${cycles}</strong>
    </div>
  `;
}

function getLevelCycleMaxTurns(tileCount, enemyCount, riftThreadCount) {
  return Math.ceil(tileCount / 2) + enemyCount * 5 + riftThreadCount * 5;
}

function getLevelCycleReward(turnNumber, maxTurns) {
  const turnRatio = maxTurns > 0 ? turnNumber / maxTurns : 1;

  if (turnRatio <= 0.4) {
    return 400;
  }

  if (turnRatio <= 0.5) {
    return 300;
  }

  if (turnRatio <= 0.8) {
    return 200;
  }

  if (turnRatio <= 0.9) {
    return 100;
  }

  return 50;
}

function getLevelCycleTurnThreshold(currentTurns, maxTurns) {
  if (maxTurns <= 0) {
    return 0;
  }

  const thresholds = [0.4, 0.5, 0.8, 0.9, 1].map((ratio) => Math.max(1, Math.ceil(maxTurns * ratio)));
  return thresholds.find((threshold) => currentTurns <= threshold) || maxTurns;
}

function renderCyclePanel(cycles = 0, reward = 0, currentTurns = 1, maxTurns = 0) {
  const turnThreshold = getLevelCycleTurnThreshold(currentTurns, maxTurns);

  return `
    <div class="cycle-panel" aria-label="Cycles and level reward">
      <div class="cycle-tracker" aria-label="Cycles">
        <img src="${cyclesCurrencyImage}" alt="">
        <span>Cycles</span>
        <strong>${cycles} <em>+${reward}</em></strong>
        <small>Turns: ${currentTurns} / ${turnThreshold}</small>
      </div>
    </div>
  `;
}

function renderRollDieOptions(character, selectedRollSlots, castSymbols = null) {
  if (!Array.isArray(castSymbols) || !castSymbols.length) {
    return `<p class="roll-empty">First Sigil-Cast rolls all equipped dice.</p>`;
  }

  const symbolsBySlot = new Map(castSymbols.map((symbol) => [symbol.slotIndex, symbol]));

  return character.loadout
    .map((loadoutDie, index) => {
      const symbol = symbolsBySlot.get(index);

      if (!symbol || symbol.spent) {
        return "";
      }

      const accent = symbol.blank ? getLoadoutDieAccent(loadoutDie) : getDieById(symbol.element).accent;
      const isSelected = selectedRollSlots.includes(index);

      return `
        <button class="roll-die-option ${isSelected ? "selected" : ""}" type="button" data-roll-slot="${index}" style="--die-accent: ${accent}" aria-pressed="${isSelected}">
          ${renderSigilDieImage(symbol, "current result")}
          ${(symbol.pips || []).map((pip) => renderPipMarker(pip)).join("")}
          <strong>Die ${index + 1}</strong>
        </button>
      `;
    })
    .join("");
}

function renderRollResultSlots(
  character,
  selectedRollSlots,
  results = [],
  spentResultIndices = new Set(),
  assignableResultIndices = new Set(),
  castSymbols = null
) {
  if (Array.isArray(castSymbols) && castSymbols.length) {
    const visibleSymbols = castSymbols.filter((symbol) => !symbol.spent);

    if (!visibleSymbols.length) {
      return `<p class="roll-empty">All rolled sigils have been assigned.</p>`;
    }

    return visibleSymbols
      .map((symbol) => {
        const rollingResultIndex = selectedRollSlots.indexOf(symbol.slotIndex);
        const rollingResult = rollingResultIndex >= 0 && results[rollingResultIndex] ? results[rollingResultIndex] : null;
        const displaySymbol = rollingResult
          ? rollingResult.sigil
            ? { element: rollingResult.sigil.element, face: rollingResult.sigil.face, pips: rollingResult.pips || [] }
            : { blank: true, pips: rollingResult.pips || [] }
          : symbol;
        const displayDie = displaySymbol.blank ? null : getDieById(displaySymbol.element);
        const isAssignable = assignableResultIndices.has(symbol.resultIndex);
        const isRollingSlot = rollingResultIndex >= 0;

        return `
          <div class="roll-result ${isAssignable ? "assignable" : ""} ${isRollingSlot ? "rolling" : ""} ${displaySymbol.blank ? "blank-result" : ""}" data-result-index="${symbol.resultIndex}" style="--die-accent: ${displaySymbol.blank ? getLoadoutDieAccent(character.loadout[symbol.slotIndex]) : displayDie.accent}">
            <span>Die ${symbol.slotIndex + 1}</span>
            ${(displaySymbol.pips || []).map((pip) => renderPipMarker(pip)).join("")}
            ${renderSigilDieImage(displaySymbol, "result")}
            <strong>${displaySymbol.blank ? "Blank" : displayDie.name}</strong>
          </div>
        `;
      })
      .join("");
  }

  if (!selectedRollSlots.length) {
    return "";
  }

  return selectedRollSlots
    .map((slotIndex, resultIndex) => {
      const rollResult = results[resultIndex] || null;
      const sigil = rollResult?.sigil ? { element: rollResult.sigil.element, face: rollResult.sigil.face } : { blank: true };
      const die = sigil.blank ? null : getDieById(sigil.element);

      return `
        <div class="roll-result ${sigil.blank ? "blank-result" : ""}" data-result-index="${resultIndex}" style="--die-accent: ${sigil.blank ? getLoadoutDieAccent(character.loadout[slotIndex]) : die.accent}">
          <span>Die ${slotIndex + 1}</span>
          ${(rollResult?.pips || []).map((pip) => renderPipMarker(pip)).join("")}
          ${renderSigilDieImage(sigil, "result")}
          <strong>${sigil.blank ? "Blank" : die.name}</strong>
        </div>
      `;
    })
    .join("");
}

function getCastSymbols(character, selectedRollSlots, results) {
  return selectedRollSlots.map((slotIndex, resultIndex) => ({
    resultIndex: slotIndex,
    slotIndex,
    element: results[resultIndex]?.sigil?.element || null,
    face: results[resultIndex]?.sigil?.face || null,
    faceIndex: results[resultIndex]?.faceIndex ?? null,
    pips: results[resultIndex]?.pips || [],
    blank: !results[resultIndex]?.sigil,
  }));
}

function getAvailableSigilGlyphSymbols(character) {
  return (character.artifacts || [])
    .filter((artifact) => artifact.effect?.type === "sigilGlyph" && artifact.uses > 0 && artifact.sigil)
    .map((artifact, index) => ({
      resultIndex: `glyph-${artifact.instanceId || artifact.id}-${index}`,
      slotIndex: null,
      artifactInstanceId: artifact.instanceId || artifact.id,
      element: artifact.sigil.element,
      face: artifact.sigil.face || 1,
      faceIndex: null,
      blank: false,
    }));
}

function getRollPipCycleReward(results) {
  return results.reduce(
    (total, result) => total + (result.pips || []).filter((pip) => pip.type === "cycles").length * 10,
    0
  );
}

function getRollPipExecutionBonus(results) {
  return results.reduce(
    (total, result) => total + (result.pips || []).filter((pip) => pip.type === "arcane").length,
    0
  );
}

function findProgramAllocation(program, castSymbols) {
  if (!Array.isArray(castSymbols)) {
    return [];
  }

  const availableSymbols = castSymbols.filter((symbol) => isUsableSigilSymbol(symbol) && !symbol.spent);

  return program.requirement.reduce((allocated, requirement) => {
    const symbol = availableSymbols.find(
      (item) =>
        !allocated.includes(item) &&
        item.element === requirement.element &&
        item.face === requirement.face
    );

    return symbol ? [...allocated, symbol] : allocated;
  }, []);
}

function findPhysicalAllocation(castSymbols) {
  const availableSymbols = Array.isArray(castSymbols) ? castSymbols.filter((symbol) => isUsableSigilSymbol(symbol) && !symbol.spent && !symbol.artifactInstanceId) : [];

  if (!availableSymbols.length) {
    return [];
  }

  const groups = availableSymbols.reduce((grouped, symbol) => {
    const key = `${symbol.element}:${symbol.face}`;
    grouped.set(key, [...(grouped.get(key) || []), symbol]);
    return grouped;
  }, new Map());

  return [...groups.values()].sort((a, b) => b.length - a.length)[0];
}

function findPhysicalAllocationFromSymbol(castSymbols, selectedSymbol) {
  if (!isUsableSigilSymbol(selectedSymbol)) {
    return [];
  }

  return Array.isArray(castSymbols)
    ? castSymbols.filter(
        (symbol) =>
          isUsableSigilSymbol(symbol) &&
          !symbol.spent &&
          !symbol.artifactInstanceId &&
          symbol.element === selectedSymbol.element &&
          symbol.face === selectedSymbol.face
      )
    : [];
}

function getPhysicalDamageFromAllocation(symbols) {
  const count = symbols?.length || 0;

  return count >= 3 ? 5 : count === 2 ? 3 : 1;
}

function markSymbolsSpent(castSymbols, symbolsToSpend) {
  const spendIndices = new Set(symbolsToSpend.map((symbol) => symbol.resultIndex));

  return castSymbols.map((symbol) => ({
    ...symbol,
    spent: symbol.spent || spendIndices.has(symbol.resultIndex),
  }));
}

function getArtifactDisplayLabel(artifact) {
  if (artifact.type === "pip" || artifact.effect?.type === "pip") {
    const pip = getPipDefinition(artifact.effect?.pipType || artifact.pipType);
    return artifact.label || pip?.label || "Crafting pip";
  }

  const sigil = artifact.sigil ? getSigilDefinition(artifact.sigil.element, artifact.sigil.face) : null;
  const sigilText = sigil ? ` (${sigilRarityLabels[artifact.sigil.face || 1]} ${sigil.name})` : "";
  const usesText = Number.isFinite(artifact.uses) ? ` - ${artifact.uses} use${artifact.uses === 1 ? "" : "s"}` : "";

  return `${artifact.label}${sigilText}${usesText}`;
}

function getArtifactImage(artifact) {
  if (artifact.image) {
    return artifact.image;
  }

  if (artifact.type === "pip" || artifact.effect?.type === "pip") {
    return "artifact_1.png";
  }

  if (artifact.effect?.type === "sigilGlyph" && artifact.sigil) {
    return getSigilDefinition(artifact.sigil.element, artifact.sigil.face)?.image || "artifact_1.png";
  }

  return "artifact_1.png";
}

function getExecutionStatusText(remaining) {
  return `EXECUTIONS (ROLLS) REMAINING: ${remaining}`;
}

function renderRunCharacter(character) {
  return `
    <div class="run-character">
      <img class="run-character-portrait" src="${character.portrait}" alt="${character.name}">
      <img class="run-character-name" src="${character.nameImage}" alt="${character.name}">
    </div>
  `;
}

function renderArtifactStrip(collectedArtifacts, pendingAssignment = null) {
  const availableGlyphSymbols = getAvailableSigilGlyphSymbols({ artifacts: collectedArtifacts });

  return `
    <div class="artifact-strip" aria-label="Collected artifacts">
      ${
        collectedArtifacts.length
          ? collectedArtifacts
              .map(
                (artifact) => {
                  const artifactInstanceId = artifact.instanceId || artifact.id;
                  const glyphSymbol = availableGlyphSymbols.find((symbol) => symbol.artifactInstanceId === artifactInstanceId);
                  const isAssignableGlyph = Boolean(
                    glyphSymbol &&
                      pendingAssignment?.candidateResultIndices?.has(glyphSymbol.resultIndex)
                  );

                  return `
            <button class="artifact-badge ${artifact.uses > 0 ? "usable" : ""} ${isAssignableGlyph ? "assignable" : ""}" type="button" ${artifact.uses > 0 ? `data-artifact-use="${artifactInstanceId}"` : `aria-disabled="true"`} data-artifact-info="${artifact.name}: ${getArtifactDisplayLabel(artifact)}">
              <img src="${getArtifactImage(artifact)}" alt="">
              <span>${artifact.name}</span>
            </button>
          `;
                }
              )
              .join("")
          : `<span class="artifact-empty">No Artifacts</span>`
      }
    </div>
  `;
}

function renderCharacterStats(stats, temporaryExecutionBonus = 0, temporaryActionBonus = 0) {
  const integrityPercent = Math.max(0, Math.min(100, (stats.integrity / stats.maxIntegrity) * 100));
  const executionBonus = Math.max(0, temporaryExecutionBonus);
  const actionBonus = Math.max(0, temporaryActionBonus);

  return `
    <dl class="stat-grid" id="character-stats" aria-label="Character stats">
      <div class="stat">
        <dt>Cache</dt>
        <dd>${stats.cache}</dd>
      </div>
      <div class="stat">
        <dt>Executions</dt>
        <dd>${stats.exec}${executionBonus ? `<span class="stat-temp-bonus">+${executionBonus}</span>` : ""}</dd>
      </div>
      <div class="stat integrity-stat">
        <dt>Integrity</dt>
        <dd>
          <span class="integrity-value"><span class="integrity-current">${stats.integrity}</span>/${stats.maxIntegrity}</span>
          <span class="integrity-bar" aria-hidden="true">
            <span style="width: ${integrityPercent}%"></span>
          </span>
        </dd>
      </div>
      <div class="stat">
        <dt>Actions</dt>
        <dd>${stats.move}${actionBonus ? `<span class="stat-temp-bonus">+${actionBonus}</span>` : ""}</dd>
      </div>
    </dl>
  `;
}

function renderProgressionTracker(progression = startingProgression) {
  return `
    <dl class="progression-tracker" aria-label="Character progression">
      <div>
        <dt>Level</dt>
        <dd>${progression.level}</dd>
      </div>
      <div>
        <dt>XP</dt>
        <dd>${progression.xp}/${progression.xpToNextLevel}</dd>
      </div>
    </dl>
  `;
}

function addCharacterXp(character, amount) {
  if (!character.progression || amount <= 0) {
    return false;
  }

  let didLevelUp = false;
  character.progression.xp += amount;

  while (character.progression.xp >= character.progression.xpToNextLevel) {
    character.progression.xp -= character.progression.xpToNextLevel;
    character.progression.level += 1;
    character.progression.pendingRewards = (character.progression.pendingRewards || 0) + 1;
    character.progression.xpToNextLevel = getXpThresholdForLevel(character.progression.level);
    didLevelUp = true;
  }

  return didLevelUp;
}

function ensureRunStats(character) {
  character.runStats = {
    enemiesKilled: Number.isFinite(character.runStats?.enemiesKilled) ? character.runStats.enemiesKilled : 0,
    riftsClosed: Number.isFinite(character.runStats?.riftsClosed) ? character.runStats.riftsClosed : 0,
    turnsTaken: Number.isFinite(character.runStats?.turnsTaken) ? character.runStats.turnsTaken : 0,
  };

  return character.runStats;
}

function getXpThresholdForLevel(level) {
  const thresholds = {
    1: 50,
    2: 100,
    3: 150,
    4: 225,
    5: 340,
  };

  return thresholds[level] || Math.round(getXpThresholdForLevel(level - 1) * 1.5);
}

function ensureMapState(character) {
  if (!character.mapState) {
    character.mapState = {
      selectedNode: startingMapState.selectedNode,
      completedNodes: [...startingMapState.completedNodes],
      unlockedNodes: [...startingMapState.unlockedNodes],
      visitedMarkets: [...startingMapState.visitedMarkets],
    };
  }

  character.mapState.visitedMarkets = character.mapState.visitedMarkets || [];

  return character.mapState;
}

function completeLevelNode(character, nodeId) {
  const mapState = ensureMapState(character);
  const node = levelNodes.find((item) => item.id === nodeId);

  if (!mapState.completedNodes.includes(nodeId)) {
    mapState.completedNodes.push(nodeId);
  }

  (node?.unlocks || []).forEach((unlockedNodeId) => {
    if (!mapState.unlockedNodes.includes(unlockedNodeId)) {
      mapState.unlockedNodes.push(unlockedNodeId);
    }
  });

  mapState.selectedNode = node?.unlocks?.[0] || nodeId;
}

function cloneSaveData(value) {
  return JSON.parse(JSON.stringify(value));
}

function downloadJsonSave(saveData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `arcane-glitch-save-${timestamp}.json`;
  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeLoadedCharacter(character) {
  const baseCharacter = characters.find((item) => item.id === character?.id) || characters[0];

  return {
    ...baseCharacter,
    ...character,
    stats: { ...startingStats, ...(character?.stats || {}) },
    progression: { ...startingProgression, ...(character?.progression || {}) },
    programs: Array.isArray(character?.programs) ? character.programs : [...baseProgramIds],
    programLibrary: Array.isArray(character?.programLibrary) ? character.programLibrary : [...baseProgramIds],
    loadout: Array.isArray(character?.loadout) ? character.loadout : [createBlankDie()],
    artifacts: Array.isArray(character?.artifacts) ? character.artifacts : [],
    cycles: Number.isFinite(character?.cycles) ? character.cycles : 0,
    sigilInventory: Array.isArray(character?.sigilInventory) ? character.sigilInventory : [],
    pipInventory: Array.isArray(character?.pipInventory) ? character.pipInventory : [],
    mapState: character?.mapState || cloneSaveData(startingMapState),
  };
}

function loadSaveGame(saveData) {
  if (!saveData || saveData.game !== "Arcane Glitch" || !saveData.character) {
    throw new Error("This is not an Arcane Glitch save file.");
  }

  const character = normalizeLoadedCharacter(saveData.character);
  const roomState = saveData.currentRoom || null;

  startBackgroundMusic();
  window.clearInterval(runeRainTimer);

  if (roomState?.nodeId) {
    showInitialRoom(character, roomState.nodeId, roomState);
    return;
  }

  showLevelMap(character);
}

function renderEnemyInfo(enemy) {
  return `
    <article class="enemy-card" tabindex="0">
      <div class="enemy-row">
        <img class="enemy-thumb" src="${enemy.image}" alt="${enemy.name}">
        <strong>${enemy.name}</strong>
        <span>Power ${enemy.stats.power}</span>
      </div>
      <div class="enemy-tooltip">
        <img class="enemy-portrait" src="${enemy.image}" alt="${enemy.name}">
        <h3>${enemy.name}</h3>
        <dl class="enemy-stat-grid" aria-label="${enemy.name} stats">
          <div>
            <dt>Integrity</dt>
            <dd>${enemy.stats.integrity}</dd>
          </div>
          <div>
            <dt>Physical Defense</dt>
            <dd>${enemy.stats.physicalDefense}</dd>
          </div>
          <div>
            <dt>Arcane Defense</dt>
            <dd>${enemy.stats.arcaneDefense}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>${enemy.stats.power}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>${Math.round((enemy.stats.accuracy ?? 0.4) * 100)}%</dd>
          </div>
          <div>
            <dt>XP Value</dt>
            <dd>${enemy.xpValue}</dd>
          </div>
        </dl>
      </div>
    </article>
  `;
}

function createEnemyInstance(enemyType, index, tileId, tier) {
  const baseEnemy = enemies[enemyType] || enemies.voidRaider;
  const normalizedTier = Math.max(1, tier);
  const scalesWithTier = !baseEnemy.fixedStats;
  const integrityBonus = scalesWithTier ? Math.max(0, Math.floor((normalizedTier - 2) * 1.5)) : 0;
  const powerBonus = scalesWithTier ? Math.max(0, Math.floor((normalizedTier - 2) / 2)) : 0;
  const defenseBonus = scalesWithTier ? Math.max(0, Math.floor((normalizedTier - 4) / 2)) : 0;
  const xpBonus = scalesWithTier ? Math.max(0, (normalizedTier - 1) * 5) : 0;

  return {
    ...baseEnemy,
    instanceId: `${baseEnemy.id}-${index}`,
    positionId: tileId,
    xpValue: baseEnemy.xpValue + xpBonus,
    behavior: baseEnemy.behavior || "neutral",
    stats: {
      ...baseEnemy.stats,
      integrity: (baseEnemy.stats.integrity ?? 1) + integrityBonus,
      physicalDefense: (baseEnemy.stats.physicalDefense ?? 0) + defenseBonus,
      arcaneDefense: (baseEnemy.stats.arcaneDefense ?? 0) + defenseBonus,
      power: (baseEnemy.stats.power ?? 1) + powerBonus,
      accuracy: Math.min(0.85, (baseEnemy.stats.accuracy ?? 0.4) + (scalesWithTier ? Math.max(0, normalizedTier - 1) * 0.05 : 0)),
    },
  };
}

function getEnemyAtTile(activeEnemies, tileId) {
  return activeEnemies.find((enemy) => enemy.positionId === tileId && enemy.stats.integrity > 0);
}

function getOccupiedEnemyTileIds(activeEnemies) {
  return activeEnemies
    .filter((enemy) => enemy.positionId && enemy.stats.integrity > 0)
    .map((enemy) => enemy.positionId);
}

function getHexDistance(a, b) {
  const aq = a.q;
  const ar = a.r - a.q;
  const as = -aq - ar;
  const bq = b.q;
  const br = b.r - b.q;
  const bs = -bq - br;

  return (Math.abs(aq - bq) + Math.abs(ar - br) + Math.abs(as - bs)) / 2;
}

function getMovementPathToTile(roomTiles, positionId, targetTileId, maxSteps = 1, blockedTileIds = [], wallEdges = []) {
  const position = roomTiles.find((tile) => tile.id === positionId);
  const target = roomTiles.find((tile) => tile.id === targetTileId);
  const blocked = new Set(blockedTileIds.filter(Boolean));

  if (!position || !target || targetTileId === positionId || blocked.has(targetTileId)) {
    return [];
  }

  const queue = [{ tileId: positionId, path: [] }];
  const visited = new Set([positionId]);

  while (queue.length) {
    const current = queue.shift();
    const currentTile = roomTiles.find((tile) => tile.id === current.tileId);

    if (!currentTile || current.path.length >= maxSteps) {
      continue;
    }

    const adjacentTiles = roomTiles.filter(
      (tile) =>
        tile.id !== positionId &&
        !blocked.has(tile.id) &&
        getHexDistance(currentTile, tile) === 1 &&
        !hasWallBetweenTiles(wallEdges, currentTile, tile)
    );

    for (const tile of adjacentTiles) {
      if (visited.has(tile.id)) {
        continue;
      }

      const nextPath = [...current.path, tile.id];

      if (tile.id === targetTileId) {
        return nextPath;
      }

      visited.add(tile.id);
      queue.push({ tileId: tile.id, path: nextPath });
    }
  }

  return [];
}

function getReachableTileIds(roomTiles, positionId, maxSteps = 1, blockedTileIds = [], wallEdges = []) {
  return roomTiles
    .filter((tile) => tile.id !== positionId)
    .filter((tile) => getMovementPathToTile(roomTiles, positionId, tile.id, maxSteps, blockedTileIds, wallEdges).length)
    .map((tile) => tile.id);
}

function getEnemyTileIdsAtRange(roomTiles, activeEnemies, positionId, distance, wallEdges = []) {
  const position = roomTiles.find((tile) => tile.id === positionId);

  if (!position) {
    return [];
  }

  return activeEnemies
    .filter((enemy) => enemy.positionId && enemy.stats.integrity > 0)
    .filter((enemy) => {
      const enemyTile = roomTiles.find((tile) => tile.id === enemy.positionId);

      return enemyTile &&
        getHexDistance(position, enemyTile) === distance &&
        getMovementPathToTile(roomTiles, positionId, enemyTile.id, distance, [], wallEdges).length === distance;
    })
    .map((enemy) => enemy.positionId);
}

function getLineTargetTileIds(roomTiles, positionId, distance, occupiedTileIds = [], options = {}) {
  const position = roomTiles.find((tile) => tile.id === positionId);
  const occupied = new Set(occupiedTileIds.filter(Boolean));
  const wallEdges = options.wallEdges || [];

  if (!position) {
    return [];
  }

  return roomDirections
    .map((direction) => {
      const pathKeys = Array.from({ length: Math.max(0, distance - 1) }, (_, index) =>
        tileKey(position.q + direction.q * (index + 1), position.r + direction.r * (index + 1))
      );
      const targetQ = position.q + direction.q * distance;
      const targetR = position.r + direction.r * distance;
      const target = roomTiles.find((tile) => tile.q === targetQ && tile.r === targetR);
      const pathTiles = Array.from({ length: distance }, (_, index) =>
        roomTiles.find((tile) => tile.q === position.q + direction.q * (index + 1) && tile.r === position.r + direction.r * (index + 1))
      );
      const hasConnectedPath = pathKeys.every((pathKey) => roomTiles.some((tile) => tileKey(tile.q, tile.r) === pathKey));
      const isBlockedByWall = !options.ignoreWalls && [position, ...pathTiles].some((tile, index, path) =>
        index > 0 && hasWallBetweenTiles(wallEdges, path[index - 1], tile)
      );

      return (options.allowGaps || hasConnectedPath) && !isBlockedByWall && target && (options.allowOccupied || !occupied.has(target.id)) ? target.id : null;
    })
    .filter(Boolean);
}

function getBlinkTargetTileIds(roomTiles, positionId, occupiedTileIds = [], distance = 2) {
  return getLineTargetTileIds(roomTiles, positionId, distance, occupiedTileIds, { allowGaps: true, ignoreWalls: true });
}

function getPushDestinationTileId(roomTiles, playerPositionId, enemyPositionId, occupiedTileIds = [], wallEdges = []) {
  const playerTile = roomTiles.find((tile) => tile.id === playerPositionId);
  const enemyTile = roomTiles.find((tile) => tile.id === enemyPositionId);

  if (!playerTile || !enemyTile || getHexDistance(playerTile, enemyTile) !== 1) {
    return null;
  }

  const targetQ = enemyTile.q + (enemyTile.q - playerTile.q);
  const targetR = enemyTile.r + (enemyTile.r - playerTile.r);
  const occupied = new Set(occupiedTileIds.filter((tileId) => tileId && tileId !== enemyPositionId));
  const destination = roomTiles.find((tile) => tile.q === targetQ && tile.r === targetR);

  return destination &&
    !occupied.has(destination.id) &&
    destination.id !== playerPositionId &&
    !hasWallBetweenTiles(wallEdges, enemyTile, destination)
    ? destination.id
    : null;
}

function getPushableEnemyTileIds(roomTiles, activeEnemies, playerPositionId, wallEdges = []) {
  const occupiedTileIds = getOccupiedEnemyTileIds(activeEnemies);

  return getAdjacentEnemyTileIds(roomTiles, activeEnemies, playerPositionId, wallEdges).filter((enemyTileId) =>
    Boolean(getPushDestinationTileId(roomTiles, playerPositionId, enemyTileId, occupiedTileIds, wallEdges))
  );
}

function getNextEnemyStepTowardPlayer(roomTiles, enemyPositionId, playerPositionId, occupiedTileIds = [], maxSteps = 1, wallEdges = []) {
  if (!enemyPositionId) {
    return enemyPositionId;
  }

  let currentPositionId = enemyPositionId;
  const playerTile = roomTiles.find((tile) => tile.id === playerPositionId);
  const occupied = new Set(occupiedTileIds.filter((tileId) => tileId && tileId !== enemyPositionId));

  for (let step = 0; step < maxSteps; step += 1) {
    const currentTile = roomTiles.find((tile) => tile.id === currentPositionId);

    if (!currentTile || !playerTile || getHexDistance(currentTile, playerTile) <= 1) {
      return currentPositionId;
    }

    const adjacentTiles = roomTiles.filter(
      (tile) =>
        tile.id !== playerPositionId &&
        !occupied.has(tile.id) &&
        getHexDistance(currentTile, tile) === 1 &&
        !hasWallBetweenTiles(wallEdges, currentTile, tile)
    );
    const bestStep = adjacentTiles.sort(
      (a, b) => getHexDistance(a, playerTile) - getHexDistance(b, playerTile)
    )[0];

    if (!bestStep) {
      return currentPositionId;
    }

    occupied.delete(currentPositionId);
    currentPositionId = bestStep.id;
    occupied.add(currentPositionId);
  }

  return currentPositionId;
}

function getRandomEnemyStep(roomTiles, enemyPositionId, playerPositionId, occupiedTileIds = [], wallEdges = []) {
  if (!enemyPositionId) {
    return enemyPositionId;
  }

  const currentTile = roomTiles.find((tile) => tile.id === enemyPositionId);

  if (!currentTile) {
    return enemyPositionId;
  }

  const occupied = new Set(occupiedTileIds.filter((tileId) => tileId && tileId !== enemyPositionId));
  const adjacentTiles = roomTiles.filter(
    (tile) =>
      tile.id !== playerPositionId &&
      !occupied.has(tile.id) &&
      getHexDistance(currentTile, tile) === 1 &&
      !hasWallBetweenTiles(wallEdges, currentTile, tile)
  );

  if (!adjacentTiles.length) {
    return enemyPositionId;
  }

  return adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)].id;
}

function getNextEnemyPosition(roomTiles, enemy, playerPositionId, occupiedTileIds = [], wallEdges = []) {
  const behavior = enemy.behavior || "neutral";
  const moveSteps = Math.max(0, enemy.stats?.move ?? 1);

  if (behavior === "stationary" || moveSteps <= 0) {
    return enemy.positionId;
  }

  if (behavior === "aggressive" && Math.random() >= 0.5) {
    return enemy.positionId;
  }

  if (behavior === "aggressive" || behavior === "hyperAggressive") {
    return getNextEnemyStepTowardPlayer(roomTiles, enemy.positionId, playerPositionId, occupiedTileIds, moveSteps, wallEdges);
  }

  return getRandomEnemyStep(roomTiles, enemy.positionId, playerPositionId, occupiedTileIds, wallEdges);
}

function getAdjacentEnemyTileIds(roomTiles, activeEnemies, playerPositionId, wallEdges = []) {
  const playerTile = roomTiles.find((tile) => tile.id === playerPositionId);

  if (!playerTile) {
    return [];
  }

  return activeEnemies
    .filter((enemy) => enemy.positionId && enemy.stats.integrity > 0)
    .filter((enemy) => {
      const enemyTile = roomTiles.find((tile) => tile.id === enemy.positionId);
      return enemyTile && getHexDistance(enemyTile, playerTile) === 1 && !hasWallBetweenTiles(wallEdges, enemyTile, playerTile);
    })
    .map((enemy) => enemy.positionId);
}

function isEnemyAdjacentToPlayer(roomTiles, enemy, playerPositionId, wallEdges = []) {
  return getAdjacentEnemyTileIds(roomTiles, [enemy], playerPositionId, wallEdges).length > 0;
}

function canEnemyAttackPlayer(roomTiles, enemy, playerPositionId, activeEnemies = [], wallEdges = []) {
  const range = Math.max(1, enemy.stats?.range || 1);

  if (!enemy.positionId || enemy.stats.integrity <= 0) {
    return false;
  }

  if (range === 1) {
    return isEnemyAdjacentToPlayer(roomTiles, enemy, playerPositionId, wallEdges);
  }

  const enemyTile = roomTiles.find((tile) => tile.id === enemy.positionId);
  const playerTile = roomTiles.find((tile) => tile.id === playerPositionId);

  if (!enemyTile || !playerTile || getHexDistance(enemyTile, playerTile) > range) {
    return false;
  }

  const occupiedTileIds = getOccupiedEnemyTileIds(activeEnemies).filter((tileId) => tileId !== enemy.positionId);
  return getMovementPathToTile(roomTiles, enemy.positionId, playerPositionId, range, occupiedTileIds, wallEdges).length > 0;
}

function getRoomGridStyle(roomTiles) {
  const qs = roomTiles.map((tile) => tile.q);
  const rs = roomTiles.map((tile) => tile.r);
  const screenXs = roomTiles.map((tile) => tile.q - tile.r * 0.5);
  const minQ = Math.min(...qs);
  const maxQ = Math.max(...qs);
  const minR = Math.min(...rs);
  const maxR = Math.max(...rs);
  const minScreenX = Math.min(...screenXs);
  const maxScreenX = Math.max(...screenXs);

  return `--min-q: ${minQ}; --max-q: ${maxQ}; --min-r: ${minR}; --max-r: ${maxR}; --min-screen-x: ${minScreenX}; --max-screen-x: ${maxScreenX};`;
}

function getVisibleTileIds(roomTiles, characterPositionId, sightRange = baseSightRange) {
  const characterTile = roomTiles.find((tile) => tile.id === characterPositionId);
  const range = Math.max(1, sightRange);

  return roomTiles
    .filter((tile) => tile.id === characterPositionId || getHexDistance(characterTile, tile) <= range)
    .map((tile) => tile.id);
}

function renderRoomTiles(
  roomTiles,
  character,
  characterPositionId,
  activeEnemies,
  reachableTileIds,
  visibleTileIds,
  exploredTileIds,
  targetableEnemyTileIds = [],
  riftThreadTileIds = [],
  collectedThreadTileIds = [],
  artifactTileIds = [],
  collectedArtifactTileIds = [],
  sigilPickups = [],
  collectedSigilTileIds = [],
  cycleDrops = [],
  wallEdges = []
) {
  return roomTiles
    .map((tile) => {
      const hasCharacter = tile.id === characterPositionId;
      const enemyOnTile = getEnemyAtTile(activeEnemies, tile.id);
      const isReachable = reachableTileIds.includes(tile.id);
      const isVisible = visibleTileIds.includes(tile.id);
      const isExplored = exploredTileIds.includes(tile.id);
      const isTargetableEnemy = targetableEnemyTileIds.includes(tile.id);
      const hasRiftThread = riftThreadTileIds.includes(tile.id) && !collectedThreadTileIds.includes(tile.id);
      const hasArtifact = artifactTileIds.includes(tile.id) && !collectedArtifactTileIds.includes(tile.id);
      const sigilPickup = sigilPickups.find((pickup) => pickup.tileId === tile.id && !collectedSigilTileIds.includes(tile.id));
      const cycleDrop = cycleDrops.find((drop) => drop.tileId === tile.id);
      const visibleWallEdges = (isVisible || isExplored)
        ? wallEdges
            .map((wallEdge) => {
              if (wallEdge.tileId === tile.id) {
                return { ...wallEdge, renderedSideIndex: wallEdge.sideIndex };
              }

              if (wallEdge.neighborTileId !== tile.id) {
                return null;
              }

              const anchorIsRevealed = visibleTileIds.includes(wallEdge.tileId) || exploredTileIds.includes(wallEdge.tileId);
              return anchorIsRevealed
                ? null
                : { ...wallEdge, renderedSideIndex: (wallEdge.sideIndex + 3) % roomDirections.length };
            })
            .filter(Boolean)
        : [];
      const tileImage = getRoomTileImage(tile, isVisible || isExplored);
      const classes = [
        "room-tile",
        hasCharacter ? "occupied" : "",
        isReachable ? "reachable" : "",
        isTargetableEnemy ? "targetable-enemy" : "",
        isVisible ? "visible" : isExplored ? "explored" : "concealed",
        enemyOnTile && isVisible ? "threat-visible" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <button class="${classes}" type="button" data-tile-id="${tile.id}" style="--q: ${tile.q}; --r: ${tile.r}" aria-label="${tile.type} space">
          <img src="${tileImage}" alt="">
          ${
            hasRiftThread && isVisible
              ? `<span class="rift-thread" aria-hidden="true"></span>`
              : ""
          }
          ${
            hasArtifact && isVisible
              ? `<img class="artifact-pickup-token" src="artifact_1.png" alt="Artifact pickup">`
              : ""
          }
          ${
            sigilPickup && isVisible
              ? `<img class="floating-sigil-token" src="${getSigilDefinition(sigilPickup.sigil.element, sigilPickup.sigil.face)?.image}" alt="Floating sigil">`
              : ""
          }
          ${
            cycleDrop && isVisible
              ? `<span class="cycle-drop-token" aria-label="${cycleDrop.amount} Cycles"><img src="${cyclesCurrencyImage}" alt=""><strong>${cycleDrop.amount}</strong></span>`
              : ""
          }
          ${visibleWallEdges
            .map((wallEdge) => {
              const segmentNumber = wallSegmentByDirectionSide[wallEdge.renderedSideIndex] || 1;
              const wallImage = roomTileAssets.wallSegments[segmentNumber - 1];
              return `<img class="hex-wall" src="${wallImage}" alt="">`;
            })
            .join("")}
          ${
            hasCharacter
              ? `<img class="character-token" src="${character.token || defaultCharacterToken}" alt="${character.name}">`
              : ""
          }
          ${
            enemyOnTile && isVisible
              ? `<img class="glitchspawn-token" data-enemy-id="${enemyOnTile.instanceId}" src="${enemyOnTile.image}" alt="${enemyOnTile.name}">`
              : ""
          }
        </button>
      `;
    })
    .join("");
}

function showInitialRoom(character, nodeId = startingMapState.selectedNode, savedRoomState = null) {
  character.progression = character.progression || { ...startingProgression };
  ensureRunStats(character);
  character.stats.maxIntegrity = character.stats.maxIntegrity || character.stats.integrity;
  character.cycles = Number.isFinite(character.cycles) ? character.cycles : 0;
  ensureProgramLibrary(character);
  const levelNode = levelNodes.find((node) => node.id === nodeId) || levelNodes[0];
  const roomConfig = savedRoomState?.roomConfig || getRoomConfigForLevelNode(levelNode);
  const room = savedRoomState?.room || generateRoomTiles(roomConfig, levelNode);
  const roomTiles = room.tiles;
  if (!savedRoomState?.room) {
    applyRoomTileTheme(roomTiles, levelNode);
  }
  const riftTile = roomTiles.find((tile) => tile.id === room.riftTileId);
  const riftThreadTileIds = room.threadTileIds;
  const cacheTileIds = room.cacheTileIds || [];
  const artifactTileIds = room.artifactTileIds || [];
  const pipArtifactTileIds = room.pipArtifactTileIds || [];
  const allArtifactTileIds = [...artifactTileIds, ...pipArtifactTileIds];
  const sigilPickups = room.sigilPickups || [];
  const wallEdges = room.wallEdges || [];
  const collectedThreadTileIds = [...(savedRoomState?.collectedThreadTileIds || [])];
  const collectedCacheTileIds = [...(savedRoomState?.collectedCacheTileIds || [])];
  const collectedArtifactTileIds = [...(savedRoomState?.collectedArtifactTileIds || [])];
  const collectedSigilTileIds = [...(savedRoomState?.collectedSigilTileIds || [])];
  const usedPowerHubTileIds = [...(savedRoomState?.usedPowerHubTileIds || [])];
  const cycleDrops = [...(savedRoomState?.cycleDrops || [])];
  const spawnTileGroups = getConnectedTileGroups(roomTiles);
  const playerStartGroup = spawnTileGroups.find((group) => group.some((tile) => tile.id === "tile-0")) || roomTiles;
  const isRiftOnPlayerIsland = playerStartGroup.some((tile) => tile.id === riftTile.id);
  const enemySpawnCandidates = (isRiftOnPlayerIsland ? roomTiles : playerStartGroup)
    .filter((tile) => tile.id !== "tile-0" && tile.id !== riftTile.id)
    .sort((a, b) =>
      isRiftOnPlayerIsland
        ? getHexDistance(a, riftTile) - getHexDistance(b, riftTile)
        : getHexDistance(b, roomTiles[0]) - getHexDistance(a, roomTiles[0])
    );
  const enemySpawnTiles = isRiftOnPlayerIsland
    ? [riftTile, ...enemySpawnCandidates]
    : enemySpawnCandidates;
  const islandSeedSpawnTiles = spawnTileGroups
    .map((group) => {
      const isPlayerGroup = group.some((tile) => tile.id === "tile-0");
      const isRiftGroup = group.some((tile) => tile.id === riftTile.id);
      const candidates = group
        .filter((tile) => tile.id !== "tile-0")
        .filter((tile) => isRiftGroup || tile.id !== riftTile.id)
        .sort((a, b) =>
          isPlayerGroup
            ? getHexDistance(b, roomTiles[0]) - getHexDistance(a, roomTiles[0])
            : isRiftGroup
              ? getHexDistance(a, riftTile) - getHexDistance(b, riftTile)
              : getHexDistance(b, roomTiles[0]) - getHexDistance(a, roomTiles[0])
        );

      return candidates[0] || null;
    })
    .filter(Boolean);
  const tierOneEnemySpawnTiles = levelNode.zoneId === "parcel7"
    ? enemySpawnCandidates
    : [riftTile];
  const distributedEnemySpawnTiles = levelNode.tier === 1
    ? tierOneEnemySpawnTiles
    : [...new Map([...islandSeedSpawnTiles, ...enemySpawnTiles].map((tile) => [tile.id, tile])).values()];
  const activeEnemies = savedRoomState?.activeEnemies || roomConfig.enemyTypes.map((enemyType, index) => {
    const spawnTile = distributedEnemySpawnTiles[index] || enemySpawnTiles[index] || enemySpawnCandidates[0] || riftTile;
    const enemy = createEnemyInstance(enemyType, index, spawnTile.id, levelNode.tier);

    if (levelNode.tier === 1) {
      enemy.behavior = "stationary";
      enemy.stats.integrity = 1;
    } else if (levelNode.zoneId === "parcel7") {
      enemy.behavior = "hyperAggressive";
      enemy.stats.move = Math.max(1, enemy.stats.move || 1);
    }

    return enemy;
  });
  const levelCycleMaxTurns = Number.isFinite(savedRoomState?.levelCycleMaxTurns)
    ? savedRoomState.levelCycleMaxTurns
    : getLevelCycleMaxTurns(roomTiles.length, activeEnemies.length, riftThreadTileIds.length);
  let levelCycleRewardAwarded = Boolean(savedRoomState?.levelCycleRewardAwarded);
  let levelCompletionStatsRecorded = Boolean(savedRoomState?.levelCompletionStatsRecorded);
  let spawnedEnemyCount = savedRoomState?.spawnedEnemyCount || 0;
  let characterPositionId = savedRoomState?.characterPositionId || roomTiles[0].id;
  const exploredTileIds = new Set(savedRoomState?.exploredTileIds || getVisibleTileIds(roomTiles, characterPositionId));
  let isMoveMode = false;
  let isPhysicalTargetMode = false;
  let isBlinkTargetMode = false;
  let pendingPhysicalDamage = 0;
  let turnNumber = savedRoomState?.turnNumber || 1;
  let actionPointsRemaining = Number.isFinite(savedRoomState?.actionPointsRemaining) ? savedRoomState.actionPointsRemaining : character.stats.move;
  character.programCooldowns = savedRoomState?.programCooldowns || character.programCooldowns || {};
  character.nextTurnExecBonus = character.nextTurnExecBonus || 0;
  let programCooldowns = character.programCooldowns;
  let cooldownLockedProgramIds = new Set();
  character.levelLockedProgramIds = savedRoomState?.levelLockedProgramIds || [];
  let levelLockedProgramIds = new Set(character.levelLockedProgramIds);
  let temporaryExecutionBonusThisTurn = savedRoomState?.temporaryExecutionBonusThisTurn || character.nextTurnExecBonus;
  let executionRollsRemaining = Number.isFinite(savedRoomState?.executionRollsRemaining)
    ? savedRoomState.executionRollsRemaining
    : character.stats.exec + temporaryExecutionBonusThisTurn;
  if (!savedRoomState) {
    character.nextTurnExecBonus = 0;
  }
  cooldownLockedProgramIds = new Set(
    Object.entries(programCooldowns)
      .filter(([, remaining]) => remaining > 0)
      .map(([programId]) => programId)
  );
  if (!savedRoomState) {
    Object.entries(programCooldowns).forEach(([programId, remaining]) => {
      const nextRemaining = Math.max(0, remaining - 1);

      if (nextRemaining > 0) {
        programCooldowns[programId] = nextRemaining;
      } else {
        delete programCooldowns[programId];
      }
    });
  }
  let isLevelComplete = false;
  let isRunDefeated = false;
  let turnPhase = "player";
  let hasShownAllDerezzedNotice = activeEnemies.every((enemy) => !enemy.positionId || enemy.stats.integrity <= 0);

  app.innerHTML = `
    <section class="room-screen" aria-labelledby="room-title">
      <aside class="program-list" aria-label="Equipped programs">
        <div id="program-list-items">
          ${renderPrograms(character.programs, null, {
            cacheLimit: character.stats.cache,
            cooldownLockedProgramIds: getLockedProgramIds(),
            levelLockedProgramIds,
            cooldowns: programCooldowns,
          })}
        </div>
        <section class="runecast-panel inactive" id="runecast-panel" aria-label="Sigil-Casting dice">
          <header class="runecast-header">
            <p class="signal">Sigil-Casting</p>
            <span id="roll-status">${getExecutionStatusText(executionRollsRemaining)}</span>
          </header>
          <div class="runecast-dice-column">
            <div class="roll-options" id="roll-options"></div>
            <div class="roll-results" id="roll-results"></div>
          </div>
          <button class="primary-action roll-confirm" type="button" id="roll-confirm" disabled>Cast Sigils</button>
        </section>
      </aside>
      <aside class="enemy-info hidden" id="enemy-info" aria-live="polite">
        <p class="signal">Enemies</p>
        <div id="enemy-list"></div>
      </aside>
      <aside class="save-game-panel" aria-label="Save game">
        <button class="secondary-action save-game-action" type="button" id="save-game-action">Save Game</button>
      </aside>

      <header class="room-hud">
        <div>
          <p class="signal" id="room-meta">${levelNode.zoneName} / ${levelNode.label}</p>
          <h2 id="room-title">${levelNode.label}</h2>
        </div>
        ${renderCyclePanel(character.cycles, getLevelCycleReward(turnNumber, levelCycleMaxTurns), turnNumber, levelCycleMaxTurns)}
      </header>

      <section class="room-play-area" aria-label="Run map">
        <div class="map-player-info">
          ${renderRunCharacter(character)}
          ${renderArtifactStrip(character.artifacts || [])}
          ${renderCharacterStats(character.stats, temporaryExecutionBonusThisTurn + character.nextTurnExecBonus, character.temporaryActionBoostTurns > 0 ? character.temporaryActionBoostAmount || 1 : 0)}
          ${renderProgressionTracker(character.progression)}
          <p class="room-status-panel" id="room-status">Spend Actions to move or Sigil-Cast. Movement remains adjacent unless a program says otherwise.</p>
          ${renderThreadTracker(collectedThreadTileIds.length, riftThreadTileIds.length)}
        </div>

        <div class="room-stage" aria-label="Starting room with connected hex spaces">
          <div class="turn-phase-banner" id="turn-phase-banner" aria-live="polite">Player Turn</div>
          <div class="room-grid" id="room-grid" style="${getRoomGridStyle(roomTiles)}">
            ${renderRoomTiles(
              roomTiles,
              character,
              characterPositionId,
              activeEnemies,
              [],
              getVisibleTileIds(roomTiles, characterPositionId),
              [...exploredTileIds],
              [],
              riftThreadTileIds,
              collectedThreadTileIds,
              artifactTileIds,
              collectedArtifactTileIds,
              sigilPickups,
              collectedSigilTileIds,
              cycleDrops,
              wallEdges
            )}
          </div>
          <div class="room-hover-tooltip hidden" id="room-hover-tooltip" role="tooltip"></div>
        </div>
      </section>

      <footer class="room-footer">
        <div class="room-actions">
          <span class="room-actions-label">Actions:</span>
          <button class="primary-action move-action" type="button" id="move-action">Move</button>
          <button class="primary-action roll-action" type="button" id="roll-action">Sigil-Cast</button>
          <button class="primary-action room-utility-action" type="button" id="change-programs-action">Programs</button>
          <button class="primary-action room-utility-action" type="button" id="room-crafting-action">Crafting</button>
          <button class="primary-action turn-action" type="button" id="end-turn-action">End Turn</button>
        </div>
      </footer>

    </section>
  `;

  const roomStage = document.querySelector(".room-stage");
  const roomGrid = document.querySelector("#room-grid");
  const roomMeta = document.querySelector("#room-meta");
  const enemyInfo = document.querySelector("#enemy-info");
  const enemyList = document.querySelector("#enemy-list");
  const moveButton = document.querySelector("#move-action");
  const rollButton = document.querySelector("#roll-action");
  const endTurnButton = document.querySelector("#end-turn-action");
  const roomStatus = document.querySelector("#room-status");
  const turnPhaseBanner = document.querySelector("#turn-phase-banner");
  const programListItems = document.querySelector("#program-list-items");
  const runecastPanel = document.querySelector("#runecast-panel");
  const rollOptions = document.querySelector("#roll-options");
  const rollResults = document.querySelector("#roll-results");
  const rollStatus = document.querySelector("#roll-status");
  const rollConfirm = document.querySelector("#roll-confirm");
  const roomHoverTooltip = document.querySelector("#room-hover-tooltip");
  const changeProgramsButton = document.querySelector("#change-programs-action");
  const roomCraftingButton = document.querySelector("#room-crafting-action");
  const saveGameButton = document.querySelector("#save-game-action");
  const selectedRollSlots = [];
  let currentCastSymbols = null;
  let allocatedProgramSymbols = {};
  let isRunecastingActive = false;
  let isRolling = false;
  let cameraOffset = { x: 0, y: 0 };
  let dragState = null;
  let suppressTileClick = false;
  let pendingAttack = null;
  let pendingSymbolAssignment = null;
  let pendingBlinkTargetTileIds = [];
  let temporaryRevealTileIds = new Set(savedRoomState?.temporaryRevealTileIds || []);
  let sightRangeBonus = savedRoomState?.sightRangeBonus || 0;
  let sightRangeBonusTurnsRemaining = savedRoomState?.sightRangeBonusTurnsRemaining || 0;
  let phaseThroughEnemiesTurnsRemaining = savedRoomState?.phaseThroughEnemiesTurnsRemaining || 0;
  let phaseThroughWallsTurnsRemaining = savedRoomState?.phaseThroughWallsTurnsRemaining || 0;

  function getRoomDebugState() {
    return {
      nodeId: levelNode.id,
      tier: levelNode.tier,
      turnNumber,
      characterPositionId,
      actionPointsRemaining,
      executionRollsRemaining,
      nextTurnExecBonus: character.nextTurnExecBonus,
      programCooldowns: { ...programCooldowns },
      cooldownLockedProgramIds: [...cooldownLockedProgramIds],
      levelLockedProgramIds: [...levelLockedProgramIds],
      integrity: character.stats.integrity,
      maxIntegrity: character.stats.maxIntegrity,
      enemies: activeEnemies.map((enemy) => ({
        id: enemy.instanceId,
        type: enemy.id,
        positionId: enemy.positionId,
        integrity: enemy.stats.integrity,
        confusedTurns: enemy.confusedTurns || 0,
        stunnedTurns: enemy.stunnedTurns || 0,
        accuracySuppressedTurns: enemy.accuracySuppressedTurns || 0,
        proximityAttackedThisTurn: Boolean(enemy.proximityAttackedThisTurn),
      })),
      collectedThreads: collectedThreadTileIds.length,
      totalThreads: riftThreadTileIds.length,
      collectedCaches: collectedCacheTileIds.length,
      collectedArtifacts: collectedArtifactTileIds.length,
      collectedSigils: collectedSigilTileIds.length,
      cycles: character.cycles,
      cycleDrops: cloneSaveData(cycleDrops),
      wallCount: wallEdges.length,
      usedPowerHubs: usedPowerHubTileIds.length,
      levelCycleMaxTurns,
      levelCycleReward: getLevelCycleReward(turnNumber, levelCycleMaxTurns),
      levelCycleRewardAwarded,
      isMoveMode,
      isBlinkTargetMode,
      hasPendingAttack: Boolean(pendingAttack),
      temporaryRevealTileIds: [...temporaryRevealTileIds],
      sightRangeBonus,
      sightRangeBonusTurnsRemaining,
      phaseThroughEnemiesTurnsRemaining,
      phaseThroughWallsTurnsRemaining,
      pendingSymbolAssignment: pendingSymbolAssignment
        ? {
            programId: pendingSymbolAssignment.programId,
            candidateResultIndices: [...pendingSymbolAssignment.candidateResultIndices],
          }
        : null,
      isRunecastingActive,
      isLevelComplete,
      isRunDefeated,
      turnPhase,
    };
  }

  function buildCurrentSaveGame() {
    return {
      game: "Arcane Glitch",
      version: saveGameVersion,
      savedAt: new Date().toISOString(),
      character: cloneSaveData(character),
      currentRoom: {
        nodeId: levelNode.id,
        roomConfig: cloneSaveData(roomConfig),
        room: cloneSaveData(room),
        activeEnemies: cloneSaveData(activeEnemies),
        characterPositionId,
        exploredTileIds: [...exploredTileIds],
        collectedThreadTileIds: [...collectedThreadTileIds],
        collectedCacheTileIds: [...collectedCacheTileIds],
        collectedArtifactTileIds: [...collectedArtifactTileIds],
        collectedSigilTileIds: [...collectedSigilTileIds],
        usedPowerHubTileIds: [...usedPowerHubTileIds],
        cycleDrops: cloneSaveData(cycleDrops),
        levelCycleMaxTurns,
        levelCycleRewardAwarded,
        levelCompletionStatsRecorded,
        spawnedEnemyCount,
        turnNumber,
        actionPointsRemaining,
        executionRollsRemaining,
        temporaryExecutionBonusThisTurn,
        programCooldowns: { ...programCooldowns },
        levelLockedProgramIds: [...levelLockedProgramIds],
        temporaryRevealTileIds: [...temporaryRevealTileIds],
        sightRangeBonus,
        sightRangeBonusTurnsRemaining,
        phaseThroughEnemiesTurnsRemaining,
        phaseThroughWallsTurnsRemaining,
      },
    };
  }

  gameLog("room.start", {
    nodeId: levelNode.id,
    tier: levelNode.tier,
    tileCount: roomTiles.length,
    riftTileId: riftTile.id,
    threadTileIds: riftThreadTileIds,
    cacheTileIds,
    artifactTileIds,
    pipArtifactTileIds,
      sigilPickups,
      cycleDrops,
      wallCount: wallEdges.length,
    enemyTypes: roomConfig.enemyTypes,
    startState: getRoomDebugState(),
  });

  function clampCameraOffset(offset) {
    const stageWidth = roomStage.clientWidth;
    const stageHeight = roomStage.clientHeight;
    const gridWidth = roomGrid.offsetWidth;
    const gridHeight = roomGrid.offsetHeight;
    const sampleTile = roomGrid.querySelector(".room-tile");
    const tileWidth = sampleTile ? sampleTile.offsetWidth : 0;
    const tileHeight = sampleTile ? sampleTile.offsetHeight : 0;
    const tileHalfWidth = tileWidth / 2;
    const tileHalfHeight = tileHeight / 2;
    const minX = stageWidth / 2 - (gridWidth - tileHalfWidth);
    const minY = stageHeight / 2 - (gridHeight - tileHalfHeight);
    const maxX = stageWidth / 2 - tileHalfWidth;
    const maxY = stageHeight / 2 - tileHalfHeight;

    return {
      x: Math.min(maxX, Math.max(minX, offset.x)),
      y: Math.min(maxY, Math.max(minY, offset.y)),
    };
  }

  function centerCameraOnTile(tileId) {
    const tileElement = roomGrid.querySelector(`[data-tile-id="${tileId}"]`);

    if (!tileElement) {
      return;
    }

    const stageRect = roomStage.getBoundingClientRect();
    const tileRect = tileElement.getBoundingClientRect();
    const deltaX = stageRect.left + stageRect.width / 2 - (tileRect.left + tileRect.width / 2);
    const deltaY = stageRect.top + stageRect.height / 2 - (tileRect.top + tileRect.height / 2);

    cameraOffset = clampCameraOffset({
      x: cameraOffset.x + deltaX,
      y: cameraOffset.y + deltaY,
    });
  }

  function updateCamera() {
    cameraOffset = clampCameraOffset(cameraOffset);
    roomGrid.style.transform = `translate(${cameraOffset.x}px, ${cameraOffset.y}px)`;
  }

  function showDamageIndicator(tileId, amount, variant = "enemy") {
    const tileElement = roomGrid.querySelector(`[data-tile-id="${tileId}"]`);

    if (!tileElement) {
      return;
    }

    const indicator = document.createElement("span");
    indicator.className = `damage-indicator ${variant === "player" ? "player-damage" : "enemy-damage"}`;
    indicator.textContent = `-${amount}`;
    tileElement.appendChild(indicator);
    if (variant === "player" && amount > 0) {
      shakeCharacterToken();
    }
    window.setTimeout(() => indicator.remove(), 900);
  }

  function resolveIncomingPlayerAttacks(hitEnemies) {
    const rawIncomingDamage = hitEnemies.reduce((total, enemy) => total + (enemy.stats.power || 1), 0);

    if (character.damageShieldTurns > 0) {
      return {
        rawIncomingDamage,
        incomingDamage: 0,
        healedDamage: 0,
        invertedCount: 0,
        shielded: true,
      };
    }

    let incomingDamage = 0;
    let healedDamage = 0;
    let invertedCount = 0;

    hitEnemies.forEach((enemy) => {
      const attackDamage = enemy.stats.power || 1;

      if ((character.damageInversionCharges || 0) > 0) {
        character.damageInversionCharges = Math.max(0, (character.damageInversionCharges || 0) - 1);
        healedDamage += attackDamage;
        invertedCount += 1;
      } else {
        incomingDamage += attackDamage;
      }
    });

    if (healedDamage > 0) {
      character.stats.integrity = Math.min(character.stats.maxIntegrity, character.stats.integrity + healedDamage);
    }

    if (incomingDamage > 0) {
      character.stats.integrity = Math.max(0, character.stats.integrity - incomingDamage);
    }

    return {
      rawIncomingDamage,
      incomingDamage,
      healedDamage,
      invertedCount,
      shielded: false,
    };
  }

  function resolveProgramEnemyDamage(enemy, rawDamage, defenseStat, options = {}) {
    const enemyIntegrityBefore = enemy.stats.integrity;
    const tileId = enemy.positionId;
    const dealtDamage = options.ignoreDefense ? Math.max(0, rawDamage) : Math.max(0, rawDamage - (enemy.stats[defenseStat] || 0));
    let didLevelUp = false;

    enemy.stats.integrity = Math.max(0, enemy.stats.integrity - dealtDamage);

    if (enemyIntegrityBefore > 0 && enemy.stats.integrity <= 0) {
      didLevelUp = addCharacterXp(character, enemy.xpValue);
      recordEnemyKill(enemy);
      maybeDropCycles(enemy.positionId, enemy);
      enemy.positionId = null;
      enemy.stunnedTurns = 0;
      enemy.proximityAttackedThisTurn = false;
    }

    return {
      enemy,
      tileId,
      dealtDamage,
      didDefeat: enemyIntegrityBefore > 0 && enemy.stats.integrity <= 0,
      didLevelUp,
    };
  }

  function resolveMultiEnemyProgramDamage(targetEnemies, getRawDamage, defenseStat, options = {}) {
    return targetEnemies.map((enemy) => resolveProgramEnemyDamage(enemy, getRawDamage(enemy), defenseStat, options));
  }

  function shakeCharacterToken() {
    const token = roomGrid.querySelector(".character-token");

    if (!token) {
      return;
    }

    token.classList.remove("damage-shake");
    void token.offsetWidth;
    token.classList.add("damage-shake");
    window.setTimeout(() => token.classList.remove("damage-shake"), 360);
  }

  function showCyclePipIndicator(slotIndex, amount = 10) {
    const rollResult = rollResults.querySelector(`[data-result-index="${slotIndex}"]`);

    if (!rollResult) {
      return;
    }

    const indicator = document.createElement("span");
    indicator.className = "damage-indicator cycle-pip-indicator";
    indicator.textContent = `+${amount}`;
    rollResult.appendChild(indicator);
    window.setTimeout(() => indicator.remove(), 900);
  }

  function showCyclePipIndicators(results, rolledSlotIndices) {
    results.forEach((result, resultIndex) => {
      const amount = (result.pips || []).filter((pip) => pip.type === "cycles").length * 10;

      if (amount > 0) {
        showCyclePipIndicator(rolledSlotIndices[resultIndex], amount);
      }
    });
  }

  function recordEnemyKill(enemy) {
    if (!enemy || enemy.killCounted) {
      return;
    }

    enemy.killCounted = true;
    ensureRunStats(character).enemiesKilled += 1;
  }

  function getRunDeathStats() {
    const stats = ensureRunStats(character);

    return {
      enemiesKilled: stats.enemiesKilled,
      riftsClosed: stats.riftsClosed,
      turnsTaken: stats.turnsTaken + (levelCompletionStatsRecorded ? 0 : turnNumber),
    };
  }

  function animateRiftGhoulBolt(enemy) {
    const enemyToken = roomGrid.querySelector(`[data-enemy-id="${enemy.instanceId}"]`);
    const characterToken = roomGrid.querySelector(".character-token");

    if (!enemyToken || !characterToken) {
      return Promise.resolve();
    }

    const stageRect = roomStage.getBoundingClientRect();
    const enemyRect = enemyToken.getBoundingClientRect();
    const characterRect = characterToken.getBoundingClientRect();
    const startX = enemyRect.left + enemyRect.width / 2 - stageRect.left;
    const startY = enemyRect.top + enemyRect.height / 2 - stageRect.top;
    const endX = characterRect.left + characterRect.width / 2 - stageRect.left;
    const endY = characterRect.top + characterRect.height / 2 - stageRect.top;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const bolt = document.createElement("span");

    bolt.className = "rift-ghoul-bolt";
    bolt.style.left = `${startX}px`;
    bolt.style.top = `${startY}px`;
    bolt.style.width = `${Math.hypot(deltaX, deltaY)}px`;
    bolt.style.setProperty("--bolt-angle", `${Math.atan2(deltaY, deltaX)}rad`);
    roomStage.appendChild(bolt);

    const animation = bolt.animate(
      [
        { opacity: 0, transform: "rotate(var(--bolt-angle)) scaleX(0.15)" },
        { opacity: 1, transform: "rotate(var(--bolt-angle)) scaleX(1)" },
        { opacity: 0, transform: "rotate(var(--bolt-angle)) scaleX(0.92)" },
      ],
      { duration: 360, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );

    return animation.finished
      .catch(() => null)
      .finally(() => bolt.remove());
  }

  function resolveProximityEnemyAttacks() {
    getLivingEnemies()
      .filter((enemy) => enemy.proximityAttack)
      .forEach((enemy) => {
        if (!isEnemyAdjacentToPlayer(roomTiles, enemy, characterPositionId, wallEdges)) {
          enemy.proximityAttackedThisTurn = false;
        }
      });

    const proximityEnemies = getLivingEnemies().filter(
      (enemy) =>
        enemy.proximityAttack &&
        !enemy.proximityAttackedThisTurn &&
        isEnemyAdjacentToPlayer(roomTiles, enemy, characterPositionId, wallEdges)
    );

    if (!proximityEnemies.length) {
      return null;
    }

    proximityEnemies.forEach((enemy) => {
      enemy.proximityAttackedThisTurn = true;
    });

    const attackResults = proximityEnemies.map((enemy) => ({
      enemy,
      didHit: Math.random() < (enemy.stats.accuracy ?? 0.75),
    }));
    const hitResults = attackResults.filter((result) => result.didHit);
    const missedResults = attackResults.filter((result) => !result.didHit);
    const damageResult = resolveIncomingPlayerAttacks(hitResults.map((result) => result.enemy));
    const { rawIncomingDamage, incomingDamage, healedDamage, invertedCount } = damageResult;

    const statusParts = [];

    if (hitResults.length) {
      statusParts.push(
        damageResult.shielded
          ? `${hitResults.map((result) => result.enemy.name).join(", ")} hit, but Mag Shield blocks ${rawIncomingDamage} damage.`
          : invertedCount > 0
          ? `${invertedCount} incoming ${invertedCount === 1 ? "attack heals" : "attacks heal"} ${healedDamage} Integrity. ${incomingDamage > 0 ? `${incomingDamage} damage gets through.` : ""}`
          : `${hitResults.map((result) => result.enemy.name).join(", ")} hit for ${incomingDamage} Integrity.`
      );
    }

    if (missedResults.length) {
      statusParts.push(`${missedResults.map((result) => result.enemy.name).join(", ")} missed.`);
    }

    gameLog("enemy.proximityAttack", {
      attackers: proximityEnemies.map((enemy) => enemy.instanceId),
      hits: hitResults.map((result) => result.enemy.instanceId),
      misses: missedResults.map((result) => result.enemy.instanceId),
      incomingDamage,
      rawIncomingDamage,
      state: getRoomDebugState(),
    });

    return {
      incomingDamage,
      status: statusParts.join(" "),
    };
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function renderCondensedEnemyTooltip(enemy) {
    return `
      <strong>${enemy.name}</strong>
      <dl class="room-hover-stats">
        <div><dt>Integrity</dt><dd>${enemy.stats.integrity}</dd></div>
        <div><dt>PD</dt><dd>${enemy.stats.physicalDefense}</dd></div>
        <div><dt>AD</dt><dd>${enemy.stats.arcaneDefense}</dd></div>
        <div><dt>Power</dt><dd>${enemy.stats.power}</dd></div>
        <div><dt>Accuracy</dt><dd>${Math.round((enemy.stats.accuracy ?? 0.4) * 100)}%</dd></div>
        <div><dt>XP</dt><dd>${enemy.xpValue}</dd></div>
      </dl>
    `;
  }

  function getSpecialTileTooltip(tile) {
    if (!tile) {
      return null;
    }

    if (tile.type === "cache") {
      return {
        title: "Cache Node",
        body: collectedCacheTileIds.includes(tile.id)
          ? "Accessed. Program cache already downloaded."
          : "Access to add a new program to your library.",
      };
    }

    if (tile.type === "rift") {
      return {
        title: "Rift Hex",
        body: "Can be closed after collecting all Rift Threads.",
      };
    }

    if (tile.type === "powerHub") {
      return {
        title: "Power Hub",
        body: "Restores 2 Integrity when entered, then powers down.",
      };
    }

    if (tile.type === "powerHubOff") {
      return {
        title: "Power Hub",
        body: "Depleted. This hub has already restored Integrity.",
      };
    }

    if (tile.type === "haven") {
      return {
        title: "Haven",
        body: "Blocks enemy attacks for one enemy turn while you stand here.",
      };
    }

    if (tile.type === "havenInactive") {
      return {
        title: "Haven",
        body: "Deactivated. Its protection has already been spent.",
      };
    }

    return null;
  }

  function positionRoomHoverTooltip(event) {
    const stageRect = roomStage.getBoundingClientRect();
    const tooltipRect = roomHoverTooltip.getBoundingClientRect();
    const left = Math.min(stageRect.width - tooltipRect.width - 12, Math.max(12, event.clientX - stageRect.left + 16));
    const top = Math.min(stageRect.height - tooltipRect.height - 12, Math.max(12, event.clientY - stageRect.top + 16));

    roomHoverTooltip.style.left = `${left}px`;
    roomHoverTooltip.style.top = `${top}px`;
  }

  function hideRoomHoverTooltip() {
    roomHoverTooltip.classList.add("hidden");
  }

  function updateRoomHoverTooltip(event) {
    const enemyToken = event.target.closest(".glitchspawn-token");

    if (enemyToken) {
      const enemy = activeEnemies.find((item) => item.instanceId === enemyToken.dataset.enemyId);

      if (enemy) {
        roomHoverTooltip.innerHTML = renderCondensedEnemyTooltip(enemy);
        roomHoverTooltip.classList.remove("hidden", "tile-hover");
        roomHoverTooltip.classList.add("enemy-hover");
        positionRoomHoverTooltip(event);
        return;
      }
    }

    const tileButton = event.target.closest("[data-tile-id]");
    const tile = tileButton ? roomTiles.find((item) => item.id === tileButton.dataset.tileId) : null;
    const tileInfo = tileButton?.classList.contains("visible") ? getSpecialTileTooltip(tile) : null;

    if (tileInfo) {
      roomHoverTooltip.innerHTML = `<strong>${tileInfo.title}</strong><p>${tileInfo.body}</p>`;
      roomHoverTooltip.classList.remove("hidden", "enemy-hover");
      roomHoverTooltip.classList.add("tile-hover");
      positionRoomHoverTooltip(event);
      return;
    }

    hideRoomHoverTooltip();
  }

  function captureEnemyTokenRects() {
    return new Map(
      [...roomGrid.querySelectorAll(".glitchspawn-token")].map((token) => [
        token.dataset.enemyId,
        token.getBoundingClientRect(),
      ])
    );
  }

  function captureCharacterTokenRect() {
    return roomGrid.querySelector(".character-token")?.getBoundingClientRect() || null;
  }

  function estimateCharacterTokenRectForTile(tileId, tokenRect) {
    const tileElement = roomGrid.querySelector(`[data-tile-id="${tileId}"]`);

    if (!tileElement || !tokenRect) {
      return null;
    }

    const tileRect = tileElement.getBoundingClientRect();

    return {
      left: tileRect.left + tileRect.width / 2 - tokenRect.width / 2,
      top: tileRect.top + tileRect.height / 2 - tokenRect.height * 0.54,
    };
  }

  function animateCharacterMovement(previousRect, pathTileIds = []) {
    const token = roomGrid.querySelector(".character-token");

    if (!token || !previousRect) {
      return Promise.resolve();
    }

    const currentRect = token.getBoundingClientRect();
    const waypointRects = pathTileIds
      .slice(0, -1)
      .map((tileId) => estimateCharacterTokenRectForTile(tileId, currentRect))
      .filter(Boolean);
    const travelRects = [previousRect, ...waypointRects, currentRect];

    if (travelRects.every((rect) => Math.abs(rect.left - currentRect.left) < 1 && Math.abs(rect.top - currentRect.top) < 1)) {
      return Promise.resolve();
    }

    const keyframes = travelRects.map((rect) => ({
      transform: `translate(calc(-50% + ${rect.left - currentRect.left}px), calc(-54% + ${rect.top - currentRect.top}px))`,
    }));
    keyframes[keyframes.length - 1] = { transform: "translate(-50%, -54%)" };

    return token.animate(
      keyframes,
      {
        duration: Math.min(760, Math.max(300, 150 * Math.max(1, travelRects.length - 1))),
        easing: "cubic-bezier(0.22, 0.8, 0.24, 1)",
      }
    ).finished.catch(() => null);
  }

  function animateEnemyMovement(previousRects) {
    const animations = [...roomGrid.querySelectorAll(".glitchspawn-token")]
      .map((token) => {
        const previousRect = previousRects.get(token.dataset.enemyId);

        if (!previousRect) {
          return null;
        }

        const currentRect = token.getBoundingClientRect();
        const deltaX = previousRect.left - currentRect.left;
        const deltaY = previousRect.top - currentRect.top;

        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
          return null;
        }

        return token.animate(
          [
            { transform: `translate(calc(-50% + ${deltaX}px), calc(-52% + ${deltaY}px))` },
            { transform: "translate(-50%, -52%)" },
          ],
          {
            duration: 420,
            easing: "cubic-bezier(0.22, 0.8, 0.24, 1)",
          }
        ).finished.catch(() => null);
      })
      .filter(Boolean);

    return animations.length ? Promise.all(animations) : Promise.resolve();
  }

  function showRunDeathPopup(sourceText = "Integrity depleted.") {
    if (document.querySelector(".run-death-overlay")) {
      return;
    }

    turnPhase = "defeat";
    isMoveMode = false;
    isPhysicalTargetMode = false;
    isBlinkTargetMode = false;
    pendingPhysicalDamage = 0;
    pendingAttack = null;
    pendingSymbolAssignment = null;
    isRunDefeated = true;
    roomStage.classList.remove("movement-active", "dragging");
    deactivateRunecasting();
    updateRoom();
    const runDeathStats = getRunDeathStats();

    const overlay = document.createElement("div");
    overlay.className = "run-death-overlay";
    overlay.innerHTML = `
      <section class="run-death-panel" role="dialog" aria-modal="true" aria-labelledby="run-death-title">
        <p class="signal">Signal Lost</p>
        <h2 id="run-death-title">Sigilant Derezzed</h2>
        <p>${sourceText}</p>
        <dl class="run-death-stats" aria-label="Run summary">
          <div><dt>Enemies Killed</dt><dd>${runDeathStats.enemiesKilled}</dd></div>
          <div><dt>Rifts Closed</dt><dd>${runDeathStats.riftsClosed}</dd></div>
          <div><dt>Total Turns</dt><dd>${runDeathStats.turnsTaken}</dd></div>
        </dl>
        <button class="primary-action" type="button" id="return-main-menu">Return to Main Menu</button>
      </section>
    `;

    document.querySelector(".room-screen").appendChild(overlay);
    overlay.querySelector("#return-main-menu").focus();
    overlay.querySelector("#return-main-menu").addEventListener("click", () => window.location.reload());
    gameLog("run.defeat", getRoomDebugState());
  }

  function hasLivingEnemies() {
    return activeEnemies.some((enemy) => enemy.positionId && enemy.stats.integrity > 0);
  }

  function getLivingEnemies() {
    return activeEnemies.filter((enemy) => enemy.positionId && enemy.stats.integrity > 0);
  }

  function getOpenAdjacentSpawnTiles(sourceTileId) {
    const sourceTile = roomTiles.find((tile) => tile.id === sourceTileId);
    const occupiedTileIds = new Set([...getOccupiedEnemyTileIds(activeEnemies), characterPositionId].filter(Boolean));

    if (!sourceTile) {
      return [];
    }

    return roomTiles.filter(
      (tile) =>
        !occupiedTileIds.has(tile.id) &&
        getHexDistance(sourceTile, tile) === 1 &&
        !hasWallBetweenTiles(wallEdges, sourceTile, tile)
    );
  }

  function resolveEnemySpawns() {
    const spawnedEnemies = [];

    getLivingEnemies().forEach((enemy) => {
      if (!enemy.spawnType || Math.random() >= (enemy.spawnChance || 0)) {
        return;
      }

      const spawnTiles = getOpenAdjacentSpawnTiles(enemy.positionId);
      const spawnTile = spawnTiles[Math.floor(Math.random() * spawnTiles.length)];

      if (!spawnTile) {
        return;
      }

      spawnedEnemyCount += 1;
      const spawnedEnemy = createEnemyInstance(
        enemy.spawnType,
        activeEnemies.length + spawnedEnemyCount,
        spawnTile.id,
        levelNode.tier
      );

      activeEnemies.push(spawnedEnemy);
      spawnedEnemies.push(spawnedEnemy);
    });

    return spawnedEnemies;
  }

  function isRoomSecured() {
    return !hasLivingEnemies();
  }

  function showAllDerezzedNotice() {
    if (hasShownAllDerezzedNotice || isLevelComplete || isRunDefeated || hasLivingEnemies()) {
      return;
    }

    hasShownAllDerezzedNotice = true;
    isMoveMode = false;
    isPhysicalTargetMode = false;
    isBlinkTargetMode = false;
    pendingPhysicalDamage = 0;
    pendingAttack = null;
    pendingSymbolAssignment = null;
    roomStage.classList.remove("movement-active", "dragging");
    updateRoom({ centerCamera: false });

    const overlay = document.createElement("div");
    overlay.className = "all-derezzed-overlay";
    overlay.innerHTML = `
      <section class="all-derezzed-panel" role="dialog" aria-modal="true" aria-labelledby="all-derezzed-title">
        <p class="signal">Area Secured</p>
        <h2 id="all-derezzed-title">All Glitchspawn Derezzed</h2>
        <p>Enemy turns are skipped while you finish the room objective. Movement still costs Actions.</p>
        <button class="primary-action" type="button" id="continue-secured-room">Continue</button>
      </section>
    `;

    document.querySelector(".room-screen").appendChild(overlay);
    overlay.querySelector("#continue-secured-room").focus();
    overlay.querySelector("#continue-secured-room").addEventListener("click", () => {
      overlay.remove();
      isMoveMode = actionPointsRemaining > 0;
      roomStage.classList.toggle("movement-active", isMoveMode);
      updateRoom({ centerCamera: false });
      roomStatus.textContent = actionPointsRemaining > 0
        ? "All Glitchspawn derezzed. Enemy turns are skipped. Movement still costs Actions."
        : "All Glitchspawn derezzed. Enemy turns are skipped. Actions spent for this turn.";
    });
    gameLog("room.allEnemiesDerezzed", getRoomDebugState());
  }

  function beginPlayerTurn() {
    getLivingEnemies().forEach((enemy) => {
      enemy.proximityAttackedThisTurn = false;
    });

    cooldownLockedProgramIds = new Set(
      Object.entries(programCooldowns)
        .filter(([, remaining]) => remaining > 0)
        .map(([programId]) => programId)
    );

    Object.entries(programCooldowns).forEach(([programId, remaining]) => {
      const nextRemaining = Math.max(0, remaining - 1);

      if (nextRemaining > 0) {
        programCooldowns[programId] = nextRemaining;
      } else {
        delete programCooldowns[programId];
      }
    });

    const recurringExecBonus = character.temporaryExecutionBoostTurns > 0 ? character.temporaryExecutionBoostAmount || 1 : 0;
    const execBonus = (character.nextTurnExecBonus || 0) + recurringExecBonus;
    temporaryExecutionBonusThisTurn = execBonus;
    const actionBoostAmount = character.temporaryActionBoostTurns > 0 ? character.temporaryActionBoostAmount || 1 : 0;
    actionPointsRemaining = character.stats.move + actionBoostAmount;
    executionRollsRemaining = character.stats.exec + temporaryExecutionBonusThisTurn;
    character.nextTurnExecBonus = 0;
    if (character.temporaryExecutionBoostTurns > 0) {
      character.temporaryExecutionBoostTurns -= 1;
    }
    if (character.temporaryActionBoostTurns > 0) {
      character.temporaryActionBoostTurns -= 1;
    }
    if (character.damageShieldTurns > 0) {
      character.damageShieldTurns -= 1;
    }
    if (character.moveActionRangeBonusTurns > 0) {
      character.moveActionRangeBonusTurns -= 1;
    }
    return execBonus;
  }

  function getMoveActionStepValue() {
    return 1 + (character.moveActionRangeBonusTurns > 0 ? character.moveActionRangeBonusAmount || 1 : 0);
  }

  function startProgramCooldown(program) {
    if (program.oncePerLevel || program.cooldown === null || program.cooldown === "-") {
      levelLockedProgramIds.add(program.id);
      character.levelLockedProgramIds = [...levelLockedProgramIds];
      return;
    }

    const cooldown = Number.isFinite(program.cooldown) ? program.cooldown : 0;

    if (cooldown <= 0) {
      return;
    }

    programCooldowns[program.id] = Math.max(programCooldowns[program.id] || 0, cooldown);
    cooldownLockedProgramIds.add(program.id);
  }

  function getLockedProgramIds() {
    return new Set([...cooldownLockedProgramIds, ...levelLockedProgramIds]);
  }

  function markProgramAllocated(programId, program, allocatedSymbols) {
    currentCastSymbols = markSymbolsSpent(currentCastSymbols, allocatedSymbols);
    consumeAllocatedGlyphs(allocatedSymbols);
    allocatedProgramSymbols = {
      ...allocatedProgramSymbols,
      [programId]: [...(allocatedProgramSymbols[programId] || []), ...allocatedSymbols],
    };
    startProgramCooldown(program);
  }

  function consumeAllocatedGlyphs(allocatedSymbols) {
    allocatedSymbols
      .filter((symbol) => symbol.artifactInstanceId)
      .forEach((symbol) => {
        const glyph = (character.artifacts || []).find((artifact) => (artifact.instanceId || artifact.id) === symbol.artifactInstanceId);

        if (glyph) {
          consumeArtifactUse(glyph);
        }
      });
  }

  function maybeDropCycles(tileId, enemy) {
    if (!tileId || Math.random() >= 0.45) {
      return null;
    }

    const amount = rollCycleDropAmount();
    const existingDrop = cycleDrops.find((drop) => drop.tileId === tileId);

    if (existingDrop) {
      existingDrop.amount += amount;
      return existingDrop;
    }

    const drop = {
      id: `cycles-${enemy?.instanceId || Date.now()}-${Math.random().toString(16).slice(2)}`,
      tileId,
      amount,
    };

    cycleDrops.push(drop);
    return drop;
  }

  function dealEnemyIntegrityDamage(enemy, rawDamage, defenseStat) {
    if (!enemy || enemy.stats.integrity <= 0) {
      return {
        dealtDamage: 0,
        enemyIntegrityBeforeDamage: enemy?.stats?.integrity || 0,
        didDefeat: false,
        cycleDrop: null,
        didLevelUp: false,
      };
    }

    const enemyIntegrityBeforeDamage = enemy.stats.integrity;
    const defeatedTileId = enemy.positionId;
    const dealtDamage = Math.max(0, rawDamage - (enemy.stats[defenseStat] || 0));
    enemy.stats.integrity = Math.max(0, enemy.stats.integrity - dealtDamage);
    let didLevelUp = false;
    let cycleDrop = null;

    if (enemyIntegrityBeforeDamage > 0 && enemy.stats.integrity <= 0) {
      didLevelUp = addCharacterXp(character, enemy.xpValue);
      recordEnemyKill(enemy);
      cycleDrop = maybeDropCycles(defeatedTileId, enemy);
      enemy.positionId = null;
      enemy.confusedTurns = 0;
      enemy.stunnedTurns = 0;
      enemy.proximityAttackedThisTurn = false;
    }

    return {
      dealtDamage,
      enemyIntegrityBeforeDamage,
      didDefeat: enemyIntegrityBeforeDamage > 0 && enemy.stats.integrity <= 0,
      cycleDrop,
      didLevelUp,
    };
  }

  function getAdjacentAllDamageEntries(effect) {
    if (Array.isArray(effect.damageEntries) && effect.damageEntries.length) {
      return effect.damageEntries.map((entry) => ({
        amount: Number.isFinite(entry.amount) ? entry.amount : 1,
        defenseStat: entry.damageType === "arcane" ? "arcaneDefense" : "physicalDefense",
        damageType: entry.damageType === "arcane" ? "arcane" : "physical",
      }));
    }

    return [
      {
        amount: Number.isFinite(effect.amount) ? effect.amount : 1,
        defenseStat: effect.damageType === "arcane" ? "arcaneDefense" : "physicalDefense",
        damageType: effect.damageType === "arcane" ? "arcane" : "physical",
      },
    ];
  }

  function getPlayerWallEdges() {
    return phaseThroughWallsTurnsRemaining > 0 ? [] : wallEdges;
  }

  function getEnemyAttackAccuracy(enemy) {
    return enemy.accuracySuppressedTurns > 0 ? 0 : enemy.stats.accuracy ?? 0.4;
  }

  function updateRoom(options = {}) {
    hideRoomHoverTooltip();
    const shouldCenterCamera = options.centerCamera !== false;
    const isPlayerPhase = turnPhase === "player";
    const securedRoom = isRoomSecured();
    const canMove = actionPointsRemaining > 0;
    const canUseActionUtility = isPlayerPhase && !isLevelComplete && !isRunDefeated && !isRunecastingActive && !pendingAttack && !isBlinkTargetMode && actionPointsRemaining > 0;
    const movementRange = actionPointsRemaining * getMoveActionStepValue();
    const occupiedEnemyTileIds = getOccupiedEnemyTileIds(activeEnemies);
    const movementBlockedTileIds = phaseThroughEnemiesTurnsRemaining > 0 ? [] : occupiedEnemyTileIds;
    const playerWallEdges = getPlayerWallEdges();
    const reachableTileIds = isPlayerPhase && isMoveMode && canMove
      ? getReachableTileIds(roomTiles, characterPositionId, movementRange, movementBlockedTileIds, playerWallEdges)
          .filter((tileId) => !occupiedEnemyTileIds.includes(tileId))
      : [];
    const blinkTargetTileIds = isBlinkTargetMode ? pendingBlinkTargetTileIds : [];
    const attackPreviewTileIds = pendingAttack?.revealTarget ? pendingAttack.targetTileIds || [] : [];
    const previewTileIds = [...attackPreviewTileIds, ...temporaryRevealTileIds];
    const naturalVisibleTileIds = getVisibleTileIds(roomTiles, characterPositionId, baseSightRange + sightRangeBonus);
    naturalVisibleTileIds.forEach((tileId) => exploredTileIds.add(tileId));
    const visibleTileIds = [...new Set([...naturalVisibleTileIds, ...previewTileIds])];
    const targetableEnemyTileIds = pendingAttack
      ? pendingAttack.targetTileIds || getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges)
      : [];
    const visibleEnemies = activeEnemies.filter(
      (enemy) => enemy.positionId && enemy.stats.integrity > 0 && visibleTileIds.includes(enemy.positionId)
    );

    roomGrid.innerHTML = renderRoomTiles(
      roomTiles,
      character,
      characterPositionId,
      activeEnemies,
      [...new Set([...reachableTileIds, ...blinkTargetTileIds, ...attackPreviewTileIds])],
      visibleTileIds,
      [...exploredTileIds],
      targetableEnemyTileIds,
      riftThreadTileIds,
      collectedThreadTileIds,
      allArtifactTileIds,
      collectedArtifactTileIds,
      sigilPickups,
      collectedSigilTileIds,
      cycleDrops,
      wallEdges
    );
    enemyInfo.classList.toggle("hidden", !visibleEnemies.length);
    enemyList.innerHTML = visibleEnemies.map(renderEnemyInfo).join("");
    document.querySelector(".artifact-strip").outerHTML = renderArtifactStrip(character.artifacts || [], pendingSymbolAssignment);
    document.querySelector("#character-stats").outerHTML = renderCharacterStats(
      character.stats,
      temporaryExecutionBonusThisTurn + character.nextTurnExecBonus,
      character.temporaryActionBoostTurns > 0 ? character.temporaryActionBoostAmount || 1 : 0
    );
    document.querySelector(".progression-tracker").outerHTML = renderProgressionTracker(character.progression);
    document.querySelector(".cycle-panel").outerHTML = renderCyclePanel(
      character.cycles,
      getLevelCycleReward(turnNumber, levelCycleMaxTurns),
      turnNumber,
      levelCycleMaxTurns
    );
    document.querySelector(".thread-tracker").outerHTML = renderThreadTracker(collectedThreadTileIds.length, riftThreadTileIds.length);
    moveButton.disabled = !isPlayerPhase || !canMove;
    moveButton.textContent = actionPointsRemaining > 0 ? `Move (${actionPointsRemaining})` : "Actions Spent";
    const canStartFreshCast = canStartFreshRunecastingAction();
    rollButton.disabled = !canStartFreshCast;
    rollButton.textContent = isRunecastingActive && !canStartFreshCast
      ? "Sigil-Casting"
      : actionPointsRemaining > 0
        ? `Sigil-Cast (${actionPointsRemaining})`
        : "Actions Spent";
    changeProgramsButton.disabled = !canUseActionUtility;
    changeProgramsButton.textContent = actionPointsRemaining > 0 ? `Programs (${actionPointsRemaining})` : "Actions Spent";
    roomCraftingButton.disabled = !canUseActionUtility;
    roomCraftingButton.textContent = actionPointsRemaining > 0 ? `Crafting (${actionPointsRemaining})` : "Actions Spent";
    endTurnButton.disabled = !isPlayerPhase || isLevelComplete || isRunDefeated;
    rollConfirm.disabled = rollConfirm.disabled || !isPlayerPhase;
    turnPhaseBanner.textContent = isPlayerPhase ? "Player Turn" : "Glitchspawn Turn";
    turnPhaseBanner.classList.toggle("glitch-phase", !isPlayerPhase);
    document.querySelector(".room-footer").classList.toggle("glitch-phase-active", !isPlayerPhase);
    roomMeta.textContent = `${levelNode.zoneName} / ${levelNode.label}`;

    if (isRunDefeated) {
      roomStatus.textContent = "Integrity depleted. Run terminated.";
      moveButton.disabled = true;
      rollButton.disabled = true;
      changeProgramsButton.disabled = true;
      roomCraftingButton.disabled = true;
      endTurnButton.disabled = true;
    } else if (isLevelComplete) {
      roomStatus.textContent = "Rift closed. Level complete.";
      moveButton.disabled = true;
      moveButton.textContent = "Level Complete";
      changeProgramsButton.disabled = true;
      roomCraftingButton.disabled = true;
    } else if (securedRoom && isMoveMode) {
      roomStatus.textContent = `All Glitchspawn derezzed. Choose a highlighted hex. ${actionPointsRemaining} ${actionPointsRemaining === 1 ? "action" : "actions"} remaining this turn.`;
    } else if (securedRoom) {
      roomStatus.textContent = actionPointsRemaining > 0
        ? "All Glitchspawn derezzed. Enemy turns are skipped. Movement still costs Actions."
        : "All Glitchspawn derezzed. Enemy turns are skipped. Actions spent for this turn.";
    } else if (isBlinkTargetMode) {
      roomStatus.textContent = "Choose a highlighted hex exactly 2 spaces away in a straight line.";
    } else if (pendingAttack) {
      roomStatus.textContent = pendingAttack.prompt || `Choose an adjacent enemy to deal ${pendingAttack.damage} ${pendingAttack.damageType} damage.`;
    } else if (isMoveMode) {
      roomStatus.textContent = `Choose a highlighted hex. ${actionPointsRemaining} ${actionPointsRemaining === 1 ? "action" : "actions"} remaining this turn.`;
    } else if (actionPointsRemaining <= 0) {
      roomStatus.textContent = "Actions spent for this turn.";
    } else {
      roomStatus.textContent = `${actionPointsRemaining} ${actionPointsRemaining === 1 ? "action" : "actions"} available. Nearby hexes are illuminated.`;
    }

    if (shouldCenterCamera) {
      centerCameraOnTile(characterPositionId);
    }
    updateCamera();
  }

  moveButton.addEventListener("click", () => {
    if (turnPhase !== "player" || actionPointsRemaining <= 0 || isLevelComplete || isRunDefeated) {
      return;
    }

    isMoveMode = !isMoveMode;
    isPhysicalTargetMode = false;
    isBlinkTargetMode = false;
    pendingPhysicalDamage = 0;
    pendingSymbolAssignment = null;
    suppressTileClick = false;
    dragState = null;
    roomStage.classList.toggle("movement-active", isMoveMode);
    roomStage.classList.remove("dragging");
    updateRoom();
  });

  function clearMovementPreview() {
    roomGrid.querySelectorAll(".movement-route, .movement-destination").forEach((tile) => {
      tile.classList.remove("movement-route", "movement-destination");
    });
  }

  function previewMovementPath(targetTileId) {
    clearMovementPreview();

    if (!isMoveMode || turnPhase !== "player" || isLevelComplete || isRunDefeated) {
      return;
    }

    const movementRange = actionPointsRemaining * getMoveActionStepValue();
    const occupiedEnemyTileIds = getOccupiedEnemyTileIds(activeEnemies);

    if (occupiedEnemyTileIds.includes(targetTileId)) {
      return;
    }

    const path = getMovementPathToTile(
      roomTiles,
      characterPositionId,
      targetTileId,
      movementRange,
      phaseThroughEnemiesTurnsRemaining > 0 ? [] : occupiedEnemyTileIds,
      getPlayerWallEdges()
    );

    if (!path.length) {
      return;
    }

    path.forEach((tileId, index) => {
      const tileButton = roomGrid.querySelector(`[data-tile-id="${tileId}"]`);

      if (!tileButton) {
        return;
      }

      tileButton.classList.add(index === path.length - 1 ? "movement-destination" : "movement-route");
    });
  }

  roomGrid.addEventListener("mouseover", (event) => {
    const tileButton = event.target.closest("[data-tile-id]");

    if (!tileButton || !roomGrid.contains(tileButton)) {
      return;
    }

    previewMovementPath(tileButton.dataset.tileId);
  });

  roomGrid.addEventListener("mousemove", updateRoomHoverTooltip);
  roomGrid.addEventListener("mouseleave", () => {
    clearMovementPreview();
    hideRoomHoverTooltip();
  });

  roomStage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isMoveMode || turnPhase !== "player") {
      return;
    }

    if ((isPhysicalTargetMode && event.target.closest(".targetable-enemy")) || (isBlinkTargetMode && event.target.closest(".reachable"))) {
      return;
    }

    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cameraOffset.x,
      originY: cameraOffset.y,
      moved: false,
    };

    roomStage.setPointerCapture(event.pointerId);
    roomStage.classList.add("dragging");
  });

  roomStage.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (!dragState.moved && Math.hypot(deltaX, deltaY) > 6) {
      dragState.moved = true;
      suppressTileClick = true;
    }

    cameraOffset = clampCameraOffset({
      x: dragState.originX + deltaX,
      y: dragState.originY + deltaY,
    });
    updateCamera();
  });

  function stopDragging(pointerId) {
    if (!dragState || dragState.pointerId !== pointerId) {
      return;
    }

    roomStage.releasePointerCapture(pointerId);
    roomStage.classList.remove("dragging");
    dragState = null;
  }

  roomStage.addEventListener("pointerup", (event) => {
    stopDragging(event.pointerId);
  });

  roomStage.addEventListener("pointercancel", (event) => {
    stopDragging(event.pointerId);
  });

  endTurnButton.addEventListener("click", async () => {
    if (isLevelComplete || turnPhase !== "player") {
      return;
    }

    gameLog("turn.end.begin", getRoomDebugState());

    if (isRoomSecured()) {
      isMoveMode = false;
      isPhysicalTargetMode = false;
      isBlinkTargetMode = false;
      pendingPhysicalDamage = 0;
      pendingAttack = null;
      pendingSymbolAssignment = null;
      suppressTileClick = false;
      dragState = null;
      roomStage.classList.remove("movement-active", "dragging");
      deactivateRunecasting();
      const execBonus = beginPlayerTurn();
      turnNumber += 1;
      selectedRollSlots.length = 0;
      updateRoom();
      let turnStatus = "Glitchspawn turn skipped. Area remains secured.";
      if (execBonus > 0) {
        turnStatus += ` FOCUS adds ${execBonus} temporary ${execBonus === 1 ? "Execution" : "Executions"} this turn.`;
      }
      const lockedProgramIds = getLockedProgramIds();
      if (lockedProgramIds.size) {
        turnStatus += ` ${[...lockedProgramIds].map((programId) => getProgramById(programId)?.name || programId).join(", ")} ${lockedProgramIds.size === 1 ? "is" : "are"} unavailable.`;
      }
      roomStatus.textContent = turnStatus;
      gameLog("turn.end.skippedSecuredRoom", { status: turnStatus, state: getRoomDebugState() });
      return;
    }

    turnPhase = "glitch";
    isMoveMode = false;
    isPhysicalTargetMode = false;
    isBlinkTargetMode = false;
    pendingPhysicalDamage = 0;
    suppressTileClick = false;
    dragState = null;
    temporaryRevealTileIds = new Set();
    if (sightRangeBonusTurnsRemaining > 0) {
      sightRangeBonusTurnsRemaining -= 1;
      if (sightRangeBonusTurnsRemaining <= 0) {
        sightRangeBonus = 0;
      }
    }
    if (phaseThroughEnemiesTurnsRemaining > 0) {
      phaseThroughEnemiesTurnsRemaining -= 1;
    }
    if (phaseThroughWallsTurnsRemaining > 0) {
      phaseThroughWallsTurnsRemaining -= 1;
    }
    roomStage.classList.remove("movement-active", "dragging");
    deactivateRunecasting();
    updateRoom();
    roomStatus.textContent = "Glitchspawn Turn.";
    await wait(220);
    const previousTokenRects = captureEnemyTokenRects();
    const spawnedEnemies = resolveEnemySpawns();
    const previousEnemyPositions = new Map(activeEnemies.map((enemy) => [enemy.instanceId, enemy.positionId]));
    activeEnemies.forEach((enemy) => {
      if (!enemy.positionId || enemy.stats.integrity <= 0) {
        return;
      }

      enemy.positionId = getNextEnemyPosition(roomTiles, enemy, characterPositionId, getOccupiedEnemyTileIds(activeEnemies), wallEdges);
    });
    const movedEnemies = activeEnemies.filter((enemy) => previousEnemyPositions.get(enemy.instanceId) !== enemy.positionId);
    updateRoom();
    await animateEnemyMovement(previousTokenRects);
    const characterTile = roomTiles.find((tile) => tile.id === characterPositionId);
    const isShelteredByHaven = characterTile?.type === "haven";
    const attackingEnemies = isShelteredByHaven
      ? []
      : activeEnemies.filter(
          (enemy) =>
            canEnemyAttackPlayer(roomTiles, enemy, characterPositionId, activeEnemies, wallEdges) &&
            !(enemy.proximityAttack && enemy.proximityAttackedThisTurn)
        );
    const stunnedEnemies = getLivingEnemies().filter((enemy) => (enemy.stunnedTurns || 0) > 0);
    const stunnedEnemyIds = new Set(stunnedEnemies.map((enemy) => enemy.instanceId));
    let turnStatus = movedEnemies.length
      ? `${movedEnemies.length} Glitch Spawn ${movedEnemies.length === 1 ? "moves" : "move"} closer.`
      : "The Glitch Spawn hold position near the Sigilant.";
    if (spawnedEnemies.length) {
      turnStatus += ` ${spawnedEnemies.length} Skin-Spawn ${spawnedEnemies.length === 1 ? "emerges" : "emerge"}.`;
    }
    if (isShelteredByHaven) {
      characterTile.type = "havenInactive";
      turnStatus += " Haven protection prevents enemy attacks.";
    }
    if (stunnedEnemies.length) {
      turnStatus += ` ${stunnedEnemies.map((enemy) => enemy.name).join(", ")} ${stunnedEnemies.length === 1 ? "is" : "are"} stunned.`;
      stunnedEnemies.forEach((enemy) => {
        enemy.stunnedTurns = Math.max(0, (enemy.stunnedTurns || 0) - 1);
      });
    }

    let incomingDamage = 0;
    const confusedEnemies = getLivingEnemies().filter((enemy) => enemy.confusedTurns > 0 && !stunnedEnemyIds.has(enemy.instanceId));
    const confusedAttackResults = confusedEnemies
      .map((enemy) => {
        const target = getLivingEnemies().find((candidate) => candidate.instanceId !== enemy.instanceId);

        if (!target) {
          enemy.confusedTurns = Math.max(0, (enemy.confusedTurns || 0) - 1);
          return null;
        }

        const didHit = Math.random() < getEnemyAttackAccuracy(enemy);
        let damageResult = null;

        if (didHit) {
          damageResult = dealEnemyIntegrityDamage(target, enemy.stats.power, "physicalDefense");
        }

        enemy.confusedTurns = Math.max(0, (enemy.confusedTurns || 0) - 1);
        return { enemy, target, didHit, damageResult };
      })
      .filter(Boolean);
    const confusedEnemyIds = new Set(confusedEnemies.map((enemy) => enemy.instanceId));
    const playerAttackingEnemies = attackingEnemies.filter((enemy) => !confusedEnemyIds.has(enemy.instanceId) && !stunnedEnemyIds.has(enemy.instanceId));

    if (confusedAttackResults.length) {
      const hits = confusedAttackResults.filter((result) => result.didHit);
      const misses = confusedAttackResults.filter((result) => !result.didHit);

      if (hits.length) {
        turnStatus += ` ${hits
          .map((result) => `${result.enemy.name} hits ${result.target.name} for ${result.damageResult.dealtDamage}`)
          .join(", ")}.`;
      }

      if (misses.length) {
        turnStatus += ` ${misses.map((result) => result.enemy.name).join(", ")} ${misses.length === 1 ? "misses" : "miss"} while confused.`;
      }
    }

    const attackResults = playerAttackingEnemies.map((enemy) => ({
      enemy,
      didHit: Math.random() < getEnemyAttackAccuracy(enemy),
    }));
    const hitEnemies = attackResults.filter((result) => result.didHit).map((result) => result.enemy);
    const missedEnemies = attackResults.filter((result) => !result.didHit).map((result) => result.enemy);
    const didConfuseDefeatEnemy = confusedAttackResults.some((result) => result.damageResult?.didDefeat);
    const didConfuseLevelUp = confusedAttackResults.some((result) => result.damageResult?.didLevelUp);

    if (playerAttackingEnemies.length) {
      const damageResult = resolveIncomingPlayerAttacks(hitEnemies);
      const { rawIncomingDamage, healedDamage, invertedCount } = damageResult;
      incomingDamage = damageResult.incomingDamage;
      if (hitEnemies.length) {
        turnStatus += damageResult.shielded
          ? ` ${hitEnemies.map((enemy) => enemy.name).join(", ")} hit, but Mag Shield blocks ${rawIncomingDamage} damage.`
          : invertedCount > 0
          ? ` ${invertedCount} incoming ${invertedCount === 1 ? "attack heals" : "attacks heal"} ${healedDamage} Integrity.${incomingDamage > 0 ? ` ${incomingDamage} damage gets through.` : ""}`
          : ` ${hitEnemies.map((enemy) => enemy.name).join(", ")} hit for ${incomingDamage} damage.`;
      }
      if (missedEnemies.length) {
        turnStatus += ` ${missedEnemies.map((enemy) => enemy.name).join(", ")} ${missedEnemies.length === 1 ? "misses" : "miss"}.`;
      }
    }

    const riftGhoulAttacks = attackResults.filter((result) => result.enemy.id === "riftGhoul");
    if (riftGhoulAttacks.length) {
      await Promise.all(riftGhoulAttacks.map((result) => animateRiftGhoulBolt(result.enemy)));
    }

    getLivingEnemies().forEach((enemy) => {
      if (enemy.accuracySuppressedTurns > 0) {
        enemy.accuracySuppressedTurns -= 1;
      }
    });

    if (character.stats.integrity <= 0) {
      turnStatus += " Integrity critical.";
      updateRoom();
      if (incomingDamage > 0) {
        showDamageIndicator(characterPositionId, incomingDamage, "player");
      }
      roomStatus.textContent = turnStatus;
      gameLog("turn.end.defeat", {
        movedEnemies: movedEnemies.map((enemy) => enemy.instanceId),
        spawnedEnemies: spawnedEnemies.map((enemy) => enemy.instanceId),
        attackingEnemies: playerAttackingEnemies.map((enemy) => enemy.instanceId),
        confusedEnemies: confusedEnemies.map((enemy) => enemy.instanceId),
        hitEnemies: hitEnemies.map((enemy) => enemy.instanceId),
        missedEnemies: missedEnemies.map((enemy) => enemy.instanceId),
        incomingDamage,
        status: turnStatus,
        state: getRoomDebugState(),
      });
      await wait(450);
      showRunDeathPopup("Your Integrity reached 0.");
      return;
    }

    await wait(180);
    turnPhase = "player";
    const execBonus = beginPlayerTurn();
    turnNumber += 1;
    selectedRollSlots.length = 0;
    updateRoom();
    if (incomingDamage > 0) {
      showDamageIndicator(characterPositionId, incomingDamage, "player");
    }
    if (didConfuseLevelUp) {
      window.setTimeout(showImmediateLevelReward, 120);
    }
    if (didConfuseDefeatEnemy && !hasLivingEnemies()) {
      window.setTimeout(showAllDerezzedNotice, didConfuseLevelUp ? 260 : 120);
    }
    if (execBonus > 0) {
      turnStatus += ` FOCUS adds ${execBonus} temporary ${execBonus === 1 ? "Execution" : "Executions"} this turn.`;
    }
    const lockedProgramIds = getLockedProgramIds();
    if (lockedProgramIds.size) {
      turnStatus += ` ${[...lockedProgramIds].map((programId) => getProgramById(programId)?.name || programId).join(", ")} ${lockedProgramIds.size === 1 ? "is" : "are"} unavailable.`;
    }
    roomStatus.textContent = turnStatus;
    gameLog("turn.end.resolved", {
      movedEnemies: movedEnemies.map((enemy) => enemy.instanceId),
      spawnedEnemies: spawnedEnemies.map((enemy) => enemy.instanceId),
      attackingEnemies: playerAttackingEnemies.map((enemy) => enemy.instanceId),
      confusedEnemies: confusedEnemies.map((enemy) => enemy.instanceId),
      hitEnemies: hitEnemies.map((enemy) => enemy.instanceId),
      missedEnemies: missedEnemies.map((enemy) => enemy.instanceId),
      incomingDamage,
      status: turnStatus,
      state: getRoomDebugState(),
    });
  });

  function updateRunecastingPanel(results = []) {
    const spentResultIndices = new Set(
      Array.isArray(currentCastSymbols)
        ? currentCastSymbols.filter((symbol) => symbol.spent).map((symbol) => symbol.resultIndex)
        : []
    );

    const assignableResultIndices = pendingSymbolAssignment?.candidateResultIndices || new Set();

    rollOptions.innerHTML = renderRollDieOptions(character, selectedRollSlots, currentCastSymbols);
    rollResults.innerHTML = renderRollResultSlots(
      character,
      selectedRollSlots,
      results,
      spentResultIndices,
      assignableResultIndices,
      currentCastSymbols
    );
    const hasRollResults = Array.isArray(currentCastSymbols) && currentCastSymbols.length;
    rollConfirm.disabled =
      !isRunecastingActive ||
      isRolling ||
      executionRollsRemaining <= 0 ||
      (hasRollResults && !selectedRollSlots.length);
  }

  function updateProgramAvailability() {
    programListItems.innerHTML = renderPrograms(character.programs, isRunecastingActive ? getCastSymbolsWithGlyphs() : null, {
      showPhysicalFallback: isRunecastingActive,
      allocations: allocatedProgramSymbols,
      cacheLimit: character.stats.cache,
      cooldownLockedProgramIds: getLockedProgramIds(),
      levelLockedProgramIds,
      cooldowns: programCooldowns,
    });
  }

  function canStartFreshRunecastingAction() {
    return turnPhase === "player" &&
      !isLevelComplete &&
      !isRunDefeated &&
      actionPointsRemaining > 0 &&
      !isRolling &&
      !pendingAttack &&
      !isBlinkTargetMode &&
      !pendingSymbolAssignment;
  }

  function hasUsableCastSymbols() {
    return Array.isArray(currentCastSymbols) && getCastSymbolsWithGlyphs().some((symbol) => isUsableSigilSymbol(symbol) && !symbol.spent);
  }

  function finishRunecastingIfNoOptions(statusText = "") {
    if (
      !isRunecastingActive ||
      executionRollsRemaining > 0 ||
      hasUsableCastSymbols() ||
      pendingAttack ||
      isBlinkTargetMode ||
      pendingSymbolAssignment
    ) {
      return false;
    }

    deactivateRunecasting();
    if (statusText) {
      roomStatus.textContent = statusText;
    }
    return true;
  }

  function resolvePlayerTileEntry() {
    let status = "";
    const cycleDropIndex = cycleDrops.findIndex((drop) => drop.tileId === characterPositionId);

    if (cycleDropIndex >= 0) {
      const [cycleDrop] = cycleDrops.splice(cycleDropIndex, 1);
      character.cycles += cycleDrop.amount;
      status = `${cycleDrop.amount} Cycles collected.`;
      gameLog("tile.cyclesCollected", { tileId: characterPositionId, amount: cycleDrop.amount, cycles: character.cycles, state: getRoomDebugState() });
    }

    if (riftThreadTileIds.includes(characterPositionId) && !collectedThreadTileIds.includes(characterPositionId)) {
      collectedThreadTileIds.push(characterPositionId);
      status = `Rift Thread acquired. ${collectedThreadTileIds.length}/${riftThreadTileIds.length} collected.`;
      gameLog("tile.threadCollected", { tileId: characterPositionId, state: getRoomDebugState() });
    }

    if (cacheTileIds.includes(characterPositionId) && !collectedCacheTileIds.includes(characterPositionId)) {
      collectedCacheTileIds.push(characterPositionId);
      window.setTimeout(showCacheUpgrade, 120);
      status = status ? `${status} Cache node accessed.` : "Cache node accessed.";
      gameLog("tile.cacheAccessed", { tileId: characterPositionId, state: getRoomDebugState() });
    }

    if (allArtifactTileIds.includes(characterPositionId) && !collectedArtifactTileIds.includes(characterPositionId)) {
      collectedArtifactTileIds.push(characterPositionId);
      window.setTimeout(() => showArtifactChoice(characterPositionId), 120);
      const isPipArtifact = pipArtifactTileIds.includes(characterPositionId);
      status = status ? `${status} ${isPipArtifact ? "Pip" : "Artifact"} signal accessed.` : `${isPipArtifact ? "Pip" : "Artifact"} signal accessed.`;
      gameLog("tile.artifactAccessed", { tileId: characterPositionId, pipOnly: isPipArtifact, state: getRoomDebugState() });
    }

    const sigilPickup = sigilPickups.find((pickup) => pickup.tileId === characterPositionId);
    if (sigilPickup && !collectedSigilTileIds.includes(characterPositionId)) {
      collectedSigilTileIds.push(characterPositionId);
      window.setTimeout(() => showSigilPickupChoice(sigilPickup), 120);
      const sigil = getSigilDefinition(sigilPickup.sigil.element, sigilPickup.sigil.face);
      status = status ? `${status} ${sigil.name} sigil acquired.` : `${sigil.name} sigil acquired.`;
      gameLog("tile.sigilCollected", { tileId: characterPositionId, sigil: sigilPickup.sigil, state: getRoomDebugState() });
    }

    const currentTile = roomTiles.find((tile) => tile.id === characterPositionId);
    if (currentTile?.type === "powerHub" && !usedPowerHubTileIds.includes(characterPositionId)) {
      usedPowerHubTileIds.push(characterPositionId);
      currentTile.type = "powerHubOff";
      const integrityBeforeHeal = character.stats.integrity;
      character.stats.integrity = Math.min(character.stats.maxIntegrity, character.stats.integrity + 2);
      const healedIntegrity = character.stats.integrity - integrityBeforeHeal;
      status = status ? `${status} Power Hub restored ${healedIntegrity} Integrity.` : `Power Hub restored ${healedIntegrity} Integrity.`;
      gameLog("tile.powerHubUsed", { tileId: characterPositionId, healedIntegrity, state: getRoomDebugState() });
    }

    if (characterPositionId === riftTile.id) {
      if (collectedThreadTileIds.length >= riftThreadTileIds.length) {
        isLevelComplete = true;
        isMoveMode = false;
        isBlinkTargetMode = false;
        isPhysicalTargetMode = false;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        gameLog("level.riftClosed", getRoomDebugState());
        return status ? `${status} Rift closed. Level complete.` : "Rift closed. Level complete.";
      }

      if (collectedThreadTileIds.length < riftThreadTileIds.length) {
        return status || `The Rift resists closure. Collect ${riftThreadTileIds.length - collectedThreadTileIds.length} Rift Thread first.`;
      }

      return status || "The Rift is ready to close.";
    }

    return status;
  }

  function moveRiftThreadsCloserToPlayer() {
    const playerTile = roomTiles.find((tile) => tile.id === characterPositionId);

    if (!playerTile) {
      return 0;
    }

    const blockedDestinationIds = new Set([
      characterPositionId,
      riftTile?.id,
      ...collectedThreadTileIds,
    ].filter(Boolean));
    const activeThreadTileIds = new Set(
      riftThreadTileIds.filter((tileId) => !collectedThreadTileIds.includes(tileId))
    );
    let movedThreadCount = 0;

    riftThreadTileIds.forEach((tileId, index) => {
      if (collectedThreadTileIds.includes(tileId)) {
        return;
      }

      const currentTile = roomTiles.find((tile) => tile.id === tileId);

      if (!currentTile) {
        return;
      }

      activeThreadTileIds.delete(tileId);
      const currentDistance = getHexDistance(currentTile, playerTile);
      const destination = roomTiles
        .filter(
          (tile) =>
            getHexDistance(currentTile, tile) === 1 &&
            getHexDistance(tile, playerTile) < currentDistance &&
            !blockedDestinationIds.has(tile.id) &&
            !activeThreadTileIds.has(tile.id)
        )
        .sort((a, b) => getHexDistance(a, playerTile) - getHexDistance(b, playerTile))[0];

      if (!destination) {
        activeThreadTileIds.add(tileId);
        return;
      }

      riftThreadTileIds[index] = destination.id;
      activeThreadTileIds.add(destination.id);
      movedThreadCount += 1;
    });

    return movedThreadCount;
  }

  function finishLevelIfComplete(status) {
    if (!isLevelComplete) {
      return;
    }

    let completionStatus = status || "Rift closed. Level complete.";

    if (!levelCompletionStatsRecorded) {
      const runStats = ensureRunStats(character);

      runStats.riftsClosed += 1;
      runStats.turnsTaken += turnNumber;
      levelCompletionStatsRecorded = true;
    }

    if (!levelCycleRewardAwarded) {
      const cycleReward = getLevelCycleReward(turnNumber, levelCycleMaxTurns);
      character.cycles += cycleReward;
      levelCycleRewardAwarded = true;
      completionStatus = `${completionStatus} +${cycleReward} Cycles.`;
      gameLog("level.cyclesAwarded", {
        reward: cycleReward,
        turnNumber,
        maxTurns: levelCycleMaxTurns,
        cycles: character.cycles,
        state: getRoomDebugState(),
      });
    }

    updateRoom();
    roomStatus.textContent = completionStatus;
    window.setTimeout(() => showLevelComplete(character, levelNode.id, {
      cycleReward: levelCycleRewardAwarded ? getLevelCycleReward(turnNumber, levelCycleMaxTurns) : 0,
      turnNumber,
      maxTurns: levelCycleMaxTurns,
    }), 500);
  }

  function getCacheProgramOptions() {
    const ownedPrograms = new Set(ensureProgramLibrary(character));
    const loadoutElements = getCharacterLoadoutElements(character);

    return getRandomOptions(
      Object.values(programs).filter((program) => {
        const requiredElements = getProgramRequiredElements(program);

        return !ownedPrograms.has(program.id) && requiredElements.some((element) => loadoutElements.has(element));
      }),
      2
    );
  }

  function applyArtifact(artifact) {
    return applyArtifactToCharacter(character, artifact, levelNode?.sigilProfile || {});
  }

  function consumeArtifactUse(artifact) {
    artifact.uses = Math.max(0, (artifact.uses || 0) - 1);

    if (artifact.uses <= 0) {
      const artifactInstanceId = artifact.instanceId || artifact.id;
      character.artifacts = (character.artifacts || []).filter(
        (item) => (item.instanceId || item.id) !== artifactInstanceId
      );
    }
  }

  function useArtifact(artifactInstanceId) {
    const artifact = (character.artifacts || []).find((item) => (item.instanceId || item.id) === artifactInstanceId);

    if (!artifact || artifact.uses <= 0) {
      return;
    }

    if (artifact.effect?.type === "sigilGlyph") {
      if (!isRunecastingActive) {
        roomStatus.textContent = `${artifact.name} can be used while Sigil-Casting.`;
        return;
      }

      roomStatus.textContent = pendingSymbolAssignment
        ? `${artifact.name} does not match the selected program requirement.`
        : `Choose a program first, then click ${artifact.name} to spend it.`;
      return;
    }

    if (artifact.effect?.type === "temporaryActions") {
      const actionBoostAmount = artifact.effect.amount || 1;
      const actionBoostTurns = artifact.effect.turns || 3;
      const grantsCurrentTurnAction = turnPhase === "player" && !isLevelComplete && !isRunDefeated;
      character.temporaryActionBoostAmount = Math.max(character.temporaryActionBoostAmount || 0, actionBoostAmount);
      character.temporaryActionBoostTurns = Math.max(
        character.temporaryActionBoostTurns || 0,
        grantsCurrentTurnAction ? Math.max(0, actionBoostTurns - 1) : actionBoostTurns
      );
      if (grantsCurrentTurnAction) {
        actionPointsRemaining += actionBoostAmount;
      }
      consumeArtifactUse(artifact);
      updateRoom();
      roomStatus.textContent = grantsCurrentTurnAction
        ? `${artifact.name} adds ${actionBoostAmount} Action now and for the next ${character.temporaryActionBoostTurns} turns.`
        : `${artifact.name} will add ${actionBoostAmount} Action for the next ${character.temporaryActionBoostTurns} turns.`;
      return;
    }

    if (artifact.effect?.type === "revealEnemiesDamage") {
      const targetTileIds = getLivingEnemies().map((enemy) => enemy.positionId).filter(Boolean);

      if (!targetTileIds.length) {
        roomStatus.textContent = `${artifact.name} found no enemies.`;
        return;
      }

      temporaryRevealTileIds = new Set(targetTileIds);
      isMoveMode = false;
      isPhysicalTargetMode = true;
      isBlinkTargetMode = false;
      pendingPhysicalDamage = Number.isFinite(artifact.effect.amount) ? artifact.effect.amount : 4;
      pendingAttack = {
        artifactInstanceId,
        label: artifact.name,
        damage: pendingPhysicalDamage,
        defenseStat: "arcaneDefense",
        damageType: "arcane",
        targetTileIds,
        consumeArtifactUse: true,
        revealTarget: true,
        prompt: `Choose a revealed enemy for ${artifact.name}.`,
      };
      roomStage.classList.remove("movement-active", "dragging");
      updateRoom();
      roomStatus.textContent = `All enemies revealed. Choose one for ${artifact.name}.`;
      return;
    }

    if (artifact.effect?.type === "shieldDamage") {
      character.damageShieldTurns = Math.max(character.damageShieldTurns || 0, artifact.effect.turns || 3);
      consumeArtifactUse(artifact);
      updateRoom();
      roomStatus.textContent = `${artifact.name} blocks all damage for ${character.damageShieldTurns} turns.`;
      return;
    }

    if (artifact.effect?.type === "moveActionRangeBonus") {
      character.moveActionRangeBonusAmount = Math.max(character.moveActionRangeBonusAmount || 0, artifact.effect.amount || 1);
      character.moveActionRangeBonusTurns = Math.max(character.moveActionRangeBonusTurns || 0, artifact.effect.turns || 5);
      consumeArtifactUse(artifact);
      updateRoom();
      roomStatus.textContent = `${artifact.name} adds ${character.moveActionRangeBonusAmount} space to each Move action for ${character.moveActionRangeBonusTurns} turns.`;
      return;
    }

    if (artifact.effect?.type === "damageAdjacentAll") {
      const adjacentEnemyTileIds = getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, getPlayerWallEdges());

      if (!adjacentEnemyTileIds.length) {
        roomStatus.textContent = `${artifact.name} needs surrounding enemies.`;
        return;
      }

      const amount = Number.isFinite(artifact.effect.amount) ? artifact.effect.amount : 1;
      const damageType = artifact.effect.damageType === "physical" ? "physical" : "arcane";
      const defenseStat = damageType === "physical" ? "physicalDefense" : "arcaneDefense";
      const damagedEnemies = adjacentEnemyTileIds
        .map((tileId) => getEnemyAtTile(activeEnemies, tileId))
        .filter(Boolean)
        .map((enemy) => ({ enemy, tileId: enemy.positionId, result: dealEnemyIntegrityDamage(enemy, amount, defenseStat) }));
      const didLevelUp = damagedEnemies.some((item) => item.result.didLevelUp);

      consumeArtifactUse(artifact);
      updateRoom();
      damagedEnemies.forEach((item) => showDamageIndicator(item.tileId, item.result.dealtDamage, "enemy"));
      roomStatus.textContent = `${artifact.name} dealt ${amount} ${damageType} damage to ${damagedEnemies.length} surrounding ${damagedEnemies.length === 1 ? "enemy" : "enemies"}.`;
      finishRunecastingIfNoOptions(roomStatus.textContent);
      if (didLevelUp) {
        window.setTimeout(showImmediateLevelReward, 120);
      }
      if (damagedEnemies.some((item) => item.result.didDefeat) && !hasLivingEnemies()) {
        window.setTimeout(showAllDerezzedNotice, didLevelUp ? 260 : 120);
      }
      return;
    }

    if (artifact.effect?.type === "damageAdjacent") {
      const adjacentEnemyTileIds = getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, getPlayerWallEdges());

      if (!adjacentEnemyTileIds.length) {
        roomStatus.textContent = `${artifact.name} needs an adjacent enemy.`;
        return;
      }

      isMoveMode = false;
      isPhysicalTargetMode = true;
      isBlinkTargetMode = false;
      pendingPhysicalDamage = Number.isFinite(artifact.effect.amount) ? artifact.effect.amount : 1;
      pendingAttack = {
        artifactInstanceId,
        label: artifact.name,
        damage: pendingPhysicalDamage,
        defenseStat: artifact.effect.damageType === "arcane" ? "arcaneDefense" : "physicalDefense",
        damageType: artifact.effect.damageType === "arcane" ? "arcane" : "physical",
        targetTileIds: adjacentEnemyTileIds,
        consumeArtifactUse: true,
      };
      roomStage.classList.remove("movement-active", "dragging");
      updateRoom();
      roomStatus.textContent = `Choose an adjacent enemy for ${artifact.name}.`;
    }
  }

  function closeCacheUpgrade(status) {
    document.querySelector(".cache-upgrade-overlay")?.remove();
    updateRoom();
    roomStatus.textContent = status;
  }

  function showArtifactChoice(tileId) {
    const isPipArtifact = pipArtifactTileIds.includes(tileId);
    const artifactPool = isPipArtifact
      ? artifacts.filter((artifact) => artifact.type === "pip" || artifact.effect?.type === "pip")
      : artifacts;
    const artifactOptions = rollUniqueArtifactsFromPool(2, artifactPool);
    const overlay = document.createElement("div");

    gameLog("artifact.popup.open", {
      tileId,
      pipOnly: isPipArtifact,
      artifactOptions: artifactOptions.map((artifact) => artifact.id),
      state: getRoomDebugState(),
    });

    overlay.className = "cache-upgrade-overlay artifact-choice-overlay";
    overlay.innerHTML = `
      <section class="cache-upgrade-panel" aria-labelledby="artifact-choice-title">
        <p class="signal">${isPipArtifact ? "Pip Signal" : "Artifact Signal"}</p>
        <h2 id="artifact-choice-title">Choose ${isPipArtifact ? "Pip" : "Artifact"}</h2>
        <div class="cache-upgrade-grid">
          ${
            artifactOptions.length
              ? artifactOptions
                  .map(
                    (artifact, index) => `
                      <button class="secondary-action reward-choice artifact-choice" type="button" data-artifact-choice="${index}">
                        <img class="artifact-choice-img" src="${getArtifactImage(artifact)}" alt="">
                        <strong>${artifact.name}</strong>
                        <small>${getArtifactDisplayLabel(artifact)}</small>
                      </button>
                    `
                  )
                  .join("")
              : `<p class="program-preview-empty">No artifacts available.</p>`
          }
        </div>
      </section>
    `;

    document.querySelector(".room-screen").appendChild(overlay);

    overlay.querySelectorAll("[data-artifact-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const artifact = artifactOptions[Number(button.dataset.artifactChoice)];

        if (!artifact) {
          return;
        }

        const acquiredArtifact = applyArtifact(artifact);
        overlay.remove();
        updateRoom();
        roomStatus.textContent = `${acquiredArtifact.name} acquired. ${getArtifactDisplayLabel(acquiredArtifact)}.`;
        gameLog("tile.artifactCollected", { tileId, artifactId: acquiredArtifact.id, pipOnly: isPipArtifact, state: getRoomDebugState() });
      });
    });
  }

  function showSigilPickupChoice(pickup) {
    const sigil = getSigilDefinition(pickup.sigil.element, pickup.sigil.face);
    character.sigilInventory = character.sigilInventory || [];
    character.sigilInventory.push({ element: pickup.sigil.element, face: pickup.sigil.face || 1 });

    let selectedCraftSource = { type: "inventory", index: character.sigilInventory.length - 1 };

    const overlay = document.createElement("div");
    overlay.className = "cache-upgrade-overlay sigil-pickup-overlay";

    function renderPickupCrafting() {
      overlay.innerHTML = `
        <section class="cache-upgrade-panel sigil-pickup-crafting-panel" aria-labelledby="sigil-pickup-title">
          <p class="signal">Floating Sigil</p>
          <div class="sigil-pickup-header">
            <div>
              <h2 id="sigil-pickup-title">New Sigil Acquired</h2>
              <div class="sigil-pickup-preview" style="--die-accent: ${sigil.accent}">
                <img src="${sigil.image}" alt="${sigil.name} sigil">
                <span>${sigilRarityLabels[pickup.sigil.face || 1]} ${sigil.name}</span>
              </div>
            </div>
            <button class="primary-action" type="button" id="finish-sigil-pickup">Done Crafting</button>
          </div>
          <div id="sigil-pickup-workbench">
            ${renderCraftingDatabank(character, selectedCraftSource)}
            ${renderCraftingDice(character, selectedCraftSource)}
          </div>
        </section>
      `;
    }

    renderPickupCrafting();

    document.querySelector(".room-screen").appendChild(overlay);
    const workbench = overlay.querySelector("#sigil-pickup-workbench");

    function renderWorkbench() {
      workbench.innerHTML = `
        ${renderCraftingDatabank(character, selectedCraftSource)}
        ${renderCraftingDice(character, selectedCraftSource)}
      `;
    }

    bindCraftingWorkbench({
      workbench,
      character,
      getSelectedCraftSource: () => selectedCraftSource,
      setSelectedCraftSource: (source) => {
        selectedCraftSource = source;
      },
      renderWorkbench,
    });

    overlay.querySelector("#finish-sigil-pickup").addEventListener("click", () => {
      overlay.remove();
      updateRoom();
      roomStatus.textContent = `${sigil.name} sigil acquired. Dice crafting updated.`;
      gameLog("sigil.pickupCraftingComplete", { sigil: pickup.sigil, state: getRoomDebugState() });
    });
  }

  function showProgramLibraryEquip(status = "Choose equipped programs.") {
    const library = ensureProgramLibrary(character);
    const requiredCount = Math.min(character.stats.cache, library.length);
    let selectedProgramIds = character.programs.filter((programId) => library.includes(programId)).slice(0, requiredCount);

    const overlay = document.createElement("div");
    overlay.className = "cache-upgrade-overlay program-library-overlay";

    function renderChoices() {
      return library
        .map((programId) => {
          const program = getProgramById(programId);
          const isSelected = selectedProgramIds.includes(programId);

          return renderProgramRewardChoice(
            program,
            `data-library-program="${program.id}" aria-pressed="${isSelected}"`,
            isSelected ? "selected" : ""
          );
        })
        .join("");
    }

    function renderOverlay() {
      overlay.innerHTML = `
        <section class="cache-upgrade-panel program-library-panel" aria-labelledby="program-library-title">
          <p class="signal">Program Library</p>
          <h2 id="program-library-title">Equip Programs</h2>
          <p class="program-preview-empty">${status} CACHE ${selectedProgramIds.length}/${requiredCount} equipped.</p>
          <div class="cache-upgrade-grid single-reward">
            <article class="reward-card">
              <h3>Owned Programs</h3>
              <div class="reward-choice-grid program-library-list">
                ${renderChoices()}
              </div>
            </article>
          </div>
          <button class="primary-action" type="button" id="confirm-program-library">Confirm Loadout</button>
        </section>
      `;
    }

    function bindOverlay() {
      overlay.querySelectorAll("[data-library-program]").forEach((button) => {
        button.addEventListener("click", () => {
          const programId = button.dataset.libraryProgram;

          if (selectedProgramIds.includes(programId)) {
            selectedProgramIds = selectedProgramIds.filter((id) => id !== programId);
          } else if (selectedProgramIds.length < requiredCount) {
            selectedProgramIds.push(programId);
          }

          renderOverlay();
          bindOverlay();
        });
      });

      overlay.querySelector("#confirm-program-library").addEventListener("click", () => {
        character.programs = [...selectedProgramIds];
        overlay.remove();
        updateProgramAvailability();
        updateRoom();
        roomStatus.textContent = "Program loadout updated.";
        gameLog("program.libraryEquipped", { equippedPrograms: character.programs, state: getRoomDebugState() });
      });
    }

    renderOverlay();
    document.querySelector(".room-screen").appendChild(overlay);
    bindOverlay();
  }

  function showRoomCraftingOverlay() {
    character.sigilInventory = character.sigilInventory || [];
    character.pipInventory = character.pipInventory || [];
    let selectedCraftSource = null;
    const overlay = document.createElement("div");
    overlay.className = "cache-upgrade-overlay room-crafting-overlay";

    function renderOverlay() {
      overlay.innerHTML = `
        <section class="cache-upgrade-panel room-crafting-panel" aria-labelledby="room-crafting-title">
          <p class="signal">Dice Workbench</p>
          <h2 id="room-crafting-title">Craft Dice</h2>
          <div id="room-crafting-workbench">
            ${renderCraftingDatabank(character, selectedCraftSource)}
            ${renderCraftingDice(character, selectedCraftSource)}
          </div>
          <button class="primary-action" type="button" id="finish-room-crafting">Done Crafting</button>
        </section>
      `;
    }

    function bindOverlay() {
      const workbench = overlay.querySelector("#room-crafting-workbench");

      bindCraftingWorkbench({
        workbench,
        character,
        getSelectedCraftSource: () => selectedCraftSource,
        setSelectedCraftSource: (source) => {
          selectedCraftSource = source;
        },
        renderWorkbench: () => {
          renderOverlay();
          bindOverlay();
        },
      });

      overlay.querySelector("#finish-room-crafting").addEventListener("click", () => {
        overlay.remove();
        updateProgramAvailability();
        updateRoom({ centerCamera: false });
        roomStatus.textContent = "Dice crafting updated.";
        gameLog("room.craftingComplete", getRoomDebugState());
      });
    }

    renderOverlay();
    document.querySelector(".room-screen").appendChild(overlay);
    bindOverlay();
  }

  function spendUtilityAction(actionName) {
    if (
      turnPhase !== "player" ||
      isLevelComplete ||
      isRunDefeated ||
      isRunecastingActive ||
      pendingAttack ||
      isBlinkTargetMode ||
      actionPointsRemaining <= 0
    ) {
      roomStatus.textContent = `${actionName} needs 1 available Action.`;
      return false;
    }

    actionPointsRemaining = Math.max(0, actionPointsRemaining - 1);
    isMoveMode = false;
    isPhysicalTargetMode = false;
    pendingPhysicalDamage = 0;
    pendingSymbolAssignment = null;
    roomStage.classList.remove("movement-active", "dragging");
    updateRoom({ centerCamera: false });
    return true;
  }

  changeProgramsButton.addEventListener("click", () => {
    if (!spendUtilityAction("Programs")) {
      return;
    }

    showProgramLibraryEquip("Choose equipped programs.");
  });

  roomCraftingButton.addEventListener("click", () => {
    if (!spendUtilityAction("Crafting")) {
      return;
    }

    showRoomCraftingOverlay();
  });

  saveGameButton.addEventListener("click", () => {
    downloadJsonSave(buildCurrentSaveGame());
    roomStatus.textContent = "Game saved to file.";
    gameLog("save.downloaded", getRoomDebugState());
  });

  document.querySelector(".room-screen").addEventListener("click", (event) => {
    const artifactButton = event.target.closest("[data-artifact-use]");

    if (!artifactButton || turnPhase !== "player" || isLevelComplete || isRunDefeated) {
      return;
    }

    const artifact = (character.artifacts || []).find((item) => (item.instanceId || item.id) === artifactButton.dataset.artifactUse);
    const glyphSymbol =
      artifact?.effect?.type === "sigilGlyph"
        ? getAvailableSigilGlyphSymbols(character).find(
            (symbol) => symbol.artifactInstanceId === (artifact.instanceId || artifact.id)
          )
        : null;

    if (glyphSymbol && pendingSymbolAssignment?.candidateResultIndices?.has(glyphSymbol.resultIndex)) {
      resolveAssignedProgram(pendingSymbolAssignment.programId, glyphSymbol);
      return;
    }

    useArtifact(artifactButton.dataset.artifactUse);
  });

  function showCacheUpgrade() {
    const programOptions = getCacheProgramOptions();
    const overlay = document.createElement("div");

    gameLog("cache.popup.open", {
      programOptions: programOptions.map((program) => program.id),
      library: ensureProgramLibrary(character),
      state: getRoomDebugState(),
    });

    overlay.className = "cache-upgrade-overlay";
    overlay.innerHTML = `
      <section class="cache-upgrade-panel" aria-labelledby="cache-upgrade-title">
        <p class="signal">Cache Node</p>
        <h2 id="cache-upgrade-title">Choose Program</h2>
        <div class="cache-upgrade-grid single-reward">
          <article class="reward-card">
            <h3>New Program</h3>
            <div class="reward-choice-grid">
              ${
                programOptions.length
                  ? programOptions
                      .map(
                        (program) => renderProgramRewardChoice(program, `data-cache-program="${program.id}"`)
                      )
                      .join("")
                  : `<p class="program-preview-empty">No new programs available.</p>`
              }
            </div>
          </article>
        </div>
      </section>
    `;
    document.querySelector(".room-screen").appendChild(overlay);

    overlay.querySelectorAll("[data-cache-program]").forEach((button) => {
      button.addEventListener("click", () => {
        const program = getProgramById(button.dataset.cacheProgram);

        if (!program) {
          return;
        }

        ensureProgramLibrary(character);

        if (!character.programLibrary.includes(program.id)) {
          character.programLibrary.push(program.id);
        }

        gameLog("cache.programSelected", { programId: program.id, library: character.programLibrary, state: getRoomDebugState() });
        document.querySelector(".cache-upgrade-overlay")?.remove();

        if (character.programs.length < character.stats.cache) {
          character.programs.push(program.id);
          updateProgramAvailability();
          updateRoom();
          roomStatus.textContent = `${program.name} added to library and equipped.`;
          return;
        }

        showProgramLibraryEquip(`${program.name} added. Choose ${Math.min(character.stats.cache, character.programLibrary.length)} programs to equip.`);
      });
    });

  }

  function showImmediateLevelReward() {
    if ((character.progression.pendingRewards || 0) <= 0 || document.querySelector(".level-reward-overlay")) {
      return;
    }

    const blankDieSideCount = rollLevelRewardDieSideCount();
    const overlay = document.createElement("div");
    overlay.className = "cache-upgrade-overlay level-reward-overlay";
    overlay.innerHTML = `
      <section class="cache-upgrade-panel" aria-labelledby="level-reward-title">
        <p class="signal">Level ${character.progression.level} Reached</p>
        <h2 id="level-reward-title">New Blank Die</h2>
        <div class="cache-upgrade-grid single-reward">
          <article class="reward-card">
            <h3>Add Blank Die</h3>
            <div class="reward-choice-grid">
              <button class="secondary-action reward-choice" type="button" id="add-blank-level-die">
                <strong>${blankDieSideCount}-Sided Blank Die</strong>
                <small>${blankDieSideCount} empty faces for future sigils.</small>
              </button>
            </div>
          </article>
        </div>
      </section>
    `;

    document.querySelector(".room-screen").appendChild(overlay);
    overlay.querySelector("#add-blank-level-die").addEventListener("click", () => {
      character.loadout.push(createBlankDie(blankDieSideCount));
      character.progression.pendingRewards = Math.max(0, (character.progression.pendingRewards || 0) - 1);
      overlay.remove();
      updateRoom();
      roomStatus.textContent = `${blankDieSideCount}-sided blank die added to the pool.`;

      if (character.progression.pendingRewards > 0) {
        window.setTimeout(showImmediateLevelReward, 120);
      }
    });

    gameLog("level.reward.open", { level: character.progression.level, state: getRoomDebugState() });
  }

  function deactivateRunecasting() {
    isRunecastingActive = false;
    isPhysicalTargetMode = false;
    isBlinkTargetMode = false;
    pendingPhysicalDamage = 0;
    pendingAttack = null;
    pendingSymbolAssignment = null;
    isRolling = false;
    currentCastSymbols = null;
    allocatedProgramSymbols = {};
    runecastPanel.classList.add("inactive");
    rollStatus.textContent = getExecutionStatusText(executionRollsRemaining);
    updateProgramAvailability();
    updateRunecastingPanel();
    updateRoom();
  }

  function exhaustRunecastingKeepResults(statusText = "") {
    isRunecastingActive = false;
    isPhysicalTargetMode = false;
    isBlinkTargetMode = false;
    pendingPhysicalDamage = 0;
    pendingAttack = null;
    pendingSymbolAssignment = null;
    isRolling = false;
    selectedRollSlots.length = 0;
    updateProgramAvailability();
    updateRunecastingPanel();
    updateRoom();
    if (statusText) {
      roomStatus.textContent = statusText;
    }
  }

  function activateRunecasting() {
    if (turnPhase !== "player") {
      return;
    }

    if (actionPointsRemaining <= 0) {
      rollStatus.textContent = getExecutionStatusText(executionRollsRemaining);
      gameLog("sigilCast.blocked.noCasts", getRoomDebugState());
      return;
    }

    actionPointsRemaining -= 1;
    executionRollsRemaining = character.stats.exec + temporaryExecutionBonusThisTurn;
    isRunecastingActive = true;
    isPhysicalTargetMode = false;
    isBlinkTargetMode = false;
    pendingPhysicalDamage = 0;
    pendingAttack = null;
    pendingSymbolAssignment = null;
    currentCastSymbols = [];
    allocatedProgramSymbols = {};
    selectedRollSlots.length = 0;
    runecastPanel.classList.remove("inactive");
    rollStatus.textContent = getExecutionStatusText(executionRollsRemaining);
    updateProgramAvailability();
    updateRunecastingPanel();
    updateRoom();
    gameLog("sigilCast.panelActivated", getRoomDebugState());
  }

  function getCastSymbolsWithGlyphs() {
    return Array.isArray(currentCastSymbols)
      ? [...currentCastSymbols, ...getAvailableSigilGlyphSymbols(character)]
      : currentCastSymbols;
  }

  function getLinePathTileIds(positionId, direction, maxDistance) {
    const position = roomTiles.find((tile) => tile.id === positionId);
    const path = [];

    if (!position) {
      return path;
    }

    for (let distance = 1; distance <= maxDistance; distance += 1) {
      const tile = roomTiles.find(
        (candidate) =>
          candidate.q === position.q + direction.q * distance &&
          candidate.r === position.r + direction.r * distance
      );

      if (!tile) {
        break;
      }

      const previousTile = distance === 1 ? position : roomTiles.find((candidate) => candidate.id === path[path.length - 1]);
      if (hasWallBetweenTiles(getPlayerWallEdges(), previousTile, tile)) {
        break;
      }

      path.push(tile.id);
    }

    return path;
  }

  function getLineFalloffTargetTileIds(maxDistance) {
    return roomDirections.flatMap((direction) => getLinePathTileIds(characterPositionId, direction, maxDistance));
  }

  function getLinePathToTile(targetTileId, maxDistance) {
    return roomDirections
      .map((direction) => getLinePathTileIds(characterPositionId, direction, maxDistance))
      .find((path) => path.includes(targetTileId)) || [];
  }

  function showManifestDieFacePicker(program, allocatedSymbols) {
    const overlay = document.createElement("div");
    const allocatedSlotIndices = new Set(allocatedSymbols.map((symbol) => symbol.slotIndex));
    const manifestableSymbols = currentCastSymbols.filter((symbol) => !symbol.artifactInstanceId && !symbol.spent && !allocatedSlotIndices.has(symbol.slotIndex));

    if (!manifestableSymbols.length) {
      roomStatus.textContent = `${program.name} has no other die result to change.`;
      return;
    }

    overlay.className = "cache-upgrade-overlay manifest-overlay";
    overlay.innerHTML = `
      <section class="cache-upgrade-panel" aria-labelledby="manifest-title">
        <p class="signal">Sigil-Casting Override</p>
        <h2 id="manifest-title">${program.name}</h2>
        <p>Choose a rolled die, then choose the face it shows for this Sigil-Cast.</p>
        <div class="cache-upgrade-grid manifest-grid">
          ${manifestableSymbols
            .map((symbol) => {
              const loadoutDie = character.loadout[symbol.slotIndex];
              const faces = getLoadoutDieRawFaces(loadoutDie);

              return `
                <article class="reward-card manifest-die-card">
                  <h3>Die ${symbol.slotIndex + 1}</h3>
                  <div class="reward-choice-grid">
                    ${faces
                      .map((face, faceIndex) => {
                        const sigil = face.element ? getSigilDefinition(face.element, face.face || 1) : null;

                        return `
                          <button class="secondary-action reward-choice manifest-face-choice" type="button" data-manifest-slot="${symbol.slotIndex}" data-manifest-face="${faceIndex}">
                            <strong>${sigil ? `${sigil.name} ${sigilRarityLabels[sigil.face]}` : "Blank"}</strong>
                            <small>Face ${faceIndex + 1}</small>
                          </button>
                        `;
                      })
                      .join("")}
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;

    document.querySelector(".room-screen").appendChild(overlay);
    overlay.addEventListener("click", (event) => {
      const choice = event.target.closest("[data-manifest-slot]");

      if (!choice) {
        return;
      }

      const slotIndex = Number(choice.dataset.manifestSlot);
      const faceIndex = Number(choice.dataset.manifestFace);
      const rawFace = getLoadoutDieRawFaces(character.loadout[slotIndex])[faceIndex] || null;
      const sigil = rawFace?.element ? getSigilDefinition(rawFace.element, rawFace.face || 1) : null;

      currentCastSymbols = currentCastSymbols.map((symbol) =>
        symbol.slotIndex === slotIndex
          ? {
              ...symbol,
              element: sigil?.element || null,
              face: sigil?.face || null,
              faceIndex,
              pips: rawFace?.pips || [],
              blank: !sigil,
            }
          : symbol
      );
      overlay.remove();
      updateProgramAvailability();
      updateRunecastingPanel();
      updateRoom();
      roomStatus.textContent = `${program.name} set Die ${slotIndex + 1} to ${sigil ? `${sigil.name} ${sigilRarityLabels[sigil.face]}` : "Blank"}.`;
      finishRunecastingIfNoOptions(roomStatus.textContent);
    });
  }

  rollButton.addEventListener("click", () => {
    if (!canStartFreshRunecastingAction()) {
      return;
    }
    if (isRunecastingActive) {
      isRunecastingActive = false;
      currentCastSymbols = null;
      allocatedProgramSymbols = {};
      selectedRollSlots.length = 0;
      pendingPhysicalDamage = 0;
      pendingAttack = null;
      pendingSymbolAssignment = null;
      isBlinkTargetMode = false;
    }
    activateRunecasting();
  });

  function getAssignableProgramSymbols(program, selectedSymbols = []) {
    const castSymbols = getCastSymbolsWithGlyphs();

    if (!Array.isArray(castSymbols) || !program?.requirement?.length) {
      return [];
    }

    const requirement = program.requirement[selectedSymbols.length];
    const selectedResultIndices = new Set(selectedSymbols.map((symbol) => symbol.resultIndex));

    if (!requirement) {
      return [];
    }

    return castSymbols.filter(
      (symbol) =>
        !symbol.spent &&
        !symbol.blank &&
        !selectedResultIndices.has(symbol.resultIndex) &&
        symbol.element === requirement.element &&
        symbol.face === requirement.face
    );
  }

  function queueSymbolAssignment(programId, symbols, status, selectedSymbols = []) {
    pendingSymbolAssignment = {
      programId,
      candidateResultIndices: new Set(symbols.map((symbol) => symbol.resultIndex)),
      selectedSymbols,
    };
    isMoveMode = false;
    isPhysicalTargetMode = false;
    isBlinkTargetMode = false;
    pendingPhysicalDamage = 0;
    pendingAttack = null;
    roomStage.classList.remove("movement-active", "dragging");
    updateProgramAvailability();
    updateRunecastingPanel();
    updateRoom();
    rollStatus.textContent = getExecutionStatusText(executionRollsRemaining);
    roomStatus.textContent = status;
  }

  function resolveAssignedProgram(programId, selectedSymbol) {
    const assignment = pendingSymbolAssignment;
    let allocatedSymbols = [];
    let attackDamage = 0;
    let defenseStat = "physicalDefense";
    let damageType = "physical";
    let healAmount = 0;
    let statusLabel = "Physical Damage";

    pendingSymbolAssignment = null;
    const playerWallEdges = getPlayerWallEdges();

    if (programId === "physical-damage") {
      allocatedSymbols = findPhysicalAllocationFromSymbol(currentCastSymbols, selectedSymbol);
      attackDamage = getPhysicalDamageFromAllocation(allocatedSymbols);
    } else {
      const program = getProgramById(programId);
      const effect = program?.effect || {};

      if (
        !program ||
        !selectedSymbol ||
        !supportedProgramEffectTypes.includes(effect.type)
      ) {
        return;
      }

      allocatedSymbols = [...(assignment?.selectedSymbols || []), selectedSymbol];

      if (allocatedSymbols.length < program.requirement.length) {
        const nextSymbols = getAssignableProgramSymbols(program, allocatedSymbols);

        if (!nextSymbols.length) {
          pendingSymbolAssignment = null;
          updateProgramAvailability();
          updateRunecastingPanel();
          roomStatus.textContent = `${program.name} needs another required sigil.`;
          return;
        }

        queueSymbolAssignment(
          programId,
          nextSymbols,
          `Choose sigil ${allocatedSymbols.length + 1}/${program.requirement.length} for ${program.name}.`,
          allocatedSymbols
        );
        return;
      }

      if (effect.type === "nextTurnExec") {
        const execAmount = Number.isFinite(effect.amount) ? effect.amount : 1;
        const currentExecAmount = Number.isFinite(effect.currentAmount) ? effect.currentAmount : 0;
        currentCastSymbols = markSymbolsSpent(currentCastSymbols, allocatedSymbols);
        consumeAllocatedGlyphs(allocatedSymbols);
        allocatedProgramSymbols = {
          ...allocatedProgramSymbols,
          [programId]: [...(allocatedProgramSymbols[programId] || []), ...allocatedSymbols],
        };
        character.nextTurnExecBonus += execAmount;
        executionRollsRemaining += currentExecAmount;
        startProgramCooldown(program);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        rollStatus.textContent = getExecutionStatusText(executionRollsRemaining);
        roomStatus.textContent =
          currentExecAmount > 0
            ? `${program.name} added ${currentExecAmount} temporary ${currentExecAmount === 1 ? "Execution" : "Executions"} now and will add ${execAmount} next turn.`
            : `${program.name} will add ${execAmount} temporary ${execAmount === 1 ? "Execution" : "Executions"} next turn.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.nextTurnExecResolved", { programId, execAmount, currentExecAmount, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "blinkStraight") {
        const blinkDistance = Number.isFinite(effect.distance) ? effect.distance : 2;
        const blinkTargetTileIds = getBlinkTargetTileIds(roomTiles, characterPositionId, getOccupiedEnemyTileIds(activeEnemies), blinkDistance);

        if (!blinkTargetTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = "BLINK has no valid straight-line target.";
          return;
        }

        currentCastSymbols = markSymbolsSpent(currentCastSymbols, allocatedSymbols);
        consumeAllocatedGlyphs(allocatedSymbols);
        allocatedProgramSymbols = {
          ...allocatedProgramSymbols,
          [programId]: [...(allocatedProgramSymbols[programId] || []), ...allocatedSymbols],
        };
        startProgramCooldown(program);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = true;
        pendingBlinkTargetTileIds = blinkTargetTileIds;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        gameLog("program.blinkTargeting", { targets: blinkTargetTileIds, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "healIntegrity") {
        const healAmount = Number.isFinite(effect.amount) ? effect.amount : 1;
        markProgramAllocated(programId, program, allocatedSymbols);
        character.stats.integrity = Math.min(character.stats.maxIntegrity, character.stats.integrity + healAmount);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `${program.name} restored ${healAmount} Integrity.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.rebuildResolved", getRoomDebugState());
        return;
      }

      if (effect.type === "resetOtherCooldowns") {
        Object.keys(programCooldowns).forEach((cooldownProgramId) => {
          if (cooldownProgramId !== programId) {
            delete programCooldowns[cooldownProgramId];
            cooldownLockedProgramIds.delete(cooldownProgramId);
          }
        });
        markProgramAllocated(programId, program, allocatedSymbols);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `${program.name} reset cooldowns on all other programs.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.cooldownsReset", { programId, cooldowns: { ...programCooldowns }, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "revealRiftThreads") {
        markProgramAllocated(programId, program, allocatedSymbols);
        const movedThreadCount = effect.moveThreadsCloser ? moveRiftThreadsCloserToPlayer() : 0;
        temporaryRevealTileIds = new Set(riftThreadTileIds.filter((tileId) => !collectedThreadTileIds.includes(tileId)));
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `${program.name} revealed ${temporaryRevealTileIds.size} Rift Thread ${temporaryRevealTileIds.size === 1 ? "hex" : "hexes"} and pulled ${movedThreadCount} closer.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.riftThreadsRevealed", { programId, revealedTileIds: [...temporaryRevealTileIds], movedThreadCount, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "sightRangeBonus") {
        const bonusAmount = Number.isFinite(effect.amount) ? effect.amount : 1;
        const playerTurns = Number.isFinite(effect.playerTurns) ? effect.playerTurns : 2;
        markProgramAllocated(programId, program, allocatedSymbols);
        sightRangeBonus = Math.max(sightRangeBonus, bonusAmount);
        sightRangeBonusTurnsRemaining = Math.max(sightRangeBonusTurnsRemaining, playerTurns);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `${program.name} increased sight range by ${bonusAmount} until the end of your next turn.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.sightRangeBonusResolved", { programId, bonusAmount, playerTurns, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "phaseThroughEnemies") {
        const playerTurns = Number.isFinite(effect.playerTurns) ? effect.playerTurns : 2;
        markProgramAllocated(programId, program, allocatedSymbols);
        phaseThroughEnemiesTurnsRemaining = Math.max(phaseThroughEnemiesTurnsRemaining, playerTurns);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `${program.name} lets you move through enemies until the end of your next turn.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.phaseThroughEnemiesResolved", { programId, playerTurns, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "phaseThroughWalls") {
        const playerTurns = Number.isFinite(effect.playerTurns) ? effect.playerTurns : 2;
        markProgramAllocated(programId, program, allocatedSymbols);
        phaseThroughWallsTurnsRemaining = Math.max(phaseThroughWallsTurnsRemaining, playerTurns);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `${program.name} lets you move and attack through walls until the end of your next turn.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.phaseThroughWallsResolved", { programId, playerTurns, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "temporaryExecBoost") {
        const amount = Number.isFinite(effect.amount) ? effect.amount : 1;
        const turns = Number.isFinite(effect.turns) ? effect.turns : 4;
        markProgramAllocated(programId, program, allocatedSymbols);
        executionRollsRemaining += amount;
        character.temporaryExecutionBoostAmount = Math.max(character.temporaryExecutionBoostAmount || 0, amount);
        character.temporaryExecutionBoostTurns = Math.max(character.temporaryExecutionBoostTurns || 0, turns);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        rollStatus.textContent = getExecutionStatusText(executionRollsRemaining);
        roomStatus.textContent = `${program.name} adds ${amount} Execution now and for the next ${turns} turns.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.temporaryExecBoostResolved", { programId, amount, turns, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "invertIncomingDamage") {
        const charges = Number.isFinite(effect.charges) ? effect.charges : 2;
        markProgramAllocated(programId, program, allocatedSymbols);
        character.damageInversionCharges = Math.max(character.damageInversionCharges || 0, charges);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `${program.name} will convert the next ${charges} damaging ${charges === 1 ? "attack" : "attacks"} into healing.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.damageInversionResolved", { programId, charges, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "stunAllEnemies") {
        const duration = Number.isFinite(effect.duration) ? effect.duration : 1;
        const livingEnemies = getLivingEnemies();
        markProgramAllocated(programId, program, allocatedSymbols);
        livingEnemies.forEach((enemy) => {
          enemy.stunnedTurns = Math.max(enemy.stunnedTurns || 0, duration);
        });
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `${program.name} stunned ${livingEnemies.length} ${livingEnemies.length === 1 ? "enemy" : "enemies"} for the next enemy turn.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.stunAllResolved", { programId, enemyIds: livingEnemies.map((enemy) => enemy.instanceId), state: getRoomDebugState() });
        return;
      }

      if (effect.type === "implodeVisible") {
        const visibleTileIds = new Set(getVisibleTileIds(roomTiles, characterPositionId));
        const targetEnemies = getLivingEnemies().filter((enemy) => visibleTileIds.has(enemy.positionId));

        if (!targetEnemies.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} found no enemies in view.`;
          return;
        }

        markProgramAllocated(programId, program, allocatedSymbols);
        const damageResults = resolveMultiEnemyProgramDamage(
          targetEnemies,
          (enemy) => enemy.stats.physicalDefense || 0,
          "physicalDefense",
          { ignoreDefense: true }
        );
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        damageResults.forEach((result) => showDamageIndicator(result.tileId, result.dealtDamage, "enemy"));
        roomStatus.textContent = `${program.name} damaged ${damageResults.length} visible ${damageResults.length === 1 ? "enemy" : "enemies"}.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        if (damageResults.some((result) => result.didLevelUp)) {
          window.setTimeout(showImmediateLevelReward, 120);
        }
        if (damageResults.some((result) => result.didDefeat) && !hasLivingEnemies()) {
          window.setTimeout(showAllDerezzedNotice, 160);
        }
        gameLog("program.implodeResolved", { programId, damageResults, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "blinkAnywhere") {
        const targetTileIds = roomTiles
          .filter((tile) => tile.id !== characterPositionId && !getOccupiedEnemyTileIds(activeEnemies).includes(tile.id))
          .map((tile) => tile.id);

        if (!targetTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} has no open hex to target.`;
          return;
        }

        markProgramAllocated(programId, program, allocatedSymbols);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = true;
        pendingBlinkTargetTileIds = targetTileIds;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `Choose any unoccupied hex for ${program.name}.`;
        gameLog("program.blinkAnywhereTargeting", { programId, targetCount: targetTileIds.length, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "manifestDieFace") {
        markProgramAllocated(programId, program, allocatedSymbols);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        showManifestDieFacePicker(program, allocatedSymbols);
        gameLog("program.manifestPickerOpened", { programId, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "entangleAdjacent") {
        const adjacentEnemyTileIds = getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges);

        if (!adjacentEnemyTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} requires at least one adjacent enemy.`;
          return;
        }

        const duration = Number.isFinite(effect.duration) ? effect.duration : 1;
        const entangledEnemies = adjacentEnemyTileIds
          .map((tileId) => getEnemyAtTile(activeEnemies, tileId))
          .filter(Boolean);

        entangledEnemies.forEach((enemy) => {
          enemy.accuracySuppressedTurns = Math.max(enemy.accuracySuppressedTurns || 0, duration);
        });
        markProgramAllocated(programId, program, allocatedSymbols);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        roomStatus.textContent = `${program.name} reduced ${entangledEnemies.length} adjacent ${entangledEnemies.length === 1 ? "enemy" : "enemies"} to 0% accuracy next turn.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.entangleResolved", { programId, targetEnemyIds: entangledEnemies.map((enemy) => enemy.instanceId), state: getRoomDebugState() });
        return;
      }

      if (effect.type === "deathTouchLine") {
        const lineDistance = Number.isFinite(effect.distance) ? effect.distance : 2;
        const lineTargetTileIds = getLineTargetTileIds(roomTiles, characterPositionId, lineDistance, [], {
          allowGaps: true,
          allowOccupied: true,
          ignoreWalls: phaseThroughWallsTurnsRemaining > 0,
          wallEdges: playerWallEdges,
        }).filter((tileId) => Boolean(getEnemyAtTile(activeEnemies, tileId)));

        if (!lineTargetTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} needs an enemy exactly ${lineDistance} spaces away in a straight line.`;
          return;
        }

        markProgramAllocated(programId, program, allocatedSymbols);
        isMoveMode = false;
        isPhysicalTargetMode = true;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = {
          programId,
          label: program.name,
          effectType: "deathTouchLine",
          targetTileIds: lineTargetTileIds,
          prompt: `Choose an enemy exactly ${lineDistance} spaces away in a straight line.`,
        };
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        return;
      }

      if (effect.type === "pushEnemy") {
        const pushableEnemyTileIds = getPushableEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges);

        if (!pushableEnemyTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} requires an adjacent enemy with an open hex behind it.`;
          return;
        }

        markProgramAllocated(programId, program, allocatedSymbols);
        isMoveMode = false;
        isPhysicalTargetMode = true;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = {
          programId,
          label: program.name,
          effectType: "pushEnemy",
          stunTurns: Number.isFinite(effect.stunTurns) ? effect.stunTurns : 1,
          targetTileIds: pushableEnemyTileIds,
          prompt: "Choose an adjacent enemy to push and stun.",
        };
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        return;
      }

      if (effect.type === "damageAdjacentAll") {
        const adjacentEnemyTileIds = getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges);

        if (!adjacentEnemyTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} requires at least one adjacent enemy.`;
          return;
        }

        const rawSelfDamage = Number.isFinite(effect.selfDamage) ? effect.selfDamage : 0;
        const selfDamage = character.damageShieldTurns > 0 ? 0 : rawSelfDamage;
        const damageEntries = getAdjacentAllDamageEntries(effect);
        const damagedEnemies = adjacentEnemyTileIds
          .map((tileId) => getEnemyAtTile(activeEnemies, tileId))
          .filter(Boolean)
          .map((enemy) => {
            const tileId = enemy.positionId;
            const results = damageEntries.map((entry) => dealEnemyIntegrityDamage(enemy, entry.amount, entry.defenseStat));

            return {
              enemy,
              tileId,
              results,
              result: {
                dealtDamage: results.reduce((total, result) => total + result.dealtDamage, 0),
                didDefeat: results.some((result) => result.didDefeat),
                didLevelUp: results.some((result) => result.didLevelUp),
              },
            };
          });
        const defeatedEnemies = damagedEnemies.filter((item) => item.result.didDefeat);
        const didLevelUp = damagedEnemies.some((item) => item.result.didLevelUp);

        markProgramAllocated(programId, program, allocatedSymbols);
        character.stats.integrity = Math.max(0, character.stats.integrity - selfDamage);
        isMoveMode = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        if (selfDamage > 0) {
          showDamageIndicator(characterPositionId, selfDamage, "player");
        }
        damagedEnemies.forEach((item) => showDamageIndicator(item.tileId, item.result.dealtDamage, "enemy"));
        roomStatus.textContent = rawSelfDamage > 0 && character.damageShieldTurns > 0
          ? `${program.name} self-damage was blocked by Mag Shield and hit ${damagedEnemies.length} adjacent ${damagedEnemies.length === 1 ? "enemy" : "enemies"}.`
          : selfDamage > 0
          ? `${program.name} cost ${selfDamage} Integrity and hit ${damagedEnemies.length} adjacent ${damagedEnemies.length === 1 ? "enemy" : "enemies"}.`
          : `${program.name} hit ${damagedEnemies.length} adjacent ${damagedEnemies.length === 1 ? "enemy" : "enemies"}.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        if (didLevelUp) {
          window.setTimeout(showImmediateLevelReward, 120);
        }
        if (defeatedEnemies.length && !hasLivingEnemies()) {
          window.setTimeout(showAllDerezzedNotice, didLevelUp ? 260 : 120);
        }
        if (character.stats.integrity <= 0) {
          window.setTimeout(() => showRunDeathPopup(`${program.name} consumed your last Integrity.`), 260);
        }
        gameLog("program.damageAdjacentAllResolved", { programId, selfDamage, damagedEnemies, state: getRoomDebugState() });
        return;
      }

      if (effect.type === "debuffDefense") {
        const adjacentEnemyTileIds = getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges);

        if (!adjacentEnemyTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = "SHATTER requires an adjacent enemy.";
          return;
        }

        currentCastSymbols = markSymbolsSpent(currentCastSymbols, allocatedSymbols);
        consumeAllocatedGlyphs(allocatedSymbols);
        allocatedProgramSymbols = {
          ...allocatedProgramSymbols,
          [programId]: [...(allocatedProgramSymbols[programId] || []), ...allocatedSymbols],
        };
        startProgramCooldown(program);
        isMoveMode = false;
        isPhysicalTargetMode = true;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = {
          programId,
          label: program.name,
          effectType: "debuffDefense",
          defenseReduction: Number.isFinite(effect.amount) ? effect.amount : 1,
          targetTileIds: adjacentEnemyTileIds,
          prompt: `Choose an adjacent enemy to reduce defenses by ${Number.isFinite(effect.amount) ? effect.amount : 1}.`,
        };
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        return;
      }

      if (effect.type === "confuseEnemy") {
        const adjacentEnemyTileIds = getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges);

        if (!adjacentEnemyTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} requires an adjacent enemy.`;
          return;
        }

        if (getLivingEnemies().length < 2) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} needs another Glitchspawn for the target to attack.`;
          return;
        }

        markProgramAllocated(programId, program, allocatedSymbols);
        isMoveMode = false;
        isPhysicalTargetMode = true;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = {
          programId,
          label: program.name,
          effectType: "confuseEnemy",
          duration: Number.isFinite(effect.duration) ? effect.duration : 1,
          targetTileIds: adjacentEnemyTileIds,
          prompt: `Choose an adjacent enemy to confuse for its next turn.`,
        };
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        return;
      }

      if (effect.type === "damageLineFalloff") {
        const maxDistance = Number.isFinite(effect.distance) ? effect.distance : 4;
        const targetTileIds = getLineFalloffTargetTileIds(maxDistance);

        if (!targetTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} has no valid straight-line target.`;
          return;
        }

        markProgramAllocated(programId, program, allocatedSymbols);
        isMoveMode = false;
        isPhysicalTargetMode = true;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = {
          programId,
          label: program.name,
          effectType: "damageLineFalloff",
          targetTileIds,
          damageType: effect.damageType === "physical" ? "physical" : "arcane",
          defenseStat: effect.damageType === "physical" ? "physicalDefense" : "arcaneDefense",
          damages: Array.isArray(effect.damages) ? effect.damages : [8, 6, 4, 2],
          distance: maxDistance,
          allowEmptyTarget: true,
          prompt: `Choose a hex in a straight line up to ${maxDistance} spaces away.`,
        };
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        return;
      }

      if (effect.type === "damageLine") {
        const lineDistance = Number.isFinite(effect.distance) ? effect.distance : 2;
        const lineTargetTileIds = getLineTargetTileIds(roomTiles, characterPositionId, lineDistance, [], {
          allowOccupied: true,
          ignoreWalls: Boolean(effect.ignoreWalls || effect.piercesWalls),
          wallEdges: playerWallEdges,
        });

        if (!lineTargetTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} has no valid straight-line target.`;
          return;
        }

        currentCastSymbols = markSymbolsSpent(currentCastSymbols, allocatedSymbols);
        consumeAllocatedGlyphs(allocatedSymbols);
        allocatedProgramSymbols = {
          ...allocatedProgramSymbols,
          [programId]: [...(allocatedProgramSymbols[programId] || []), ...allocatedSymbols],
        };
        startProgramCooldown(program);
        isMoveMode = false;
        isPhysicalTargetMode = true;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = Number.isFinite(effect.amount) ? effect.amount : 1;
        pendingAttack = {
          programId,
          label: program.name,
          damage: pendingPhysicalDamage,
          defenseStat: effect.damageType === "arcane" ? "arcaneDefense" : "physicalDefense",
          damageType: effect.damageType === "arcane" ? "arcane" : "physical",
          targetTileIds: lineTargetTileIds,
          revealTarget: Boolean(effect.revealTarget),
          allowEmptyTarget: true,
          prompt: `Choose a hex ${lineDistance} spaces away in a straight line.`,
        };
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        return;
      }

      if (effect.type === "damageRange") {
        const targetDistance = Number.isFinite(effect.distance) ? effect.distance : 2;
        const rangeTargetTileIds = getEnemyTileIdsAtRange(roomTiles, activeEnemies, characterPositionId, targetDistance, playerWallEdges);

        if (!rangeTargetTileIds.length) {
          updateProgramAvailability();
          updateRunecastingPanel();
          updateRoom();
          roomStatus.textContent = `${program.name} has no enemy exactly ${targetDistance} spaces away.`;
          return;
        }

        currentCastSymbols = markSymbolsSpent(currentCastSymbols, allocatedSymbols);
        consumeAllocatedGlyphs(allocatedSymbols);
        allocatedProgramSymbols = {
          ...allocatedProgramSymbols,
          [programId]: [...(allocatedProgramSymbols[programId] || []), ...allocatedSymbols],
        };
        startProgramCooldown(program);
        isMoveMode = false;
        isPhysicalTargetMode = true;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = Number.isFinite(effect.amount) ? effect.amount : 1;
        pendingAttack = {
          programId,
          label: program.name,
          damage: pendingPhysicalDamage,
          defenseStat: effect.damageType === "arcane" ? "arcaneDefense" : "physicalDefense",
          damageType: effect.damageType === "arcane" ? "arcane" : "physical",
          targetTileIds: rangeTargetTileIds,
          prompt: `Choose an enemy exactly ${targetDistance} spaces away.`,
        };
        roomStage.classList.remove("movement-active", "dragging");
        updateProgramAvailability();
        updateRunecastingPanel();
        updateRoom();
        return;
      }

      attackDamage = Number.isFinite(effect.amount) ? effect.amount : 1;
      damageType = effect.damageType === "physical" ? "physical" : "arcane";
      defenseStat = damageType === "physical" ? "physicalDefense" : "arcaneDefense";
      healAmount = Number.isFinite(effect.healAmount) ? effect.healAmount : 0;
      statusLabel = program.name;
    }

    if (!allocatedSymbols.length) {
      updateProgramAvailability();
      updateRunecastingPanel();
      return;
    }

    const adjacentEnemyTileIds = getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges);

    if (!adjacentEnemyTileIds.length) {
      isPhysicalTargetMode = false;
      pendingPhysicalDamage = 0;
      pendingAttack = null;
      pendingSymbolAssignment = null;
      updateRoom();
      roomStatus.textContent = "This program requires an adjacent enemy.";
      return;
    }

    currentCastSymbols = markSymbolsSpent(currentCastSymbols, allocatedSymbols);
    consumeAllocatedGlyphs(allocatedSymbols);
    allocatedProgramSymbols = {
      ...allocatedProgramSymbols,
      [programId]: [...(allocatedProgramSymbols[programId] || []), ...allocatedSymbols],
    };
    if (programId !== "physical-damage") {
      startProgramCooldown(getProgramById(programId));
    }
    isMoveMode = false;
    isPhysicalTargetMode = true;
    pendingPhysicalDamage = attackDamage;
    pendingAttack = {
      programId,
      label: statusLabel,
      damage: attackDamage,
      defenseStat,
      damageType,
      healAmount,
    };
    roomStage.classList.remove("movement-active", "dragging");
    updateProgramAvailability();
    updateRunecastingPanel();
    updateRoom();
    gameLog("program.attackTargeting", { programId, attackDamage, damageType, allocatedSymbols, state: getRoomDebugState() });
  }

  programListItems.addEventListener("click", (event) => {
    const programCard = event.target.closest("[data-program-id]");
    const programId = programCard?.dataset.programId;

    if (turnPhase !== "player" || !programCard || programCard.getAttribute("aria-disabled") === "true" || !Array.isArray(currentCastSymbols)) {
      return;
    }

    if (programId === "physical-damage") {
      const availableSymbols = currentCastSymbols.filter((symbol) => isUsableSigilSymbol(symbol) && !symbol.spent && !symbol.artifactInstanceId);

      if (!availableSymbols.length) {
        return;
      }

      if (!getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, getPlayerWallEdges()).length) {
        roomStatus.textContent = "Physical Damage requires an adjacent enemy.";
        return;
      }

      queueSymbolAssignment("physical-damage", availableSymbols, "Choose which rolled sigil to spend for Physical Damage.");
      return;
    }

    const program = getProgramById(programId);
    const effect = program?.effect || {};
    const playerWallEdges = getPlayerWallEdges();

    if (!program || !supportedProgramEffectTypes.includes(effect.type)) {
      return;
    }

    if (["damageAdjacent", "damageAdjacentAll", "entangleAdjacent"].includes(effect.type) && !getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges).length) {
      roomStatus.textContent = "This program requires an adjacent enemy.";
      return;
    }

    if (["debuffDefense", "confuseEnemy"].includes(effect.type) && !getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges).length) {
      roomStatus.textContent = `${program.name} requires an adjacent enemy.`;
      return;
    }

    if (effect.type === "pushEnemy" && !getPushableEnemyTileIds(roomTiles, activeEnemies, characterPositionId, playerWallEdges).length) {
      roomStatus.textContent = `${program.name} requires an adjacent enemy with an open hex behind it.`;
      return;
    }

    if (effect.type === "confuseEnemy" && getLivingEnemies().length < 2) {
      roomStatus.textContent = `${program.name} needs another Glitchspawn for the target to attack.`;
      return;
    }

    if (effect.type === "blinkStraight") {
      const blinkDistance = Number.isFinite(effect.distance) ? effect.distance : 2;

      if (!getBlinkTargetTileIds(roomTiles, characterPositionId, getOccupiedEnemyTileIds(activeEnemies), blinkDistance).length) {
        roomStatus.textContent = `${program.name} has no valid straight-line target.`;
        return;
      }
    }

    if (effect.type === "damageLine") {
      const lineDistance = Number.isFinite(effect.distance) ? effect.distance : 2;

      if (!getLineTargetTileIds(roomTiles, characterPositionId, lineDistance, [], {
          allowOccupied: true,
          ignoreWalls: Boolean(effect.ignoreWalls || effect.piercesWalls),
          wallEdges: playerWallEdges,
        }).length) {
        roomStatus.textContent = `${program.name} has no valid straight-line target.`;
        return;
      }
    }

    if (effect.type === "damageRange") {
      const targetDistance = Number.isFinite(effect.distance) ? effect.distance : 2;

      if (!getEnemyTileIdsAtRange(roomTiles, activeEnemies, characterPositionId, targetDistance, playerWallEdges).length) {
        roomStatus.textContent = `${program.name} has no enemy exactly ${targetDistance} spaces away.`;
        return;
      }
    }

    if (effect.type === "deathTouchLine") {
      const lineDistance = Number.isFinite(effect.distance) ? effect.distance : 2;
      const lineTargetTileIds = getLineTargetTileIds(roomTiles, characterPositionId, lineDistance, [], {
        allowGaps: true,
        allowOccupied: true,
        ignoreWalls: phaseThroughWallsTurnsRemaining > 0,
        wallEdges: playerWallEdges,
      }).filter((tileId) => Boolean(getEnemyAtTile(activeEnemies, tileId)));

      if (!lineTargetTileIds.length) {
        roomStatus.textContent = `${program.name} needs an enemy exactly ${lineDistance} spaces away in a straight line.`;
        return;
      }
    }

    if (effect.type === "implodeVisible") {
      const visibleTileIds = new Set(getVisibleTileIds(roomTiles, characterPositionId));

      if (!getLivingEnemies().some((enemy) => visibleTileIds.has(enemy.positionId))) {
        roomStatus.textContent = `${program.name} found no enemies in view.`;
        return;
      }
    }

    if (effect.type === "damageLineFalloff" && !getLineFalloffTargetTileIds(Number.isFinite(effect.distance) ? effect.distance : 4).length) {
      roomStatus.textContent = `${program.name} has no valid straight-line target.`;
      return;
    }

    if (effect.type === "blinkAnywhere" && !roomTiles.some((tile) => tile.id !== characterPositionId && !getOccupiedEnemyTileIds(activeEnemies).includes(tile.id))) {
      roomStatus.textContent = `${program.name} has no open hex to target.`;
      return;
    }

    if (!canCastProgram(program, getCastSymbolsWithGlyphs(), getLockedProgramIds())) {
      roomStatus.textContent = `${program.name} requires additional sigils.`;
      return;
    }

    const assignableSymbols = getAssignableProgramSymbols(program, []);

    if (!assignableSymbols.length) {
      updateProgramAvailability();
      updateRunecastingPanel();
      return;
    }

    queueSymbolAssignment(programId, assignableSymbols, `Choose sigil 1/${program.requirement.length} for ${program.name}.`);
  });

  rollResults.addEventListener("click", (event) => {
    const result = event.target.closest("[data-result-index]");

    if (!pendingSymbolAssignment || !result || turnPhase !== "player" || isRolling) {
      return;
    }

    const resultIndex = Number(result.dataset.resultIndex);

    if (!pendingSymbolAssignment.candidateResultIndices.has(resultIndex)) {
      return;
    }

    const selectedSymbol = currentCastSymbols.find((symbol) => symbol.resultIndex === resultIndex && !symbol.spent);

    if (!selectedSymbol) {
      return;
    }

    resolveAssignedProgram(pendingSymbolAssignment.programId, selectedSymbol);
  });

  rollOptions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-roll-slot]");

    if (
      turnPhase !== "player" ||
      !option ||
      !isRunecastingActive ||
      isRolling ||
      executionRollsRemaining <= 0 ||
      !Array.isArray(currentCastSymbols) ||
      !currentCastSymbols.length
    ) {
      return;
    }

    const slotIndex = Number(option.dataset.rollSlot);
    const symbol = currentCastSymbols.find((item) => item.slotIndex === slotIndex);

    if (!symbol || symbol.spent) {
      return;
    }

    const existingIndex = selectedRollSlots.indexOf(slotIndex);

    if (existingIndex >= 0) {
      selectedRollSlots.splice(existingIndex, 1);
    } else {
      selectedRollSlots.push(slotIndex);
      selectedRollSlots.sort((a, b) => a - b);
    }

    isPhysicalTargetMode = false;
    isBlinkTargetMode = false;
    pendingPhysicalDamage = 0;
    pendingAttack = null;
    pendingSymbolAssignment = null;
    updateProgramAvailability();
    rollStatus.textContent = getExecutionStatusText(executionRollsRemaining);
    updateRunecastingPanel();
  });

  rollConfirm.addEventListener("click", () => {
    const hasRollResults = Array.isArray(currentCastSymbols) && currentCastSymbols.length;
    const slotsToRoll = hasRollResults ? [...selectedRollSlots] : character.loadout.map((_, index) => index);

    if (
      turnPhase !== "player" ||
      !isRunecastingActive ||
      !slotsToRoll.length ||
      isRolling ||
      executionRollsRemaining <= 0
    ) {
      return;
    }

    gameLog("sigilCast.roll.begin", { selectedRollSlots: [...slotsToRoll], isReroll: hasRollResults, state: getRoomDebugState() });
    selectedRollSlots.length = 0;
    selectedRollSlots.push(...slotsToRoll);
    executionRollsRemaining -= 1;
    isRolling = true;
    rollConfirm.disabled = true;
    rollStatus.textContent = getExecutionStatusText(executionRollsRemaining);
    updateRunecastingPanel();
    updateRoom({ centerCamera: false });

    const finalResults = slotsToRoll.map((slotIndex) => rollDie(character.loadout[slotIndex]));
    const disruptiveEnemy = activeEnemies.find(
      (enemy) => enemy.id === "mindPhantom" && enemy.positionId && enemy.stats.integrity > 0
    );

    if (disruptiveEnemy && finalResults.length) {
      const disruptedResultIndex = Math.floor(Math.random() * finalResults.length);
      finalResults[disruptedResultIndex] = rollDie(character.loadout[slotsToRoll[disruptedResultIndex]]);
    }
    const pipCycleReward = getRollPipCycleReward(finalResults);
    const pipExecutionBonus = getRollPipExecutionBonus(finalResults);
    let ticks = 0;
    const rollTimer = window.setInterval(() => {
      ticks += 1;
      const temporaryResults = slotsToRoll.map((slotIndex) => rollDie(character.loadout[slotIndex]));
      updateRunecastingPanel(ticks < 12 ? temporaryResults : finalResults);

      if (ticks >= 12) {
        window.clearInterval(rollTimer);
        isRolling = false;
        isPhysicalTargetMode = false;
        isBlinkTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        if (hasRollResults) {
          currentCastSymbols = currentCastSymbols.map((symbol) => {
            const rolledSlotIndex = slotsToRoll.indexOf(symbol.slotIndex);

            if (rolledSlotIndex < 0 || symbol.spent) {
              return symbol;
            }

            return {
              ...symbol,
              element: finalResults[rolledSlotIndex]?.sigil?.element || null,
              face: finalResults[rolledSlotIndex]?.sigil?.face || null,
              faceIndex: finalResults[rolledSlotIndex]?.faceIndex ?? null,
              pips: finalResults[rolledSlotIndex]?.pips || [],
              blank: !finalResults[rolledSlotIndex]?.sigil,
            };
          });
        } else {
          currentCastSymbols = getCastSymbols(character, slotsToRoll, finalResults);
          allocatedProgramSymbols = {};
        }
        selectedRollSlots.length = 0;
        if (pipCycleReward > 0) {
          character.cycles += pipCycleReward;
          document.querySelector(".cycle-panel").outerHTML = renderCyclePanel(
            character.cycles,
            getLevelCycleReward(turnNumber, levelCycleMaxTurns),
            turnNumber,
            levelCycleMaxTurns
          );
        }
        if (pipExecutionBonus > 0) {
          executionRollsRemaining += pipExecutionBonus;
        }

        if (!hasUsableCastSymbols()) {
          const noUsableStatus =
            executionRollsRemaining > 0
              ? "No usable sigils rolled. Select blank dice to reroll with remaining Executions."
              : "No usable sigils rolled. Executions spent for this Sigil-Cast.";
          const pipStatus = [
            pipCycleReward > 0 ? `Cycles Pip gained +${pipCycleReward} Cycles.` : "",
            pipExecutionBonus > 0 ? `Arcane Pip added +${pipExecutionBonus} Execution${pipExecutionBonus === 1 ? "" : "s"}.` : "",
          ].filter(Boolean).join(" ");
          roomStatus.textContent = pipStatus ? `${noUsableStatus} ${pipStatus}` : noUsableStatus;
          gameLog("sigilCast.noUsableSymbols", {
            selectedRollSlots: [...slotsToRoll],
            finalResults,
            isReroll: hasRollResults,
            executionRollsRemaining,
            state: getRoomDebugState(),
          });
          if (executionRollsRemaining <= 0) {
            exhaustRunecastingKeepResults(noUsableStatus);
          }
        }

        updateProgramAvailability();
        updateRunecastingPanel(finalResults);
        if (pipCycleReward > 0) {
          showCyclePipIndicators(finalResults, slotsToRoll);
        }
        rollStatus.textContent = getExecutionStatusText(executionRollsRemaining);
        if ((pipCycleReward > 0 || pipExecutionBonus > 0) && hasUsableCastSymbols()) {
          roomStatus.textContent = [
            pipCycleReward > 0 ? `Cycles Pip gained +${pipCycleReward} Cycles.` : "",
            pipExecutionBonus > 0 ? `Arcane Pip added +${pipExecutionBonus} Execution${pipExecutionBonus === 1 ? "" : "s"}.` : "",
          ].filter(Boolean).join(" ");
        }
        gameLog("sigilCast.roll.complete", {
          selectedRollSlots: [...slotsToRoll],
          finalResults,
          pipCycleReward,
          pipExecutionBonus,
          isReroll: hasRollResults,
          disruptedBy: disruptiveEnemy?.instanceId || null,
          state: getRoomDebugState(),
        });
      }
    }, 90);
  });

  roomGrid.addEventListener("click", async (event) => {
    if (suppressTileClick) {
      suppressTileClick = false;
      return;
    }

    const tileButton = event.target.closest("[data-tile-id]");

    if (turnPhase !== "player") {
      return;
    }

    if (tileButton && isBlinkTargetMode) {
      const tileId = tileButton.dataset.tileId;
      const blinkTargetTileIds = pendingBlinkTargetTileIds;

      if (!blinkTargetTileIds.includes(tileId)) {
        return;
      }

      characterPositionId = tileId;
      isBlinkTargetMode = false;
      pendingBlinkTargetTileIds = [];
      isPhysicalTargetMode = false;
      pendingPhysicalDamage = 0;
      pendingAttack = null;
      pendingSymbolAssignment = null;
      roomStage.classList.remove("movement-active", "dragging");
      const entryStatus = resolvePlayerTileEntry();
      updateRoom();
      roomStatus.textContent = entryStatus || "BLINK relocated the Sigilant.";
      finishLevelIfComplete(entryStatus);
      finishRunecastingIfNoOptions(roomStatus.textContent);
      return;
    }

    if (tileButton && pendingAttack) {
      const tileId = tileButton.dataset.tileId;
      const targetableEnemyTileIds = pendingAttack.targetTileIds || getAdjacentEnemyTileIds(roomTiles, activeEnemies, characterPositionId, getPlayerWallEdges());

      if (!targetableEnemyTileIds.includes(tileId)) {
        return;
      }

      const targetEnemy = getEnemyAtTile(activeEnemies, tileId);

      if (!targetEnemy && !pendingAttack.allowEmptyTarget) {
        return;
      }

      if (!targetEnemy && pendingAttack.allowEmptyTarget && pendingAttack.effectType !== "damageLineFalloff") {
        const revealStatus = `${pendingAttack.label} revealed the target space, but hit no enemy.`;
        isPhysicalTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        updateRoom();
        roomStatus.textContent = revealStatus;
        finishRunecastingIfNoOptions(revealStatus);
        return;
      }

      if (pendingAttack.effectType === "debuffDefense") {
        const reduction = pendingAttack.defenseReduction || 1;
        targetEnemy.stats.physicalDefense = Math.max(0, targetEnemy.stats.physicalDefense - reduction);
        targetEnemy.stats.arcaneDefense = Math.max(0, targetEnemy.stats.arcaneDefense - reduction);
        isPhysicalTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        updateRoom();
        roomStatus.textContent = `${targetEnemy.name} defenses reduced by ${reduction}.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("combat.defenseReduced", {
          targetEnemyId: targetEnemy.instanceId,
          reduction,
          state: getRoomDebugState(),
        });
        return;
      }

      if (pendingAttack.effectType === "confuseEnemy") {
        targetEnemy.confusedTurns = Math.max(targetEnemy.confusedTurns || 0, pendingAttack.duration || 1);
        isPhysicalTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        updateRoom();
        roomStatus.textContent = `${targetEnemy.name} is confused and will attack another Glitchspawn next turn.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.enemyConfused", {
          targetEnemyId: targetEnemy.instanceId,
          state: getRoomDebugState(),
        });
        return;
      }

      if (pendingAttack.effectType === "pushEnemy") {
        const destinationTileId = getPushDestinationTileId(
          roomTiles,
          characterPositionId,
          targetEnemy.positionId,
          getOccupiedEnemyTileIds(activeEnemies),
          wallEdges
        );

        if (!destinationTileId) {
          return;
        }

        targetEnemy.positionId = destinationTileId;
        targetEnemy.stunnedTurns = Math.max(targetEnemy.stunnedTurns || 0, pendingAttack.stunTurns || 1);
        isPhysicalTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        updateRoom();
        roomStatus.textContent = `${targetEnemy.name} was pushed back and stunned for its next turn.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        gameLog("program.enemyPushed", {
          targetEnemyId: targetEnemy.instanceId,
          destinationTileId,
          state: getRoomDebugState(),
        });
        return;
      }

      if (pendingAttack.effectType === "deathTouchLine") {
        const enemyXp = targetEnemy.xpValue;
        const enemyName = targetEnemy.name;
        const attackLabel = pendingAttack.label;
        const defeatedTileId = targetEnemy.positionId;
        const previousCharacterRect = captureCharacterTokenRect();
        const didLevelUp = addCharacterXp(character, enemyXp);

        targetEnemy.stats.integrity = 0;
        recordEnemyKill(targetEnemy);
        maybeDropCycles(defeatedTileId, targetEnemy);
        targetEnemy.positionId = null;
        targetEnemy.confusedTurns = 0;
        targetEnemy.stunnedTurns = 0;
        targetEnemy.accuracySuppressedTurns = 0;
        targetEnemy.proximityAttackedThisTurn = false;
        characterPositionId = tileId;
        exploredTileIds.add(tileId);
        isPhysicalTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        updateRoom({ centerCamera: false });
        await animateCharacterMovement(previousCharacterRect);
        centerCameraOnTile(characterPositionId);
        updateCamera();
        const entryStatus = resolvePlayerTileEntry();
        updateRoom();
        roomStatus.textContent = `${attackLabel} destroyed ${enemyName}. +${enemyXp} XP.`;
        if (entryStatus) {
          roomStatus.textContent += ` ${entryStatus}`;
        }
        finishLevelIfComplete(entryStatus);
        finishRunecastingIfNoOptions(roomStatus.textContent);
        if (didLevelUp) {
          window.setTimeout(showImmediateLevelReward, 120);
        }
        if (!hasLivingEnemies()) {
          window.setTimeout(showAllDerezzedNotice, didLevelUp ? 260 : 120);
        }
        gameLog("program.deathTouchResolved", {
          targetEnemyId: targetEnemy.instanceId,
          destinationTileId: tileId,
          state: getRoomDebugState(),
        });
        return;
      }

      if (pendingAttack.effectType === "damageLineFalloff") {
        const pathTileIds = getLinePathToTile(tileId, pendingAttack.distance || 4);
        const damageResults = pathTileIds
          .map((pathTileId, index) => {
            const enemy = getEnemyAtTile(activeEnemies, pathTileId);

            return enemy
              ? resolveProgramEnemyDamage(enemy, pendingAttack.damages[index] || 0, pendingAttack.defenseStat)
              : null;
          })
          .filter(Boolean);
        const damageLabel = pendingAttack.label;
        const damageType = pendingAttack.damageType;

        isPhysicalTargetMode = false;
        pendingPhysicalDamage = 0;
        pendingAttack = null;
        pendingSymbolAssignment = null;
        updateRoom();
        damageResults.forEach((result) => showDamageIndicator(result.tileId, result.dealtDamage, "enemy"));
        roomStatus.textContent = damageResults.length
          ? `${damageLabel} hit ${damageResults.length} ${damageResults.length === 1 ? "enemy" : "enemies"} with ${damageType} falloff damage.`
          : `${damageLabel} fired down the line but hit no enemies.`;
        finishRunecastingIfNoOptions(roomStatus.textContent);
        if (damageResults.some((result) => result.didLevelUp)) {
          window.setTimeout(showImmediateLevelReward, 120);
        }
        if (damageResults.some((result) => result.didDefeat) && !hasLivingEnemies()) {
          window.setTimeout(showAllDerezzedNotice, 160);
        }
        gameLog("program.damageLineFalloffResolved", { damageLabel, targetTileId: tileId, damageResults, state: getRoomDebugState() });
        return;
      }

      const dealtDamage = Math.max(0, pendingAttack.damage - (targetEnemy.stats[pendingAttack.defenseStat] || 0));
      const enemyIntegrityBeforeDamage = targetEnemy.stats.integrity;
      targetEnemy.stats.integrity = Math.max(0, targetEnemy.stats.integrity - dealtDamage);
      const damageLabel = pendingAttack.label;
      const damageType = pendingAttack.damageType;
      const healAmount = pendingAttack.healAmount || 0;
      const artifactToConsume = pendingAttack.consumeArtifactUse
        ? (character.artifacts || []).find((artifact) => (artifact.instanceId || artifact.id) === pendingAttack.artifactInstanceId)
        : null;
      const integrityBeforeHeal = character.stats.integrity;
      isPhysicalTargetMode = false;
      pendingPhysicalDamage = 0;
      pendingAttack = null;
      pendingSymbolAssignment = null;
      let damageStatus;
      let didLevelUp = false;

      if (enemyIntegrityBeforeDamage > 0 && targetEnemy.stats.integrity <= 0) {
        const defeatedTileId = targetEnemy.positionId;
        didLevelUp = addCharacterXp(character, targetEnemy.xpValue);
        recordEnemyKill(targetEnemy);
        maybeDropCycles(defeatedTileId, targetEnemy);
        targetEnemy.positionId = null;
        targetEnemy.stunnedTurns = 0;
        targetEnemy.proximityAttackedThisTurn = false;
        damageStatus = `${damageLabel} dealt ${dealtDamage} ${damageType} damage. ${targetEnemy.name} derezzed. +${targetEnemy.xpValue} XP.`;
        if (didLevelUp) {
          damageStatus += ` Level ${character.progression.level} reached.`;
        }
      } else {
        damageStatus = `${damageLabel} dealt ${dealtDamage} ${damageType} damage after defense.`;
      }

      if (healAmount > 0) {
        character.stats.integrity = Math.min(character.stats.maxIntegrity, character.stats.integrity + healAmount);
        const healedIntegrity = character.stats.integrity - integrityBeforeHeal;
        damageStatus += ` Healed ${healedIntegrity} Integrity.`;
      }
      if (artifactToConsume) {
        consumeArtifactUse(artifactToConsume);
      }

      updateRoom();
      showDamageIndicator(tileId, dealtDamage, "enemy");
      roomStatus.textContent = damageStatus;
      finishRunecastingIfNoOptions(damageStatus);
      if (didLevelUp) {
        window.setTimeout(showImmediateLevelReward, 120);
      }
      if (!hasLivingEnemies()) {
        window.setTimeout(showAllDerezzedNotice, didLevelUp ? 260 : 120);
      }
      gameLog("combat.damageResolved", {
        targetEnemyId: targetEnemy.instanceId,
        damageLabel,
        dealtDamage,
        damageType,
        targetIntegrityBefore: enemyIntegrityBeforeDamage,
        targetIntegrityAfter: targetEnemy.stats.integrity,
        status: damageStatus,
        state: getRoomDebugState(),
      });
      return;
    }

    if (!tileButton || !isMoveMode) {
      return;
    }

    const tileId = tileButton.dataset.tileId;
    const movementRange = actionPointsRemaining * getMoveActionStepValue();
    const occupiedEnemyTileIds = getOccupiedEnemyTileIds(activeEnemies);

    if (occupiedEnemyTileIds.includes(tileId)) {
      return;
    }

    const movementPath = getMovementPathToTile(
      roomTiles,
      characterPositionId,
      tileId,
      movementRange,
      phaseThroughEnemiesTurnsRemaining > 0 ? [] : occupiedEnemyTileIds,
      getPlayerWallEdges()
    );
    const reachableTileIds = getReachableTileIds(
      roomTiles,
      characterPositionId,
      movementRange,
      phaseThroughEnemiesTurnsRemaining > 0 ? [] : occupiedEnemyTileIds,
      getPlayerWallEdges()
    ).filter((reachableTileId) => !occupiedEnemyTileIds.includes(reachableTileId));

    if (!reachableTileIds.includes(tileId) || !movementPath.length) {
      return;
    }

    const previousCharacterRect = captureCharacterTokenRect();
    characterPositionId = tileId;
    actionPointsRemaining = Math.max(0, actionPointsRemaining - Math.ceil(movementPath.length / getMoveActionStepValue()));
    isMoveMode = false;
    suppressTileClick = false;
    isBlinkTargetMode = false;
    roomStage.classList.toggle("movement-active", isMoveMode);
    roomStage.classList.remove("dragging");
    updateRoom({ centerCamera: false });
    await animateCharacterMovement(previousCharacterRect, movementPath);
    centerCameraOnTile(characterPositionId);
    updateCamera();
    const entryStatus = resolvePlayerTileEntry();
    const proximityStatus = resolveProximityEnemyAttacks();
    updateRoom();
    if (proximityStatus?.incomingDamage > 0) {
      showDamageIndicator(characterPositionId, proximityStatus.incomingDamage, "player");
    }
    const movementStatus = [entryStatus, proximityStatus?.status].filter(Boolean).join(" ");
    if (movementStatus) {
      roomStatus.textContent = movementStatus;
    }
    if (character.stats.integrity <= 0) {
      window.setTimeout(() => showRunDeathPopup(proximityStatus?.status || "Integrity depleted."), 260);
      return;
    }
    finishLevelIfComplete(entryStatus);
    gameLog("player.moved", { tileId, entryStatus, proximityStatus, state: getRoomDebugState() });
  });

  updateRunecastingPanel();
  updateRoom();
  window.addEventListener("resize", updateCamera);
}

function renderCraftedDieFaces(customFaces, selectedElement = "") {
  return Array.from({ length: customDieFaceCount }, (_, index) => {
    const sigil = customFaces[index];
    const die = sigil ? getDieById(sigil.element) : null;

    return `
      <button class="craft-face ${sigil ? "filled" : "empty"} ${sigil?.preset ? "preset" : ""}" type="button" data-face-index="${index}" style="--die-accent: ${die?.accent || "#f6f8ff"}" aria-label="Die face ${index + 1}">
        ${sigil ? `<img src="${die.files[sigil.face || 1]}" alt="${die.name} common sigil">` : `<span>${selectedElement ? "Drop" : "Empty"}</span>`}
        <small>${sigil?.preset ? "Preset" : index + 1}</small>
      </button>
    `;
  }).join("");
}

function renderSigilCraftOptions(customFaces, selectedElement = "") {
  return dice
    .map((die) => {
      const placedCount = customFaces.filter((sigil) => sigil?.element === die.id).length;
      const isAtLimit = placedCount >= 2;
      const isSelected = selectedElement === die.id;

      return `
        <button class="sigil-craft-option ${isSelected ? "selected" : ""}" type="button" draggable="${isAtLimit ? "false" : "true"}" data-sigil-element="${die.id}" style="--die-accent: ${die.accent}" ${isAtLimit ? "disabled" : ""} aria-pressed="${isSelected}">
          <img src="${die.files[1]}" alt="${die.name} common sigil">
          <span>${die.name}</span>
          <small>${placedCount}/2</small>
        </button>
      `;
    })
    .join("");
}

function renderSigilCrafting(customFaces, selectedElement = "") {
  const filledCount = customFaces.filter(Boolean).length;

  return `
    <div class="sigil-craft-board">
      <div class="crafted-die" id="crafted-die" aria-label="Custom starting die">
        ${renderCraftedDieFaces(customFaces, selectedElement)}
      </div>
      <div class="sigil-craft-bank" id="sigil-craft-bank" aria-label="Common sigils">
        ${renderSigilCraftOptions(customFaces, selectedElement)}
      </div>
      <p class="craft-count">${filledCount}/${startingCustomFaceLimit} faces assigned. Choose common sigils; no more than 2 copies of one element.</p>
    </div>
  `;
}

function renderCraftingSigilToken(sigil, attributes = "") {
  const die = getDieById(sigil?.element);

  if (!sigil || !die) {
    return `<span class="crafting-empty-label">Empty</span>`;
  }

  return `
    <span class="crafting-sigil-token" style="--die-accent: ${die.accent}" ${attributes}>
      <img src="${die.files[sigil.face || 1]}" alt="${die.name} ${sigilRarityLabels[sigil.face || 1]} sigil">
      <span>${die.name}</span>
      <small>${sigilRarityLabels[sigil.face || 1]}</small>
    </span>
  `;
}

function renderPipMarker(pip, attributes = "") {
  const definition = getPipDefinition(pip?.type);

  if (!definition) {
    return "";
  }

  return `<span class="pip-marker ${definition.className}" title="${definition.label}" aria-label="${definition.name}" ${attributes}></span>`;
}

function renderPipToken(pip, attributes = "") {
  const definition = getPipDefinition(pip?.type);

  if (!definition) {
    return `<span class="crafting-empty-label">Empty</span>`;
  }

  return `
    <span class="crafting-pip-token" ${attributes}>
      ${renderPipMarker(pip)}
      <span>${definition.name}</span>
      <small>${definition.label}</small>
    </span>
  `;
}

function renderCraftingDatabank(character, selectedCraftSource = null) {
  const inventory = character.sigilInventory || [];
  const pipInventory = character.pipInventory || [];

  return `
    <section class="crafting-databank" aria-labelledby="crafting-databank-title" data-crafting-inventory-target="true">
      <div class="section-heading">
        <h3 id="crafting-databank-title">Databank</h3>
      </div>
      <div class="crafting-inventory-grid">
        ${
          inventory.length
            ? inventory
                .map((sigil, index) => {
                  const isSelected = selectedCraftSource?.type === "inventory" && selectedCraftSource.index === index;

                  return `
                    <button class="crafting-inventory-sigil ${isSelected ? "selected" : ""}" type="button" draggable="true" data-crafting-source="inventory" data-inventory-index="${index}" aria-pressed="${isSelected}">
                      ${renderCraftingSigilToken(sigil)}
                    </button>
                  `;
                })
                .join("")
            : `<p class="crafting-empty-bank">No loose sigils stored.</p>`
        }
      </div>
      <div class="section-heading pip-heading">
        <h3>Pips</h3>
      </div>
      <div class="crafting-inventory-grid pip-inventory-grid" data-crafting-pip-inventory-target="true">
        ${
          pipInventory.length
            ? pipInventory
                .map((pip, index) => {
                  const isSelected = selectedCraftSource?.type === "pipInventory" && selectedCraftSource.index === index;

                  return `
                    <button class="crafting-inventory-sigil crafting-inventory-pip ${isSelected ? "selected" : ""}" type="button" draggable="true" data-crafting-source="pipInventory" data-pip-index="${index}" aria-pressed="${isSelected}">
                      ${renderPipToken(pip)}
                    </button>
                  `;
                })
                .join("")
            : `<p class="crafting-empty-bank">No loose pips stored.</p>`
        }
      </div>
    </section>
  `;
}

function renderCraftingDice(character, selectedCraftSource = null) {
  return `
    <section class="crafting-dice" aria-labelledby="crafting-dice-title">
      <div class="section-heading">
        <h3 id="crafting-dice-title">Dice</h3>
      </div>
      <div class="crafting-dice-grid">
        ${(character.loadout || [])
          .map((loadoutDie, dieIndex) => {
            const isCustom = typeof loadoutDie !== "string" && loadoutDie?.type === "custom";
            const faces = getLoadoutDieFaces(loadoutDie);
            const rawFaces = getLoadoutDieRawFaces(loadoutDie);

            return `
              <article class="crafting-die-card ${isCustom ? "" : "locked"}">
                <header>
                  <strong>Die ${dieIndex + 1}</strong>
                  <small>${isCustom ? "Custom" : "Fixed"}</small>
                </header>
                <div class="crafting-face-grid">
                  ${faces
                    .map((sigil, faceIndex) => {
                      const die = sigil ? getDieById(sigil.element) : null;
                      const facePip = rawFaces[faceIndex]?.pips?.[0] || null;
                      const isSelected =
                        selectedCraftSource?.type === "face" &&
                        selectedCraftSource.dieIndex === dieIndex &&
                        selectedCraftSource.faceIndex === faceIndex;
                      const isPipSelected =
                        selectedCraftSource?.type === "facePip" &&
                        selectedCraftSource.dieIndex === dieIndex &&
                        selectedCraftSource.faceIndex === faceIndex;

                      return `
                        <button class="craft-face crafting-face ${sigil ? "filled" : "empty"} ${isSelected ? "selected" : ""}" type="button" ${isCustom ? `draggable="${sigil ? "true" : "false"}" data-crafting-target="face" data-crafting-source="${sigil ? "face" : ""}" data-die-index="${dieIndex}" data-face-index="${faceIndex}"` : "disabled"} style="--die-accent: ${die?.accent || "#f6f8ff"}" aria-label="Die ${dieIndex + 1} face ${faceIndex + 1}">
                          <span class="crafting-face-pip-slot ${facePip ? "filled" : ""} ${isPipSelected ? "selected" : ""}" ${isCustom ? `draggable="${facePip ? "true" : "false"}" data-crafting-target="facePip" data-crafting-source="${facePip ? "facePip" : ""}" data-die-index="${dieIndex}" data-face-index="${faceIndex}"` : ""}>
                            ${facePip ? renderPipMarker(facePip) : ""}
                          </span>
                          ${sigil ? `<img src="${die.files[sigil.face || 1]}" alt="${die.name} sigil">` : `<span>Empty</span>`}
                          <small>${faceIndex + 1}</small>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function getCraftingSigilSource(character, source) {
  if (!source) {
    return null;
  }

  if (source.type === "inventory") {
    return character.sigilInventory?.[source.index] || null;
  }

  if (source.type === "face") {
    const loadoutDie = character.loadout?.[source.dieIndex];
    return loadoutDie?.type === "custom" ? loadoutDie.faces?.[source.faceIndex] || null : null;
  }

  return null;
}

function getCraftingPipSource(character, source) {
  if (!source) {
    return null;
  }

  if (source.type === "pipInventory") {
    return character.pipInventory?.[source.index] || null;
  }

  if (source.type === "facePip") {
    const loadoutDie = character.loadout?.[source.dieIndex];
    const face = loadoutDie?.type === "custom" ? loadoutDie.faces?.[source.faceIndex] || null : null;
    return face?.pips?.[0] || null;
  }

  return null;
}

function setCraftingSigilSource(character, source, sigil) {
  if (source.type === "inventory") {
    character.sigilInventory = character.sigilInventory || [];

    if (sigil) {
      character.sigilInventory[source.index] = sigil;
    } else {
      character.sigilInventory.splice(source.index, 1);
    }

    return true;
  }

  if (source.type === "face") {
    const loadoutDie = character.loadout?.[source.dieIndex];

    if (!loadoutDie || loadoutDie.type !== "custom") {
      return false;
    }

    loadoutDie.faces = Array.from({ length: getCustomDieSideCount(loadoutDie) }, (_, index) => loadoutDie.faces?.[index] || null);
    if (source.faceIndex < 0 || source.faceIndex >= loadoutDie.faces.length) {
      return false;
    }

    const existingPips = loadoutDie.faces[source.faceIndex]?.pips || [];
    loadoutDie.faces[source.faceIndex] = sigil
      ? { element: sigil.element, face: sigil.face || 1, ...(existingPips.length ? { pips: existingPips } : {}) }
      : existingPips.length
        ? { pips: existingPips }
        : null;
    return true;
  }

  return false;
}

function setCraftingPipSource(character, source, pip) {
  if (source.type === "pipInventory") {
    character.pipInventory = character.pipInventory || [];

    if (pip) {
      character.pipInventory[source.index] = pip;
    } else {
      character.pipInventory.splice(source.index, 1);
    }

    return true;
  }

  if (source.type === "facePip") {
    const loadoutDie = character.loadout?.[source.dieIndex];

    if (!loadoutDie || loadoutDie.type !== "custom") {
      return false;
    }

    loadoutDie.faces = Array.from({ length: getCustomDieSideCount(loadoutDie) }, (_, index) => loadoutDie.faces?.[index] || null);
    if (source.faceIndex < 0 || source.faceIndex >= loadoutDie.faces.length) {
      return false;
    }

    const existingFace = loadoutDie.faces[source.faceIndex] || {};
    loadoutDie.faces[source.faceIndex] = pip
      ? { ...existingFace, pips: [pip] }
      : existingFace.element
        ? { element: existingFace.element, face: existingFace.face || 1 }
        : null;
    return true;
  }

  return false;
}

function moveCraftingSigil(character, source, target) {
  const sourceSigil = getCraftingSigilSource(character, source);

  if (!sourceSigil || !target) {
    return false;
  }

  if (
    source.type === target.type &&
    source.index === target.index &&
    source.dieIndex === target.dieIndex &&
    source.faceIndex === target.faceIndex
  ) {
    return false;
  }

  if (target.type === "inventory") {
    setCraftingSigilSource(character, source, null);
    character.sigilInventory = character.sigilInventory || [];
    character.sigilInventory.push(sourceSigil);
    return true;
  }

  const targetSigil = getCraftingSigilSource(character, target);
  setCraftingSigilSource(character, target, sourceSigil);
  setCraftingSigilSource(character, source, targetSigil || null);
  return true;
}

function moveCraftingPip(character, source, target) {
  const sourcePip = getCraftingPipSource(character, source);

  if (!sourcePip || !target || !["pipInventory", "facePip"].includes(target.type)) {
    return false;
  }

  if (
    source.type === target.type &&
    source.index === target.index &&
    source.dieIndex === target.dieIndex &&
    source.faceIndex === target.faceIndex
  ) {
    return false;
  }

  if (target.type === "pipInventory") {
    setCraftingPipSource(character, source, null);
    character.pipInventory = character.pipInventory || [];
    character.pipInventory.push(sourcePip);
    return true;
  }

  const targetPip = getCraftingPipSource(character, target);
  setCraftingPipSource(character, target, sourcePip);
  setCraftingPipSource(character, source, targetPip || null);
  return true;
}

function moveCraftingItem(character, source, target) {
  if (source?.type === "pipInventory" || source?.type === "facePip") {
    return moveCraftingPip(character, source, target);
  }

  if (!["inventory", "face"].includes(target?.type)) {
    return false;
  }

  return moveCraftingSigil(character, source, target);
}

function getCraftingSourceFromElement(element) {
  const pipInventorySource = element.closest("[data-crafting-source='pipInventory']");
  const facePipSource = element.closest("[data-crafting-source='facePip']");
  const inventorySource = element.closest("[data-crafting-source='inventory']");
  const faceSource = element.closest("[data-crafting-source='face']");

  if (pipInventorySource) {
    return { type: "pipInventory", index: Number(pipInventorySource.dataset.pipIndex) };
  }

  if (facePipSource) {
    return {
      type: "facePip",
      dieIndex: Number(facePipSource.dataset.dieIndex),
      faceIndex: Number(facePipSource.dataset.faceIndex),
    };
  }

  if (inventorySource) {
    return { type: "inventory", index: Number(inventorySource.dataset.inventoryIndex) };
  }

  if (faceSource) {
    return {
      type: "face",
      dieIndex: Number(faceSource.dataset.dieIndex),
      faceIndex: Number(faceSource.dataset.faceIndex),
    };
  }

  return null;
}

function getCraftingTargetFromElement(element) {
  const facePipTarget = element.closest("[data-crafting-target='facePip']");
  const faceTarget = element.closest("[data-crafting-target='face']");

  if (facePipTarget) {
    return {
      type: "facePip",
      dieIndex: Number(facePipTarget.dataset.dieIndex),
      faceIndex: Number(facePipTarget.dataset.faceIndex),
    };
  }

  if (faceTarget) {
    return {
      type: "face",
      dieIndex: Number(faceTarget.dataset.dieIndex),
      faceIndex: Number(faceTarget.dataset.faceIndex),
    };
  }

  if (element.closest("[data-crafting-pip-inventory-target]")) {
    return { type: "pipInventory" };
  }

  if (element.closest("[data-crafting-inventory-target]")) {
    return { type: "inventory" };
  }

  return null;
}

function isSameCraftingSource(a, b) {
  return (
    a?.type === b?.type &&
    a?.index === b?.index &&
    a?.dieIndex === b?.dieIndex &&
    a?.faceIndex === b?.faceIndex
  );
}

function bindCraftingWorkbench({ workbench, character, getSelectedCraftSource, setSelectedCraftSource, renderWorkbench }) {
  workbench.addEventListener("click", (event) => {
    const target = getCraftingTargetFromElement(event.target);
    const source = getCraftingSourceFromElement(event.target);
    const selectedCraftSource = getSelectedCraftSource();

    if (!selectedCraftSource && source) {
      setSelectedCraftSource(source);
      renderWorkbench();
      return;
    }

    if (selectedCraftSource && source && isSameCraftingSource(selectedCraftSource, source)) {
      setSelectedCraftSource(null);
      renderWorkbench();
      return;
    }

    if (selectedCraftSource && target) {
      moveCraftingItem(character, selectedCraftSource, target);
      setSelectedCraftSource(null);
      renderWorkbench();
      return;
    }

    setSelectedCraftSource(null);
    renderWorkbench();
  });

  workbench.addEventListener("dragstart", (event) => {
    const source = getCraftingSourceFromElement(event.target);

    if (!source) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData("application/json", JSON.stringify(source));
    event.dataTransfer.effectAllowed = "move";
  });

  workbench.addEventListener("dragover", (event) => {
    if (getCraftingTargetFromElement(event.target)) {
      event.preventDefault();
    }
  });

  workbench.addEventListener("drop", (event) => {
    const target = getCraftingTargetFromElement(event.target);

    if (!target) {
      return;
    }

    event.preventDefault();

    try {
      const source = JSON.parse(event.dataTransfer.getData("application/json"));
      moveCraftingItem(character, source, target);
      setSelectedCraftSource(null);
      renderWorkbench();
    } catch (error) {
      gameError("crafting.drop.invalidSource", { message: error.message });
    }
  });
}

function renderCharacterOptions(selectedCharacterId) {
  return characters
    .map((character) => {
      const isSelected = selectedCharacterId === character.id;

      return `
        <button class="character-card ${isSelected ? "selected" : ""}" type="button" data-character-id="${character.id}" aria-pressed="${isSelected}">
          <img class="character-portrait" src="${character.portrait}" alt="${character.name}">
          <img class="character-name-img" src="${character.nameImage}" alt="${character.name}">
        </button>
      `;
    })
    .join("");
}

function renderSelectedCharacterBio(selectedCharacterId) {
  const character = characters.find((item) => item.id === selectedCharacterId);

  return character
    ? `<article class="character-bio"><h4>${character.name}</h4><p>${character.bio}</p></article>`
    : `<article class="character-bio empty"><h4>Awaiting Sigilant</h4><p>Select a character to view origin data.</p></article>`;
}

function showLevelMap(character) {
  character.progression = character.progression || { ...startingProgression };
  character.sigilInventory = character.sigilInventory || [];
  character.pipInventory = character.pipInventory || [];
  character.cycles = Number.isFinite(character.cycles) ? character.cycles : 0;
  const mapState = ensureMapState(character);
  const selectedNode = mapState.selectedNode || startingMapState.selectedNode;
  const selectedLevelNode = levelNodes.find((node) => node.id === selectedNode) || levelNodes[0];
  const levelMapLines = levelNodes
    .flatMap((node) =>
      node.unlocks.map((unlockedNodeId) => {
        const unlockedNode = levelNodes.find((item) => item.id === unlockedNodeId);

        if (!unlockedNode) {
          return "";
        }

        const isOpenEdge =
          mapState.unlockedNodes.includes(unlockedNode.id) ||
          mapState.completedNodes.includes(node.id) ||
          mapState.completedNodes.includes(unlockedNode.id);

        return `<line class="${isOpenEdge ? "open" : ""}" x1="${node.x}" y1="${node.y}" x2="${unlockedNode.x}" y2="${unlockedNode.y}"></line>`;
      })
    )
    .join("");

  app.innerHTML = `
    <section class="level-map-screen" aria-labelledby="level-map-title">
      <div class="level-map-panel">
        <header class="level-map-header">
          <div>
            <p class="signal">Q-Dara Route Net</p>
            <h2 id="level-map-title">World Map</h2>
          </div>
          <div class="level-map-tools">
            <div class="level-map-cycles">
              ${renderCycleTracker(character.cycles)}
            </div>
            <button class="secondary-action crafting-map-action" type="button" id="open-crafting">Crafting</button>
          </div>
        </header>

        <div class="level-map-viewport world-map-viewport" aria-label="Q-Dara world node map">
          <div class="world-map-board">
            <img class="world-map-image" src="${worldMapImage}" alt="Q-Dara world map">
            <svg class="level-map-lines world-map-lines" viewBox="0 0 ${worldMapCoordinateSpace.width} ${worldMapCoordinateSpace.height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              ${levelMapLines}
            </svg>
            ${levelNodes
              .map((node) => {
                const isUnlocked = mapState.unlockedNodes.includes(node.id) || mapState.completedNodes.includes(node.id);
                const isComplete = mapState.completedNodes.includes(node.id) || mapState.visitedMarkets.includes(node.id);
                const isSelected = selectedNode === node.id;
                const stateClass = isUnlocked ? "unlocked" : "locked";

                return `
                  <button class="level-node world-node ${node.type}-node ${stateClass} ${isSelected ? "active" : ""} ${isComplete ? "complete" : ""}" type="button" data-level-node="${node.id}" ${isUnlocked ? "" : "disabled"} style="--node-x: ${(node.x / worldMapCoordinateSpace.width) * 100}%; --node-y: ${(node.y / worldMapCoordinateSpace.height) * 100}%; --zone-accent: ${node.accent}; --zone-dark: ${node.dark}; --zone-light: ${node.light};">
                    <span>${node.label}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>

        <footer class="level-map-footer">
          <div class="level-map-selection">
            <p id="level-map-status">${selectedLevelNode.label} - Sigil Occurrence Percentages:</p>
            <div id="level-sigil-rates-slot">${renderSigilSpawnRates(selectedLevelNode)}</div>
          </div>
          <button class="primary-action" type="button" id="enter-level">Enter ${selectedLevelNode.label}</button>
        </footer>
      </div>
    </section>
  `;

  const enterLevel = document.querySelector("#enter-level");
  const craftingButton = document.querySelector("#open-crafting");
  const levelMapStatus = document.querySelector("#level-map-status");
  const levelSigilRatesSlot = document.querySelector("#level-sigil-rates-slot");
  const worldMapViewport = document.querySelector(".world-map-viewport");
  const worldMapBoard = document.querySelector(".world-map-board");
  const levelNodeButtons = [...document.querySelectorAll("[data-level-node]")];

  function centerWorldMapOnNode(nodeId) {
    const node = levelNodes.find((item) => item.id === nodeId) || levelNodes[0];

    if (!worldMapViewport || !worldMapBoard || !node) {
      return;
    }

    const targetX = (node.x / worldMapCoordinateSpace.width) * worldMapBoard.offsetWidth;
    const targetY = (node.y / worldMapCoordinateSpace.height) * worldMapBoard.offsetHeight;

    worldMapViewport.scrollLeft = Math.max(0, targetX - worldMapViewport.clientWidth / 2);
    worldMapViewport.scrollTop = Math.max(0, targetY - worldMapViewport.clientHeight / 2);
  }

  function updateSelectedLevelNode(nodeId) {
    const node = levelNodes.find((item) => item.id === nodeId) || levelNodes[0];
    const isUnlocked = mapState.unlockedNodes.includes(nodeId) || mapState.completedNodes.includes(nodeId);
    const isVisitedMarket = node.type === "market" && mapState.visitedMarkets.includes(nodeId);
    const isCompletedLevel = node.type !== "market" && mapState.completedNodes.includes(nodeId);
    const isUnavailable = isVisitedMarket || isCompletedLevel;

    if (!isUnlocked) {
      return;
    }

    mapState.selectedNode = nodeId;
    levelNodeButtons.forEach((node) => node.classList.toggle("active", node.dataset.levelNode === nodeId));
    enterLevel.disabled = isUnavailable;
    enterLevel.textContent = isVisitedMarket
      ? `${node.label} Visited`
      : isCompletedLevel
        ? `${node.label} Cleared`
        : `Enter ${node.label}`;
    levelMapStatus.textContent = `${node.label} - Sigil Occurrence Percentages:`;
    levelSigilRatesSlot.innerHTML = renderSigilSpawnRates(node);
  }

  levelNodeButtons.forEach((node) => {
    node.addEventListener("click", () => updateSelectedLevelNode(node.dataset.levelNode));
  });

  craftingButton.addEventListener("click", () => showSigilCraftingScreen(character));
  enterLevel.addEventListener("click", () => {
    const node = levelNodes.find((item) => item.id === mapState.selectedNode) || levelNodes[0];

    if (mapState.completedNodes.includes(node.id)) {
      return;
    }

    if (node.type === "market") {
      if (mapState.visitedMarkets.includes(node.id)) {
        return;
      }

      showMarketEntryPrompt(character, node);
      return;
    }

    showInitialRoom(character, mapState.selectedNode);
  });
  updateSelectedLevelNode(selectedNode);
  centerWorldMapOnNode(mapState.selectedNode);
}

function getMarketArtifactRarities(node) {
  const tier = Math.max(1, node?.tier || 1);
  const firstWeights = [
    { rarity: "common", chance: Math.max(30, 62 - tier * 5) },
    { rarity: "uncommon", chance: Math.min(45, 24 + tier * 4) },
    { rarity: "rare", chance: Math.min(25, 4 + tier * 3) },
  ];
  const firstRarity = rollWeightedEntry(firstWeights, firstWeights[0]).rarity;
  const secondWeights = firstWeights.filter((entry) => entry.rarity !== firstRarity);
  const secondRarity = rollWeightedEntry(secondWeights, secondWeights[0]).rarity;

  return [firstRarity, secondRarity];
}

function createMarketOffers(node) {
  const artifactOffers = getMarketArtifactRarities(node)
    .map((rarity) => rollArtifactFromRarity(rarity))
    .filter(Boolean)
    .map((artifact) => ({
      id: `market-${artifact.instanceId}`,
      type: "artifact",
      artifact,
      cost: getArtifactCycleCost(artifact),
    }));
  const sigilGlyphTemplate = artifacts.find((artifact) => artifact.id === "sigilGlyph");
  const sigilGlyph = sigilGlyphTemplate
    ? {
        ...sigilGlyphTemplate,
        instanceId: `artifact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sigil: rollSigilFromProfile(node?.sigilProfile || {}),
      }
    : null;

  return [
    ...artifactOffers,
    ...(sigilGlyph
      ? [{
          id: `market-${sigilGlyph.instanceId}`,
          type: "sigilGlyph",
          artifact: sigilGlyph,
          cost: getSigilGlyphCycleCost(sigilGlyph),
        }]
      : []),
  ];
}

function showMarketEntryPrompt(character, node) {
  const overlay = document.createElement("div");

  overlay.className = "cache-upgrade-overlay market-entry-overlay";
  overlay.innerHTML = `
    <section class="cache-upgrade-panel market-entry-panel" aria-labelledby="market-entry-title">
      <p class="signal">${node.zoneName} Market</p>
      <h2 id="market-entry-title">${node.label}</h2>
      <p>You may only visit each shop once. Do you want to continue?</p>
      <div class="market-entry-actions">
        <button class="secondary-action" type="button" id="cancel-market-entry">Go Back</button>
        <button class="primary-action" type="button" id="confirm-market-entry">Continue</button>
      </div>
    </section>
  `;

  document.querySelector(".level-map-screen")?.appendChild(overlay);
  overlay.querySelector("#cancel-market-entry").addEventListener("click", () => overlay.remove());
  overlay.querySelector("#confirm-market-entry").addEventListener("click", () => {
    const mapState = ensureMapState(character);

    if (!mapState.visitedMarkets.includes(node.id)) {
      mapState.visitedMarkets.push(node.id);
    }
    overlay.remove();
    completeLevelNode(character, node.id);
    showMarket(character, node);
  });
}

function showMarket(character, node) {
  character.cycles = Number.isFinite(character.cycles) ? character.cycles : 0;
  character.stats.maxIntegrity = character.stats.maxIntegrity || character.stats.integrity;
  const offers = createMarketOffers(node);
  const purchasedOfferIds = new Set();
  let marketStatus = `${character.cycles} Cycles available.`;

  app.innerHTML = `
    <section class="level-map-screen market-screen" aria-labelledby="market-title">
      <div class="level-complete-panel market-panel">
        <p class="signal">${node.zoneName} Market</p>
        <h2 id="market-title">${node.label}</h2>
        <div class="market-cycles">
          <img src="${cyclesCurrencyImage}" alt="">
          <span>Cycles</span>
          <strong id="market-cycle-total">${character.cycles}</strong>
        </div>
        <div class="market-offers" id="market-offers"></div>
        <p id="market-status">${marketStatus}</p>
        <button class="primary-action" type="button" id="leave-market">Leave</button>
      </div>
    </section>
  `;

  const offersSlot = document.querySelector("#market-offers");
  const marketStatusElement = document.querySelector("#market-status");
  const cycleTotal = document.querySelector("#market-cycle-total");

  function renderMarketOffers() {
    offersSlot.innerHTML = offers
      .map((offer) => {
        const artifact = offer.artifact;
        const isPurchased = purchasedOfferIds.has(offer.id);
        const canAfford = character.cycles >= offer.cost;
        const sigil = artifact.sigil ? getSigilDefinition(artifact.sigil.element, artifact.sigil.face) : null;
        const rarityText = artifact.effect?.type === "sigilGlyph" && sigil
          ? `${sigilRarityLabels[artifact.sigil.face || 1]} ${sigil.name}`
          : artifact.type === "pip" || artifact.effect?.type === "pip"
            ? `${artifact.rarity || "common"} crafting pip`
            : `${artifact.rarity || "common"} artifact`;

        return `
          <article class="market-offer ${isPurchased ? "purchased" : ""}">
            <img class="market-offer-img" src="${getArtifactImage(artifact)}" alt="">
            <div>
              <strong>${artifact.name}</strong>
              <small>${rarityText}</small>
              <p>${getArtifactDisplayLabel(artifact)}</p>
            </div>
            <button class="secondary-action market-buy-action" type="button" data-market-offer="${offer.id}" ${isPurchased || !canAfford ? "disabled" : ""}>
              ${isPurchased ? "Bought" : `${offer.cost} Cycles`}
            </button>
          </article>
        `;
      })
      .join("");
  }

  offersSlot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-market-offer]");

    if (!button) {
      return;
    }

    const offer = offers.find((item) => item.id === button.dataset.marketOffer);

    if (!offer || purchasedOfferIds.has(offer.id)) {
      return;
    }

    if (character.cycles < offer.cost) {
      marketStatus = "Not enough Cycles.";
      marketStatusElement.textContent = marketStatus;
      return;
    }

    character.cycles -= offer.cost;
    const acquiredArtifact = applyArtifactToCharacter(character, offer.artifact, node.sigilProfile || {});
    purchasedOfferIds.add(offer.id);
    cycleTotal.textContent = character.cycles;
    marketStatus = `${acquiredArtifact.name} purchased.`;
    marketStatusElement.textContent = marketStatus;
    renderMarketOffers();
  });

  document.querySelector("#leave-market").addEventListener("click", () => showLevelMap(character));
  renderMarketOffers();
}

function showLevelComplete(character, completedNodeId, completionSummary = {}) {
  const completedNode = levelNodes.find((node) => node.id === completedNodeId) || levelNodes[0];
  completeLevelNode(character, completedNodeId);
  gameLog("level.completeScreen", {
    completedNodeId,
    cycleReward: completionSummary.cycleReward || 0,
    turnNumber: completionSummary.turnNumber || 0,
    maxTurns: completionSummary.maxTurns || 0,
    pendingRewards: character.progression.pendingRewards,
    mapState: character.mapState,
  });

  app.innerHTML = `
    <section class="level-map-screen" aria-labelledby="level-complete-title">
      <div class="level-complete-panel">
        <p class="signal">Rift Closure Confirmed</p>
        <h2 id="level-complete-title">${completedNode.label} Closed</h2>
        <div class="level-complete-character">
          ${renderRunCharacter(character)}
          ${renderProgressionTracker(character.progression)}
        </div>
        <div class="level-cycle-summary">
          <img src="${cyclesCurrencyImage}" alt="">
          <span>Cycles Reward</span>
          <strong>+${completionSummary.cycleReward || 0}</strong>
          <small>${completionSummary.turnNumber || 0}/${completionSummary.maxTurns || 0} turns</small>
        </div>
        <p>New route signals are available on the Level Map.</p>
        <button class="primary-action" type="button" id="return-level-map">Return to Level Map</button>
      </div>
    </section>
  `;

  document.querySelector("#return-level-map").addEventListener("click", () => {
    showLevelMap(character);
  });
}

function showSigilCraftingScreen(character) {
  character.sigilInventory = character.sigilInventory || [];
  let selectedCraftSource = null;

  app.innerHTML = `
    <section class="setup-screen crafting-screen" aria-labelledby="crafting-title">
      <div class="setup-panel crafting-panel">
        <header class="setup-header">
          <div>
            <p class="signal">Sigil Crafting</p>
            <h2 id="crafting-title">Craft Dice</h2>
          </div>
          <button class="primary-action" type="button" id="done-crafting">Done Crafting</button>
        </header>

        <div id="crafting-workbench">
          ${renderCraftingDatabank(character, selectedCraftSource)}
          ${renderCraftingDice(character, selectedCraftSource)}
        </div>
      </div>
    </section>
  `;

  const workbench = document.querySelector("#crafting-workbench");
  const doneCrafting = document.querySelector("#done-crafting");

  function renderWorkbench() {
    workbench.innerHTML = `
      ${renderCraftingDatabank(character, selectedCraftSource)}
      ${renderCraftingDice(character, selectedCraftSource)}
    `;
  }

  bindCraftingWorkbench({
    workbench,
    character,
    getSelectedCraftSource: () => selectedCraftSource,
    setSelectedCraftSource: (source) => {
      selectedCraftSource = source;
    },
    renderWorkbench,
  });

  doneCrafting.addEventListener("click", () => showLevelMap(character));
}

function getRewardProgramOptions(character) {
  if (character.programs.length >= character.stats.cache) {
    return [];
  }

  const ownedPrograms = new Set(ensureProgramLibrary(character));
  const equippedElements = getCharacterLoadoutElements(character);
  const availablePrograms = Object.values(programs).filter(
    (program) => !ownedPrograms.has(program.id) && getProgramRequiredElements(program).some((element) => equippedElements.has(element))
  );

  return availablePrograms.sort(() => Math.random() - 0.5).slice(0, 3);
}

function showLevelReward(character) {
  function finishRewardChoice() {
    character.progression.pendingRewards = Math.max(0, (character.progression.pendingRewards || 0) - 1);

    if (character.progression.pendingRewards > 0) {
      showLevelReward(character);
      return;
    }

    showLevelMap(character);
  }

  const blankDieSideCount = rollLevelRewardDieSideCount();

  app.innerHTML = `
    <section class="level-map-screen" aria-labelledby="level-reward-title">
      <div class="level-complete-panel reward-panel">
        <p class="signal">Level ${character.progression.level} Reward</p>
        <h2 id="level-reward-title">New Blank Die</h2>
        <div class="reward-options">
          <article class="reward-card">
            <h3>Add Blank Die</h3>
            <div class="reward-choice-grid">
              <button class="secondary-action reward-choice" type="button" id="add-level-map-blank-die">
                <strong>${blankDieSideCount}-Sided Blank Die</strong>
                <small>${blankDieSideCount} empty faces for future sigils.</small>
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  `;

  document.querySelector("#add-level-map-blank-die").addEventListener("click", () => {
    character.loadout.push(createBlankDie(blankDieSideCount));
    finishRewardChoice();
  });

}

function showCharacterSetup() {
  startBackgroundMusic();
  window.clearInterval(runeRainTimer);

  const customFaces = Array.from({ length: customDieFaceCount }, () => null);
  let selectedCharacterId = "";
  let selectedCraftElement = "";

  app.innerHTML = `
    <section class="setup-screen" aria-labelledby="setup-title">
      <div class="setup-panel">
        <header class="setup-header">
          <div>
            <p class="signal">Sigilant Initialization</p>
            <h2 id="setup-title">Character Setup</h2>
          </div>
          <button class="secondary-action" type="button" id="return-menu">Return</button>
        </header>

        <section class="character-select" aria-labelledby="character-select-title">
          <div class="section-heading">
            <h3 id="character-select-title">Choose Sigilant</h3>
          </div>
          <div class="character-options" id="character-options">
            ${renderCharacterOptions(selectedCharacterId)}
          </div>
          <div id="character-bio">
            ${renderSelectedCharacterBio(selectedCharacterId)}
          </div>
          <div class="setup-program-preview" aria-label="Selected character starting programs">
            <p class="signal">Base Programs</p>
            <div id="setup-program-preview">
              ${renderSetupProgramPreview()}
            </div>
          </div>
        </section>

        <section class="loadout" aria-labelledby="loadout-title">
          <div class="loadout-header">
            <div>
              <h3 id="loadout-title">Craft Starting Die</h3>
              <p>Your Sigilant presets one common sigil. Drag or click 2 more common elemental sigils onto the blank die. You can place up to 2 copies of one element.</p>
            </div>
          </div>

          <div id="sigil-crafting">
            ${renderSigilCrafting(customFaces, selectedCraftElement)}
          </div>
        </section>

        <footer class="setup-footer">
          <p id="setup-status">Choose a Sigilant to preset one sigil, then craft 2 more die faces.</p>
          <button class="primary-action" type="button" id="confirm-character" disabled>Enter Rift</button>
        </footer>
      </div>
    </section>
  `;

  const sigilCrafting = document.querySelector("#sigil-crafting");
  const characterOptions = document.querySelector("#character-options");
  const characterBio = document.querySelector("#character-bio");
  const setupProgramPreview = document.querySelector("#setup-program-preview");
  const confirmButton = document.querySelector("#confirm-character");
  const status = document.querySelector("#setup-status");

  function getFilledFaceCount() {
    return customFaces.filter(Boolean).length;
  }

  function canPlaceSigil(element, targetIndex) {
    if (!element || targetIndex < 0 || targetIndex >= customDieFaceCount) {
      return false;
    }

    const existingSigil = customFaces[targetIndex];
    if (existingSigil?.preset) {
      return false;
    }
    const filledCount = getFilledFaceCount();
    const matchingCount = customFaces.filter((sigil, index) => index !== targetIndex && sigil?.element === element).length;

    return Boolean(existingSigil || filledCount < startingCustomFaceLimit) && matchingCount < 2;
  }

  function placeSigil(element, targetIndex) {
    if (!canPlaceSigil(element, targetIndex)) {
      status.textContent = "That sigil cannot be placed there.";
      return;
    }

    customFaces[targetIndex] = { element, face: 1 };
    selectedCraftElement = "";
    updateSetupState();
  }

  function applyCharacterPreset(characterId) {
    const selectedCharacter = characters.find((item) => item.id === characterId);

    customFaces.forEach((sigil, index) => {
      if (sigil?.preset) {
        customFaces[index] = null;
      }
    });

    if (!selectedCharacter?.startingDie) {
      return;
    }

    const presetIndex = customFaces.findIndex((sigil) => !sigil);
    customFaces[presetIndex >= 0 ? presetIndex : 0] = {
      element: selectedCharacter.startingDie,
      face: 1,
      preset: true,
    };

    while (customFaces.filter((sigil) => sigil?.element === selectedCharacter.startingDie).length > 2) {
      const removableIndex = customFaces.findLastIndex(
        (sigil) => sigil?.element === selectedCharacter.startingDie && !sigil.preset
      );

      if (removableIndex < 0) {
        break;
      }

      customFaces[removableIndex] = null;
    }

    while (getFilledFaceCount() > startingCustomFaceLimit) {
      const removableIndex = customFaces.findLastIndex((sigil) => sigil && !sigil.preset);

      if (removableIndex < 0) {
        break;
      }

      customFaces[removableIndex] = null;
    }
  }

  function updateSetupState() {
    const selectedCharacter = characters.find((item) => item.id === selectedCharacterId);
    const filledCount = getFilledFaceCount();

    characterOptions.innerHTML = renderCharacterOptions(selectedCharacterId);
    characterBio.innerHTML = renderSelectedCharacterBio(selectedCharacterId);
    setupProgramPreview.innerHTML = renderSetupProgramPreview();
    sigilCrafting.innerHTML = renderSigilCrafting(customFaces, selectedCraftElement);
    confirmButton.disabled = filledCount !== startingCustomFaceLimit || !selectedCharacterId;

    if (!selectedCharacterId) {
      status.textContent = "Choose a Sigilant.";
      return;
    }

    status.textContent = filledCount === startingCustomFaceLimit
      ? "Custom die ready."
      : `${selectedCharacter.name} presets ${getDieById(selectedCharacter.startingDie)?.name || "one"} Sigil. Assign ${startingCustomFaceLimit - filledCount} more ${startingCustomFaceLimit - filledCount === 1 ? "sigil" : "sigils"}.`;
  }

  characterOptions.addEventListener("click", (event) => {
    const card = event.target.closest("[data-character-id]");

    if (!card) {
      return;
    }

    selectedCharacterId = card.dataset.characterId;
    applyCharacterPreset(selectedCharacterId);
    updateSetupState();
  });

  sigilCrafting.addEventListener("click", (event) => {
    const sigilButton = event.target.closest("[data-sigil-element]");
    const faceButton = event.target.closest("[data-face-index]");

    if (sigilButton) {
      selectedCraftElement = sigilButton.dataset.sigilElement;
      updateSetupState();
      return;
    }

    if (!faceButton) {
      return;
    }

    const faceIndex = Number(faceButton.dataset.faceIndex);

    if (selectedCraftElement) {
      placeSigil(selectedCraftElement, faceIndex);
      return;
    }

    if (customFaces[faceIndex]?.preset) {
      status.textContent = "The Sigilant preset cannot be removed.";
      return;
    }

    if (customFaces[faceIndex]) {
      customFaces[faceIndex] = null;
      updateSetupState();
    }
  });

  sigilCrafting.addEventListener("dragstart", (event) => {
    const sigilButton = event.target.closest("[data-sigil-element]");

    if (!sigilButton) {
      return;
    }

    event.dataTransfer.setData("text/plain", sigilButton.dataset.sigilElement);
    event.dataTransfer.effectAllowed = "copy";
  });

  sigilCrafting.addEventListener("dragover", (event) => {
    if (event.target.closest("[data-face-index]")) {
      event.preventDefault();
    }
  });

  sigilCrafting.addEventListener("drop", (event) => {
    const faceButton = event.target.closest("[data-face-index]");

    if (!faceButton) {
      return;
    }

    event.preventDefault();
    placeSigil(event.dataTransfer.getData("text/plain"), Number(faceButton.dataset.faceIndex));
  });

  confirmButton.addEventListener("click", () => {
    const character = characters.find((item) => item.id === selectedCharacterId);

    showLevelMap({
      ...character,
      programs: [...baseProgramIds],
      loadout: [createCustomDie(customFaces)],
      programLibrary: [...baseProgramIds],
      stats: { ...startingStats },
      progression: { ...startingProgression },
      artifacts: [],
      cycles: 0,
      mapState: {
        selectedNode: startingMapState.selectedNode,
        completedNodes: [...startingMapState.completedNodes],
        unlockedNodes: [...startingMapState.unlockedNodes],
        visitedMarkets: [...startingMapState.visitedMarkets],
      },
    });
  });

  document.querySelector("#return-menu").addEventListener("click", () => window.location.reload());
  updateSetupState();
}

startRunButton.addEventListener("click", () => {
  startBackgroundMusic();
  showCharacterSetup();
});

loadGameButton.addEventListener("click", () => {
  loadGameFileInput.click();
});

loadGameFileInput.addEventListener("change", () => {
  const file = loadGameFileInput.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      loadSaveGame(JSON.parse(reader.result));
    } catch (error) {
      gameError("save.load.failed", { message: error.message });
      window.alert(`Could not load save: ${error.message}`);
    } finally {
      loadGameFileInput.value = "";
    }
  });

  reader.readAsText(file);
});

testModeButton.addEventListener("click", () => {
  startBackgroundMusic();
  window.clearInterval(runeRainTimer);
  showInitialRoom(createTestModeCharacter(), "cindera-n1");
});

startRuneRain();
startBackgroundMusic();
