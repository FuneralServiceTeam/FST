import worker from "./src/index.js";
const env = { GITHUB_TOKEN:"ghp_SECRET", GITHUB_OWNER:"o", GITHUB_REPO:"r", GITHUB_BRANCH:"main", ADMIN_PASSCODE:"correct horse", SESSION_SECRET:"s3cret", SESSION_EPOCH:"1", ALLOWED_ORIGIN:"https://o.github.io" };
const store = {}; const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o={}) => { // mock GitHub
  const url = String(u); calls.push({url, method:o.method||"GET", auth:o.headers?.Authorization});
  const path = decodeURIComponent(url.split("/contents/")[1].split("?")[0]);
  if ((o.method||"GET")==="PUT"){ const b=JSON.parse(o.body); store[path]={sha:"sha"+Math.random(),content:b.content}; return new Response("{}",{status:200}); }
  if(!store[path]) return new Response("{}",{status:404});
  if (o.headers.Accept.includes("raw")) return new Response(Buffer.from(store[path].content,"base64").toString());
  return new Response(JSON.stringify({sha:store[path].sha}));
};
const O = "https://o.github.io";
const call = (path, method="GET", body, token, origin=O) => worker.fetch(new Request("https://w.dev"+path,{method,headers:{Origin:origin,"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:body?JSON.stringify(body):undefined}),env);
let pass=0, fail=0; const t=(n,c)=>{c?pass++:fail++; console.log((c?"PASS ":"FAIL ")+n)};

let r = await call("/login","POST",{passcode:"wrong"}); t("wrong passcode -> 401", r.status===401);
r = await call("/login","POST",{passcode:"correct horse"}); const {token} = await r.json(); t("correct passcode -> token", r.status===200 && !!token);
t("CORS header for allowed origin", r.headers.get("Access-Control-Allow-Origin")===O);
r = await call("/login","POST",{passcode:"correct horse"},null,"https://evil.com"); t("foreign origin blocked", r.status===403);
r = await call("/publish","POST",{path:"data/announcements.json",content:"[]"}); t("publish without session -> 401", r.status===401);
r = await call("/publish","POST",{path:"data/announcements.json",content:"[]"},"abc.def"); t("forged token -> 401", r.status===401);
r = await call("/publish","POST",{path:"data/announcements.json",content:'[{"title":"Ñ é 🙏"}]'},token); t("publish announcements ok", r.status===200);
r = await call("/read?path=data/announcements.json","GET",null,token); t("read back round-trips UTF-8", (await r.text())==='[{"title":"Ñ é 🙏"}]');
r = await call("/publish","POST",{path:"index.html",content:"x"},token); t("cannot write index.html", r.status===400);
r = await call("/publish","POST",{path:"js/admin.js",content:"x"},token); t("cannot write js/", r.status===400);
r = await call("/publish","POST",{path:"data/../js/app.js",content:"[]"},token); t("path traversal blocked", r.status===400);
r = await call("/publish","POST",{path:"data/events.json",content:"{bad"},token); t("invalid JSON rejected", r.status===400);
const png = Buffer.from([0x89,0x50,0x4e,0x47,0,0,0,0,0,0,0,0,0,0,0,0]).toString("base64");
r = await call("/upload","POST",{path:"assets/posters/test-01.png",base64:png},token); t("valid PNG upload ok", r.status===200);
r = await call("/upload","POST",{path:"assets/announcements/notice-01.png",base64:png},token); t("announcement image upload ok", r.status===200);
r = await call("/upload","POST",{path:"assets/posters/evil.png",base64:Buffer.from("<script>alert(1)</script>").toString("base64")},token); t("fake PNG rejected", r.status===400);
r = await call("/upload","POST",{path:"assets/posters/x.svg",base64:png},token); t("svg not allowed", r.status===400);
r = await call("/upload","POST",{path:"assets/posters/Bad Name.png",base64:png},token); t("bad filename rejected", r.status===400);
env.SESSION_EPOCH="2"; r = await call("/session","GET",null,token); t("bumping SESSION_EPOCH revokes old sessions", r.status===401); env.SESSION_EPOCH="1";
r = await call("/session","GET",null,token); t("session valid again at epoch 1", r.status===200);
const expired = await (async()=>{ // craft expired token with right signature
  const enc=new TextEncoder(); const body=Buffer.from(JSON.stringify({exp:Date.now()-1000,ep:"1"})).toString("base64url");
  const k=await crypto.subtle.importKey("raw",enc.encode("s3cret"),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return body+"."+Buffer.from(await crypto.subtle.sign("HMAC",k,enc.encode(body))).toString("base64url")})();
r = await call("/session","GET",null,expired); t("expired session rejected", r.status===401);
t("GitHub token only sent to api.github.com", calls.every(c=>c.url.startsWith("https://api.github.com/")));
const leak = JSON.stringify(await (await call("/login","POST",{passcode:"correct horse"})).json()); t("responses never contain GitHub token", !leak.includes("ghp_SECRET"));
r = await call("/live/announcements.json","GET"); t("public live read works without login", r.status===200 && (await r.text()).includes("Ñ"));
r = await call("/live/secrets.json","GET"); t("live read refuses unknown files", r.status===404);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
