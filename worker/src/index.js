/* FST Publish Gateway (Cloudflare Worker)
 * Holds the GitHub token server-side so the Secretary never handles it.
 * Secretary logs in once per device with a passcode and gets a signed, expiring session.
 *
 * Secrets (wrangler secret put): GITHUB_TOKEN, ADMIN_PASSCODE, SESSION_SECRET
 * Vars (wrangler.toml):          GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, ALLOWED_ORIGIN, SESSION_EPOCH
 */
const DATA_FILES = ["events","assignments","finances","ledger","announcements","posters","devotion","settings","songs","people","attendance","believers"];
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_AUDIO = 25 * 1024 * 1024;
const SESSION_DAYS = 90;
const enc = new TextEncoder();

/* ---------- helpers ---------- */
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function hmacKey(secret) { return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
function safeEqual(a, b) {
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}
async function signSession(env, days = SESSION_DAYS) {
  const payload = { exp: Date.now() + days * 864e5, ep: String(env.SESSION_EPOCH || "1") };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env.SESSION_SECRET), enc.encode(body));
  return { token: body + "." + b64url(sig), exp: payload.exp };
}
async function verifySession(env, token) {
  if (!token || !env.SESSION_SECRET) return false;
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return false;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(env.SESSION_SECRET), unb64url(sig), enc.encode(body));
    if (!ok) return false;
    const p = JSON.parse(new TextDecoder().decode(unb64url(body)));
    return p.exp > Date.now() && p.ep === String(env.SESSION_EPOCH || "1");
  } catch { return false; }
}
function cors(env, req) {
  const origin = req.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  const h = { "Vary": "Origin", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Authorization,Content-Type", "Access-Control-Max-Age": "86400" };
  if (allowed.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}
const json = (env, req, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(env, req) } });

/* ---------- path rules: only these files may ever be written ---------- */
function pathKind(path) {
  if (typeof path !== "string" || path.includes("..") || path.startsWith("/")) return null;
  const m = /^data\/([a-z]+)\.json$/.exec(path);
  if (m && DATA_FILES.includes(m[1])) return "data";
  if (/^assets\/(posters|announcements)\/[a-z0-9][a-z0-9._-]{0,80}\.(jpe?g|png|webp)$/.test(path)) return "image";
  if (path === "assets/audio/devotion.mp3") return "audio";
  return null;
}

/* ---------- GitHub ---------- */
const gh = (env, path) => `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
const ghHeaders = (env, raw) => ({ Authorization: "Bearer " + env.GITHUB_TOKEN, Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "fst-publish-gateway" });
const branch = (env) => env.GITHUB_BRANCH || "main";
async function getSha(env, path) {
  const r = await fetch(gh(env, path) + "?ref=" + encodeURIComponent(branch(env)), { headers: ghHeaders(env) });
  if (r.status === 404) return undefined;
  if (!r.ok) throw new Error("GitHub read failed (" + r.status + ")");
  return (await r.json()).sha;
}
async function putFile(env, path, contentB64, message) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const sha = await getSha(env, path);
    const r = await fetch(gh(env, path), { method: "PUT", headers: ghHeaders(env), body: JSON.stringify({ message, content: contentB64, branch: branch(env), sha }) });
    if (r.ok) return true;
    if (r.status === 409 || r.status === 422) continue; // stale sha, retry once
    throw new Error("GitHub write failed (" + r.status + ")");
  }
  throw new Error("GitHub write conflict. Please try again.");
}

/* ---------- handlers ---------- */
export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, req) });
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");
    if (origin && !cors(env, req)["Access-Control-Allow-Origin"]) return json(env, req, { error: "Origin not allowed" }, 403);
    const missing = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO", "ADMIN_PASSCODE", "SESSION_SECRET"].filter((k) => !env[k]);
    if (missing.length) return json(env, req, { error: "Gateway is not configured: " + missing.join(", ") }, 500);

    try {
      if (url.pathname === "/login" && req.method === "POST") {
        const { passcode } = await req.json().catch(() => ({}));
        if (!passcode || !safeEqual(passcode, env.ADMIN_PASSCODE)) {
          await new Promise((r) => setTimeout(r, 1200)); // slow down guessing
          return json(env, req, { error: "Incorrect passcode." }, 401);
        }
        const s = await signSession(env);
        return json(env, req, { token: s.token, expires: s.exp });
      }

      const live = /^\/live\/([a-z]+)\.json$/.exec(url.pathname);
      if (live && req.method === "GET") { // public, read-only copy of a data file, fresh within ~10s (same data GitHub Pages already shows publicly)
        const path = "data/" + live[1] + ".json";
        if (pathKind(path) !== "data") return json(env, req, { error: "Not found" }, 404);
        const cache = typeof caches !== "undefined" ? caches.default : null, key = new Request("https://fst-live.invalid/" + path);
        let body = cache && (await cache.match(key));
        if (!body) {
          const r = await fetch(gh(env, path) + "?ref=" + encodeURIComponent(branch(env)), { headers: ghHeaders(env, true) });
          if (!r.ok) return json(env, req, { error: "Not available" }, r.status === 404 ? 404 : 502);
          body = new Response(await r.text(), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=10" } });
          if (cache) await cache.put(key, body.clone());
        }
        return new Response(await body.text(), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(env, req) } });
      }

      const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      if (!(await verifySession(env, auth))) return json(env, req, { error: "Session expired. Please log in again." }, 401);

      if (url.pathname === "/session" && req.method === "GET") return json(env, req, { ok: true });

      if (url.pathname === "/read" && req.method === "GET") {
        const path = url.searchParams.get("path");
        if (pathKind(path) !== "data") return json(env, req, { error: "Not allowed" }, 400);
        const r = await fetch(gh(env, path) + "?ref=" + encodeURIComponent(branch(env)), { headers: ghHeaders(env, true) });
        if (r.status === 404) return json(env, req, { error: "Not found" }, 404);
        if (!r.ok) return json(env, req, { error: "GitHub read failed (" + r.status + ")" }, 502);
        return new Response(await r.text(), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(env, req) } });
      }

      if (url.pathname === "/publish" && req.method === "POST") {
        const { path, content } = await req.json().catch(() => ({}));
        if (pathKind(path) !== "data") return json(env, req, { error: "That file cannot be published." }, 400);
        if (typeof content !== "string" || content.length > 2e6) return json(env, req, { error: "Content missing or too large." }, 400);
        try { JSON.parse(content); } catch { return json(env, req, { error: "Content is not valid JSON." }, 400); }
        await putFile(env, path, utf8ToB64(content), "Update " + path + " (Secretary Workspace)");
        return json(env, req, { ok: true, path });
      }

      if (url.pathname === "/upload" && req.method === "POST") {
        const { path, base64 } = await req.json().catch(() => ({}));
        const kind = pathKind(path);
        if (kind !== "image" && kind !== "audio") return json(env, req, { error: "That file cannot be uploaded." }, 400);
        if (typeof base64 !== "string" || !/^[A-Za-z0-9+/=]+$/.test(base64)) return json(env, req, { error: "Invalid file data." }, 400);
        const bytes = Math.floor(base64.length * 3 / 4);
        if (bytes > (kind === "image" ? MAX_IMAGE : MAX_AUDIO)) return json(env, req, { error: "File is too large." }, 413);
        if (!magicOk(kind, path, base64)) return json(env, req, { error: "File content does not match its type." }, 400);
        await putFile(env, path, base64, "Upload " + path + " (Secretary Workspace)");
        return json(env, req, { ok: true, path });
      }

      return json(env, req, { error: "Not found" }, 404);
    } catch (e) {
      return json(env, req, { error: e.message || "Server error" }, 502);
    }
  },
};

function utf8ToB64(s) { const b = enc.encode(s); let t = ""; for (let i = 0; i < b.length; i += 8192) t += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(t); }
/* Check the first bytes so a renamed non-image can't be stored as an image. */
function magicOk(kind, path, b64) {
  const h = Uint8Array.from(atob(b64.slice(0, 24)), (c) => c.charCodeAt(0));
  if (kind === "audio") return (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) || (h[0] === 0xff && (h[1] & 0xe0) === 0xe0);
  if (/\.png$/.test(path)) return h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47;
  if (/\.jpe?g$/.test(path)) return h[0] === 0xff && h[1] === 0xd8;
  if (/\.webp$/.test(path)) return h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46;
  return false;
}
