"use strict";
/* Shared helpers for the public app and the Secretary Workspace.
   The percentages are set in the Secretary Workspace (Percentages tab). */
/* Standard split of every amount received. Tithes is fixed at 10%. The Secretary sets the rest in the workspace (data/settings.json). */
const DEFAULT_SPLIT={tithes:10,offering:10,savings:10,operating:70};
let SPLIT={...DEFAULT_SPLIT};
let EXTRA_PREACHERS=[];
function setSplit(st){EXTRA_PREACHERS=Array.isArray(st&&st.preachers)?st.preachers.map(v=>String(v).trim()).filter(Boolean):[];const x={...DEFAULT_SPLIT,...((st&&st.split)||{})};["offering","savings","operating"].forEach(k=>x[k]=Number(x[k])||0);x.tithes=10;SPLIT=(x.offering+x.savings+x.operating===90)?x:{...DEFAULT_SPLIT}}
const budgetRows=sp=>{sp=sp||SPLIT;return[["Tithes",sp.tithes],["Offering",sp.offering],["Savings",sp.savings],["Operating Fund (food, transportation, supplies and other needs)",sp.operating]]};
function splitParts(a,sp){sp=sp||SPLIT;a=Number(a)||0;const t=r2(a*sp.tithes/100),o=r2(a*sp.offering/100),v=r2(a*sp.savings/100);return{tithes:t,offering:o,savings:v,operating:r2(a-t-o-v)}}

/* Worship services of Calvary Foursquare Church (name, 24h time) */
const WORSHIP=[["Saturday Worship Service","10:00"],["Sunday Worship Service","08:00"],["Sunday Worship Service","10:30"],["Sunday Worship Service","16:00"]];
const wsLabel=w=>w[0]+" – "+fmtTime(w[1]);
const SVC_TYPES=["Funeral Service","Memorial Service","Committal Service","FST Core Devotion","Training","Other"];
const DECEASED_TYPES=["Funeral Service","Memorial Service","Committal Service"];
const PREACHERS=["Pastor Jules Atienza","Rev. Darell Maghirang","Pastor Jhonnel Chavez","Elder Alex Espinar","Elder Edgar \"Gagal\" Rivera"];
/* Usual preachers + guests added in the Secretary Workspace + anyone already used in an event. */
function preacherList(events){const seen=new Set(),o=[];[...PREACHERS,...EXTRA_PREACHERS,...(events||[]).map(e=>(e.preacher||"").trim())].forEach(n=>{const k=n.toLowerCase();if(n&&!seen.has(k)){seen.add(k);o.push(n)}});return o}
const FUND_NAMES={operating:"Operating Fund",savings:"Savings",offering:"Offering"};
const fundName=v=>FUND_NAMES[v]||"Operating Fund";
const fundKey=v=>v==="savings"||v==="offering"?v:"operating";
/* Type of a service, taken from the event, the report, or guessed from the text. */
function svcType(f,events){const e=(events||[]).find(v=>v.id===f.eventId)||{};if(f.serviceType)return f.serviceType;if(e.type)return e.type;
 const nm=String(f.eventName||e.name||""),pre=nm.split("|")[0].trim(),hit=SVC_TYPES.find(t=>t.toLowerCase()===pre.toLowerCase());if(hit)return hit;
 const txt=(nm+" "+(e.announcement||"")).toLowerCase();return /committal/.test(txt)?"Committal Service":/funeral/.test(txt)?"Funeral Service":/memorial/.test(txt)?"Memorial Service":/devotion/.test(txt)?"FST Core Devotion":/training/.test(txt)?"Training":"Other"}
/* Title shown in transaction lists: the type of service, never the name of the deceased. */
function txTitle(f,events){const t=svcType(f,events);return t==="Other"?"Other activity":t}
const EXPENSE_CATS=["Food","Transportation","Sound / Equipment","Supplies","Printing","Other"];
const FILES={events:"data/events.json",assignments:"data/assignments.json",finances:"data/finances.json",ledger:"data/ledger.json",announcements:"data/announcements.json",posters:"data/posters.json",devotion:"data/devotion.json",settings:"data/settings.json",songs:"data/songs.json",people:"data/people.json",attendance:"data/attendance.json",believers:"data/believers.json"};
const $=id=>document.getElementById(id);
const r2=n=>Math.round((Number(n)||0)*100)/100;
const cash=n=>"₱"+r2(n).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function pd(s){if(!s)return null;const x=new Date(s+"T12:00:00");return isNaN(x)?null:x}
function date(s){const x=pd(s);return x?x.toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"}):"Date not provided"}
function dateLong(s){const x=pd(s);return x?x.toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}):""}
function dayName(s){const x=pd(s);return x?x.toLocaleDateString("en-US",{weekday:"long"}):""}
function fmtTime(t){const m=/^(\d{1,2}):(\d{2})$/.exec(t||"");if(!m)return t||"";const h=+m[1];return ((h+11)%12+1)+":"+m[2]+" "+(h<12?"AM":"PM")}
const sum=a=>r2((a||[]).reduce((s,x)=>s+(Number(x.amount)||0),0));
function totals(f){const al=f.allocations||[],g=re=>sum(al.filter(x=>re.test(x.category||"")));const r=sum(f.received),e=sum(f.expenses),a=sum(al);return{r,e,a,bal:r2(r-e-a),tithes:g(/tithe/i),offering:g(/offering/i),savings:g(/saving/i)}}
function recvLabel(x){return x.donor?`${x.source||"Gift"} – ${x.donor}`:(x.source||"Anonymous")}
function list(a){return a.length<2?a.join(""):a.slice(0,-1).join(", ")+(a.length>2?",":"")+" and "+a.slice(-1)}
function summaryText(f){if(f.summary)return f.summary;const t=totals(f),R=f.received||[],E=f.expenses||[];
 const from=x=>x.donor?x.donor:(/^family$/i.test(x.source||"")?"the family":(x.source?x.source:"an anonymous giver"));
 let s=`The total amount received was ${cash(t.r)}`+(R.length?`, consisting of ${list(R.map(x=>`${cash(x.amount)} from ${from(x)}`))}`:"")+".";
 if(E.length)s+=` After paying ${list(E.map(x=>`${cash(x.amount)} for ${(x.category||"expenses").toLowerCase()}`))}, ${cash(t.r-t.e)} remained.`;
 const A=(f.allocations||[]).filter(x=>Number(x.amount)>0);if(A.length)s+=` Of this amount, ${list(A.map(x=>`${cash(x.amount)} was allocated for ${(x.category||"").toLowerCase()}`))}.`;
 s+=t.bal===0?" The full amount has been accounted for, leaving a ₱0.00 balance."+(t.savings===0?" No savings were set aside from these funds.":""):t.bal>0?` The remaining ${cash(t.bal)} was added to the Operating Fund.`:` The shortfall of ${cash(-t.bal)} was taken from the Operating Fund.`;return s}
/* Label such as "10/20/15/55" for a split; tag shown beside donations that used a custom split. */
const splitLabel=sp=>sp?[sp.tithes,sp.offering,sp.savings,sp.operating].map(v=>r2(v)).join("/"):"";
const donSplitTag=x=>x&&x.designation==="custom"&&x.split?" ("+splitLabel(x.split)+")":"";
function donationParts(x){const a=Number(x.amount)||0;if(x.parts)return{tithes:0,offering:0,savings:0,operating:0,...x.parts};return x.designation==="operating"?{tithes:0,offering:0,savings:0,operating:a}:x.designation==="savings"?{tithes:0,offering:0,savings:a,operating:0}:splitParts(a,x.split)}
/* One list of every money movement for the two funds, with running balances. */
function buildFunds(fin,led){const M=[],G={tithes:0,offering:0},Rm={tithes:0,offering:0},Xo={i:0,o:0};let rec=0,spent=0;
 (fin||[]).forEach(f=>{const t=totals(f),d0=f.date||"",share=r2(t.r-t.a),n=f.eventName||"service";rec+=t.r;spent+=t.e;G.tithes+=t.tithes;G.offering+=t.offering;
  if(share)M.push({date:d0,fund:"operating",delta:share,details:"From service: "+n,rid:f.id,kind:"service"});
  if(t.e)M.push({date:d0,fund:"operating",delta:-t.e,details:"Expenses: "+n,rid:f.id,kind:"service"});
  if(t.savings)M.push({date:d0,fund:"savings",delta:t.savings,details:"Savings from "+n,rid:f.id,kind:"service"});
  if(t.offering)M.push({date:d0,fund:"offering",delta:t.offering,details:"Offering set aside from "+n,rid:f.id,kind:"service"})});
 (led||[]).forEach(x=>{const a=Number(x.amount)||0,d0=x.date||"",fu=x.fund==="savings"?"savings":"operating",nm=x.details?" – "+x.details:"";
  if(x.type==="donation"){const p=donationParts(x);rec+=a;G.tithes+=p.tithes;G.offering+=p.offering;const who=x.donor||x.source||"Donation";
   if(p.operating)M.push({date:d0,fund:"operating",delta:p.operating,details:"Donation: "+who+donSplitTag(x),lid:x.id,kind:"donation"});if(p.savings)M.push({date:d0,fund:"savings",delta:p.savings,details:"Donation: "+who+donSplitTag(x),lid:x.id,kind:"donation"});if(p.offering)M.push({date:d0,fund:"offering",delta:p.offering,details:"Offering set aside from donation: "+who,lid:x.id,kind:"donation"})}
  else if(x.type==="expense"){spent+=a;M.push({date:d0,fund:fu,delta:-a,details:"Expense: "+(x.category||"Other")+nm,lid:x.id,kind:"expense"})}
  else if(x.type==="deposit")M.push({date:d0,fund:fu,delta:a,details:"Deposit"+nm,lid:x.id,kind:"deposit"});
  else if(x.type==="withdrawal")M.push({date:d0,fund:fu,delta:-a,details:"Withdrawal"+nm,lid:x.id,kind:"withdrawal"});
  else if(x.type==="remit"){Rm.tithes+=Number(x.tithes)||0;Rm.offering+=Number(x.offering)||0;if(Number(x.offering)>0)M.push({date:d0,fund:"offering",delta:-Number(x.offering),details:"Offering given to the Church"+(x.service?" ("+x.service+")":""),lid:x.id,kind:"remit"})}
  else if(x.type==="transfer"){const fr=fundKey(x.from),to=fundKey(x.to);if(fr!==to){if(to==="offering")Xo.i+=a;if(fr==="offering")Xo.o+=a}M.push({date:d0,fund:fr,delta:-a,details:"Transfer to "+fundName(to)+nm,lid:x.id,kind:"transfer"},{date:d0,fund:to,delta:a,details:"Transfer from "+fundName(fr)+nm,lid:x.id,kind:"transfer"})}});
 M.sort((a,b)=>(a.date||"").localeCompare(b.date||""));const bal={operating:0,savings:0,offering:0};M.forEach(m=>{bal[m.fund]=r2(bal[m.fund]+m.delta);m.bal=bal[m.fund]});
 /* TITHES and OFFERING are always kept apart. Offering set aside = share of services + share of donations + transfers INTO the Offering fund.
 Offering not yet given = set aside - given to the Church - transfers OUT of the Offering fund (this always equals the Offering fund balance). */
 const offIn=r2(G.offering+Xo.i),dueO=r2(offIn-Rm.offering-Xo.o);
 if(Math.abs(dueO-bal.offering)>0.005&&typeof console!=="undefined")console.warn("FST: Offering figures do not match",dueO,bal.offering);
 return{M,bal,setAside:{tithes:r2(G.tithes),offering:offIn,offeringFromTransfers:r2(Xo.i)},given:{tithes:r2(Rm.tithes),offering:r2(Rm.offering)},movedOut:{offering:r2(Xo.o)},due:{tithes:r2(G.tithes-Rm.tithes),offering:dueO},received:r2(rec),spent:r2(spent)}}
function catName(c){const s=String(c||"Other").trim().replace(/\s+expenses?$/i,"")||"Other";return s.charAt(0).toUpperCase()+s.slice(1)}
function allExpenses(fin,led,events){const o=[];(fin||[]).forEach(f=>(f.expenses||[]).forEach(x=>o.push({date:f.date||"",cat:catName(x.category),details:x.details||"",amount:Number(x.amount)||0,event:f.eventName||"",rid:f.id})));
 (led||[]).filter(x=>x.type==="expense").forEach(x=>{const e=(events||[]).find(v=>v.id===x.eventId);o.push({date:x.date||"",cat:catName(x.category),details:x.details||"",amount:Number(x.amount)||0,event:e?e.name:"",fund:x.fund})});
 return o.sort((a,b)=>(b.date||"").localeCompare(a.date||""))}
function allReceipts(fin,led){const o=[];(fin||[]).forEach(f=>(f.received||[]).forEach(x=>o.push({date:f.date||"",from:recvLabel(x),details:x.details||"",ctx:f.eventName||"Service",amount:Number(x.amount)||0})));
 (led||[]).filter(x=>x.type==="donation").forEach(x=>o.push({date:x.date||"",from:x.donor?`${x.source||"Gift"} – ${x.donor}`:(x.source||"Anonymous"),details:x.details||"",ctx:"General donation",amount:Number(x.amount)||0}));
 return o.sort((a,b)=>(b.date||"").localeCompare(a.date||""))}
function programList(e){return (e.program||[]).map(x=>typeof x==="string"?{item:x,assignedTo:""}:x).filter(x=>x&&(x.item||x.title)).map(x=>({item:x.item||x.title,assignedTo:x.assignedTo||""}))}
function announceText(e){const L=["ANNOUNCEMENT",""];if(e.name)L.push(e.name,"");
 const add=(l,v,s)=>{if(v)L.push(`${l}: ${v}${s?" – "+s:""}`)};
 add("Date",dateLong(e.date)+(e.date?" ("+dayName(e.date)+")":""));add("Meet-up at Church",fmtTime(e.meetupTime),e.meetupPlace);add("Departure from Church",fmtTime(e.departureTime));add("Memorial Service Time",fmtTime(e.time));add("Preacher / Speaker",e.preacher);add("Venue",e.venue,e.venueArea);add("Sound System Preparation",e.soundPlace,e.soundBy);
 const p=programList(e);if(p.length){L.push("","PROGRAM FLOW");p.forEach((x,i)=>L.push(`${i+1}. ${x.item}${x.assignedTo?" – "+x.assignedTo:""}`))}
 if(e.dressCode)L.push("","Dress Code: "+e.dressCode);return L.join("\n")}

/* Tithes & Offering statement: amounts set aside (+) and amounts given to the Church (−), with a running balance of what is NOT yet given. */
function tithesRows(fin,led,events){const o=[];
 (fin||[]).forEach(f=>{const t=totals(f);if(t.tithes||t.offering)o.push({date:f.date||"",kind:"set",title:txTitle(f,events),note:"Set aside from this service",tithes:t.tithes,offering:t.offering,rid:f.id})});
 (led||[]).forEach(x=>{if(x.type==="donation"){const p=donationParts(x);if(p.tithes||p.offering)o.push({date:x.date||"",kind:"set",title:"Donation",note:"Set aside from a donation",tithes:p.tithes,offering:p.offering})}
  else if(x.type==="transfer"&&(x.to==="offering"||x.from==="offering")&&x.to!==x.from){const a=Number(x.amount)||0;if(x.to==="offering")o.push({date:x.date||"",kind:"set",title:"Transfer to Offering",note:"From "+fundName(x.from)+(x.details?" – "+x.details:""),tithes:0,offering:a});else o.push({date:x.date||"",kind:"xout",title:"Transfer out of Offering",note:"To "+fundName(x.to)+(x.details?" – "+x.details:""),tithes:0,offering:a})}
  else if(x.type==="remit")o.push({date:x.date||"",kind:"given",title:"Given to the Church",service:x.service||"",time:x.time||"",note:x.details||"",tithes:Number(x.tithes)||0,offering:Number(x.offering)||0})});
 o.sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.kind==="set"?0:1)-(b.kind==="set"?0:1));
 let bt=0,bo=0;o.forEach(x=>{const s=x.kind==="set"?1:-1;bt=r2(bt+s*x.tithes);bo=r2(bo+s*x.offering);x.balT=bt;x.balO=bo});return o}
/* Every money movement in one list (service reports, donations, expenses, deposits, withdrawals, transfers, Tithes & Offering given). */
function allTx(fin,led,events){const o=[];
 (fin||[]).forEach(f=>{const t=totals(f);o.push({date:f.date||"",title:txTitle(f,events),note:[t.r?"Received "+cash(t.r):"",t.e?"Expenses "+cash(t.e):"",svcType(f,events)==="Other"?(f.expenses||[]).map(x=>x.details).filter(Boolean).join(", "):""].filter(Boolean).join(" · "),inn:t.r,out:t.e,rid:f.id})});
 const FN=fundName;
 (led||[]).forEach(x=>{const a=Number(x.amount)||0,d0=x.date||"",dt=x.details||"";
  if(x.type==="donation")o.push({date:d0,title:"Donation",note:[x.donor?x.donor:(x.source||"Anonymous"),dt].filter(Boolean).join(" · "),inn:a,out:0});
  else if(x.type==="expense")o.push({date:d0,title:"Expense – "+catName(x.category),note:dt,inn:0,out:a});
  else if(x.type==="deposit")o.push({date:d0,title:"Deposit to "+FN(x.fund),note:dt,inn:a,out:0});
  else if(x.type==="withdrawal")o.push({date:d0,title:"Withdrawal from "+FN(x.fund),note:dt,inn:0,out:a});
  else if(x.type==="transfer")o.push({date:d0,title:"Transfer "+FN(x.from)+" → "+FN(x.to),note:dt,inn:0,out:0,amt:a});
  else if(x.type==="remit"){const rn=[x.service,x.time?"at "+fmtTime(x.time):"",dt].filter(Boolean).join(" · ");if(Number(x.tithes)>0)o.push({date:d0,title:"Tithes given to the Church",note:rn,inn:0,out:Number(x.tithes)});if(Number(x.offering)>0)o.push({date:d0,title:"Offering given to the Church",note:rn,inn:0,out:Number(x.offering)})}});
 return o.sort((a,b)=>(b.date||"").localeCompare(a.date||""))}

/* ---------- Attendance & New Believers (shared by the app and the Secretary Workspace) ---------- */
const BASE_CATS=["FST Core","Preacher","Song Leader","Member"];
const BEL_STATUS=["New Believer","Following up","Attended CFC","Member","Unreachable"];
const FU_HOW=["Phone call","Text / Messenger","Home visit","Met at church","Other"];
const FU_DAYS=7; /* a person is "due" for follow-up when the last follow-up (or the day they received the Lord) is this many days ago */
function attCats(people,att){const s=new Set(BASE_CATS);(people||[]).forEach(p=>p.category&&s.add(p.category));(att||[]).forEach(a=>(a.counts||[]).forEach(c=>c.category&&s.add(c.category)));return[...s]}
function attTotals(a,people){const by={};let named=0,extra=0;(a.present||[]).forEach(id=>{const p=(people||[]).find(x=>x.id===id);if(!p)return;const c=p.category||"Member";by[c]=(by[c]||0)+1;named++});
 (a.counts||[]).forEach(c=>{const n=Number(c.count)||0;if(n>0&&c.category){by[c.category]=(by[c.category]||0)+n;extra+=n}});return{by,named,extra,total:named+extra}}
function lastFU(b){const f=(b.followups||[]).map(x=>x.date||"").filter(Boolean).sort();return f.length?f[f.length-1]:""}
function daysSince(s){const x=pd(s);if(!x)return null;const n=new Date();n.setHours(12,0,0,0);return Math.round((n-x)/864e5)}
function fuDue(b){if(b.status==="Member"||b.status==="Unreachable")return false;const n=daysSince(lastFU(b)||b.date);return n!==null&&n>=FU_DAYS}
const reachedCFC=b=>["Attended CFC","Member"].includes(b.status)||(b.history||[]).some(h=>["Attended CFC","Member"].includes(h.status));
function believerStats(bel){const r=bel||[];return{reached:r.length,fu:r.filter(b=>(b.followups||[]).length>0).length,everCFC:r.filter(reachedCFC).length,member:r.filter(b=>b.status==="Member").length,totalFU:r.reduce((s,b)=>s+(b.followups||[]).length,0),due:r.filter(fuDue).length}}