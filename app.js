/* =========================================================
   BookSpace — app.js
   Pure client-side logic. No AI, no network calls, no backend.
   Storage: IndexedDB (db: bookspace_db)
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     0. IndexedDB micro-wrapper
  --------------------------------------------------------- */
  const DB_NAME = "bookspace_db";
  const DB_VERSION = 1;
  const STORES = ["chapters", "characters", "events"];
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: "id" });
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }

  function dbGetAll(storeName) {
    return tx(storeName, "readonly").then(
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        })
    );
  }

  function dbPut(storeName, value) {
    return tx(storeName, "readwrite").then(
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(value);
          req.onsuccess = () => resolve(value);
          req.onerror = () => reject(req.error);
        })
    );
  }

  function dbDelete(storeName, id) {
    return tx(storeName, "readwrite").then(
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    );
  }

  function dbClear(storeName) {
    return tx(storeName, "readwrite").then(
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    );
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------------------------------------------------
     1. Toast helper
  --------------------------------------------------------- */
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  const statusMsg = document.getElementById("statusMsg");
  let statusTimer = null;
  function flashStatus(msg) {
    statusMsg.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (statusMsg.textContent = "saved to your space"), 2200);
  }

  /* ---------------------------------------------------------
     2. Modal helpers
  --------------------------------------------------------- */
  function openModal(id) {
    document.getElementById(id).classList.add("open");
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove("open");
  }
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  let confirmResolver = null;
  function askConfirm(title, text) {
    document.getElementById("confirmModalTitle").textContent = title;
    document.getElementById("confirmModalText").textContent = text;
    openModal("confirmModalOverlay");
    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }
  document.getElementById("confirmOkBtn").addEventListener("click", () => {
    closeModal("confirmModalOverlay");
    if (confirmResolver) confirmResolver(true);
  });
  document.getElementById("confirmCancelBtn").addEventListener("click", () => {
    closeModal("confirmModalOverlay");
    if (confirmResolver) confirmResolver(false);
  });

  /* ---------------------------------------------------------
     3. Tab navigation
  --------------------------------------------------------- */
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
    });
  });

  /* =========================================================
     4. DRAFTS / CHAPTERS
  ========================================================= */
  const chapterList = document.getElementById("chapterList");
  const chapterTitleInput = document.getElementById("chapterTitleInput");
  const editorArea = document.getElementById("editorArea");
  const wordCountEl = document.getElementById("wordCount");
  const charCountEl = document.getElementById("charCount");

  let chapters = [];
  let activeChapterId = null;
  let saveDebounce = null;

  async function loadChapters() {
    chapters = await dbGetAll("chapters");
    chapters.sort((a, b) => a.order - b.order);
    if (chapters.length === 0) {
      const first = {
        id: uid(),
        title: "Chapter One",
        html: "",
        order: 0,
        updatedAt: Date.now(),
      };
      await dbPut("chapters", first);
      chapters = [first];
    }
    renderChapterList();
    selectChapter(chapters[0].id);
  }

  function renderChapterList() {
    chapterList.innerHTML = "";
    chapters.forEach((ch) => {
      const li = document.createElement("li");
      li.className = "chapter-item" + (ch.id === activeChapterId ? " active" : "");
      li.innerHTML = `<span class="chap-name">${escapeHtml(ch.title || "untitled")}</span>`;
      li.addEventListener("click", () => selectChapter(ch.id));
      chapterList.appendChild(li);
    });
  }

  function selectChapter(id) {
    activeChapterId = id;
    const ch = chapters.find((c) => c.id === id);
    if (!ch) return;
    chapterTitleInput.value = ch.title || "";
    editorArea.innerHTML = ch.html || "";
    updateCounts();
    renderChapterList();
  }

  function getActiveChapter() {
    return chapters.find((c) => c.id === activeChapterId);
  }

  function persistActiveChapter() {
    const ch = getActiveChapter();
    if (!ch) return;
    ch.title = chapterTitleInput.value.trim() || "untitled chapter";
    ch.html = editorArea.innerHTML;
    ch.updatedAt = Date.now();
    dbPut("chapters", ch).then(() => flashStatus("draft saved ✓"));
    renderChapterList();
  }

  function debounceSave() {
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(persistActiveChapter, 500);
  }

  function updateCounts() {
    const text = editorArea.innerText || "";
    const words = text.trim().length ? text.trim().split(/\s+/).length : 0;
    wordCountEl.textContent = words + (words === 1 ? " word" : " words");
    charCountEl.textContent = text.length + (text.length === 1 ? " character" : " characters");
  }

  chapterTitleInput.addEventListener("input", debounceSave);
  editorArea.addEventListener("input", () => {
    updateCounts();
    debounceSave();
  });

  document.getElementById("newChapterBtn").addEventListener("click", async () => {
    const newCh = {
      id: uid(),
      title: "New chapter",
      html: "",
      order: chapters.length,
      updatedAt: Date.now(),
    };
    await dbPut("chapters", newCh);
    chapters.push(newCh);
    selectChapter(newCh.id);
    showToast("new chapter created ✦");
  });

  document.getElementById("deleteChapterBtn").addEventListener("click", async () => {
    if (chapters.length <= 1) {
      showToast("you need at least one chapter!");
      return;
    }
    const ok = await askConfirm("delete this chapter?", "This will permanently remove the chapter and its text. This can't be undone.");
    if (!ok) return;
    await dbDelete("chapters", activeChapterId);
    chapters = chapters.filter((c) => c.id !== activeChapterId);
    selectChapter(chapters[0].id);
    showToast("chapter deleted");
  });

  /* --- formatting toolbar --- */
  document.querySelectorAll(".tool-btn[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      editorArea.focus();
      document.execCommand(btn.dataset.cmd, false, null);
      debounceSave();
    });
  });

  document.getElementById("fontFamilySel").addEventListener("change", (e) => {
    editorArea.focus();
    document.execCommand("fontName", false, e.target.value);
    debounceSave();
  });
  document.getElementById("fontSizeSel").addEventListener("change", (e) => {
    editorArea.focus();
    document.execCommand("fontSize", false, e.target.value);
    debounceSave();
  });
  document.getElementById("textColorPicker").addEventListener("input", (e) => {
    editorArea.focus();
    document.execCommand("foreColor", false, e.target.value);
    debounceSave();
  });

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* =========================================================
     5. CHARACTERS
  ========================================================= */
  const charGrid = document.getElementById("charGrid");
  const charEmpty = document.getElementById("charEmpty");
  const charForm = document.getElementById("charForm");
  const charPhotoInput = document.getElementById("charPhotoInput");
  const charPhotoImg = document.getElementById("charPhotoImg");
  const charPhotoPlaceholder = document.getElementById("charPhotoPlaceholder");

  let characters = [];
  let pendingPhotoData = null;

  async function loadCharacters() {
    characters = await dbGetAll("characters");
    characters.sort((a, b) => a.createdAt - b.createdAt);
    renderCharacters();
  }

  function renderCharacters() {
    charGrid.innerHTML = "";
    charEmpty.hidden = characters.length !== 0;
    characters.forEach((c) => {
      const card = document.createElement("div");
      card.className = "char-card";
      card.innerHTML = `
        <span class="pin">📌</span>
        <div class="char-photo">
          ${c.photo ? `<img src="${c.photo}" alt="${escapeHtml(c.name)}">` : "👤"}
        </div>
        <h3 class="char-name">${escapeHtml(c.name || "unnamed")}</h3>
        <div class="char-meta">
          ${c.age ? `<span class="age-tag">${escapeHtml(c.age)} yrs</span>` : ""}
          ${c.gender ? `<span>${escapeHtml(c.gender)}</span>` : ""}
        </div>
        <p class="char-backstory">${escapeHtml(c.backstory || "no backstory yet.")}</p>
        <div class="char-actions">
          <button class="icon-btn" data-edit="${c.id}" title="Edit">✎</button>
          <button class="icon-btn" data-del="${c.id}" title="Delete">🗑</button>
        </div>
      `;
      charGrid.appendChild(card);
    });

    charGrid.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => openCharModal(btn.dataset.edit))
    );
    charGrid.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () => deleteCharacter(btn.dataset.del))
    );
  }

  function openCharModal(id) {
    pendingPhotoData = null;
    document.getElementById("charId").value = id || "";
    if (id) {
      const c = characters.find((x) => x.id === id);
      document.getElementById("charModalTitle").textContent = "edit character";
      document.getElementById("charName").value = c.name || "";
      document.getElementById("charAge").value = c.age || "";
      document.getElementById("charGender").value = c.gender || "";
      document.getElementById("charBackstory").value = c.backstory || "";
      if (c.photo) {
        charPhotoImg.src = c.photo;
        charPhotoImg.hidden = false;
        charPhotoPlaceholder.hidden = true;
        pendingPhotoData = c.photo;
      } else {
        charPhotoImg.hidden = true;
        charPhotoPlaceholder.hidden = false;
      }
    } else {
      document.getElementById("charModalTitle").textContent = "new character";
      charForm.reset();
      charPhotoImg.hidden = true;
      charPhotoPlaceholder.hidden = false;
    }
    openModal("charModalOverlay");
  }

  document.getElementById("newCharBtn").addEventListener("click", () => openCharModal(null));

  charPhotoInput.addEventListener("change", () => {
    const file = charPhotoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pendingPhotoData = reader.result;
      charPhotoImg.src = pendingPhotoData;
      charPhotoImg.hidden = false;
      charPhotoPlaceholder.hidden = true;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("charPhotoRemove").addEventListener("click", () => {
    pendingPhotoData = null;
    charPhotoImg.hidden = true;
    charPhotoPlaceholder.hidden = false;
    charPhotoInput.value = "";
  });

  charForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("charId").value || uid();
    const existing = characters.find((c) => c.id === id);
    const charObj = {
      id,
      name: document.getElementById("charName").value.trim(),
      age: document.getElementById("charAge").value.trim(),
      gender: document.getElementById("charGender").value.trim(),
      backstory: document.getElementById("charBackstory").value.trim(),
      photo: pendingPhotoData,
      createdAt: existing ? existing.createdAt : Date.now(),
    };
    await dbPut("characters", charObj);
    if (existing) {
      Object.assign(existing, charObj);
    } else {
      characters.push(charObj);
    }
    renderCharacters();
    closeModal("charModalOverlay");
    showToast("character saved ✦");
  });

  async function deleteCharacter(id) {
    const ok = await askConfirm("remove this character?", "Their profile will be deleted from your cast.");
    if (!ok) return;
    await dbDelete("characters", id);
    characters = characters.filter((c) => c.id !== id);
    renderCharacters();
    showToast("character removed");
  }

  /* =========================================================
     6. TIMELINE
  ========================================================= */
  const timelineWrap = document.getElementById("timelineWrap");
  const timelineEmpty = document.getElementById("timelineEmpty");
  const eventForm = document.getElementById("eventForm");

  let events = [];

  async function loadEvents() {
    events = await dbGetAll("events");
    events.sort((a, b) => a.order - b.order);
    renderEvents();
  }

  function renderEvents() {
    timelineWrap.innerHTML = "";
    timelineEmpty.hidden = events.length !== 0;
    events.forEach((ev, idx) => {
      const card = document.createElement("div");
      card.className = "timeline-event";
      card.innerHTML = `
        <div class="event-actions">
          <div class="event-order-btns">
            <button class="tiny-btn" data-up="${ev.id}" ${idx === 0 ? "disabled" : ""}>▲</button>
            <button class="tiny-btn" data-down="${ev.id}" ${idx === events.length - 1 ? "disabled" : ""}>▼</button>
          </div>
          <button class="icon-btn" data-edit="${ev.id}" title="Edit">✎</button>
          <button class="icon-btn" data-del="${ev.id}" title="Delete">🗑</button>
        </div>
        <span class="event-when">${escapeHtml(ev.when || "")}</span>
        <h3 class="event-title">${escapeHtml(ev.title || "untitled event")}</h3>
        <p class="event-desc">${escapeHtml(ev.desc || "")}</p>
        ${ev.chars ? `<p class="event-chars">⭑ ${escapeHtml(ev.chars)}</p>` : ""}
      `;
      timelineWrap.appendChild(card);
    });

    timelineWrap.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => openEventModal(btn.dataset.edit))
    );
    timelineWrap.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () => deleteEvent(btn.dataset.del))
    );
    timelineWrap.querySelectorAll("[data-up]").forEach((btn) =>
      btn.addEventListener("click", () => moveEvent(btn.dataset.up, -1))
    );
    timelineWrap.querySelectorAll("[data-down]").forEach((btn) =>
      btn.addEventListener("click", () => moveEvent(btn.dataset.down, 1))
    );
  }

  async function moveEvent(id, dir) {
    const idx = events.findIndex((e) => e.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= events.length) return;
    [events[idx], events[swapIdx]] = [events[swapIdx], events[idx]];
    events.forEach((e, i) => (e.order = i));
    await Promise.all(events.map((e) => dbPut("events", e)));
    renderEvents();
  }

  function openEventModal(id) {
    document.getElementById("eventId").value = id || "";
    if (id) {
      const ev = events.find((x) => x.id === id);
      document.getElementById("eventModalTitle").textContent = "edit event";
      document.getElementById("eventWhen").value = ev.when || "";
      document.getElementById("eventTitle").value = ev.title || "";
      document.getElementById("eventDesc").value = ev.desc || "";
      document.getElementById("eventChars").value = ev.chars || "";
    } else {
      document.getElementById("eventModalTitle").textContent = "new event";
      eventForm.reset();
    }
    openModal("eventModalOverlay");
  }

  document.getElementById("newEventBtn").addEventListener("click", () => openEventModal(null));

  eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("eventId").value || uid();
    const existing = events.find((ev) => ev.id === id);
    const evObj = {
      id,
      when: document.getElementById("eventWhen").value.trim(),
      title: document.getElementById("eventTitle").value.trim(),
      desc: document.getElementById("eventDesc").value.trim(),
      chars: document.getElementById("eventChars").value.trim(),
      order: existing ? existing.order : events.length,
    };
    await dbPut("events", evObj);
    if (existing) {
      Object.assign(existing, evObj);
    } else {
      events.push(evObj);
    }
    renderEvents();
    closeModal("eventModalOverlay");
    showToast("event added to timeline ✦");
  });

  async function deleteEvent(id) {
    const ok = await askConfirm("remove this event?", "This moment will be removed from your timeline.");
    if (!ok) return;
    await dbDelete("events", id);
    events = events.filter((e) => e.id !== id);
    events.forEach((e, i) => (e.order = i));
    await Promise.all(events.map((e) => dbPut("events", e)));
    renderEvents();
    showToast("event removed");
  }

  /* =========================================================
     7. DARK MODE
  ========================================================= */
  const DARK_KEY = "bookspace_dark_mode";
  const darkModeBtn = document.getElementById("darkModeBtn");

  function applyDarkMode(isDark) {
    document.body.classList.toggle("dark", isDark);
    darkModeBtn.textContent = isDark ? "☀" : "🌙";
    darkModeBtn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
  }

  function initDarkMode() {
    let saved = null;
    try {
      saved = localStorage.getItem(DARK_KEY);
    } catch (e) {
      /* localStorage unavailable — default to light */
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved !== null ? saved === "1" : prefersDark;
    applyDarkMode(isDark);
  }

  darkModeBtn.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark");
    applyDarkMode(isDark);
    try {
      localStorage.setItem(DARK_KEY, isDark ? "1" : "0");
    } catch (e) {
      /* ignore — preference just won't persist */
    }
    showToast(isDark ? "dark mode on 🌙" : "dark mode off ☀");
  });

  /* =========================================================
     8. BACKUP & RESTORE
  ========================================================= */
  const BACKUP_VERSION = 1;

  async function exportBackup() {
    try {
      const [chs, chars, evs] = await Promise.all([
        dbGetAll("chapters"),
        dbGetAll("characters"),
        dbGetAll("events"),
      ]);
      const backup = {
        app: "BookSpace",
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        chapters: chs,
        characters: chars,
        events: evs,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `bookspace-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("backup saved ✦ check your downloads");
    } catch (err) {
      console.error("Backup failed:", err);
      showToast("backup failed — see console for details");
    }
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async function importBackup(file) {
    let data;
    try {
      const text = await readFileAsText(file);
      data = JSON.parse(text);
    } catch (err) {
      showToast("that file doesn't look like a valid backup");
      return;
    }

    if (!data || !Array.isArray(data.chapters) || !Array.isArray(data.characters) || !Array.isArray(data.events)) {
      showToast("that file doesn't look like a BookSpace backup");
      return;
    }

    const ok = await askConfirm(
      "load this backup?",
      "This will replace everything currently in this browser — all chapters, characters and timeline events — with the contents of the backup file. This can't be undone."
    );
    if (!ok) return;

    try {
      await Promise.all([dbClear("chapters"), dbClear("characters"), dbClear("events")]);
      await Promise.all(data.chapters.map((c) => dbPut("chapters", c)));
      await Promise.all(data.characters.map((c) => dbPut("characters", c)));
      await Promise.all(data.events.map((e) => dbPut("events", e)));

      await loadChapters();
      await loadCharacters();
      await loadEvents();

      showToast("backup loaded ✦ welcome back");
    } catch (err) {
      console.error("Restore failed:", err);
      showToast("restore failed — see console for details");
    }
  }

  document.getElementById("backupBtn").addEventListener("click", exportBackup);

  document.getElementById("restoreInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // reset so picking the same file again still fires 'change'
    if (!file) return;
    await importBackup(file);
  });

  /* =========================================================
     9. PWA — service worker registration
  ========================================================= */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {
        /* offline support unavailable — app still works fully online */
      });
    });
  }

  /* =========================================================
     10. Init
  ========================================================= */
  (async function init() {
    try {
      initDarkMode();
      await loadChapters();
      await loadCharacters();
      await loadEvents();
    } catch (err) {
      console.error("BookSpace failed to load:", err);
      showToast("hmm, something went wrong loading your space");
    }
  })();
})();
