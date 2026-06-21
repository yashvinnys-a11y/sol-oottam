'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const { WORDS, DECOY_POOL } = require(path.join('..', 'words.js'));

const required = [
  'id', 'tamil', 'letters', 'english', 'partOfSpeech', 'category', 'difficulty',
  'meaning', 'example', 'sentence', 'sentenceEn', 'acceptedSpeechVariants',
  'distractors', 'feedback', 'icon'
];

assert.equal(WORDS.length, 10, 'The official prototype must contain exactly ten words.');
assert.ok(Array.isArray(DECOY_POOL) && DECOY_POOL.length >= 20, 'The decoy pool is unexpectedly small.');

const ids = new Set();
const tamilWords = new Set(WORDS.map((word) => word.tamil));
let graphemeCount = 0;

for (const [index, word] of WORDS.entries()) {
  for (const field of required) {
    assert.notEqual(word[field], undefined, `Word ${index + 1} is missing ${field}.`);
    assert.notEqual(word[field], null, `Word ${index + 1} has null ${field}.`);
  }
  assert.ok(!ids.has(word.id), `Duplicate word id: ${word.id}`);
  ids.add(word.id);
  assert.ok(Array.isArray(word.letters) && word.letters.length >= 2, `${word.id}: invalid letters array.`);
  assert.equal(word.letters.join('').normalize('NFC'), word.tamil.normalize('NFC'), `${word.id}: graphemes do not join to the word.`);
  graphemeCount += word.letters.length;
  assert.equal((word.sentence.match(/___/g) || []).length, 1, `${word.id}: sentence must have one blank.`);
  assert.equal((word.sentenceEn.match(/___/g) || []).length, 1, `${word.id}: sentenceEn must have one blank.`);
  assert.ok(word.acceptedSpeechVariants.length >= 1, `${word.id}: missing speech variant.`);
  assert.ok(word.acceptedSpeechVariants.some((variant) => variant.includes(word.tamil)), `${word.id}: no speech variant includes the target word.`);
  assert.ok(word.distractors.length >= 3, `${word.id}: not enough distractors.`);
  for (const distractor of word.distractors) {
    assert.ok(tamilWords.has(distractor), `${word.id}: unknown distractor ${distractor}.`);
    assert.notEqual(distractor, word.tamil, `${word.id}: answer appears as distractor.`);
  }
  assert.ok(word.feedback.correct && word.feedback.hint, `${word.id}: incomplete feedback.`);
}

assert.equal(graphemeCount, 30, 'The current ten-word bank should contain 30 guided-tracing units.');
assert.deepEqual(WORDS.find((word) => word.id === 'vilaiyaadu').letters, ['வி', 'ளை', 'யா', 'டு']);

console.log(JSON.stringify({
  result: 'PASS',
  words: WORDS.length,
  graphemeUnits: graphemeCount,
  uniqueIds: ids.size,
  decoyPool: DECOY_POOL.length
}, null, 2));
