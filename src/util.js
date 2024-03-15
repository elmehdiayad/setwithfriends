import animals from "./utils/animals.json";
import moment from "moment";
import Filter from "bad-words";
import red from "@material-ui/core/colors/red";
import pink from "@material-ui/core/colors/pink";
import purple from "@material-ui/core/colors/purple";
import deepPurple from "@material-ui/core/colors/deepPurple";
import indigo from "@material-ui/core/colors/indigo";
import blue from "@material-ui/core/colors/blue";
import lightBlue from "@material-ui/core/colors/lightBlue";
import cyan from "@material-ui/core/colors/cyan";
import teal from "@material-ui/core/colors/teal";
import green from "@material-ui/core/colors/green";
import lightGreen from "@material-ui/core/colors/lightGreen";
import lime from "@material-ui/core/colors/lime";
import amber from "@material-ui/core/colors/amber";
import orange from "@material-ui/core/colors/orange";
import deepOrange from "@material-ui/core/colors/deepOrange";

export const filter = new Filter();

filter.addWords("cunting");

// See: https://github.com/ekzhang/setwithfriends/issues/117
filter.addWords("retard", "retarded");

// See: https://github.com/ekzhang/setwithfriends/issues/49
filter.removeWords("queer", "queers", "queerz", "qweers", "qweerz", "lesbian");

// See: https://github.com/ekzhang/setwithfriends/issues/71
filter.removeWords("wang");

export const colors = {
  red,
  pink,
  purple,
  deepPurple,
  indigo,
  blue,
  lightBlue,
  cyan,
  teal,
  green,
  lightGreen,
  lime,
  amber,
  orange,
  deepOrange,
};

export const modes = {
  normal: {
    name: "Normal",
    color: "purple",
    description: "Normal rules.",
    setType: "normal",
  },
  supreme: {
    name: "Supreme",
    color: "teal",
    description: "Supreme rules.",
    setType: "supreme",
  },
  black: {
    name: "Black",
    color: "pink",
    description: "Black rules.",
    setType: "black",
  },
};

export const numberOfMatches = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}));

export const standardLayouts = {
  QWERTY: {
    verticalLayout: "123qweasdzxcrtyfghvbnuiojkl",
    horizontalLayout: "qazwsxedcrfvtgbyhnujmik,ol.",
    orientationChangeKey: ";",
    layoutChangeKey: "'",
  },
  AZERTY: {
    verticalLayout: '&é"azeqsdwxcrtyfghvbnuiojkl',
    horizontalLayout: "aqwzsxedcrfvtgbyhnuj,ik;ol:",
    orientationChangeKey: "m",
    layoutChangeKey: "ù",
  },
  QWERTZ: {
    verticalLayout: "123qweasdyxcrtzfghvbnuiojkl",
    horizontalLayout: "qaywsxedcrfvtgbzhnujmik,ol.",
    orientationChangeKey: "p",
    layoutChangeKey: "-",
  },
  Dvorak: {
    verticalLayout: "123',.aoe;qjpyfuidkxbgcrhtn",
    horizontalLayout: "'a;,oq.ejpukyixfdbghmctwrnv",
    orientationChangeKey: "s",
    layoutChangeKey: "-",
  },
  Colemak: {
    verticalLayout: "123qwfarszxcpgjtdhvbkluynei",
    horizontalLayout: "qazwrxfscptvgdbjhklnmue,yi.",
    orientationChangeKey: "o",
    layoutChangeKey: "'",
  },
  Workman: {
    verticalLayout: "123qdrashzxmwbjtgycvkfupneo",
    horizontalLayout: "qazdsxrhmwtcbgvjykfnlue,po.",
    orientationChangeKey: "i",
    layoutChangeKey: "'",
  },
};

export const BASE_RATING = 1200;
export const SCALING_FACTOR = 800;

export function generateCards() {
  const deck = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        for (let l = 0; l < 3; l++) {
          deck.push(`${i}${j}${k}${l}`);
        }
      }
    }
  }
  return deck;
}

export function generateColor() {
  const colorsArray = Object.keys(colors);
  return colorsArray[Math.floor(Math.random() * colorsArray.length)];
}

export function checkSet(a, b, c) {
  for (let i = 0; i < 4; i++) {
    if ((a.charCodeAt(i) + b.charCodeAt(i) + c.charCodeAt(i)) % 3 !== 0)
      return false;
  }
  return true;
}

/** Returns the unique card c such that {a, b, c} form a set. */
export function conjugateCard(a, b) {
  const zeroCode = "0".charCodeAt(0);
  let c = "";
  for (let i = 0; i < 4; i++) {
    const sum = a.charCodeAt(i) - zeroCode + b.charCodeAt(i) - zeroCode;
    const lastNum = (3 - (sum % 3)) % 3;
    c += String.fromCharCode(zeroCode + lastNum);
  }
  return c;
}

export function checkSetUltra(a, b, c, d) {
  if (conjugateCard(a, b) === conjugateCard(c, d)) return [a, b, c, d];
  if (conjugateCard(a, c) === conjugateCard(b, d)) return [a, c, b, d];
  if (conjugateCard(a, d) === conjugateCard(b, c)) return [a, d, b, c];
  return null;
}

export function findSet(deck, gameMode = "normal", old) {
  const deckSet = new Set(deck);
  const ultraConjugates = {};
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const c = conjugateCard(deck[i], deck[j]);
      if (
        gameMode === "normal" ||
        (gameMode === "setchain" && old.length === 0)
      ) {
        if (deckSet.has(c)) {
          return [deck[i], deck[j], c];
        }
      } else if (gameMode === "setchain") {
        if (old.includes(c)) {
          return [c, deck[i], deck[j]];
        }
      } else if (gameMode === "ultraset") {
        if (c in ultraConjugates) {
          return [...ultraConjugates[c], deck[i], deck[j]];
        }
        ultraConjugates[c] = [deck[i], deck[j]];
      }
    }
  }
  return null;
}

export function splitDeck(deck, gameMode = "normal", minBoardSize = 12, old) {
  let len = Math.min(deck.length, minBoardSize);
  while (len < deck.length && !findSet(deck.slice(0, len), gameMode, old))
    len += 3 - (len % 3);
  return [deck.slice(0, len), deck.slice(len)];
}

export function removeCard(deck, c) {
  let i = deck.indexOf(c);
  return [...deck.slice(0, i), ...deck.slice(i + 1)];
}

export function generateName() {
  return "Anonymous " + animals[Math.floor(Math.random() * animals.length)];
}

export function formatTime(t, hideSubsecond) {
  t = Math.max(t, 0);
  const hours = Math.floor(t / (3600 * 1000));
  const rest = t % (3600 * 1000);
  const format = hideSubsecond ? "mm:ss" : "mm:ss.SS";
  return (hours ? `${hours}:` : "") + moment.utc(rest).format(format);
}

/** Returns true if a game actually has hints enabled. */
export function hasHint(game) {
  return (
    game.users &&
    Object.keys(game.users).length === 1 &&
    game.access === "private" &&
    (game.mode || "normal") === "normal"
  );
}
