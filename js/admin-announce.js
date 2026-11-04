"use strict";
/* Announcement editor for the Secretary Workspace: create, edit, preview, publish/hide, delete, pictures. */
function annEditor(host){
 let ed=null,imgs=[],busy=false;
 host.innerHTML=`<div class="card" id="an_form"><h3>Announcements</h3>
 <p class="muted small">Write the announcement, add pictures if you have any, then tap Save. Nothing is public until you tap “Publish now” at the bottom of the page.</p>
 <div class="grid2"><label>Title *<input id="an_t" maxlength="120" autocomplete="off"></label><label>Date<input id="an_d" type="date"></label>
 <label class="wide">Message<textarea id="an_b" rows="9"></textarea></label>
 <label>Who can see it<select id="an_s"><option value="1">Published (everyone can see it)</option><option value="0">Draft (hidden for now)</option></select></label>
 <label class="check"><input type="checkbox" id="an_i"> Mark as important</label></div>
 <h4>Pictures</h4>
 <label>Add pictures (JPG, PNG or WebP)<input type="file" id="an_f" accept="image/jpeg,image/png,image/webp" multiple></label>
 <div id="an_imgs"></div>
 <div class="actions"><button type="button" class="btn" id="an_save">Save announcement</button><button type="button" class="btn alt" id="an_prev">Preview</button><button type="button" class="btn alt" id="an_clear">Cancel</button></div>
 <p class="msg" id="an_m" role="status"></p><div id="an_pv"></div></div>
 <div class="card"><h3>Saved announcements</h3><ul class="rows" id="an_rows"></ul></div>`;
 const g=id=>host.querySelector("#"+id);
 const cur=()=>({title:g("an_t").value.trim(),date:g("an_d").value,body:g("an_b").value.replace(/\s+$/,""),published:g("an_s").value==="1",important:g("an_i").checked,
  images:imgs.map(i=>({src:i.src,alt:(i.alt||"").trim()}))});
 const clear=()=>{ed=null;imgs=[];["an_t","an_d","an_b"].forEach(k=>g(k).value="");g("an_s").value="1";g("an_i").checked=false;g("an_save").textContent="Save announcement";g("an_pv").innerHTML="";g("an_f").value="";drawImgs()};
 function drawImgs(){const box=g("an_imgs");box.innerHTML="";
  imgs.forEach((im,k)=>{const row=document.createElement("div");row.className="an-img";
   row.innerHTML=`<img src="${esc(im.preview||im.src)}" alt=""><div><label>Describe this picture (for people with poor eyesight)<input maxlength="150" value="${esc(im.alt||"")}"></label><div class="actions"><button type="button" class="btn alt sm" data-up>↑ Move up</button><button type="button" class="btn danger sm" data-rm>Remove picture</button></div></div>`;
   row.querySelector("input").oninput=e=>{im.alt=e.target.value};
   row.querySelector("[data-rm]").onclick=()=>{if(confirm("Remove this picture from the announcement? (The file itself stays in GitHub.)")){imgs.splice(k,1);drawImgs()}};
   const up=row.querySelector("[data-up]");if(k===0)up.disabled=true;up.onclick=()=>{[imgs[k-1],imgs[k]]=[imgs[k],imgs[k-1]];drawImgs()};
   box.appendChild(row)})}
 g("an_f").onchange=async()=>{const files=[...g("an_f").files];if(!files.length)return;busy=true;g("an_save").disabled=true;
  for(const f of files){try{msg(g("an_m"),"Uploading "+f.name+"…");const src=await uploadImage(f,"announcements",g("an_t").value||"announcement");imgs.push({src,alt:"",preview:URL.createObjectURL(f)});drawImgs();msg(g("an_m"),"Picture added.")}
   catch(e){msg(g("an_m"),f.name+": "+e.message,false);break}}
  busy=false;g("an_save").disabled=false;g("an_f").value=""};
 g("an_prev").onclick=()=>{const a=cur();if(!a.title)return msg(g("an_m"),"Please write a title first.",false);
  const pv={...a,images:imgs.map(i=>({src:i.preview||i.src,alt:i.alt}))};
  g("an_pv").innerHTML=`<div class="card preview"><p class="notice">Preview: this is how it will look when someone opens it.</p>${annDetail(pv)}<button type="button" class="btn alt" id="an_pvx">Close preview</button></div>`;g("an_pvx").onclick=()=>g("an_pv").innerHTML="";g("an_pv").scrollIntoView({behavior:"smooth"})};
 g("an_clear").onclick=()=>{clear();msg(g("an_m"),"")};
 g("an_save").onclick=()=>{if(busy)return;const a=cur();if(!a.title)return msg(g("an_m"),"Please write a title.",false);
  if(a.published)delete a.published;else a.published=false;if(!a.important)delete a.important;if(!a.images.length)delete a.images;
  if(ed!==null&&S.announcements[ed]){const old=S.announcements[ed];const n={...old,...a};["published","important","images"].forEach(k=>{if(!(k in a))delete n[k]});S.announcements[ed]=n}
  else S.announcements.push({id:uid("announcements",slug(a.title)||"announcement"),...a});
  touch("announcements");const wasEdit=ed!==null;clear();rows();msg(g("an_m"),(wasEdit?"Changes saved.":"Announcement saved.")+" Tap “Publish now” at the bottom of the page to make it live.")};
 function rows(){const ul=g("an_rows");ul.innerHTML="";if(!S.announcements.length){ul.innerHTML='<li class="muted">No announcements yet.</li>';return}
  S.announcements.map((a,i)=>[a,i]).sort((x,y)=>(y[0].date||"").localeCompare(x[0].date||"")).forEach(([a,i])=>{
   const li=document.createElement("li"),s=document.createElement("span"),hidden=a.published===false;
   s.innerHTML=`<b>${esc(a.title||"(no title)")}</b><br><small class="muted">${esc(a.date||"no date")} · ${hidden?"Draft (hidden)":"Published"}${a.important?" · Important":""}${annImgs(a).length?" · "+annImgs(a).length+" picture"+(annImgs(a).length>1?"s":""):""}</small>`;li.appendChild(s);
   [["Edit",()=>{ed=i;g("an_t").value=a.title||"";g("an_d").value=a.date||"";g("an_b").value=a.body||"";g("an_s").value=hidden?"0":"1";g("an_i").checked=a.important===true;imgs=annImgs(a).map(x=>({src:x.src,alt:x.alt||""}));g("an_save").textContent="Update announcement";drawImgs();g("an_pv").innerHTML="";g("an_form").scrollIntoView({behavior:"smooth"})}],
    [hidden?"Publish":"Hide",()=>{if(hidden)delete a.published;else a.published=false;touch("announcements");rows();msg(g("an_m"),(hidden?"Now visible":"Now hidden")+". Tap “Publish now” at the bottom to apply.")}],
    ["Delete",()=>{if(confirm("Delete “"+(a.title||"this announcement")+"”?\nIt will be removed from the app once you tap Publish now. Pictures stay in GitHub.")){S.announcements.splice(i,1);if(ed===i)clear();touch("announcements");rows();msg(g("an_m"),"Deleted. Tap “Publish now” at the bottom to apply.")}}]
   ].forEach(([n,fn])=>{const b=document.createElement("button");b.type="button";b.className="btn sm "+(n==="Delete"?"danger":"alt");b.textContent=n;b.onclick=fn;li.appendChild(b)});
   ul.appendChild(li)})}
 clear();rows()}
