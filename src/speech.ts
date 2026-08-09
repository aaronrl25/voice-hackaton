// Voice selection and speech shaping. The assistant should sound like one
// consistent, calm person — never the platform's robotic default voice.

// Warm, natural-sounding English voices, best first. Matched as substrings.
const preferred = [
  'ava','samantha','allison','serena','susan','joanna',
  'jenny','aria','michelle','sonia','libby',
  'google us english','google uk english female','karen','moira','tessa','fiona',
];

// Classic formant-synthesis and novelty voices. Intelligible at best, alarming at worst.
const novelty = [
  'albert','bad news','bahh','bells','boing','bubbles','cellos','deranged','eddy','flo',
  'good news','grandma','grandpa','jester','junior','organ','ralph','reed','rocko','sandy',
  'shelley','superstar','trinoids','whisper','wobble','zarvox','fred','kathy','princess',
  'bruce','agnes','victoria','vicki','alex','compact','eloquence','espeak',
];

const includesAny = (name:string, list:string[]) => list.some(entry => name.includes(entry));

export function pickVoice(voices:SpeechSynthesisVoice[]):SpeechSynthesisVoice|undefined {
  const english = voices.filter(v => /^en\b|^en[-_]/i.test(v.lang));
  if(!english.length) return undefined;
  const score = (v:SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    let points = 0;
    if(/natural|neural|premium|enhanced/.test(name)) points += 60;
    const rank = preferred.findIndex(entry => name.includes(entry));
    if(rank >= 0) points += 40 - rank;
    if(/^en[-_]us/i.test(v.lang)) points += 8;
    if(v.default) points += 4;
    if(includesAny(name, novelty)) points -= 80;
    return points;
  };
  return [...english].sort((a,b) => score(b) - score(a))[0];
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
