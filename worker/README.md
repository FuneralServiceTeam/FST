# FST Publish Gateway — one-time setup (about 15 minutes, free)

**What it does.** GitHub Pages can only show files; it cannot safely hold a password. This tiny
Cloudflare Worker sits between the Secretary Workspace and GitHub. The GitHub token lives **only
here** (as an encrypted secret). The Secretary logs in once per device with a passcode and stays
logged in for 90 days. No more pasting or replacing tokens.

The gateway can only write: `data/*.json`, pictures in `assets/posters/` and `assets/announcements/`,
and `assets/audio/devotion.mp3`. It cannot touch the app's code. Pictures are checked (real JPG/PNG/WebP, max 8 MB).

## Steps (done once, by whoever owns the GitHub repository)

1. **Make a GitHub token for the gateway only.** GitHub → Settings → Developer settings →
   Fine-grained tokens → Generate. *Only select repositories* → this repo. Permissions → **Contents: Read and write**
   (nothing else). Expiration: 1 year (set a calendar reminder).
2. **Cloudflare:** create a free account at cloudflare.com. On a computer with Node.js installed, open a terminal in this `worker` folder:
   ```
   npx wrangler login
   ```
3. Open `wrangler.toml` and fill in `GITHUB_OWNER`, `GITHUB_REPO`, and `ALLOWED_ORIGIN`
   (`https://YOUR-GITHUB-USERNAME.github.io`, no trailing slash, no repo name).
4. Store the three secrets (you will be asked to paste each value; they are not saved in any file):
   ```
   npx wrangler secret put GITHUB_TOKEN      # the token from step 1
   npx wrangler secret put ADMIN_PASSCODE    # the Secretary's passcode: use 10+ characters
   npx wrangler secret put SESSION_SECRET    # any long random text, e.g. output of: openssl rand -base64 32
   ```
5. Deploy: `npx wrangler deploy`. It prints an address like `https://fst-publish.YOURNAME.workers.dev`.
6. In the repository, open `js/config.js` and set `window.FST_API = "that address";`. Commit and push.
7. Open `admin.html` on the phone and log in with the passcode. Done. Old PIN and token boxes are no longer used.

## Everyday use
Secretary: open `admin.html` → log in (first time on each device only) → edit → **Publish now**.

## Maintenance
- **Log everyone out (lost phone, new Secretary):** change `SESSION_EPOCH` in `wrangler.toml` (e.g. `"1"` → `"2"`) and run `npx wrangler deploy`. Every old session stops working. Also change `ADMIN_PASSCODE` (`wrangler secret put ADMIN_PASSCODE`) if the passcode may be known.
- **GitHub token expiring:** make a new one (step 1), run `npx wrangler secret put GITHUB_TOKEN`. The Secretary notices nothing.
- **Guessing protection:** failed logins are slowed down. For extra safety, in the Cloudflare dashboard add a Rate Limiting rule on path `/login` (e.g. 10 requests per minute).
- **If `main` is a protected branch** that requires pull requests, the token cannot push; allow it or use a different publishing branch.
- Self-check: `node test.mjs` (needs Node 18+; uses no network).

## Good to know
- After Publish, the public app picks up the change by itself within about 20-30 seconds (it reads through this gateway instead of waiting for the GitHub Pages rebuild, and refreshes every 20 seconds while open). Without the gateway it takes about 1-10 minutes.
- The session code is stored in the Secretary's browser. It is not the GitHub token and cannot be used for anything but this gateway; it expires and can be revoked as above.
