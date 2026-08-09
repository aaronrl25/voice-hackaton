import { useState } from 'react';
import { ArrowLeft, Check, Mic, Phone, ShieldCheck, Square, Volume2 } from 'lucide-react';
import { contacts } from './data';
import { cleanName, type Profile } from './profile';
import { VoiceOSAdapter, voiceError, type VoiceState } from './voiceos';

const TOTAL = 4;

// Every step is one question, one large control, and a way out. Nothing here may
// dead-end: each step can be skipped, and skipping still produces a usable profile.
export default function Onboarding({voiceOS,onDone}:{voiceOS:VoiceOSAdapter,onDone:(profile:Profile)=>void}){
  const [step,setStep]=useState(0);
  const [name,setName]=useState('');
  const [draft,setDraft]=useState('');
  const [typing,setTyping]=useState(false);
  const [trustedId,setTrustedId]=useState(contacts[0].id);
  const [voice,setVoice]=useState<VoiceState>('idle');
  const [heard,setHeard]=useState('');
  const [micTested,setMicTested]=useState(false);
  const [notice,setNotice]=useState('');

  const trusted=contacts.find(c=>c.id===trustedId)!;

  // Spoken only when advancing, never on mount: browsers block speech synthesis
  // until the user has interacted with the page at least once.
  function go(next:number, line?:string){
    voiceOS.stop(); voiceOS.cancelSpeech();
    setHeard(''); setNotice(''); setVoice('idle'); setTyping(false);
    setStep(next);
    if(line) voiceOS.speak(line,setVoice,'reassuring');
  }

  function listen(onHeard:(text:string)=>void){
    if(voice==='listening'){ voiceOS.stop(); return; }
    voiceOS.cancelSpeech(); setHeard(''); setNotice('');
    voiceOS.start({
      onState:setVoice,
      onInterim:setHeard,
      onTranscript:onHeard,
      onError:code=>{ setVoice('idle'); setNotice(voiceError(code)); },
    });
  }

  const finish=(finalName:string)=>onDone({name:finalName||'friend',trustedId,onboarded:true});

  return <div className="onboard">
    <header>
      <div className="brand"><div className="brandmark"><ShieldCheck/></div><div><b>Grandma Mode</b><span>Safe help, every step</span></div></div>
    </header>

    <main className="onboard-main">
      {step>0&&<div className="onboard-top">
        <button className="back" onClick={()=>go(step-1)}><ArrowLeft/>Back</button>
        <p className="onboard-count">Step {step} of {TOTAL-1}</p>
      </div>}

      {step===0&&<section className="onboard-step">
        <div className="onboard-mark"><ShieldCheck/></div>
        <h1>Hi. I’m here to help keep you safe.</h1>
        <p className="onboard-lead">I can check whether a message is real, remind you about your day, and get someone you trust if anything looks wrong.</p>
        <p className="onboard-lead">Setting up takes about a minute. I’ll ask you three small things.</p>
        <button className="onboard-primary" onClick={()=>go(1,'Alright, let\'s start. Tap the big button and just say hello, so we can check that I can hear you.')}>Let’s get started</button>
      </section>}

      {step===1&&<section className="onboard-step">
        <h1>First, let’s check I can hear you.</h1>
        <p className="onboard-lead">Tap the big button and say <b>hello</b>. I only listen after you tap — never before.</p>
        <button className={`mic ${voice}`} onClick={()=>listen(text=>{setHeard(text);setMicTested(true);voiceOS.speak('Perfect. I heard you clearly. That is all there is to it.',setVoice,'friendly');})} aria-label={voice==='listening'?'Stop listening':'Tap and say hello'}>
          <span className="ring"/><span className="ring wide"/>
          {voice==='listening'?<Square/>:voice==='speaking'?<Volume2/>:<Mic/>}
        </button>
        <p className="onboard-state" aria-live="polite">{voice==='listening'?'I’m listening…':micTested?'Perfect — that’s all there is to it.':'Waiting for you to tap'}</p>
        {heard&&<p className="onboard-heard">“{heard}”</p>}
        {notice&&<p className="onboard-notice">{notice}</p>}
        <button className="onboard-primary" onClick={()=>go(2,'Great. Now, what should I call you? Tap the button and say your name.')}>{micTested?'Continue':'Continue without testing'}</button>
      </section>}

      {step===2&&<section className="onboard-step">
        <h1>What should I call you?</h1>
        {!typing&&<>
          <p className="onboard-lead">Tap the button and say your first name.</p>
          <button className={`mic ${voice}`} onClick={()=>listen(text=>{const n=cleanName(text);setName(n);setHeard(n);voiceOS.speak(n?`Did you say ${n}?`:'Sorry, I did not catch that. Try once more.',setVoice,'reassuring');})} aria-label={voice==='listening'?'Stop listening':'Tap and say your name'}>
            <span className="ring"/><span className="ring wide"/>
            {voice==='listening'?<Square/>:voice==='speaking'?<Volume2/>:<Mic/>}
          </button>
          <p className="onboard-state" aria-live="polite">{voice==='listening'?'I’m listening…':'Waiting for you to tap'}</p>
          {name&&<div className="onboard-confirm">
            <p>Did I get that right?</p>
            <strong>{name}</strong>
            <button className="onboard-primary" onClick={()=>go(3,`Lovely to meet you, ${name}. Last thing: who should I call if something looks wrong?`)}><Check/>Yes, that’s me</button>
          </div>}
          {notice&&<p className="onboard-notice">{notice}</p>}
          <button className="onboard-link" onClick={()=>{setTyping(true);setDraft(name)}}>Type it instead</button>
        </>}
        {typing&&<>
          <p className="onboard-lead">Type your first name, then tap Continue.</p>
          <input className="onboard-input" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Your name" aria-label="Your first name" autoFocus/>
          <button className="onboard-primary" onClick={()=>{const n=cleanName(draft);setName(n);go(3,n?`Lovely to meet you, ${n}. Last thing: who should I call if something looks wrong?`:'Last thing: who should I call if something looks wrong?')}}>Continue</button>
          <button className="onboard-link" onClick={()=>setTyping(false)}>Say it out loud instead</button>
        </>}
        {!typing&&!name&&<button className="onboard-link" onClick={()=>go(3,'No problem. Last thing: who should I call if something looks wrong?')}>Skip for now</button>}
      </section>}

      {step===3&&<section className="onboard-step">
        <h1>Who should I call if something looks wrong?</h1>
        <p className="onboard-lead">For anything risky, I’ll check with them as well as you. Two people, one safe decision.</p>
        <div className="onboard-picks">
          {contacts.map(c=><button key={c.id} className={`onboard-pick ${c.id===trustedId?'chosen':''}`} onClick={()=>setTrustedId(c.id)} aria-pressed={c.id===trustedId}>
            <span className="avatar">{c.initials}</span>
            <span className="onboard-pick-copy"><b>{c.name}</b><small>{c.relationship}</small></span>
            {c.id===trustedId?<Check/>:<Phone/>}
          </button>)}
        </div>
        <button className="onboard-primary" onClick={()=>finish(name)}><Check/>All done</button>
        <p className="onboard-foot">You can change this later on the People screen.</p>
      </section>}

      <div className="onboard-dots" aria-hidden="true">
        {Array.from({length:TOTAL},(_,i)=><span key={i} className={i===step?'on':''}/>)}
      </div>
      {step>0&&step<3&&<button className="onboard-link quiet" onClick={()=>finish(name)}>Skip setup — I’ll do this later</button>}
    </main>
  </div>
}
