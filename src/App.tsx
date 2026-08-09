import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, Clock3, Headphones, HelpCircle, Home, Info, LockKeyhole, Mic, Phone, ShieldCheck, Square, UserRound, Users, Volume2, X } from 'lucide-react';
import { contacts, seedRequests } from './data';
import { interpret, type Tab } from './commands';
import Landing from './Landing';
import Onboarding from './Onboarding';
import { blankProfile, loadProfile, saveProfile, type Profile } from './profile';
import type { Tone } from './speech';
import { VoiceOSAdapter, voiceError, voiceSupported, type VoiceState } from './voiceos';
import type { RequestItem, Risk } from './types';
const fmt=(n:number)=>new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit'}).format(n);
const riskCopy:Record<Risk,{label:string,icon:typeof Check,color:string}>={low:{label:'Looks safe',icon:CheckCircle2,color:'green'},medium:{label:'Let’s double-check',icon:HelpCircle,color:'amber'},high:{label:'This looks dangerous',icon:AlertTriangle,color:'red'}};
const stage:Record<VoiceState,{title:string,hint:string,label:string}>={
  idle:{title:'Tap to talk to me',hint:'Press the big button, then say what you need.',label:'Start talking to Grandma Mode'},
  listening:{title:'I’m listening…',hint:'Take your time. Speak in your own words.',label:'Stop listening'},
  thinking:{title:'Let me check that…',hint:'One moment please.',label:'Thinking'},
  speaking:{title:'Here’s what I found',hint:'Tap the button if you want me to stop.',label:'Stop speaking'},
};
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
  const voiceRef=useRef<VoiceOSAdapter|null>(null); voiceRef.current??=new VoiceOSAdapter(); const voiceOS=voiceRef.current;
  const supported=useMemo(voiceSupported,[]);
  // Always begin with the public story. A saved profile is used only after the
  // person deliberately signs in; it should never make the landing page vanish.
  const [authed,setAuthed]=useState(false);
  const [profile,setProfile]=useState(loadProfile);
  const trusted=contacts.find(c=>c.id===profile.trustedId)??contacts[0];
  const item=items.find(x=>x.id===selected);
  const waiting=items.filter(x=>x.status==='awaiting_user'||x.status==='awaiting_trusted');

  function update(id:string, patch:Partial<RequestItem>){ setItems(xs=>xs.map(x=>x.id===id?{...x,...patch}:x)); }
  function say(text:string, tone:Tone='neutral'){ setReply(text); setLastTone(tone); voiceOS.speak(text,setVoice,tone); }
  function answer(text:string){ setHeard(text); const out=interpret(text,items,trusted.name); if(out.tab) setTab(out.tab); if(out.open) setSelected(out.open); say(out.say,out.tone); }
  function listen(){
    if(voice==='listening'){ voiceOS.stop(); return; }
    if(voice==='speaking'){ voiceOS.cancelSpeech(); setVoice('idle'); return; }
    setHeard(''); setReply(''); setNotice('');
    voiceOS.start({onState:setVoice,onInterim:setHeard,onTranscript:answer,onError:code=>{setVoice('idle');setNotice(voiceError(code))}});
  }
  function ask(text:string){ voiceOS.stop(); setNotice(''); answer(text); }
  function approve(x:RequestItem){ if(x.risk==='medium'){update(x.id,{status:'completed',userApproved:true,receipt:'Confirmed by you · No sensitive information shared'});say("Nice, that's all done. I saved you a receipt.",'friendly');} else {update(x.id,{status:'awaiting_trusted',userApproved:true});say(`Got it, your approval is in. ${trusted.name} still needs to say yes before anything happens.`,'reassuring');} }
  function trustedApprove(x:RequestItem){update(x.id,{status:'approved',trustedApproved:true,receipt:'Dual approval recorded · Action remains paused for manual verification'});say("Alright, both approvals are in. Nothing has been sent yet.",'reassuring');}
  function block(x:RequestItem){update(x.id,{status:'blocked',receipt:'Blocked by you · Sender not contacted'});setSelected(null);say("Blocked. Nothing went out, and nobody got contacted.",'reassuring');}

  if(!authed) return <Landing onEnter={(isNewAccount)=>{
    if(isNewAccount){
      saveProfile(blankProfile);
      setProfile(blankProfile);
    }
    setAuthed(true);
  }}/>;
  if(!profile.onboarded) return <Onboarding voiceOS={voiceOS} onDone={(p:Profile)=>{saveProfile(p);setProfile(p);say(`You're all set, ${p.name}. Any time you need me, just tap the big button and talk.`,'friendly');}}/>;
  if(item) return <Detail item={item} trusted={trusted.name} back={()=>setSelected(null)} speak={say} approve={()=>approve(item)} trustedApprove={()=>trustedApprove(item)} dismiss={()=>block(item)}/>;

  return <div className="shell">
    <header>
      <div className="brand"><div className="brandmark"><ShieldCheck/></div><div><b>Grandma Mode</b><span>Safe help, every step</span></div></div>
      <button className="help"><Phone/><span>Call {trusted.name}</span></button>
    </header>
    <main>
      {notice&&<div className="notice" role="status"><Info/><p>{notice}</p><button aria-label="Dismiss message" onClick={()=>setNotice('')}><X/></button></div>}

      {tab==='home'&&<>
        <section className="stage">
          <img className="dashboard-wolfie" src="/assets/wolfie-guardian.png" alt="" aria-hidden="true"/>
          <p className="eyebrow"><span className="pulse"/> You’re protected</p>
          <h1>{greeting()}, {profile.name}.</h1>
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
            <button onClick={()=>ask('What’s on my calendar?')}><Clock3/>“What’s on my calendar?”</button>
            <button onClick={()=>ask('Is this message safe?')}><AlertTriangle/>“Is this message safe?”</button>
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
        <div className="page-title"><p className="eyebrow">Your safety record</p><h1>Recent activity</h1><p>Every check and approval is saved here.</p></div>
        <Section items={items} select={setSelected} all/>
      </div>}

      {tab==='people'&&<div className="stack">
        <div className="page-title"><p className="eyebrow">Your safety circle</p><h1>Trusted people</h1><p>High-risk actions need help from someone you trust.</p></div>
        <div className="contact-grid">{contacts.map(c=><article className="contact" key={c.id}>
          <div className="avatar">{c.initials}<span className={c.available?'online':''}/></div>
          <div className="contact-copy"><h3>{c.name}</h3><p>{c.relationship}</p><small>{c.phone}</small>
            {c.id===profile.trustedId
              ?<em className="trusted-badge"><Check/>Your trusted person</em>
              :<button className="trusted-choose" onClick={()=>{const next={...profile,trustedId:c.id};saveProfile(next);setProfile(next);say(`Okay. From now on I'll check with ${c.name}.`,'reassuring');}}>Make {c.name} my trusted person</button>}
          </div>
          <button aria-label={`Call ${c.name}`}><Phone/></button>
        </article>)}</div>
        <div className="info-panel"><LockKeyhole/><div><h3>Two people, one safe decision</h3><p>Grandma Mode never completes a high-risk action unless both you and a trusted person approve.</p></div></div>
      </div>}
    </main>
    <nav>
      <button className={tab==='home'?'active':''} aria-current={tab==='home'} onClick={()=>setTab('home')}><Home/>Home</button>
      <button className={tab==='activity'?'active':''} aria-current={tab==='activity'} onClick={()=>setTab('activity')}><Clock3/>Activity</button>
      <button className={tab==='people'?'active':''} aria-current={tab==='people'} onClick={()=>setTab('people')}><Users/>People</button>
    </nav>
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

function Detail({item,trusted,back,speak,approve,trustedApprove,dismiss}:{item:RequestItem,trusted:string,back:()=>void,speak:(t:string,tone?:Tone)=>void,approve:()=>void,trustedApprove:()=>void,dismiss:()=>void}){
  const rc=riskCopy[item.risk],Icon=rc.icon,high=item.risk==='high';
  const tone:Tone=high?'warning':item.risk==='low'?'friendly':'neutral';
  const aloud=()=>speak(`${rc.label}. Here's the message from ${item.source}. ${unpunctuated(item.detail)}. I flagged it because: ${spokenList(item.reasons.map(r=>r.toLowerCase()))}.`,tone);
  return <div className="detail-shell">
    <header><button className="back" onClick={back}><ArrowLeft/>Back</button><div className="brand"><div className="brandmark"><ShieldCheck/></div><div><b>Grandma Mode</b><span>Safety check</span></div></div></header>
    <main className="detail-main">
      <div className={`verdict ${rc.color}`}><Icon/><div><p>Safety check</p><h1>{rc.label}</h1><span>Risk score {item.score} out of 100</span></div></div>
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
    </main>
  </div>
}

function Approval({done,label,sub}:{done:boolean,label:string,sub:string}){return <div className={`approval ${done?'done':''}`}><span>{done?<Check/>:<UserRound/>}</span><b>{label}</b><small>{sub}</small></div>}
