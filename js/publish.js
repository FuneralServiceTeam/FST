/* Publishing + login for the Secretary Workspace.
   Gateway mode (window.FST_API set): the Secretary logs in once per device with a passcode.
   The GitHub token lives only on the gateway server, never in this browser.
   Legacy mode (FST_API empty): the old "paste a GitHub token" method keeps working until the gateway is set up. */
const API=(window.FST_API||"").replace(/\/+$/,""),SKEY="fst-session-v1",rawFetch=window.fetch.bind(window);
const sess=()=>{try{const s=JSON.parse(localStorage.getItem(SKEY)||"null");return s&&s.token&&s.exp>Date.now()?s:null}catch(e){return null}};
const endSession=()=>{try{localStorage.removeItem(SKEY)}catch(e){}};

/* ---------- legacy token mode helpers (only used when FST_API is empty) ---------- */
const GHKEY="fst-gh-v1";
const GH=()=>{let c={};try{c=JSON.parse(localStorage.getItem(GHKEY)||"{}")}catch(e){}
 const h=location.hostname,p=location.pathname.split("/");
 if(/\.github\.io$/.test(h)){if(!c.owner)c.owner=h.split(".")[0];if(!c.repo&&p[1]&&!/\.html$/.test(p[1]))c.repo=p[1]}
 c.branch=c.branch||"main";return c};
const GHok=c=>!!(c.owner&&c.repo&&c.token);
const GHurl=(c,path)=>`https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}`;
const GHhead=(c,raw)=>({Authorization:"Bearer "+c.token,Accept:raw?"application/vnd.github.raw+json":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"});
const GHb64=s=>{const b=new TextEncoder().encode(s);let t="";for(let i=0;i<b.length;i+=8192)t+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(t)};
async function GHput(c,path,b64){
 const q="?ref="+encodeURIComponent(c.branch);let sha;
 const g=await rawFetch(GHurl(c,path)+q,{headers:GHhead(c),cache:"no-store"});
 if(g.ok)sha=(await g.json()).sha;else if(g.status!==404)throw Error("GitHub "+g.status+(g.status===401?" – invalid or expired token":g.status===403||g.status===404?" – no permission":""));
 const r=await rawFetch(GHurl(c,path),{method:"PUT",headers:GHhead(c),body:JSON.stringify({message:"Update "+path+" (Secretary Workspace)",content:b64,branch:c.branch,sha})});
 if(!r.ok){let m="";try{m=(await r.json()).message}catch(e){}throw Error("GitHub "+r.status+" "+m)}}
class AuthError extends Error{}
async function api(path,body,method){
 const s=sess();if(!s)throw new AuthError("Please log in again.");
 let r;try{r=await rawFetch(API+path,{method:method||(body?"POST":"GET"),headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.token},body:body?JSON.stringify(body):undefined,cache:"no-store"})}
 catch(e){throw Error("No connection to the publishing service. Check your internet and try again.")}
 if(r.status===401){endSession();showLogin("Your session ended. Please log in again. Your saved work is safe.");throw new AuthError("Session ended. Please log in again.")}
 if(!r.ok){let m="";try{m=(await r.json()).error}catch(e){}throw Error(m||"Publishing service error ("+r.status+")")}
 return r}

/* ---------- login / logout ---------- */
function showLogin(note){$("workspace").classList.add("hidden");$("pinPanel").classList.remove("hidden");$("pin").value="";if(note)$("pinMsg").textContent=note}
function showWorkspace(){$("pinPanel").classList.add("hidden");$("workspace").classList.remove("hidden");$("lock").textContent=API?"Log out":"Lock";loadAll()}
function setupLoginPanel(){
 if(API){$("pinTitle").textContent="Secretary Login";$("pinLabel").textContent="Passcode";$("pin").type="password";$("pin").removeAttribute("inputmode");$("pin").placeholder="Enter your passcode";$("unlock").textContent="Log in";$("pin").autocomplete="current-password"}
 else{$("pinMsg").innerHTML='<span class="msg bad">Setup needed: the secure publishing service is not connected yet, so the older token method is being used. See worker/README.md.</span>'}}
async function doUnlock(){
 const v=$("pin").value,btn=$("unlock");
 if(!API){if(v===ADMIN_PIN)showWorkspace();else $("pinMsg").textContent="Incorrect PIN.";return}
 if(!v){$("pinMsg").textContent="Please enter your passcode.";return}
 btn.disabled=true;$("pinMsg").textContent="Checking…";
 try{const r=await rawFetch(API+"/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode:v})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){$("pinMsg").textContent=j.error||"Could not log in.";return}
  localStorage.setItem(SKEY,JSON.stringify({token:j.token,exp:j.expires}));$("pinMsg").textContent="";showWorkspace()}
 catch(e){$("pinMsg").textContent="No connection to the publishing service. Check your internet and try again."}
 finally{btn.disabled=false}}
$("unlock").onclick=doUnlock;
$("pin").onkeydown=e=>{if(e.key==="Enter")doUnlock()};
$("lock").onclick=()=>{if(API)endSession();showLogin(API?"You are logged out.":"")};
setupLoginPanel();
if(API&&sess()){showWorkspace();api("/session").catch(()=>{})}

/* ---------- read latest data (gateway) ---------- */
window.fetch=(u,o)=>{
 if(API&&sess()&&typeof u==="string"&&/^data\/[\w-]+\.json$/.test(u))
  return rawFetch(API+"/read?path="+encodeURIComponent(u),{headers:{Authorization:"Bearer "+sess().token},cache:"no-store"}).then(r=>r.ok?r:rawFetch(u,o)).catch(()=>rawFetch(u,o));
 if(!API&&typeof u==="string"&&/^data\/[\w-]+\.json$/.test(u)){const c=GH();if(GHok(c))return rawFetch(GHurl(c,u)+"?ref="+encodeURIComponent(c.branch),{headers:GHhead(c,true),cache:"no-store"}).then(r=>r.ok?r:rawFetch(u,o)).catch(()=>rawFetch(u,o))}
 return rawFetch(u,o)};

/* ---------- image upload (gateway only) ---------- */
const fileToB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=()=>rej(Error("Could not read the file."));r.readAsDataURL(f)});
/* Big phone photos are scaled down (max 2400px) so uploads are quick; small files are sent unchanged. */
async function prepImage(f){
 if(!/^image\/(jpeg|png|webp)$/.test(f.type))throw Error("Please choose a JPG, PNG or WebP picture.");
 if(f.size<=3*1048576)return{b64:await fileToB64(f),ext:f.type==="image/png"?"png":f.type==="image/webp"?"webp":"jpg"};
 const bmp=await createImageBitmap(f),k=Math.min(1,2400/Math.max(bmp.width,bmp.height)),cv=document.createElement("canvas");
 cv.width=Math.round(bmp.width*k);cv.height=Math.round(bmp.height*k);cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);
 const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",.9));if(!blob)throw Error("Could not prepare the picture.");
 return{b64:await fileToB64(blob),ext:"jpg"}}
async function uploadImage(file,dir,nameBase){
 if(!API)throw Error("Picture upload needs the secure publishing service (see worker/README.md). For now, upload the picture to GitHub by hand.");
 const p=await prepImage(file),name=(slug(nameBase)||"image").slice(0,50)+"-"+Date.now().toString(36)+"."+p.ext,path="assets/"+dir+"/"+name;
 await api("/upload",{path,base64:p.b64});return path}

/* ---------- publish panel ---------- */
publish=function(){const ks=Object.keys(dirty).filter(k=>dirty[k]),p=$("publish");
 if(API)return publishGateway(p,ks);
 const c=GH(),ok=GHok(c);
 p.innerHTML=`<h3>Publish</h3>`+(ks.length?`<p><span class="pill dirty">Changed:</span> ${ks.map(k=>esc(FILES[k])).join(", ")}</p>`:'<p class="muted">No unpublished changes.</p>')
 +(ok?`<div class="actions"><button type="button" class="btn" id="ghGo" ${ks.length?"":"disabled"}>🚀 Publish now</button></div>`:'<p class="notice">One-time setup: connect to GitHub below.</p>')
 +`<p class="msg" id="ghMsg"></p><details ${ok?"":"open"}><summary>⚙ GitHub connection</summary><div class="grid2"><label>Owner<input id="ghO" value="${esc(c.owner||"")}"></label><label>Repository<input id="ghR" value="${esc(c.repo||"")}"></label><label>Branch<input id="ghB" value="${esc(c.branch)}"></label><label>Token<input id="ghT" type="password" autocomplete="off" placeholder="${c.token?"saved – leave blank to keep":"github_pat_…"}"></label></div><div class="actions"><button type="button" class="btn alt sm" id="ghSave">Save connection</button><button type="button" class="btn alt sm" id="ghOff">Disconnect</button></div></details>`
 +(ks.length?'<details><summary>Manual fallback (download files)</summary><div class="actions" id="dlBtns"></div></details>':"")
 +'<p class="muted small">Poster images and the devotion MP3 are uploaded to GitHub by hand in this older mode.</p>';
 $("ghSave").onclick=()=>{const o={owner:$("ghO").value.trim(),repo:$("ghR").value.trim(),branch:$("ghB").value.trim()||"main",token:$("ghT").value.trim()||c.token||""};try{localStorage.setItem(GHKEY,JSON.stringify(o))}catch(e){}loadAll().then(badges)};
 $("ghOff").onclick=()=>{if(confirm("Remove the saved token from this browser?")){try{localStorage.removeItem(GHKEY)}catch(e){}publish()}};
 if(ok&&ks.length)$("ghGo").onclick=async()=>{const btn=$("ghGo");btn.disabled=true;let done=[];
  try{for(const k of ks){if(k==="posters"){const e=posterErrors();if(e.length)throw Error("Fix the posters first: "+e.join("; "))}
    msg("ghMsg","Publishing "+FILES[k]+"…");await GHput(c,FILES[k],GHb64(JSON.stringify(out(k),null,2)+"\n"));delete dirty[k];done.push(k);persist()}
   if(!Object.keys(dirty).length){try{localStorage.removeItem(KEY)}catch(e){}}
   renderNav();publish();msg("ghMsg","✓ Published "+done.map(k=>FILES[k]).join(", ")+". Live on the app in about a minute.")}
  catch(e){renderNav();publish();msg("ghMsg","Not published: "+e.message+(done.length?" (already published: "+done.map(k=>FILES[k]).join(", ")+")":""),false)}};
 const box=$("dlBtns");if(box)ks.forEach(k=>{const b=document.createElement("button");b.type="button";b.className="btn sm";b.textContent="⬇ "+FILES[k].split("/").pop();b.onclick=()=>dl(k);box.appendChild(b)})};

function publishGateway(p,ks){
 p.innerHTML=`<h3>Publish</h3>`+(ks.length?`<p><span class="pill dirty">Not published yet:</span> ${ks.map(k=>esc(NAMES[k]||FILES[k])).join(", ")}</p>`:'<p class="muted">Everything is published. No changes waiting.</p>')
 +`<div class="actions"><button type="button" class="btn" id="ghGo" ${ks.length?"":"disabled"}>🚀 Publish now</button></div><p class="msg" id="ghMsg" role="status"></p>`
 +(ks.length?'<details><summary>Manual fallback (download files)</summary><div class="actions" id="dlBtns"></div></details>':"");
 if(ks.length)$("ghGo").onclick=async()=>{const btn=$("ghGo");if(btn.disabled)return;btn.disabled=true;const done=[];
  try{for(const k of ks){if(k==="posters"){const e=posterErrors();if(e.length)throw Error("Fix the posters first: "+e.join("; "))}
    msg("ghMsg","Publishing "+(NAMES[k]||FILES[k])+"…");await api("/publish",{path:FILES[k],content:JSON.stringify(out(k),null,2)+"\n"});delete dirty[k];done.push(k);persist()}
   if(!Object.keys(dirty).length){try{localStorage.removeItem(KEY)}catch(e){}}
   renderNav();publish();msg("ghMsg","✓ Published. Everyone will see it in about 20 seconds.")}
  catch(e){renderNav();publish();if(!(e instanceof AuthError))msg("ghMsg","Not published: "+e.message+(done.length?" (already published: "+done.map(k=>NAMES[k]||FILES[k]).join(", ")+")":"")+" Your work is still saved here. Try again.",false)}};
 const box=$("dlBtns");if(box)ks.forEach(k=>{const b=document.createElement("button");b.type="button";b.className="btn sm";b.textContent="⬇ "+FILES[k].split("/").pop();b.onclick=()=>dl(k);box.appendChild(b)})}

/* ---------- always-visible reminder: changes are NOT live until Publish now ---------- */
function pubBar(){let b=$("pubBar");if(!b){b=document.createElement("div");b.id="pubBar";b.setAttribute("role","status");document.body.appendChild(b)}
 const ks=Object.keys(dirty).filter(k=>dirty[k]),show=ks.length&&!$("workspace").classList.contains("hidden");
 b.className=show?"show":"";if(!show){b.innerHTML="";return}
 b.innerHTML=`<span><b>Not live yet.</b> Your changes (${ks.map(k=>esc(NAMES[k]||FILES[k])).join(", ")}) are saved only on this device.</span><button type="button" class="btn" id="pubBarGo">🚀 Publish now</button>`;
 $("pubBarGo").onclick=()=>{const g=$("ghGo");if(g&&!g.disabled){$("pubBarGo").disabled=true;g.click()}else $("publish").scrollIntoView({behavior:"smooth"})}}
{const _pub=publish;publish=function(){_pub();pubBar()}}
{const _bd=badges;badges=function(){_bd();pubBar()}}
pubBar();
