import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Headphones,
  HelpCircle,
  Home,
  LockKeyhole,
  Mic,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import { contacts, seedRequests } from "./data";
import { VoiceOSAdapter, type VoiceState } from "./voiceos";
import type { RequestItem, Risk } from "./types";
import Landing from "./Landing";

const fmt = (n: number) =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    n,
  );
const riskCopy: Record<
  Risk,
  { label: string; icon: typeof Check; color: string }
> = {
  low: { label: "Looks safe", icon: CheckCircle2, color: "green" },
  medium: { label: "Let’s double-check", icon: HelpCircle, color: "amber" },
  high: { label: "This looks dangerous", icon: AlertTriangle, color: "red" },
};

export default function App() {
  const [authenticated, setAuthenticated] = useState(
    () => localStorage.getItem("grandma-mode-session") === "active",
  );
  const [items, setItems] = useState(seedRequests);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"home" | "activity" | "people">("home");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [notice, setNotice] = useState("");
  const voiceOS = useRef(new VoiceOSAdapter());
  if (!authenticated) return <Landing onEnter={() => setAuthenticated(true)} />;
  const item = items.find((x) => x.id === selected);
  function update(id: string, patch: Partial<RequestItem>) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function listen() {
    if (voice === "listening") {
      voiceOS.current.stop();
      return;
    }
    const ok = voiceOS.current.start((text) => {
      setNotice(`I heard: “${text}”`);
      voiceOS.current.speak(
        "I heard you. I will check that safely before doing anything.",
      );
    }, setVoice);
    if (!ok) {
      setNotice(
        "Voice input is not available in this browser. You can still tap any large button.",
      );
    }
  }
  function approve(x: RequestItem) {
    if (x.risk === "medium") {
      update(x.id, {
        status: "completed",
        userApproved: true,
        receipt: "Confirmed by you · No sensitive information shared",
      });
      setNotice("Done safely. I saved a receipt.");
    } else {
      update(x.id, { status: "awaiting_trusted", userApproved: true });
      setNotice(
        "Your approval is saved. Maya still needs to approve before anything can happen.",
      );
    }
  }
  function trustedApprove(x: RequestItem) {
    update(x.id, {
      status: "approved",
      trustedApproved: true,
      receipt:
        "Dual approval recorded · Action remains paused for manual verification",
    });
    setNotice(
      "Both approvals are recorded. The action is ready for final verified processing.",
    );
  }
  if (item)
    return (
      <Detail
        item={item}
        back={() => setSelected(null)}
        approve={() => approve(item)}
        trustedApprove={() => trustedApprove(item)}
        dismiss={() => {
          update(item.id, {
            status: "blocked",
            receipt: "Blocked by you · Sender not contacted",
          });
          setSelected(null);
          setNotice("Blocked. Nothing was sent.");
        }}
      />
    );
  return (
    <div className="shell">
      <header>
        <div className="brand">
          <div className="brandmark">
            <ShieldCheck />
          </div>
          <div>
            <b>Grandma Mode</b>
            <span>Safe help, every step</span>
          </div>
        </div>
        <button className="help">
          <Phone /> Call Maya
        </button>
      </header>
      <main>
        {notice && (
          <div className="notice" role="status">
            <Sparkles />
            {notice}
            <button aria-label="Dismiss" onClick={() => setNotice("")}>
              <X />
            </button>
          </div>
        )}
        {tab === "home" && (
          <>
            <section className="welcome">
              <div>
                <p className="eyebrow">
                  <span className="pulse" /> You’re protected
                </p>
                <h1>
                  Good afternoon,
                  <br />
                  Eleanor.
                </h1>
                <p>I’m here to help. You’re always in control.</p>
              </div>
              <div className="safe-card">
                <ShieldCheck />
                <div>
                  <b>Everything looks good</b>
                  <span>No urgent actions needed</span>
                </div>
              </div>
            </section>
            <section className="voice-card">
              <img className="dashboard-wolfie" src="/assets/wolfie-welcome.png" alt="Wolfie offering a friendly helping paw" />
              <div className="voice-status"><span/>Live <i/><i/><i/></div>
              <h2>
                {voice === "listening" ? "I’m listening…" : "How can I help?"}
              </h2>
              <div className="voice-wave" aria-hidden="true">{Array.from({ length: 38 }, (_, i) => <i key={i} style={{ height: `${8 + ((i * 13) % 48)}px` }} />)}</div>
              <div className="orb-wrap">
                <button
                  className={`orb ${voice}`}
                  onClick={listen}
                  aria-label={
                    voice === "listening"
                      ? "Stop listening"
                      : "Start voice assistant"
                  }
                >
                  <Mic />
                </button>
                <i />
                <i />
              </div>
              <p>
                {voice === "listening"
                  ? "Speak naturally. Take your time."
                  : "Tap to talk with Wolfie"}
              </p>
              <div className="suggestions">
                <button onClick={() => setSelected("r3")}>
                  <MessageCircle />
                  Check a message
                </button>
                <button onClick={() => setNotice("I can explain each charge and check the payment details safely.")}><FileText/>Explain a bill</button>
                <button onClick={() => setTab("people")}><Users/>Call someone I trust</button>
              </div>
            </section>
            <Section items={items} select={setSelected} />
          </>
        )}
        {tab === "activity" && (
          <>
            <div className="page-title">
              <p className="eyebrow">Your safety record</p>
              <h1>Recent activity</h1>
              <p>Every check and approval is saved here.</p>
            </div>
            <Section items={items} select={setSelected} all />
          </>
        )}
        {tab === "people" && (
          <div>
            <div className="page-title">
              <p className="eyebrow">Your safety circle</p>
              <h1>Trusted people</h1>
              <p>High-risk actions need help from someone you trust.</p>
            </div>
            <div className="contact-grid">
              {contacts.map((c) => (
                <article className="contact" key={c.id}>
                  <div className="avatar">
                    {c.initials}
                    <span className={c.available ? "online" : ""} />
                  </div>
                  <div>
                    <h3>{c.name}</h3>
                    <p>{c.relationship}</p>
                    <small>{c.phone}</small>
                  </div>
                  <button aria-label={`Call ${c.name}`}>
                    <Phone />
                  </button>
                </article>
              ))}
            </div>
            <div className="info-panel">
              <LockKeyhole />
              <div>
                <h3>Two people, one safe decision</h3>
                <p>
                  Grandma Mode never completes a high-risk action unless both
                  you and a trusted person approve.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      <nav>
        <button
          className={tab === "home" ? "active" : ""}
          onClick={() => setTab("home")}
        >
          <Home />
          Home
        </button>
        <button
          className={tab === "activity" ? "active" : ""}
          onClick={() => setTab("activity")}
        >
          <Clock3 />
          Activity
        </button>
        <button
          className={tab === "people" ? "active" : ""}
          onClick={() => setTab("people")}
        >
          <Users />
          Trusted people
        </button>
      </nav>
    </div>
  );
}

function Section({
  items,
  select,
  all = false,
}: {
  items: RequestItem[];
  select: (id: string) => void;
  all?: boolean;
}) {
  return (
    <section className="activity">
      <div className="section-head">
        <div>
          <p className="eyebrow">{all ? "All checks" : "Latest checks"}</p>
          <h2>{all ? "Safety timeline" : "Recent activity"}</h2>
        </div>
        {!all && (
          <button>
            See all <ChevronRight />
          </button>
        )}
      </div>
      <div className="activity-list">
        {items.map((x) => {
          const rc = riskCopy[x.risk],
            Icon = rc.icon;
          return (
            <button
              className="activity-row"
              key={x.id}
              onClick={() => select(x.id)}
            >
              <span className={`risk-icon ${rc.color}`}>
                <Icon />
              </span>
              <span className="activity-copy">
                <b>{x.title}</b>
                <small>
                  {x.source} · {fmt(x.createdAt)}
                </small>
              </span>
              <span className={`risk-pill ${rc.color}`}>{rc.label}</span>
              <ChevronRight />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Detail({
  item,
  back,
  approve,
  trustedApprove,
  dismiss,
}: {
  item: RequestItem;
  back: () => void;
  approve: () => void;
  trustedApprove: () => void;
  dismiss: () => void;
}) {
  const rc = riskCopy[item.risk],
    Icon = rc.icon;
  const high = item.risk === "high";
  return (
    <div className="detail-shell">
      <header>
        <button className="back" onClick={back}>
          <ArrowLeft /> Back
        </button>
        <div className="brand">
          <div className="brandmark">
            <ShieldCheck />
          </div>
          <div>
            <b>Grandma Mode</b>
            <span>Safety check</span>
          </div>
        </div>
        <span />
      </header>
      <main className="detail-main">
        <div className={`verdict ${rc.color}`}>
          <Icon />
          <div>
            <p>Safety check</p>
            <h1>{rc.label}</h1>
            <span>Risk score {item.score} out of 100</span>
          </div>
        </div>
        <article className="message-card">
          <div className="sender">
            <div className="sender-icon">
              <UserRound />
            </div>
            <div>
              <small>Message from</small>
              <h2>{item.source}</h2>
            </div>
            <span>{fmt(item.createdAt)}</span>
          </div>
          <blockquote>“{item.detail}”</blockquote>
        </article>
        <div className="why">
          <h2>Why I flagged this</h2>
          {item.reasons.map((r) => (
            <div key={r}>
              <AlertTriangle />
              <span>{r}</span>
            </div>
          ))}
        </div>
        {high && (
          <div className="gate">
            <div className="gate-title">
              <LockKeyhole />
              <div>
                <p>Action Gate</p>
                <h2>Two approvals required</h2>
              </div>
            </div>
            <div className="approval-track">
              <Approval
                done={!!item.userApproved}
                label="Your approval"
                sub={item.userApproved ? "Approved" : "Waiting for you"}
              />
              <span className="trackline" />
              <Approval
                done={!!item.trustedApproved}
                label="Maya’s approval"
                sub={item.trustedApproved ? "Approved" : "Trusted contact"}
              />
            </div>
            <p className="gate-note">
              <ShieldCheck /> Nothing can happen until both people say yes.
            </p>
          </div>
        )}
        {item.receipt && (
          <div className="receipt">
            <CheckCircle2 />
            <div>
              <b>Safety receipt</b>
              <p>{item.receipt}</p>
            </div>
          </div>
        )}
        <div className="actions">
          {item.status === "awaiting_trusted" ? (
            <button className="primary" onClick={trustedApprove}>
              <Users />
              Simulate Maya’s approval
            </button>
          ) : (
            item.status !== "completed" &&
            item.status !== "approved" && (
              <button className="primary" onClick={approve}>
                {high ? (
                  <>
                    <LockKeyhole />
                    Yes, ask Maya too
                  </>
                ) : (
                  <>
                    <Check />
                    Yes, continue safely
                  </>
                )}
              </button>
            )
          )}
          <button className="secondary" onClick={dismiss}>
            <X />
            No, block this
          </button>
        </div>
        <p className="reassure">
          <Headphones /> Need help? Say “Explain this to me.”
        </p>
      </main>
    </div>
  );
}
function Approval({
  done,
  label,
  sub,
}: {
  done: boolean;
  label: string;
  sub: string;
}) {
  return (
    <div className={`approval ${done ? "done" : ""}`}>
      <span>{done ? <Check /> : <UserRound />}</span>
      <b>{label}</b>
      <small>{sub}</small>
    </div>
  );
}
