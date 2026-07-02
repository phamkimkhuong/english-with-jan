/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const ipaSlugMap = {
  "i:": "i-long",
  "ɪ": "i-short",
  "e": "e",
  "æ": "ae",
  "ɑ:": "a-long",
  "ɑ:r": "a-long-r",
  "ɔ:": "o-long",
  "ɔ:r": "o-long-r",
  "ʊ": "u-short",
  "u:": "u-long",
  "ɜ:r": "er",
  "ə": "schwa",
  "ʌ": "ah",
  "eɪ": "ei",
  "aɪ": "ai",
  "ɔɪ": "oy",
  "aʊ": "au",
  "əʊ": "ou",
  "ɪə": "ia",
  "eə": "ea",
  "ʊə": "ua",
  "p": "p",
  "b": "b",
  "t": "t",
  "d": "d",
  "tʃ": "ch",
  "dʒ": "dj",
  "k": "k",
  "g": "g",
  "f": "f",
  "v": "v",
  "θ": "th-voiceless",
  "ð": "th-voiced",
  "s": "s",
  "z": "z",
  "ʃ": "sh",
  "ʒ": "zh",
  "h": "h",
  "m": "m",
  "n": "n",
  "ŋ": "ng",
  "l": "l",
  "r": "r",
  "w": "w",
  "j": "y"
};

function getSlugFromIpa(ipa) {
  return ipaSlugMap[ipa] || encodeURIComponent(ipa);
}

const dataDir = path.join(__dirname, '../public/data');
const jsonPath = path.join(dataDir, 'default_ipa.json');
const outDir = path.join(dataDir, 'ipa');

console.log('Splitting default_ipa.json into individual sound files...');

try {
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: File not found at ${jsonPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  data.sounds.forEach(sound => {
    const slug = getSlugFromIpa(sound.ipa);
    const soundPath = path.join(outDir, `${slug}.json`);
    fs.writeFileSync(soundPath, JSON.stringify(sound, null, 2), 'utf8');
  });

  console.log(`Successfully split ${data.sounds.length} sounds into ${outDir}`);
} catch (error) {
  console.error('Error splitting IPA files:', error);
  process.exit(1);
}
