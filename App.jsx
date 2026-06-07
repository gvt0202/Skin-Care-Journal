import { useState, useEffect, useRef } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const PRODUCTS = {
  am: [
    { id:"cleanser",    name:"CeraVe Foaming Cleanser",      emoji:"🧼", tip:"Gentle foam, 30 sec massage, lukewarm water" },
    { id:"vitc",        name:"Minimalist 16% Vitamin C",      emoji:"✨", tip:"2-3 drops, pat gently, wait 3 mins after" },
    { id:"moisturiser", name:"CeraVe Oil Control Gel Cream",  emoji:"💧", tip:"Pea-sized amount, focus on dry patches first" },
    { id:"spf",         name:"Beauty of Joseon Rice SPF",     emoji:"☀️", tip:"Always last step! Reapply every 2hrs outdoors" },
  ],
  pm: [
    { id:"cleanser_pm",   name:"CeraVe Foaming Cleanser",      emoji:"🧼", tip:"Double cleanse if wearing sunscreen" },
    { id:"sal",           name:"Minimalist 2% Salicylic Acid",  emoji:"🔬", tip:"2-3x/week only. Skip on retinol nights" },
    { id:"retinol",       name:"Minimalist 0.3% Retinol",       emoji:"🌙", tip:"3-4x/week. Never same night as salicylic!" },
    { id:"moisturiser_pm",name:"CeraVe Oil Control Gel Cream",  emoji:"💧", tip:"Layer generously after retinol" },
  ],
};

const WEEKLY_PLAN = {
  Mon:{ sal:false, retinol:true,  label:"Retinol Night" },
  Tue:{ sal:false, retinol:false, label:"Rest Night" },
  Wed:{ sal:true,  retinol:false, label:"Salicylic Night" },
  Thu:{ sal:false, retinol:true,  label:"Retinol Night" },
  Fri:{ sal:false, retinol:false, label:"Rest Night" },
  Sat:{ sal:true,  retinol:false, label:"Salicylic Night" },
  Sun:{ sal:false, retinol:true,  label:"Retinol Night" },
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const MILESTONES = [
  { week:1,  title:"Routine Established", desc:"Products absorbed without irritation",  icon:"🌱", badge:"Beginner" },
  { week:3,  title:"Oil Controlled",      desc:"T-zone noticeably less oily",           icon:"💫", badge:"Consistent" },
  { week:4,  title:"Month 1 Complete",    desc:"Completed your first full month!",       icon:"🥇", badge:"Committed" },
  { week:6,  title:"Pores Refined",       desc:"Visible pore size reduction",           icon:"🔍", badge:"Dedicated" },
  { week:8,  title:"Glow Unlocked",       desc:"Brighter, more even skin tone",         icon:"✨", badge:"Glowing" },
  { week:10, title:"Spots Fading",        desc:"Dark spots visibly lighter",            icon:"🌤️", badge:"Transformer" },
  { week:12, title:"Skin Transformed",    desc:"Fine lines reduced, glowing skin",      icon:"🌟", badge:"Skin Master" },
];

const BADGES_DEF = [
  { id:"first_day", icon:"🌱", label:"First Step",   desc:"Completed first routine" },
  { id:"streak3",   icon:"🔥", label:"3-Day Streak", desc:"3 days consistent" },
  { id:"streak7",   icon:"⚡", label:"Week Warrior", desc:"7 days in a row" },
  { id:"streak14",  icon:"💎", label:"Diamond Skin", desc:"14 days without breaking" },
  { id:"streak30",  icon:"👑", label:"Skin Royalty", desc:"30 day streak" },
  { id:"perfect",   icon:"⭐", label:"Perfect Day",  desc:"100% in a single day" },
  { id:"month1",    icon:"🥇", label:"Month 1 Done", desc:"28 days in!" },
  { id:"champion",  icon:"🏆", label:"Champion",     desc:"Full 12 week journey" },
];

const INGREDIENT_CONFLICTS = {
  "retinol":       ["salicylic acid","aha","bha","vitamin c","benzoyl peroxide","glycolic acid"],
  "salicylic acid":["retinol","vitamin c","aha","glycolic acid","lactic acid"],
  "vitamin c":     ["retinol","salicylic acid","niacinamide","aha","bha"],
  "niacinamide":   ["vitamin c"],
  "aha":           ["retinol","salicylic acid","vitamin c","bha"],
  "bha":           ["retinol","vitamin c","aha"],
  "glycolic acid": ["retinol","salicylic acid","vitamin c"],
  "lactic acid":   ["retinol","salicylic acid"],
};

const WEATHER_TIPS = [
  { icon:"💦", text:"High humidity — your gel cream is perfect, skip heavier formulas", type:"info" },
  { icon:"☀️", text:"UV index 8 — reapply SPF every 2 hours when outdoors", type:"warning" },
  { icon:"🌧️", text:"Monsoon season — SPF washes off faster, reapply more often", type:"warning" },
  { icon:"🧊", text:"31°C heat — store Vitamin C in a cool spot to prevent oxidation", type:"info" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayKey() { return new Date().toISOString().split("T")[0]; }
function getDayName()  { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()]; }

function calcScore(log) {
  if (!log) return 0;
  const all = [...PRODUCTS.am, ...PRODUCTS.pm];
  return Math.round(all.filter(p => log[p.id]).length / all.length * 100);
}

function calcStreak(logs) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 400; i++) {
    const key = d.toISOString().split("T")[0];
    if (calcScore(logs[key]) >= 50) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function getWeekNum(startDate) {
  if (!startDate) return 1;
  return Math.min(Math.floor((Date.now() - new Date(startDate).getTime()) / (7*86400000)) + 1, 12);
}

function getDaysActive(startDate) {
  if (!startDate) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000));
}

function checkConflict(input) {
  const q = input.toLowerCase().trim();
  for (const [key, conflicts] of Object.entries(INGREDIENT_CONFLICTS)) {
    if (q.includes(key)) return { found: key, conflicts };
  }
  return null;
}

function usePersist(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

// ─── Components ──────────────────────────────────────────────────────────────

function ScoreRing({ score, size=56, stroke=4, color="#c9a96e" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#222" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s ease" }} />
    </svg>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [startDate, setStartDate] = usePersist("sj_start", getTodayKey());
  const [logs,      setLogs]      = usePersist("sj_logs",  {});
  const [photos,    setPhotos]    = usePersist("sj_photos",{});
  const [skinNotes, setSkinNotes] = usePersist("sj_notes", {});
  const [remAM,     setRemAM]     = usePersist("sj_remAM", "07:00");
  const [remPM,     setRemPM]     = usePersist("sj_remPM", "21:00");

  const [screen,       setScreen]       = useState(() => localStorage.getItem("sj_start") ? "app" : "onboard");
  const [tab,          setTab]          = useState("today");
  const [justChecked,  setJustChecked]  = useState(null);
  const [showRemPanel, setShowRemPanel] = useState(false);
  const [conflictInput,setConflictInput]= useState("");
  const [conflictResult,setConflictResult]=useState(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText,     setNoteText]     = useState("");
  const [oilRating,    setOilRating]    = useState(3);
  const [glowRating,   setGlowRating]   = useState(3);
  const [showPhotoBox, setShowPhotoBox] = useState(false);
  const [notif,        setNotif]        = useState(null);
  const fileRef = useRef();

  const today    = getTodayKey();
  const dayName  = getDayName();
  const todayLog = logs[today] || {};
  const weekNum  = getWeekNum(startDate);
  const daysActive = getDaysActive(startDate);
  const todayScore = calcScore(todayLog);
  const streak     = calcStreak(logs);
  const plan       = WEEKLY_PLAN[dayName] || { sal:false, retinol:false, label:"Rest Night" };

  const allScores = Object.keys(logs).map(k => calcScore(logs[k]));
  const avgScore  = allScores.length ? Math.round(allScores.reduce((a,b)=>a+b,0) / Math.max(daysActive,1)) : 0;

  const unlockedBadges = BADGES_DEF.filter(b => {
    if (b.id==="first_day") return Object.keys(logs).length >= 1;
    if (b.id==="streak3")   return streak >= 3;
    if (b.id==="streak7")   return streak >= 7;
    if (b.id==="streak14")  return streak >= 14;
    if (b.id==="streak30")  return streak >= 30;
    if (b.id==="perfect")   return Object.values(logs).some(l => calcScore(l) === 100);
    if (b.id==="month1")    return daysActive >= 28;
    if (b.id==="champion")  return daysActive >= 84;
    return false;
  });

  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      const cur = now.getHours().toString().padStart(2,"0")+":"+now.getMinutes().toString().padStart(2,"0");
      if (cur === remAM) showNotif("☀️ Morning Routine!", "Time for your AM skincare.");
      if (cur === remPM) showNotif("🌙 Night Routine!",   "Time for your PM skincare.");
    }, 60000);
    return () => clearInterval(iv);
  }, [remAM, remPM]);

  function showNotif(title, msg) {
    setNotif({ title, msg });
    setTimeout(() => setNotif(null), 4000);
  }

  function toggle(id) {
    setLogs(prev => {
      const day = prev[today] || {};
      return { ...prev, [today]: { ...day, [id]: !day[id] } };
    });
    setJustChecked(id);
    setTimeout(() => setJustChecked(null), 500);
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPhotos(prev => ({ ...prev, [today]: { src:ev.target.result, week:weekNum, date:today } }));
      setShowPhotoBox(false);
      showNotif("📸 Saved!", "Week "+weekNum+" photo captured");
    };
    reader.readAsDataURL(file);
  }

  function saveNote() {
    if (!noteText.trim()) return;
    setSkinNotes(prev => ({ ...prev, [today]: { text:noteText, oil:oilRating, glow:glowRating, date:today } }));
    setNoteText(""); setShowNoteForm(false);
    showNotif("📝 Saved!", "Daily skin log recorded");
  }

  function startJourney() {
    setScreen("app");
  }

  const last7 = Array.from({ length:7 }, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-(6-i));
    const key = d.toISOString().split("T")[0];
    return { key, label:["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()], score:calcScore(logs[key]) };
  });

  const photoList = Object.values(photos).sort((a,b)=>a.week-b.week);
  const noteList  = Object.entries(skinNotes).sort((a,b)=>b[0].localeCompare(a[0]));

  // Styles
  const G = "#c9a96e", GR = "#7eb8a0", PU = "#c97eb8";
  const card  = { background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"14px 16px" };
  const lbl   = { fontSize:10, letterSpacing:2, color:G, marginBottom:14, display:"block" };
  const btn   = { background:"linear-gradient(135deg,#c9a96e,#9a7040)", border:"none", borderRadius:10, padding:"11px 20px", color:"#0a0a0a", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" };
  const ghost = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 14px", color:"#888", fontSize:12, cursor:"pointer", fontFamily:"inherit" };
  const inp   = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 14px", color:"#f0e6d3", fontSize:13, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" };
  const tag   = (c) => ({ fontSize:9, borderRadius:5, padding:"3px 8px", border:"1px solid "+c+"44", color:c, background:c+"11" });

  // ── Onboard ──
  if (screen === "onboard") return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui,sans-serif" }}>
      <div style={{ maxWidth:340, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:12 }}>🌿</div>
        <div style={{ fontSize:28, color:"#f0e6d3", fontWeight:300, marginBottom:6 }}>Skin Journal</div>
        <div style={{ fontSize:13, color:"#555", marginBottom:32, lineHeight:1.7 }}>
          Track your routine, log your skin, earn badges and watch your glow build over 12 weeks.
        </div>
        <div style={{ marginBottom:8, color:"#888", fontSize:12, textAlign:"left" }}>When did you start your routine?</div>
        <input type="date" value={startDate} max={getTodayKey()}
          onChange={e => setStartDate(e.target.value)}
          style={{ ...inp, marginBottom:16 }} />
        <button onClick={startJourney} style={{ ...btn, width:"100%", padding:14, fontSize:15 }}>
          Begin My Journey →
        </button>
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap", marginTop:20 }}>
          {["✓ Data saved on device","✓ Smart reminders","✓ Streaks & badges","✓ Photo journal","✓ Conflict checker"].map(t => (
            <span key={t} style={{ fontSize:10, color:"#555", background:"rgba(255,255,255,0.03)", padding:"4px 10px", borderRadius:20, border:"1px solid rgba(255,255,255,0.06)" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Main App ──
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", fontFamily:"system-ui,sans-serif", paddingBottom:80 }}>

      {/* Notification */}
      {notif && (
        <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:999, background:"#1c1c1c", border:"1px solid rgba(201,169,110,0.4)", borderRadius:12, padding:"12px 20px", textAlign:"center", minWidth:240, boxShadow:"0 8px 32px #0008", zIndex:1000 }}>
          <div style={{ fontSize:13, color:G, fontWeight:600 }}>{notif.title}</div>
          <div style={{ fontSize:11, color:"#888", marginTop:3 }}>{notif.msg}</div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"linear-gradient(180deg,#141008,#0a0a0a)", padding:"22px 16px 14px", borderBottom:"1px solid rgba(201,169,110,0.08)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:22, color:"#f0e6d3", fontWeight:300 }}>Skin Journal</div>
            <div style={{ color:"#555", fontSize:11, marginTop:2 }}>Day {daysActive+1} · Week {weekNum}/12 · Mumbai 🌧️</div>
          </div>
          <button onClick={() => setShowRemPanel(!showRemPanel)} style={{ ...ghost, padding:"7px 12px", fontSize:11 }}>🔔 Reminders</button>
        </div>

        {showRemPanel && (
          <div style={{ background:"rgba(201,169,110,0.06)", border:"1px solid rgba(201,169,110,0.2)", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ fontSize:10, color:G, letterSpacing:2, marginBottom:10 }}>SET REMINDER TIMES</div>
            <div style={{ display:"flex", gap:12 }}>
              {[["☀️ Morning", remAM, setRemAM],["🌙 Night", remPM, setRemPM]].map(([l,v,s]) => (
                <div key={l} style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:"#666", marginBottom:4 }}>{l}</div>
                  <input type="time" value={v} onChange={e=>s(e.target.value)} style={{ ...inp, padding:"8px 10px" }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize:10, color:"#444", marginTop:8 }}>Keep app open for reminders to fire</div>
          </div>
        )}

        {/* Weather tips */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2 }}>
          {WEATHER_TIPS.map((tip,i) => (
            <div key={i} style={{ flexShrink:0, maxWidth:200, background:tip.type==="warning"?"rgba(201,100,100,0.08)":"rgba(126,184,160,0.08)", border:"1px solid "+(tip.type==="warning"?"rgba(201,100,100,0.2)":"rgba(126,184,160,0.2)"), borderRadius:10, padding:"8px 12px", display:"flex", gap:8, alignItems:"flex-start" }}>
              <span style={{ fontSize:13, flexShrink:0 }}>{tip.icon}</span>
              <span style={{ fontSize:10, color:tip.type==="warning"?"#c97e6e":"#7eb8a0", lineHeight:1.4 }}>{tip.text}</span>
            </div>
          ))}
        </div>

        {/* Scores */}
        <div style={{ display:"flex", gap:8, marginTop:14 }}>
          {[
            { label:"Today",   type:"ring", score:todayScore, color:G },
            { label:"Overall", type:"ring", score:avgScore,   color:GR },
            { label:"Streak",  type:"text", value:streak+"🔥",color:PU },
            { label:"Badges",  type:"text", value:unlockedBadges.length+"/"+BADGES_DEF.length, color:"#b8c97e" },
          ].map(({ label,type,score,value,color }) => (
            <div key={label} style={{ flex:1, ...card, padding:"10px 6px", textAlign:"center" }}>
              {type==="ring" ? (
                <div style={{ position:"relative", display:"inline-block" }}>
                  <ScoreRing score={score} size={50} stroke={4} color={color} />
                  <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:11, fontWeight:600, color }}>{score}%</div>
                </div>
              ) : (
                <div style={{ height:50, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:600, color }}>{value}</div>
              )}
              <div style={{ fontSize:9, color:"#555", marginTop:3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"#0a0a0a", borderBottom:"1px solid rgba(255,255,255,0.05)", position:"sticky", top:0, zIndex:10 }}>
        {[["today","Today"],["progress","Progress"],["log","Log"],["checker","Checker"],["schedule","Schedule"]].map(([t,l]) => (
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"13px 2px", background:"none", border:"none", color:tab===t?G:"#444", fontSize:11, fontWeight:500, cursor:"pointer", borderBottom:"2px solid "+(tab===t?G:"transparent"), transition:"all 0.2s", fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      <div style={{ padding:"18px 16px" }}>

        {/* TODAY */}
        {tab==="today" && <>
          <div style={{ ...card, marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:10, color:G, marginBottom:2 }}>TONIGHT</div>
              <div style={{ fontSize:13, color:"#f0e6d3" }}>{plan.label}</div>
            </div>
            <div style={{ fontSize:10, textAlign:"right" }}>
              {plan.sal    && <div style={{ color:PU }}>● Salicylic on</div>}
              {plan.retinol&& <div style={{ color:G  }}>● Retinol on</div>}
              {!plan.sal&&!plan.retinol && <div style={{ color:"#555" }}>● Basics only</div>}
            </div>
          </div>

          <div style={{ marginBottom:22 }}>
            <span style={{ ...lbl, color:GR }}>☀️ MORNING ROUTINE</span>
            {PRODUCTS.am.map(p => {
              const checked = !!todayLog[p.id];
              const isJust  = justChecked===p.id;
              return (
                <div key={p.id} onClick={()=>toggle(p.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:checked?"rgba(201,169,110,0.1)":"rgba(255,255,255,0.02)", borderRadius:12, marginBottom:8, cursor:"pointer", border:"1px solid "+(checked?"rgba(201,169,110,0.25)":"rgba(255,255,255,0.05)"), transition:"all 0.25s", transform:isJust?"scale(0.97)":"scale(1)" }}>
                  <div style={{ width:22, height:22, borderRadius:"50%", flexShrink:0, background:checked?G:"transparent", border:"2px solid "+(checked?G:"rgba(255,255,255,0.15)"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#0a0a0a", fontWeight:700, transition:"all 0.25s" }}>{checked?"✓":""}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:checked?"#f0e6d3":"#888", fontWeight:500 }}>{p.emoji} {p.name}</div>
                    {checked && <div style={{ fontSize:10, color:G, marginTop:2 }}>{p.tip}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom:22 }}>
            <span style={lbl}>🌙 NIGHT ROUTINE</span>
            {PRODUCTS.pm.map(p => {
              const restricted = (p.id==="sal"&&!plan.sal)||(p.id==="retinol"&&!plan.retinol);
              const checked    = !!todayLog[p.id];
              const isJust     = justChecked===p.id;
              return (
                <div key={p.id} style={{ marginBottom: restricted?6:8 }}>
                  <div onClick={()=>!restricted&&toggle(p.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:checked?"rgba(201,169,110,0.1)":"rgba(255,255,255,0.02)", borderRadius:12, cursor:restricted?"not-allowed":"pointer", border:"1px solid "+(checked?"rgba(201,169,110,0.25)":"rgba(255,255,255,0.05)"), opacity:restricted?0.35:1, transition:"all 0.25s", transform:isJust?"scale(0.97)":"scale(1)" }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", flexShrink:0, background:checked?G:"transparent", border:"2px solid "+(checked?G:"rgba(255,255,255,0.15)"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#0a0a0a", fontWeight:700 }}>{checked?"✓":""}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:checked?"#f0e6d3":"#888", fontWeight:500 }}>{p.emoji} {p.name}</div>
                      {checked && <div style={{ fontSize:10, color:G, marginTop:2 }}>{p.tip}</div>}
                    </div>
                    {restricted && <span style={{ fontSize:9, color:"#444", background:"rgba(255,255,255,0.05)", padding:"2px 6px", borderRadius:4 }}>not tonight</span>}
                  </div>
                  {restricted && <div style={{ fontSize:10, color:"#444", paddingLeft:14, marginTop:2 }}>⛔ Not scheduled tonight</div>}
                </div>
              );
            })}
          </div>

          <div style={{ ...card, marginBottom:16, textAlign:"center" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:12, color:"#666" }}>Today's Completion</span>
              <span style={{ fontSize:12, fontWeight:600, color:G }}>{todayScore}%</span>
            </div>
            <div style={{ height:5, background:"#1a1a1a", borderRadius:10, overflow:"hidden" }}>
              <div style={{ height:"100%", background:"linear-gradient(90deg,#c9a96e,#f0e6d3)", width:todayScore+"%", borderRadius:10, transition:"width 0.8s ease" }} />
            </div>
            <div style={{ fontSize:11, color:"#555", marginTop:10 }}>
              {todayScore===100?"🌟 Perfect day! Your future skin thanks you.":todayScore>=50?"💪 Great — finish strong!":"🌱 Let's get started!"}
            </div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setShowPhotoBox(!showPhotoBox)} style={{ ...ghost, flex:1 }}>📸 Add Photo</button>
            <button onClick={()=>setShowNoteForm(!showNoteForm)} style={{ ...ghost, flex:1 }}>📝 Log Skin</button>
          </div>

          {showPhotoBox && (
            <div style={{ ...card, marginTop:12, borderColor:"rgba(201,169,110,0.2)" }}>
              <div style={{ fontSize:12, color:G, marginBottom:6 }}>Week {weekNum} Progress Photo</div>
              <div style={{ fontSize:11, color:"#666", marginBottom:12 }}>Same lighting & angle each week for best comparison</div>
              <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={handlePhoto} style={{ display:"none" }} />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>fileRef.current&&fileRef.current.click()} style={{ ...btn, flex:1 }}>📷 Take Photo</button>
                <button onClick={()=>setShowPhotoBox(false)} style={{ ...ghost }}>Cancel</button>
              </div>
            </div>
          )}

          {showNoteForm && (
            <div style={{ ...card, marginTop:12 }}>
              <div style={{ fontSize:10, color:G, letterSpacing:2, marginBottom:12 }}>TODAY'S SKIN LOG</div>
              {[["Oiliness",oilRating,setOilRating,G,"Dry","Very Oily"],["Glow",glowRating,setGlowRating,GR,"Dull","Glowing"]].map(([l,v,s,c,lo,hi]) => (
                <div key={l} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:"#666", marginBottom:6 }}>{l}</div>
                  <div style={{ display:"flex", gap:6 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={()=>s(n)} style={{ flex:1, padding:"7px 0", borderRadius:8, border:"1px solid "+(v===n?c:"rgba(255,255,255,0.08)"), background:v===n?c+"22":"rgba(255,255,255,0.03)", color:v===n?c:"#555", fontSize:12, cursor:"pointer" }}>{n}</button>
                    ))}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#444", marginTop:3 }}><span>{lo}</span><span>{hi}</span></div>
                </div>
              ))}
              <textarea value={noteText} onChange={e=>setNoteText(e.target.value)}
                placeholder="Any breakouts, irritation, or observations..."
                style={{ ...inp, resize:"none", height:65, marginBottom:10 }} />
              <button onClick={saveNote} style={{ ...btn, width:"100%" }}>Save Log</button>
            </div>
          )}
        </>}

        {/* PROGRESS */}
        {tab==="progress" && <>
          <div style={{ marginBottom:24 }}>
            <span style={lbl}>LAST 7 DAYS</span>
            <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:90 }}>
              {last7.map(({ label,score,key }) => (
                <div key={key} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                  <div style={{ fontSize:9, color:"#555" }}>{score>0?score+"%":""}</div>
                  <div style={{ width:"100%", borderRadius:6, background:score>0?"rgba(201,169,110,"+(0.15+score/100*0.7)+")":"rgba(255,255,255,0.04)", height:Math.max(score*0.65,5)+"px", border:key===today?"1px solid #c9a96e":"none", transition:"height 0.6s" }} />
                  <div style={{ fontSize:9, color:key===today?G:"#444" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:24 }}>
            <span style={lbl}>28-DAY CONSISTENCY</span>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
              {Array.from({ length:28 }, (_,i) => {
                const d = new Date(); d.setDate(d.getDate()-(27-i));
                const key = d.toISOString().split("T")[0];
                const sc  = calcScore(logs[key]);
                return <div key={key} title={sc+"%"} style={{ aspectRatio:"1", borderRadius:4, background:sc>=80?G:sc>=50?"rgba(201,169,110,0.4)":sc>0?"rgba(201,169,110,0.15)":"rgba(255,255,255,0.04)" }} />;
              })}
            </div>
            <div style={{ display:"flex", gap:6, marginTop:8, alignItems:"center" }}>
              <span style={{ fontSize:9, color:"#444" }}>Less</span>
              {["rgba(255,255,255,0.04)","rgba(201,169,110,0.15)","rgba(201,169,110,0.4)",G].map((bg,i) => (
                <div key={i} style={{ width:10, height:10, borderRadius:2, background:bg }} />
              ))}
              <span style={{ fontSize:9, color:"#444" }}>More</span>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
            {[
              { label:"Days Active", value:Object.keys(logs).length, icon:"📅", color:G },
              { label:"Streak",      value:streak+" days",           icon:"🔥", color:PU },
              { label:"Avg Score",   value:avgScore+"%",             icon:"📊", color:GR },
              { label:"Projected",   value:avgScore>=80?"🌟 High":avgScore>=50?"✨ Growing":"🌱 Building", icon:"💡", color:"#b8c97e" },
            ].map(({ label,value,icon,color }) => (
              <div key={label} style={{ ...card }}>
                <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
                <div style={{ fontSize:18, fontWeight:600, color }}>{value}</div>
                <div style={{ fontSize:10, color:"#555", marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom:24 }}>
            <span style={lbl}>12-WEEK MILESTONES</span>
            {MILESTONES.map(({ week,title,desc,icon,badge }) => {
              const achieved = weekNum>=week, current = weekNum===week;
              return (
                <div key={week} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:14, opacity:achieved?1:0.35 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, background:achieved?"rgba(201,169,110,0.12)":"rgba(255,255,255,0.03)", border:"1px solid "+(achieved?G:"rgba(255,255,255,0.08)"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>
                    {achieved?icon:"○"}
                  </div>
                  <div style={{ flex:1, paddingTop:4 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontSize:13, color:achieved?"#f0e6d3":"#555", fontWeight:500 }}>
                        {title}
                        {current && <span style={{ marginLeft:6, fontSize:9, background:G, color:"#0a0a0a", borderRadius:4, padding:"2px 6px", fontWeight:700 }}>NOW</span>}
                      </div>
                      <span style={{ fontSize:9, color:"#444" }}>Wk {week}</span>
                    </div>
                    <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{desc}</div>
                    {achieved && <span style={{ fontSize:9, background:"rgba(201,169,110,0.1)", color:G, borderRadius:4, padding:"2px 8px", marginTop:4, display:"inline-block" }}>{badge}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom:24 }}>
            <span style={lbl}>BADGES — {unlockedBadges.length}/{BADGES_DEF.length} UNLOCKED</span>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {BADGES_DEF.map(badge => {
                const unlocked = unlockedBadges.some(b=>b.id===badge.id);
                return (
                  <div key={badge.id} style={{ ...card, background:unlocked?"rgba(201,169,110,0.07)":"rgba(255,255,255,0.02)", borderColor:unlocked?"rgba(201,169,110,0.25)":"rgba(255,255,255,0.05)", opacity:unlocked?1:0.35, display:"flex", gap:10, alignItems:"center" }}>
                    <div style={{ fontSize:22 }}>{badge.icon}</div>
                    <div>
                      <div style={{ fontSize:12, color:unlocked?"#f0e6d3":"#555", fontWeight:500 }}>{badge.label}</div>
                      <div style={{ fontSize:10, color:"#555" }}>{badge.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <span style={lbl}>📸 PHOTO JOURNAL</span>
            {photoList.length===0 ? (
              <div style={{ ...card, textAlign:"center", padding:24, borderStyle:"dashed" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📸</div>
                <div style={{ fontSize:12, color:"#555" }}>No progress photos yet. Add one from the Today tab each week!</div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                {photoList.map(p => (
                  <div key={p.week} style={{ borderRadius:10, overflow:"hidden", position:"relative" }}>
                    <img src={p.src} alt={"Wk "+p.week} style={{ width:"100%", aspectRatio:"1", objectFit:"cover", display:"block" }} />
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.6)", padding:"3px 8px", fontSize:9, color:"#f0e6d3" }}>Wk {p.week}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>}

        {/* LOG */}
        {tab==="log" && <>
          <span style={lbl}>SKIN DIARY</span>
          {noteList.length===0 ? (
            <div style={{ ...card, textAlign:"center", padding:28, borderStyle:"dashed" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📝</div>
              <div style={{ fontSize:13, color:"#555" }}>No skin logs yet. Log from the Today tab each day.</div>
            </div>
          ) : noteList.map(([date,note]) => (
            <div key={date} style={{ ...card, marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:11, color:G }}>{new Date(date).toLocaleDateString("en-IN",{ day:"numeric", month:"short" })}</span>
              </div>
              <div style={{ display:"flex", gap:20, marginBottom:10 }}>
                {[["Oiliness",note.oil,G],["Glow",note.glow,GR]].map(([l,v,c]) => (
                  <div key={l}>
                    <div style={{ fontSize:10, color:"#666", marginBottom:4 }}>{l}</div>
                    <div style={{ display:"flex", gap:3 }}>
                      {[1,2,3,4,5].map(n => <div key={n} style={{ width:8, height:8, borderRadius:2, background:n<=v?c:"rgba(255,255,255,0.08)" }} />)}
                    </div>
                  </div>
                ))}
              </div>
              {note.text && <div style={{ fontSize:12, color:"#888", lineHeight:1.5 }}>{note.text}</div>}
            </div>
          ))}
        </>}

        {/* CHECKER */}
        {tab==="checker" && <>
          <span style={lbl}>🧪 INGREDIENT CONFLICT CHECKER</span>
          <div style={{ fontSize:12, color:"#555", marginBottom:16, lineHeight:1.5 }}>Type any ingredient to check for conflicts with your current routine.</div>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <input value={conflictInput} onChange={e=>{setConflictInput(e.target.value);setConflictResult(null);}}
              onKeyDown={e=>e.key==="Enter"&&setConflictResult(checkConflict(conflictInput))}
              placeholder="e.g. glycolic acid, aha, retinol..."
              style={{ ...inp, flex:1 }} />
            <button onClick={()=>setConflictResult(checkConflict(conflictInput))} style={{ ...btn, padding:"11px 18px" }}>Check</button>
          </div>

          {conflictResult!==null && (
            conflictResult ? (
              <div style={{ background:"rgba(201,100,100,0.08)", border:"1px solid rgba(201,100,100,0.25)", borderRadius:14, padding:18, marginBottom:16 }}>
                <div style={{ fontSize:13, color:"#e07070", fontWeight:600, marginBottom:8 }}>⚠️ Conflicts Found</div>
                <div style={{ fontSize:12, color:"#999", marginBottom:10 }}><b style={{ color:"#f0e6d3" }}>{conflictResult.found}</b> conflicts with:</div>
                {conflictResult.conflicts.map(c => <div key={c} style={{ display:"flex", gap:8, marginBottom:6 }}><span>❌</span><span style={{ fontSize:12, color:"#e07070" }}>{c}</span></div>)}
                <div style={{ marginTop:12, fontSize:11, color:"#666", lineHeight:1.5, background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"10px 12px" }}>
                  💡 Use conflicting ingredients on alternate nights, or one AM / one PM. Never layer together.
                </div>
              </div>
            ) : (
              <div style={{ background:"rgba(100,201,130,0.08)", border:"1px solid rgba(100,201,130,0.25)", borderRadius:14, padding:18, marginBottom:16 }}>
                <div style={{ fontSize:13, color:"#70e090", fontWeight:600, marginBottom:6 }}>✅ Safe to Use!</div>
                <div style={{ fontSize:12, color:"#888" }}>No conflicts found. Always patch test new products first.</div>
              </div>
            )
          )}

          <div style={{ marginTop:8 }}>
            <span style={lbl}>YOUR ACTIVE INGREDIENTS</span>
            {[
              { name:"Vitamin C (16%)",    time:"AM only",     note:"Brightening, antioxidant", color:G },
              { name:"Salicylic Acid (2%)",time:"PM 2-3x/wk", note:"Pore clearing, anti-acne",  color:PU },
              { name:"Retinol (0.3%)",     time:"PM 3-4x/wk", note:"Anti-aging, cell turnover", color:"#b8c97e" },
            ].map(ing => (
              <div key={ing.name} style={{ ...card, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:12, color:"#f0e6d3", fontWeight:500 }}>{ing.name}</div>
                  <div style={{ fontSize:10, color:"#555", marginTop:2 }}>{ing.note}</div>
                </div>
                <span style={{ ...tag(ing.color) }}>{ing.time}</span>
              </div>
            ))}
          </div>
        </>}

        {/* SCHEDULE */}
        {tab==="schedule" && <>
          <span style={lbl}>WEEKLY SCHEDULE</span>
          {DAYS.map(day => {
            const p = WEEKLY_PLAN[day], isToday = day===dayName;
            return (
              <div key={day} style={{ background:isToday?"rgba(201,169,110,0.06)":"rgba(255,255,255,0.02)", border:"1px solid "+(isToday?"rgba(201,169,110,0.25)":"rgba(255,255,255,0.05)"), borderRadius:14, padding:"13px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:isToday?G:"#f0e6d3" }}>{day}</span>
                    {isToday && <span style={{ fontSize:8, background:G, color:"#0a0a0a", borderRadius:4, padding:"2px 6px", fontWeight:700 }}>TODAY</span>}
                  </div>
                  <span style={{ fontSize:10, color:"#555" }}>{p.label}</span>
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {["Cleanser","Vit C","Moisturiser","SPF"].map(t=><span key={t} style={{ ...tag(GR) }}>{t}</span>)}
                  {p.sal    && <span style={{ ...tag(PU) }}>Salicylic</span>}
                  {p.retinol&& <span style={{ ...tag(G)  }}>Retinol</span>}
                  {!p.sal&&!p.retinol && <span style={{ fontSize:9, color:"#555", borderRadius:5, padding:"3px 8px", background:"rgba(255,255,255,0.04)" }}>Rest Night</span>}
                </div>
              </div>
            );
          })}

          <div style={{ marginTop:24 }}>
            <span style={lbl}>GOLDEN RULES</span>
            {[
              ["⛔","Never use Salicylic + Retinol on the same night"],
              ["☀️","Vitamin C is AM only — always finish with SPF"],
              ["🌙","Retinol is PM only — always moisturise right after"],
              ["🌧️","Mumbai monsoon: SPF washes off faster, reapply outdoors"],
              ["💦","High humidity: your gel cream is enough, don't over-layer"],
              ["⏳","8-12 weeks minimum before judging results — trust the process"],
              ["🧊","Store Vitamin C in a cool spot — Mumbai heat oxidises it faster"],
            ].map(([icon,rule]) => (
              <div key={rule} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span>
                <span style={{ fontSize:12, color:"#777", lineHeight:1.5 }}>{rule}</span>
              </div>
            ))}
          </div>
        </>}

      </div>
    </div>
  );
}
