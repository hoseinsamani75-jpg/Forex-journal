import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  collection, addDoc, getDocs, doc, deleteDoc,
  updateDoc, query, where, orderBy, getDoc, setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

// ─── Constants ────────────────────────────────────────────────
const PAIRS      = ["XAUUSD (طلا)", "US30 (داجونز)"];
const TRENDS     = ["صعودی", "نزولی", "خنثی"];
const DIRECTIONS = ["Long", "Short"];
const RESULTS    = ["برد", "باخت", "بی‌نتیجه"];
const STRUCTURES = ["Spike", "Channel", "Range"];
const FEELINGS   = ["مطمئن", "تردید", "ترس", "طمع"];
const ADMIN_USERNAME = "admin";

const EMPTY_FORM = {
  pair: "XAUUSD (طلا)", direction: "Long",
  m30Trend: "صعودی", m15Trend: "صعودی", structure: "Spike",
  feeling: "مطمئن", result: "برد", rr: "", notes: "",
  date: new Date().toISOString().slice(0, 16),
};

// ─── Helpers ──────────────────────────────────────────────────
const trendColor     = t => t==="صعودی"?"#10b981":t==="نزولی"?"#ef4444":"#f59e0b";
const structureColor = s => s==="Spike"?"#f43f5e":s==="Channel"?"#3b82f6":"#f59e0b";
const structureEmoji = s => s==="Spike"?"⚡":s==="Channel"?"📐":"↔️";
const resultColor    = r => r==="برد"?"#10b981":r==="باخت"?"#ef4444":"#64748b";
const resultEmoji    = r => r==="برد"?"✅":r==="باخت"?"❌":"➖";
const pairLabel      = p => p.includes("طلا")?"🥇 طلا":"📈 داجونز";
const feelingColor   = f => f==="مطمئن"?"#10b981":f==="تردید"?"#f59e0b":f==="ترس"?"#ef4444":"#8b5cf6";
const feelingEmoji   = f => f==="مطمئن"?"😎":f==="تردید"?"🤔":f==="ترس"?"😨":"🤑";

const iStyle = {
  width:"100%", padding:"11px 13px", borderRadius:9,
  background:"#1e293b", border:"1px solid #334155",
  color:"#e2e8f0", fontSize:14, outline:"none",
  boxSizing:"border-box", fontFamily:"inherit",
};
const lStyle = { display:"block", fontSize:12, color:"#64748b", marginBottom:6, fontWeight:600 };

// ─── LoginPage ────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [tab, setTab]     = useState("login");
  const [username, setU]  = useState("");
  const [password, setP]  = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toEmail = u => `${u.toLowerCase()}@forex-journal.app`;

  const handleLogin = async () => {
    setError(""); setLoading(true);
    if (!username || !password) { setError("همه فیلدها را پر کن"); setLoading(false); return; }
    try {
      const cred = await signInWithEmailAndPassword(auth, toEmail(username), password);
      const isAdmin = username.toLowerCase() === ADMIN_USERNAME;
      onLogin({ uid: cred.user.uid, username, isAdmin });
    } catch {
      setError("نام کاربری یا رمز عبور اشتباه است");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setError(""); setLoading(true);
    if (!username || !password) { setError("همه فیلدها را پر کن"); setLoading(false); return; }
    if (username.toLowerCase() === ADMIN_USERNAME) { setError("این نام کاربری رزرو شده"); setLoading(false); return; }
    if (username.length < 3) { setError("نام کاربری حداقل ۳ کاراکتر"); setLoading(false); return; }
    if (password.length < 6) { setError("رمز عبور حداقل ۶ کاراکتر"); setLoading(false); return; }
    try {
      const cred = await createUserWithEmailAndPassword(auth, toEmail(username), password);
      await updateProfile(cred.user, { displayName: username });
      await setDoc(doc(db, "users", cred.user.uid), { username, createdAt: new Date() });
      onLogin({ uid: cred.user.uid, username, isAdmin: false });
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setError("این نام کاربری قبلاً ثبت شده");
      else setError("خطا در ثبت نام. دوباره امتحان کن");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0e1a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Vazirmatn','Segoe UI',sans-serif", direction:"rtl", padding:16 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg,#3b82f6,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 14px" }}>📊</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9" }}>ژورنال فارکس</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>Price Action Trading Journal</div>
          <div style={{ fontSize:15, color:"#3b82f6", marginTop:8, fontStyle:"italic", fontWeight:600, letterSpacing:1 }}>"The world is yours"</div>
        </div>
        <div style={{ background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:20, padding:28, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", background:"#0a0e1a", borderRadius:10, padding:4, marginBottom:24 }}>
            {[["login","ورود"],["register","ثبت نام"]].map(([v,l]) => (
              <button key={v} onClick={() => { setTab(v); setError(""); setU(""); setP(""); }} style={{ flex:1, padding:"9px", borderRadius:8, border:"none", cursor:"pointer", background:tab===v?"linear-gradient(135deg,#3b82f6,#06b6d4)":"transparent", color:tab===v?"#fff":"#64748b", fontWeight:700, fontSize:14, fontFamily:"inherit" }}>{l}</button>
            ))}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lStyle}>نام کاربری</label>
            <input value={username} onChange={e=>setU(e.target.value)} placeholder="username" style={iStyle} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?handleLogin():handleRegister())} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={lStyle}>رمز عبور</label>
            <input type="password" value={password} onChange={e=>setP(e.target.value)} placeholder="••••••••" style={iStyle} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?handleLogin():handleRegister())} />
          </div>
          {error && <div style={{ padding:"10px 12px", borderRadius:8, background:"#ef444411", border:"1px solid #ef444433", color:"#ef4444", fontSize:13, marginBottom:14 }}>{error}</div>}
          <button onClick={tab==="login"?handleLogin:handleRegister} disabled={loading} style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#3b82f6,#06b6d4)", color:"#fff", fontSize:16, fontWeight:700, fontFamily:"inherit", opacity:loading?0.7:1 }}>
            {loading?"در حال پردازش...":(tab==="login"?"ورود به حساب":"ساخت حساب جدید")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TradeForm ────────────────────────────────────────────────
function TradeForm({ initial, onSave, onCancel, saveLabel }) {
  const [f, setF] = useState({ ...initial });
  const [rrError, setRrError] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const btnRow = (key, options, colorFn, labelFn) => (
    <div style={{ display:"flex", gap:6 }}>
      {options.map(o => (
        <button key={o} onClick={() => set(key, o)} style={{ flex:1, padding:"9px 4px", borderRadius:8, border:"none", cursor:"pointer", background:f[key]===o?(colorFn?colorFn(o):"#3b82f6"):"#1e293b", color:f[key]===o?"#fff":"#64748b", fontWeight:700, fontSize:12, fontFamily:"inherit" }}>
          {labelFn?labelFn(o):o}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
      <div style={{ gridColumn:"1/-1" }}>
        <label style={lStyle}>تاریخ و ساعت</label>
        <input type="datetime-local" value={f.date} onChange={e=>set("date",e.target.value)} style={iStyle} />
      </div>
      <div>
        <label style={lStyle}>نماد</label>
        {btnRow("pair", PAIRS, ()=>"#f59e0b", pairLabel)}
      </div>
      <div>
        <label style={lStyle}>جهت</label>
        {btnRow("direction", DIRECTIONS, d=>d==="Long"?"#10b981":"#ef4444", d=>d==="Long"?"📈 Long":"📉 Short")}
      </div>
      <div>
        <label style={lStyle}>ترند M30</label>
        {btnRow("m30Trend", TRENDS, trendColor)}
      </div>
      <div>
        <label style={lStyle}>ترند M15</label>
        {btnRow("m15Trend", TRENDS, trendColor)}
      </div>
      <div style={{ gridColumn:"1/-1" }}>
        <label style={lStyle}>ساختار بازار</label>
        {btnRow("structure", STRUCTURES, structureColor, s=>`${structureEmoji(s)} ${s}`)}
      </div>
      <div style={{ gridColumn:"1/-1" }}>
        <label style={lStyle}>احساس هنگام ورود</label>
        {btnRow("feeling", FEELINGS, feelingColor, f=>`${feelingEmoji(f)} ${f}`)}
      </div>
      <div style={{ gridColumn:"1/-1" }}>
        <label style={lStyle}>RR</label>
        <input type="number" step="0.1" min="0" placeholder="مثال: 1.5" value={f.rr}
          onChange={e=>{set("rr",e.target.value);setRrError(false);}}
          style={{ ...iStyle, borderColor:rrError?"#ef4444":"#8b5cf633", color:"#8b5cf6", fontWeight:700 }} />
        {rrError && <div style={{ color:"#ef4444", fontSize:12, marginTop:4 }}>لطفاً RR را وارد کن</div>}
      </div>
      <div style={{ gridColumn:"1/-1" }}>
        <label style={lStyle}>نتیجه</label>
        {btnRow("result", RESULTS, resultColor, r=>`${resultEmoji(r)} ${r}`)}
      </div>
      <div style={{ gridColumn:"1/-1" }}>
        <label style={lStyle}>توضیحات</label>
        <textarea value={f.notes} onChange={e=>set("notes",e.target.value)} placeholder="مثلاً: پین بار روی سطح حمایت..." rows={3} style={{ ...iStyle, resize:"vertical", fontFamily:"inherit" }} />
      </div>
      <div style={{ gridColumn:"1/-1", display:"flex", gap:8 }}>
        <button onClick={()=>{ if(!f.rr){setRrError(true);return;} onSave(f); }} style={{ flex:1, padding:"13px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#3b82f6,#06b6d4)", color:"#fff", fontSize:15, fontWeight:700, fontFamily:"inherit" }}>
          {saveLabel||"✓ ثبت ترید"}
        </button>
        {onCancel && <button onClick={onCancel} style={{ padding:"13px 18px", borderRadius:10, border:"1px solid #334155", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>انصراف</button>}
      </div>
    </div>
  );
}

// ─── TradeCard ────────────────────────────────────────────────
function TradeCard({ trade, onDelete, onEdit, readOnly }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("view");
  const withM30 = (trade.direction==="Long"&&trade.m30Trend==="صعودی")||(trade.direction==="Short"&&trade.m30Trend==="نزولی");
  const isWin  = trade.result==="برد";
  const isLoss = trade.result==="باخت";

  return (
    <div style={{ background:"#0f172a", border:`1px solid ${isWin?"#10b98133":isLoss?"#ef444433":"#1e293b"}`, borderRadius:12, overflow:"hidden" }}>
      <div onClick={()=>{ setOpen(o=>!o); setMode("view"); }} style={{ padding:"13px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:34, height:34, borderRadius:8, fontSize:16, background:isWin?"#10b98122":isLoss?"#ef444422":"#1e293b", display:"flex", alignItems:"center", justifyContent:"center" }}>{resultEmoji(trade.result)}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontWeight:700, color:"#f1f5f9", fontSize:14 }}>{pairLabel(trade.pair)}</span>
            <span style={{ fontSize:11, padding:"2px 7px", borderRadius:20, fontWeight:700, background:trade.direction==="Long"?"#10b98122":"#ef444422", color:trade.direction==="Long"?"#10b981":"#ef4444" }}>{trade.direction}</span>
            <span style={{ fontSize:11, padding:"2px 7px", borderRadius:20, fontWeight:600, background:structureColor(trade.structure)+"22", color:structureColor(trade.structure) }}>{structureEmoji(trade.structure)} {trade.structure}</span>
            {!withM30 && <span style={{ fontSize:10, padding:"2px 6px", borderRadius:20, background:"#f59e0b22", color:"#f59e0b" }}>خلاف M30</span>}
          </div>
          <div style={{ fontSize:11, color:"#64748b", marginTop:3 }}>{new Date(trade.date).toLocaleString("fa-IR")}</div>
        </div>
        <div style={{ textAlign:"left", flexShrink:0 }}>
          {trade.rr && <div style={{ fontSize:13, color:"#8b5cf6", fontWeight:700 }}>RR: {trade.rr}</div>}
          <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>M30: <span style={{ color:trendColor(trade.m30Trend) }}>{trade.m30Trend}</span></div>
        </div>
        <div style={{ color:"#475569", fontSize:11, flexShrink:0 }}>{open?"▲":"▼"}</div>
      </div>

      {open && mode==="view" && (
        <div style={{ padding:"0 16px 14px", borderTop:"1px solid #1e293b" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginTop:12 }}>
            {[
              { label:"ساختار", value:`${structureEmoji(trade.structure)} ${trade.structure}`, color:structureColor(trade.structure) },
              { label:"M30", value:trade.m30Trend, color:trendColor(trade.m30Trend) },
              { label:"M15", value:trade.m15Trend, color:trendColor(trade.m15Trend) },
              { label:"احساس", value:`${feelingEmoji(trade.feeling||"مطمئن")} ${trade.feeling||"مطمئن"}`, color:feelingColor(trade.feeling||"مطمئن") },
            ].map((f,i) => (
              <div key={i} style={{ background:"#0a0e1a", borderRadius:8, padding:10, textAlign:"center" }}>
                <div style={{ fontSize:11, color:"#475569" }}>{f.label}</div>
                <div style={{ fontSize:12, color:f.color, fontWeight:700, marginTop:3 }}>{f.value}</div>
              </div>
            ))}
          </div>
          {trade.notes && <div style={{ marginTop:8, padding:10, borderRadius:8, background:"#0a0e1a", color:"#94a3b8", fontSize:13, lineHeight:1.6 }}>{trade.notes}</div>}
          {!readOnly && (
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button onClick={()=>setMode("edit")} style={{ padding:"7px 14px", borderRadius:8, background:"#3b82f611", border:"1px solid #3b82f633", color:"#3b82f6", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>✏️ اصلاح</button>
              <button onClick={()=>setMode("confirmDelete")} style={{ padding:"7px 14px", borderRadius:8, background:"#ef444411", border:"1px solid #ef444433", color:"#ef4444", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>🗑 حذف</button>
            </div>
          )}
        </div>
      )}

      {open && mode==="confirmDelete" && (
        <div style={{ padding:"14px 16px", borderTop:"1px solid #1e293b", background:"#1a0a0a" }}>
          <div style={{ color:"#ef4444", fontSize:14, fontWeight:600, marginBottom:10 }}>این ترید حذف شود؟</div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>onDelete(trade.id)} style={{ padding:"8px 16px", borderRadius:8, background:"#ef4444", border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>بله، حذف کن</button>
            <button onClick={()=>setMode("view")} style={{ padding:"8px 16px", borderRadius:8, background:"#1e293b", border:"1px solid #334155", color:"#94a3b8", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>انصراف</button>
          </div>
        </div>
      )}

      {open && mode==="edit" && (
        <div style={{ padding:"12px 16px 16px", borderTop:"1px solid #1e3a5f", background:"#0a1628" }}>
          <div style={{ fontSize:13, color:"#3b82f6", fontWeight:700, marginBottom:12 }}>✏️ ویرایش ترید</div>
          <TradeForm initial={trade} saveLabel="✓ ذخیره تغییرات"
            onSave={u=>{ onEdit({...u,id:trade.id}); setMode("view"); setOpen(false); }}
            onCancel={()=>setMode("view")} />
        </div>
      )}
    </div>
  );
}

// ─── StatsView ────────────────────────────────────────────────
function StatsView({ trades }) {
  const finished    = trades.filter(t=>t.result!=="بی‌نتیجه");
  const wins        = finished.filter(t=>t.result==="برد");
  const losses      = finished.filter(t=>t.result==="باخت");
  const winRate     = finished.length?((wins.length/finished.length)*100).toFixed(1):0;
  const withM30     = finished.filter(t=>(t.direction==="Long"&&t.m30Trend==="صعودی")||(t.direction==="Short"&&t.m30Trend==="نزولی"));
  const withM30W    = withM30.filter(t=>t.result==="برد");
  const withM30WR   = withM30.length?((withM30W.length/withM30.length)*100).toFixed(1):0;
  const againstM30  = finished.filter(t=>(t.direction==="Long"&&t.m30Trend==="نزولی")||(t.direction==="Short"&&t.m30Trend==="صعودی"));
  const againstM30W = againstM30.filter(t=>t.result==="برد");
  const againstM30WR= againstM30.length?((againstM30W.length/againstM30.length)*100).toFixed(1):0;
  const pairStats   = {};
  finished.forEach(t=>{ if(!pairStats[t.pair]) pairStats[t.pair]={w:0,l:0}; t.result==="برد"?pairStats[t.pair].w++:pairStats[t.pair].l++; });

  const SC = ({title,children}) => (
    <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:16, padding:18, marginBottom:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#94a3b8", marginBottom:14 }}>{title}</div>
      {children}
    </div>
  );
  const Bar = ({wr, color}) => (
    <div style={{ flex:1, background:"#0a0e1a", borderRadius:6, height:24, overflow:"hidden" }}>
      {wr>0 && <div style={{ width:`${wr}%`, height:"100%", background:color||( wr>=60?"#10b981":wr>=40?"#f59e0b":"#ef4444"), borderRadius:6, display:"flex", alignItems:"center", paddingRight:8, fontSize:11, color:"#fff", fontWeight:700 }}>{wr}%</div>}
    </div>
  );

  return (
    <div>
      <SC title="مقایسه وین ریت با فیلتر M30">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { label:"کل", value:`${winRate}%`, sub:`${wins.length}W/${losses.length}L`, color:"#3b82f6" },
            { label:"هم‌جهت M30", value:`${withM30WR}%`, sub:`${withM30W.length}/${withM30.length}`, color:"#10b981" },
            { label:"خلاف M30", value:`${againstM30WR}%`, sub:`${againstM30W.length}/${againstM30.length}`, color:"#ef4444" },
          ].map((s,i) => (
            <div key={i} style={{ background:"#0a0e1a", borderRadius:10, padding:"12px 8px", textAlign:"center" }}>
              <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:"#94a3b8", margin:"3px 0" }}>{s.label}</div>
              <div style={{ fontSize:11, color:"#475569" }}>{s.sub}</div>
            </div>
          ))}
        </div>
        {againstM30.length>0 && parseFloat(withM30WR)>parseFloat(againstM30WR) && (
          <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, background:"#10b98111", border:"1px solid #10b98133", color:"#10b981", fontSize:13 }}>
            💡 تریدهای هم‌جهت با M30 وین ریت {(parseFloat(withM30WR)-parseFloat(againstM30WR)).toFixed(1)}٪ بهتر دارن!
          </div>
        )}
      </SC>

      {Object.keys(pairStats).length>0 && (
        <SC title="عملکرد نمادها">
          {Object.entries(pairStats).map(([pair,stat]) => {
            const wr = ((stat.w/(stat.w+stat.l))*100).toFixed(0);
            return (
              <div key={pair} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <div style={{ width:90, fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{pairLabel(pair)}</div>
                <Bar wr={Number(wr)} />
                <div style={{ fontSize:11, color:"#64748b", width:50 }}>{stat.w}W/{stat.l}L</div>
              </div>
            );
          })}
        </SC>
      )}

      <SC title="همسویی M15 و M30">
        {(() => {
          const ali  = finished.filter(t=>t.m15Trend===t.m30Trend);
          const nAli = finished.filter(t=>t.m15Trend!==t.m30Trend);
          const wr1  = ali.length?((ali.filter(t=>t.result==="برد").length/ali.length)*100).toFixed(1):0;
          const wr2  = nAli.length?((nAli.filter(t=>t.result==="برد").length/nAli.length)*100).toFixed(1):0;
          return (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[{label:"هم‌جهت",v:wr1,n:ali.length,c:"#10b981"},{label:"مخالف",v:wr2,n:nAli.length,c:"#f59e0b"}].map((s,i)=>(
                <div key={i} style={{ background:"#0a0e1a", borderRadius:10, padding:14, textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:800, color:s.c }}>{s.v}%</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>M15 و M30 {s.label}</div>
                  <div style={{ fontSize:11, color:"#475569" }}>{s.n} ترید</div>
                </div>
              ))}
            </div>
          );
        })()}
      </SC>

      <SC title="عملکرد بر اساس احساس">
        {(() => {
          const hasData = FEELINGS.some(f=>finished.some(t=>t.feeling===f));
          if (!hasData) return <div style={{ color:"#475569", fontSize:13 }}>هنوز داده کافی نیست</div>;
          const best = FEELINGS.map(f=>{ const ft=finished.filter(t=>t.feeling===f); const wr=ft.length?(ft.filter(t=>t.result==="برد").length/ft.length)*100:-1; return {f,wr,count:ft.length}; }).filter(x=>x.count>0).sort((a,b)=>b.wr-a.wr)[0];
          return (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {FEELINGS.map(f=>{ const ft=finished.filter(t=>t.feeling===f); const ftW=ft.filter(t=>t.result==="برد"); const wr=ft.length?((ftW.length/ft.length)*100).toFixed(0):null;
                return (
                  <div key={f} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:72, fontSize:12, fontWeight:700, color:feelingColor(f) }}>{feelingEmoji(f)} {f}</div>
                    <Bar wr={Number(wr)} color={feelingColor(f)} />
                    <div style={{ fontSize:11, color:"#64748b", width:50 }}>{ft.length>0?`${ftW.length}W/${ft.length-ftW.length}L`:"—"}</div>
                  </div>
                );
              })}
              {best && <div style={{ marginTop:10, padding:"10px 12px", borderRadius:8, background:feelingColor(best.f)+"11", border:`1px solid ${feelingColor(best.f)}33`, color:feelingColor(best.f), fontSize:13 }}>{feelingEmoji(best.f)} بهترین احساس: <strong>{best.f}</strong> با وین ریت {best.wr.toFixed(0)}٪</div>}
            </div>
          );
        })()}
      </SC>

      <SC title="عملکرد روزهای هفته">
        {(() => {
          const days = [{name:"دوشنبه",idx:1},{name:"سه‌شنبه",idx:2},{name:"چهارشنبه",idx:3},{name:"پنجشنبه",idx:4},{name:"جمعه",idx:5}];
          const dayStats = days.map(d=>{ const dt=finished.filter(t=>new Date(t.date).getDay()===d.idx); const dw=dt.filter(t=>t.result==="برد"); const wr=dt.length?((dw.length/dt.length)*100).toFixed(0):null; return {...d,total:dt.length,wins:dw.length,wr}; }).filter(d=>d.total>0);
          if (dayStats.length===0) return <div style={{ color:"#475569", fontSize:13 }}>هنوز داده کافی نیست</div>;
          const best = dayStats.reduce((a,b)=>parseFloat(a.wr)>parseFloat(b.wr)?a:b,dayStats[0]);
          return (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {dayStats.sort((a,b)=>parseFloat(b.wr)-parseFloat(a.wr)).map(d=>(
                  <div key={d.name} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:72, fontSize:12, fontWeight:700, color:d.name===best.name?"#f59e0b":"#94a3b8" }}>{d.name===best.name&&"⭐"}{d.name}</div>
                    <Bar wr={Number(d.wr)} />
                    <div style={{ fontSize:11, color:"#64748b", width:50 }}>{d.wins}W/{d.total-d.wins}L</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, padding:"10px 12px", borderRadius:8, background:"#f59e0b11", border:"1px solid #f59e0b33", color:"#f59e0b", fontSize:13 }}>⭐ بهترین روز: <strong>{best.name}</strong> با وین ریت {best.wr}٪</div>
            </>
          );
        })()}
      </SC>

      <SC title="عملکرد ساختار بازار">
        {STRUCTURES.map(s=>{ const st=finished.filter(t=>t.structure===s); const stW=st.filter(t=>t.result==="برد"); const wr=st.length?((stW.length/st.length)*100).toFixed(0):0;
          return (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ width:80, fontSize:12, fontWeight:700, color:structureColor(s) }}>{structureEmoji(s)} {s}</div>
              <Bar wr={Number(wr)} color={structureColor(s)} />
              <div style={{ fontSize:11, color:"#64748b", width:50 }}>{st.length>0?`${stW.length}W/${st.length-stW.length}L`:"—"}</div>
            </div>
          );
        })}
      </SC>

      {trades.length<10 && <div style={{ padding:"13px", borderRadius:10, background:"#1e293b", border:"1px solid #334155", color:"#94a3b8", fontSize:13, textAlign:"center" }}>📈 برای آمار دقیق‌تر، حداقل ۲۰ ترید ثبت کن ({trades.length}/20)</div>}
    </div>
  );
}

// ─── JournalView ──────────────────────────────────────────────
function JournalView({ user }) {
  const [trades, setTrades]     = useState([]);
  const [view, setView]         = useState("journal");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    loadTrades();
  }, [user.uid]);

  const loadTrades = async () => {
    try {
      const q = query(collection(db,"trades"), where("uid","==",user.uid));
      const snap = await getDocs(q);
      setTrades(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch {}
    setLoading(false);
  };

  const addTrade = async (f) => {
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db,"trades"), { ...f, uid:user.uid, username:user.username, createdAt:new Date() });
      setTrades(prev => [{ id:docRef.id, ...f, uid:user.uid, username:user.username }, ...prev]);
      setShowForm(false);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const editTrade = async (updated) => {
    setSaving(true);
    try {
      const { id, ...data } = updated;
      await updateDoc(doc(db,"trades",id), data);
      setTrades(prev => prev.map(t=>t.id===id?updated:t));
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const deleteTrade = async (id) => {
    try {
      await deleteDoc(doc(db,"trades",id));
      setTrades(prev => prev.filter(t=>t.id!==id));
    } catch(e) { console.error(e); }
  };

  const finished = trades.filter(t=>t.result!=="بی‌نتیجه");
  const wins     = finished.filter(t=>t.result==="برد");
  const winRate  = finished.length?((wins.length/finished.length)*100).toFixed(1):0;
  const withM30  = finished.filter(t=>(t.direction==="Long"&&t.m30Trend==="صعودی")||(t.direction==="Short"&&t.m30Trend==="نزولی"));
  const withM30W = withM30.filter(t=>t.result==="برد");
  const withM30WR= withM30.length?((withM30W.length/withM30.length)*100).toFixed(1):0;
  const avgRR    = wins.length?(wins.reduce((s,t)=>s+parseFloat(t.rr||0),0)/wins.length).toFixed(2):"—";

  if (loading) return <div style={{ color:"#64748b", padding:40, textAlign:"center" }}>در حال بارگذاری...</div>;

  return (
    <>
      <div style={{ display:"flex", gap:8 }}>
        {[["journal","تریدها"],["stats","آمار"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{ padding:"7px 13px", borderRadius:8, border:"none", cursor:"pointer", background:view===v?"linear-gradient(135deg,#3b82f6,#06b6d4)":"#1e293b", color:view===v?"#fff":"#94a3b8", fontSize:13, fontWeight:600, fontFamily:"inherit" }}>{l}</button>
        ))}
        {saving && <span style={{ fontSize:11, color:"#64748b", alignSelf:"center" }}>ذخیره...</span>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          {label:"کل تریدها",value:trades.length,color:"#3b82f6"},
          {label:"وین ریت",value:`${winRate}%`,color:Number(winRate)>=60?"#10b981":"#f59e0b"},
          {label:"با M30",value:`${withM30WR}%`,color:Number(withM30WR)>=60?"#10b981":"#f59e0b"},
          {label:"میانگین RR",value:avgRR,color:"#8b5cf6"},
        ].map((s,i)=>(
          <div key={i} style={{ background:"#0f172a", border:`1px solid ${s.color}22`, borderRadius:12, padding:"11px 8px", textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10, color:"#64748b", marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {view==="journal" && (
        <>
          <button onClick={()=>setShowForm(s=>!s)} style={{ width:"100%", padding:"13px", borderRadius:12, border:"2px dashed #1e3a5f", background:showForm?"#1e3a5f22":"transparent", color:"#3b82f6", fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            {showForm?"✕ بستن فرم":"+ ثبت ترید جدید"}
          </button>
          {showForm && (
            <div style={{ background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:16, padding:18 }}>
              <TradeForm initial={EMPTY_FORM} onSave={addTrade} onCancel={()=>setShowForm(false)} />
            </div>
          )}
          {trades.length===0
            ? <div style={{ textAlign:"center", color:"#475569", padding:"50px 0", fontSize:15 }}>هنوز تریدی ثبت نشده 🎯</div>
            : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {trades.map(t=><TradeCard key={t.id} trade={t} onDelete={deleteTrade} onEdit={editTrade} />)}
              </div>
          }
        </>
      )}
      {view==="stats" && <StatsView trades={trades} />}
    </>
  );
}

// ─── AdminView ────────────────────────────────────────────────
function AdminView() {
  const [users, setUsers]           = useState([]);
  const [selectedUser, setSelected] = useState(null);
  const [userTrades, setUserTrades] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState("journal");

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db,"users"));
      setUsers(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    })();
  }, []);

  const loadUserTrades = async (u) => {
    setSelected(u);
    const q = query(collection(db,"trades"), where("uid","==",u.id));
    const snap = await getDocs(q);
    setUserTrades(snap.docs.map(d=>({id:d.id,...d.data()})));
    setView("journal");
  };

  if (loading) return <div style={{ color:"#64748b", padding:40, textAlign:"center" }}>در حال بارگذاری...</div>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ background:"#0f172a", border:"1px solid #f59e0b33", borderRadius:16, padding:18 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#f59e0b", marginBottom:14 }}>👑 پنل ادمین — انتخاب کاربر</div>
        {users.length===0
          ? <div style={{ color:"#475569", fontSize:13 }}>هنوز هیچ کاربری ثبت نام نکرده</div>
          : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {users.map(u=>(
                <button key={u.id} onClick={()=>loadUserTrades(u)} style={{ padding:"12px 16px", borderRadius:10, border:`1px solid ${selectedUser?.id===u.id?"#3b82f6":"#1e3a5f"}`, background:selectedUser?.id===u.id?"#1e3a5f22":"transparent", color:selectedUser?.id===u.id?"#3b82f6":"#94a3b8", cursor:"pointer", textAlign:"right", fontSize:14, fontWeight:600, fontFamily:"inherit", display:"flex", alignItems:"center", gap:10 }}>
                  <span>👤</span><span>{u.username}</span>
                  {selectedUser?.id===u.id && <span style={{ marginRight:"auto", fontSize:11 }}>← انتخاب شده</span>}
                </button>
              ))}
            </div>
        }
      </div>

      {selectedUser && (
        <>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:14, color:"#94a3b8", fontWeight:600 }}>ژورنال: <span style={{ color:"#3b82f6" }}>{selectedUser.username}</span></div>
            <div style={{ display:"flex", gap:8 }}>
              {[["journal","تریدها"],["stats","آمار"]].map(([v,l])=>(
                <button key={v} onClick={()=>setView(v)} style={{ padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer", background:view===v?"linear-gradient(135deg,#3b82f6,#06b6d4)":"#1e293b", color:view===v?"#fff":"#94a3b8", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </div>
          {view==="journal" && (
            userTrades.length===0
              ? <div style={{ textAlign:"center", color:"#475569", padding:"30px 0", fontSize:14 }}>این کاربر هنوز تریدی ثبت نکرده</div>
              : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {userTrades.map(t=><TradeCard key={t.id} trade={t} onDelete={()=>{}} onEdit={()=>{}} readOnly />)}
                </div>
          )}
          {view==="stats" && <StatsView trades={userTrades} />}
        </>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isAdmin = firebaseUser.displayName?.toLowerCase() === ADMIN_USERNAME;
        setUser({ uid:firebaseUser.uid, username:firebaseUser.displayName||firebaseUser.email, isAdmin });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0a0e1a", display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b", fontSize:16, fontFamily:"inherit" }}>در حال بارگذاری...</div>
  );

  if (!user) return <LoginPage onLogin={u=>setUser(u)} />;

  return (
    <div style={{ minHeight:"100vh", background:"#0a0e1a", color:"#e2e8f0", fontFamily:"'Vazirmatn','Segoe UI',sans-serif", direction:"rtl" }}>
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e293b)", borderBottom:"1px solid #1e3a5f", padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#3b82f6,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📊</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#f1f5f9" }}>ژورنال فارکس</div>
            <div style={{ fontSize:11, color:"#64748b" }}>{user.isAdmin?"👑 ادمین":`👤 ${user.username}`}</div>
          </div>
        </div>
        <button onClick={()=>signOut(auth)} style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #334155", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>خروج</button>
      </div>
      <div style={{ maxWidth:860, margin:"0 auto", padding:"18px 14px", display:"flex", flexDirection:"column", gap:16 }}>
        {user.isAdmin ? <AdminView /> : <JournalView user={user} />}
      </div>
    </div>
  );
}
