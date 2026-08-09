import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mic, Play, ShieldCheck, Sparkles, Users } from "lucide-react";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, firebaseReady, requireFirebase } from './firebase';
import { startSession } from "./profile";

export default function Landing({ onEnter }: { onEnter: (isNewAccount: boolean, uid:string) => void|Promise<void> }) {
  const [view, setView] = useState<"landing" | "login" | "setup">("landing");
  const [showPassword, setShowPassword] = useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function finish(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      if(!firebaseReady){
        startSession();
        await onEnter(view === 'setup','local-demo-user');
        return;
      }
      const service=requireFirebase(auth);
      const result=view==='setup'
        ?await createUserWithEmailAndPassword(service,email,password)
        :await signInWithEmailAndPassword(service,email,password);
      startSession();
      await onEnter(view === "setup",result.user.uid);
    } catch (cause) {
      const message=cause instanceof Error?cause.message:'Unable to continue.';
      setError(message.replace(/^Firebase:\s*/,'').replace(/\(auth\/.+\)\.?$/,'').trim());
    } finally { setBusy(false); }
  }
  async function resetPassword(){
    setError('');
    if(!email){setError('Enter your email address first.');return;}
    if(!firebaseReady){setError('Demo mode does not send email. Add Firebase settings to enable password reset.');return;}
    try{await sendPasswordResetEmail(requireFirebase(auth),email);setError('Password reset email sent.');}
    catch(cause){setError(cause instanceof Error?cause.message:'Could not send the reset email.');}
  }
  if (view !== "landing") return <div className="auth-page">
    <button className="auth-brand" onClick={() => setView("landing")}><span><ShieldCheck/></span><b>Grandma Mode</b></button>
    <div className="auth-layout"><section className="auth-story"><div className="wolfie-badge"><ShieldCheck/><i/></div><p className="landing-kicker">Wolfie is on guard</p><h1>Stay connected.<br/>Stay in control.</h1><p>Wolfie checks suspicious requests, explains what’s happening, and makes sure nothing important happens without your say-so.</p><div className="auth-promise"><LockKeyhole/><span><b>Your information stays yours.</b><small>Protected and never sold.</small></span></div></section>
    <section className="auth-panel"><form onSubmit={finish}>
      {view === "login" ? <><p className="landing-kicker">Welcome back</p><h2>Sign in to Grandma Mode</h2><p className="form-intro">Your protected space is ready.</p><label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<Password value={password} change={setPassword} show={showPassword} toggle={()=>setShowPassword(x=>!x)}/></label>{error&&<p className="auth-error" role="status">{error}</p>}<button className="auth-submit" disabled={busy}>{busy?'Signing in…':'Sign in safely'} {!busy&&<ArrowRight/>}</button><button type="button" className="forgot" onClick={resetPassword}>I forgot my password</button><div className="form-switch">New here? <button type="button" onClick={()=>setView("setup")}>Set up protection</button></div></>
      : <><p className="landing-kicker">Let’s get started</p><h2>Create your safe space</h2><p className="form-intro">Just an email and a password. Wolfie asks you the rest out loud in a moment — no more forms.</p><label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Create a password<Password value={password} change={setPassword} show={showPassword} toggle={()=>setShowPassword(x=>!x)}/></label>{error&&<p className="auth-error" role="status">{error}</p>}<button className="auth-submit" disabled={busy}>{busy?'Creating…':'Create my safe space'} {!busy&&<ArrowRight/>}</button><div className="form-switch">Already protected? <button type="button" onClick={()=>setView("login")}>Sign in</button></div></>}
    </form></section></div></div>;

  return <div className="landing"><header className="landing-nav"><div className="brand"><div className="brandmark"><ShieldCheck/></div><div><b>Grandma Mode</b><span>Powered by Wolfie</span></div></div><div className="landing-links"><a href="#how">How it works</a><a href="#safety">Safety</a></div><div className="nav-actions"><button className="text-button" onClick={()=>setView("login")}>Sign in</button><button className="nav-cta" onClick={()=>setView("setup")}>Get protected</button></div></header>
  <main className="landing-main"><section className="hero cyber-hero"><div className="hero-copy"><p className="hero-pill"><span/>Wolfie is online</p><h1>Your voice.<br/>Your safety.<br/><em>Your control.</em></h1><p className="hero-lead">Wolfie explains confusing messages,<br/>detects scams, and checks before<br/>anything risky happens.</p><div className="hero-actions"><button onClick={()=>setView("setup")}><i><Mic/></i>Talk to Wolfie</button><button onClick={()=>document.getElementById("how")?.scrollIntoView({behavior:"smooth"})}><i><Play/></i>See how it works</button></div></div><div className="hero-visual cyber-visual"><div className="shield-portal"><ShieldCheck/><i/><i/><i/></div><img className="cyber-wolfie" src="/assets/wolfie-cyber.png" alt="Wolfie, your friendly cyber safety guardian"/><div className="cyber-card transcript-card"><div className="card-label"><span><Mic/></span>Live transcript</div><b>“Is this message safe?”</b><div className="waveform">{Array.from({length:22},(_,i)=><i key={i} style={{height:`${8+(i*7)%29}px`}}/>)}</div><small>● ● ●</small></div><div className="cyber-card threat-card"><div className="card-label">Safety analysis</div><div className="threat-body"><span><ShieldCheck/></span><div><b>Threat<br/>blocked</b><p>Wolfie checked it<br/>so you’re protected.</p></div></div></div></div></section>
  <section id="how" className="how-section"><p className="landing-kicker">How it works</p><h2>Wolfie watches out for you,<br/>one step at a time.</h2><div className="step-cards"><article><span>01</span><div className="step-icon teal"><Mic/></div><h3>Just ask Wolfie</h3><p>Use your voice to read a message or ask for everyday help.</p></article><article><span>02</span><div className="step-icon amber"><Sparkles/></div><h3>Get a clear safety check</h3><p>Wolfie explains what looks safe and what needs a second look.</p></article><article><span>03</span><div className="step-icon gold"><Users/></div><h3>Stay in control</h3><p>Risky actions stay locked until your trusted person also approves.</p></article></div></section>
  <section id="safety" className="safety-section"><div className="safety-mark"><LockKeyhole/></div><div><p className="landing-kicker">Built around your consent</p><h2>Helpful by design.<br/>Protective by default.</h2><p>Simple requests get quick help. Suspicious actions pause. Dangerous actions stay blocked until your safety circle agrees.</p><button onClick={()=>setView("setup")}>Create your safe space <ArrowRight/></button></div></section></main></div>;
}
function Password({value,change,show,toggle}:{value:string;change:(value:string)=>void;show:boolean;toggle:()=>void}) { return <div className="password-field"><input required minLength={6} value={value} onChange={e=>change(e.target.value)} type={show?"text":"password"} placeholder="At least 6 characters"/><button type="button" aria-label="Show password" onClick={toggle}>{show?<EyeOff/>:<Eye/>}</button></div> }
