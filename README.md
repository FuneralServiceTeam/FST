# FST Online System — Calvary Foursquare Church

Phone-first website/app for the Funeral Service Team (under the Evangelism Team). Hosted free on GitHub Pages. No Firebase, no Google Sheets.

## What it shows (public app)
- **Home:** next service (announcement style), Verse of the Day, Daily Devotion with audio player, latest posters, announcements
- **Calendar:** monthly calendar and event list; tap an event for the full announcement, program flow, and a "Copy announcement text" button for Messenger
- **Finance:** Operating Fund and Savings balances (with running ledgers), donations, one report per service (printable / Save as PDF), an **Expense Report**, and a **Summary for Pastors** by year or month
- **Songs:** lyrics for use during services
- **Posters:** gallery with search and categories
- **More:** assignments (program assignments appear automatically), announcements
- Installable as an app (PWA). Pages are marked "noindex" so search engines are asked not to list them. This is not security: anyone with the link can open it.

## Announcement picture & Special Tasks
The announcement picture (PNG) and the app show the **key info first** (date, meet-up, departure, service time, venue), then **Program Flow**, then **Dress Code**, and last a small **Special Tasks** box (driver, sound technician, etc.). Fill these in under **Special tasks** in the Announcement / Event tab (task, person, optional details). They are saved in `events.json` as `tasks`. Older events that only have the sound fields still show their technician in that box. Use **💾🚀 Save & publish** to save and publish in one tap.

## Secretary Workspace
Tabs: **Announcement / Event** (also makes the PNG announcement picture), **Notices & Tasks** (announcements with pictures, drafts, important flag), **Finance report**, **Funds & Donations**, **Songs**, **Verse & Devotion**, **Posters**, **Notices & Tasks**, **Percentages**, **Raw JSON**.
Your work is saved in your browser until you click "Done publishing", so you will not lose it if the page closes.

### Weekly routine (one-tap publishing)
1. Open `admin.html` → log in (only needed the first time on each device; you stay logged in for 90 days) → fill the form → Save.
2. Tap **🚀 Publish now** at the bottom. Done. The app updates in about a minute.
Pictures for announcements and posters are uploaded right from the form. No GitHub website visit, no tokens.

**One-time setup (owner, about 15 minutes):** follow `worker/README.md`. It installs a small free "publish gateway" that keeps the GitHub token secret on a server. Until it is set up (`js/config.js` → `FST_API` empty), the workspace falls back to the older method of pasting a GitHub token into the browser (PIN + token).

### Daily Devotion audio
- Upload your MP3 to `assets/audio/` named exactly `devotion.mp3` (replace the old file; same name every time).
- In Verse & Devotion, tick **"I uploaded a NEW audio file"** and Save, then publish `devotion.json`. This adds a new version number so phones load the new audio instead of the old one.
- GitHub's website upload limit is 25 MB per file. For speech, mono 64 kbps MP3 is small and clear.

### Finance
- One report per service: funds received (who/source, amount), expenses, allocations. Balance and the Financial Summary paragraph are computed automatically.
- **Suggest allocations** applies the default split (Tithes 10%, Offering 10%, Savings 10%, Operating 70%, set in the **Percentages** tab). For one report you can choose **Custom for this report…** and set Offering and Savings yourself (Tithes stays 10%, Operating Fund is the remainder). The report keeps the percentages it was saved with.
- Giver names: choose "Anonymous" and the name is never saved in the file.
- Savings from each report are added to the savings account automatically. Use the Savings tab for other deposits or withdrawals.
- Do not type bank/GCash numbers or private details into any file.


## Finance (how the money is organised)
Every amount received (from a service or a general donation) is divided by the same percentages: **Tithes 10% (fixed)** and **Offering, Savings and Operating Fund** as set in the workspace (**Percentages** tab). Saved reports and donations keep the percentages they were saved with.
- **Operating Fund** = what is left after tithes, offering and savings. It accumulates, and **all expenses are paid from it** (food, transportation, sound/equipment, supplies, other needs).
- **Savings** = the saved portion plus any deposits.
- **RULE — Tithes and Offering are NEVER combined.** Every screen, report, table, CSV and print-out shows Tithes and Offering as two separate figures (separate boxes/columns/rows); there is no "Tithes + Offering" total anywhere. A "Given to the Church" entry stores `tithes` and `offering` as two fields and has no combined amount. All figures come from one place, `buildFunds()` in `js/shared.js`: **Offering set aside** = share of services + share of donations + transfers *into* the Offering fund; **Offering not yet given** = set aside − given to the Church − transfers *out* of the Offering fund (always equal to the Offering fund balance; the app logs a console warning if they ever differ). **Tithes not yet given** = set aside − given. When adding any new screen, read these values from `buildFunds()` and never add them together.
- **Service report** (Finance tab): funds received, expenses, and the set-aside rows. "Suggest allocations" applies the percentages. If expenses are more than the operating share, the extra is taken from the Operating Fund; if the fund is not enough, Offering and then Savings are reduced (never Tithes). You can edit every row.
- **Funds & Donations tab:** donations received outside a service (name shown or Anonymous). Choose **Default split**, **Custom split…** (Tithes fixed at 10%; you set Offering % and Savings %; Operating Fund is the remainder), all to Operating Fund, or all to Savings. Custom splits can be saved as **presets** (saved in `settings.json`, so publish it). Also: other expenses, deposits, withdrawals and transfers between funds. Each entry can be edited, **duplicated**, or deleted (donations also have a printable **Receipt / acknowledgment**). The entry list has **search and filters** (type, month), a warning for **duplicate entries**, a "not yet given" line for Tithes and Offering, and **CSV export** (entries, and fund movements with running balance). Donations with a custom split show their split, e.g. (10/20/15/55), in the ledger.
- **Backup:** Raw JSON tab → **Download full backup** (one file with all data) and **Restore from backup**.
- **Public Finance page:** Operating Fund and Savings balances, Services, Donations, Funds ledger (running balance), **Expense Report** (by category and every expense, by year/month) and **Summary for Pastors**.
- Old `savings.json` entries are imported once into the new `ledger.json` when you open the workspace (then publish). `savings.json` can then be deleted from GitHub.

## Songs & lyrics
Add songs in the **Songs** tab (blank line between stanzas; put `[Chorus]` on its own line). Attach songs to a service in the Announcement / Event form. On phones: Songs tab (search by title or lyrics) or the service details; the reader has larger/smaller text, dark mode, and "keep screen on". Songs work offline after they have been loaded once.
**Copyright:** only add lyrics you are allowed to display (public-domain hymns, or songs covered by your church license). The site is public to anyone with the link. Each song has a "Rights" label.

## Publish to GitHub Pages (first time)
1. Create a repository and upload **the contents** of this folder (not the ZIP) to the root.
2. Settings → Pages → Deploy from a branch → `main` / root.
3. The app is at `https://USERNAME.github.io/REPOSITORY/` and the workspace at `.../admin.html`.

## Important limits
- With the gateway, poster/announcement pictures and the devotion MP3 are uploaded for you. In the older fallback mode they are still uploaded to GitHub by hand. The download buttons remain as a fallback.
- With the publish gateway, only someone with the Secretary passcode can publish; the GitHub token never leaves the server. In the older fallback mode the PIN is not security and GitHub permissions are what protect the repository.
- Everything in `data/` and `assets/` is public to anyone with the link. Get permission before publishing names, photos, or amounts.
- Offline viewing is best-effort (app and last-loaded data; up to 20 poster images). Audio needs internet.

## Files
`index.html` app · `admin.html` workspace · `css/style.css` · `js/shared.js` (formats, budget split) · `js/app.js` · `js/admin.js` · `js/config.js` (gateway address) · `js/admin-announce.js` · `worker/` (publish gateway) · `js/pwa.js` · `service-worker.js` · `data/*.json` (events, finances, ledger, settings, songs, devotion, announcements, assignments, posters) · `assets/posters/` · `assets/audio/` · `assets/icons/`
