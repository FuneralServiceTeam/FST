/* One-tap publishing: pushes changed data/*.json straight to GitHub (no download/upload).
   Needs a fine-grained token (Contents: read & write, this repo only), saved in this browser only. */
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
 const g=await fetch(GHurl(c,path)+q,{headers:GHhead(c),cache:"no-store"});
 if(g.ok)sha=(await g.json()).sha;else if(g.status!==404)throw Error("GitHub "+g.status+(g.status===401?" – invalid or expired token":g.status===403||g.status===404?" – no permission":""));
 const r=await fetch(GHurl(c,path),{method:"PUT",headers:GHhead(c),body:JSON.stringify({message:"Update "+path+" (Secretary Workspace)",content:b64,branch:c.branch,sha})});
 if(!r.ok){let m="";try{m=(await r.json()).message}catch(e){}throw Error("GitHub "+r.status+" "+m)}}
/* Read data straight from GitHub (always latest, no 1-minute Pages delay) when connected. */
const GHfetch=window.fetch.bind(window);
window.fetch=(u,o)=>{const c=GH();
 if(GHok(c)&&typeof u==="string"&&/^data\/[\w-]+\.json$/.test(u))return GHfetch(GHurl(c,u)+"?ref="+encodeURIComponent(c.branch),{headers:GHhead(c,true),cache:"no-store"}).then(r=>r.ok?r:GHfetch(u,o)).catch(()=>GHfetch(u,o));
 return GHfetch(u,o)};

publish=function(){const ks=Object.keys(dirty).filter(k=>dirty[k]),p=$("publish"),c=GH(),ok=GHok(c);
 p.innerHTML=`<h3>Publish</h3>`+(ks.length?`<p><span class="pill dirty">Changed:</span> ${ks.map(k=>esc(FILES[k])).join(", ")}</p>`:'<p class="muted">No unpublished changes.</p>')
 +(ok?`<div class="actions"><button type="button" class="btn" id="ghGo" ${ks.length?"":"disabled"}>🚀 Publish now</button></div>`:'<p class="notice">One-time setup: connect to GitHub below.</p>')
 +`<p class="msg" id="ghMsg"></p><details ${ok?"":"open"}><summary>⚙ GitHub connection</summary><div class="grid2"><label>Owner<input id="ghO" value="${esc(c.owner||"")}"></label><label>Repository<input id="ghR" value="${esc(c.repo||"")}"></label><label>Branch<input id="ghB" value="${esc(c.branch)}"></label><label>Token<input id="ghT" type="password" autocomplete="off" placeholder="${c.token?"saved – leave blank to keep":"github_pat_…"}"></label></div><div class="actions"><button type="button" class="btn alt sm" id="ghSave">Save connection</button><button type="button" class="btn alt sm" id="ghOff">Disconnect</button></div></details>`
 +(ks.length?'<details><summary>Manual fallback (download files)</summary><div class="actions" id="dlBtns"></div></details>':"")
 +'<p class="muted small">Poster images and the devotion MP3 are still uploaded to GitHub by hand (assets/…).</p>';
 $("ghSave").onclick=()=>{const o={owner:$("ghO").value.trim(),repo:$("ghR").value.trim(),branch:$("ghB").value.trim()||"main",token:$("ghT").value.trim()||c.token||""};try{localStorage.setItem(GHKEY,JSON.stringify(o))}catch(e){}loadAll().then(badges)};
 $("ghOff").onclick=()=>{if(confirm("Remove the saved token from this browser?")){try{localStorage.removeItem(GHKEY)}catch(e){}publish()}};
 if(ok&&ks.length)$("ghGo").onclick=async()=>{const btn=$("ghGo");btn.disabled=true;let done=[];
  try{for(const k of ks){if(k==="posters"){const e=posterErrors();if(e.length)throw Error("Fix the posters first: "+e.join("; "))}
    msg("ghMsg","Publishing "+FILES[k]+"…");await GHput(c,FILES[k],GHb64(JSON.stringify(out(k),null,2)+"\n"));delete dirty[k];done.push(k);persist()}
   if(!Object.keys(dirty).length){try{localStorage.removeItem(KEY)}catch(e){}}
   renderNav();publish();msg("ghMsg","✓ Published "+done.map(k=>FILES[k]).join(", ")+". Live on the app in about a minute.")}
  catch(e){renderNav();publish();msg("ghMsg","Not published: "+e.message+(done.length?" (already published: "+done.map(k=>FILES[k]).join(", ")+")":""),false)}};
 const box=$("dlBtns");if(box)ks.forEach(k=>{const b=document.createElement("button");b.type="button";b.className="btn sm";b.textContent="⬇ "+FILES[k].split("/").pop();b.onclick=()=>dl(k);box.appendChild(b)})};

