import { contacts } from './data';

export type Profile = { name:string; trustedId:string; onboarded:boolean };

const KEY = 'grandma-mode.profile';
const SESSION_KEY = 'grandma-mode-session';
export const blankProfile:Profile = { name:'', trustedId:contacts[0].id, onboarded:false };

// The account gate (Landing) and the spoken setup (Onboarding) are separate stages:
// signing in says who you are to the service, onboarding teaches the app and fills
// in the profile. They must agree on one key each, hence both living here.
export const hasSession = () => { try { return localStorage.getItem(SESSION_KEY) === 'active'; } catch { return false; } };
export const startSession = () => { try { localStorage.setItem(SESSION_KEY,'active'); } catch { /* not fatal */ } };

// Storage can throw in private windows and when cookies are blocked. Onboarding
// running twice is a small annoyance; a crash on load is not survivable.
export function loadProfile():Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if(!raw) return blankProfile;
    const saved = JSON.parse(raw) as Partial<Profile>;
    return {
      name: typeof saved.name === 'string' ? saved.name : '',
      trustedId: contacts.some(c => c.id === saved.trustedId) ? saved.trustedId! : blankProfile.trustedId,
      onboarded: saved.onboarded === true,
    };
  } catch { return blankProfile; }
}

export function saveProfile(profile:Profile){
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* not fatal */ }
}

// "My name is Eleanor." -> "Eleanor". Speech recognition returns a whole sentence,
// and older users very often answer in one.
export function cleanName(raw:string){
  const stripped = raw.trim().replace(/^(my name is|my name's|i am|i'm|it is|it's|call me|this is|they call me)\s+/i,'');
  const first = stripped.split(/[\s,.!?]+/).filter(Boolean)[0] ?? '';
  return first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : '';
}
