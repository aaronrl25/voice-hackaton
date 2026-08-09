export type VoiceState = "idle" | "listening" | "thinking";
type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

export class VoiceOSAdapter {
  private recognition?: InstanceType<SpeechRecognitionCtor>;
  start(
    onTranscript: (text: string) => void,
    onState: (state: VoiceState) => void,
  ) {
    const Ctor =
      (window as any).SpeechRecognition ||
      ((window as any).webkitSpeechRecognition as
        SpeechRecognitionCtor | undefined);
    if (!Ctor) return false;
    const recognition = new Ctor();
    this.recognition = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      if (event.results[event.results.length - 1].isFinal) onTranscript(text);
    };
    recognition.onend = () => onState("idle");
    recognition.onerror = () => onState("idle");
    onState("listening");
    recognition.start();
    return true;
  }
  stop() {
    this.recognition?.stop();
  }
  speak(text: string) {
    window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));
  }
}
