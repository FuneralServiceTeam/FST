"use strict";
let d={events:[],assignments:[],finances:[],ledger:[],announcements:[],posters:[],devotion:{},settings:{},songs:[],people:[],attendance:[],believers:[]},loadErr={},
 month=new Date(new Date().getFullYear(),new Date().getMonth(),1),filter="all",posterCat="all",copyText="",fundSel="operating",lastEvt=null,lyricSize=20,lyricDark=false;
const today0=()=>{const t=new Date();t.setHours(0,0,0,0);return t};
function status(e){if(e.status==="cancelled")return"cancelled";if(e.status==="completed"||!e.date||new Date(e.date+"T23:59:59")<today0())return"completed";return"upcoming"}
function normPoster(p){p=p||{};return{id:String(p.id||""),title:p.title||"",category:p.category||"Other",image:p.image||"",description:p.description||"",eventDate:p.eventDate||p.date||null,venue:p.venue||"",eventId:p.eventId||null,status:p.status||"draft",publishedAt:p.publishedAt||"",alt:p.alt||""}}

async function load(){
 await Promise.all(Object.keys(FILES).map(async k=>{try{
  const r=await fetch(FILES[k],{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);let v=await r.json();
  if(k==="posters"){if(v&&!Array.isArray(v)&&Array.isArray(v.posters))v=v.posters;if(!Array.isArray(v))throw Error('posters.json must contain a "posters" list');d.posters=v.map(normPoster)}
  else if(k==="devotion"||k==="settings"){d[k]=v&&typeof v==="object"&&!Array.isArray(v)?v:{}}
  else d[k]=Array.isArray(v)?v:[];
 }catch(e){loadErr[k]=e.message;console.warn("Could not load "+FILES[k],e)}}));
 const bad=Object.keys(loadErr).filter(k=>k!=="posters");
 $("loadBanner").innerHTML=bad.length?`<div class="banner" role="alert">Some information could not be loaded (${esc(bad.map(k=>k+": "+loadErr[k]).join("; "))}). Please check your connection and refresh.</div>`:"";
 setSplit(d.settings);try{lyricSize=+localStorage.getItem("fst-lyric-size")||20;lyricDark=localStorage.getItem("fst-lyric-dark")==="1"}catch(e){}
 render();route();
}
function render(){renderHome();renderFuHome();renderReach();renderAttend();calendar();events();posters();renderFinance();renderSongs();renderMore()}

/* ---------- announcement-style helpers ---------- */
function rowsHtml(e){
 const R=[["📅","Date",dateLong(e.date),e.date?"("+dayName(e.date)+")":""],["👥","Meet-up at Church",fmtTime(e.meetupTime),e.meetupPlace||""],["🚐","Departure from Church",fmtTime(e.departureTime),""],["🕐","Service Time",fmtTime(e.time),""],["🎤","Preacher / Speaker",e.preacher||"",""],["📍","Venue",e.venue||"",e.venueArea||""],["🔊","Sound System Preparation",e.soundPlace||e.soundBy||"",e.soundPlace?(e.soundBy||""):""]].filter(r=>r[2]);
 return R.map(r=>`<div class="arow"><span class="ico">${r[0]}</span><span class="lab">${esc(r[1])}</span><span class="val">${esc(r[2])}${r[3]?`<small class="sub">${esc(r[3])}</small>`:""}</span></div>`).join("")}
function progHtml(e){const p=programList(e);return p.length?`<h3 class="bar">Program Flow</h3><ol class="prog">${p.map((x,i)=>`<li><b>${i+1}</b><span>${esc(x.item)}</span><em>${esc(x.assignedTo)}</em></li>`).join("")}</ol>`:""}
function dressHtml(e){return e.dressCode?`<div class="arow"><span class="ico">👕</span><span class="lab">Dress Code</span><span class="val s">${esc(e.dressCode)}</span></div>`:""}
function until(s){const n=Math.round((new Date(s+"T12:00:00")-new Date(new Date().setHours(12,0,0,0)))/864e5);return n<=0?"TODAY":n===1?"TOMORROW":"IN "+n+" DAYS"}

/* ---------- Home ---------- */
function renderHome(){
 const t=today0(),nx=d.events.filter(e=>e.status!=="cancelled"&&e.date&&new Date(e.date+"T12:00:00")>=t).sort((a,b)=>a.date.localeCompare(b.date))[0];
 $("nextService").innerHTML=nx?`<article class="card next"><div class="band"><span>NEXT SERVICE</span><span>${until(nx.date)}</span></div><div class="body"><h2>${esc(nx.name)}</h2>${rowsHtml(nx)}${dressHtml(nx)}<div class="actions"><button data-id="${esc(nx.id)}">View full details</button></div></div></article>`:`<article class="card"><p class="eyebrow">NEXT SERVICE</p><p class="muted">No upcoming service scheduled.</p></article>`;
 const v=(d.devotion||{}).verse||{},dv=(d.devotion||{}).devotion||{};
 $("verseCard").classList.toggle("hidden",!v.text);
 if(v.text)$("verseCard").innerHTML=`<p class="eyebrow">VERSE OF THE DAY</p><blockquote>${esc(v.text)}</blockquote><p class="ref">— ${esc(v.ref||"")}${v.version?` <span style="font-weight:400">(${esc(v.version)})</span>`:""}</p>`;
 const has=dv.title||dv.body||dv.audio;$("devotionCard").classList.toggle("hidden",!has);
 if(has)$("devotionCard").innerHTML=`<p class="eyebrow">DAILY DEVOTION</p>${dv.title?`<h3>${esc(dv.title)}</h3>`:""}<p class="muted small">${[dv.date?date(dv.date):"",dv.author?"by "+esc(dv.author):""].filter(Boolean).join(" · ")}</p>${dv.audio?`<audio controls preload="none" src="${esc(dv.audio)}?v=${encodeURIComponent(dv.audioVersion||"")}">Your browser does not support audio.</audio>`:""}${dv.body?`<details><summary>Read the devotion</summary><p class="preline">${esc(dv.body)}</p></details>`:""}`;
 const A=d.announcements.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,2);
 $("homeAnnouncements").innerHTML=A.length?A.map(annCard).join(""):'<p class="muted">No announcements.</p>';
}
const annCard=a=>`<article class="item"><h3>${esc(a.title||"Announcement")}</h3><p class="muted small">${date(a.date)}</p><p class="preline">${esc(a.body||"")}</p></article>`;

/* ---------- Calendar & events ---------- */
function calendar(){const y=month.getFullYear(),m=month.getMonth(),offset=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate();
 $("monthLabel").textContent=month.toLocaleDateString("en-PH",{month:"long",year:"numeric"});
 let h=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<div class="weekday">${x}</div>`).join("");const total=Math.ceil((offset+days)/7)*7;
 for(let i=0;i<total;i++){let n,dt,mu=false;if(i<offset){n=prev-offset+i+1;dt=new Date(y,m-1,n);mu=true}else if(i>=offset+days){n=i-offset-days+1;dt=new Date(y,m+1,n);mu=true}else{n=i-offset+1;dt=new Date(y,m,n)}
  const iso=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
  h+=`<div class="day ${mu?"muted":""}"><span class="day-number">${n}</span>${d.events.filter(e=>e.date===iso).map(e=>`<button class="${status(e)}" data-id="${esc(e.id)}">${esc(e.name)}</button>`).join("")}</div>`}
 $("calendarGrid").innerHTML=h}
function events(){const q=($("eventSearch").value||"").toLowerCase().trim(),L=d.events.filter(e=>(filter==="all"||status(e)===filter)&&[e.name,e.venue,e.venueArea,e.announcement,e.notes].join(" ").toLowerCase().includes(q)).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
 $("eventList").innerHTML=L.length?L.map(e=>`<article class="item"><span class="pill ${status(e)}">${status(e)}</span><h3>${esc(e.name)}</h3><p>📅 ${date(e.date)}${e.time?" · "+esc(fmtTime(e.time)):""}</p><p>📍 ${esc(e.venue||"Venue not provided")}</p><button data-id="${esc(e.id)}">View details</button></article>`).join(""):'<p class="muted">No matching events.</p>'}
function detail(id){const e=d.events.find(x=>String(x.id)===String(id));if(!e)return;const f=d.finances.find(x=>x.eventId===e.id||(x.eventName&&x.eventName===e.name));copyText=announceText(e);lastEvt=e.id;
 $("dlgBody").innerHTML=`<h2>${esc(e.name)}</h2><p><span class="pill ${status(e)}">${status(e)}</span></p>${rowsHtml(e)}${progHtml(e)}${dressHtml(e)}${songsHtml(e)}${evOutreachHtml(e)}${e.announcement?`<h3>Details</h3><p class="preline">${esc(e.announcement)}</p>`:""}${e.notes?`<h3>Notes</h3><p class="preline">${esc(e.notes)}</p>`:""}<div class="actions"><button data-copy>📋 Copy announcement text</button>${f?`<button class="alt" data-report="${esc(f.id)}">💰 View financial report</button>`:""}</div><p id="copyMsg" class="muted small"></p>`;openDlg()}
function openDlg(reader){const dl=$("dlg");dl.classList.toggle("reader",!!reader);if(!dl.open)dl.showModal();dl.scrollTop=0}

/* ---------- Posters ---------- */
function pubPosters(){const seen=new Set();return d.posters.filter(p=>p.status==="published"&&p.id&&p.image&&!seen.has(p.id)&&seen.add(p.id)).sort((a,b)=>(b.publishedAt||"").localeCompare(a.publishedAt||"")||(b.eventDate||"").localeCompare(a.eventDate||""))}
function posterCard(p){return `<button class="poster-card" data-poster="${esc(p.id)}" aria-label="View poster: ${esc(p.title||"Poster")}"><span class="poster-thumb"><img loading="lazy" decoding="async" src="${esc(p.image)}" alt="${esc(p.alt||p.title||"FST poster")}"></span><span class="poster-info"><strong>${esc(p.title||"Poster")}</strong><small>${esc(p.category)}${p.eventDate?" · "+date(p.eventDate):""}</small></span></button>`}
function posters(){const all=pubPosters(),q=($("posterSearch").value||"").toLowerCase().trim(),cats=[...new Set(all.map(p=>p.category))].sort(),sel=$("posterCategory");
 if(sel.dataset.n!==cats.join("|")){sel.innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");sel.dataset.n=cats.join("|");if(!cats.includes(posterCat))posterCat="all"}sel.value=posterCat;
 const L=all.filter(p=>(posterCat==="all"||p.category===posterCat)&&[p.title,p.category,p.description,p.venue].join(" ").toLowerCase().includes(q)),box=$("posterList");
 box.innerHTML=loadErr.posters?`<p class="status-msg error" role="alert">Poster data could not be loaded (${esc(loadErr.posters)}). Please try again later.</p>`:L.length?L.map(posterCard).join(""):`<p class="muted">${all.length?"No posters match your search.":"No posters published yet."}</p>`;
 const lp=all.slice(0,3);$("latestPosters").innerHTML=loadErr.posters?"":lp.length?lp.map(posterCard).join(""):'<p class="muted">No posters published yet.</p>'}
function showPoster(id){const p=d.posters.find(x=>x.id===String(id));if(!p)return;const ev=p.eventId&&d.events.find(x=>String(x.id)===String(p.eventId));
 $("dlgBody").innerHTML=`<h2>${esc(p.title||"Poster")}</h2><p><span class="pill">${esc(p.category)}</span></p><div class="poster-view"><img class="poster-expanded" src="${esc(p.image)}" alt="${esc(p.alt||p.title||"FST poster")}"></div>${p.eventDate?`<p><b>Event date:</b> ${date(p.eventDate)}</p>`:""}${p.venue?`<p><b>Venue:</b> ${esc(p.venue)}</p>`:""}${p.description?`<p class="preline">${esc(p.description)}</p>`:""}${ev?`<p><button data-id="${esc(ev.id)}">View related event: ${esc(ev.name)}</button></p>`:""}`;openDlg()}

/* ---------- Finance ---------- */
function renderFinance(){
 if(loadErr.finances||loadErr.ledger){$("financeHero").innerHTML=`<p class="status-msg error" role="alert">Finance data could not be loaded (${esc(loadErr.finances||loadErr.ledger)}).</p>`;return}
 const F=buildFunds(d.finances,d.ledger),reps=d.finances.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
 const fc=(cls,l,v,s)=>`<div class="fund ${cls}${v<0?" neg":""}"><small>${l}</small><strong>${cash(v)}</strong><span>${s}</span></div>`;
 $("financeHero").innerHTML=`<div class="fund2">${fc("op","OPERATING FUND",F.bal.operating,"food, transportation, supplies and other needs")}${fc("sv","SAVINGS",F.bal.savings,"saved for the future")}</div><div class="stat3" style="grid-template-columns:1fr 1fr"><div><small>Total received</small><b>${cash(F.received)}</b></div><div><small>Total spent</small><b>${cash(F.spent)}</b></div></div><div class="fund2">${fc("tt","TITHES",F.due.tithes,"set aside, not yet given")}${fc("of","OFFERING",F.due.offering,"set aside, not yet given")}</div>`;
 $("reportList").innerHTML=reps.length?reps.map(f=>{const t=totals(f);return `<article class="item"><h3>${esc(f.eventName||"Financial report")}</h3><p class="muted small">${date(f.date)}</p><div class="stat3"><div><small>Received</small><b>${cash(t.r)}</b></div><div><small>Expenses</small><b>${cash(t.e)}</b></div><div><small>To Operating Fund</small><b class="${t.bal<0?"neg":""}">${cash(t.bal)}</b></div></div><p><button data-report="${esc(f.id)}">View full report</button></p></article>`}).join(""):'<p class="muted">No service reports published.</p>';
 const R=allReceipts(d.finances,d.ledger),tot=r2(R.reduce((s,x)=>s+x.amount,0));
 $("donationList").innerHTML=R.length?`<p class="muted small">Every amount received, with thanks to everyone who gave. Names are shown only when the giver agreed.</p><div class="card tablewrap"><table class="tbl"><tr><th>Date</th><th>From</th><th class="n">Amount</th></tr>${R.map(x=>`<tr><td>${x.date?date(x.date):"—"}</td><td>${esc(x.from)}<br><small class="muted">${esc(x.ctx)}${x.details?" · "+esc(x.details):""}</small></td><td class="n">${cash(x.amount)}</td></tr>`).join("")}<tr class="tot"><td colspan="2">Total received</td><td class="n">${cash(tot)}</td></tr></table></div>`:'<p class="muted">Nothing recorded yet.</p>';
 renderHistory();
 const L=F.M.filter(m=>m.fund===fundSel).reverse();
 $("ledgerList").innerHTML=L.length?`<div class="card tablewrap"><table class="tbl"><tr><th>Date</th><th>Details</th><th class="n">In / Out</th><th class="n">Balance</th></tr>${L.map(x=>`<tr><td>${x.date?date(x.date):"—"}</td><td>${x.rid?`<a href="#report/${encodeURIComponent(x.rid)}">${esc(x.details)}</a>`:esc(x.details)}</td><td class="n ${x.delta>=0?"pos":"neg"}">${x.delta>=0?"+":"−"}${cash(Math.abs(x.delta))}</td><td class="n">${cash(x.bal)}</td></tr>`).join("")}</table></div>`:'<p class="muted">No entries yet.</p>';
 document.querySelectorAll("[data-fund]").forEach(b=>b.classList.toggle("active",b.dataset.fund===fundSel))}

function renderReport(id){const f=d.finances.find(x=>String(x.id)===String(id)),box=$("reportBody");
 if(!f){box.innerHTML='<div class="noprint actions"><a class="btn alt" href="#finance">← Back</a></div><p class="muted">Report not found.</p>';return}
 const e=d.events.find(x=>String(x.id)===String(f.eventId)),t=totals(f),R=f.received||[],X=[...(f.expenses||[]).map(x=>({c:x.category,d:x.details,a:x.amount})),...(f.allocations||[]).map(x=>({c:x.category,d:x.details,a:x.amount}))];
 const F=buildFunds(d.finances,d.ledger),op=F.M.filter(m=>m.rid===f.id&&m.fund==="operating"),opBefore=op.length?r2(op[0].bal-op[0].delta):null,opAfter=op.length?op[op.length-1].bal:null,sp=f.split||DEFAULT_SPLIT,rows=budgetRows(sp);
 box.innerHTML=`<div class="noprint actions"><a class="btn alt" href="#finance">← Back</a><button data-print>Print / Save as PDF</button></div><article class="sheet"><p class="eyebrow">${esc(svcType(f,d.events).toUpperCase())} • FINANCIAL REPORT</p><h2>Expense and Fund Utilization Report</h2><p class="muted">Memorial service support and financial accountability</p>
 <div class="info3"><div><small>${DECEASED_TYPES.includes(svcType(f,d.events))?"Name of Deceased":"Activity"}</small><b>${esc(f.eventName||(e&&e.name)||"—")}</b></div><div><small>Date of Service</small><b>${esc(dateLong(f.date||(e&&e.date))||"—")}</b></div><div><small>Location</small><b>${esc((e&&e.venue)||"—")}</b></div></div>
 <h3>1. Funds Received</h3><div class="tablewrap"><table class="tbl"><tr><th>Source</th><th>Details</th><th class="n">Amount</th></tr>${R.map(x=>`<tr><td>${esc(x.source||"Anonymous")}${x.donor?`<br><small class="muted">${esc(x.donor)}</small>`:""}</td><td>${esc(x.details||"")}</td><td class="n">${cash(x.amount)}</td></tr>`).join("")||'<tr><td colspan="3" class="muted">None listed</td></tr>'}<tr class="tot"><td colspan="2">Total Funds Received</td><td class="n">${cash(t.r)}</td></tr></table></div>
 <h3>2. Expenses and Other Allocations</h3><div class="tablewrap"><table class="tbl"><tr><th>Category</th><th>Details</th><th class="n">Amount</th></tr>${X.map(x=>`<tr><td>${esc(x.c||"")}</td><td>${esc(x.d||"")}</td><td class="n">${cash(x.a)}</td></tr>`).join("")||'<tr><td colspan="3" class="muted">None listed</td></tr>'}<tr class="tot"><td colspan="2">Total Expenses and Allocations</td><td class="n">${cash(t.e+t.a)}</td></tr></table></div>
 <div class="stat3" style="margin-top:14px"><div><small>Total Received</small><b>${cash(t.r)}</b></div><div><small>Total Expenses / Allocations</small><b>${cash(t.e+t.a)}</b></div><div><small>${t.bal<0?"Taken from":"Added to"} Operating Fund</small><b class="${t.bal<0?"neg":"pos"}">${cash(Math.abs(t.bal))}</b></div></div>
 ${opBefore!==null?`<p class="small muted" style="margin-top:8px">Operating Fund: ${cash(opBefore)} before this service → <b>${cash(opAfter)}</b> after.</p>`:""}
 <div class="note"><b>Financial Summary</b><p>${esc(summaryText(f))}</p>${f.notes?`<p class="preline">${esc(f.notes)}</p>`:""}</div>
 <h3>3. How Funds Received Are Allocated</h3><p class="muted small">Every amount received is divided as follows:</p><div class="tablewrap"><table class="tbl"><tr><th>Budget Category</th><th class="n">Percentage</th><th class="n">Per ₱1,000.00</th></tr>${rows.map(b=>`<tr><td>${esc(b[0])}</td><td class="n">${b[1]}%</td><td class="n">${cash(b[1]*10)}</td></tr>`).join("")}<tr class="tot"><td>Total Allocation</td><td class="n">${rows.reduce((s,b)=>s+b[1],0)}%</td><td class="n">${cash(rows.reduce((s,b)=>s+b[1],0)*10)}</td></tr></table></div>
 <div class="sign"><div><b>${esc(f.preparedBy||"")}</b>Prepared by</div><div><b>${esc(f.approvedBy||"")}</b>Reviewed / Approved by</div></div><p class="muted small" style="text-align:center;margin-top:20px">Prepared for record-keeping and financial transparency.</p></article>`}

function periodSel(yId,mId,dates){const ys=[...new Set(dates.map(s=>(s||"").slice(0,4)).filter(Boolean))].sort().reverse(),ySel=$(yId);
 if(ySel.dataset.n!==ys.join()){const keep=ySel.value;ySel.innerHTML='<option value="all">All time</option>'+ys.map(y=>`<option>${y}</option>`).join("");ySel.dataset.n=ys.join();ySel.value=ys.includes(keep)||keep==="all"?keep:(ys[0]||"all")}
 const y=ySel.value,m=$(mId).value;return{pref:y==="all"?"":y+(m?"-"+m:""),label:y==="all"?"All time":(m?$(mId).selectedOptions[0].text+" ":"")+y}}
function allDates(){return[...d.finances.map(f=>f.date),...d.ledger.map(x=>x.date)]}
function catTable(E){const by={};E.forEach(x=>{by[x.cat]=r2((by[x.cat]||0)+x.amount)});const tot=r2(E.reduce((s,x)=>s+x.amount,0));
 return `<div class="tablewrap"><table class="tbl"><tr><th>Category</th><th class="n">Amount</th><th class="n">Share</th></tr>${Object.keys(by).sort((a,b)=>by[b]-by[a]).map(k=>`<tr><td>${esc(k)}</td><td class="n">${cash(by[k])}</td><td class="n">${tot?Math.round(by[k]/tot*100):0}%</td></tr>`).join("")||'<tr><td colspan="3" class="muted">No expenses in this period.</td></tr>'}<tr class="tot"><td>Total expenses</td><td class="n">${cash(tot)}</td><td class="n">${tot?"100%":""}</td></tr></table></div>`}
function renderExpenses(){const {pref,label}=periodSel("expYear","expMonth",allDates()),E=allExpenses(d.finances,d.ledger,d.events).filter(x=>!pref||(x.date||"").startsWith(pref));
 $("expBody").innerHTML=`<article class="sheet"><p class="eyebrow">FUNERAL SERVICE TEAM • CALVARY FOURSQUARE CHURCH</p><h2>Expense Report</h2><p class="muted">Period: <b>${esc(label)}</b></p><h3>By category</h3>${catTable(E)}<h3>Every expense</h3><div class="tablewrap"><table class="tbl"><tr><th>Date</th><th>For</th><th class="n">Amount</th></tr>${E.map(x=>`<tr><td>${x.date?date(x.date):"—"}</td><td><b>${esc(x.cat)}</b><br><small class="muted">${esc([x.details,x.event].filter(Boolean).join(" · "))}</small></td><td class="n">${cash(x.amount)}</td></tr>`).join("")||'<tr><td colspan="3" class="muted">None</td></tr>'}</table></div><div class="sign"><div><b></b>Prepared by (Secretary)</div><div><b></b>Reviewed / Approved by</div></div></article>`}

function renderSummary(){const {pref,label}=periodSel("sumYear","sumMonth",allDates()),inP=s=>!pref||(s||"").startsWith(pref);
 const reps=d.finances.filter(f=>inP(f.date)).sort((a,b)=>(a.date||"").localeCompare(b.date||"")),gen=d.ledger.filter(x=>x.type==="donation"&&inP(x.date)).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
 const P=buildFunds(reps,d.ledger.filter(x=>inP(x.date))),F=buildFunds(d.finances,d.ledger),E=allExpenses(reps,d.ledger.filter(x=>inP(x.date)),d.events),src={};
 allReceipts(reps,gen).forEach(x=>{const k=x.from.split(" – ")[0];src[k]=r2((src[k]||0)+x.amount)});
 const held=d.events.filter(e=>e.status!=="cancelled"&&e.date&&new Date(e.date+"T23:59:59")<new Date()&&inP(e.date)).length;
 $("summaryBody").innerHTML=`<article class="sheet"><p class="eyebrow">FUNERAL SERVICE TEAM • EVANGELISM TEAM, CALVARY FOURSQUARE CHURCH</p><h2>Financial Summary Report</h2><p class="muted">Period: <b>${esc(label)}</b></p>
 <div class="fund2"><div class="fund op${F.bal.operating<0?" neg":""}"><small>OPERATING FUND NOW</small><strong>${cash(F.bal.operating)}</strong></div><div class="fund sv"><small>SAVINGS NOW</small><strong>${cash(F.bal.savings)}</strong></div></div>
 <div class="stat3"><div><small>Services held</small><b>${held}</b></div><div><small>Total received</small><b>${cash(P.received)}</b></div><div><small>Total spent</small><b>${cash(P.spent)}</b></div></div>
 <div class="stat3" style="margin-top:8px"><div><small>Tithes</small><b>${cash(P.setAside.tithes)}</b></div><div><small>Offering</small><b>${cash(P.setAside.offering)}</b>${P.setAside.offeringFromTransfers?`<small>includes ${cash(P.setAside.offeringFromTransfers)} transferred in</small>`:""}</div><div><small>Added to savings</small><b>${cash(P.M.filter(m=>m.fund==="savings"&&m.delta>0).reduce((s,m)=>s+m.delta,0))}</b></div></div>
 <h3>Services</h3><div class="tablewrap"><table class="tbl"><tr><th>Date</th><th>Service</th><th class="n">Received</th><th class="n">Expenses</th><th class="n">Tithes</th><th class="n">Offering</th><th class="n">Savings</th><th class="n">Operating</th></tr>${reps.map(f=>{const t=totals(f);return `<tr><td>${f.date?date(f.date):"—"}</td><td>${esc(f.eventName||"")}</td><td class="n">${cash(t.r)}</td><td class="n">${cash(t.e)}</td><td class="n">${cash(t.tithes)}</td><td class="n">${cash(t.offering)}</td><td class="n">${cash(t.savings)}</td><td class="n">${cash(t.bal)}</td></tr>`}).join("")||'<tr><td colspan="8" class="muted">No service reports in this period.</td></tr>'}</table></div>
 <h3>Donations outside services</h3><div class="tablewrap"><table class="tbl">${gen.map(x=>`<tr><td>${x.date?date(x.date):"—"}</td><td>${esc(x.donor?`${x.source||"Gift"} – ${x.donor}`:(x.source||"Anonymous"))}</td><td class="n">${cash(x.amount)}</td></tr>`).join("")||'<tr><td class="muted">None in this period.</td></tr>'}</table></div>
 <h3>Where the funds came from</h3><div class="tablewrap"><table class="tbl">${Object.keys(src).map(k=>`<tr><td>${esc(k)}</td><td class="n">${cash(src[k])}</td></tr>`).join("")||'<tr><td class="muted">None</td></tr>'}</table></div>
 <h3>Where the money went (expenses)</h3>${catTable(E)}
 <div class="sign"><div><b></b>Prepared by (Secretary)</div><div><b></b>Reviewed / Approved by</div></div></article>`}

/* ---------- Transactions History ---------- */
function renderHistory(){const T=allTx(d.finances,d.ledger,d.events),box=$("historyList");
 box.innerHTML=T.length?`<p class="muted small">Every money movement, newest first. Transactions are named by the kind of service, not by the name of the deceased.</p><div class="card tablewrap"><table class="tbl"><tr><th>Date</th><th>Transaction</th><th class="n">In</th><th class="n">Out</th></tr>${T.map(x=>`<tr><td>${x.date?date(x.date):"—"}</td><td>${x.rid?`<a href="#report/${encodeURIComponent(x.rid)}"><b>${esc(x.title)}</b></a>`:`<b>${esc(x.title)}</b>`}<br><small class="muted">${esc(x.note)}</small></td><td class="n pos">${x.inn?cash(x.inn):(x.amt?"⇄ "+cash(x.amt):"")}</td><td class="n neg">${x.out?cash(x.out):""}</td></tr>`).join("")}</table></div>`:'<p class="muted">No transactions yet.</p>'}

/* ---------- Tithes & Offering Report ---------- */
function renderTithes(){const {pref,label}=periodSel("tyYear","tyMonth",allDates()),F=buildFunds(d.finances,d.ledger),rows=tithesRows(d.finances,d.ledger,d.events),V=rows.filter(x=>!pref||(x.date||"").startsWith(pref)),
 sum2=(L,k)=>r2(L.reduce((s,x)=>s+x[k],0)),S1=V.filter(x=>x.kind==="set"),G1=V.filter(x=>x.kind==="given"),dueT=F.due.tithes,dueO=F.due.offering;
 $("tyBody").innerHTML=`<article class="sheet"><p class="eyebrow">FUNERAL SERVICE TEAM • CALVARY FOURSQUARE CHURCH</p><h2>Tithes &amp; Offering Report</h2><p class="muted">Period: <b>${esc(label)}</b></p>
 <div class="fund2"><div class="fund tt${dueT<0?" neg":""}"><small>TITHES NOT YET GIVEN</small><strong>${cash(dueT)}</strong></div><div class="fund of${dueO<0?" neg":""}"><small>OFFERING NOT YET GIVEN</small><strong>${cash(dueO)}</strong></div></div>
 <h3>Tithes</h3><div class="stat3"><div><small>Set aside (period)</small><b>${cash(sum2(S1,"tithes"))}</b></div><div><small>Given to Church (period)</small><b>${cash(sum2(G1,"tithes"))}</b></div><div><small>Not yet given (now)</small><b>${cash(dueT)}</b></div></div><h3>Offering</h3><div class="stat3"><div><small>Set aside (period)</small><b>${cash(sum2(S1,"offering"))}</b></div><div><small>Given to Church (period)</small><b>${cash(sum2(G1,"offering"))}</b></div><div><small>Not yet given (now)</small><b>${cash(dueO)}</b></div></div>
 <h3>Statement</h3><p class="muted small">+ means set aside, not yet given. − means given to the Church. The last column is what is still not given.</p>
 <div class="tablewrap"><table class="tbl"><tr><th>Date</th><th>Transaction</th><th class="n">Tithes</th><th class="n">Offering</th><th class="n">Tithes not yet given</th><th class="n">Offering not yet given</th></tr>${V.map(x=>{const sg=x.kind==="set"?"+":"−",c=x.kind==="set"?"pos":"neg",det=x.kind==="given"?[x.service,x.time?"at "+fmtTime(x.time):"",x.note].filter(Boolean).join(" · "):x.note;
  return `<tr><td>${x.date?date(x.date):"—"}</td><td>${x.rid?`<a href="#report/${encodeURIComponent(x.rid)}"><b>${esc(x.title)}</b></a>`:`<b>${esc(x.title)}</b>`}<br><small class="muted">${esc(det)}</small></td><td class="n ${c}">${sg}${cash(x.tithes)}</td><td class="n ${c}">${sg}${cash(x.offering)}</td><td class="n">${cash(x.balT)}</td><td class="n">${cash(x.balO)}</td></tr>`}).join("")||'<tr><td colspan="6" class="muted">No entries in this period.</td></tr>'}</table></div>
 <h3>Given to the Church</h3><div class="tablewrap"><table class="tbl"><tr><th>Date</th><th>Worship Service</th><th>Time given</th><th class="n">Tithes</th><th class="n">Offering</th></tr>${G1.map(x=>`<tr><td>${x.date?date(x.date):"—"}</td><td>${esc(x.service||"—")}</td><td>${x.time?esc(fmtTime(x.time)):"—"}</td><td class="n">${cash(x.tithes)}</td><td class="n">${cash(x.offering)}</td></tr>`).join("")||'<tr><td colspan="5" class="muted">Nothing given in this period.</td></tr>'}${G1.length?`<tr class="tot"><td colspan="3">Total given</td><td class="n">${cash(sum2(G1,"tithes"))}</td><td class="n">${cash(sum2(G1,"offering"))}</td></tr>`:""}</table></div>
 <div class="sign"><div><b></b>Prepared by (Secretary)</div><div><b></b>Reviewed / Approved by</div></div></article>`}

/* ---------- Songs ---------- */
function renderSongs(){const q=($("songSearch").value||"").toLowerCase().trim(),cats=[...new Set(d.songs.map(s=>s.category||"Other"))].sort(),sel=$("songCat");
 if(sel.dataset.n!==cats.join("|")){const keep=sel.value;sel.innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");sel.dataset.n=cats.join("|");sel.value=cats.includes(keep)?keep:"all"}
 const L=d.songs.filter(s=>(sel.value==="all"||(s.category||"Other")===sel.value)&&[s.title,s.author,s.lyrics].join(" ").toLowerCase().includes(q)).sort((a,b)=>(a.title||"").localeCompare(b.title||""));
 $("songList").innerHTML=loadErr.songs?`<p class="status-msg error">Songs could not be loaded (${esc(loadErr.songs)}).</p>`:L.length?L.map(s=>`<button class="song-item" data-song="${esc(s.id)}"><strong>${esc(s.title)}</strong><small>${esc([s.category,s.author].filter(Boolean).join(" · "))}</small></button>`).join(""):`<p class="muted">${d.songs.length?"No songs match.":"No songs added yet."}</p>`}
function songsHtml(e){const L=(e.songs||[]).map(id=>d.songs.find(s=>s.id===id)).filter(Boolean);return L.length?`<h3>Songs for this service</h3>${L.map(s=>`<button class="song-item" data-song="${esc(s.id)}"><strong>${esc(s.title)}</strong><small>${esc(s.author||"")}</small></button>`).join("")}`:""}
function lyricsHtml(t){return String(t||"").replace(/\r/g,"").split(/\n\s*\n/).map(b=>b.split("\n").filter(l=>l.trim()!=="")).filter(ls=>ls.length).map(ls=>`<p class="stanza">${ls.map(l=>/^\[.+\]$/.test(l.trim())?`<small class="seclab">${esc(l.trim().slice(1,-1))}</small>`:esc(l)).join("<br>")}</p>`).join("")}
function showSong(id,fromEvt){const s=d.songs.find(x=>x.id===id);if(!s)return;const back=fromEvt&&lastEvt?`<button class="alt sm" data-id="${esc(lastEvt)}">← Back to service</button>`:"";
 $("dlgBody").innerHTML=`${back}<h2>${esc(s.title)}</h2><p class="muted small">${esc([s.author,s.key?"Key: "+s.key:""].filter(Boolean).join(" · "))}</p><div class="reader-bar noprint"><button class="alt sm" data-fs="-2" aria-label="Smaller text">A−</button><button class="alt sm" data-fs="2" aria-label="Larger text">A+</button><button class="alt sm" data-dark>🌙 Dark</button><button class="alt sm" data-wake>💡 Keep screen on</button></div><div class="lyrics${lyricDark?" dark":""}" id="lyricBox" style="font-size:${lyricSize}px">${lyricsHtml(s.lyrics)}</div>${s.rights?`<p class="muted small">Rights: ${esc(s.rights)}</p>`:""}`;openDlg(true)}
let wake=null;
async function toggleWake(btn){try{if(wake){await wake.release();wake=null;btn.textContent="💡 Keep screen on";return}wake=await navigator.wakeLock.request("screen");wake.addEventListener("release",()=>{wake=null});btn.textContent="💡 Screen stays on ✓"}catch(e){btn.textContent="💡 Not supported on this phone"}}
$("dlg").addEventListener("close",()=>{if(wake){wake.release().catch(()=>{});wake=null}$("dlg").classList.remove("reader")});

/* ---------- More ---------- */
function renderMore(){
 const t=today0(),derived=d.events.filter(e=>e.status!=="cancelled"&&e.date&&new Date(e.date+"T12:00:00")>=t).sort((a,b)=>a.date.localeCompare(b.date)).map(e=>({e,p:programList(e).filter(x=>x.assignedTo)})).filter(x=>x.p.length);
 const D=derived.map(({e,p})=>`<article class="item"><span class="pill upcoming">${date(e.date)}</span><h3>${esc(e.name)}</h3><ul>${p.map(x=>`<li><b>${esc(x.assignedTo)}</b> — ${esc(x.item)}</li>`).join("")}</ul></article>`).join("");
 const M=d.assignments.map(a=>`<article class="item"><span class="pill">${esc(a.status||"Pending")}</span><h3>${esc(a.task||a.title||"Assignment")}</h3>${a.eventName?`<p><b>Event:</b> ${esc(a.eventName)}</p>`:""}<p><b>Assigned to:</b> ${esc(a.assignedTo||"Not specified")}</p><p>${esc(a.notes||"")}</p></article>`).join("");
 $("assignmentList").innerHTML=D+M||'<p class="muted">No assignments published yet.</p>';
 $("announcementList").innerHTML=d.announcements.length?d.announcements.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(annCard).join(""):'<p class="muted">No announcements.</p>'}

/* ---------- routing & events ---------- */
function route(){const h=(location.hash||"#home").slice(1),[v0,arg]=h.split("/");let v=document.getElementById("v-"+v0)?v0:"home";
 if($("dlg").open)$("dlg").close();
 if(v==="report")renderReport(decodeURIComponent(arg||""));if(v==="summary")renderSummary();if(v==="expenses")renderExpenses();if(v==="tithes")renderTithes();if(v==="impact")renderImpact();if(v==="attend")renderAttend();
 document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id==="v-"+v));
 const tab=["report","summary","expenses","tithes"].includes(v)?"finance":["reach","attend","impact"].includes(v)?"more":v;document.querySelectorAll(".tabbar a").forEach(a=>{const on=a.dataset.tab===tab;a.classList.toggle("active",on);if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});window.scrollTo(0,0)}
window.addEventListener("hashchange",route);
$("prev").onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);calendar()};$("next").onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);calendar()};
document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));events()});
$("eventSearch").addEventListener("input",events);$("posterSearch").addEventListener("input",posters);$("posterCategory").addEventListener("change",e=>{posterCat=e.target.value;posters()});
$("sumYear").onchange=$("sumMonth").onchange=renderSummary;$("expYear").onchange=$("expMonth").onchange=renderExpenses;$("tyYear").onchange=$("tyMonth").onchange=renderTithes;$("imYear").onchange=$("imMonth").onchange=renderImpact;$("atYear").onchange=renderAttend;$("songSearch").addEventListener("input",renderSongs);$("songCat").addEventListener("change",renderSongs);
document.addEventListener("error",e=>{const i=e.target;if(i.tagName==="IMG"&&!i.dataset.failed){i.dataset.failed="1";const f=document.createElement("span");f.className="img-fallback";f.setAttribute("role","img");f.setAttribute("aria-label",i.alt||"Image unavailable");f.textContent="Image unavailable";i.replaceWith(f)}
 if(i.tagName==="AUDIO"&&!i.dataset.failed){i.dataset.failed="1";i.insertAdjacentHTML("afterend",'<p class="muted small">Audio is not available right now. Please try again later.</p>')}},true);
document.body.addEventListener("click",e=>{const t=e.target,b=t.closest("[data-id]"),p=t.closest("[data-poster]"),r=t.closest("[data-report]");
 if(t.closest("[data-print]"))return window.print();
 const ft=t.closest("[data-ftab]");if(ft){document.querySelectorAll("[data-ftab]").forEach(x=>x.classList.toggle("active",x===ft));document.querySelectorAll(".ftab").forEach(x=>x.classList.toggle("hidden",x.id!=="ft-"+ft.dataset.ftab));return}
 const fu=t.closest("[data-fund]");if(fu){fundSel=fu.dataset.fund;renderFinance();return}
 const fs=t.closest("[data-fs]");if(fs){lyricSize=Math.max(14,Math.min(48,lyricSize+Number(fs.dataset.fs)));try{localStorage.setItem("fst-lyric-size",lyricSize)}catch(e){}const bx=$("lyricBox");if(bx)bx.style.fontSize=lyricSize+"px";return}
 if(t.closest("[data-dark]")){lyricDark=!lyricDark;try{localStorage.setItem("fst-lyric-dark",lyricDark?"1":"0")}catch(e){}const bx=$("lyricBox");if(bx)bx.classList.toggle("dark",lyricDark);return}
 const wk=t.closest("[data-wake]");if(wk){toggleWake(wk);return}
 const sg=t.closest("[data-song]");if(sg){showSong(sg.dataset.song,!!$("dlg").open&&!$("dlg").classList.contains("reader"));return}
 if(t.closest("[data-copy]")){const m=$("copyMsg");(navigator.clipboard?navigator.clipboard.writeText(copyText):Promise.reject()).then(()=>{if(m)m.textContent="Copied. Paste it in Messenger."},()=>{if(m)m.textContent="Could not copy automatically. Please select the text and copy it."});return}
 if(r){if($("dlg").open)$("dlg").close();location.hash="#report/"+encodeURIComponent(r.dataset.report);return}
 if(b)detail(b.dataset.id);else if(p)showPoster(p.dataset.poster)});
$("close").onclick=()=>$("dlg").close();
load();
