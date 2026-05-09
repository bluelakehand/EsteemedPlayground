'use strict';

// ─── Paragraph mode config ────────────────────────────────────────────────────
//
// To switch the game to paragraph mode, open game.js and set:
//   const PARAGRAPH_MODE = true;
//
// To choose which paragraph to use, change ACTIVE_PARAGRAPH below.
// Words are taken in order, looping if the song outlasts the text.
// Non-letter characters are stripped; no length filter is applied.
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVE_PARAGRAPH = 0;

const PARAGRAPHS = [
  {
    id:    'foxes',
    title: 'Classic Pangrams',
    text: `
      The quick brown fox jumps over the lazy dog.
      Pack my box with five dozen liquor jugs.
      How vexingly quick daft zebras jump.
      Sphinx of black quartz judge my vow.
      Waltz bad nymph for quick jigs vex.
      Jackdaws love my big sphinx of quartz.
    `,
  },

  {
    id:    'arcade',
    title: 'Arcade Lore',
    text: `
      Insert coin to continue your quest for glory.
      High score demands precision timing and a steady hand.
      The cabinet hums with the promise of perfect runs.
      Every pixel placed by hand in the dark of the studio.
      Champions do not pause they adapt and push forward.
      Learn the patterns master the timing own the board.
      One more credit one more chance one more perfect run.
    `,
  },

  {
    id:    'typing',
    title: 'Typing Virtue',
    text: `
      Speed is nothing without accuracy guiding every stroke.
      Proper posture keeps the wrists safe and the fingers fast.
      Home row discipline separates the amateurs from the legends.
      Each word is a small victory each sentence a conquest.
      The keyboard is your instrument and rhythm is the score.
      Practice until the keys feel like an extension of thought.
      Muscle memory carries you when conscious effort cannot keep pace.
    `,
  },

  {
    id:    'nature',
    title: 'Field Notes',
    text: `
      A crow lands silently on a frost covered branch.
      The river carves patient paths through ancient stone.
      Wolves move through snowfall without disturbing a single flake.
      Fireflies signal in the humid dark of a summer meadow.
      Salmon return upstream drawn by something older than memory.
      The tide pulls back and leaves behind a world in miniature.
      Wind bends the tall grass and the tall grass returns.
    `,
  },
];
