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
