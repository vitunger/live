/**
 * views/react-components.js - React Pipeline & Marketing Components
 * @module views/react-components
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

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
export function Col({stage,deals,onDrop,onDrag,onClick,newId}){
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
export function AddModal({onClose,onAdd,currentLoc}){
  const[n,setN]=useState("");const[v,setV]=useState("");const[no,setNo]=useState("");const[ph,setPh]=useState("");const[em,setEm]=useState("");const[av,setAv]=useState("👤");const[loc,setLoc]=useState(currentLoc==="hq"?"berlin":currentLoc);const[seller,setSeller]=useState("");
  const availSellers=SELLERS.filter(s=>s.loc===loc);
  const go=()=>{if(!n||!v)return;onAdd({name:n,value:+v,note:no||"Neuer Kontakt",avatar:av,heat:3,stage:"lead",phone:ph,email:em,acts:[],todos:[],created:Date.now(),changed:Date.now(),loc,seller:seller||availSellers[0]?.id||""})};
  const ip={width:"100%",padding:"10px 14px",borderRadius:12,border:"2px solid #E2E8F0",fontSize:14,fontFamily:"'Outfit',sans-serif",outline:"none",boxSizing:"border-box"};
  const locs=LOCATIONS.filter(l=>!l.isHQ);
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
export function SalesForm({deal,sales,seller,onClose,onUpdateDeal,mode}){
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
export function ScanUploadModal({deal,sales,onClose,onUpdateDeal}){
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
  const session=await window._sb().auth.getSession();
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

export function DetailModal({deal,onClose,onAct,onHeat,onToggleTodo,onAddTodo,onUpdateDeal,onChangeStage}){
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
export function AutoModal({rules,onUpdate,onClose}){
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
export function Scores({deals,streak}){
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
export function Funnel({deals}){
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
export function Badges({deals,streak,unlocked}){
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
export function DropZone({sid,label,sub,bc,tc,cc,deals,onDrop,onDrag}){
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
export function PipelineApp(){
  const[deals,setDeals]=useState(INIT);
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
  // Determine location from logged-in user profile
  const isHqUser = window._sbProfile() && window._sbProfile().is_hq;
  const userStandortSlug = (function() {
// Map standort_id to a loc slug - for now use demo mapping
// TODO: Replace with real standort lookup from DB
if(!window.sbProfile || window._sbProfile().is_hq) return "hq";
return "berlin"; // Default for non-HQ users until DB mapping exists
  })();
  const[curLoc,setCurLoc]=useState(isHqUser ? "hq" : userStandortSlug);
  const nid=useRef(100);

  const filteredDeals = curLoc === "hq" ? deals : deals.filter(d => d.loc === curLoc);

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
// Trigger automations
setTimeout(()=>applyRules(id,oldStage,ns),100);
if(ns==="verkauft"){setStreak(s=>s+1);msg(`🏆 ${deal.name} verkauft! ${fmt(deal.value)}`);pop(innerWidth/2,innerHeight/2)}
else if(ns==="lost"){setStreak(0);msg(`💀 ${deal.name} verloren...`)}
else if(ns==="gold"){msg(`💎 ${deal.name} → Schrank der Hoffnung`)}
setDragId(null);
  },[deals,pop,msg,applyRules]);

  const addDeal=useCallback(d=>{const id=nid.current++;setDeals(p=>[...p,{...d,id}]);setNewId(id);setShowAdd(false);msg(`🎯 ${d.name} hinzugefügt!`);setTimeout(()=>setNewId(null),600)},[msg]);
  const addAct=useCallback((id,a)=>{setDeals(p=>p.map(d=>d.id===id?{...d,acts:[a,...d.acts]}:d));setSel(p=>p&&p.id===id?{...p,acts:[a,...p.acts]}:p)},[]);
  const setHeat=useCallback((id,h)=>{setDeals(p=>p.map(d=>d.id===id?{...d,heat:h}:d));setSel(p=>p&&p.id===id?{...p,heat:h}:p)},[]);
  const toggleTodo=useCallback((did,tid)=>{setDeals(p=>p.map(d=>d.id===did?{...d,todos:d.todos.map(t=>t.id===tid?{...t,done:!t.done}:t)}:d));setSel(p=>p&&p.id===did?{...p,todos:p.todos.map(t=>t.id===tid?{...t,done:!t.done}:t)}:p)},[]);
  const addTodo=useCallback((did,todo)=>{setDeals(p=>p.map(d=>d.id===did?{...d,todos:[todo,...d.todos]}:d));setSel(p=>p&&p.id===did?{...p,todos:[todo,...p.todos]}:p)},[]);
  const updateDeal=useCallback((did,field,val)=>{setDeals(p=>p.map(d=>d.id===did?{...d,[field]:val}:d));setSel(p=>p&&p.id===did?{...p,[field]:val}:p)},[]);
  const changeStage=useCallback((did,fromStage,toStage)=>{
if(fromStage===toStage)return;
const deal=deals.find(d=>d.id===did);
setDeals(p=>p.map(d=>d.id===did?{...d,stage:toStage,changed:Date.now()}:d));
setSel(p=>p&&p.id===did?{...p,stage:toStage,changed:Date.now()}:p);
setTimeout(()=>applyRules(did,fromStage,toStage),100);
if(toStage==="verkauft"){setStreak(s=>s+1);msg(`🏆 ${deal?.name} verkauft! ${fmt(deal?.value||0)}`);pop(innerWidth/2,innerHeight/2)}
else if(toStage==="lost"){setStreak(0);msg(`💀 ${deal?.name} verloren...`)}
else if(toStage==="gold"){msg(`🗄️ ${deal?.name} → Schrank der Hoffnung`)}
  },[deals,applyRules,msg,pop]);

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

{showAdd&&<AddModal onClose={()=>setShowAdd(false)} onAdd={addDeal} currentLoc={curLoc}/>}
{sel&&<DetailModal deal={sel} onClose={()=>setSel(null)} onAct={addAct} onHeat={setHeat} onToggleTodo={toggleTodo} onAddTodo={addTodo} onUpdateDeal={updateDeal} onChangeStage={changeStage}/>}
{showAuto&&<AutoModal rules={rules} onUpdate={setRules} onClose={()=>setShowAuto(false)}/>}
  </div>
}

// Register globally so mountReactPipeline() can find it
window.__PIPELINE_APP = PipelineApp;

// Auto-mount if already visible
if(document.getElementById('react-pipeline-root') && document.getElementById('vkTabPipeline') && document.getElementById('vkTabPipeline').style.display !== 'none') {
mountReactPipeline();
}
</script>

<!-- Jahresziel Modal -->
<div id="jahreszielModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" style="display:none" onclick="if(event.target===this)closeJahreszielModal()">
<div class="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
<div class="p-6">
    <div class="flex justify-between items-center mb-4"><h3 class="text-lg font-bold" id="jahreszielModalTitle">Neues Jahresziel</h3><button onclick="closeJahreszielModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>
    <input type="hidden" id="jahreszielEditId" value="">
    <div class="mb-4"><label class="block text-sm font-semibold text-gray-700 mb-1">Typ</label>
        <select id="jahreszielTyp" onchange="toggleJahreszielFelder()" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400">
            <option value="umsatz">💰 Umsatzziel</option><option value="deckungsbeitrag">📊 Deckungsbeitrag</option><option value="smart">🎯 SMART-Ziel</option><option value="soft_target">✅ Soft Target</option>
        </select></div>
    <div class="mb-4"><label class="block text-sm font-semibold text-gray-700 mb-1">Titel</label><input id="jahreszielTitel" type="text" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400" placeholder="z.B. Jahresumsatz €850.000"></div>
    <div class="mb-4" id="jahreszielBeschreibungWrap"><label class="block text-sm font-semibold text-gray-700 mb-1">Beschreibung / SMART-Details</label><textarea id="jahreszielBeschreibung" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400" placeholder="S: M: A: R: T:"></textarea></div>
    <div class="grid grid-cols-3 gap-3 mb-4" id="jahreszielWerteWrap">
        <div><label class="block text-sm font-semibold text-gray-700 mb-1">Zielwert</label><input id="jahreszielZielwert" type="number" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-1">Aktueller Wert</label><input id="jahreszielAktuellerWert" type="number" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-1">Einheit</label><select id="jahreszielEinheit" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"><option value="€">€</option><option value="Stück">Stück</option><option value="Bewertungen">Bewertungen</option><option value="%">%</option></select></div>
    </div>
    <div class="flex justify-end space-x-3 pt-4 border-t"><button onclick="closeJahreszielModal()" class="px-4 py-2 text-sm text-gray-600">Abbrechen</button><button onclick="saveJahresziel()" class="px-4 py-2 bg-vit-orange text-white text-sm font-semibold rounded-lg hover:opacity-90">Speichern</button></div>
</div>
</div>
</div>

<!-- Journal Modal -->
<div id="journalModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" style="display:none" onclick="if(event.target===this)closeJournalModal()">
<div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
<div class="p-6">
    <div class="flex justify-between items-center mb-4"><h3 class="text-lg font-bold">Gespräch protokollieren</h3><button onclick="closeJournalModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>
    <input type="hidden" id="journalEditId" value="">
    <div class="grid grid-cols-2 gap-4 mb-4">
        <div><label class="block text-sm font-semibold text-gray-700 mb-1">Datum</label><input id="journalDatum" type="date" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-1">Stimmung</label>
            <div class="flex space-x-3 mt-1">
                <button type="button" onclick="setJournalStimmung('positiv')" class="journal-stimmung-btn text-2xl opacity-40 hover:opacity-100 transition" data-val="positiv">😊</button>
                <button type="button" onclick="setJournalStimmung('neutral')" class="journal-stimmung-btn text-2xl opacity-40 hover:opacity-100 transition" data-val="neutral">😐</button>
                <button type="button" onclick="setJournalStimmung('besorgt')" class="journal-stimmung-btn text-2xl opacity-40 hover:opacity-100 transition" data-val="besorgt">😟</button>
                <button type="button" onclick="setJournalStimmung('kritisch')" class="journal-stimmung-btn text-2xl opacity-40 hover:opacity-100 transition" data-val="kritisch">😤</button>
            </div><input type="hidden" id="journalStimmung" value=""></div>
    </div>
    <div class="mb-4"><label class="block text-sm font-semibold text-gray-700 mb-1">Teilnehmer</label><input id="journalTeilnehmer" type="text" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400" placeholder="z.B. Matthias, Sascha (HQ)"></div>
    <div class="mb-4"><label class="block text-sm font-semibold text-gray-700 mb-2">Themen</label>
        <div class="flex flex-wrap gap-2" id="journalThemenTags">
            <label class="flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold cursor-pointer hover:bg-orange-50"><input type="checkbox" value="Umsatz/Zahlen" class="journal-thema-cb hidden"><span>💰 Umsatz</span></label>
            <label class="flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold cursor-pointer hover:bg-orange-50"><input type="checkbox" value="Personal" class="journal-thema-cb hidden"><span>👥 Personal</span></label>
            <label class="flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold cursor-pointer hover:bg-orange-50"><input type="checkbox" value="Marketing" class="journal-thema-cb hidden"><span>📢 Marketing</span></label>
            <label class="flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold cursor-pointer hover:bg-orange-50"><input type="checkbox" value="Werkstatt" class="journal-thema-cb hidden"><span>🔧 Werkstatt</span></label>
            <label class="flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold cursor-pointer hover:bg-orange-50"><input type="checkbox" value="Einkauf" class="journal-thema-cb hidden"><span>🛒 Einkauf</span></label>
            <label class="flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold cursor-pointer hover:bg-orange-50"><input type="checkbox" value="Ziele" class="journal-thema-cb hidden"><span>🎯 Ziele</span></label>
            <label class="flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold cursor-pointer hover:bg-orange-50"><input type="checkbox" value="Work-Life-Balance" class="journal-thema-cb hidden"><span>⚖️ WLB</span></label>
            <label class="flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-xs font-semibold cursor-pointer hover:bg-orange-50"><input type="checkbox" value="Sonstiges" class="journal-thema-cb hidden"><span>📌 Sonstiges</span></label>
        </div></div>
    <div class="mb-4"><label class="block text-sm font-semibold text-gray-700 mb-1">Aktuelle Lage</label><textarea id="journalLage" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400" placeholder="Wie steht der Partner da?"></textarea></div>
    <div class="mb-4"><label class="block text-sm font-semibold text-gray-700 mb-2">Wünsche an HQ</label><div id="journalWuensche" class="space-y-2 mb-2"></div><button onclick="addJournalWunsch()" class="text-sm text-vit-orange font-semibold">+ Wunsch</button></div>
    <div class="mb-4"><label class="block text-sm font-semibold text-gray-700 mb-2">Vereinbarte Maßnahmen</label><div id="journalMassnahmen" class="space-y-2 mb-2"></div><button onclick="addJournalMassnahme()" class="text-sm text-vit-orange font-semibold">+ Maßnahme</button></div>
    <div class="mb-4"><label class="block text-sm font-semibold text-gray-700 mb-1">Notizen</label><textarea id="journalNotizen" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400" placeholder="Sonstiges..."></textarea></div>
    <div class="mb-4"><label class="block text-sm font-semibold text-gray-700 mb-1">Nächster Termin</label><input id="journalNaechsterTermin" type="date" class="w-full border rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"></div>
    <div class="flex justify-end space-x-3 pt-4 border-t"><button onclick="closeJournalModal()" class="px-4 py-2 text-sm text-gray-600">Abbrechen</button><button onclick="saveJournalEntry()" class="px-4 py-2 bg-vit-orange text-white text-sm font-semibold rounded-lg hover:opacity-90">Speichern</button></div>
</div>
</div>
</div>


<!-- vit:bikes Marketing Module React Components (Cockpit, Budget, Kampagnen, Reichweite) -->
<script type="text/babel">
(function(){
const{useState,useReducer,useEffect,createContext,useContext}=React;
const uid=()=>Math.random().toString(36).slice(2,9);
const fmt=v=>v.toLocaleString("de-DE");
const fmtE=v=>fmt(v)+" \u20ac";
const pct=(a,b)=>b?Math.round(a/b*100):0;
const clp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ST=(function(){var dm=window.isDemoMode||(window._sbProfile() &&(window._sbProfile().status==='demo'||window._sbProfile().status==='demo_active'));return{name:dm?'Muster-Filiale':(window._sbProfile() &&window._sbProfile().standort_name?window._sbProfile().standort_name:'Mein Standort'),plz:dm?'12345':(window._sbProfile() &&window._sbProfile().standort_plz?window._sbProfile().standort_plz:'')};})(),YR=2026,UZ=838000,OBM=1500,LBM=600;
const MO=["Jan","Feb","M\u00e4r","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

const SCORE={total:72,parts:[{n:"Google My Business",s:78,w:30,i:"\ud83d\udccd",c:"#2563eb"},{n:"Paid Reichweite",s:65,w:25,i:"\ud83c\udfaf",c:"#EF7D00"},{n:"Bewertungen",s:82,w:20,i:"\u2b50",c:"#ca8a04"},{n:"Organische Pr\u00e4senz",s:60,w:15,i:"\ud83d\udce1",c:"#9333ea"},{n:"Lokales Marketing",s:70,w:10,i:"\ud83c\udfea",c:"#16a34a"}],trend:[58,61,64,63,67,69,68,72],rank:12,ts:28,tips:[{a:"GMB Antwortrate auf 100%",p:4,e:"Einfach"},{a:"5 neue GMB-Fotos",p:3,e:"Einfach"},{a:"Lokales Event Q1",p:5,e:"Mittel"},{a:"Local Hero Video",p:4,e:"Mittel"}]};
const FN=[{l:"Budget",i:"\ud83d\udcb0",ist:3155,soll:3000,f:fmtE},{l:"Reichweite",i:"\ud83d\udc41",ist:192350,soll:200000,f:fmt},{l:"Klicks",i:"\ud83d\udc46",ist:1620,soll:1600,f:fmt},{l:"Leads",i:"\ud83c\udfaf",ist:10,soll:12,f:fmt},{l:"Termine",i:"\ud83d\udcc5",ist:7,soll:10,f:fmt},{l:"Abschl\u00fcsse",i:"\ud83e\udd1d",ist:4,soll:7,f:fmt},{l:"Umsatz",i:"\ud83d\udcb6",ist:19200,soll:100560,f:fmtE}];
const OL={ch:[{name:"Google Ads",icon:"\ud83d\udd0d",color:"#f59e0b",split:.8,k:{ko:1445,im:43541,cl:1049,le:4}},{name:"Meta Ads",icon:"\ud83d\udcd8",color:"#3b82f6",split:.2,k:{ko:279,im:148809,cl:571,le:2}}],mo:[{m:"Jan",g:1152,me:279,le:4,te:3,u:6800},{m:"Feb",g:1445,me:279,le:6,te:4,u:12400}],nw:{cpt:163,lm:9,sv:22,bm:1436}};
const LK=[{id:"e",n:"Events",i:"\ud83c\udfea",c:"#EF7D00"},{id:"f",n:"Print",i:"\ud83d\udcc4",c:"#9333ea"},{id:"o",n:"OOH",i:"\ud83e\udea7",c:"#2563eb"},{id:"s",n:"Sponsoring",i:"\ud83e\udd1d",c:"#16a34a"},{id:"x",n:"Sonstiges",i:"\ud83d\udce6",c:"#9ca3af"}];
const DL=[{id:"la1",kat:"e",t:"Fr\u00fchlings-Probefahrt-Tag",b:350,mo:2,s:"geplant"},{id:"la2",kat:"f",t:"Flyer Fr\u00fchjahrsaktion",b:180,mo:2,s:"bezahlt"},{id:"la3",kat:"o",t:"Banner Hauptstra\u00dfe",b:450,mo:0,s:"laufend"},{id:"la4",kat:"s",t:"TSV Trikots",b:200,mo:1,s:"bezahlt"},{id:"la5",kat:"e",t:"E-Bike Testevent",b:500,mo:3,s:"geplant"}];
const DKA=[{id:"k1",t:"Fr\u00fchjahrs-kampagne",typ:"hq",ch:"Google+Meta",st:"2026-02-15",en:"2026-04-30",s:"aktiv",b:4500,d:"Performance-Max"},{id:"k2",t:"E-Bike Leasing",typ:"hq",ch:"Meta",st:"2026-03-01",en:"2026-05-31",s:"geplant",b:2000,d:"Pendler"},{id:"k3",t:"Awareness Ganzjahr",typ:"hq",ch:"Google",st:"2026-01-01",en:"2026-12-31",s:"aktiv",b:12000,d:"Brand"},{id:"k4",t:"Probefahrt-Tag",typ:"lokal",ch:"Lokal",st:"2026-03-15",en:"2026-03-15",s:"geplant",b:350,d:"Testtag"},{id:"k5",t:"Stadtradeln",typ:"lokal",ch:"Lokal",st:"2026-05-01",en:"2026-05-21",s:"geplant",b:300,d:"Teamsponsor"}];
const ADS=[{n:"PerformanceMax",ch:"Google",sp:1162,im:39296,cl:848,le:3,cpc:1.37,ctr:2.16,co:"#f59e0b",bu:1162},{n:"Search Service",ch:"Google",sp:142,im:1944,cl:129,le:1,cpc:1.10,ctr:6.63,co:"#f59e0b",bu:150},{n:"Search Marken",ch:"Google",sp:141,im:2301,cl:72,le:0,cpc:1.96,ctr:3.13,co:"#f59e0b",bu:150},{n:"Awareness Lokal",ch:"Meta",sp:140,im:120730,cl:153,le:0,cpc:0.92,ctr:0.13,co:"#3b82f6",bu:140},{n:"Conversion E-Bike",ch:"Meta",sp:139,im:28079,cl:418,le:2,cpc:0.33,ctr:1.49,co:"#3b82f6",bu:140}];
const GMB={ra:4.7,rv:142,rr:87,kpis:[{l:"Aufrufe",v:1847,c:12,i:"\ud83d\udc41"},{l:"Anrufe",v:34,c:8,i:"\ud83d\udcde"},{l:"Routen",v:89,c:15,i:"\ud83d\uddfa"},{l:"Website",v:156,c:-3,i:"\ud83c\udf10"},{l:"Fotos",v:2340,c:22,i:"\ud83d\udcf8"},{l:"Nachrichten",v:12,c:50,i:"\ud83d\udcac"}],revs:[{a:"Sandra M.",r:5,t:"Super Beratung!",d:"12.02",ok:true},{a:"Thomas K.",r:5,t:"Top Service.",d:"08.02",ok:true},{a:"Julia W.",r:4,t:"Etwas Wartezeit.",d:"03.02",ok:false},{a:"Peter H.",r:3,t:"Mehr Leasing-Infos.",d:"28.01",ok:true}],di:[87,32,14,5,4]};
const ORG=[{n:"YouTube",i:"\ud83c\udfa5",co:"#ef4444",kp:[{l:"Subs",v:"12.4k",c:"+1.1k"},{l:"Views",v:"745k",c:"+12%"},{l:"Watch",v:"41.7kh",c:"+8%"},{l:"Likes",v:"11.6k",c:"+15%"}],no:"3 Videos"},{n:"Instagram",i:"\ud83d\udcf8",co:"#c026d3",kp:[{l:"Follower",v:"10.2k",c:"+340"},{l:"Engage",v:"4.2%",c:"+0.3%"},{l:"Posts",v:"847",c:"+12"},{l:"Reach",v:"3.4k",c:"+18%"}],no:"2 Posts+4 Stories"},{n:"TikTok",i:"\ud83c\udfb5",co:"#6b7280",kp:[{l:"Follower",v:"2.8k",c:"+210"},{l:"Videos",v:"124",c:"+6"},{l:"Likes",v:"89k",c:"+4.2k"},{l:"Views",v:"18.2k",c:"+22%"}],no:"1 Reel (8.4k)"}];

// State
export function reducer(s,a){switch(a.type){case"AL":return{...s,lo:[...s.lo,{id:uid(),...a.d}]};case"DL":return{...s,lo:s.lo.filter(x=>x.id!==a.id)};case"AK":return{...s,ka:[...s.ka,{id:uid(),...a.d}]};case"DK":return{...s,ka:s.ka.filter(x=>x.id!==a.id)};default:return s;}}
const Ctx=createContext(null);
const useApp=()=>useContext(Ctx);

// Shared
const cs={card:"bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4 hover:shadow-md transition-shadow",mono:"font-mono",lbl:"text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1"};
export function Bar({value,max,color="#EF7D00",h=4}){const p=max?clp(Math.round(value/max*100),0,100):0;return<div style={{height:h,background:"var(--c-bg3)",borderRadius:h,overflow:"hidden",width:"100%"}}><div style={{height:"100%",width:p+"%",background:color,borderRadius:h,transition:"width .8s ease"}}/></div>;}
export function Bdg({text,color="#EF7D00"}){return<span className={cs.mono} style={{fontSize:9,fontWeight:600,color,background:color+"15",padding:"3px 8px",borderRadius:6}}>{text}</span>;}
export function SBdg({s}){const m={aktiv:{t:"LIVE",c:"#16a34a"},geplant:{t:"GEPLANT",c:"#2563eb"},bezahlt:{t:"BEZAHLT",c:"#9ca3af"},laufend:{t:"LAUFEND",c:"#EF7D00"}};const x=m[s]||m.geplant;return<Bdg text={x.t} color={x.c}/>;}
export function Ring({score,size=140,sw=7}){const r=(size-sw)/2,ci=2*Math.PI*r,of=ci-(score/100)*ci;return<svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--c-bg3)" strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EF7D00" strokeWidth={sw} strokeDasharray={ci} strokeDashoffset={of} strokeLinecap="round" style={{transition:"stroke-dashoffset 1.2s ease"}}/></svg>;}

// ══ COCKPIT ══
export function Cockpit(){
  const up=pct(FN[6].ist,UZ),usp=pct(FN[6].ist,FN[6].soll);
  return<div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
  <div className={cs.card} style={{boxShadow:"0 0 20px rgba(239,125,0,0.12)"}}>
<div style={{display:"flex",alignItems:"center",gap:20}}>
  <div style={{position:"relative",flexShrink:0}}><Ring score={SCORE.total}/><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:40,fontWeight:900,color:"#EF7D00"}}>{SCORE.total}</span><span style={{fontSize:10,color:"var(--c-muted)"}}>von 100</span></div></div>
  <div style={{flex:1}}><h2 style={{fontSize:16,fontWeight:800,color:"var(--c-text)",marginBottom:2}}>Sichtbarkeitsscore</h2><p style={{fontSize:11,color:"var(--c-sub)",marginBottom:10}}>Deine lokale Sichtbarkeit</p>
    {SCORE.parts.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:11,width:14}}>{p.i}</span><span style={{fontSize:10,color:"var(--c-sub)",flex:1}}>{p.n}</span><div style={{width:70}}><Bar value={p.s} max={100} color={p.c} h={3}/></div><span className={cs.mono} style={{fontSize:10,color:p.c,width:24,textAlign:"right"}}>{p.s}</span></div>)}
    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,padding:"7px 10px",background:"var(--c-bg2)",borderRadius:8}}><span style={{fontSize:10,color:"var(--c-muted)"}}>Rang</span><span className={cs.mono} style={{fontSize:15,fontWeight:800,color:"#EF7D00"}}>{SCORE.rank}</span><span style={{fontSize:10,color:"var(--c-muted)"}}>/ {SCORE.ts}</span><div style={{flex:1}}/><svg width={56} height={16}>{SCORE.trend.map((v,i)=>i>0?<line key={i} x1={(i-1)*8} y1={16-((SCORE.trend[i-1]-50)/40)*16} x2={i*8} y2={16-((v-50)/40)*16} stroke="#EF7D00" strokeWidth={1.5}/>:null)}</svg></div>
  </div>
</div>
  </div>
  <div className={cs.card}><div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div><h2 style={{fontSize:16,fontWeight:800,color:"var(--c-text)"}}>Umsatzziel {YR}</h2><p style={{fontSize:11,color:"var(--c-muted)"}}>{ST.name}</p></div><span style={{fontSize:26,fontWeight:900,color:"#EF7D00"}}>{fmtE(UZ)}</span></div><div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"var(--c-sub)"}}>{fmtE(FN[6].ist)} erreicht</span><span className={cs.mono} style={{fontSize:12,fontWeight:700,color:up>=10?"#16a34a":"#dc2626"}}>{up}%</span></div><Bar value={FN[6].ist} max={UZ} h={7}/></div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:14}}>{[["YTD Soll",fmtE(FN[6].soll)],["Zielerr.",usp+"%",usp>=90?"#16a34a":"#dc2626"],["Ø Bon",fmtE(Math.round(FN[6].ist/(FN[5].ist||1)))]].map(([l,v,c],i)=><div key={i} style={{padding:10,background:"var(--c-bg2)",borderRadius:10,textAlign:"center"}}><p className={cs.lbl}>{l}</p><p className={cs.mono} style={{fontSize:15,fontWeight:700,color:c||"#111827"}}>{v}</p></div>)}</div>
  </div>
</div>
{/* Funnel */}
<div className={cs.card} style={{padding:24}}><h2 style={{fontSize:15,fontWeight:800,color:"var(--c-text)",marginBottom:3}}>Marketing-Funnel</h2><p style={{fontSize:10,color:"var(--c-muted)",marginBottom:16}}>Budget \u2192 Reichweite \u2192 Klicks \u2192 Leads \u2192 Termine \u2192 Abschl\u00fcsse \u2192 Umsatz</p>
  <div style={{display:"flex",alignItems:"stretch",gap:0}}>{FN.map((s,i)=>{const r=s.soll?s.ist/s.soll:1;const col=r>=.9?"#16a34a":r>=.7?"#ca8a04":"#dc2626";const bg=r>=.9?"rgba(22,163,74,0.06)":r>=.7?"rgba(202,138,4,0.06)":"rgba(220,38,38,0.06)";const cv=i>0&&i<6?(FN[i].ist/(FN[i-1].ist||1)*100):null;return<React.Fragment key={i}><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 6px",background:bg,borderRadius:10,border:"1px solid "+col+"25"}}><span style={{fontSize:20,marginBottom:4}}>{s.i}</span><span className={cs.mono} style={{fontSize:15,fontWeight:800,color:col}}>{s.f(s.ist)}</span><span style={{fontSize:8,color:"var(--c-muted)",marginTop:3}}>{s.l}</span><div style={{width:"100%",margin:"6px 0 3px"}}><Bar value={s.ist} max={s.soll} color={col} h={3}/></div><span className={cs.mono} style={{fontSize:8,color:"var(--c-muted)"}}>{Math.round(r*100)}%</span></div>{i<FN.length-1&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:28,flexShrink:0}}><svg width="14" height="10" viewBox="0 0 14 10"><path d="M0 5h10M8 1l4 4-4 4" fill="none" stroke="#d1d5db" strokeWidth="1.2"/></svg>{cv!==null&&<span className={cs.mono} style={{fontSize:7,color:"var(--c-muted)",marginTop:1}}>{cv<1?cv.toFixed(2):cv.toFixed(0)}%</span>}</div>}</React.Fragment>;})}</div>
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div className={cs.card}><h2 style={{fontSize:13,fontWeight:800,color:"var(--c-text)",marginBottom:10}}>\ud83d\ude80 Score verbessern</h2>{SCORE.tips.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<SCORE.tips.length-1?"1px solid var(--c-border2)":"none"}}><div style={{width:32,height:32,borderRadius:8,background:"rgba(239,125,0,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span className={cs.mono} style={{fontSize:12,fontWeight:800,color:"#EF7D00"}}>+{t.p}</span></div><div><p style={{fontSize:11,fontWeight:600,color:"var(--c-text)"}}>{t.a}</p><p style={{fontSize:9,color:"var(--c-muted)"}}>{t.e}</p></div></div>)}</div>
  <div className={cs.card}><h2 style={{fontSize:13,fontWeight:800,color:"var(--c-text)",marginBottom:10}}>\ud83d\udcc8 vs. Netzwerk</h2>{[["Budget/Mo",fmtE(OBM),fmtE(OL.nw.bm),null],["Leads/Mo","5.0","9.0",true],["CPT",fmtE(Math.round(3155/7)),fmtE(163),true],["Store Visits","39","22",false]].map(([l,mi,nw,nb],i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 0",borderBottom:i<3?"1px solid var(--c-border2)":"none"}}><span style={{fontSize:11,color:"var(--c-muted)",flex:1}}>{l}</span><span className={cs.mono} style={{fontSize:12,fontWeight:700,width:70,textAlign:"right",color:"var(--c-text)"}}>{mi}</span><span style={{fontSize:9,color:"var(--c-muted)"}}>vs</span><span className={cs.mono} style={{fontSize:12,fontWeight:700,width:70,textAlign:"right",color:nb?"#16a34a":"#6b7280"}}>{nw}{nb&&" \u2713"}</span></div>)}</div>
</div>
  </div>;
}

// ══ BUDGET ══
export function Budget(){
  const{state:st,dispatch:dp}=useApp();const[sa,setSa]=useState(false);const[fm,sFm]=useState({t:"",k:"e",b:"",m:2,s:"geplant"});
  const ad=()=>{if(!fm.t||!fm.b)return;dp({type:"AL",d:{kat:fm.k,t:fm.t,b:Number(fm.b),mo:fm.m,s:fm.s}});setSa(false);};
  const lt=st.lo.reduce((s,a)=>s+a.b,0),lj=LBM*12,oY=OL.mo.reduce((s,m)=>s+m.g+m.me,0);
  return<div>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>{[{l:"Gesamtbudget",v:fmtE(OBM*12+lj),s:fmtE(OBM+LBM)+"/Mo"},{l:"Online (HQ)",v:fmtE(OBM*12),s:"HQ steuert",c:"#2563eb"},{l:"Lokal (Du)",v:fmtE(lj),s:"Du steuerst",c:"#EF7D00"},{l:"Ausgegeben YTD",v:fmtE(oY+lt),s:pct(oY+lt,OBM*12+lj)+"% v. Jahr"}].map((k,i)=><div key={i} className={cs.card} style={{textAlign:"center",padding:14}}><p className={cs.lbl}>{k.l}</p><p className={cs.mono} style={{fontSize:20,fontWeight:800,color:k.c||"#111827"}}>{k.v}</p><p style={{fontSize:9,color:"var(--c-muted)",marginTop:2}}>{k.s}</p></div>)}</div>
<div className={cs.card}><div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div><h2 style={{fontSize:15,fontWeight:800,color:"var(--c-text)"}}>Online-Marketing</h2><p style={{fontSize:10,color:"var(--c-muted)"}}>HQ steuert die Aufteilung</p></div><Bdg text="HQ-GESTEUERT" color="#2563eb"/></div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>{OL.ch.map(ch=><div key={ch.name} style={{padding:14,background:"var(--c-bg2)",borderRadius:10,borderLeft:"3px solid "+ch.color}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:700,fontSize:12,color:"var(--c-text)"}}>{ch.icon} {ch.name}</span><span className={cs.mono} style={{fontSize:10,color:"var(--c-muted)"}}>{Math.round(ch.split*100)}%</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>{[["Kosten",fmtE(ch.k.ko)],["Klicks",fmt(ch.k.cl)],["Leads",""+ch.k.le]].map(([l,v],j)=><div key={j}><p style={{fontSize:8,color:"var(--c-muted)"}}>{l}</p><p className={cs.mono} style={{fontSize:13,fontWeight:700,color:"var(--c-text)"}}>{v}</p></div>)}</div></div>)}</div>
</div>
<div className={cs.card}><div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div><h2 style={{fontSize:15,fontWeight:800,color:"var(--c-text)"}}>Lokales Marketing</h2><p style={{fontSize:10,color:"var(--c-muted)"}}>Dein Budget, deine Entscheidung</p></div><div style={{display:"flex",gap:6}}><Bdg text="DU STEUERST" color="#EF7D00"/><button onClick={()=>setSa(!sa)} style={{padding:"6px 14px",background:"#EF7D00",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Outfit"}}>+ Ausgabe</button></div></div>
  <div style={{padding:14,background:"var(--c-bg2)",borderRadius:10,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"var(--c-sub)"}}>{fmtE(lt)} von {fmtE(lj)}</span><span className={cs.mono} style={{fontSize:12,fontWeight:700,color:"#EF7D00"}}>{pct(lt,lj)}%</span></div><Bar value={lt} max={lj} h={5}/></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:14}}>{LK.map(k=>{const sm=st.lo.filter(a=>a.kat===k.id).reduce((s,a)=>s+a.b,0);return<div key={k.id} style={{padding:10,background:"var(--c-bg2)",borderRadius:8,textAlign:"center"}}><span style={{fontSize:16}}>{k.i}</span><p className={cs.mono} style={{fontSize:13,fontWeight:700,color:k.c,marginTop:2}}>{fmtE(sm)}</p><p style={{fontSize:8,color:"var(--c-muted)"}}>{k.n}</p></div>;})}</div>
  {sa&&<div style={{padding:14,background:"#fff7ed",borderRadius:10,marginBottom:14,border:"1px solid #fed7aa"}}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><input value={fm.t} onChange={e=>sFm({...fm,t:e.target.value})} placeholder="Titel..." style={{flex:1,minWidth:140,padding:"6px 10px",border:"1px solid var(--c-border)",borderRadius:8,fontSize:12,fontFamily:"Outfit"}}/><select value={fm.k} onChange={e=>sFm({...fm,k:e.target.value})} style={{padding:"6px 10px",border:"1px solid var(--c-border)",borderRadius:8,fontSize:12,fontFamily:"Outfit"}}>{LK.map(k=><option key={k.id} value={k.id}>{k.i} {k.n}</option>)}</select><input type="number" value={fm.b} onChange={e=>sFm({...fm,b:e.target.value})} placeholder="\u20ac" style={{width:70,padding:"6px 10px",border:"1px solid var(--c-border)",borderRadius:8,fontSize:12,fontFamily:"Outfit"}}/><button onClick={ad} style={{padding:"6px 16px",background:"#EF7D00",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Outfit"}}>Speichern</button></div></div>}
  {st.lo.map(a=>{const k=LK.find(x=>x.id===a.kat)||LK[4];return<div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--c-border2)"}}><span style={{fontSize:14}}>{k.i}</span><div style={{flex:1}}><span style={{fontSize:11,fontWeight:600,color:"var(--c-text)"}}>{a.t}</span><span style={{fontSize:9,color:"var(--c-muted)",marginLeft:6}}>{MO[a.mo]}</span></div><SBdg s={a.s}/><span className={cs.mono} style={{fontSize:12,fontWeight:700,width:60,textAlign:"right",color:"var(--c-text)"}}>{fmtE(a.b)}</span><button onClick={()=>dp({type:"DL",id:a.id})} style={{background:"none",border:"none",color:"var(--c-muted)",cursor:"pointer",fontSize:12}}>\u2715</button></div>;})}
</div>
  </div>;
}

// ══ KAMPAGNEN ══
export function Kampagnen(){
  const{state:st,dispatch:dp}=useApp();const[fi,sFi]=useState("alle");const[sa,setSa]=useState(false);const[fm,sFm]=useState({t:"",ch:"Lokal",st:"",en:"",b:"",d:"",typ:"lokal",s:"geplant"});
  const ak=()=>{if(!fm.t)return;dp({type:"AK",d:{...fm,b:Number(fm.b)||0}});setSa(false);};
  const fl=st.ka.filter(k=>fi==="hq"?k.typ==="hq":fi==="lokal"?k.typ==="lokal":fi==="aktiv"?k.s==="aktiv":true).sort((a,b)=>(a.st||"").localeCompare(b.st||""));
  const tM=MO.slice(0,6);
  return<div>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>{[{l:"Gesamt",v:st.ka.length},{l:"Aktiv",v:st.ka.filter(k=>k.s==="aktiv").length,c:"#16a34a"},{l:"HQ",v:st.ka.filter(k=>k.typ==="hq").length,c:"#2563eb"},{l:"Eigene",v:st.ka.filter(k=>k.typ==="lokal").length,c:"#EF7D00"}].map((k,i)=><div key={i} className={cs.card} style={{textAlign:"center",padding:14}}><p className={cs.lbl}>{k.l}</p><p className={cs.mono} style={{fontSize:26,fontWeight:800,color:k.c||"#111827"}}>{k.v}</p></div>)}</div>
<div className={cs.card}><div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div style={{display:"flex",gap:4}}>{[{k:"alle",l:"Alle"},{k:"aktiv",l:"Aktiv"},{k:"hq",l:"\ud83c\udfe2 HQ"},{k:"lokal",l:"\ud83d\udccd Eigene"}].map(f=><button key={f.k} onClick={()=>sFi(f.k)} style={{padding:"4px 10px",borderRadius:7,border:"1px solid "+(fi===f.k?"#EF7D00":"#e5e7eb"),background:fi===f.k?"rgba(239,125,0,0.08)":"transparent",color:fi===f.k?"#EF7D00":"#9ca3af",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"Outfit"}}>{f.l}</button>)}</div><button onClick={()=>setSa(!sa)} style={{padding:"6px 14px",background:"#EF7D00",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Outfit"}}>+ Eigene Aktion</button></div>
  {fl.map(k=><div key={k.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid var(--c-border2)"}}><div style={{width:3,height:28,borderRadius:2,background:k.typ==="hq"?"#2563eb":"#EF7D00",flexShrink:0}}/><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}><span style={{fontSize:12,fontWeight:700,color:"var(--c-text)"}}>{k.t}</span><SBdg s={k.s}/>{k.typ==="hq"&&<Bdg text="HQ" color="#2563eb"/>}</div><div style={{display:"flex",gap:10,fontSize:9,color:"var(--c-muted)"}}><span>{k.ch}</span>{k.st&&<span>{k.st.slice(5)}\u2192{k.en?.slice(5)||"?"}</span>}<span className={cs.mono}>{fmtE(k.b)}</span></div></div>{k.typ==="lokal"&&<button onClick={()=>dp({type:"DK",id:k.id})} style={{background:"none",border:"none",color:"var(--c-muted)",cursor:"pointer",fontSize:12}}>\u2715</button>}</div>)}
</div>
  </div>;
}

// ══ REICHWEITE ══
export function Reichweite(){
  const[rf,sRf]=useState("alle");const fr=GMB.revs.filter(r=>rf==="offen"?!r.ok:rf==="kritisch"?r.r<=3:true);
  return<div>
<div className={cs.card}><div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><div><h2 style={{fontSize:15,fontWeight:800,color:"var(--c-text)"}}>Aktive Kampagnen</h2><p style={{fontSize:10,color:"var(--c-muted)"}}>Was das HQ f\u00fcr dich schaltet</p></div><Bdg text="\u25cf LIVE" color="#16a34a"/></div>
  {ADS.map((c,i)=><div key={i} style={{padding:12,background:"var(--c-bg2)",borderRadius:10,marginBottom:6,borderLeft:"3px solid "+c.co}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:11,fontWeight:700,color:"var(--c-text)"}}>{c.n}</span><Bdg text={c.ch} color={c.co}/></div><span className={cs.mono} style={{fontSize:12,fontWeight:700,color:"var(--c-text)"}}>{fmtE(c.sp)}</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr) 1.2fr",gap:8}}>{[["Impr.",fmt(c.im)],["Klicks",fmt(c.cl)],["CTR",c.ctr+"%"],["CPC",c.cpc.toFixed(2)+"\u20ac"],["Leads",""+c.le]].map(([l,v],j)=><div key={j}><p style={{fontSize:7,color:"var(--c-muted)",textTransform:"uppercase"}}>{l}</p><p className={cs.mono} style={{fontSize:12,fontWeight:700,color:l==="Leads"&&c.le>0?"#16a34a":"#111827"}}>{v}</p></div>)}<div><p style={{fontSize:7,color:"var(--c-muted)",textTransform:"uppercase"}}>Budget</p><Bar value={c.sp} max={c.bu} color={c.co} h={3}/></div></div></div>)}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
  <div className={cs.card}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#4285F4,#34A853)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:14,fontWeight:900}}>G</span></div><div><h2 style={{fontSize:13,fontWeight:800,color:"var(--c-text)"}}>Google My Business</h2><div style={{display:"flex",alignItems:"center",gap:3}}><span style={{color:"#fbbf24",fontSize:12}}>\u2605</span><span className={cs.mono} style={{fontSize:13,fontWeight:700,color:"var(--c-text)"}}>{GMB.ra}</span><span style={{fontSize:9,color:"var(--c-muted)"}}>({GMB.rv})</span></div></div></div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{GMB.kpis.map((k,i)=><div key={i} style={{padding:8,background:"var(--c-bg2)",borderRadius:8,textAlign:"center"}}><span style={{fontSize:12}}>{k.i}</span><p className={cs.mono} style={{fontSize:14,fontWeight:700,color:"var(--c-text)",marginTop:1}}>{fmt(k.v)}</p><p style={{fontSize:7,color:"var(--c-muted)"}}>{k.l}</p><p className={cs.mono} style={{fontSize:8,color:k.c>0?"#16a34a":"#dc2626"}}>{k.c>0?"+":""}{k.c}%</p></div>)}</div>
  </div>
  <div className={cs.card}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><h2 style={{fontSize:13,fontWeight:800,color:"var(--c-text)"}}>\u2b50 Bewertungen</h2><div style={{display:"flex",gap:3}}>{[{k:"alle",l:"Alle"},{k:"offen",l:"Offen"},{k:"kritisch",l:"\u26a0 1-3"}].map(f=><button key={f.k} onClick={()=>sRf(f.k)} style={{padding:"2px 7px",borderRadius:5,border:"1px solid "+(rf===f.k?"#EF7D00":"#e5e7eb"),background:rf===f.k?"rgba(239,125,0,0.06)":"transparent",color:rf===f.k?"#EF7D00":"#9ca3af",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"Outfit"}}>{f.l}</button>)}</div></div>
{fr.map((r,i)=><div key={i} style={{padding:8,borderRadius:8,marginBottom:3,background:!r.ok?"#fefce8":"#f9fafb",border:"1px solid "+(r.ok?"#f3f4f6":"#fde68a")}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:1}}><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:10,fontWeight:600,color:"var(--c-text)"}}>{r.a}</span><span style={{fontSize:8,color:"var(--c-muted)"}}>{r.d}</span></div><div style={{display:"flex",alignItems:"center",gap:3}}>{[1,2,3,4,5].map(s=><span key={s} style={{color:s<=r.r?"#fbbf24":"#e5e7eb",fontSize:8}}>\u2605</span>)}{r.ok?<Bdg text="\u2713" color="#16a34a"/>:<Bdg text="OFFEN" color="#ca8a04"/>}</div></div><p style={{fontSize:10,color:"var(--c-sub)",marginLeft:0}}>{r.t}</p></div>)}
  </div>
</div>
<div className={cs.card}><h2 style={{fontSize:15,fontWeight:800,color:"var(--c-text)",marginBottom:3}}>\ud83d\udce1 Organische Reichweite</h2><p style={{fontSize:10,color:"var(--c-muted)",marginBottom:14}}>vit:bikes Brand inkl. deiner Sichtbarkeit</p>
  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>{ORG.map(ch=><div key={ch.n} style={{padding:14,background:"var(--c-bg2)",borderRadius:10,borderTop:"2px solid "+ch.co}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:10}}><span style={{fontSize:18}}>{ch.i}</span><span style={{fontSize:13,fontWeight:800,color:"var(--c-text)"}}>{ch.n}</span></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{ch.kp.map((k,i)=><div key={i}><p style={{fontSize:7,color:"var(--c-muted)",textTransform:"uppercase"}}>{k.l}</p><p className={cs.mono} style={{fontSize:14,fontWeight:700,color:"var(--c-text)"}}>{k.v}</p><p className={cs.mono} style={{fontSize:8,color:"#16a34a"}}>{k.c}</p></div>)}</div><div style={{marginTop:10,padding:6,background:"var(--c-bg)",borderRadius:6,border:"1px solid var(--c-border2)"}}><p style={{fontSize:9,color:"var(--c-sub)"}}>\ud83d\udccd {ch.no}</p></div></div>)}</div>
</div>
  </div>;
}

// ══ APP WRAPPER (shared state) ══
export function MktApp({tab}){
  const[state,dispatch]=useReducer(reducer,{lo:DL,ka:DKA});
  const comps={cockpit:Cockpit,budget:Budget,kampagnen:Kampagnen,reichweite:Reichweite};
  const C=comps[tab]||Cockpit;
  return<Ctx.Provider value={{state,dispatch}}><C/></Ctx.Provider>;
}

// Mount into portal containers
const mktState={lo:DL,ka:DKA};
export function mountMktTab(tab,elId){
  const el=document.getElementById(elId);
  if(el&&!el._mounted){el._mounted=true;ReactDOM.createRoot(el).render(<MktApp tab={tab}/>);}
}

// Observe tab visibility to mount on first show
const mktObs=new MutationObserver(()=>{
  const tabs={mktReactCockpit:"cockpit",mktReactBudget:"budget",mktReactKampagnen:"kampagnen",mktReactReichweite:"reichweite"};
  Object.entries(tabs).forEach(([elId,tab])=>{
const el=document.getElementById(elId);
if(el&&el.offsetParent!==null) mountMktTab(tab,elId);
  });
});

// Start observing when marketing view becomes visible
const initMkt=()=>{
  const mv=document.getElementById("marketingView");
  if(mv){mktObs.observe(mv,{attributes:true,subtree:true,attributeFilter:["style"]});}
  // Mount cockpit immediately if visible
  setTimeout(()=>mountMktTab("cockpit","mktReactCockpit"),100);
};

// Hook into existing showMarketingTab
const _origMktTab=window.showMarketingTab;
if(_origMktTab){
  window.showMarketingTab=function(t){
_origMktTab(t);
setTimeout(()=>{
  const tabs={cockpit:"mktReactCockpit",budget:"mktReactBudget",kampagnen:"mktReactKampagnen",reichweite:"mktReactReichweite"};
  if(tabs[t]) mountMktTab(t,tabs[t]);
},50);
  };
}

// Init on DOM ready
if(document.readyState==="complete") initMkt();
else window.addEventListener("load",initMkt);
})();
</script>



// Strangler Fig
const _exports = {Col,AddModal,SalesForm,ScanUploadModal,DetailModal,AutoModal,Scores,Funnel,Badges,DropZone,PipelineApp,reducer,Bar,Bdg,SBdg,Ring,Cockpit,Budget,Kampagnen,Reichweite,MktApp,mountMktTab};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[react-components.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
