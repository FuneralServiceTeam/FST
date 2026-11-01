"use strict";
const tdy=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
/* Secretary Workspace: Attendance (roster + per-event attendance) and New Believers (follow-up tracker). */
const esc2=esc;
function chip(t){return `<span class="pill">${esc(t)}</span>`}

/* ---------- Tab: Attendance ---------- */
function tabAttendance(){
 const el=$("tabBody");let edP=null,curEv="",present=new Set(),counts=[];
 el.innerHTML=`<div class="card"><h3>Attendance per event</h3><p class="muted small">Choose an event, tap the names who came, then Save. People who are the event's preacher or are named in the program are pre-selected the first time. For people who are not on your list (family, guests, visitors), add a head count by category.</p>
 <label>Event<select id="at_ev"></select></label><div id="at_names"></div>
 <h4>Other attendees (head count)</h4><div id="at_counts"></div><div class="actions"><button type="button" class="btn alt sm" id="at_addc">+ Add category count</button></div>
 <div class="grid2" style="margin-top:8px"><label>Add someone not on the list<input id="at_qn" placeholder="Name"></label><label>Category<input id="at_qc" list="attCatList" placeholder="FST Core"></label></div><div class="actions"><button type="button" class="btn alt sm" id="at_qa">+ Add to list and mark present</button></div>
 <div class="totals" id="at_tot"></div><div class="actions"><button type="button" class="btn" id="at_save">Save attendance</button></div><p class="msg" id="at_m"></p></div>
 <div class="card"><h3>People list (roster)</h3><p class="muted small">Everyone who can be marked present. Category examples: FST Core, Preacher, Song Leader, Member, or your own (Guest, Family, Volunteer…).</p>
 <div class="grid2"><label>Name *<input id="pp_n"></label><label>Category<input id="pp_c" list="attCatList" placeholder="FST Core"></label></div>
 <div class="actions"><button type="button" class="btn" id="pp_save">Add person</button><button type="button" class="btn alt" id="pp_clear">Clear</button></div><p class="msg" id="pp_m"></p>
 <label>Search<input id="pp_q" type="search" placeholder="Search name or category"></label><ul class="rows" id="pp_L"></ul></div><datalist id="attCatList"></datalist>`;
 const cats=()=>attCats(S.people,S.attendance),evs=()=>S.events.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
 const fillCats=()=>$("attCatList").innerHTML=cats().map(c=>`<option value="${esc(c)}">`).join("");
 $("at_ev").innerHTML='<option value="">— choose an event —</option>'+evs().map(e=>`<option value="${esc(e.id)}">${esc((e.date?date(e.date)+" · ":"")+e.name)}${S.attendance.some(a=>a.eventId===e.id)?" ✓":""}</option>`).join("");
 const ced=rowEd($("at_counts"),[{k:"category",ph:"Category (e.g. Family)",list:"attCatList"},{k:"count",ph:"How many",type:"number"}],counts,()=>total());
 function total(){const t=attTotals({present:[...present],counts},S.people);$("at_tot").innerHTML=`Present: <b>${t.total}</b>`+(t.total?" — "+Object.entries(t.by).map(([c,n])=>`${esc(c)} ${n}`).join(" · "):"")}
 function names(){const box=$("at_names");if(!curEv){box.innerHTML='<p class="muted">Choose an event first.</p>';return}
  if(!S.people.length){box.innerHTML='<p class="muted">Your people list is empty. Add names below.</p>';return}
  box.innerHTML=cats().map(c=>{const L=S.people.filter(p=>(p.category||"Member")===c).sort((a,b)=>a.name.localeCompare(b.name));return L.length?`<h4>${esc(c)} <button type="button" class="btn alt sm" data-all="${esc(c)}">Select all</button></h4><div class="songchecks">${L.map(p=>`<label><input type="checkbox" data-p="${esc(p.id)}" ${present.has(p.id)?"checked":""}> ${esc(p.name)}</label>`).join("")}</div>`:""}).join("");
  box.querySelectorAll("[data-p]").forEach(c=>c.onchange=()=>{c.checked?present.add(c.dataset.p):present.delete(c.dataset.p);total()});
  box.querySelectorAll("[data-all]").forEach(b=>b.onclick=()=>{S.people.filter(p=>(p.category||"Member")===b.dataset.all).forEach(p=>present.add(p.id));names();total()})}
 $("at_ev").onchange=()=>{curEv=$("at_ev").value;present=new Set();counts.splice(0,counts.length);const e=S.events.find(x=>x.id===curEv),a=S.attendance.find(x=>x.eventId===curEv);
  if(a){(a.present||[]).forEach(i=>present.add(i));(a.counts||[]).forEach(c=>counts.push({...c}))}
  else if(e){const txt=(e.preacher||"")+" | "+programList(e).map(x=>x.assignedTo).join(" | ");const low=txt.toLowerCase();S.people.forEach(p=>{if(p.name&&low.includes(p.name.toLowerCase()))present.add(p.id)})}
  ced.draw();names();total();msg("at_m","")};
 const addPerson=(n,c)=>{n=n.trim();if(!n)return null;const ex=S.people.find(p=>p.name.toLowerCase()===n.toLowerCase());if(ex)return ex;const p={id:uid("people","p-"+(slug(n)||"person")),name:n,category:(c||"").trim()||"FST Core"};S.people.push(p);touch("people");return p};
 $("at_addc").onclick=()=>{counts.push({category:"",count:""});ced.draw()};
 $("at_qa").onclick=()=>{const p=addPerson($("at_qn").value,$("at_qc").value);if(!p)return msg("at_m","Type a name first.",false);present.add(p.id);$("at_qn").value="";fillCats();names();total();list();msg("at_m","Added "+p.name+" to the list and marked present.")};
 $("at_save").onclick=()=>{if(!curEv)return msg("at_m","Choose an event first.",false);const e=S.events.find(x=>x.id===curEv),cl=counts.filter(c=>(c.category||"").trim()&&Number(c.count)>0).map(c=>({category:c.category.trim(),count:Math.round(Number(c.count))}));
  const rec={id:"att-"+curEv,eventId:curEv,date:e?e.date||"":"",present:[...present],counts:cl};const i=S.attendance.findIndex(x=>x.eventId===curEv);if(i>=0)S.attendance[i]=rec;else S.attendance.push(rec);touch("attendance");
  const t=attTotals(rec,S.people);msg("at_m","Saved: "+t.total+" present. Tap Publish now below.");$("at_ev").querySelector(`option[value="${CSS.escape(curEv)}"]`).textContent=(e.date?date(e.date)+" · ":"")+e.name+" ✓"};
 function list(){const q=$("pp_q").value.trim().toLowerCase(),ul=$("pp_L");ul.innerHTML="";const L=S.people.filter(p=>!q||(p.name+" "+(p.category||"")).toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
  if(!L.length){ul.innerHTML='<li class="muted">Nothing here yet.</li>';return}
  L.forEach(p=>{const li=document.createElement("li"),s=document.createElement("span");s.textContent=`${p.name} — ${p.category||"Member"}`;li.appendChild(s);
   [["Edit",()=>{edP=p.id;$("pp_n").value=p.name;$("pp_c").value=p.category||"";$("pp_save").textContent="Update person";$("pp_n").focus()}],["Delete",()=>{if(confirm("Remove "+p.name+" from the list? Their past attendance will no longer be counted.")){S.people=S.people.filter(x=>x.id!==p.id);S.attendance.forEach(a=>a.present=(a.present||[]).filter(i=>i!==p.id));touch("people");touch("attendance");present.delete(p.id);list();names();total();fillCats()}}]].forEach(([n,fn])=>{const b=document.createElement("button");b.type="button";b.className="btn alt sm";b.textContent=n;b.onclick=fn;li.appendChild(b)});ul.appendChild(li)})}
 const clearP=()=>{edP=null;$("pp_n").value="";$("pp_c").value="";$("pp_save").textContent="Add person"};
 $("pp_clear").onclick=clearP;$("pp_q").oninput=list;
 $("pp_save").onclick=()=>{const n=$("pp_n").value.trim(),c=$("pp_c").value.trim()||"FST Core";if(!n)return msg("pp_m","Name is required.",false);
  if(edP){const p=S.people.find(x=>x.id===edP);p.name=n;p.category=c;msg("pp_m","Updated.")}else{if(S.people.some(p=>p.name.toLowerCase()===n.toLowerCase())&&!confirm("Someone with this name is already on the list. Add anyway?"))return;S.people.push({id:uid("people","p-"+(slug(n)||"person")),name:n,category:c});msg("pp_m","Added.")}
  touch("people");const m=$("pp_m").textContent;clearP();list();fillCats();names();total();msg("pp_m",m)};
 fillCats();list();names();total()}

/* ---------- Tab: New Believers ---------- */
function tabBelievers(){
 const el=$("tabBody");let ed=null,open=new Set();const evs=()=>S.events.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
 el.innerHTML=`<div class="card"><h3>New Believers</h3><p class="notice small">This list is shown to the whole team in the app. To protect them, use a first name and last initial (for example “Maria S.”), and do not write phone numbers or home addresses here.</p>
 <div id="bl_stats" class="stat3"></div></div>
 <div class="card"><h3 id="bl_ft">Add a person who received the Lord Jesus Christ</h3><div class="grid2"><label>Name *<input id="bl_n"></label><label>Date *<input id="bl_d" type="date"></label>
 <label class="wide">At which event<select id="bl_ev"><option value="">— Other / not at a listed event —</option>${evs().map(e=>`<option value="${esc(e.id)}">${esc((e.date?date(e.date)+" · ":"")+e.name)}</option>`).join("")}</select></label>
 <label>Status<select id="bl_s">${BEL_STATUS.map(s=>`<option>${s}</option>`).join("")}</select></label><label>Follow-up by<input id="bl_a" list="blPeople" placeholder="FST member assigned"></label><label class="wide">Notes<textarea id="bl_no" rows="2" placeholder="Example: prefers weekend visits"></textarea></label></div>
 <datalist id="blPeople">${S.people.map(p=>`<option value="${esc(p.name)}">`).join("")}</datalist>
 <div class="actions"><button type="button" class="btn" id="bl_save">Add</button><button type="button" class="btn alt" id="bl_clear">Clear</button></div><p class="msg" id="bl_m"></p></div>
 <div class="card"><h3>Needs follow-up</h3><p class="muted small">No follow-up for ${FU_DAYS} days or more.</p><ul class="rows" id="bl_due"></ul></div>
 <div class="card"><h3>All New Believers</h3><div class="grid2"><label>Search<input id="bl_q" type="search" placeholder="Name"></label><label>Status<select id="bl_fs"><option value="">All</option>${BEL_STATUS.map(s=>`<option>${s}</option>`).join("")}</select></label></div><div id="bl_L"></div></div>`;
 const g=i=>$("bl_"+i),evName=id=>{const e=S.events.find(x=>x.id===id);return e?e.name:""};
 const stats=()=>{const t=believerStats(S.believers);$("bl_stats").innerHTML=`<div><small>Reached</small><b>${t.reached}</b></div><div><small>Followed up</small><b>${t.fu}</b></div><div><small>Went to CFC</small><b>${t.everCFC}</b></div><div><small>Now Members</small><b>${t.member}</b></div><div><small>Follow-ups done</small><b>${t.totalFU}</b></div><div><small>Need follow-up</small><b>${t.due}</b></div>`};
 const clear=()=>{ed=null;["n","d","a","no"].forEach(i=>g(i).value="");g("ev").value="";g("s").value="New Believer";g("d").value=tdy();g("save").textContent="Add";$("bl_ft").textContent="Add a person who received the Lord Jesus Christ"};
 g("clear").onclick=clear;
 g("ev").onchange=()=>{const e=S.events.find(x=>x.id===g("ev").value);if(e&&e.date&&!ed)g("d").value=e.date};
 g("save").onclick=()=>{const n=g("n").value.trim(),d0=g("d").value;if(!n)return msg("bl_m","Name is required.",false);if(!d0)return msg("bl_m","Please choose the date.",false);
  if(ed){const b=S.believers.find(x=>x.id===ed),ns=g("s").value;if(ns!==b.status){b.history=[...(b.history||[]),{status:ns,date:tdy()}]}Object.assign(b,{name:n,date:d0,eventId:g("ev").value,eventName:evName(g("ev").value),status:ns,assignedTo:g("a").value.trim(),notes:g("no").value.trim()});msg("bl_m","Updated.")}
  else{if(S.believers.some(b=>b.name.toLowerCase()===n.toLowerCase()&&b.date===d0)&&!confirm("This person is already recorded on that date. Add anyway?"))return;const s=g("s").value;
   S.believers.push({id:uid("believers","nb-"+d0+"-"+(slug(n).slice(0,20)||"person")),name:n,date:d0,eventId:g("ev").value,eventName:evName(g("ev").value),status:s,assignedTo:g("a").value.trim(),notes:g("no").value.trim(),followups:[],history:[{status:s,date:d0}]});msg("bl_m","Added. Tap Publish now below.")}
  touch("believers");const m=$("bl_m").textContent;clear();draw();msg("bl_m",m)};
 const bl=(b)=>{const n=(b.followups||[]).length,lf=lastFU(b);return `<article class="item"><h3>${esc(b.name)} <span class="pill ${fuDue(b)?"dirty":""}">${esc(b.status)}</span></h3><p class="muted small">Received the Lord: ${date(b.date)}${b.eventName||evName(b.eventId)?" · "+esc(b.eventName||evName(b.eventId)):""}${b.assignedTo?" · Follow-up by "+esc(b.assignedTo):""}</p><p class="small"><b>${n}</b> follow-up${n===1?"":"s"}${lf?" · last "+date(lf):""}${fuDue(b)?" · <b>needs follow-up</b>":""}</p>${b.notes?`<p class="small preline">${esc(b.notes)}</p>`:""}
  ${(b.followups||[]).length?`<ul class="small">${(b.followups||[]).slice().sort((x,y)=>(y.date||"").localeCompare(x.date||"")).map(f=>`<li>${date(f.date)} — ${esc(f.how||"")}${f.by?" by "+esc(f.by):""}${f.notes?": "+esc(f.notes):""} <button type="button" class="btn alt sm" data-delfu="${esc(b.id)}|${(b.followups||[]).indexOf(f)}" aria-label="Remove follow-up">✕</button></li>`).join("")}</ul>`:""}
  ${open.has(b.id)?`<div class="grid2" data-fuform="${esc(b.id)}"><label>Date<input type="date" data-f="d" value="${tdy()}"></label><label>How<select data-f="h">${FU_HOW.map(h=>`<option>${h}</option>`).join("")}</select></label><label>By<input data-f="b" list="blPeople" value="${esc(b.assignedTo||"")}"></label><label class="wide">Notes<input data-f="n" placeholder="What happened?"></label><div class="actions wide"><button type="button" class="btn sm" data-fusave="${esc(b.id)}">Save follow-up</button><button type="button" class="btn alt sm" data-fucancel="${esc(b.id)}">Cancel</button></div></div>`:""}
  <div class="actions"><button type="button" class="btn sm" data-fu="${esc(b.id)}">+ Log follow-up</button><select data-st="${esc(b.id)}" aria-label="Change status">${BEL_STATUS.map(s=>`<option ${s===b.status?"selected":""}>${s}</option>`).join("")}</select><button type="button" class="btn alt sm" data-edit="${esc(b.id)}">Edit</button><button type="button" class="btn alt sm" data-del="${esc(b.id)}">Delete</button></div></article>`};
 function draw(){stats();const q=g("q").value.trim().toLowerCase(),fs=g("fs").value,L=S.believers.filter(b=>(!q||b.name.toLowerCase().includes(q))&&(!fs||b.status===fs)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const due=S.believers.filter(fuDue).sort((a,b)=>(lastFU(a)||a.date).localeCompare(lastFU(b)||b.date));
  $("bl_due").innerHTML=due.length?due.map(b=>`<li><span>${esc(b.name)} — ${lastFU(b)?"last follow-up "+date(lastFU(b)):"no follow-up yet (since "+date(b.date)+")"}${b.assignedTo?" · "+esc(b.assignedTo):""}</span></li>`).join(""):'<li class="muted">Everyone is up to date. 🎉</li>';
  $("bl_L").innerHTML=L.length?L.map(bl).join(""):'<p class="muted">Nothing here yet.</p>'}
 $("bl_L").onclick=e=>{const t=e.target,B=id=>S.believers.find(x=>x.id===id);
  if(t.dataset.fu){open.add(t.dataset.fu);draw()}else if(t.dataset.fucancel){open.delete(t.dataset.fucancel);draw()}
  else if(t.dataset.fusave){const id=t.dataset.fusave,f=$("bl_L").querySelector(`[data-fuform="${CSS.escape(id)}"]`),v=k=>f.querySelector(`[data-f="${k}"]`).value.trim(),b=B(id);if(!v("d"))return alert("Please choose the date.");
   b.followups=[...(b.followups||[]),{date:v("d"),how:v("h"),by:v("b"),notes:v("n")}];if(b.status==="New Believer"){b.status="Following up";b.history=[...(b.history||[]),{status:"Following up",date:v("d")}]}open.delete(id);touch("believers");draw()}
  else if(t.dataset.delfu){const [id,i]=t.dataset.delfu.split("|"),b=B(id);if(confirm("Remove this follow-up entry?")){b.followups.splice(+i,1);touch("believers");draw()}}
  else if(t.dataset.edit){const b=B(t.dataset.edit);ed=b.id;g("n").value=b.name;g("d").value=b.date||"";g("ev").value=b.eventId||"";g("s").value=b.status;g("a").value=b.assignedTo||"";g("no").value=b.notes||"";g("save").textContent="Update";$("bl_ft").textContent="Edit: "+b.name;g("n").scrollIntoView({behavior:"smooth"})}
  else if(t.dataset.del){const b=B(t.dataset.del);if(confirm("Delete "+b.name+" and all follow-up records?")){S.believers=S.believers.filter(x=>x.id!==b.id);touch("believers");draw()}}};
 $("bl_L").onchange=e=>{const t=e.target;if(t.dataset.st){const b=S.believers.find(x=>x.id===t.dataset.st);if(b&&b.status!==t.value){b.status=t.value;b.history=[...(b.history||[]),{status:t.value,date:tdy()}];touch("believers");draw()}}};
 g("q").oninput=g("fs").onchange=draw;clear();draw()}
