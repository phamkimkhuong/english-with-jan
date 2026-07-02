/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const ipaOrder = [
  "i:", "ɪ", "e", "æ", "ɑ:", "ɑ:r", "ɔ:", "ɔ:r", "ʊ", "u:", "ɜ:r", "ə", "ʌ",
  "eɪ", "aɪ", "ɔɪ", "aʊ", "əʊ", "ɪə", "eə", "ʊə",
  "p", "b", "t", "d", "tʃ", "dʒ", "k", "g", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h", "m", "n", "ŋ", "l", "r", "w", "j"
];

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
const ipaDir = path.join(dataDir, 'ipa');
const outPath = path.join(dataDir, 'default_ipa.json');

console.log('Combining split IPA files...');

try {
  const sounds = [];
  
  ipaOrder.forEach(ipa => {
    const slug = getSlugFromIpa(ipa);
    const filePath = path.join(ipaDir, `${slug}.json`);
    
    if (fs.existsSync(filePath)) {
      const soundData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      sounds.push(soundData);
    } else {
      console.warn(`Warning: File not found for IPA /${ipa}/: ${filePath}`);
    }
  });

  // Prepare master JSON structure
  const masterData = {
    lastUpdated: new Date().toISOString(),
    version: Date.now(),
    sounds
  };

  fs.writeFileSync(outPath, JSON.stringify(masterData, null, 2), 'utf8');
  console.log(`Successfully combined ${sounds.length} sounds into ${outPath}`);
} catch (error) {
  console.error('Error combining IPA files:', error);
  process.exit(1);
}
