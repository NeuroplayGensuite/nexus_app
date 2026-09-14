/**
 * Shared Phonics Vocabulary
 *
 * This is the SINGLE SOURCE OF TRUTH for all words allowed in the Phonic Finder game.
 *
 * Rules:
 *  - Every word MUST have a clear, unambiguous emoji.
 *  - Words must be simple, common, child-friendly (ages 4-16).
 *  - The LLM prompt includes the full list so AI can ONLY pick from here.
 *  - The validator in PhonicFinder.tsx checks against this same map.
 *
 * To add a new word: add it to PHONIC_VOCAB_MAP with its emoji.
 * It becomes automatically available to both the prompt and the validator.
 */

export const PHONIC_VOCAB_MAP: Record<string, string> = {
  // A
  ant: '🐜', apple: '🍎', axe: '🪓', anchor: '⚓',
  // B
  ball: '⚽', bat: '🏏', bear: '🐻', bed: '🛏️', bee: '🐝', bell: '🔔',
  bird: '🐦', boat: '⛵', book: '📚', boot: '🥾', bow: '🎀', box: '📦',
  bread: '🍞', bug: '🐛', bus: '🚌', butterfly: '🦋', balloon: '🎈',
  banana: '🍌', basket: '🧺', bean: '🫘', bone: '🦴', bowl: '🥣',
  // C
  cake: '🎂', cap: '🧢', car: '🚗', cat: '🐱', chair: '🪑', cheese: '🧀',
  cherry: '🍒', chick: '🐥', chicken: '🍗', chocolate: '🍫', cloud: '☁️',
  coat: '🧥', corn: '🌽', cow: '🐄', crab: '🦀', crown: '👑', cup: '☕',
  candle: '🕯️', carrot: '🥕', castle: '🏰', clock: '🕐', cookie: '🍪',
  cactus: '🌵', camel: '🐫',
  // D
  deer: '🦌', dog: '🐶', dolphin: '🐬', door: '🚪', dragon: '🐉',
  drum: '🥁', duck: '🦆', diamond: '💎', dinosaur: '🦕', doll: '🪆',
  dart: '🎯', dove: '🕊️',
  // E
  ear: '👂', egg: '🥚', elephant: '🐘', eye: '👁️',
  // F
  fan: '🪭', fish: '🐟', flag: '🚩', flower: '🌸', fork: '🍴',
  fox: '🦊', frog: '🐸', fire: '🔥', feather: '🪶', finger: '👆',
  football: '🏈',
  // G
  gift: '🎁', giraffe: '🦒', goat: '🐐', goose: '🪿', grapes: '🍇',
  ghost: '👻', guitar: '🎸', gem: '💎',
  // H
  hat: '🎩', hen: '🐔', horse: '🐴', house: '🏠', heart: '❤️',
  hammer: '🔨', hand: '✋', honey: '🍯',
  // I
  ice: '🧊',
  // J
  jar: '🫙', jellyfish: '🪼', juice: '🧃',
  // K
  key: '🔑', kite: '🪁', koala: '🐨',
  // L
  lamp: '💡', leaf: '🍃', lemon: '🍋', lion: '🦁', lock: '🔒',
  ladybug: '🐞', lollipop: '🍭',
  // M
  map: '🗺️', milk: '🥛', monkey: '🐒', moon: '🌙', mouse: '🐭',
  mushroom: '🍄', magnet: '🧲', medal: '🏅', mango: '🥭', melon: '🍈',
  mask: '🎭',
  // N
  nest: '🪹', net: '🥅', nose: '👃', needle: '🪡',
  // O
  owl: '🦉', orange: '🍊', octopus: '🐙',
  // P
  pan: '🍳', pear: '🍐', pen: '🖊️', pig: '🐷', pin: '📌',
  pizza: '🍕', plane: '✈️', plant: '🌱', penguin: '🐧', panda: '🐼',
  peach: '🍑', pineapple: '🍍',
  // R
  rabbit: '🐰', rain: '🌧️', rat: '🐀', ring: '💍', rocket: '🚀',
  rope: '🪢', rose: '🌹', rainbow: '🌈', robot: '🤖',
  // S
  sheep: '🐑', shell: '🐚', ship: '🚢', shoe: '👟', snail: '🐌',
  snake: '🐍', sock: '🧦', star: '⭐', sun: '☀️', swan: '🦢',
  salt: '🧂', sandwich: '🥪', scarf: '🧣', scissors: '✂️',
  seal: '🦭', seed: '🌱', shark: '🦈',
  // T
  tent: '⛺', tiger: '🐯', tomato: '🍅', tooth: '🦷', train: '🚂',
  tree: '🌳', truck: '🚚', turtle: '🐢', tail: '🐾', trophy: '🏆',
  tulip: '🌷',
  // V
  van: '🚐', vase: '🏺', vest: '🦺', violin: '🎻',
  // W
  whale: '🐋', wolf: '🐺', worm: '🪱', watch: '⌚', watermelon: '🍉',
  wheel: '🎡', wings: '🪽', witch: '🧙',
  // Z
  zebra: '🦓',
};

/** All allowed words as a sorted list (for LLM prompt injection) */
export const ALLOWED_WORDS: string[] = Object.keys(PHONIC_VOCAB_MAP).sort();

/** True if the word is in the approved vocabulary */
export function isAllowedWord(word: string): boolean {
  return word.toLowerCase() in PHONIC_VOCAB_MAP;
}

/** Get the emoji for a word (undefined if not in vocabulary) */
export function getPhonicEmoji(word: string): string | undefined {
  return PHONIC_VOCAB_MAP[word.toLowerCase()];
}

/**
 * Phoneme pool — words grouped by starting phoneme.
 * Used by the fallback round builder in PhonicFinder.
 * Every word here MUST also be in PHONIC_VOCAB_MAP.
 */
export const PHONEME_POOL: Record<string, string[]> = {
  'sh': ['sheep', 'ship', 'shoe', 'shell', 'shark'],
  's':  ['sun', 'sock', 'snail', 'star', 'seal', 'scissors', 'sandwich', 'seed', 'salt'],
  'f':  ['fish', 'fox', 'frog', 'fan', 'fire', 'feather', 'finger', 'football', 'flag'],
  'b':  ['ball', 'bat', 'bear', 'bee', 'bird', 'boat', 'book', 'bus', 'balloon', 'banana', 'bone', 'bell'],
  'p':  ['pig', 'pen', 'pear', 'pizza', 'plane', 'plant', 'penguin', 'panda', 'peach', 'pineapple', 'pin'],
  'd':  ['dog', 'duck', 'deer', 'drum', 'door', 'dolphin', 'diamond', 'dinosaur', 'doll', 'dart', 'dove'],
  't':  ['tiger', 'turtle', 'train', 'tree', 'truck', 'tent', 'tomato', 'tooth', 'trophy', 'tulip', 'tail'],
  'ch': ['cherry', 'chicken', 'chocolate', 'cheese', 'chair'],
  'g':  ['goat', 'ghost', 'gift', 'giraffe', 'grapes', 'guitar'],
  'k':  ['key', 'kite', 'koala'],
  'c':  ['cat', 'car', 'cow', 'cake', 'cap', 'corn', 'crab', 'crown', 'candle', 'carrot', 'castle', 'cookie', 'camel', 'clock'],
  'h':  ['hat', 'hen', 'horse', 'house', 'heart', 'hammer', 'hand', 'honey'],
  'r':  ['rabbit', 'rain', 'rat', 'ring', 'rocket', 'rose', 'rainbow', 'robot', 'rope'],
  'l':  ['lamp', 'leaf', 'lemon', 'lion', 'lock', 'ladybug', 'lollipop'],
  'm':  ['monkey', 'moon', 'mouse', 'mushroom', 'magnet', 'medal', 'mango', 'melon', 'milk', 'mask'],
  'n':  ['nest', 'net', 'nose', 'needle'],
  'w':  ['whale', 'wolf', 'worm', 'watch', 'watermelon', 'wheel', 'wings', 'witch'],
  'v':  ['van', 'vase', 'vest', 'violin'],
  'a':  ['ant', 'apple', 'axe', 'anchor'],
  'e':  ['ear', 'egg', 'elephant', 'eye'],
  'o':  ['owl', 'orange', 'octopus'],
  'j':  ['jar', 'jellyfish', 'juice'],
  'z':  ['zebra'],
};
