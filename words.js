'use strict';

/**
 * Curated prototype word bank.
 *
 * IMPORTANT: The Tamil content is complete enough for software testing, but it
 * must still be reviewed and signed off by a qualified Tamil educator before
 * formal testing with children.
 */
const WORDS = [
  {
    id: 'maram',
    tamil: 'மரம்',
    letters: ['ம', 'ர', 'ம்'],
    english: 'Tree',
    partOfSpeech: 'Noun',
    category: 'Nature',
    difficulty: 1,
    icon: '🌳',
    meaning: 'தண்டு, கிளைகள், இலைகள் கொண்ட பெரிய தாவரம்.',
    example: 'எங்கள் வீட்டின் முன் ஒரு பெரிய மரம் உள்ளது.',
    sentence: 'பூங்காவில் ஒரு உயரமான ___ உள்ளது.',
    sentenceEn: 'There is a tall ___ in the park.',
    acceptedSpeechVariants: [
      'பூங்காவில் ஒரு உயரமான மரம் உள்ளது',
      'பூங்காவில் உயரமான மரம் உள்ளது'
    ],
    distractors: ['தீபம்', 'வேகம்', 'தேடல்'],
    feedback: {
      correct: 'சரி! மரம் என்பது tree.',
      hint: 'பூங்காவில் வளரக்கூடிய பெரிய தாவரத்தை நினைவில் கொள்.'
    }
  },
  {
    id: 'vegam',
    tamil: 'வேகம்',
    letters: ['வே', 'க', 'ம்'],
    english: 'Speed',
    partOfSpeech: 'Noun',
    category: 'Action',
    difficulty: 1,
    icon: '⚡',
    meaning: 'ஒரு இயக்கம் எவ்வளவு விரைவாக நடைபெறுகிறது என்பதைச் சொல்வது.',
    example: 'அவன் அதிக வேகத்தில் ஓடினான்.',
    sentence: 'இந்த வாகனத்தின் ___ அதிகம்.',
    sentenceEn: 'The ___ of this vehicle is high.',
    acceptedSpeechVariants: [
      'இந்த வாகனத்தின் வேகம் அதிகம்',
      'வாகனத்தின் வேகம் அதிகம்'
    ],
    distractors: ['மரம்', 'துணிவு', 'தேடல்'],
    feedback: {
      correct: 'சரி! வேகம் என்பது speed.',
      hint: 'ஒரு பொருள் எவ்வளவு விரைவாக நகர்கிறது என்பதை நினைத்துப் பார்.'
    }
  },
  {
    id: 'thunivu',
    tamil: 'துணிவு',
    letters: ['து', 'ணி', 'வு'],
    english: 'Courage',
    partOfSpeech: 'Noun',
    category: 'Values',
    difficulty: 1,
    icon: '🛡️',
    meaning: 'அச்சம் இருந்தாலும் சரியான செயலைச் செய்யும் மனவலிமை.',
    example: 'சிரமத்தை சமாளிக்க துணிவு தேவை.',
    sentence: 'சிரமத்தை எதிர்கொள்ள ___ தேவை.',
    sentenceEn: '___ is needed to face difficulty.',
    acceptedSpeechVariants: [
      'சிரமத்தை எதிர்கொள்ள துணிவு தேவை',
      'சிரமத்தைச் சந்திக்க துணிவு தேவை'
    ],
    distractors: ['வேகம்', 'மரம்', 'தீபம்'],
    feedback: {
      correct: 'சரி! துணிவு என்பது courage.',
      hint: 'அச்சத்தை எதிர்கொள்ள உதவும் மனவலிமையை நினைத்துப் பார்.'
    }
  },
  {
    id: 'theepam',
    tamil: 'தீபம்',
    letters: ['தீ', 'ப', 'ம்'],
    english: 'Lamp',
    partOfSpeech: 'Noun',
    category: 'Culture',
    difficulty: 1,
    icon: '🪔',
    meaning: 'ஒளி தருவதற்காக ஏற்றப்படும் விளக்கு அல்லது சுடர்.',
    example: 'திருவிழாவில் தீபம் ஏற்றினோம்.',
    sentence: 'விழாவில் அழகான ___ ஏற்றப்பட்டது.',
    sentenceEn: 'A beautiful ___ was lit at the celebration.',
    acceptedSpeechVariants: [
      'விழாவில் அழகான தீபம் ஏற்றப்பட்டது',
      'திருவிழாவில் அழகான தீபம் ஏற்றப்பட்டது'
    ],
    distractors: ['மரம்', 'தேடல்', 'வேகம்'],
    feedback: {
      correct: 'சரி! தீபம் என்பது lamp.',
      hint: 'ஒளி தருவதற்காக ஏற்றப்படும் பொருளை நினைத்துப் பார்.'
    }
  },
  {
    id: 'thedal',
    tamil: 'தேடல்',
    letters: ['தே', 'ட', 'ல்'],
    english: 'Search',
    partOfSpeech: 'Noun',
    category: 'Thinking',
    difficulty: 2,
    icon: '🔎',
    meaning: 'ஒரு பொருள் அல்லது பதிலை கண்டுபிடிக்க முயல்வது.',
    example: 'காணாமல் போன புத்தகத்திற்கான தேடல் தொடர்கிறது.',
    sentence: 'பதில் கிடைக்கும் வரை ___ தொடர்ந்தது.',
    sentenceEn: 'The ___ continued until the answer was found.',
    acceptedSpeechVariants: [
      'பதில் கிடைக்கும் வரை தேடல் தொடர்ந்தது',
      'பதில் கிடைக்கும்வரை தேடல் தொடர்ந்தது'
    ],
    distractors: ['துணிவு', 'தீபம்', 'மரம்'],
    feedback: {
      correct: 'சரி! தேடல் என்பது search.',
      hint: 'காணாமல் போன ஒன்றைக் கண்டுபிடிக்க செய்யும் முயற்சியை நினைத்துப் பார்.'
    }
  },
  {
    id: 'odu',
    tamil: 'ஓடு',
    letters: ['ஓ', 'டு'],
    english: 'Run',
    partOfSpeech: 'Verb',
    category: 'Movement',
    difficulty: 1,
    icon: '🏃',
    meaning: 'கால்களால் விரைவாகச் செல்வது.',
    example: 'நான் காலையில் பூங்காவில் ஓடுகிறேன்.',
    sentence: 'நீ போட்டியில் வேகமாக ___.',
    sentenceEn: '___ fast in the race.',
    acceptedSpeechVariants: [
      'நீ போட்டியில் வேகமாக ஓடு',
      'போட்டியில் வேகமாக ஓடு'
    ],
    distractors: ['பார்', 'எழுது', 'சாப்பிடு'],
    feedback: {
      correct: 'சரி! ஓடு என்பது run.',
      hint: 'கால்களால் வேகமாக நகரும் செயலை நினைத்துப் பார்.'
    }
  },
  {
    id: 'saappidu',
    tamil: 'சாப்பிடு',
    letters: ['சா', 'ப்', 'பி', 'டு'],
    english: 'Eat',
    partOfSpeech: 'Verb',
    category: 'Daily Life',
    difficulty: 2,
    icon: '🍽️',
    meaning: 'உணவை உட்கொள்வது.',
    example: 'நான் தினமும் பழம் சாப்பிடுகிறேன்.',
    sentence: 'உடல் நலத்திற்கு பழங்களை ___.',
    sentenceEn: '___ fruits for good health.',
    acceptedSpeechVariants: [
      'உடல் நலத்திற்கு பழங்களை சாப்பிடு',
      'உடல்நலத்திற்கு பழங்களை சாப்பிடு'
    ],
    distractors: ['ஓடு', 'பார்', 'எழுது'],
    feedback: {
      correct: 'சரி! சாப்பிடு என்பது eat.',
      hint: 'உணவை உட்கொள்ளும் செயலை நினைத்துப் பார்.'
    }
  },
  {
    id: 'paar',
    tamil: 'பார்',
    letters: ['பா', 'ர்'],
    english: 'Look / See',
    partOfSpeech: 'Verb',
    category: 'Senses',
    difficulty: 1,
    icon: '👀',
    meaning: 'கண்களால் காண்பது அல்லது கவனிப்பது.',
    example: 'வானத்தில் உள்ள நிலாவைப் பார்.',
    sentence: 'அந்த அழகான ஓவியத்தை ___.',
    sentenceEn: '___ at that beautiful painting.',
    acceptedSpeechVariants: [
      'அந்த அழகான ஓவியத்தை பார்',
      'அழகான ஓவியத்தை பார்'
    ],
    distractors: ['ஓடு', 'எழுது', 'விளையாடு'],
    feedback: {
      correct: 'சரி! பார் என்பது look or see.',
      hint: 'கண்களால் கவனிக்கும் செயலை நினைத்துப் பார்.'
    }
  },
  {
    id: 'ezhuthu',
    tamil: 'எழுது',
    letters: ['எ', 'ழு', 'து'],
    english: 'Write',
    partOfSpeech: 'Verb',
    category: 'Learning',
    difficulty: 2,
    icon: '✍️',
    meaning: 'எழுத்துகள் அல்லது சொற்களைப் பதிவு செய்வது.',
    example: 'உன் பெயரைத் தெளிவாக எழுது.',
    sentence: 'பதில் தாளில் உன் பெயரை ___.',
    sentenceEn: '___ your name on the answer sheet.',
    acceptedSpeechVariants: [
      'பதில் தாளில் உன் பெயரை எழுது',
      'உன் பெயரை பதில் தாளில் எழுது'
    ],
    distractors: ['பார்', 'ஓடு', 'சாப்பிடு'],
    feedback: {
      correct: 'சரி! எழுது என்பது write.',
      hint: 'எழுத்துகளைப் பதிவு செய்யும் செயலை நினைத்துப் பார்.'
    }
  },
  {
    id: 'vilaiyaadu',
    tamil: 'விளையாடு',
    letters: ['வி', 'ளை', 'யா', 'டு'],
    english: 'Play',
    partOfSpeech: 'Verb',
    category: 'Recreation',
    difficulty: 2,
    icon: '⚽',
    meaning: 'மகிழ்ச்சிக்காக ஒரு விளையாட்டில் ஈடுபடுவது.',
    example: 'குழந்தைகள் மைதானத்தில் விளையாடுகிறார்கள்.',
    sentence: 'நண்பர்களுடன் பாதுகாப்பாக ___.',
    sentenceEn: '___ safely with your friends.',
    acceptedSpeechVariants: [
      'நண்பர்களுடன் பாதுகாப்பாக விளையாடு',
      'உன் நண்பர்களுடன் பாதுகாப்பாக விளையாடு'
    ],
    distractors: ['எழுது', 'பார்', 'ஓடு'],
    feedback: {
      correct: 'சரி! விளையாடு என்பது play.',
      hint: 'நண்பர்களுடன் மகிழ்ச்சியாகச் செய்யும் செயலை நினைத்துப் பார்.'
    }
  }
];

const DECOY_POOL = [
  'அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ',
  'க', 'ச', 'ட', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ',
  'ழ', 'ள', 'ற', 'ன', 'கு', 'தி', 'நு', 'பு', 'மை', 'லை'
];

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

deepFreeze(WORDS);
deepFreeze(DECOY_POOL);

const SOL_OOTTAM_DATA = deepFreeze({ WORDS, DECOY_POOL });

if (typeof window !== 'undefined') {
  window.SOL_OOTTAM_DATA = SOL_OOTTAM_DATA;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SOL_OOTTAM_DATA;
}
