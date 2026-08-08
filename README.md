# Tech by Vansh — Explainer Studio

Infinite canvas for building step-by-step explainer videos: AI-planned walkthroughs,
device mockups, reveal steps with camera moves, speaker notes, and board recording.

## Deploy

### Vercel
```bash
npx vercel        # first run: log in, accept the defaults
npx vercel --prod # live URL
```
No build step — it's static.

### GitHub Pages
```bash
git init && git add . && git commit -m "Explainer Studio"
gh repo create explainer-studio --public --source=. --push
```
Then **Settings → Pages → Source: main / (root)**.

## Installing it as an app
Open the live URL, then **⬇︎ Install** in the top bar (or your browser's
"Install app" / "Add to Home Screen"). It gets its own window and icon, and
opens with no internet.

## What works offline
Everything except the four things that genuinely need the network:
AI planning (Groq), icon search (Iconify), YouTube brand kit, and screen-share
recording. The board, drawing, mockups, present mode and canvas recording all
work with no connection.

## Moving your work between computers
Boards live in **this browser on this domain**. They do not follow the file.
Before switching:

1. **Boards ▾ → ⬇︎ Export JSON** for each board you care about
2. **Boards ▾ → 🔐 Export API keys** (encrypted with a password you choose)
3. On the new machine: import the JSON files, then the key file

## API keys
Keys are stored in this browser only — they are never written into the HTML.
The encrypted key file needs both the file *and* your password, so the file
alone is useless if it leaks. Restrict your YouTube key to the YouTube Data
API in Google Cloud, and rotate the Groq key if you ever share a screen
recording of the settings.

## Files
| File | What it is |
| --- | --- |
| `index.html` | The whole app — one file, no dependencies |
| `sw.js` | Service worker; caches the app, never caches API calls |
| `manifest.webmanifest` | Makes it installable |
| `icon-*.png` | App icons |
| `vercel.json` | Stops the service worker itself from being cached |
