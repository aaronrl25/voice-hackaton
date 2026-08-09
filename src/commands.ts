import { contacts } from './data';
import type { RequestItem } from './types';

export type Tab = 'home' | 'activity' | 'people';
export type Interpretation = { say:string; tab?:Tab; open?:string };

const has = (text:string, ...words:string[]) => words.some(w => text.includes(w));
const verdict:Record<string,string> = {
  low:'It looks safe.',
  medium:'Let us double-check this one together.',
  high:'It looks dangerous. Please do not reply to it, and do not send any money.',
};

export function interpret(raw:string, items:RequestItem[]):Interpretation {
  const text = raw.toLowerCase();
  const contact = contacts.find(c => text.includes(c.name.toLowerCase()));

  if(has(text,'call','phone','ring','talk to') && contact)
    return { say:`Calling ${contact.name}, your ${contact.relationship.toLowerCase()}. I will stay right here with you.`, tab:'people' };

  if(has(text,'what can you do','how do you work','help me','i need help','explain this'))
    return { say:'You can ask me three things out loud. Say: what is on my calendar. Say: is this message safe. Or say: call Maya. I will always ask you before doing anything.' };

  if(has(text,'calendar','appointment','schedule','doctor','today','tomorrow','plans'))
    return { say:'Your next appointment is Tuesday at half past ten in the morning, with Doctor Alvarez. I have set a reminder for you.' };

  if(has(text,'safe','scam','fraud','suspicious','message','text','check','bank','money','transfer','stranger')){
    const open = [...items].sort((a,b) => b.score - a.score)[0];
    if(!open) return { say:'Good news. There is nothing waiting for you to check right now.' };
    return { say:`I looked at the ${open.title.toLowerCase()} from ${open.source}. ${verdict[open.risk]} I am opening it now so you can see why.`, open:open.id };
  }

  if(has(text,'activity','history','recent','what happened','what did you'))
    return { say:'Here is everything I have checked for you.', tab:'activity' };

  if(has(text,'family','contact','trusted','people','who can'))
    return { say:'These are the people you trust. They help you approve anything risky.', tab:'people' };

  return { say:'I am not sure about that one, so I did nothing at all. You can ask me about your calendar, whether a message is safe, or to call Maya.' };
}
