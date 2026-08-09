// Voice selection and speech shaping. The assistant should sound like one
// consistent, calm person — never the platform's robotic default voice.

// The assistant is voiced as a calm, capable young man — a security professional
// talking you through something, not a switchboard. Best first.
const masculine = [
  'aaron',                                                          // macOS: young US male
  'andrew','guy','brandon','christopher','eric','davis','steffan',  // Microsoft Natural (US)
  'ryan','thomas','george','brian','roger',                         // Microsoft Natural (UK)
  'google us english male','google uk english male',
  'reed','arthur','oliver','nathan','tom','alex','daniel','james','gordon','rishi',
];

// Feminine-presenting English voices, skipped in favour of the persona above.
const feminine = [
  'samantha','ava','allison','susan','serena','joanna','karen','moira','tessa','fiona',
  'victoria','vicki','nicky','martha','catherine','kathy','shelley','sandy','flo','grandma',
  'zoe','emma','hazel','zira','eva','clara','natasha','amber','ashley','elizabeth','linda',
  'jenny','aria','michelle','sonia','libby','google us english','google uk english female',
];

// Classic formant-synthesis and novelty voices. Intelligible at best, alarming at worst.
const novelty = [
  'albert','bad news','bahh','bells','boing','bubbles','cellos','deranged','eddy',
  'good news','grandpa','jester','junior','organ','ralph','rocko','superstar','trinoids',
  'whisper','wobble','zarvox','fred','princess','bruce','agnes','compact','eloquence','espeak',
];

// Whole-word matching, so 'tom' does not match "Thomas" and 'male' does not match "Female".
const word = (name:string, entry:string) => new RegExp(`\\b${entry}\\b`).test(name);
const words = (name:string, list:string[]) => list.some(entry => word(name, entry));

export function pickVoice(voices:SpeechSynthesisVoice[]):SpeechSynthesisVoice|undefined {
  const english = voices.filter(v => /^en\b|^en[-_]/i.test(v.lang));
  if(!english.length) return undefined;
  // General American is the West Coast standard, so an en-US voice is the accent.
  // Only fall back to other English locales if this machine has no en-US at all.
  const american = english.filter(v => /^en[-_]us/i.test(v.lang));
  const pool = american.length ? american : english;
  const score = (v:SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    const explicitlyMale = /\bmale\b/.test(name);
    let points = 0;
    if(/natural|neural|premium|enhanced/.test(name)) points += 60;
    const rank = masculine.findIndex(entry => word(name, entry));
    if(rank >= 0) points += 45 - rank;
    if(explicitlyMale) points += 20;
    if(!explicitlyMale && words(name, feminine)) points -= 70;
    if(words(name, novelty)) points -= 90;
    if(/^en[-_]us/i.test(v.lang)) points += 8;
    return points;
  };
  return [...pool].sort((a,b) => score(b) - score(a))[0];
}

// The Web Speech API exposes no emotion parameter, so feeling has to be carried by
// rate and pitch. These are the deliveries the assistant switches between.
export type Tone = 'neutral' | 'friendly' | 'reassuring' | 'warning';

const toneBase:Record<Tone,{rate:number,pitch:number}> = {
  neutral:    { rate: .98, pitch: 1    },
  friendly:   { rate: 1.03, pitch: 1.07 }, // brighter and quicker, the way good news lands
  reassuring: { rate: .93, pitch: 1.02 }, // unhurried and warm
  warning:    { rate: .86, pitch: .9   }, // slow and low; the listener should feel it
};

const clamp = (n:number) => Math.round(Math.min(2, Math.max(.5, n)) * 100) / 100;

// A flat rate and pitch across every sentence is most of what reads as robotic.
// Real speech declines in pitch as a thought completes, and lifts on a question.
export function shape(sentence:string, index:number, tone:Tone){
  const base = toneBase[tone];
  let { rate, pitch } = base;
  pitch -= Math.min(index, 3) * .022;
  if(/\?\s*$/.test(sentence)){ pitch += .075; rate += .02; }
  else if(/!\s*$/.test(sentence)){ pitch += .045; rate += .03; }
  return { rate: clamp(rate), pitch: clamp(pitch) };
}

// Smart punctuation and layout characters are read out literally by some engines.
export function speakable(text:string){
  return text
    .replace(/[“”]/g,'')
    .replace(/[‘’]/g,"'")
    .replace(/[·•]/g,',')
    .replace(/\s*[—–]\s*/g,', ')
    .replace(/\bDr\.\s/g,'Doctor ')
    .replace(/\bSt\.\s/g,'Saint ')
    .replace(/\s+/g,' ')
    .trim();
}

// Speaking one sentence per utterance gives the engine natural pauses, and keeps
// every utterance well under the ~15s cutoff Chrome applies to a single one.
export function sentences(text:string):string[]{
  const parts = text.match(/[^.!?…]+[.!?…]*/g) ?? [text];
  const out:string[] = [];
  for(const raw of parts){
    const part = raw.trim();
    if(!part) continue;
    const previous = out[out.length-1];
    if(previous && previous.length < 30) out[out.length-1] = `${previous} ${part}`;
    else out.push(part);
  }
  return out;
}
