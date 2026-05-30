// Editable program metadata.
// Supported effect types:
// - damageAdjacent: requires an adjacent enemy. Uses amount, damageType ("arcane" or "physical"), and optional healAmount.
// - damageLine: targets a hex distance spaces away in a straight line. Uses amount and damageType.
// - damageRange: targets an enemy exactly distance spaces away by hex distance. Uses amount and damageType.
// - debuffDefense: reduces Physical and Arcane Defense on an adjacent enemy by amount.
// - damageAdjacentAll: loses selfDamage Integrity, then damages all adjacent enemies. Use damageEntries for multiple damage types.
// - confuseEnemy: targets an adjacent enemy; next enemy turn it attacks another enemy instead of the player.
// - resetOtherCooldowns: clears cooldowns on all other equipped programs.
// - healIntegrity: restores Integrity by amount.
// - blinkStraight: teleports exactly distance spaces in a straight line.
// - nextTurnExec: adds amount temporary Executions to the next player turn. Optional currentAmount adds Executions immediately.
// - revealRiftThreads: temporarily reveals Rift Thread hexes and can move them closer to the player.
// - pushEnemy: targets an adjacent enemy, pushes it one hex away, and stuns it.
// - sightRangeBonus: temporarily increases line of sight by amount.
// - phaseThroughEnemies: allows movement paths through enemies for playerTurns player turns.
// - entangleAdjacent: adjacent enemies have 0% accuracy on their next enemy turn.
// - phaseThroughWalls: allows player movement and player attacks through walls for playerTurns player turns.
// - deathTouchLine: targets an enemy exactly distance spaces away in a straight line, teleports onto it, and destroys it.
// - implodeVisible: all visible enemies take direct damage equal to their Physical Defense.
// - temporaryExecBoost: adds amount Executions now and for turns future player turns.
// - invertIncomingDamage: the next charges damaging enemy attacks heal instead.
// - stunAllEnemies: all enemies on the map get stunned for duration enemy turns.
// - damageLineFalloff: targets a straight-line hex up to distance away and applies damages along the line.
// - manifestDieFace: choose another rolled die and set it to one of its faces for this Sigil-Cast.
// - blinkAnywhere: teleport to any unoccupied hex on the map.
// Cooldown is measured in player turns after the program is used.
// Programs do not have a fixed element. They are defined by their required sigil symbols.
window.arcaneMetadata = window.arcaneMetadata || {};

window.arcaneMetadata.programs = {
  teleport: {
    id: "teleport",
    name: "BLINK",
    requirement: [{ element: "void", face: 1 }],
    summary: "Move 3 spaces in a straight line.",
    details: "Teleport exactly 3 hex spaces in a single straight-line direction.",
    cooldown: 3,
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
    details: "Deal 2 Physical Damage to an enemy exactly 2 spaces away.",
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
    details: "Heal 1 Integrity up to your max.",
    cooldown: 0,
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
    details: "Gain 1 temporary Execution for the current Sigil-Cast and 1 temporary Execution on your next turn.",
    cooldown: 1,
    effect: {
      type: "nextTurnExec",
      amount: 1,
      currentAmount: 1,
    },
  },
  quake: {
    id: "quake",
    name: "QUAKE",
    requirement: [
      { element: "surge", face: 1 },
      { element: "life", face: 1 },
    ],
    summary: "Deal 1 PD and 1 AD adjacent.",
    details: "Deal 1 Physical Damage and 1 Arcane Damage to all adjacent enemies.",
    cooldown: 2,
    effect: {
      type: "damageAdjacentAll",
      damageEntries: [
        { amount: 1, damageType: "physical" },
        { amount: 1, damageType: "arcane" },
      ],
    },
  },
  shatter: {
    id: "shatter",
    name: "SHATTER",
    requirement: [
      { element: "mind", face: 1 },
      { element: "surge", face: 1 },
    ],
    summary: "Reduce enemy defenses by 1.",
    details: "Reduce an adjacent enemy's Physical Defense and Arcane Defense by 1.",
    cooldown: 1,
    effect: {
      type: "debuffDefense",
      amount: 1,
    },
  },
  blinkTwo: {
    id: "blinkTwo",
    name: "BLINK II",
    requirement: [
      { element: "surge", face: 1 },
      { element: "void", face: 1 },
    ],
    summary: "Teleport 4 spaces in a straight line.",
    details: "Teleport exactly 4 hex spaces in a straight-line direction.",
    cooldown: 1,
    effect: {
      type: "blinkStraight",
      distance: 4,
    },
  },
  drain: {
    id: "drain",
    name: "DRAIN",
    requirement: [
      { element: "life", face: 1 },
      { element: "mind", face: 1 },
    ],
    summary: "Deal 1 AD and heal 1 Integrity.",
    details: "Deal 1 Arcane Damage to an adjacent enemy, then heal 1 Integrity.",
    cooldown: 2,
    effect: {
      type: "damageAdjacent",
      amount: 1,
      damageType: "arcane",
      healAmount: 1,
    },
  },
  confuse: {
    id: "confuse",
    name: "CONFUSE",
    requirement: [
      { element: "mind", face: 1 },
      { element: "void", face: 1 },
    ],
    summary: "Enemy attacks another enemy next turn.",
    details: "Make an adjacent enemy attack another enemy next turn instead of the player.",
    cooldown: 1,
    effect: {
      type: "confuseEnemy",
      duration: 1,
    },
  },
  fortify: {
    id: "fortify",
    name: "FORTIFY",
    requirement: [
      { element: "void", face: 1 },
      { element: "life", face: 1 },
    ],
    summary: "Reset all other program cooldowns.",
    details: "Clear cooldowns on all other equipped programs.",
    cooldown: 1,
    effect: {
      type: "resetOtherCooldowns",
    },
  },
  rift: {
    id: "rift",
    name: "RIFT",
    requirement: [
      { element: "void", face: 1 },
      { element: "void", face: 1 },
    ],
    summary: "Reveal and pull Rift Threads.",
    details: "Reveal all Rift Thread hexes until the turn ends and move each uncollected Rift Thread 1 hex closer to you when possible.",
    cooldown: 1,
    effect: {
      type: "revealRiftThreads",
      moveThreadsCloser: 1,
    },
  },
  bolt: {
    id: "bolt",
    name: "BOLT",
    requirement: [
      { element: "surge", face: 1 },
      { element: "surge", face: 1 },
    ],
    summary: "Deal 3 AD to an adjacent enemy.",
    details: "Deal 3 Arcane Damage to an adjacent enemy.",
    cooldown: 2,
    effect: {
      type: "damageAdjacent",
      amount: 3,
      damageType: "arcane",
    },
  },
  push: {
    id: "push",
    name: "PUSH",
    requirement: [
      { element: "life", face: 1 },
      { element: "life", face: 1 },
    ],
    summary: "Push and stun an adjacent enemy.",
    details: "Move an adjacent enemy one hex away and stun it for its next turn.",
    cooldown: 1,
    effect: {
      type: "pushEnemy",
      stunTurns: 1,
    },
  },
  shadow: {
    id: "shadow",
    name: "SHADOW",
    requirement: [
      { element: "mind", face: 1 },
      { element: "mind", face: 1 },
    ],
    summary: "Move through enemies.",
    details: "Move through enemy-occupied hexes until the end of your next turn. You still cannot stop on an enemy.",
    cooldown: 1,
    effect: {
      type: "phaseThroughEnemies",
      playerTurns: 2,
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
  implode: {
    id: "implode",
    name: "IMPLODE",
    requirement: [
      { element: "surge", face: 1 },
      { element: "surge", face: 2 },
    ],
    summary: "Visible enemies take PD equal to their PD.",
    details: "All enemies in view take Physical Damage equal to their Physical Defense.",
    cooldown: 5,
    effect: {
      type: "implodeVisible",
    },
  },
  forsight: {
    id: "forsight",
    name: "FORSIGHT",
    requirement: [
      { element: "mind", face: 1 },
      { element: "mind", face: 2 },
    ],
    summary: "+1 Execution now and for 4 turns.",
    details: "Gain +1 Execution for this Sigil-Cast and for the next 4 turns.",
    cooldown: 4,
    effect: {
      type: "temporaryExecBoost",
      amount: 1,
      turns: 4,
    },
  },
  siphon: {
    id: "siphon",
    name: "SIPHON",
    requirement: [
      { element: "life", face: 1 },
      { element: "life", face: 2 },
    ],
    summary: "Next 2 damaging attacks heal you.",
    details: "The next two enemy attacks that would damage you heal you instead.",
    cooldown: 3,
    effect: {
      type: "invertIncomingDamage",
      charges: 2,
    },
  },
  gravity: {
    id: "gravity",
    name: "GRAVITY",
    requirement: [
      { element: "void", face: 1 },
      { element: "void", face: 2 },
    ],
    summary: "Stun all enemies next turn.",
    details: "All enemies on the map are stunned during their next enemy turn.",
    cooldown: 4,
    effect: {
      type: "stunAllEnemies",
      duration: 1,
    },
  },
  plasmaRare: {
    id: "plasmaRare",
    name: "PLASMA",
    requirement: [{ element: "surge", face: 3 }],
    summary: "Line blast for 8/6/4/2 AD.",
    details: "Target a hex in a straight line up to 4 spaces away. Hexes along the line take 8, then 6, then 4, then 2 Arcane Damage.",
    cooldown: 4,
    effect: {
      type: "damageLineFalloff",
      distance: 4,
      damageType: "arcane",
      damages: [8, 6, 4, 2],
    },
  },
  manifest: {
    id: "manifest",
    name: "MANIFEST",
    requirement: [{ element: "mind", face: 3 }],
    summary: "Set another die to any face.",
    details: "Choose another rolled die and set it to any one of that die's faces for this Sigil-Cast.",
    cooldown: 2,
    effect: {
      type: "manifestDieFace",
    },
  },
  blinkThree: {
    id: "blinkThree",
    name: "BLINK III",
    requirement: [{ element: "void", face: 3 }],
    summary: "Teleport to any open hex.",
    details: "Teleport to any unoccupied hex on the map.",
    cooldown: 4,
    effect: {
      type: "blinkAnywhere",
    },
  },
  newLife: {
    id: "newLife",
    name: "REGENERATE",
    requirement: [{ element: "life", face: 3 }],
    summary: "Heal 10 Integrity.",
    details: "Heal 10 Integrity. This program cannot be used again this level.",
    cooldown: null,
    oncePerLevel: true,
    effect: {
      type: "healIntegrity",
      amount: 10,
    },
  },
};
