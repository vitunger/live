(function(){
const{useState,useReducer,useEffect,createContext,useContext}=React;
const uid=()=>Math.random().toString(36).slice(2,9);
const fmt=v=>v.toLocaleString("de-DE");
const fmtE=v=>fmt(v)+" \u20ac";
const pct=(a,b)=>b?Math.round(a/b*100):0;
const clp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ST=(function(){var dm=window.isDemoMode||(window.sbProfile&&(window.sbProfile.status==='demo'||window.sbProfile.status==='demo_active'));return{name:dm?'Muster-Filiale':(window.sbProfile&&window.sbProfile.standort_name?window.sbProfile.standort_name:'Mein Standort'),plz:dm?'12345':(window.sbProfile&&window.sbProfile.standort_plz?window.sbProfile.standort_plz:'')};})(),YR=2026,UZ=838000,OBM=1500,LBM=600;
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
function reducer(s,a){switch(a.type){case"AL":return{...s,lo:[...s.lo,{id:uid(),...a.d}]};case"DL":return{...s,lo:s.lo.filter(x=>x.id!==a.id)};case"AK":return{...s,ka:[...s.ka,{id:uid(),...a.d}]};case"DK":return{...s,ka:s.ka.filter(x=>x.id!==a.id)};default:return s;}}
const Ctx=createContext(null);
const useApp=()=>useContext(Ctx);

// Shared
const cs={card:"bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4 hover:shadow-md transition-shadow",mono:"font-mono",lbl:"text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1"};
function Bar({value,max,color="#EF7D00",h=4}){const p=max?clp(Math.round(value/max*100),0,100):0;return<div style={{height:h,background:"var(--c-bg3)",borderRadius:h,overflow:"hidden",width:"100%"}}><div style={{height:"100%",width:p+"%",background:color,borderRadius:h,transition:"width .8s ease"}}/></div>;}
function Bdg({text,color="#EF7D00"}){return<span className={cs.mono} style={{fontSize:9,fontWeight:600,color,background:color+"15",padding:"3px 8px",borderRadius:6}}>{text}</span>;}
function SBdg({s}){const m={aktiv:{t:"LIVE",c:"#16a34a"},geplant:{t:"GEPLANT",c:"#2563eb"},bezahlt:{t:"BEZAHLT",c:"#9ca3af"},laufend:{t:"LAUFEND",c:"#EF7D00"}};const x=m[s]||m.geplant;return<Bdg text={x.t} color={x.c}/>;}
function Ring({score,size=140,sw=7}){const r=(size-sw)/2,ci=2*Math.PI*r,of=ci-(score/100)*ci;return<svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--c-bg3)" strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EF7D00" strokeWidth={sw} strokeDasharray={ci} strokeDashoffset={of} strokeLinecap="round" style={{transition:"stroke-dashoffset 1.2s ease"}}/></svg>;}

// ══ COCKPIT ══
function Cockpit(){
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
function Budget(){
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
function Kampagnen(){
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
function Reichweite(){
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
function MktApp({tab}){
  const[state,dispatch]=useReducer(reducer,{lo:DL,ka:DKA});
  const comps={cockpit:Cockpit,budget:Budget,kampagnen:Kampagnen,reichweite:Reichweite};
  const C=comps[tab]||Cockpit;
  return<Ctx.Provider value={{state,dispatch}}><C/></Ctx.Provider>;
}

// Mount into portal containers
const mktState={lo:DL,ka:DKA};
function mountMktTab(tab,elId){
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
