# BookSpace ✦ your story, your space

A Y2K / Frutiger-Aero styled, fully offline writing app for your book — drafts, characters, and timeline, all in one place. No AI, no backend, no internet required after the first load (except for the Google Fonts used for the bubbly headings).

## What's inside

- **Drafts** — a rich-text editor (bold, italic, underline, strikethrough, font family, font size, color, alignment, bullet lists) with a chapter list sidebar. Multiple chapters, word/character count, autosave.
- **Cast** — character profile cards: photo, name, age, gender, backstory.
- **Timeline** — chronological story events with a date/era label, description, linked characters, and up/down reordering.
- **Backup & restore** — 💾 saves everything (chapters, characters, timeline, photos) into one `.json` file you can keep anywhere. ⤴ loads a backup file back in — handy for moving to another browser, computer, or phone.
- **Dark mode** — 🌙/☀ toggle in the top bar, remembers your choice next time you open the app.

Everything is saved locally on your device using **IndexedDB** — nothing is ever sent anywhere.

## Installing on your phone/computer home screen

1. Unzip this folder and upload **all the files, keeping the folder structure** (especially the `icons/` folder), to a static HTTPS host — GitHub Pages works great, exactly like your other projects.
2. Open the **live HTTPS URL** in your phone's browser (not a local file — the icon and offline support only work when it's loaded over `https://`).
3. **iPhone (Safari):** tap the Share icon → **Add to Home Screen**. You should see the blue/magenta "B" icon in the preview, not a screenshot of the page — that confirms it's been picked up correctly.
4. **Android (Chrome):** tap the **⋮** menu → **Install app** (this option only appears once Chrome has successfully loaded `manifest.json` and the icons — if you only see "Add to Home Screen" instead, give the page a few seconds to finish loading first, then check the menu again).
5. Launch it from the home screen icon — it should open full-screen with no browser address bar, like a real app.

If the icon still shows as a generic page/screenshot thumbnail instead of the BookSpace "B": double-check the `icons/` folder actually uploaded alongside `index.html` (not flattened into the same folder), then reload the page once in the browser before re-adding it to your home screen.

## File structure

```
bookspace/
├── index.html        ← app shell & markup
├── style.css          ← all visual styling (Y2K/Frutiger Aero theme)
├── app.js             ← all logic (IndexedDB storage, editor, characters, timeline, PWA registration)
├── manifest.json      ← PWA metadata (name, icons, theme color)
├── service-worker.js  ← offline caching of the app shell
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Notes

- Your data lives in the browser's IndexedDB for this specific site/origin. Use the 💾 **backup** button regularly and keep the file somewhere safe (cloud drive, email to yourself, etc.) — especially before clearing browser data or switching devices/browsers.
- To move your book to another browser or device: open BookSpace there, tap ⤴ **restore**, and pick your backup `.json` file. This replaces whatever is currently in that browser with the backup's contents, so only do it on a fresh install or when you're sure you want to overwrite.
- Works fully offline after the first visit thanks to the service worker, aside from the two Google Fonts (Baloo 2, Quicksand) which need a connection the very first time they're fetched — everything else is cached locally.
