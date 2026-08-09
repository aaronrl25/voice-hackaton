import { useEffect, useState } from 'react';

export type MicPermission = 'unsupported' | 'insecure' | 'prompt' | 'granted' | 'denied';

const recognitionAvailable = () => !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

// Reading the permission never prompts. That is the whole point: onboarding can show
// the right screen instead of asking a question the browser has already answered, and
// it can skip the ask entirely when the answer is "denied" — that one never succeeds.
export async function readMicPermission():Promise<MicPermission>{
  if(!recognitionAvailable()) return 'unsupported';
  if(!window.isSecureContext) return 'insecure';
  try {
    const status = await navigator.permissions.query({ name:'microphone' as PermissionName });
    return status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt';
  } catch {
    // Firefox rejects the 'microphone' descriptor outright. Unknown means askable.
    return 'prompt';
  }
}

export function useMicPermission():MicPermission {
  const [state,setState] = useState<MicPermission>('prompt');
  useEffect(() => {
    let live = true;
    let status:PermissionStatus|undefined;
    const sync = () => { void readMicPermission().then(next => { if(live) setState(next); }); };
    sync();
    // Someone fixing the setting in another tab should heal the app on its own.
    // Nobody should have to explain "now refresh the page" to the person they help.
    navigator.permissions?.query({ name:'microphone' as PermissionName })
      .then(s => { if(live){ status = s; s.onchange = sync; } })
      .catch(() => { /* unsupported descriptor; the one-off read above still applies */ });
    return () => { live = false; if(status) status.onchange = null; };
  }, []);
  return state;
}

// Written to be read aloud to someone over the phone, so no jargon and no shorthand.
export function micRecoverySteps():string[]{
  if(/iPad|iPhone|iPod/.test(navigator.userAgent)) return [
    'Open the Settings app on your phone.',
    'Scroll down and tap the name of the browser you are using.',
    'Turn Microphone on, then come back here.',
  ];
  return [
    'Look at the top of the screen, just left of the web address.',
    'Tap the small icon there — it looks like a lock, or two little sliders.',
    'Turn Microphone on, then come back here.',
  ];
}
