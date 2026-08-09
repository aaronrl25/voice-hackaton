import { contacts } from './data';
import type { Tone } from './speech';
import type { RequestItem } from './types';

export type Tab = 'home' | 'activity' | 'people';
export type Interpretation = { say:string; tone:Tone; tab?:Tab; open?:string };

const has = (text:string, ...words:string[]) => words.some(w => text.includes(w));

// Spoken in the first person, casually, with contractions. Read these aloud before
// changing them — anything that scans as written prose sounds robotic when spoken.
// "I am not sure" is a sentence; "I'm not sure" is a person talking.
const verdict:Record<string,{ line:string, tone:Tone }> = {
  low:    { line:"This one's fine. Nothing about it looks off to me.", tone:'friendly' },
  medium: { line:"I'm not totally sure about this one. Let's go through it together.", tone:'neutral' },
  high:   { line:"This one's bad. Please don't reply to it, and don't send anybody money.", tone:'warning' },
};

export function interpret(raw:string, items:RequestItem[], trustedName='Maya'):Interpretation {
  const text = raw.toLowerCase();
  const contact = contacts.find(c => text.includes(c.name.toLowerCase()));

  if(has(text,'call','phone','ring','talk to') && contact)
    return { say:`Sure thing. I'm calling ${contact.name}, your ${contact.relationship.toLowerCase()}. I'll stay right here with you.`, tone:'friendly', tab:'people' };

  if(has(text,'what can you do','how do you work','help me','i need help','explain this'))
    return { say:`Yeah, of course. Just talk to me like you would a person. You can ask what's on your calendar, or whether a message is safe, or tell me to call ${trustedName}. I'll always check with you before I do anything.`, tone:'reassuring' };

  if(has(text,'calendar','appointment','schedule','doctor','today','tomorrow','plans'))
    return { say:"Let me take a look. You've got one thing coming up: Tuesday at ten thirty in the morning, with Doctor Alvarez. I'll remind you before it.", tone:'friendly' };

  if(has(text,'safe','scam','fraud','suspicious','message','text','check','bank','money','transfer','stranger')){
    const open = [...items].sort((a,b) => b.score - a.score)[0];
    if(!open) return { say:"Good news. There's nothing waiting on you right now.", tone:'friendly' };
    const { line, tone } = verdict[open.risk];
    return { say:`Okay, I looked at the ${open.title.toLowerCase()} from ${open.source}. ${line} I'm pulling it up so you can see exactly what I saw.`, tone, open:open.id };
  }

  if(has(text,'activity','history','recent','what happened','what did you'))
    return { say:"Sure. Here's everything I've checked for you.", tone:'friendly', tab:'activity' };

  if(has(text,'family','contact','trusted','people','who can'))
    return { say:"These are your people. They're the ones who help you approve anything risky.", tone:'reassuring' , tab:'people' };

  return { say:`Sorry, I didn't quite catch that, so I haven't done anything at all. You can ask me about your calendar, whether a message is safe, or tell me to call ${trustedName}.`, tone:'neutral' };
}
