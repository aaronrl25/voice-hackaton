# Grandma Mode

An accessible voice-first safety assistant built with React, a VoiceOS adapter, and Convex.

## Voice-first design

Speaking is the primary way to use the app. The home screen is a single large microphone
button — tap it, speak, and the assistant answers out loud and on screen. Every spoken
request is also reachable by tapping a large button, so nothing depends on voice working.

Design constraints for older users:

- One primary action per screen; the microphone is the largest element on the page.
- Minimum touch target of 3.9rem (~70px), and 4.2rem for approve/block decisions.
- Body text at 1.05rem with a 1.6 line height; headings scale fluidly with the viewport.
- Plain-language state copy ("I'm listening…", "Let me check that…") and `aria-live` updates.
- Errors never fail silently — an unheard phrase or a denied microphone explains the next step.
- Honours `prefers-reduced-motion`, and every control has a visible focus ring.

### The assistant's voice

The assistant is voiced as a calm, capable young man — a security professional talking
you through something. `src/speech.ts` ranks the installed English voices to find him
rather than accepting the platform default, which is frequently a robotic
formant-synthesis voice.

Ranking favours neural/premium voices and a list of masculine names, skips
feminine-presenting voices, and heavily penalises the novelty voices macOS ships
(Zarvox, Trinoids, Bad News, and friends). Names are matched on whole-word boundaries,
so `tom` does not match "Thomas" and `male` does not match "Female". On macOS this
resolves to Aaron; on Edge to a Microsoft Natural male voice such as Guy or Andrew.

Replies are spoken one sentence per utterance at a slightly slowed rate. This produces
natural pauses instead of a monotone run-on, and keeps every utterance well under the
~15 second cutoff Chrome applies to a single utterance.

Recognised phrases are matched in `src/commands.ts`: asking about your calendar, whether a
message is safe, to see recent activity or trusted people, or to call a contact by name.
Anything it does not understand results in **no action** and a spoken explanation.

## Run locally

```bash
npm install
npm run dev
```

The interface runs immediately in demo mode and uses the browser speech-recognition API through `src/voiceos.ts`. To connect a hosted Convex deployment, run `npx convex dev`, copy the generated URL into `.env.local` as `VITE_CONVEX_URL`, and connect the generated API bindings in the UI data adapter.

## Safety model

- Low risk: assist automatically and write a receipt.
- Medium risk: require the user's explicit confirmation.
- High risk: block by default; require approval from both the user and a verified trusted contact.
- Every analysis, state transition, approval, and action receipt is an append-only Convex record and can be streamed with reactive queries.

`convex/grandma.ts` contains the server-side heuristic fallback. For production, replace or augment it with a structured-output model and an allow-listed official directory provider. Never use phone numbers or links found inside the suspicious message as verification sources.
