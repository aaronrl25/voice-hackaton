export type VoiceState = 'idle' | 'listening' | 'thinking';
type SpeechRecognitionCtor = new () => { continuous:boolean; interimResults:boolean; lang:string; start():void; stop():void; onresult:((e:any)=>void)|null; onend:(()=>void)|null; onerror:(()=>void)|null };

export class VoiceOSAdapter {
  private recognition?: InstanceType<SpeechRecognitionCtor>;
  start(onTranscript:(text:string)=>void, onState:(state:VoiceState)=>void) {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition as SpeechRecognitionCtor | undefined;
    if (!Ctor) return false;
    this.recognition = new Ctor();
    this.recognition.continuous = false; this.recognition.interimResults = true; this.recognition.lang = 'en-US';
    this.recognition.onresult = (event:any) => {
      const text = Array.from(event.results).map((r:any) => r[0].transcript).join('');
      if (event.results[event.results.length-1].isFinal) onTranscript(text);
    };
    this.recognition.onend = () => onState('idle'); this.recognition.onerror = () => onState('idle');
    onState('listening'); this.recognition.start(); return true;
  }
  stop(){ this.recognition?.stop(); }
  speak(text:string){ window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text)); }
}
