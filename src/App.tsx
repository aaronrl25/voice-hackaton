import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, Clock3, FileText, Headphones, HelpCircle, Home, Info, LockKeyhole, MessageCircle, Mic, Phone, Plus, ShieldCheck, Square, Trash2, UserRound, Users, Volume2, X } from 'lucide-react';
import { contacts, seedRequests } from './data';
import { analyzeMessage, askClaude, liveAnalysis } from './analysis';
import { interpret, type Tab } from './commands';
import Landing from './Landing';
import Onboarding from './Onboarding';
import { blankProfile, loadProfile, saveProfile, type Profile } from './profile';
import type { Tone } from './speech';
import { VoiceOSAdapter, voiceError, voiceSupported, type VoiceState } from './voiceos';
import type { RequestItem, Risk } from './types';
import { createRequest, deleteRequest, readProfile, seedRequestsIfEmpty, updateRequest, watchRequests, writeProfile } from './firebaseData';
import { firebaseReady } from './firebase';
import { requestCall } from './calling';
import wolfieScanning from './assets/wolfie-scanning-removebg-preview.png';
import wolfieWelcome from './assets/wolfie-welcome-removebg-preview.png';
import wolfieWelcomeSecond from './assets/wolfie-welcome-removebg-preview (1).png';
const wolfieSpeechPoses=[wolfieScanning,wolfieWelcome,wolfieWelcomeSecond];
const fmt=(n:number)=>new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit'}).format(n);
const riskCopy:Record<Risk,{label:string,icon:typeof Check,color:string}>={low:{label:'Looks safe',icon:CheckCircle2,color:'green'},medium:{label:'Let’s double-check',icon:HelpCircle,color:'amber'},high:{label:'This looks dangerous',icon:AlertTriangle,color:'red'}};
const stage:Record<VoiceState,{title:string,hint:string,label:string}>={
  idle:{title:'Tap to talk to me',hint:'Press the big button, then say what you need.',label:'Start talking to Grandma Mode'},
  listening:{title:'I’m listening…',hint:'Take your time. Speak in your own words.',label:'Stop listening'},
  thinking:{title:'Let me check that…',hint:'One moment please.',label:'Thinking'},
  speaking:{title:'Here’s what I found',hint:'Tap the button if you want me to stop.',label:'Stop speaking'},
};
const statusWord:Record<VoiceState,string>={idle:'Ready',listening:'Listening',thinking:'Checking',speaking:'Speaking'};
const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'};
const unpunctuated=(s:string)=>s.replace(/[.!?…]+\s*$/,'');
const spokenList=(xs:string[])=>xs.length<2?xs.join(''):`${xs.slice(0,-1).join(', ')}, and ${xs[xs.length-1]}`;

export default function App(){
  const [items,setItems]=useState(seedRequests);
  const [selected,setSelected]=useState<string|null>(null);
  const [tab,setTab]=useState<Tab>('home');
  const [voice,setVoice]=useState<VoiceState>('idle');
  const [heard,setHeard]=useState(''); const [reply,setReply]=useState(''); const [notice,setNotice]=useState('');
  const [lastTone,setLastTone]=useState<Tone>('neutral');
  const [wolfiePose,setWolfiePose]=useState(0);
  const [calling,setCalling]=useState(false);
  const [pendingCall,setPendingCall]=useState<{who:string,phone:string}|null>(null);
  const [callMessage,setCallMessage]=useState('');
  const [callStep,setCallStep]=useState<'compose'|'confirm'>('compose');
  const [typingMessage,setTypingMessage]=useState(false);
  const confirmRef=useRef<HTMLButtonElement|null>(null);
  const voiceRef=useRef<VoiceOSAdapter|null>(null); voiceRef.current??=new VoiceOSAdapter(); const voiceOS=voiceRef.current;
  const supported=useMemo(voiceSupported,[]);
  // Always begin with the public story. A saved profile is used only after the
  // person deliberately signs in; it should never make the landing page vanish.
  const [authed,setAuthed]=useState(false);
  const [uid,setUid]=useState('');
  const [profile,setProfile]=useState(loadProfile);
  const trusted=contacts.find(c=>c.id===profile.trustedId)??contacts[0];
  const item=items.find(x=>x.id===selected);
  const waiting=items.filter(x=>x.status==='awaiting_user'||x.status==='awaiting_trusted');

  useEffect(()=>{
    if(voice!=='speaking'){ setWolfiePose(0); return; }
    const timer=window.setInterval(()=>setWolfiePose(current=>(current+1)%wolfieSpeechPoses.length),650);
    return ()=>window.clearInterval(timer);
  },[voice]);

  // window.confirm gave Escape-to-cancel and focus for free; an in-app dialog has to
  // provide both, or it is unusable by keyboard and invisible to a screen reader.
  useEffect(()=>{
    if(!pendingCall) return;
    // confirmRef only exists on the confirm step; on compose the mic leads.
    if(callStep==='confirm') confirmRef.current?.focus();
    const onKey=(event:KeyboardEvent)=>{ if(event.key==='Escape'){ voiceOS.stop(); setPendingCall(null); } };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[pendingCall,callStep,voiceOS]);

  useEffect(()=>{
    if(!uid||!firebaseReady)return;
    let active=true;
    void seedRequestsIfEmpty(uid,seedRequests).catch(error=>setNotice(error.message));
    const stop=watchRequests(uid,next=>{if(active)setItems(next)},error=>setNotice(error.message));
    return ()=>{active=false;stop()};
  },[uid]);

  function update(id:string, patch:Partial<RequestItem>){
    setItems(xs=>xs.map(x=>x.id===id?{...x,...patch}:x));
    if(uid&&firebaseReady)void updateRequest(uid,id,patch).catch(error=>setNotice(error.message));
  }
  function addDemoCheck(){
    const item:RequestItem={id:crypto.randomUUID(),title:'New message to review',detail:'Please review this new request before taking action.',source:'New sender',createdAt:Date.now(),risk:'medium',score:50,reasons:['New sender','Action needs confirmation'],status:'awaiting_user'};
    if(uid&&firebaseReady)void createRequest(uid,item).catch(error=>setNotice(error.message));
    else setItems(items=>[item,...items]);
  }
  function remove(id:string){
    setSelected(null);
    if(uid&&firebaseReady)void deleteRequest(uid,id).catch(error=>setNotice(error.message));
    else setItems(items=>items.filter(item=>item.id!==id));
  }
  function say(text:string, tone:Tone='neutral'){ setReply(text); setLastTone(tone); voiceOS.speak(text,setVoice,tone); }
  async function answer(text:string){
    setHeard(text);
    if(/\b(call me|call my phone|ring me|call my trusted|call someone i trust)\b/i.test(text)){callContact(trusted.name,trusted.phone);return;}
    const out=interpret(text,items,trusted.name);
    if(out.tab)setTab(out.tab);
    if(out.open)setSelected(out.open);
    if(liveAnalysis){
      setVoice('thinking');
      const opened=out.open?items.find(x=>x.id===out.open):undefined;
      const safetyQuestion=/\b(safe|scam|fraud|suspicious|message|text|bank|money|transfer)\b/i.test(text);
      if(opened&&safetyQuestion){
        const verdict=await analyzeMessage(opened.detail,opened.source);
        if(verdict?.source==='model'){
          update(opened.id,{risk:verdict.risk,score:verdict.score,reasons:verdict.reasons});
          say(verdict.spokenVerdict||`I checked it with Claude. The risk score is ${verdict.score} out of 100.`,verdict.risk==='high'?'warning':verdict.risk==='low'?'friendly':'neutral');
          return;
        }
      }
      const context=opened?`\n\nApp context: The user is viewing a saved item titled "${opened.title}" from "${opened.source}". Its content is: "${opened.detail}".`:'';
      const live=await askClaude(`${text}${context}`,trusted.name);
      if(live?.source==='model'){say(live.text,live.tone);return;}
    }
    say(out.say,out.tone);
  }
  function listen(){
    if(voice==='listening'){ voiceOS.stop(); return; }
    if(voice==='speaking'){ voiceOS.cancelSpeech(); setVoice('idle'); return; }
    setHeard(''); setReply(''); setNotice('');
    voiceOS.start({onState:setVoice,onInterim:setHeard,onTranscript:answer,onError:code=>{setVoice('idle');setNotice(voiceError(code))}});
  }
  function ask(text:string){ voiceOS.stop(); setNotice(''); void answer(text); }
  function approve(x:RequestItem){ if(x.risk==='medium'){update(x.id,{status:'completed',userApproved:true,receipt:'Confirmed by you · No sensitive information shared'});say("Nice, that's all done. I saved you a receipt.",'friendly');} else {update(x.id,{status:'awaiting_trusted',userApproved:true});say(`Got it, your approval is in. ${trusted.name} still needs to say yes before anything happens.`,'reassuring');} }
  function trustedApprove(x:RequestItem){update(x.id,{status:'approved',trustedApproved:true,receipt:'Dual approval recorded · Action remains paused for manual verification'});say("Alright, both approvals are in. Nothing has been sent yet.",'reassuring');}
  function block(x:RequestItem){update(x.id,{status:'blocked',receipt:'Blocked by you · Sender not contacted'});setSelected(null);say("Blocked. Nothing went out, and nobody got contacted.",'reassuring');}
  // A real phone call that costs money is exactly the wrong thing to put behind a
  // small native confirm dialog on a phone. Ask in the app's own language instead.
  // Wolfie delivers a message and asks them to call back — it never holds a
  // conversation, and never takes an approval. So the user has to say what they
  // want passed on before the call is placed.
  function callContact(name:string,phone:string){
    setCallMessage(''); setTypingMessage(false); setCallStep('compose');
    setPendingCall({who:name,phone});
  }
  function dictateMessage(){
    if(voice==='listening'){ voiceOS.stop(); return; }
    voiceOS.cancelSpeech();
    voiceOS.start({
      onState:setVoice,
      onInterim:setCallMessage,
      onTranscript:text=>{ setCallMessage(text); setCallStep('confirm'); },
      onError:code=>{ setVoice('idle'); setNotice(voiceError(code)); setTypingMessage(true); },
    });
  }

  async function startCall(){
    const request=pendingCall; if(!request) return;
    setPendingCall(null); setCalling(true);
    setNotice(`Calling ${request.who}…`);
    try{
      const result=await requestCall(request.phone,callMessage.trim(),profile.name||undefined);
      setNotice(`${result.message} ${request.who}'s phone should ring shortly.`);
      say(`The call to ${request.who} is on the way. Their phone should ring shortly.`,'friendly');
    }catch(error){
      if(request.phone){
        const dialable=request.phone.replace(/\D/g,'');
        setNotice(`Opening your phone to call ${request.who}…`);
        window.location.href=`tel:${dialable}`;
      } else setNotice(error instanceof Error?error.message:'The call could not be started.');
    }
    finally{setCalling(false);}
  }

  if(!authed) return <Landing onEnter={async(isNewAccount,userId)=>{
    setUid(userId);
    if(isNewAccount){
      saveProfile(blankProfile);
      setProfile(blankProfile);
      if(firebaseReady)await writeProfile(userId,blankProfile);
    } else {
      const remote=firebaseReady?await readProfile(userId):loadProfile();
      if(remote){saveProfile(remote);setProfile(remote);}
    }
    setAuthed(true);
  }}/>;
  if(!profile.onboarded) return <Onboarding voiceOS={voiceOS} onDone={(p:Profile)=>{saveProfile(p);setProfile(p);if(uid&&firebaseReady)void writeProfile(uid,p);say(`You're all set, ${p.name}. Any time you need me, just tap the big button and talk.`,'friendly');}}/>;
  if(item) return <Detail item={item} trusted={trusted.name} back={()=>setSelected(null)} speak={say} approve={()=>approve(item)} trustedApprove={()=>trustedApprove(item)} dismiss={()=>block(item)} remove={()=>remove(item.id)}/>;

  return <div className="shell">
    <header>
      <div className="brand"><div className="brandmark"><ShieldCheck/></div><div><b>Grandma Mode</b><span>Safe help, every step</span></div></div>
      <button className="help" onClick={()=>callContact(trusted.name,trusted.phone)} disabled={calling}><Phone/><span>{calling?'Calling…':`Call ${trusted.name}`}</span></button>
    </header>
    <main>
      {notice&&<div className="notice" role="status"><Info/><p>{notice}</p><button aria-label="Dismiss message" onClick={()=>setNotice('')}><X/></button></div>}

      {tab==='home'&&<>
        <section className="protection-strip" aria-label="Protection status">
          <div><span className="status-orb"><ShieldCheck/></span><p><small>Guardian status</small><b>Wolfie is active</b></p></div>
          <div><span className="status-orb"><Clock3/></span><p><small>Checks reviewed</small><b>{items.length} safety checks</b></p></div>
          <div><span className="status-orb"><Users/></span><p><small>Safety circle</small><b>{trusted.name} is connected</b></p></div>
        </section>
        <section className="stage">
          {/* Decorative twin of the stage title, which already announces state via aria-live. */}
          <div className="voice-status" aria-hidden="true"><span/>{statusWord[voice]}<i/><i/><i/></div>
          <p className="eyebrow"><span className="pulse"/> You’re protected</p>
          <h1>{greeting()}, {profile.name}.</h1>
          <img className={`dashboard-wolfie pose-${wolfiePose}`} src={wolfieSpeechPoses[wolfiePose]} alt="Wolfie, your safety companion"/>
          <button className={`mic ${voice}`} onClick={listen} aria-label={stage[voice].label}>
            <span className="ring"/><span className="ring wide"/>
            {voice==='listening'?<Square/>:voice==='speaking'?<Volume2/>:<Mic/>}
          </button>
          <h2 className="stage-title" aria-live="polite">{stage[voice].title}</h2>
          <p className="stage-hint">{stage[voice].hint}</p>
          {!supported&&<p className="stage-hint">Voice is not available here — the big buttons below do the same thing.</p>}
          {(heard||reply)&&<div className="convo">
            {heard&&<p className="said"><small>You said</small>“{heard}”</p>}
            {reply&&<div className="answered"><small>Grandma Mode</small><p>{reply}</p><button onClick={()=>say(reply,lastTone)}><Volume2/>Say it again</button></div>}
          </div>}
          <div className="suggestions">
            <button onClick={()=>ask('Is this message safe?')}><MessageCircle/>Check a message</button>
            <button onClick={()=>ask('Explain a bill')}><FileText/>Explain a bill</button>
            <button onClick={()=>ask(`Call ${trusted.name}`)}><Users/>Call {trusted.name}</button>
          </div>
        </section>

        <div className="stack">
          {waiting.length>0&&<section className="waiting">
            <h2>Waiting for your answer</h2>
            {waiting.map(x=><button key={x.id} className="waiting-row" onClick={()=>setSelected(x.id)}>
              <span className={`risk-icon ${riskCopy[x.risk].color}`}>{(()=>{const I=riskCopy[x.risk].icon;return <I/>})()}</span>
              <span><b>{x.title}</b><small>{x.source}</small></span><ChevronRight/>
            </button>)}
          </section>}
          <Section items={items} select={setSelected} seeAll={()=>setTab('activity')}/>
        </div>
      </>}

      {tab==='activity'&&<div className="stack">
        <div className="page-title"><p className="eyebrow">Your safety record</p><h1>Recent activity</h1><p>Every check and approval is saved here.</p><button className="add-check" onClick={addDemoCheck}><Plus/>Add demo safety check</button></div>
        <Section items={items} select={setSelected} all/>
      </div>}

      {tab==='people'&&<div className="stack">
        <div className="page-title"><p className="eyebrow">Your safety circle</p><h1>Trusted people</h1><p>High-risk actions need help from someone you trust.</p></div>
        <div className="contact-grid">{contacts.map(c=><article className="contact" key={c.id}>
          <div className="avatar">{c.initials}<span className={c.available?'online':''}/></div>
          <div className="contact-copy"><h3>{c.name}</h3><p>{c.relationship}</p><small>{c.phone}</small>
            {c.id===profile.trustedId
              ?<em className="trusted-badge"><Check/>Your trusted person</em>
              :<button className="trusted-choose" onClick={()=>{const next={...profile,trustedId:c.id};saveProfile(next);setProfile(next);if(uid&&firebaseReady)void writeProfile(uid,next);say(`Okay. From now on I'll check with ${c.name}.`,'reassuring');}}>Make {c.name} my trusted person</button>}
          </div>
          <button type="button" aria-label={`Call ${c.name} at ${c.phone}`} disabled={calling} onClick={()=>void callContact(c.name,c.phone)}><Phone/></button>
        </article>)}</div>
        <div className="info-panel"><LockKeyhole/><div><h3>Two people, one safe decision</h3><p>Grandma Mode never completes a high-risk action unless both you and a trusted person approve.</p></div></div>
      </div>}
    </main>
    <nav>
      <button className={tab==='home'?'active':''} aria-current={tab==='home'} onClick={()=>setTab('home')}><Home/>Home</button>
      <button className={tab==='activity'?'active':''} aria-current={tab==='activity'} onClick={()=>setTab('activity')}><Clock3/>Activity</button>
      <button className={tab==='people'?'active':''} aria-current={tab==='people'} onClick={()=>setTab('people')}><Users/>People</button>
    </nav>

    {pendingCall&&<div className="sheet" role="dialog" aria-modal="true" aria-labelledby="call-title"
      onClick={event=>{ if(event.target===event.currentTarget){ voiceOS.stop(); setPendingCall(null); } }}>
      <div className="sheet-card">
        {callStep==='confirm'&&<span className="sheet-icon"><Phone/></span>}

        {callStep==='compose'?<>
          <h2 id="call-title">What should I tell {pendingCall.who}?</h2>
          <p>I will pass it on and ask them to call you back.</p>

          {!typingMessage&&<>
            <button className={`mic sheet-mic ${voice}`} onClick={dictateMessage}
              aria-label={voice==='listening'?'Stop recording your message':`Tap and say your message for ${pendingCall.who}`}>
              <span className="ring"/>
              {voice==='listening'?<Square/>:<Mic/>}
            </button>
            <p className="sheet-state" aria-live="polite">{voice==='listening'?'I’m listening…':'Tap and say it out loud'}</p>
          </>}

          {typingMessage&&<textarea className="sheet-input" value={callMessage} rows={3} autoFocus
            aria-label={`Message for ${pendingCall.who}`} placeholder={`Tell ${pendingCall.who}…`}
            onChange={event=>setCallMessage(event.target.value)}/>}

          {callMessage&&!typingMessage&&<p className="sheet-heard">“{callMessage}”</p>}

          <button className="sheet-yes" disabled={!callMessage.trim()} onClick={()=>setCallStep('confirm')}>
            <Check/>That’s my message
          </button>
          <button className="sheet-no" onClick={()=>{ voiceOS.stop(); setCallMessage(''); setCallStep('confirm'); }}>
            Just ask {pendingCall.who} to call me
          </button>
          <button className="sheet-link" onClick={()=>{ voiceOS.stop(); setTypingMessage(value=>!value); }}>
            {typingMessage?'Say it out loud instead':'Type it instead'}
          </button>
        </>:<>
          <h2 id="call-title">Call {pendingCall.who}?</h2>
          {callMessage.trim()
            ?<><p>I will say this to {pendingCall.who}, then ask them to call you back:</p>
               <p className="sheet-heard">“{callMessage.trim()}”</p></>
            :<p>I will ask {pendingCall.who} to call you back. No message.</p>}
          <p className="sheet-number">{pendingCall.phone}</p>
          <button ref={confirmRef} className="sheet-yes" onClick={()=>void startCall()}>
            <Phone/>Yes, call {pendingCall.who}
          </button>
          <button className="sheet-no" onClick={()=>setCallStep('compose')}>Change the message</button>
          <button className="sheet-link" onClick={()=>{ voiceOS.stop(); setPendingCall(null); }}>No, not now</button>
        </>}

        <p className="sheet-note">This makes a real phone call. It costs up to 60 cents.</p>
      </div>
    </div>}
  </div>
}

function Section({items,select,all=false,seeAll}:{items:RequestItem[],select:(id:string)=>void,all?:boolean,seeAll?:()=>void}){
  return <section className="activity">
    <div className="section-head">
      <div><p className="eyebrow">{all?'All checks':'Latest checks'}</p><h2>{all?'Safety timeline':'Recent activity'}</h2></div>
      {!all&&seeAll&&<button onClick={seeAll}>See all <ChevronRight/></button>}
    </div>
    <div className="activity-list">{items.map(x=>{const rc=riskCopy[x.risk],Icon=rc.icon;return <button className="activity-row" key={x.id} onClick={()=>select(x.id)}>
      <span className={`risk-icon ${rc.color}`}><Icon/></span>
      <span className="activity-copy"><b>{x.title}</b><small>{x.source} · {fmt(x.createdAt)}</small><em className={`risk-pill ${rc.color}`}>{rc.label}</em></span>
      <ChevronRight/>
    </button>})}</div>
  </section>
}

function Detail({item,trusted,back,speak,approve,trustedApprove,dismiss,remove}:{item:RequestItem,trusted:string,back:()=>void,speak:(t:string,tone?:Tone)=>void,approve:()=>void,trustedApprove:()=>void,dismiss:()=>void,remove:()=>void}){
  const rc=riskCopy[item.risk],Icon=rc.icon,high=item.risk==='high';
  const tone:Tone=high?'warning':item.risk==='low'?'friendly':'neutral';
  const aloud=()=>speak(`${rc.label}. Here's the message from ${item.source}. ${unpunctuated(item.detail)}. I flagged it because: ${spokenList(item.reasons.map(r=>r.toLowerCase()))}.`,tone);
  return <div className="detail-shell">
    <header><button className="back" onClick={back}><ArrowLeft/>Back</button><div className="brand"><div className="brandmark"><ShieldCheck/></div><div><b>Grandma Mode</b><span>Safety check</span></div></div></header>
    <main className="detail-main">
      <div className={`verdict ${rc.color}`}><Icon/><div><p>Wolfie safety analysis</p><h1>{rc.label}</h1><span>Risk score {item.score} out of 100</span><span className="risk-meter" aria-hidden="true"><i style={{width:`${item.score}%`}}/></span></div></div>
      <button className="aloud" onClick={aloud}><Volume2/>Read this to me</button>
      <article className="message-card">
        <div className="sender"><div className="sender-icon"><UserRound/></div><div><small>Message from</small><h2>{item.source}</h2></div><span>{fmt(item.createdAt)}</span></div>
        <blockquote>“{item.detail}”</blockquote>
      </article>
      <div className="why"><h2>Why I flagged this</h2>{item.reasons.map(r=><div key={r}><AlertTriangle/><span>{r}</span></div>)}</div>
      {high&&<div className="gate">
        <div className="gate-title"><LockKeyhole/><div><p>Action Gate</p><h2>Two approvals required</h2></div></div>
        <div className="approval-track"><Approval done={!!item.userApproved} label="Your approval" sub={item.userApproved?'Approved':'Waiting for you'}/><span className="trackline"/><Approval done={!!item.trustedApproved} label={`${trusted}’s approval`} sub={item.trustedApproved?'Approved':'Trusted contact'}/></div>
        <p className="gate-note"><ShieldCheck/>Nothing can happen until both people say yes.</p>
      </div>}
      {item.receipt&&<div className="receipt"><CheckCircle2/><div><b>Safety receipt</b><p>{item.receipt}</p></div></div>}
      <div className="actions">
        {item.status==='awaiting_trusted'?<button className="primary" onClick={trustedApprove}><Users/>Simulate {trusted}’s approval</button>
          :item.status!=='completed'&&item.status!=='approved'&&<button className="primary" onClick={approve}>{high?<><LockKeyhole/>Yes, ask {trusted} too</>:<><Check/>Yes, continue safely</>}</button>}
        <button className="secondary" onClick={dismiss}><X/>No, block this</button>
      </div>
      <p className="reassure"><Headphones/>Not sure? Tap “Read this to me”, or call {trusted}.</p>
      <button className="delete-record" onClick={remove}><Trash2/>Delete this record</button>
    </main>
  </div>
}

function Approval({done,label,sub}:{done:boolean,label:string,sub:string}){return <div className={`approval ${done?'done':''}`}><span>{done?<Check/>:<UserRound/>}</span><b>{label}</b><small>{sub}</small></div>}
