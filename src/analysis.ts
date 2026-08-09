import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import type { Risk } from './types';

// Vite inlines every VITE_-prefixed variable into the public browser bundle, so a
// secret placed there is readable by anyone who opens devtools. Fail loudly rather
// than ship one: the Anthropic key belongs in the Convex deployment environment.
const leaked = Object.keys(import.meta.env).filter(key => /^VITE_.*(ANTHROPIC|API_?KEY|SECRET|TOKEN|PASSWORD)/i.test(key));
if(leaked.length) throw new Error(
  `${leaked.join(', ')} would be compiled into the public bundle. Remove the VITE_ prefix and set it on the backend instead: npx convex env set ANTHROPIC_API_KEY ...`,
);

export type Verdict = { risk:Risk, score:number, reasons:string[], spokenVerdict:string, source:'model'|'heuristic' };

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
export const liveAnalysis = Boolean(convexUrl);

// Referenced by name rather than through convex/_generated/api, which is gitignored
// and absent until `npx convex dev` runs — importing it would break the app build.
const checkMessage = makeFunctionReference<'action', { text:string, sender?:string }, Verdict>('grandma:checkMessage');

let client:ConvexHttpClient | undefined;

export async function analyzeMessage(text:string, sender?:string):Promise<Verdict|null>{
  if(!convexUrl) return null;
  client ??= new ConvexHttpClient(convexUrl);
  try { return await client.action(checkMessage, { text, sender }); }
  catch { return null; } // The seeded verdict stays on screen; never leave the user with nothing.
}
