"use strict";
/* Team view: New Believers & follow-ups, Attendance, Ministry Impact Report. Read-only; the Secretary edits in the workspace. */
let relSt="",relQ="";
const evNameById=id=>{const e=d.events.find(x=>x.id===id);return e?e.name:""};
const believerEv=b=>b.eventName||evNameById(b.eventId)||"";
const statPill=b=>`<span class="pill ${fuDue(b)?"dirty":(b.status==="Member"?"upcoming":"")}">${esc(b.status)}</span>`;

function believerCard(b){const n=(b.followups||[]).length,lf=lastFU(b),FU=(b.followups||[]).slice().sort((x,y)=>(y.date||"").localeCompare(x.date||""));
 return `<article class="item"><h3>${esc(b.name)} ${statPill(b)}</h3><p class="muted small">Received the Lord: ${date(b.date)}${believerEv(b)?" · "+esc(believerEv(b)):""}</p>
 <p class="small"><b>${n}</b> follow-up${n===1?"":"s"}${lf?" · last "+date(lf):" · none yet"}${b.assignedTo?" · Follow-up by <b>"+esc(b.assignedTo)+"</b>":""}${fuDue(b)?' · <b style="color:#8a5a00">needs follow-up</b>':""}</p>
 ${b.notes?`<p class="small preline">${esc(b.notes)}</p>`:""}${FU.length?`<details><summary>Follow-up log (${FU.length})</summary><ul class="small">${FU.map(f=>`<li>${date(f.date)} — ${esc(f.how||"")}${f.by?" by "+esc(f.by):""}${f.notes?": "+esc(f.notes):""}</li>`).join("")}</ul></details>`:""}</article>`}

function renderReach(){const B=d.believers||[],t=believerStats(B),box=$("reachBody");if(!box)return;
 const due=B.filter(fuDue).sort((a,b)=>(lastFU(a)||a.date).localeCompare(lastFU(b)||b.date));
 const byEv={};B.forEach(b=>{const k=b.eventId||("n:"+believerEv(b))||"other";(byEv[k]=byEv[k]||{name:believerEv(b)||"Other / no event",date:b.date,list:[]}).list.push(b)});
 const evRows=Object.values(byEv).sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(x=>`<tr><td>${esc(x.name)}<br><small class="muted">${date(x.date)}</small></td><td class="n">${x.list.length}</td><td class="n">${x.list.filter(b=>(b.followups||[]).length).length}</td><td class="n">${x.list.filter(reachedCFC).length}</td><td class="n">${x.list.filter(b=>b.status==="Member").length}</td></tr>`).join("");
 const L=B.filter(b=>(!relSt||b.status===relSt)&&(!relQ||b.name.toLowerCase().includes(relQ))).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
 box.innerHTML=`<div class="stat3"><div><small>Reached</small><b>${t.reached}</b></div><div><small>Followed up</small><b>${t.fu}</b></div><div><small>Went to CFC</small><b>${t.everCFC}</b></div></div>
 <div class="stat3" style="margin-top:8px"><div><small>Now Members</small><b>${t.member}</b></div><div><small>Follow-ups done</small><b>${t.totalFU}</b></div><div><small>Need follow-up</small><b>${t.due}</b></div></div>
 <h3>Needs follow-up</h3>${due.length?due.map(b=>`<article class="item"><h3>${esc(b.name)}</h3><p class="small">${lastFU(b)?"Last follow-up "+date(lastFU(b)):"No follow-up yet. Received the Lord "+date(b.date)}${b.assignedTo?" · <b>"+esc(b.assignedTo)+"</b>":""}</p></article>`).join(""):'<p class="muted">Everyone is up to date. 🎉</p>'}
 <h3>By event</h3><div class="card tablewrap"><table class="tbl"><tr><th>Event</th><th class="n">Reached</th><th class="n">Followed up</th><th class="n">At CFC</th><th class="n">Members</th></tr>${evRows||'<tr><td colspan="5" class="muted">No records yet.</td></tr>'}</table></div>
 <h3>Everyone</h3><div class="poster-tools"><input id="relQ" class="search" type="search" placeholder="Search name…" value="${esc(relQ)}" aria-label="Search"><select id="relSt" aria-label="Filter by status"><option value="">All statuses</option>${BEL_STATUS.map(s=>`<option ${s===relSt?"selected":""}>${s}</option>`).join("")}</select></div>${L.length?L.map(believerCard).join(""):'<p class="muted">No records.</p>'}`;
 const q=$("relQ");q.oninput=()=>{relQ=q.value.trim().toLowerCase();const p=q.selectionStart;renderReach();const n=$("relQ");n.focus();n.setSelectionRange(p,p)};$("relSt").onchange=e=>{relSt=e.target.value;renderReach()}}

function renderAttend(){const box=$("attendBody");if(!box)return;const P=d.people||[],A=(d.attendance||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")),ys=[...new Set(A.map(a=>(a.date||"").slice(0,4)).filter(Boolean))].sort().reverse();
 const ysel=$("atYear");if(ysel&&ysel.dataset.n!==ys.join()){const k=ysel.value;ysel.innerHTML='<option value="all">All time</option>'+ys.map(y=>`<option>${y}</option>`).join("");ysel.dataset.n=ys.join();ysel.value=ys.includes(k)||k==="all"?k:"all"}
 const y=ysel?ysel.value:"all",V=A.filter(a=>y==="all"||(a.date||"").startsWith(y));
 const rows=V.map(a=>{const e=d.events.find(x=>x.id===a.eventId),t=attTotals(a,P);return `<article class="item"><h3>${esc(e?e.name:"Event")}</h3><p class="muted small">${a.date?date(a.date):""}</p><p><b style="font-size:20px">${t.total}</b> present</p><p class="small">${Object.entries(t.by).map(([c,n])=>`<span class="pill">${esc(c)}: ${n}</span>`).join(" ")||"<span class=\"muted\">No names marked.</span>"}</p></article>`}).join("");
 const per=P.map(p=>({p,n:V.filter(a=>(a.present||[]).includes(p.id)).length})).filter(x=>x.n>0||V.length).sort((a,b)=>b.n-a.n||a.p.name.localeCompare(b.p.name));
 box.innerHTML=(V.length?`<div class="stat3"><div><small>Events recorded</small><b>${V.length}</b></div><div><small>Total present</small><b>${V.reduce((s,a)=>s+attTotals(a,P).total,0)}</b></div><div><small>Average per event</small><b>${Math.round(V.reduce((s,a)=>s+attTotals(a,P).total,0)/V.length)}</b></div></div>`:"")
  +`<h3>Per event</h3>${rows||'<p class="muted">No attendance recorded yet.</p>'}<h3>Per person</h3>${V.length?`<div class="card tablewrap"><table class="tbl"><tr><th>Name</th><th>Category</th><th class="n">Present</th><th class="n">%</th></tr>${per.map(x=>`<tr><td>${esc(x.p.name)}</td><td>${esc(x.p.category||"Member")}</td><td class="n">${x.n} / ${V.length}</td><td class="n">${Math.round(x.n/V.length*100)}%</td></tr>`).join("")}</table></div>`:'<p class="muted">—</p>'}`}

/* Shown inside an event's detail window. */
function evOutreachHtml(e){const a=(d.attendance||[]).find(x=>x.eventId===e.id),B=(d.believers||[]).filter(b=>b.eventId===e.id);let h="";
 if(a){const t=attTotals(a,d.people||[]);h+=`<h3>Attendance</h3><p><b>${t.total}</b> present</p><p class="small">${Object.entries(t.by).map(([c,n])=>`<span class="pill">${esc(c)}: ${n}</span>`).join(" ")}</p>`}
 if(B.length)h+=`<h3>New Believers</h3><p><b>${B.length}</b> received the Lord Jesus Christ at this service. <a href="#reach" onclick="$('dlg').close()">See follow-ups</a></p>`;return h}

/* Home: reminder card + link */
function renderFuHome(){const B=d.believers||[],due=B.filter(fuDue),box=$("fuHome");if(!box)return;
 box.innerHTML=(B.length||(d.attendance||[]).length)?`<article class="card"><p class="eyebrow">OUTREACH</p>${due.length?`<p><b>${due.length}</b> new believer${due.length>1?"s":""} need${due.length>1?"":"s"} a follow-up: ${esc(due.slice(0,3).map(b=>b.name).join(", "))}${due.length>3?" and "+(due.length-3)+" more":""}.</p>`:'<p class="muted">All new believers are up to date on follow-ups.</p>'}<div class="actions"><a class="btn" href="#reach">🌱 New Believers</a><a class="btn alt" href="#attend">✅ Attendance</a></div></article>`:""}

/* Ministry Impact Report (printable) */
function renderImpact(){const dates=[...d.events.map(e=>e.date),...(d.believers||[]).map(b=>b.date),...allDates()],{pref,label}=periodSel("imYear","imMonth",dates),inP=s=>!pref||(s||"").startsWith(pref);
 const P=d.people||[],evs=d.events.filter(e=>e.status!=="cancelled"&&e.date&&inP(e.date)&&status(e)==="completed"),att=(d.attendance||[]).filter(a=>inP(a.date)),B=(d.believers||[]).filter(b=>inP(b.date)),
  fus=(d.believers||[]).reduce((s,b)=>s+(b.followups||[]).filter(f=>inP(f.date)).length,0),bt=believerStats(B),tot=att.reduce((s,a)=>s+attTotals(a,P).total,0),byType={};
 evs.forEach(e=>{const t=e.type||"Other";byType[t]=(byType[t]||0)+1});
 const reps=d.finances.filter(f=>inP(f.date)),Fp=buildFunds(reps,d.ledger.filter(x=>inP(x.date))),Fn=buildFunds(d.finances,d.ledger);
 const rows=evs.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>{const a=att.find(x=>x.eventId===e.id),nb=(d.believers||[]).filter(b=>b.eventId===e.id).length;return `<tr><td>${date(e.date)}</td><td>${esc(e.name)}<br><small class="muted">${esc(e.type||"")}${e.preacher?" · "+esc(e.preacher):""}</small></td><td class="n">${a?attTotals(a,P).total:"—"}</td><td class="n">${nb}</td></tr>`}).join("");
 $("imBody").innerHTML=`<article class="sheet"><p class="eyebrow">FUNERAL SERVICE TEAM • CALVARY FOURSQUARE CHURCH</p><h2>Ministry Impact Report</h2><p class="muted">Period: <b>${esc(label)}</b></p>
 <div class="stat3"><div><small>Services / activities</small><b>${evs.length}</b></div><div><small>Total attendance</small><b>${tot}</b></div><div><small>People reached</small><b>${bt.reached}</b></div></div>
 <div class="stat3" style="margin-top:8px"><div><small>Follow-ups done</small><b>${fus}</b></div><div><small>Went to CFC</small><b>${bt.everCFC}</b></div><div><small>Now Members</small><b>${bt.member}</b></div></div>
 ${Object.keys(byType).length?`<p class="small">${Object.entries(byType).map(([k,v])=>`${esc(k)}: <b>${v}</b>`).join(" · ")}</p>`:""}
 <h3>Services</h3><div class="tablewrap"><table class="tbl"><tr><th>Date</th><th>Service</th><th class="n">Present</th><th class="n">New believers</th></tr>${rows||'<tr><td colspan="4" class="muted">No completed services in this period.</td></tr>'}</table></div>
 <h3>Finances (period)</h3><div class="stat3"><div><small>Received</small><b>${cash(Fp.received)}</b></div><div><small>Spent</small><b>${cash(Fp.spent)}</b></div><div><small>Tithes set aside</small><b>${cash(Fp.setAside.tithes)}</b></div></div>
 <div class="stat3" style="margin-top:8px"><div><small>Operating Fund now</small><b>${cash(Fn.bal.operating)}</b></div><div><small>Savings now</small><b>${cash(Fn.bal.savings)}</b></div><div><small>Offering set aside</small><b>${cash(Fp.setAside.offering)}</b></div></div>
 <div class="stat3" style="margin-top:8px;grid-template-columns:1fr 1fr"><div><small>Tithes not yet given</small><b>${cash(Fn.due.tithes)}</b></div><div><small>Offering not yet given</small><b>${cash(Fn.due.offering)}</b></div></div>
 <div class="sign"><div><b></b>Prepared by (Secretary)</div><div><b></b>Reviewed / Approved by</div></div></article>`}
