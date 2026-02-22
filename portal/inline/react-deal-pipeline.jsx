/* ── vit:bikes Deal Flow Pipeline ─────────────────── */
const { useState, useRef, useCallback, useEffect } = React;

const STAGES = [
  { id: "lead", label: "🎯 Leads", color: "#FF6B35", bg: "#FFF3ED", emoji: "🎣" },
  { id: "angebot", label: "📝 Angebot", color: "#667EEA", bg: "#EBF4FF", emoji: "💌" },
  { id: "schwebend", label: "⏳ Schwebend", color: "#F7C948", bg: "#FFFBEA", emoji: "🎈" },
  { id: "verkauft", label: "🎉 Verkauft", color: "#38B2AC", bg: "#E6FFFA", emoji: "🏆" },
  { id: "gold", label: "🗄️ Schrank der Hoffnung", color: "#D69E2E", bg: "#FFFFF0", emoji: "✨" },
  { id: "lost", label: "💀 Verloren", color: "#E53E3E", bg: "#FFF5F5", emoji: "😭" },
];
const PIPELINE = ["lead", "angebot", "schwebend", "verkauft"];
const AGING = { lead: 3, angebot: 5, schwebend: 7 };
const AVATARS = ["👤","👩","👨","👩‍💼","👨‍💼","👩‍🎨","👨‍🔧","👩‍⚕️","👨‍🍳","👩‍💻","🧑‍🎓","👴"];
const ACT_TYPES = [
  { id: "call", label: "📞 Anruf", color: "#667EEA" },
  { id: "email", label: "📧 E-Mail", color: "#38B2AC" },
  { id: "meeting", label: "☕ Meeting", color: "#F7C948" },
  { id: "note", label: "📝 Notiz", color: "#A0AEC0" },
  { id: "whatsapp", label: "💬 WhatsApp", color: "#25D366" },
];
const ACHIEVEMENTS = [
  { id: "first_sale", label: "Erster Verkauf", icon: "🌟", desc: "Dein erster Deal", check: s => s.sold >= 1 },
  { id: "streak3", label: "3er Streak", icon: "🔥", desc: "3x hintereinander", check: s => s.streak >= 3 },
  { id: "streak5", label: "5er Streak", icon: "💥", desc: "Unstoppable!", check: s => s.streak >= 5 },
  { id: "10k", label: "10K Club", icon: "💰", desc: "€10k Umsatz", check: s => s.rev >= 10000 },
  { id: "50k", label: "50K Club", icon: "💎", desc: "€50k Umsatz", check: s => s.rev >= 50000 },
  { id: "100k", label: "100K Club", icon: "👑", desc: "Legende!", check: s => s.rev >= 100000 },
  { id: "machine", label: "Deal Machine", icon: "⚙️", desc: "10 Deals erstellt", check: s => s.total >= 10 },
  { id: "hot", label: "Heisse Hand", icon: "✋", desc: "5x Heat 5", check: s => s.hot >= 5 },
  { id: "golddig", label: "Hoffnungsträger", icon: "⛏️", desc: "3 Hoffnungs-Kontakte", check: s => s.gold >= 3 },
  { id: "active", label: "Aktiver Seller", icon: "🏃", desc: "20 Aktivitäten", check: s => s.acts >= 20 },
];
// LOCATIONS + SELLERS: loaded dynamically from Supabase in PipelineApp
const FALLBACK_LOCATIONS = [{ id: "hq", label: "🏢 HQ (Alle)", isHQ: true }];
const FALLBACK_SELLERS = [];
const SELLER_COLORS = ["#667EEA","#E1306C","#38B2AC","#F7C948","#FF6B35","#764BA2","#2D3748","#E53E3E","#D69E2E","#319795"];

const CELEB = ["🎉","🥳","🏆","💰","🔥","⭐","🎊","💎","👑","🚀"];
const GOAL = 15000;
const NOW = Date.now();
const ago = d => NOW - d * 864e5;
const fmt = v => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(v);
const dSince = ts => Math.floor((NOW - ts) / 864e5);
const tAgo = ts => { const d = dSince(ts); return d === 0 ? "Heute" : d === 1 ? "Gestern" : `vor ${d}d`; };

const DEFAULT_RULES = [
  { id: "r1", from: "lead", to: "angebot", action: "todo", text: "Angebot nachfassen", days: 3, enabled: true, scope: "hq" },
  { id: "r2", from: "angebot", to: "schwebend", action: "todo", text: "Nachfragen ob Entscheidung gefallen", days: 5, enabled: true, scope: "hq" },
  { id: "r3", from: "lead", to: "angebot", action: "activity", actType: "note", text: "Angebot wurde erstellt", enabled: true, scope: "hq" },
  { id: "r4", from: "*", to: "verkauft", action: "todo", text: "Willkommens-Mail senden", days: 0, enabled: true, scope: "hq" },
  { id: "r5", from: "*", to: "gold", action: "todo", text: "In 30 Tagen erneut kontaktieren", days: 30, enabled: true, scope: "hq" },
  { id: "r6", from: "lead", to: "angebot", action: "activity", actType: "call", text: "Beratungstermin vereinbaren", enabled: true, scope: "berlin" },
];

// INIT data removed – loaded from Supabase in PipelineApp
const INIT = [];

// ── Stage Mapping: React ↔ DB ──
const STAGE_TO_DB = { lead: "neu", angebot: "angebot", schwebend: "schwebend", verkauft: "gewonnen", gold: "gold", lost: "verloren" };
const DB_TO_STAGE = { neu: "lead", kontaktiert: "lead", angebot: "angebot", verhandlung: "schwebend", schwebend: "schwebend", gewonnen: "verkauft", verloren: "lost", gold: "gold" };

// ── Quelle Mapping: React ↔ DB ──
const SOURCE_TO_DB = { "Empfehlung": "empfehlung", "Google": "google", "Instagram": "instagram", "Facebook": "facebook", "Messe": "messe", "Walk-In": "walk_in", "Website": "website", "Flyer": "flyer", "TikTok": "tiktok", "Andere": "sonstige" };
const DB_TO_SOURCE = Object.fromEntries(Object.entries(SOURCE_TO_DB).map(([k,v])=>[v,k]));

// ── Supabase Data Layer ──
function useSupabase(currentLoc, SELLERS) {
  const sb = window.sb;
  const profile = window.sbProfile;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Convert DB row → React deal object
  const dbToDeal = useCallback((row, todos, acts) => ({
    id: row.id,  // uuid from DB
    name: ((row.vorname || "") + " " + (row.nachname || "")).trim() || "Unbekannt",
    value: parseFloat(row.geschaetzter_wert) || 0,
    stage: DB_TO_STAGE[row.status] || "lead",
    avatar: row.avatar || "👤",
    heat: row.heat || 3,
    note: row.notizen || "",
    phone: row.telefon || "",
    email: row.email || "",
    seller: row.zugewiesen_an || "",
    source: DB_TO_SOURCE[row.quelle] || "",
    loc: row.standort_id || "",
    sales: row.sales || {},
    created: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    changed: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    todos: (todos || []).map(t => ({
      id: t.id,
      text: t.text,
      done: t.done || false,
      due: t.due ? new Date(t.due).getTime() : Date.now() + 7 * 864e5
    })),
    acts: (acts || []).map(a => ({
      type: a.typ || "note",
      text: a.beschreibung || "",
      time: a.created_at ? new Date(a.created_at).getTime() : Date.now()
    })),
    _db: row // keep original for reference
  }), []);

  // Load all deals + todos + activities
  const loadDeals = useCallback(async () => {
    if (!sb) return [];
    setLoading(true);
    try {
      // Load leads
      let q = sb.from("leads").select("*").order("created_at", { ascending: false });
      const { data: leads, error: e1 } = await q;
      if (e1) throw e1;
      if (!leads || !leads.length) { setLoading(false); return []; }

      // Load all todos for these leads
      const leadIds = leads.map(l => l.id);
      const { data: allTodos } = await sb.from("lead_todos").select("*").in("lead_id", leadIds).order("created_at", { ascending: false });
      
      // Load all activities for these leads
      const { data: allActs } = await sb.from("lead_aktivitaeten").select("*").in("lead_id", leadIds).order("created_at", { ascending: false });

      // Group by lead_id
      const todoMap = {};
      (allTodos || []).forEach(t => { if (!todoMap[t.lead_id]) todoMap[t.lead_id] = []; todoMap[t.lead_id].push(t); });
      const actMap = {};
      (allActs || []).forEach(a => { if (!actMap[a.lead_id]) actMap[a.lead_id] = []; actMap[a.lead_id].push(a); });

      const deals = leads.map(l => dbToDeal(l, todoMap[l.id], actMap[l.id]));
      setLoading(false);
      return deals;
    } catch (err) {
      console.error("[Pipeline] Load error:", err);
      setError(err.message);
      setLoading(false);
      return [];
    }
  }, [sb, dbToDeal]);

  // Save deal field to DB
  const saveDeal = useCallback(async (dealId, field, value) => {
    if (!sb) return;
    const updates = {};
    switch (field) {
      case "name": {
        const parts = String(value).trim().split(" ");
        updates.vorname = parts[0] || "";
        updates.nachname = parts.slice(1).join(" ") || "";
        break;
      }
      case "value": updates.geschaetzter_wert = value; break;
      case "stage": updates.status = STAGE_TO_DB[value] || "neu"; break;
      case "heat": updates.heat = value; break;
      case "avatar": updates.avatar = value; break;
      case "note": updates.notizen = value; break;
      case "phone": updates.telefon = value; break;
      case "email": updates.email = value; break;
      case "seller": updates.zugewiesen_an = value || null; break;
      case "source": updates.quelle = SOURCE_TO_DB[value] || "sonstige"; break;
      case "sales": updates.sales = value; break;
      default: return; // Unknown field, skip
    }
    try {
      const { error: err } = await sb.from("leads").update(updates).eq("id", dealId);
      if (err) console.error("[Pipeline] Save error:", err);
    } catch (e) { console.error("[Pipeline] Save exception:", e); }
  }, [sb]);

  // Create new deal
  const createDeal = useCallback(async (deal) => {
    if (!sb || !profile) return null;
    const nameParts = (deal.name || "").trim().split(" ");
    try {
      const { data, error: err } = await sb.from("leads").insert({
        standort_id: deal.loc || profile.standort_id,
        erstellt_von: window.sbUser?.id || null,
        zugewiesen_an: deal.seller || null,
        vorname: nameParts[0] || "Neu",
        nachname: nameParts.slice(1).join(" ") || "",
        email: deal.email || null,
        telefon: deal.phone || null,
        status: STAGE_TO_DB[deal.stage] || "neu",
        quelle: SOURCE_TO_DB[deal.source] || "walk_in",
        interesse: deal.note || "",
        notizen: deal.note || "",
        geschaetzter_wert: deal.value || 0,
        heat: deal.heat || 3,
        avatar: deal.avatar || "👤",
        sales: deal.sales || {}
      }).select().single();
      if (err) throw err;
      return data;
    } catch (e) { console.error("[Pipeline] Create error:", e); return null; }
  }, [sb, profile]);

  // Save todo
  const saveTodo = useCallback(async (leadId, todo) => {
    if (!sb) return null;
    try {
      const { data, error: err } = await sb.from("lead_todos").insert({
        lead_id: leadId,
        text: todo.text,
        done: todo.done || false,
        due: todo.due ? new Date(todo.due).toISOString() : null,
        created_by: window.sbUser?.id || null
      }).select().single();
      if (err) throw err;
      return data;
    } catch (e) { console.error("[Pipeline] Todo create error:", e); return null; }
  }, [sb]);

  // Toggle todo done
  const toggleTodo = useCallback(async (todoId, done) => {
    if (!sb) return;
    try {
      await sb.from("lead_todos").update({ done }).eq("id", todoId);
    } catch (e) { console.error("[Pipeline] Todo toggle error:", e); }
  }, [sb]);

  // Add activity
  const addActivity = useCallback(async (leadId, act) => {
    if (!sb) return null;
    try {
      const { data, error: err } = await sb.from("lead_aktivitaeten").insert({
        lead_id: leadId,
        user_id: window.sbUser?.id || null,
        typ: act.type || "note",
        beschreibung: act.text || "",
        metadata: {}
      }).select().single();
      if (err) throw err;
      return data;
    } catch (e) { console.error("[Pipeline] Activity create error:", e); return null; }
  }, [sb]);

  return { loading, error, loadDeals, saveDeal, createDeal, saveTodo, toggleTodo, addActivity };
}

/* ── Tiny Components ─────────────────────────────── */
function Particle({x,y,emoji,delay}){return <div style={{position:"fixed",left:x,top:y,fontSize:"2rem",pointerEvents:"none",zIndex:9999,animation:`fly 1.2s ease-out ${delay}s forwards`,opacity:0}}>{emoji}</div>}
function Heat({heat}){return <div style={{display:"flex",gap:2,alignItems:"center"}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<=heat?(heat>=4?"#FF6B35":heat>=3?"#F7C948":"#CBD5E0"):"#E2E8F0",transition:"all .3s"}}/>)}<span style={{fontSize:9,marginLeft:3,color:"#999"}}>{heat>=4?"🔥":heat>=3?"☀️":"❄️"}</span></div>}

function TodoBadge({todos}){
  const open = todos.filter(t => !t.done);
  if(!open.length) return null;
  const overdue = open.some(t => t.due < NOW);
  return <div style={{display:"inline-flex",alignItems:"center",gap:3,background:overdue?"#FED7D7":"#EBF4FF",color:overdue?"#C53030":"#667EEA",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:8,fontFamily:"'Outfit',sans-serif",animation:overdue?"pulse 1.5s infinite":"none"}}>
    {overdue?"❗":"☑️"} {open.length}
  </div>
}

function AgingBadge({deal}){
  if(["verkauft","lost","gold"].includes(deal.stage))return null;
  const d=dSince(deal.changed),w=AGING[deal.stage]||5;
  if(d<w)return null;
  const u=d>=w*2;
  return <div style={{display:"inline-flex",alignItems:"center",gap:3,background:u?"#FED7D7":"#FEFCBF",color:u?"#C53030":"#B7791F",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,animation:u?"pulse 1s infinite":"none",fontFamily:"'Outfit',sans-serif"}}>{u?"🚨":"⏰"} {d}d</div>
}


/* ── Deal Card (Clean) ────────────────────────────── */
function Card({deal,onDrag,onClick,isNew}){
  const st=STAGES.find(s=>s.id===deal.stage);
  const d=dSince(deal.changed),w=AGING[deal.stage]||999,aging=d>=w&&!["verkauft","lost","gold"].includes(deal.stage);
  const urgent=d>=w*2;
  const openT=deal.todos.filter(t=>!t.done).length;
  const overdue=deal.todos.some(t=>!t.done&&t.due<NOW);
  const seller=SELLERS.find(s=>s.id===deal.seller);
  return <div draggable onDragStart={e=>{e.dataTransfer.setData("id",deal.id);e.dataTransfer.effectAllowed="move";onDrag(deal.id)}} onClick={()=>onClick(deal)} style={{background:"var(--c-bg)",borderRadius:12,padding:"11px 13px",cursor:"grab",borderLeft:`3px solid ${aging?(urgent?"#E53E3E":"#ECC94B"):st.color}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",transition:"all .15s",animation:isNew?"appear .4s ease":"none",userSelect:"none"}}>
    <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:5}}>
      <div style={{width:30,height:30,borderRadius:9,background:st.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{deal.avatar}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:13,color:"#1a202c",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{deal.name}</div>
        <div style={{fontSize:10,color:"#A0AEC0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{deal.note}</div>
      </div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontWeight:800,fontSize:14,color:st.color}}>{fmt(deal.value)}</span>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        {seller&&<span style={{fontSize:9,fontWeight:700,color:seller.color,background:seller.color+"10",padding:"1px 5px",borderRadius:4}}>{seller.short}</span>}
        {openT>0&&<span style={{fontSize:9,fontWeight:700,color:overdue?"#E53E3E":"#667EEA",background:overdue?"#FED7D7":"#EBF4FF",padding:"1px 5px",borderRadius:4}}>{overdue?"❗":"☑"}{openT}</span>}
        {aging&&<span style={{fontSize:9,fontWeight:700,color:urgent?"#E53E3E":"#B7791F",background:urgent?"#FED7D7":"#FEFCBF",padding:"1px 5px",borderRadius:4}}>{urgent?"🚨":"⏰"}{d}d</span>}
        <div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:i<=deal.heat?(deal.heat>=4?"#FF6B35":deal.heat>=2?"#F7C948":"#CBD5E0"):"#EDF2F7"}}/>)}</div>
      </div>
    </div>
  </div>
}

/* ── Column (Clean) ──────────────────────────────── */
function Col({stage,deals,onDrop,onDrag,onClick,newId}){
  const[dg,setDg]=useState(false);
  const tv=deals.reduce((s,d)=>s+d.value,0);
  return <div onDragOver={e=>{e.preventDefault();setDg(true)}} onDragLeave={()=>setDg(false)} onDrop={e=>{e.preventDefault();setDg(false);onDrop(+e.dataTransfer.getData("id"),stage.id)}} style={{flex:"1 1 0",minWidth:180,display:"flex",flexDirection:"column",gap:6,background:dg?`${stage.color}08`:"transparent",borderRadius:14,padding:8,transition:"all .2s",border:`2px dashed ${dg?stage.color:"transparent"}`}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 4px 2px"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:stage.color}}/>
        <span style={{fontWeight:700,fontSize:12,color:"#2D3748"}}>{stage.label}</span>
        <span style={{fontSize:10,fontWeight:600,color:"#A0AEC0"}}>{deals.length}</span>
      </div>
      <span style={{fontWeight:700,fontSize:11,color:stage.color}}>{fmt(tv)}</span>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:5,flex:1,minHeight:80}}>
      {deals.map(d=><Card key={d.id} deal={d} onDrag={onDrag} onClick={onClick} isNew={d.id===newId}/>)}
      {!deals.length&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#E2E8F0",fontSize:24,opacity:dg?1:.3}}>{stage.emoji}</div>}
    </div>
  </div>
}

/* ── Add Modal ───────────────────────────────────── */
function AddModal({onClose,onAdd,currentLoc,LOCATIONS,SELLERS}){
  const[n,setN]=useState("");const[v,setV]=useState("");const[no,setNo]=useState("");const[ph,setPh]=useState("");const[em,setEm]=useState("");const[av,setAv]=useState("👤");
  const locs=LOCATIONS.filter(l=>!l.isHQ);
  const[loc,setLoc]=useState(currentLoc==="hq"?(locs[0]?.id||""):currentLoc);const[seller,setSeller]=useState("");
  const availSellers=SELLERS.filter(s=>s.loc===loc);
  const go=()=>{if(!n||!v)return;onAdd({name:n,value:+v,note:no||"Neuer Kontakt",avatar:av,heat:3,stage:"lead",phone:ph,email:em,acts:[],todos:[],created:Date.now(),changed:Date.now(),loc,seller:seller||availSellers[0]?.id||""})};
  const ip={width:"100%",padding:"10px 14px",borderRadius:12,border:"2px solid #E2E8F0",fontSize:14,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box"};
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,animation:"fadeIn .2s"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"var(--c-bg)",borderRadius:24,padding:28,width:420,maxWidth:"92vw",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,.15)",animation:"pop .3s cubic-bezier(.34,1.56,.64,1)"}}>
      <h2 style={{margin:"0 0 20px",fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:22}}>🚀 Neuer Kontakt</h2>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={{fontSize:11,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",display:"block",marginBottom:4}}>Name *</label><input style={ip} placeholder="z.B. Anna Müller" value={n} onChange={e=>setN(e.target.value)} autoFocus/></div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",display:"block",marginBottom:4}}>Wert (€) *</label><input style={ip} type="number" placeholder="2500" value={v} onChange={e=>setV(e.target.value)}/></div>
          <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",display:"block",marginBottom:4}}>Standort</label>
            <select value={loc} onChange={e=>{setLoc(e.target.value);setSeller("")}} style={{...ip,cursor:"pointer",background:"var(--c-bg)"}}>{locs.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select>
          </div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",display:"block",marginBottom:4}}>Verkäufer</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{availSellers.map(s=><div key={s.id} onClick={()=>setSeller(s.id)} style={{padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",background:seller===s.id?s.color+"20":"#F7FAFC",color:seller===s.id?s.color:"#A0AEC0",border:`2px solid ${seller===s.id?s.color:"transparent"}`,transition:"all .2s",display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:22,height:22,borderRadius:7,background:s.color,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900}}>{s.short}</span>{s.name}
            </div>)}{!availSellers.length&&<span style={{fontSize:12,color:"#CBD5E0"}}>Kein Verkäufer für diesen Standort</span>}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",display:"block",marginBottom:4}}>Telefon</label><input style={ip} placeholder="0176 ..." value={ph} onChange={e=>setPh(e.target.value)}/></div>
          <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",display:"block",marginBottom:4}}>E-Mail</label><input style={{...ip}} type="email" placeholder="anna@mail.de" value={em} onChange={e=>setEm(e.target.value)}/></div>
        </div>
        <div><label style={{fontSize:11,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",display:"block",marginBottom:4}}>Notiz</label><input style={ip} placeholder="Interesse an..." value={no} onChange={e=>setNo(e.target.value)}/></div>
        <div><label style={{fontSize:11,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",display:"block",marginBottom:4}}>Avatar</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{AVATARS.map(a=><div key={a} onClick={()=>setAv(a)} style={{width:38,height:38,borderRadius:10,border:`2px solid ${av===a?"#667EEA":"#E2E8F0"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,cursor:"pointer",background:av===a?"#EBF4FF":"#fff",transform:av===a?"scale(1.1)":"scale(1)",transition:"all .2s"}}>{a}</div>)}</div>
        </div>
        <div style={{display:"flex",gap:12,marginTop:4}}>
          <button onClick={onClose} style={{flex:1,padding:"11px 18px",borderRadius:12,border:"2px solid #E2E8F0",background:"var(--c-bg)",fontSize:14,fontWeight:700,color:"#718096",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Abbrechen</button>
          <button onClick={go} style={{flex:2,padding:"11px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#667EEA,#764BA2)",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"'Outfit',sans-serif",boxShadow:"0 4px 15px rgba(102,126,234,.4)",opacity:n&&v?1:.5}}>🚀 Hinzufügen</button>
        </div>
      </div>
    </div>
  </div>
}

/* ── Verkaufsformular, Detail Modal, Auto Modal, Scores, Funnel, Badges, DropZone, App ── */
/* ── Verkaufsformular (2 Modi) ────────────────────── */
function SalesForm({deal,sales,seller,onClose,onUpdateDeal,mode}){
  const[form,setForm]=useState({...sales});
  const u=(k,v)=>{
    setForm(p=>({...p,[k]:v}));
    // Budget-Range → Deal-Wert automatisch setzen
    if(k==="budgetRange"){
      const map={"<2k":1500,"2-3k":2500,"3-5k":4000,"5k+":6000};
      if(map[v]) onUpdateDeal(deal.id,"value",map[v]);
    }
  };
  const saveAndClose=()=>{
    // Merge: bestehende sales + form (damit Upload-Daten nicht überschrieben werden)
    const merged = {...(deal.sales||{}), ...form};
    onUpdateDeal(deal.id,"sales",merged);
    onClose();
  };
  const isInt=mode==="interactive";

  const payOpts=["JobRad","BLS","BusinessBike","Finanzierung","Leasing/Divers","Bar/EC"];
  const bedarfFields=[
    {k:"nutzung",l:"Was machst du mit dem Fahrrad?",p:"Pendeln, Sport, Freizeit..."},
    {k:"ziel",l:"Welches Ziel verfolgst du?",p:"Fitness, Mobilität, Spass..."},
    {k:"distanz",l:"Distanzen",p:"km pro Fahrt",half:1},
    {k:"haeufigkeit",l:"Wie oft / Woche",p:"3x / 5h",half:1},
    {k:"erfahrung",l:"E-Bike Erfahrung",p:"Noch nie, ab und zu, regelmässig..."},
    {k:"lagerung",l:"Lagerung & Transport",p:"Garage, Keller...",half:1},
    {k:"aufladen",l:"Wo aufladen?",p:"Zuhause, Arbeit...",half:1},
    {k:"wichtig",l:"Was ist dir am Rad wichtig?",p:"Komfort, Design, Reichweite..."},
    {k:"dreiPunkte",l:"3 Punkte damit du heute kaufst?",p:"1. ... 2. ... 3. ...",big:1},
    {k:"budget",l:"Budget",p:"€ – Wie kam es zustande?",half:1},
    {k:"zeitrahmen",l:"Wann einsatzfähig?",p:"Sofort, nächste Woche...",half:1},
  ];
  const ergoFields=[{k:"sattelhoehe",l:"Sattelhöhe"},{k:"sattelversatz",l:"Sattelversatz"},{k:"abstandLenker",l:"Sattel-Lenker"},{k:"lenkerhoehe",l:"Lenkerhöhe"},{k:"sitzknochen",l:"Sitzknochen"},{k:"griffgroesse",l:"Griffgrösse"}];
  const checkFields=[{k:"todoZubehoer",l:"Zubehörteile bestellt"},{k:"todoRadBestellt",l:"Fahrrad bestellt / lagernd"},{k:"todoKiste",l:"Kiste gepackt"},{k:"todoLeasing",l:"Leasing-Anfrage gestellt"},{k:"todoFinanzierung",l:"Finanzierung: Unterlagen kopiert"},{k:"todoWertgarantie",l:"Wertgarantie"}];

  // ── Print version: open in new window ──
  const doPrint=()=>{
    const w=window.open("","_blank","width=800,height=1100");
    w.document.write(`<html><head><title>Fahrradberatung – ${deal.name}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif;color:#1a1a1a}
      body{padding:36px 44px;max-width:780px;margin:0 auto}
      .hdr{border-bottom:3px solid #f60;padding-bottom:10px;margin-bottom:16px}
      .hdr h1{font-size:20px;font-weight:700}
      .hdr .sub{font-size:10px;color:#999;margin-top:2px}
      .meta{display:flex;gap:24px;margin-bottom:14px;font-size:11px}
      .meta b{font-weight:700}
      .pay-row{display:flex;gap:5px;margin-bottom:16px;flex-wrap:wrap}
      .pill{padding:3px 12px;border:1.5px solid #ccc;border-radius:5px;font-size:10px;font-weight:600}
      .pill.on{background:#333;color:#fff;border-color:#333}
      .sec{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#f60;margin:16px 0 8px;padding-bottom:3px;border-bottom:2px solid #f60}
      .f{margin-bottom:8px}
      .fl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;margin-bottom:1px}
      .fv{min-height:22px;border-bottom:1px solid #ccc;padding:2px 0;font-size:11px;line-height:1.6}
      .fv:empty::after{content:' ';white-space:pre}
      .g2{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px}
      .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 16px}
      .chk{display:flex;align-items:center;gap:7px;margin-bottom:4px;font-size:10px}
      .box{width:11px;height:11px;border:1.5px solid #888;border-radius:2px;display:inline-block}
      .ft{margin-top:24px;text-align:center;font-size:8px;color:#bbb;border-top:1px solid #eee;padding-top:6px}
      @media print{.np{display:none!important}body{padding:20px 28px}}

        
    </style></head><body>
    <div class="hdr"><h1>FAHRRADBERATUNG</h1><div class="sub">vit:bikes · ${new Date().toLocaleDateString("de-DE")}</div></div>
    <div class="meta"><span><b>Kunde:</b> ________________________________</span><span><b>Datum:</b> ___________</span><span><b>Verkäufer:</b> ____________________</span></div>
    <div class="pay-row">${payOpts.map(p=>`<span class="pill">${p}</span>`).join("")}</div>
    <div class="sec">Bedarfsanalyse</div>
    ${bedarfFields.map(f=>`<div class="f"><div class="fl">${f.l}</div><div class="fv"></div></div>`).join("")}
    <div class="sec">Ergodaten</div>
    <div style="margin-bottom:6px"><span class="pill">Bodyscanner</span> <span class="pill">Smartfit</span></div>
    <div class="g3">${ergoFields.map(f=>`<div class="f"><div class="fl">${f.l}</div><div class="fv"></div></div>`).join("")}</div>
    <div class="sec">Gekauftes Rad</div>
    <div class="f"><div class="fv" style="min-height:28px"></div></div>
    <div class="g2"><div class="f"><div class="fl">Nr. Teilekiste</div><div class="fv"></div></div><div class="f"><div class="fl">Nr. Auftrag</div><div class="fv"></div></div></div>
    <div class="sec">Nach dem Kauf</div>
    ${checkFields.map(c=>`<div class="chk"><span class="box"></span> ${c.l}</div>`).join("")}
    <div class="ft">vit:bikes · Fahrradberatung</div>
    <div class="np" style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:12px 40px;font-size:14px;font-weight:700;cursor:pointer;border:none;background:#f60;color:#fff;border-radius:8px">Drucken</button></div>

</body></html>`);w.document.close()};

  // ── Print mode: just trigger print and close ──
  if(!isInt){doPrint();onClose();return null}

  // ── Interactive mode: minimal clean ──
  const ip={width:"100%",padding:"10px 14px",borderRadius:12,border:"1.5px solid #E8E8E8",fontSize:14,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box",background:"var(--c-bg)"};
  const T=({on,onClick,children,c})=><div onClick={onClick} style={{padding:"11px 18px",borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",background:on?(c||"#1a202c"):"#fff",color:on?"#fff":"#666",border:`1.5px solid ${on?(c||"#1a202c"):"#E8E8E8"}`,transition:"all .12s",userSelect:"none"}}>{children}</div>;
  const Sin=({k,opts,c})=><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{opts.map(o=><T key={o.id||o} on={form[k]===(o.id||o)} c={c} onClick={()=>u(k,form[k]===(o.id||o)?"":(o.id||o))}>{o.label||o}</T>)}</div>;
  const Mul=({k,opts,c})=><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{opts.map(o=>{const id=o.id||o;const cur=form[k]||[];const on=Array.isArray(cur)&&cur.includes(id);return <T key={id} on={on} c={c} onClick={()=>u(k,on?cur.filter(x=>x!==id):[...(Array.isArray(cur)?cur:[]),id])}>{o.label||o}</T>})}</div>;
  const Q=({q,sub,children})=><div style={{marginBottom:32}}><div style={{fontSize:16,fontWeight:700,color:"#1a202c",marginBottom:sub?4:10}}>{q}</div>{sub&&<div style={{fontSize:12,color:"#999",marginBottom:10}}>{sub}</div>}{children}</div>;

  return <div onClick={e=>{e.stopPropagation();saveAndClose()}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,animation:"fadeIn .1s"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#FAFAFA",borderRadius:24,width:540,maxWidth:"96vw",maxHeight:"94vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.1)",animation:"pop .2s ease"}}>

      <div style={{padding:"20px 28px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div><div style={{fontWeight:800,fontSize:20,color:"#1a202c"}}>Beratung</div><div style={{fontSize:12,color:"#999",marginTop:2}}>{deal.name}</div></div>
        <button onClick={e=>{e.stopPropagation();saveAndClose()}} style={{width:36,height:36,borderRadius:10,border:"none",background:"#EFEFEF",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#999"}}>✕</button>
      </div>

      <div style={{padding:"0 28px 28px",overflowY:"auto",flex:1}}>

        <Q q="Bezahlart"><Sin k="payment" opts={payOpts}/></Q>

        <Q q="Wofür brauchst du das Rad?" sub="Mehrfachauswahl möglich">
          <Mul k="nutzungTags" opts={[{id:"pendeln",label:"Pendeln"},{id:"sport",label:"Sport"},{id:"freizeit",label:"Freizeit"},{id:"transport",label:"Transport"},{id:"kinder",label:"Kinder"},{id:"offroad",label:"Offroad"},{id:"stadt",label:"Stadt"},{id:"reisen",label:"Reisen"}]}/>
        </Q>

        <Q q="Welche Strecken?"><Sin k="distanz" opts={[{id:"kurz",label:"< 5 km"},{id:"mittel",label:"5–15 km"},{id:"weit",label:"15–30 km"},{id:"lang",label:"30+ km"}]}/></Q>

        <Q q="Wie oft pro Woche?"><Sin k="haeufigkeit" opts={[{id:"selten",label:"Selten"},{id:"1-2x",label:"1–2×"},{id:"3-5x",label:"3–5×"},{id:"täglich",label:"Täglich"}]}/></Q>

        <Q q="E-Bike Erfahrung?"><Sin k="erfahrung" opts={[{id:"keine",label:"Keine"},{id:"wenig",label:"Mal getestet"},{id:"mittel",label:"Gelegentlich"},{id:"viel",label:"Regelmässig"}]}/></Q>

        <Q q="Wo steht das Rad?" sub="Mehrfachauswahl möglich">
          <Mul k="lagerungTags" opts={[{id:"garage",label:"Garage"},{id:"keller",label:"Keller"},{id:"wohnung",label:"Wohnung"},{id:"draussen",label:"Draussen"},{id:"arbeit",label:"Arbeit"}]}/>
        </Q>

        <Q q="Was ist dir wichtig?" sub="Mehrfachauswahl möglich">
          <Mul k="wichtigTags" opts={[{id:"komfort",label:"Komfort"},{id:"reichweite",label:"Reichweite"},{id:"speed",label:"Speed"},{id:"design",label:"Design"},{id:"leicht",label:"Leicht"},{id:"robust",label:"Robust"},{id:"preis",label:"Preis-Leistung"},{id:"motor",label:"Starker Motor"},{id:"leise",label:"Leiser Motor"}]} c="#667EEA"/>
        </Q>

        <Q q="3 Dinge, damit du heute kaufst?">
          {(()=>{const[v,setV]=useState("");const items=form.dreiPunkteList||[];const add=()=>{if(!v.trim()||items.length>=3)return;u("dreiPunkteList",[...items,v.trim()]);setV("")};
          return <div>
            {items.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:"#1a202c",color:"#fff",fontSize:14,fontWeight:600,marginBottom:6}}>
              <span style={{width:24,height:24,borderRadius:8,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{i+1}</span>
              <span style={{flex:1}}>{t}</span>
              <span onClick={()=>u("dreiPunkteList",items.filter((_,j)=>j!==i))} style={{cursor:"pointer",opacity:.5}}>✕</span>
            </div>)}
            {items.length<3&&<input value={v} onChange={e=>setV(e.target.value)} placeholder={`Punkt ${items.length+1} eingeben...`} onKeyDown={e=>{if(e.key==="Enter")add()}} style={ip}/>}
          </div>})()}
        </Q>

        <Q q="Budget">
          <Sin k="budgetRange" opts={[{id:"<2k",label:"< 2.000 €"},{id:"2-3k",label:"2–3.000 €"},{id:"3-5k",label:"3–5.000 €"},{id:"5k+",label:"5.000+ €"}]}/>
          <input value={form.budget||""} onChange={e=>u("budget",e.target.value)} placeholder="Details..." style={{...ip,marginTop:8}}/>
        </Q>

        <Q q="Wann brauchst du es?"><Sin k="zeitrahmen" opts={[{id:"sofort",label:"Sofort"},{id:"2-4w",label:"2–4 Wochen"},{id:"flexibel",label:"Flexibel"}]}/></Q>

        <Q q="Ergonomie">
          <div style={{display:"flex",gap:8,marginBottom:12}}>{["Bodyscanner","Smartfit"].map(m=><T key={m} on={form.ergoMethod===m} onClick={()=>u("ergoMethod",form.ergoMethod===m?"":m)}>{m}</T>)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {ergoFields.map(f=><input key={f.k} value={form[f.k]||""} onChange={e=>u(f.k,e.target.value)} placeholder={f.l} style={{...ip,fontSize:12,padding:"8px 10px",textAlign:"center"}}/>)}
          </div>
        </Q>

        <Q q="Abschluss">
          <input value={form.gekauftesRad||""} onChange={e=>u("gekauftesRad",e.target.value)} placeholder="Gekauftes Rad" style={{...ip,marginBottom:8,fontWeight:600}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            <input value={form.nrTeilekiste||""} onChange={e=>u("nrTeilekiste",e.target.value)} placeholder="Nr. Teilekiste" style={{...ip,fontSize:12}}/>
            <input value={form.nrAuftrag||""} onChange={e=>u("nrAuftrag",e.target.value)} placeholder="Nr. Auftrag" style={{...ip,fontSize:12}}/>
          </div>
          {checkFields.map(c=><div key={c.k} onClick={()=>u(c.k,!form[c.k])} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:form[c.k]?"#E6FFFA":"#fff",border:`1.5px solid ${form[c.k]?"#38B2AC":"#E8E8E8"}`,cursor:"pointer",marginBottom:6}}>
            <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${form[c.k]?"#38B2AC":"#ccc"}`,background:form[c.k]?"#38B2AC":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .1s"}}>{form[c.k]&&<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>}</div>
            <span style={{fontSize:13,fontWeight:600,color:form[c.k]?"#1a202c":"#888"}}>{c.l}</span>
          </div>)}
        </Q>
      </div>

      <div style={{padding:"14px 28px",borderTop:"1px solid #EFEFEF",flexShrink:0}}>
        <button onClick={e=>{e.stopPropagation();saveAndClose()}} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"#1a202c",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Speichern</button>
      </div>
    </div>
  </div>
}

/* ── Detail Modal (Clean) ─────────────────────────── */
const SOURCES=["Empfehlung","Google","Instagram","Facebook","Messe","Walk-In","Website","Flyer","TikTok","Andere"];
const LEASING_PROVIDERS=["JobRad","BLS (Bikeleasing-Service)","BusinessBike","Leasing/Divers"];
const PAY_METHODS=[{id:"Bar/EC",icon:"💶"},{id:"Finanzierung",icon:"🏦"},{id:"Leasing",icon:"📋"}];

/* ── Scan Upload Modal ────────────────────────────── */
function ScanUploadModal({deal,sales,onClose,onUpdateDeal}){
  const[file,setFile]=useState(null);
  const[preview,setPreview]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const[parsed,setParsed]=useState(null); // KI-erkannte Werte
  const[editData,setEditData]=useState(null); // Bearbeitbare Felder
  const fileRef=useRef(null);

  const FIELD_LABELS={
    payment:"Bezahlart",nutzung:"Nutzung",ziel:"Ziel",distanz:"Distanzen",haeufigkeit:"Häufigkeit",
    erfahrung:"E-Bike Erfahrung",lagerung:"Lagerung",aufladen:"Aufladen",zeitrahmen:"Zeitrahmen",
    wichtig:"Wichtig am Rad",budget:"Budget",akku:"Akku-Ladezeit",dreiPunkte:"3 Kaufkriterien",
    einwaende:"Einwände",next:"Nächster Schritt",notizen:"Notizen",
    ergoMethod:"Ergonomie-Methode",sattelhoehe:"Sattelhöhe",sattelversatz:"Sattelversatz",
    abstandLenker:"Abstand Sattel-Lenker",lenkerhoehe:"Lenkerhöhe",sitzknochen:"Sitzknochen",griffgroesse:"Griffgrösse",
    gekauftesRad:"Gekauftes Rad",nrTeilekiste:"Nr. Teilekiste",nrAuftrag:"Nr. Auftrag",
    todoZubehoer:"Zubehörteile bestellt",todoRadBestellt:"Rad bestellt/lagernd",todoKiste:"Kiste gepackt",
    todoLeasing:"Leasing-Anfrage gestellt",todoFinanzierung:"Finanzierung: Unterlagen",todoWertgarantie:"Wertgarantie",
    nutzungTags:"Nutzungs-Tags",lagerungTags:"Lagerungs-Tags",wichtigTags:"Wichtig-Tags",
    budgetRange:"Budget-Bereich",dreiPunkteList:"3-Punkte-Liste"
  };

  const handleFile=(f)=>{
    if(!f)return;
    setFile(f);setError(null);setParsed(null);setEditData(null);
    const reader=new FileReader();
    reader.onload=e=>setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop=(e)=>{e.preventDefault();e.stopPropagation();const f=e.dataTransfer?.files?.[0];if(f)handleFile(f)};

  const analyze=async()=>{
    if(!preview)return;
    setLoading(true);setError(null);
    try{
      const base64=preview.split(",")[1];
      const mediaType=file.type||"image/jpeg";

      // Scan-Analyse via Supabase Edge Function (API-Key liegt sicher auf dem Server)
      const session=await window.sb.auth.getSession();
      const token=session?.data?.session?.access_token;
      const supabaseUrl=window.sb?.supabaseUrl||SUPABASE_URL||"";
      const supabaseKey=window.sb?.supabaseKey||SUPABASE_ANON_KEY||"";

      const resp=await fetch(supabaseUrl+"/functions/v1/analyze-scan",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":"Bearer "+(token||""),
          "apikey":supabaseKey
        },
        body:JSON.stringify({
          image_base64:base64,
          media_type:mediaType
        })
      });

      if(!resp.ok){
        const errBody=await resp.json().catch(()=>({}));
        throw new Error(errBody.error||`Fehler ${resp.status}`);
      }

      const data=await resp.json();
      const result=data.fields||{};
      setParsed(result);

      // Merge: bestehende sales haben Vorrang, gescannte Werte füllen Lücken
      const existing=deal.sales||{};
      const merged={};
      for(const[k,v] of Object.entries(result)){
        if(v===null||v===undefined||v==="")continue;
        merged[k]=v;
      }
      // Overlay: bestehende Werte überschreiben gescannte (digitale Eingaben haben Vorrang)
      for(const[k,v] of Object.entries(existing)){
        if(v!==null&&v!==undefined&&v!==""&&v!==false&&!(Array.isArray(v)&&v.length===0)){
          merged[k]=v;
        }
      }
      setEditData(merged);

    }catch(err){
      console.error("Scan analysis error:",err);
      setError(err.message||"Analyse fehlgeschlagen");
    }finally{
      setLoading(false);
    }
  };

  const updateField=(k,v)=>setEditData(p=>({...p,[k]:v}));

  const saveAll=()=>{
    if(!editData)return;
    // Merge with whatever is already saved
    const current=deal.sales||{};
    const final={...current,...editData};
    onUpdateDeal(deal.id,"sales",final);
    // Update deal value from budgetRange if present
    if(editData.budgetRange){
      const map={"<2k":1500,"2-3k":2500,"3-5k":4000,"5k+":6000};
      if(map[editData.budgetRange])onUpdateDeal(deal.id,"value",map[editData.budgetRange]);
    }
    onClose();
  };

  const ip={width:"100%",padding:"8px 12px",borderRadius:10,border:"1.5px solid #E2E8F0",fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box",background:"var(--c-bg)"};

  return <div onClick={e=>{e.stopPropagation();onClose()}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,animation:"fadeIn .15s"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"var(--c-bg)",borderRadius:24,width:560,maxWidth:"96vw",maxHeight:"94vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.12)",animation:"pop .25s ease"}}>

      {/* Header */}
      <div style={{padding:"20px 28px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #F0F0F0"}}>
        <div>
          <div style={{fontWeight:800,fontSize:18,color:"#1a202c"}}>📷 Formular-Scan</div>
          <div style={{fontSize:11,color:"#A0AEC0",marginTop:2}}>{deal.name} – Beratungsformular einscannen & analysieren</div>
        </div>
        <button onClick={onClose} style={{width:34,height:34,borderRadius:10,border:"none",background:"#F5F5F5",fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#999"}}>✕</button>
      </div>

      {/* Content */}
      <div style={{padding:"20px 28px",overflowY:"auto",flex:1}}>

        {/* Step 1: Upload */}
        {!editData&&<>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>

          {!preview&&<div
            onClick={()=>fileRef.current?.click()}
            onDragOver={e=>{e.preventDefault();e.stopPropagation()}}
            onDrop={handleDrop}
            style={{border:"2px dashed #E2E8F0",borderRadius:16,padding:"48px 24px",textAlign:"center",cursor:"pointer",transition:"all .2s",background:"#FAFAFA"}}
            onMouseOver={e=>e.currentTarget.style.borderColor="#FF6B35"}
            onMouseOut={e=>e.currentTarget.style.borderColor="#E2E8F0"}
          >
            <div style={{fontSize:48,marginBottom:12}}>📄</div>
            <div style={{fontWeight:700,fontSize:15,color:"#2D3748",marginBottom:4}}>Formular hochladen</div>
            <div style={{fontSize:12,color:"#A0AEC0"}}>Foto oder Scan per Klick oder Drag & Drop</div>
            <div style={{fontSize:11,color:"#CBD5E0",marginTop:8}}>JPG, PNG, PDF</div>
          </div>}

          {preview&&<div style={{marginBottom:20}}>
            <div style={{position:"relative",borderRadius:14,overflow:"hidden",border:"1px solid #E2E8F0",marginBottom:14}}>
              <img src={preview} alt="Scan" style={{width:"100%",maxHeight:300,objectFit:"contain",background:"#F9FAFB"}}/>
              <button onClick={()=>{setFile(null);setPreview(null);setError(null)}} style={{position:"absolute",top:8,right:8,width:28,height:28,borderRadius:8,border:"none",background:"rgba(0,0,0,.6)",color:"#fff",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{fontSize:11,color:"#A0AEC0",marginBottom:12}}>📁 {file?.name} ({(file?.size/1024).toFixed(0)} KB)</div>

            {error&&<div style={{padding:"10px 14px",borderRadius:10,background:"#FFF5F5",border:"1px solid #FED7D7",color:"#C53030",fontSize:12,fontWeight:600,marginBottom:12}}>⚠️ {error}</div>}

            <button onClick={analyze} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:loading?"#A0AEC0":"linear-gradient(135deg,#FF6B35,#E55D2B)",color:"#fff",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:"'Outfit',sans-serif",opacity:loading?.7:1,boxShadow:"0 4px 15px rgba(255,107,53,.3)"}}>
              {loading?<span>⏳ KI analysiert Formular...</span>:<span>🤖 Mit KI analysieren</span>}
            </button>
          </div>}

          {loading&&<div style={{padding:20,textAlign:"center"}}>
            <div style={{display:"inline-flex",gap:6,marginBottom:10}}>{[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#FF6B35",animation:`pulse 1s infinite ${i*.2}s`}}/>)}</div>
            <div style={{fontSize:13,color:"#718096",fontWeight:600}}>Handschrift wird erkannt...</div>
            <div style={{fontSize:11,color:"#A0AEC0",marginTop:4}}>Dies kann einige Sekunden dauern</div>
          </div>}
        </>}

        {/* Step 2: Voransicht & Bearbeiten */}
        {editData&&<div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,padding:"10px 14px",borderRadius:10,background:"#F0FFF4",border:"1px solid #C6F6D5"}}>
            <span style={{fontSize:20}}>✅</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"#22543D"}}>Analyse abgeschlossen</div>
              <div style={{fontSize:11,color:"#48BB78"}}>{Object.keys(editData).filter(k=>editData[k]!==null&&editData[k]!==undefined&&editData[k]!=="").length} Felder erkannt – prüfe & ergänze die Werte</div>
            </div>
          </div>

          {/* Show which fields came from existing digital data */}
          {Object.keys(deal.sales||{}).length>0&&<div style={{padding:"8px 12px",borderRadius:8,background:"#EBF4FF",border:"1px solid #BEE3F8",fontSize:11,color:"#2B6CB0",fontWeight:600,marginBottom:14}}>
            ℹ️ Bestehende Daten aus der digitalen Beratung wurden beibehalten
          </div>}

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {Object.entries(editData).filter(([k,v])=>v!==null&&v!==undefined).map(([k,v])=>{
              const label=FIELD_LABELS[k]||k;
              const isFromExisting=sales[k]!==undefined&&sales[k]!==null&&sales[k]!==""&&sales[k]!==false;
              const isBoolean=typeof v==="boolean";
              const isArray=Array.isArray(v);

              return <div key={k} style={{padding:"10px 14px",borderRadius:12,background:isFromExisting?"#F0F7FF":"#FAFAFA",border:`1px solid ${isFromExisting?"#BEE3F8":"#EDF2F7"}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#A0AEC0",textTransform:"uppercase",letterSpacing:".04em"}}>{label}</span>
                  {isFromExisting&&<span style={{fontSize:8,fontWeight:700,background:"#667EEA",color:"#fff",padding:"1px 5px",borderRadius:4}}>DIGITAL</span>}
                  {!isFromExisting&&parsed?.[k]&&<span style={{fontSize:8,fontWeight:700,background:"#FF6B35",color:"#fff",padding:"1px 5px",borderRadius:4}}>SCAN</span>}
                </div>
                {isBoolean?
                  <div onClick={()=>updateField(k,!v)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${v?"#38B2AC":"#CBD5E0"}`,background:v?"#38B2AC":"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{v&&<span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>}</div>
                    <span style={{fontSize:12,fontWeight:600,color:v?"#2D3748":"#A0AEC0"}}>{v?"Ja":"Nein"}</span>
                  </div>
                :isArray?
                  <input value={v.join(", ")} onChange={e=>updateField(k,e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} style={ip}/>
                :
                  <input value={v||""} onChange={e=>updateField(k,e.target.value)} style={ip}/>
                }
              </div>
            })}
          </div>

          {/* Option to re-scan */}
          <button onClick={()=>{setParsed(null);setEditData(null);setFile(null);setPreview(null)}} style={{marginTop:14,padding:"8px 14px",borderRadius:8,border:"1px solid #E2E8F0",background:"var(--c-bg)",fontSize:11,fontWeight:600,color:"#718096",cursor:"pointer",width:"100%"}}>
            📷 Anderen Scan hochladen
          </button>
        </div>}
      </div>

      {/* Footer */}
      <div style={{padding:"14px 28px",borderTop:"1px solid #F0F0F0",display:"flex",gap:10}}>
        <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:12,border:"2px solid #E2E8F0",background:"var(--c-bg)",fontSize:13,fontWeight:700,color:"#718096",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Abbrechen</button>
        {editData&&<button onClick={saveAll} style={{flex:2,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#FF6B35,#E55D2B)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",boxShadow:"0 4px 15px rgba(255,107,53,.3)"}}>✅ Werte übernehmen</button>}
      </div>
    </div>
  </div>
}

function DetailModal({deal,onClose,onAct,onHeat,onToggleTodo,onAddTodo,onUpdateDeal,onChangeStage,SELLERS}){
  const[tab,setTab]=useState("overview");
  const[at,setAt]=useState("call");const[tx,setTx]=useState("");
  const[todoTx,setTodoTx]=useState("");const[todoDays,setTodoDays]=useState(3);
  const[ef,setEf]=useState(null);const[ev,setEv]=useState("");
  const[showForm,setShowForm]=useState(null); // null | "interactive" | "print"
  const st=STAGES.find(s=>s.id===deal.stage);
  const sales=deal.sales||{};const seller=SELLERS.find(s=>s.id===deal.seller);
  const openT=deal.todos.filter(t=>!t.done).length;

  const sav=(f,v)=>{onUpdateDeal(deal.id,f,v);setEf(null)};
  const uS=(k,v)=>onUpdateDeal(deal.id,"sales",{...sales,[k]:v});
  const goAct=()=>{if(!tx.trim())return;onAct(deal.id,{type:at,text:tx.trim(),time:Date.now()});setTx("")};
  const goTodo=()=>{if(!todoTx.trim())return;onAddTodo(deal.id,{text:todoTx.trim(),due:Date.now()+todoDays*864e5,done:false,id:"t"+Date.now()});setTodoTx("")};

  const Edt=({f,v,ph,tp,sx})=>{
    if(ef===f)return <input value={ev} onChange={e=>setEv(e.target.value)} type={tp||"text"} autoFocus
      onKeyDown={e=>{if(e.key==="Enter")sav(f,tp==="number"?+ev:ev);if(e.key==="Escape")setEf(null)}}
      onBlur={()=>sav(f,tp==="number"?+ev:ev)}
      style={{padding:"4px 8px",borderRadius:6,border:"1.5px solid #667EEA",fontSize:"inherit",fontFamily:"inherit",outline:"none",background:"#EBF4FF",width:"100%",boxSizing:"border-box",...sx}}/>;
    return <span onClick={()=>{setEf(f);setEv(v||"")}} style={{cursor:"pointer",borderBottom:"1px dashed #E2E8F0",...sx}}>{v||<span style={{color:"#CBD5E0"}}>{ph}</span>}</span>
  };

  const Lbl=({children})=><div style={{fontSize:10,fontWeight:700,color:"#A0AEC0",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{children}</div>;
  const Chip=({on,color,onClick,children})=><div onClick={onClick} style={{padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",background:on?(color||"#667EEA"):on===false?"#F7FAFC":"#F7FAFC",color:on?"#fff":"#718096",transition:"all .12s"}}>{children}</div>;

  const tabList=[{id:"overview",l:"Übersicht"},{id:"sales",l:"Gespräch"},{id:"log",l:"Log",n:deal.acts.length},{id:"todos",l:"Todos",n:openT}];

  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.3)",backdropFilter:"blur(5px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,animation:"fadeIn .15s"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"var(--c-bg)",borderRadius:18,width:560,maxWidth:"94vw",maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 16px 48px rgba(0,0,0,.1)",animation:"pop .2s cubic-bezier(.34,1.56,.64,1)",overflow:"hidden"}}>

      {/* ── Header ── */}
      <div style={{padding:"20px 24px 14px",background:`linear-gradient(135deg,${st.color}08,${st.color}03)`}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{width:44,height:44,borderRadius:12,background:"var(--c-bg)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>{deal.avatar}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:17,color:"#1a202c"}}><Edt f="name" v={deal.name} ph="Name"/></div>
            <div style={{fontSize:12,color:"#718096",marginTop:1}}><Edt f="note" v={deal.note} ph="Notiz..."/></div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontWeight:800,fontSize:18,color:st.color}}><Edt f="value" v={String(deal.value)} tp="number" sx={{textAlign:"right",fontWeight:800,fontSize:16,width:100}}/>{ef!=="value"&&" €"}</div>
            <select value={deal.stage} onChange={e=>onChangeStage(deal.id,deal.stage,e.target.value)} style={{marginTop:3,padding:"3px 8px",borderRadius:7,border:"none",fontSize:10,fontWeight:700,color:st.color,background:st.bg,cursor:"pointer",outline:"none"}}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap",alignItems:"center",fontSize:11,color:"#718096"}}>
          <span style={{background:"var(--c-bg)",borderRadius:6,padding:"3px 8px",border:"1px solid #F0F0F0"}}>📞 <Edt f="phone" v={deal.phone} ph="Telefon" sx={{fontSize:11}}/></span>
          <span style={{background:"var(--c-bg)",borderRadius:6,padding:"3px 8px",border:"1px solid #F0F0F0"}}>📧 <Edt f="email" v={deal.email} ph="E-Mail" sx={{fontSize:11}}/></span>
          {seller&&<span style={{background:seller.color+"10",color:seller.color,borderRadius:6,padding:"3px 8px",fontWeight:700,fontSize:10}}>{seller.short} {seller.name.split(" ")[0]}</span>}
          <span style={{marginLeft:"auto",fontSize:10,color:"#CBD5E0"}}>{tAgo(deal.created)}</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{display:"flex",borderBottom:"1px solid #F0F0F0",padding:"0 24px"}}>
        {tabList.map(t=><div key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 14px",fontSize:12,fontWeight:tab===t.id?700:600,cursor:"pointer",color:tab===t.id?"#667EEA":"#A0AEC0",borderBottom:tab===t.id?"2px solid #667EEA":"2px solid transparent",transition:"all .12s"}}>{t.l}{t.n>0?<span style={{marginLeft:4,fontSize:9,background:tab===t.id?"#667EEA":"#EDF2F7",color:tab===t.id?"#fff":"#A0AEC0",padding:"1px 5px",borderRadius:8,fontWeight:700}}>{t.n}</span>:""}</div>)}
      </div>

      {/* ── Content ── */}
      <div style={{padding:24,overflowY:"auto",flex:1}}>

        {tab==="overview"&&<div style={{display:"grid",gap:20}}>

          {/* Beratungs-Summary – das Wichtigste zuerst */}
          <div style={{background:"#F8F9FB",borderRadius:10,padding:14}}>
            <Lbl>Beratung auf einen Blick</Lbl>
            <div style={{display:"grid",gap:8}}>
              {[{k:"nutzung",l:"🚲 Nutzung",ph:"Was macht der Kunde mit dem Rad?"},{k:"ziel",l:"🎯 Ziel",ph:"Welches Ziel?"},{k:"budget",l:"💶 Budget",ph:"Was kann investiert werden?"},{k:"next",l:"👣 Nächster Schritt",ph:"Was wurde vereinbart?"},{k:"einwaende",l:"⚠️ Einwände",ph:"Bedenken?"}].map(f=>{
                const val=sales[f.k];
                return <div key={f.k} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#718096",minWidth:110,paddingTop:2}}>{f.l}</span>
                  <div style={{flex:1,fontSize:12,color:val?"#2D3748":"#CBD5E0",fontWeight:val?600:400,lineHeight:1.4,cursor:"pointer",borderBottom:"1px dashed #EDF2F7",padding:"2px 0"}} onClick={()=>setTab("sales")}>{val||f.ph}</div>
                </div>
              })}
              {sales.gekauftesRad&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#718096",minWidth:110,paddingTop:2}}>🚲 Rad</span>
                <span style={{fontSize:12,fontWeight:600,color:"#2D3748"}}>{sales.gekauftesRad}</span>
              </div>}
              {(sales.distanz||sales.haeufigkeit||sales.zeitrahmen)&&<div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:2}}>
                {sales.distanz&&<span style={{fontSize:10,color:"#718096"}}>📏 {sales.distanz}</span>}
                {sales.haeufigkeit&&<span style={{fontSize:10,color:"#718096"}}>🔄 {sales.haeufigkeit}</span>}
                {sales.zeitrahmen&&<span style={{fontSize:10,color:"#718096"}}>⏰ {sales.zeitrahmen}</span>}
              </div>}
            </div>
            <div style={{marginTop:8,textAlign:"right"}}><span onClick={()=>setTab("sales")} style={{fontSize:10,color:"#667EEA",fontWeight:600,cursor:"pointer"}}>Alle Felder bearbeiten →</span></div>
          </div>

          {/* Bezahlart */}
          <div><Lbl>Bezahlart</Lbl>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {PAY_METHODS.map(p=><Chip key={p.id} on={sales.payment===p.id} onClick={()=>uS("payment",sales.payment===p.id?"":p.id)}>{p.icon} {p.id}</Chip>)}
            </div>
            {sales.payment==="Leasing"&&<div style={{marginTop:10}}>
              <div style={{fontSize:10,fontWeight:600,color:"#A0AEC0",marginBottom:5}}>Anbieter</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {LEASING_PROVIDERS.map(lp=><Chip key={lp} on={sales.leasingProvider===lp} color="#D69E2E" onClick={()=>uS("leasingProvider",lp)}>{lp}</Chip>)}
              </div>
              {sales.leasingProvider&&<input value={sales.leasingRef||""} onChange={e=>uS("leasingRef",e.target.value)} placeholder="Vorgangsnr..." style={{marginTop:8,width:"100%",padding:"7px 10px",borderRadius:8,border:"1.5px solid #EDF2F7",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#D69E2E"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/>}
            </div>}
          </div>

          {/* Interesse + Verkäufer in einer Zeile */}
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            <div style={{flex:"1 1 120px"}}><Lbl>Interesse</Lbl>
              <div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(h=><div key={h} onClick={()=>onHeat(deal.id,h)} style={{width:34,height:26,borderRadius:7,background:h<=deal.heat?(deal.heat>=4?"#FF6B3520":deal.heat>=2?"#F7C94820":"#EDF2F7"):"#FAFAFA",border:`1.5px solid ${h<=deal.heat?"transparent":"#F0F0F0"}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .12s",fontSize:12}}>{h<=deal.heat?"🔥":""}</div>)}</div>
            </div>
            <div style={{flex:"1 1 200px"}}><Lbl>Verkäufer</Lbl>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{SELLERS.filter(s=>s.loc===deal.loc).map(s=><Chip key={s.id} on={deal.seller===s.id} color={s.color} onClick={()=>onUpdateDeal(deal.id,"seller",s.id)}>{s.name}</Chip>)}</div>
            </div>
          </div>

          {/* Quelle */}
          <div><Lbl>Quelle</Lbl>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{SOURCES.map(src=><Chip key={src} on={deal.source===src} onClick={()=>onUpdateDeal(deal.id,"source",src)}>{src}</Chip>)}</div>
          </div>

          {/* Social Quick */}
          {deal.email&&<div><Lbl>Social finden</Lbl>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {[{l:"LinkedIn",u:`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(deal.name)}`,c:"#0077B5"},{l:"Instagram",u:`https://www.instagram.com/${(deal.email.split("@")[0]||"").replace(/[._]/g,"")}`,c:"#E1306C"},{l:"Facebook",u:`https://www.facebook.com/search/top?q=${encodeURIComponent(deal.name)}`,c:"#1877F2"},{l:"XING",u:`https://www.xing.com/search/members?keywords=${encodeURIComponent(deal.name)}`,c:"#00605E"},{l:"Google",u:`https://www.google.com/search?q="${encodeURIComponent(deal.name)}"`,c:"#4285F4"}].map(s=><a key={s.l} href={s.u} target="_blank" rel="noopener" style={{fontSize:11,background:s.c+"10",color:s.c,padding:"5px 10px",borderRadius:7,textDecoration:"none",fontWeight:600}}>{s.l}</a>)}
            </div>
          </div>}
        </div>}

        {tab==="sales"&&<div style={{display:"grid",gap:20}}>
          {/* Bedarfsanalyse */}
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#2D3748",marginBottom:10}}>🎯 Bedarfsanalyse</div>
            {[
              {k:"nutzung",l:"Nutzung",p:"Was machst du mit dem Fahrrad?"},
              {k:"ziel",l:"Ziel",p:"Welches Ziel verfolgst du mit dem Radfahren?"},
              {k:"distanz",l:"Distanzen",p:"Welche Distanzen willst du zurücklegen?"},
              {k:"haeufigkeit",l:"Häufigkeit",p:"Wie oft / wie viel Zeit pro Woche?"},
              {k:"erfahrung",l:"E-Bike Erfahrung",p:"Welche Erfahrungen mit E-Bike?"},
              {k:"lagerung",l:"Lagerung & Transport",p:"Wo wird das Rad gelagert / transportiert?"},
              {k:"aufladen",l:"Aufladen",p:"Wo kannst du das Rad aufladen?"},
              {k:"zeitrahmen",l:"Wann einsatzfähig",p:"Wann muss das Rad einsatzfähig sein?"},
              {k:"wichtig",l:"Wichtig am Rad",p:"Was ist dir an deinem Rad wichtig?"},
              {k:"budget",l:"Budget",p:"Was kannst du investieren? (Wie kam das Budget zustande?)"},
              {k:"akku",l:"Akku-Ladezeit",p:"Ist schnelle Akku-Ladezeit wichtig?"},
              {k:"dreiPunkte",l:"3 Kaufkriterien",p:"Welche 3 Punkte muss das Rad haben, damit du es heute kaufst?"},
            ].map(f=><div key={f.k} style={{marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:"#A0AEC0",textTransform:"uppercase",letterSpacing:".04em",marginBottom:3}}>{f.l}</div>
              <input value={sales[f.k]||""} onChange={e=>uS(f.k,e.target.value)} placeholder={f.p} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1.5px solid #EDF2F7",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#667EEA"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/>
            </div>)}
          </div>

          {/* Einwände & Nächster Schritt */}
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#2D3748",marginBottom:10}}>💬 Gespräch</div>
            {[
              {k:"einwaende",l:"Einwände / Bedenken",p:"Welche Bedenken hat der Kunde?",big:1},
              {k:"next",l:"Nächster Schritt",p:"Was wurde vereinbart?"},
              {k:"notizen",l:"Sonstige Notizen",p:"Weitere Infos zum Gespräch...",big:1},
            ].map(f=><div key={f.k} style={{marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:"#A0AEC0",textTransform:"uppercase",letterSpacing:".04em",marginBottom:3}}>{f.l}</div>
              {f.big?<textarea value={sales[f.k]||""} onChange={e=>uS(f.k,e.target.value)} placeholder={f.p} rows={2} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1.5px solid #EDF2F7",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box",resize:"vertical"}} onFocus={e=>e.target.style.borderColor="#667EEA"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/>
              :<input value={sales[f.k]||""} onChange={e=>uS(f.k,e.target.value)} placeholder={f.p} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1.5px solid #EDF2F7",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#667EEA"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/>}
            </div>)}
          </div>

          {/* Ergodaten */}
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#2D3748",marginBottom:10}}>📐 Ergodaten</div>
            <div style={{display:"flex",gap:5,marginBottom:10}}>
              {["Bodyscanner","Smartfit"].map(m=><Chip key={m} on={sales.ergoMethod===m} onClick={()=>uS("ergoMethod",sales.ergoMethod===m?"":m)}>{m}</Chip>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{k:"sattelhoehe",l:"Sattelhöhe"},{k:"sattelversatz",l:"Sattelversatz"},{k:"abstandLenker",l:"Abstand Sattel-Lenker"},{k:"lenkerhoehe",l:"Lenkerhöhe"},{k:"sitzknochen",l:"Sitzknochen"},{k:"griffgroesse",l:"Griffgrösse"}].map(f=><div key={f.k}>
                <div style={{fontSize:9,fontWeight:600,color:"#A0AEC0",marginBottom:2}}>{f.l}</div>
                <input value={sales[f.k]||""} onChange={e=>uS(f.k,e.target.value)} placeholder="—" style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"1.5px solid #EDF2F7",fontSize:11,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#667EEA"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/>
              </div>)}
            </div>
          </div>

          {/* Gekauftes Rad */}
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#2D3748",marginBottom:10}}>🚲 Rad & Auftrag</div>
            <div style={{display:"grid",gap:8}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:"#A0AEC0",textTransform:"uppercase",letterSpacing:".04em",marginBottom:3}}>Gekauftes Rad</div>
                <input value={sales.gekauftesRad||""} onChange={e=>uS("gekauftesRad",e.target.value)} placeholder="Modell / Marke / Farbe / Grösse" style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"1.5px solid #EDF2F7",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#667EEA"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <div style={{fontSize:9,fontWeight:600,color:"#A0AEC0",marginBottom:2}}>Nr. Teilekiste</div>
                  <input value={sales.nrTeilekiste||""} onChange={e=>uS("nrTeilekiste",e.target.value)} placeholder="—" style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"1.5px solid #EDF2F7",fontSize:11,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#667EEA"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/>
                </div>
                <div>
                  <div style={{fontSize:9,fontWeight:600,color:"#A0AEC0",marginBottom:2}}>Nr. Auftrag</div>
                  <input value={sales.nrAuftrag||""} onChange={e=>uS("nrAuftrag",e.target.value)} placeholder="—" style={{width:"100%",padding:"5px 8px",borderRadius:6,border:"1.5px solid #EDF2F7",fontSize:11,fontFamily:"monospace",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#667EEA"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:"#A0AEC0",textTransform:"uppercase",letterSpacing:".04em",marginBottom:5}}>Nach dem Kauf</div>
                <div style={{display:"grid",gap:4}}>
                  {[{k:"todoZubehoer",l:"Zubehörteile bestellt"},{k:"todoRadBestellt",l:"Fahrrad bestellt / ist lagernd"},{k:"todoKiste",l:"Kiste gepackt"},{k:"todoLeasing",l:"Leasing-Anfrage gestellt"},{k:"todoFinanzierung",l:"Finanzierung: Unterlagen angefordert & kopiert"},{k:"todoWertgarantie",l:"Wertgarantie"}].map(c=><div key={c.k} onClick={()=>uS(c.k,!sales[c.k])} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:7,background:sales[c.k]?"#E6FFFA":"#FAFAFA",cursor:"pointer",transition:"all .12s"}}>
                    <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${sales[c.k]?"#38B2AC":"#CBD5E0"}`,background:sales[c.k]?"#38B2AC":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sales[c.k]&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}</div>
                    <span style={{fontSize:11,fontWeight:600,color:sales[c.k]?"#2D3748":"#718096"}}>{c.l}</span>
                  </div>)}
                </div>
              </div>
            </div>
          </div>
        </div>}

        {tab==="log"&&<div>
          <div style={{display:"flex",gap:5,marginBottom:8}}>{ACT_TYPES.map(a=><div key={a.id} onClick={()=>setAt(a.id)} style={{padding:"5px 10px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",background:at===a.id?a.color+"15":"#FAFAFA",color:at===a.id?a.color:"#A0AEC0",transition:"all .12s"}}>{a.label}</div>)}</div>
          <div style={{display:"flex",gap:6,marginBottom:16}}><input value={tx} onChange={e=>setTx(e.target.value)} placeholder="Was wurde besprochen?" onKeyDown={e=>e.key==="Enter"&&goAct()} style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1.5px solid #EDF2F7",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#667EEA"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/><button onClick={goAct} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#667EEA",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",opacity:tx.trim()?1:.35}}>+</button></div>
          {!deal.acts.length&&<div style={{color:"#CBD5E0",fontSize:12,textAlign:"center",padding:20}}>Noch keine Einträge</div>}
          {deal.acts.map((a,i)=>{const t=ACT_TYPES.find(x=>x.id===a.type);return <div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<deal.acts.length-1?"1px solid #F7FAFC":"none"}}>
            <div style={{width:26,height:26,borderRadius:7,background:(t?.color||"#aaa")+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>{t?.label.split(" ")[0]}</div>
            <div><div style={{fontSize:12,color:"#2D3748",fontWeight:600}}>{a.text}</div><div style={{fontSize:10,color:"#A0AEC0",marginTop:1}}>{tAgo(a.time)}</div></div>
          </div>})}
        </div>}

        {tab==="todos"&&<div>
          <div style={{display:"flex",gap:5,marginBottom:14}}><input value={todoTx} onChange={e=>setTodoTx(e.target.value)} placeholder="Neues Todo..." onKeyDown={e=>e.key==="Enter"&&goTodo()} style={{flex:1,padding:"8px 10px",borderRadius:8,border:"1.5px solid #EDF2F7",fontSize:12,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor="#667EEA"} onBlur={e=>e.target.style.borderColor="#EDF2F7"}/><select value={todoDays} onChange={e=>setTodoDays(+e.target.value)} style={{padding:"8px 8px",borderRadius:8,border:"1.5px solid #EDF2F7",fontSize:11,background:"var(--c-bg)",cursor:"pointer",outline:"none"}}><option value={0}>Heute</option><option value={1}>Morgen</option><option value={3}>3d</option><option value={7}>1W</option><option value={14}>2W</option><option value={30}>30d</option></select><button onClick={goTodo} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"#667EEA",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",opacity:todoTx.trim()?1:.35}}>+</button></div>
          {!deal.todos.length&&<div style={{color:"#CBD5E0",fontSize:12,textAlign:"center",padding:20}}>Alles erledigt ✨</div>}
          {[...deal.todos].sort((a,b)=>a.done-b.done||a.due-b.due).map(t=>{const ov=!t.done&&t.due<NOW;return <div key={t.id} onClick={()=>onToggleTodo(deal.id,t.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",marginBottom:3,borderRadius:8,background:t.done?"#FAFAFA":ov?"#FFF5F5":"#fff",border:`1px solid ${ov?"#FEB2B2":"#F0F0F0"}`,cursor:"pointer",transition:"all .12s"}}>
            <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${t.done?"#38B2AC":ov?"#E53E3E":"#CBD5E0"}`,background:t.done?"#38B2AC":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{t.done&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}</div>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:t.done?"#A0AEC0":"#2D3748",textDecoration:t.done?"line-through":"none"}}>{t.text}</div><div style={{fontSize:10,color:ov?"#E53E3E":"#A0AEC0"}}>{ov?"⚠️ Überfällig · ":""}Fällig {tAgo(t.due)}</div></div>
          </div>})}
        </div>}

      </div>

      {/* ── Footer ── */}
      <div style={{padding:"10px 24px",borderTop:"1px solid #F0F0F0",display:"flex",gap:6,justifyContent:"space-between",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setShowForm("interactive")} style={{padding:"9px 14px",borderRadius:8,border:"1.5px solid #667EEA",background:"var(--c-bg)",fontSize:11,fontWeight:700,color:"#667EEA",cursor:"pointer"}}>📋 Beratung digital</button>
          <button onClick={()=>setShowForm("print")} style={{padding:"9px 14px",borderRadius:8,border:"1.5px solid #A0AEC0",background:"var(--c-bg)",fontSize:11,fontWeight:700,color:"#718096",cursor:"pointer"}}>🖨️ Druckformular</button>
          <button onClick={()=>setShowForm("scan")} style={{padding:"9px 14px",borderRadius:8,border:"1.5px solid #FF6B35",background:"var(--c-bg)",fontSize:11,fontWeight:700,color:"#FF6B35",cursor:"pointer"}}>📷 Scan hochladen</button>
        </div>
        <button onClick={onClose} style={{padding:"9px 24px",borderRadius:8,border:"none",background:"#F7FAFC",fontSize:12,fontWeight:700,color:"#718096",cursor:"pointer"}}>Schliessen</button>
      </div>

      {showForm&&showForm!=="scan"&&<SalesForm deal={deal} sales={sales} seller={seller} onClose={()=>setShowForm(null)} onUpdateDeal={onUpdateDeal} mode={showForm}/>}
      {showForm==="scan"&&<ScanUploadModal deal={deal} sales={sales} onClose={()=>setShowForm(null)} onUpdateDeal={onUpdateDeal}/>}
    </div>
  </div>
}
/* ── Automations Settings Modal ──────────────────── */
function AutoModal({rules,onUpdate,onClose,LOCATIONS}){
  const[rs,setRs]=useState(rules);
  const[nFrom,setNFrom]=useState("*");const[nTo,setNTo]=useState("angebot");const[nAct,setNAct]=useState("todo");const[nTx,setNTx]=useState("");const[nDays,setNDays]=useState(3);const[nActType,setNActType]=useState("note");const[nScope,setNScope]=useState("hq");
  const[filterScope,setFilterScope]=useState("all");
  const addRule=()=>{if(!nTx.trim())return;setRs(p=>[...p,{id:"r"+Date.now(),from:nFrom,to:nTo,action:nAct,text:nTx.trim(),days:nDays,actType:nActType,enabled:true,scope:nScope}]);setNTx("")};
  const toggle=(id)=>setRs(p=>p.map(r=>r.id===id?{...r,enabled:!r.enabled}:r));
  const remove=(id)=>setRs(p=>p.filter(r=>r.id!==id));
  const save=()=>{onUpdate(rs);onClose()};
  const allStages=[{id:"*",label:"Beliebig"},...STAGES];
  const scopes=[{id:"hq",label:"🏢 HQ (Alle)"},...LOCATIONS.filter(l=>!l.isHQ)];
  const filtered=filterScope==="all"?rs:rs.filter(r=>r.scope===filterScope);
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,animation:"fadeIn .2s"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"var(--c-bg)",borderRadius:24,padding:28,width:620,maxWidth:"94vw",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,.15)",animation:"pop .3s cubic-bezier(.34,1.56,.64,1)"}}>
      <h2 style={{margin:"0 0 6px",fontFamily:"'Outfit',sans-serif",fontWeight:800,fontSize:22}}>⚡ Automationen</h2>
      <p style={{margin:"0 0 16px",fontSize:13,color:"#A0AEC0",fontFamily:"'Outfit',sans-serif"}}>🏢 HQ-Regeln gelten überall. 📍 Standort-Regeln nur lokal.</p>

      {/* Scope Filter */}
      <div style={{display:"flex",gap:4,marginBottom:16,background:"#F7FAFC",borderRadius:12,padding:4}}>
        {[{id:"all",label:"Alle"},...scopes].map(s=><div key={s.id} onClick={()=>setFilterScope(s.id)} style={{flex:1,padding:"7px 10px",borderRadius:10,textAlign:"center",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",background:filterScope===s.id?"#fff":"transparent",color:filterScope===s.id?"#2D3748":"#A0AEC0",boxShadow:filterScope===s.id?"0 2px 8px rgba(0,0,0,.06)":"none",transition:"all .2s"}}>{s.label}</div>)}
      </div>

      {/* Existing rules */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {filtered.map(r=>{const fromSt=allStages.find(s=>s.id===r.from);const toSt=STAGES.find(s=>s.id===r.to);const sc=scopes.find(s=>s.id===r.scope);const isHQ=r.scope==="hq";return <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:14,background:r.enabled?"#fff":"#F7FAFC",border:`1.5px solid ${r.enabled?(isHQ?"#667EEA30":"#D69E2E30"):"#EDF2F7"}`,opacity:r.enabled?1:.55,transition:"all .2s"}}>
          <div onClick={()=>toggle(r.id)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${r.enabled?"#38B2AC":"#CBD5E0"}`,background:r.enabled?"#38B2AC":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>{r.enabled&&<span style={{color:"#fff",fontSize:11,fontWeight:800}}>✓</span>}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",fontSize:12,fontWeight:700,fontFamily:"'Outfit',sans-serif",color:"#2D3748"}}>
              <span style={{background:isHQ?"#EBF4FF":"#FFFFF0",color:isHQ?"#667EEA":"#B7791F",padding:"2px 6px",borderRadius:6,fontSize:10,fontWeight:800}}>{isHQ?"🏢 HQ":"📍 "+(sc?.label?.replace("📍 ","")||r.scope)}</span>
              <span style={{background:"#EBF4FF",color:"#667EEA",padding:"2px 6px",borderRadius:6,fontSize:11}}>{fromSt?.label||"?"}</span>
              <span style={{color:"#A0AEC0"}}>→</span>
              <span style={{background:toSt?.bg||"#eee",color:toSt?.color||"#666",padding:"2px 6px",borderRadius:6,fontSize:11}}>{toSt?.label||"?"}</span>
              <span style={{color:"#A0AEC0"}}>dann</span>
              <span style={{background:r.action==="todo"?"#FEFCBF":"#E6FFFA",color:r.action==="todo"?"#B7791F":"#38B2AC",padding:"2px 6px",borderRadius:6,fontSize:11}}>{r.action==="todo"?"☑️ Todo":"📋 Aktivität"}</span>
            </div>
            <div style={{fontSize:11,color:"#718096",fontFamily:"monospace",marginTop:3}}>"{r.text}"{r.action==="todo"&&r.days!==undefined?` (in ${r.days}d fällig)`:""}</div>
          </div>
          <div onClick={()=>remove(r.id)} style={{width:24,height:24,borderRadius:6,background:"#FFF5F5",color:"#E53E3E",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,fontWeight:800,flexShrink:0}}>×</div>
        </div>})}
        {!filtered.length&&<div style={{textAlign:"center",color:"#CBD5E0",fontSize:13,padding:16}}>Keine Regeln für diesen Filter</div>}
      </div>

      {/* New Rule */}
      <div style={{background:"#F7FAFC",borderRadius:16,padding:16,marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",marginBottom:10}}>➕ Neue Regel</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:"#718096"}}>Geltung</span>
          <select value={nScope} onChange={e=>setNScope(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"2px solid #E2E8F0",fontSize:12,fontFamily:"'Outfit',sans-serif",background:"var(--c-bg)",cursor:"pointer"}}>{scopes.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:"#718096"}}>Wenn</span>
          <select value={nFrom} onChange={e=>setNFrom(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"2px solid #E2E8F0",fontSize:12,fontFamily:"'Outfit',sans-serif",background:"var(--c-bg)",cursor:"pointer"}}>{allStages.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
          <span style={{fontSize:12,fontWeight:700,color:"#718096"}}>→</span>
          <select value={nTo} onChange={e=>setNTo(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"2px solid #E2E8F0",fontSize:12,fontFamily:"'Outfit',sans-serif",background:"var(--c-bg)",cursor:"pointer"}}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:"#718096"}}>Dann</span>
          <select value={nAct} onChange={e=>setNAct(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"2px solid #E2E8F0",fontSize:12,fontFamily:"'Outfit',sans-serif",background:"var(--c-bg)",cursor:"pointer"}}><option value="todo">☑️ Todo erstellen</option><option value="activity">📋 Aktivität loggen</option></select>
          {nAct==="activity"&&<select value={nActType} onChange={e=>setNActType(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"2px solid #E2E8F0",fontSize:12,fontFamily:"'Outfit',sans-serif",background:"var(--c-bg)",cursor:"pointer"}}>{ACT_TYPES.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select>}
          {nAct==="todo"&&<select value={nDays} onChange={e=>setNDays(+e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"2px solid #E2E8F0",fontSize:12,fontFamily:"'Outfit',sans-serif",background:"var(--c-bg)",cursor:"pointer"}}><option value={0}>Heute</option><option value={1}>1 Tag</option><option value={3}>3 Tage</option><option value={7}>1 Woche</option><option value={14}>2 Wochen</option><option value={30}>30 Tage</option></select>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={nTx} onChange={e=>setNTx(e.target.value)} placeholder="Text der Aktion..." onKeyDown={e=>e.key==="Enter"&&addRule()} style={{flex:1,padding:"10px 14px",borderRadius:12,border:"2px solid #E2E8F0",fontSize:13,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box"}}/>
          <button onClick={addRule} style={{padding:"10px 18px",borderRadius:12,border:"none",background:"#667EEA",color:"#fff",fontWeight:700,cursor:"pointer",opacity:nTx.trim()?1:.5}}>+</button>
        </div>
      </div>

      <div style={{display:"flex",gap:12}}>
        <button onClick={onClose} style={{flex:1,padding:"11px 18px",borderRadius:12,border:"2px solid #E2E8F0",background:"var(--c-bg)",fontSize:14,fontWeight:700,color:"#718096",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Abbrechen</button>
        <button onClick={save} style={{flex:2,padding:"11px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#667EEA,#764BA2)",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"'Outfit',sans-serif",boxShadow:"0 4px 15px rgba(102,126,234,.4)"}}>💾 Speichern</button>
      </div>
    </div>
  </div>
}

/* ── Scoreboard ──────────────────────────────────── */
function Scores({deals,streak}){
  const sold=deals.filter(d=>d.stage==="verkauft"),tSold=sold.reduce((s,d)=>s+d.value,0);
  const pipe=deals.filter(d=>!["verkauft","lost","gold"].includes(d.stage)).reduce((s,d)=>s+d.value,0);
  const closed=deals.filter(d=>["verkauft","lost"].includes(d.stage));
  const wr=closed.length?Math.round(sold.length/closed.length*100):0;
  const gp=Math.min(100,Math.round(tSold/GOAL*100));
  const items=[{l:"Pipeline",v:fmt(pipe),c:"#667EEA"},{l:"Verkauft",v:fmt(tSold),c:"#38B2AC"},{l:"Win-Rate",v:wr+"%",c:"#F7C948"},{l:"Streak",v:streak+"x",c:"#FF6B35"}];
  return <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"stretch"}}>
    {items.map(s=><div key={s.l} style={{flex:"1 1 100px",background:"var(--c-bg)",borderRadius:12,padding:"10px 14px",border:"1px solid #F0F0F0"}}>
      <div style={{fontSize:10,color:"#A0AEC0",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>{s.l}</div>
      <div style={{fontSize:17,fontWeight:800,color:s.c,marginTop:2}}>{s.v}</div>
    </div>)}
    <div style={{flex:"1 1 180px",background:"var(--c-bg)",borderRadius:12,padding:"10px 14px",border:"1px solid #F0F0F0"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:10,color:"#A0AEC0",fontWeight:600,textTransform:"uppercase"}}>Monatsziel</span><span style={{fontSize:12,fontWeight:800,color:gp>=100?"#38B2AC":"#667EEA"}}>{gp}%</span></div>
      <div style={{height:6,borderRadius:3,background:"#EDF2F7",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:gp+"%",background:gp>=100?"#38B2AC":"#667EEA",transition:"width .6s"}}/></div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}><span style={{fontSize:9,color:"#CBD5E0"}}>{fmt(tSold)}</span><span style={{fontSize:9,color:"#CBD5E0"}}>{fmt(GOAL)}</span></div>
    </div>
  </div>
}

/* ── Funnel + Badges ─────────────────────────────── */
function Funnel({deals}){
  const c={};PIPELINE.forEach(s=>c[s]=deals.filter(d=>d.stage===s).length);
  const data=PIPELINE.map((sid,i)=>{const st=STAGES.find(s=>s.id===sid);const cnt=c[sid]+PIPELINE.slice(i+1).reduce((s,l)=>s+c[l],0);return{...st,count:cnt,cur:c[sid]}});
  const mx=Math.max(...data.map(f=>f.count),1);
  return <div style={{background:"var(--c-bg)",borderRadius:18,padding:20,boxShadow:"0 2px 10px rgba(0,0,0,.04)",border:"1px solid #F0F0F0"}}>
    <div style={{fontSize:14,fontWeight:800,color:"#2D3748",fontFamily:"'Outfit',sans-serif",marginBottom:14}}>📊 Conversion Funnel</div>
    {data.map((item,i)=>{const w=Math.max(15,item.count/mx*100);const prev=i>0?data[i-1].count:null;const cr=prev?Math.round(item.count/prev*100):null;
      return <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
        <div style={{width:90,fontSize:11,fontWeight:700,color:"#718096",fontFamily:"'Outfit',sans-serif",textAlign:"right"}}>{item.label}</div>
        <div style={{flex:1}}><div style={{height:28,borderRadius:8,width:w+"%",background:`linear-gradient(90deg,${item.color},${item.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",transition:"width .6s",minWidth:40}}><span style={{fontSize:12,fontWeight:800,color:"#fff"}}>{item.cur}</span></div></div>
        {cr!==null&&<div style={{width:50,fontSize:11,fontWeight:700,color:cr>=50?"#38B2AC":cr>=25?"#F7C948":"#E53E3E",fontFamily:"monospace"}}>{cr}%</div>}
      </div>
    })}
  </div>
}
function Badges({deals,streak,unlocked}){
  const s={sold:deals.filter(d=>d.stage==="verkauft").length,rev:deals.filter(d=>d.stage==="verkauft").reduce((a,d)=>a+d.value,0),streak,total:deals.length,hot:deals.filter(d=>d.heat>=5).length,gold:deals.filter(d=>d.stage==="gold").length,acts:deals.reduce((a,d)=>a+d.acts.length,0)};
  return <div style={{background:"var(--c-bg)",borderRadius:18,padding:20,boxShadow:"0 2px 10px rgba(0,0,0,.04)",border:"1px solid #F0F0F0"}}>
    <div style={{fontSize:14,fontWeight:800,color:"#2D3748",fontFamily:"'Outfit',sans-serif",marginBottom:14}}>🏅 Achievements</div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {ACHIEVEMENTS.map(a=>{const ok=a.check(s)||unlocked.includes(a.id);return <div key={a.id} title={a.desc} style={{padding:"8px 12px",borderRadius:12,display:"flex",alignItems:"center",gap:6,background:ok?"linear-gradient(135deg,#FFFFF0,#FEFCBF)":"#F7FAFC",border:`1.5px solid ${ok?"#D69E2E":"#E2E8F0"}`,opacity:ok?1:.45,cursor:"default",transform:ok?"scale(1)":"scale(.95)",transition:"all .3s"}}>
        <span style={{fontSize:18}}>{ok?a.icon:"🔒"}</span>
        <div><div style={{fontSize:11,fontWeight:700,color:ok?"#B7791F":"#A0AEC0",fontFamily:"'Outfit',sans-serif"}}>{a.label}</div><div style={{fontSize:9,color:ok?"#D69E2E":"#CBD5E0",fontFamily:"monospace"}}>{a.desc}</div></div>
      </div>})}
    </div>
  </div>
}

/* ── Drop Zone (Clean) ────────────────────────────── */
function DropZone({sid,label,sub,bc,tc,cc,deals,onDrop,onDrag}){
  const[dg,setDg]=useState(false);
  if(!deals.length&&!dg)return null;
  return <div style={{padding:"0 0 8px"}}><div onDragOver={e=>{e.preventDefault();setDg(true)}} onDragLeave={()=>setDg(false)} onDrop={e=>{e.preventDefault();setDg(false);onDrop(+e.dataTransfer.getData("id"),sid)}} style={{background:"var(--c-bg)",borderRadius:12,padding:12,border:`1.5px dashed ${dg?bc:bc+"50"}`,transition:"all .2s"}}>
    <div style={{fontSize:11,fontWeight:700,color:tc,marginBottom:6}}>{label} <span style={{fontWeight:500,color:"#A0AEC0",fontSize:10}}>– {sub}</span></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{deals.map(d=><div key={d.id} draggable onDragStart={e=>{e.dataTransfer.setData("id",d.id);onDrag(d.id)}} style={{background:"#F8F9FB",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:600,color:cc,cursor:"grab",border:`1px solid ${bc}30`,display:"flex",alignItems:"center",gap:4}}>
      {d.avatar} {d.name} <span style={{color:"#A0AEC0",fontSize:10}}>{fmt(d.value)}</span>
    </div>)}</div>
  </div></div>
}

/* ── MAIN APP ────────────────────────────────────── */
function PipelineApp(){
  const[deals,setDeals]=useState([]);
  const[dragId,setDragId]=useState(null);
  const[showAdd,setShowAdd]=useState(false);
  const[sel,setSel]=useState(null);
  const[parts,setParts]=useState([]);
  const[streak,setStreak]=useState(0);
  const[newId,setNewId]=useState(null);
  const[toast,setToast]=useState(null);
  const[unlocked,setUnlocked]=useState([]);
  const[showIn,setShowIn]=useState(false);
  const[showAuto,setShowAuto]=useState(false);
  const[rules,setRules]=useState(DEFAULT_RULES);
  const[LOCATIONS,setLocations]=useState(FALLBACK_LOCATIONS);
  const[SELLERS,setSellers]=useState(FALLBACK_SELLERS);
  const[dataReady,setDataReady]=useState(false);

  // Determine location from logged-in user profile
  const isHqUser = window.sbProfile && window.sbProfile.is_hq;
  const userStandortId = window.sbProfile?.standort_id || "";
  const[curLoc,setCurLoc]=useState(isHqUser ? "hq" : userStandortId);

  // Supabase data layer
  const { loading, error: dbError, loadDeals, saveDeal, createDeal, saveTodo, toggleTodo: dbToggleTodo, addActivity } = useSupabase(curLoc, SELLERS);

  // Load locations + sellers + deals on mount
  useEffect(() => {
    const init = async () => {
      const sb = window.sb;
      if (!sb) { console.warn("[Pipeline] No Supabase client"); setDataReady(true); return; }

      try {
        // Load standorte
        const { data: standorte } = await sb.from("standorte").select("id, name, slug").order("name");
        if (standorte && standorte.length) {
          setLocations([
            { id: "hq", label: "🏢 HQ (Alle)", isHQ: true },
            ...standorte.map(s => ({ id: s.id, label: "📍 " + s.name, slug: s.slug }))
          ]);
        }

        // Load active users as sellers
        const { data: users } = await sb.from("users").select("id, vorname, nachname, name, standort_id, is_hq").eq("status", "aktiv");
        if (users && users.length) {
          setSellers(users.map((u, i) => {
            const vn = u.vorname || u.name?.split(" ")[0] || "?";
            const nn = u.nachname || u.name?.split(" ").slice(1).join(" ") || "";
            const short = (vn[0] || "") + (nn[0] || "");
            return {
              id: u.id,
              name: (vn + " " + nn).trim(),
              short: short.toUpperCase(),
              color: SELLER_COLORS[i % SELLER_COLORS.length],
              loc: u.standort_id || "",
              isHQ: u.is_hq || false
            };
          }));
        }

        // Load deals
        const loaded = await loadDeals();
        setDeals(loaded);

        // Load automations from DB
        const { data: autoRules } = await sb.from("lead_automations").select("*").eq("enabled", true);
        if (autoRules && autoRules.length) {
          setRules(autoRules.map(r => ({
            id: r.id,
            from: r.from_stage === "*" ? "*" : (DB_TO_STAGE[r.from_stage] || r.from_stage || "*"),
            to: DB_TO_STAGE[r.to_stage] || r.to_stage || "angebot",
            action: r.action,
            text: r.action_text,
            days: r.days_offset || 0,
            actType: r.action_type || "note",
            enabled: true,
            scope: r.is_global ? "hq" : (r.standort_id || "hq")
          })));
        }
      } catch (err) {
        console.error("[Pipeline] Init error:", err);
      }
      setDataReady(true);
    };
    init();
  }, []);

  const nid=useRef(100);

  const filteredDeals = curLoc === "hq" ? deals : deals.filter(d => d.loc === curLoc);

  // Loading state
  if (!dataReady) return <div style={{fontFamily:"'Outfit',sans-serif",textAlign:"center",padding:60}}>
    <div style={{fontSize:32,marginBottom:12}}>🚴</div>
    <div style={{fontSize:14,fontWeight:700,color:"#667EEA"}}>Pipeline wird geladen...</div>
  </div>;

  const msg=useCallback(m=>{setToast(m);setTimeout(()=>setToast(null),2500)},[]);
  const pop=useCallback((x,y)=>{const np=Array.from({length:14},(_,i)=>({id:Date.now()+i,x:x+(Math.random()-.5)*120,y:y+(Math.random()-.5)*80,emoji:CELEB[Math.floor(Math.random()*CELEB.length)],delay:i*.04}));setParts(p=>[...p,...np]);setTimeout(()=>setParts(p=>p.filter(pp=>!np.find(n=>n.id===pp.id))),2000)},[]);

  useEffect(()=>{
    const s={sold:deals.filter(d=>d.stage==="verkauft").length,rev:deals.filter(d=>d.stage==="verkauft").reduce((a,d)=>a+d.value,0),streak,total:deals.length,hot:deals.filter(d=>d.heat>=5).length,gold:deals.filter(d=>d.stage==="gold").length,acts:deals.reduce((a,d)=>a+d.acts.length,0)};
    const nu=ACHIEVEMENTS.filter(a=>a.check(s)&&!unlocked.includes(a.id));
    if(nu.length){setUnlocked(p=>[...p,...nu.map(a=>a.id)]);nu.forEach((a,i)=>setTimeout(()=>msg(`🏅 ${a.icon} ${a.label}!`),i*800))}
  },[deals,streak]);

  // Apply automation rules on stage change
  const applyRules=useCallback((dealId,fromStage,toStage)=>{
    const deal=deals.find(d=>d.id===dealId);
    const dealLoc=deal?.loc||"";
    const active=rules.filter(r=>r.enabled&&(r.from==="*"||r.from===fromStage)&&r.to===toStage&&(r.scope==="hq"||r.scope===dealLoc));
    if(!active.length)return;
    setDeals(prev=>prev.map(d=>{
      if(d.id!==dealId)return d;
      let updated={...d,todos:[...d.todos],acts:[...d.acts]};
      active.forEach(r=>{
        if(r.action==="todo"){updated.todos=[{text:r.text,due:Date.now()+(r.days||0)*864e5,done:false,id:"t"+Date.now()+Math.random()},...updated.todos]}
        else{updated.acts=[{type:r.actType||"note",text:r.text,time:Date.now()},...updated.acts]}
      });
      return updated;
    }));
    active.forEach((r,i)=>setTimeout(()=>msg(`⚡ Auto: ${r.action==="todo"?"☑️":"📋"} "${r.text}"`),300+i*600));
  },[rules,msg]);

  const drop=useCallback((id,ns)=>{
    const deal=deals.find(x=>x.id===id);
    if(!deal||deal.stage===ns)return;
    const oldStage=deal.stage;
    setDeals(p=>p.map(x=>x.id===id?{...x,stage:ns,changed:Date.now()}:x));
    // Persist to DB
    saveDeal(id, "stage", ns);
    // Trigger automations
    setTimeout(()=>applyRules(id,oldStage,ns),100);
    if(ns==="verkauft"){setStreak(s=>s+1);msg(`🏆 ${deal.name} verkauft! ${fmt(deal.value)}`);pop(innerWidth/2,innerHeight/2)}
    else if(ns==="lost"){setStreak(0);msg(`💀 ${deal.name} verloren...`)}
    else if(ns==="gold"){msg(`💎 ${deal.name} → Schrank der Hoffnung`)}
    setDragId(null);
  },[deals,pop,msg,applyRules,saveDeal]);

  const addDeal=useCallback(async(d)=>{
    // Create in DB first, get UUID back
    const dbRow = await createDeal(d);
    if (dbRow) {
      const newDeal = { ...d, id: dbRow.id, created: Date.now(), changed: Date.now(), todos: [], acts: [] };
      setDeals(p=>[newDeal,...p]);
      setNewId(dbRow.id);
      setShowAdd(false);
      msg(`🎯 ${d.name} hinzugefügt!`);
      setTimeout(()=>setNewId(null),600);
    } else {
      // Fallback: add locally with temp id
      const id=nid.current++;
      setDeals(p=>[{...d,id},...p]);
      setNewId(id);
      setShowAdd(false);
      msg(`🎯 ${d.name} hinzugefügt (offline)`);
      setTimeout(()=>setNewId(null),600);
    }
  },[msg,createDeal]);
  const addAct=useCallback((id,a)=>{
    setDeals(p=>p.map(d=>d.id===id?{...d,acts:[a,...d.acts]}:d));
    setSel(p=>p&&p.id===id?{...p,acts:[a,...p.acts]}:p);
    addActivity(id, a);
  },[addActivity]);
  const setHeat=useCallback((id,h)=>{
    setDeals(p=>p.map(d=>d.id===id?{...d,heat:h}:d));
    setSel(p=>p&&p.id===id?{...p,heat:h}:p);
    saveDeal(id, "heat", h);
  },[saveDeal]);
  const toggleTodo=useCallback((did,tid)=>{
    // Find current done state first
    const deal = deals.find(d => d.id === did);
    const todo = deal?.todos.find(t => t.id === tid);
    const newDone = !(todo?.done);
    setDeals(p=>p.map(d=>d.id===did?{...d,todos:d.todos.map(t=>t.id===tid?{...t,done:newDone}:t)}:d));
    setSel(p=>p&&p.id===did?{...p,todos:p.todos.map(t=>t.id===tid?{...t,done:newDone}:t)}:p);
    dbToggleTodo(tid, newDone);
  },[deals,dbToggleTodo]);
  const addTodo=useCallback(async(did,todo)=>{
    // Optimistic update with temp id
    const tempTodo = {...todo, id: todo.id || "t"+Date.now()};
    setDeals(p=>p.map(d=>d.id===did?{...d,todos:[tempTodo,...d.todos]}:d));
    setSel(p=>p&&p.id===did?{...p,todos:[tempTodo,...p.todos]}:p);
    // Persist and get real UUID
    const dbTodo = await saveTodo(did, todo);
    if (dbTodo) {
      // Replace temp id with real id
      setDeals(p=>p.map(d=>d.id===did?{...d,todos:d.todos.map(t=>t.id===tempTodo.id?{...t,id:dbTodo.id}:t)}:d));
      setSel(p=>p&&p.id===did?{...p,todos:p.todos.map(t=>t.id===tempTodo.id?{...t,id:dbTodo.id}:t)}:p);
    }
  },[saveTodo]);
  const updateDeal=useCallback((did,field,val)=>{
    setDeals(p=>p.map(d=>d.id===did?{...d,[field]:val}:d));
    setSel(p=>p&&p.id===did?{...p,[field]:val}:p);
    // Persist to DB (debounced for text fields would be nice, but for now direct)
    saveDeal(did, field, val);
  },[saveDeal]);
  const changeStage=useCallback((did,fromStage,toStage)=>{
    if(fromStage===toStage)return;
    const deal=deals.find(d=>d.id===did);
    setDeals(p=>p.map(d=>d.id===did?{...d,stage:toStage,changed:Date.now()}:d));
    setSel(p=>p&&p.id===did?{...p,stage:toStage,changed:Date.now()}:p);
    // Persist to DB
    saveDeal(did, "stage", toStage);
    setTimeout(()=>applyRules(did,fromStage,toStage),100);
    if(toStage==="verkauft"){setStreak(s=>s+1);msg(`🏆 ${deal?.name} verkauft! ${fmt(deal?.value||0)}`);pop(innerWidth/2,innerHeight/2)}
    else if(toStage==="lost"){setStreak(0);msg(`💀 ${deal?.name} verloren...`)}
    else if(toStage==="gold"){msg(`🗄️ ${deal?.name} → Schrank der Hoffnung`)}
  },[deals,applyRules,msg,pop,saveDeal]);

  const main=STAGES.filter(s=>!["lost","gold"].includes(s.id));
  const aging=filteredDeals.filter(d=>!["verkauft","lost","gold"].includes(d.stage)&&dSince(d.changed)>=(AGING[d.stage]||5)).length;
  const openTodos=filteredDeals.reduce((s,d)=>s+d.todos.filter(t=>!t.done).length,0);

  return <div style={{fontFamily:"'Outfit',sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
    <style>{`
      @keyframes appear{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes fly{0%{opacity:1;transform:translateY(0) scale(1) rotate(0)}100%{opacity:0;transform:translateY(-100px) scale(.3) rotate(360deg)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes pop{0%{opacity:0;transform:scale(.9) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes toastIn{0%{opacity:0;transform:translateY(-16px)}100%{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      *{box-sizing:border-box}
    `}</style>
    {parts.map(p=><Particle key={p.id} {...p}/>)}
    {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#1a202c",color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:700,fontSize:13,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,.15)",animation:"toastIn .2s ease"}}>{toast}</div>}

    {/* Header */}
    <div style={{padding:"0 0 10px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,color:"#1a202c",letterSpacing:"-.02em"}}>Deal Flow</h1>
        <div style={{fontSize:11,color:"#A0AEC0",fontWeight:600,marginTop:2}}>
          {aging>0&&<span style={{color:"#E53E3E"}}>⚠ {aging} Follow-Up  </span>}{openTodos>0&&<span style={{color:"#667EEA"}}>☑ {openTodos} Todos  </span>}{!aging&&!openTodos&&"Alles im Griff"}
        </div>
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        {isHqUser&&<div style={{display:"flex",background:"var(--c-bg)",borderRadius:8,border:"1px solid #EDF2F7",overflow:"hidden"}}>
          {LOCATIONS.map(l=><div key={l.id} onClick={()=>setCurLoc(l.id)} style={{padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",background:curLoc===l.id?"#667EEA":"transparent",color:curLoc===l.id?"#fff":"#718096",transition:"all .15s",whiteSpace:"nowrap"}}>{l.label}</div>)}
        </div>}
        <button onClick={()=>setShowAuto(true)} style={{padding:"7px 12px",borderRadius:8,border:"1px solid #EDF2F7",background:"var(--c-bg)",fontSize:12,fontWeight:600,color:"#718096",cursor:"pointer"}}>⚡</button>
        <button onClick={()=>setShowIn(v=>!v)} style={{padding:"7px 12px",borderRadius:8,border:"1px solid #EDF2F7",background:showIn?"#EBF4FF":"#fff",fontSize:12,fontWeight:600,color:showIn?"#667EEA":"#718096",cursor:"pointer"}}>📊</button>
        <button onClick={()=>setShowAdd(true)} style={{padding:"7px 16px",borderRadius:8,border:"none",background:"#667EEA",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Kontakt</button>
      </div>
    </div>

    <div style={{padding:"0 0 12px"}}><Scores deals={filteredDeals} streak={streak}/></div>

    {showIn&&<div style={{padding:"0 0 12px",display:"flex",gap:12,flexWrap:"wrap",animation:"appear .3s"}}>
      <div style={{flex:"1 1 300px"}}><Funnel deals={filteredDeals}/></div>
      <div style={{flex:"1 1 380px"}}><Badges deals={filteredDeals} streak={streak} unlocked={unlocked}/></div>
    </div>}

    <div style={{padding:"0 0 12px",display:"flex",gap:4,overflowX:"auto",minHeight:320}}>
      {main.map(s=><Col key={s.id} stage={s} deals={filteredDeals.filter(d=>d.stage===s.id)} onDrop={drop} onDrag={setDragId} onClick={setSel} newId={newId}/>)}
    </div>

    <DropZone sid="gold" label="🗄️ Schrank der Hoffnung" sub="Wertvolle Kontakte, die noch reifen" bc="#D69E2E" tc="#B7791F" cc="#B7791F" deals={filteredDeals.filter(d=>d.stage==="gold")} onDrop={drop} onDrag={setDragId}/>
    <DropZone sid="lost" label="💀 Verloren" sub="Jederzeit wiederbelebbar" bc="#FEB2B2" tc="#E53E3E" cc="#A0AEC0" deals={filteredDeals.filter(d=>d.stage==="lost")} onDrop={drop} onDrag={setDragId}/>
    <div style={{height:32}}/>

    {showAdd&&<AddModal onClose={()=>setShowAdd(false)} onAdd={addDeal} currentLoc={curLoc} LOCATIONS={LOCATIONS} SELLERS={SELLERS}/>}
    {sel&&<DetailModal deal={sel} onClose={()=>setSel(null)} onAct={addAct} onHeat={setHeat} onToggleTodo={toggleTodo} onAddTodo={addTodo} onUpdateDeal={updateDeal} onChangeStage={changeStage} SELLERS={SELLERS}/>}
    {showAuto&&<AutoModal rules={rules} onUpdate={setRules} onClose={()=>setShowAuto(false)} LOCATIONS={LOCATIONS}/>}
  </div>
}

// Register globally so mountReactPipeline() can find it
window.__PIPELINE_APP = PipelineApp;

// Auto-mount if already visible (deferred until module exports mountReactPipeline)
window.addEventListener('vit:modules-ready', function() {
    if(document.getElementById('react-pipeline-root') && typeof window.mountReactPipeline === 'function') {
        mountReactPipeline();
    }
});
