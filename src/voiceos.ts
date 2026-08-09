export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

type Recognition = {
  continuous:boolean; interimResults:boolean; lang:string; maxAlternatives:number;
  start():void; stop():void; abort():void;
  onstart:(()=>void)|null; onresult:((e:any)=>void)|null; onend:(()=>void)|null; onerror:((e:any)=>void)|null;
};
type RecognitionCtor = new () => Recognition;

export type VoiceHandlers = {
  onState:(state:VoiceState)=>void;
  onInterim:(text:string)=>void;
  onTranscript:(text:string)=>void;
  onError:(code:string)=>void;
};

const ctor = ():RecognitionCtor|undefined => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
export const voiceSupported = () => !!ctor();

const errors:Record<string,string> = {
  unsupported:'This browser cannot listen yet. You can still tap the large buttons — everything works by tapping.',
  'not-allowed':'I need your permission to use the microphone. Allow it, then tap the big button again.',
  'service-not-allowed':'I need your permission to use the microphone. Allow it, then tap the big button again.',
  'no-speech':'I did not hear anything. Tap the big button and speak when it turns red.',
  'audio-capture':'I cannot find a microphone on this device.',
  network:'I could not reach the listening service. Please check your internet, then try again.',
};
export const voiceError = (code:string) => errors[code] ?? 'Something went wrong, so I did nothing. Tap the big button to try again.';

export class VoiceOSAdapter {
  private recognition?: Recognition;
  listening = false;

  start(handlers:VoiceHandlers){
    const Ctor = ctor();
    if(!Ctor){ handlers.onError('unsupported'); return false; }
    if(this.listening) return true;
    this.cancelSpeech();
    const r = new Ctor(); this.recognition = r;
    r.continuous = false; r.interimResults = true; r.lang = 'en-US'; r.maxAlternatives = 1;
    let final = '';
    r.onstart = () => { this.listening = true; handlers.onState('listening'); };
    r.onresult = (event:any) => {
      let interim = '';
      for(let i = event.resultIndex; i < event.results.length; i++){
        const result = event.results[i];
        if(result.isFinal) final += result[0].transcript; else interim += result[0].transcript;
      }
      handlers.onInterim((final + interim).trim());
    };
    r.onerror = (event:any) => { this.listening = false; handlers.onError(event?.error ?? 'error'); };
    r.onend = () => {
      this.listening = false;
      const text = final.trim();
      if(text){ handlers.onState('thinking'); handlers.onTranscript(text); } else handlers.onState('idle');
    };
    try { r.start(); } catch { this.listening = false; handlers.onState('idle'); return false; }
    return true;
  }

  stop(){ try { this.recognition?.stop(); } catch { /* already stopped */ } }

  speak(text:string, onState:(state:VoiceState)=>void){
    const synth = window.speechSynthesis;
    if(!synth){ onState('idle'); return; }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = .9; utterance.pitch = 1; utterance.volume = 1;
    utterance.onstart = () => onState('speaking');
    utterance.onend = () => onState('idle');
    utterance.onerror = () => onState('idle');
    synth.speak(utterance);
  }

  cancelSpeech(){ window.speechSynthesis?.cancel(); }
}
