# BookSpace ✦ your story, your space

A Y2K / Frutiger-Aero styled, fully offline writing app for your book — drafts, characters, and timeline, all in one place. No AI, no backend, no internet required after the first load (except for the Google Fonts used for the bubbly headings).

## What's inside

- **Drafts** — a rich-text editor (bold, italic, underline, strikethrough, font family, font size, color, alignment, bullet lists) with a chapter list sidebar. Multiple chapters, word/character count, autosave.
- **Cast** — character profile cards: photo, name, age, gender, backstory.
- **Timeline** — chronological story events with a date/era label, description, linked characters, and up/down reordering.

Everything is saved locally on your device using **IndexedDB** — nothing is ever sent anywhere.

## Installing on your phone/computer home screen

1. Unzip this folder and upload the files (keeping the folder structure) to any static host — GitHub Pages works great, exactly like your other projects.
2. Open the page in Chrome/Safari on your phone.
3. Tap **Share → Add to Home Screen** (iOS) or the **Install** prompt / menu → **Install app** (Android/Chrome).
4. It'll launch full-screen, no browser bar, with its own icon.

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

- Your data lives in the browser's IndexedDB for this specific site/origin. If you clear site data or switch browsers/devices, it won't carry over automatically — there's no built-in export/backup yet, so it's worth keeping that in mind (just like with your other GitHub Pages apps, this would be a good next feature if you want it).
- Works fully offline after the first visit thanks to the service worker, aside from the two Google Fonts (Baloo 2, Quicksand) which need a connection the very first time they're fetched — everything else is cached locally.
