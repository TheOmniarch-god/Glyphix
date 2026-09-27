// Safe storage: if the browser blocks storage (privacy mode, locked-down
// settings) the reader still works — preferences simply stop persisting.
var store = (function () {
  try {
    var probe = "__ri_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (e) {
    var mem = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; }
    };
  }
})();

  // Silently remove .html from browser address bar
  if (window.location.pathname.endsWith(".html")) {
    var clean = window.location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    if (!clean) clean = "/";
    window.history.replaceState(null, "", clean + window.location.search + window.location.hash);
  }

// Reverend Insanity — The Omniarch Translation
document.addEventListener("DOMContentLoaded", function () {
  // nav shadow on scroll
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // mobile menu (compact box: opens under the burger, closes on any outside tap)
  var burger = document.querySelector(".nav-burger");
  var links = document.querySelector(".nav-links");
  if (burger && links) {
    function closeMenu() {
      links.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
    burger.setAttribute("aria-expanded", "false");
    burger.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (links.classList.contains("open") && !links.contains(e.target)) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) closeMenu();
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  // reveal on scroll
  var reveals = document.querySelectorAll(".reveal");
  var animate = document.documentElement.classList.contains("js-anim");
  if (animate && "IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }, 250);
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Gentle 3D proximity tilt on the homepage cover (desktop pointers only)
  var coverCard = document.querySelector(".cover-card");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (coverCard && !reduceMotion && window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
    var tiltZone = coverCard.closest(".hero") || document.body;
    var tiltAnchor = coverCard.parentElement || coverCard;
    var tX = 0, tY = 0, tiltRaf = null;
    var renderTilt = function () {
      tiltRaf = null;
      coverCard.style.transform =
        "perspective(1100px) rotateX(" + tX.toFixed(2) + "deg) rotateY(" + tY.toFixed(2) + "deg)";
    };
    var queueTilt = function () {
      if (!tiltRaf) tiltRaf = requestAnimationFrame(renderTilt);
    };
    tiltZone.addEventListener("mousemove", function (e) {
      var r = tiltAnchor.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var px = e.clientX - cx;
      var py = e.clientY - cy;
      var dist = Math.sqrt(px * px + py * py);
      var influence = Math.max(0, 1 - dist / 720);
      var nx = Math.max(-1, Math.min(1, px / 240));
      var ny = Math.max(-1, Math.min(1, py / 240));
      tY = nx * 9 * influence;
      tX = -ny * 7 * influence;
      queueTilt();
    });
    tiltZone.addEventListener("mouseleave", function () {
      tX = 0;
      tY = 0;
      queueTilt();
    });
  }

  // reading progress bar (chapter pages)
  var bar = document.querySelector(".progress");
  if (bar) {
    var onRead = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", onRead, { passive: true });
    onRead();
  }

  // Theme toggle: "Dark theme" and "Light theme"
  var themeToggle = document.getElementById("themeToggle");
  var themeToggleText = document.getElementById("themeToggleText");

  function updateThemeUI(theme) {
    if (themeToggleText) {
      themeToggleText.textContent = theme === "obsidian" ? "Light theme" : "Dark theme";
    }
    if (themeToggle) {
      var isDark = theme === "obsidian";
      themeToggle.setAttribute("title", isDark ? "Switch to Light theme" : "Switch to Dark theme");
      themeToggle.setAttribute("aria-label", isDark ? "Switch to Light theme" : "Switch to Dark theme");
    }
  }

  // Initial sync on load
  var currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  updateThemeUI(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "obsidian";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        store.setItem("theme", "light");
        updateThemeUI("light");
      } else {
        document.documentElement.setAttribute("data-theme", "obsidian");
        store.setItem("theme", "obsidian");
        updateThemeUI("obsidian");
      }
    });
  }


  // Chapter keyboard navigation (ArrowLeft = previous, ArrowRight = next)
  document.addEventListener("keydown", function (e) {
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button" ||
        tag === "a" || tag === "option" || tag === "summary" || e.target.isContentEditable) return;
    if (e.key === "ArrowLeft") {
      var prevBtn = document.querySelector(".chapter-nav .btn-ghost[href]");
      if (prevBtn && prevBtn.getAttribute("href") && prevBtn.getAttribute("href") !== "#") {
        window.location.href = prevBtn.href;
      }
    } else if (e.key === "ArrowRight") {
      var nextBtn = document.querySelector(".chapter-nav .btn-primary[href]");
      if (nextBtn && nextBtn.getAttribute("href") && nextBtn.getAttribute("href") !== "#" && !nextBtn.getAttribute("aria-disabled")) {
        window.location.href = nextBtn.href;
      }
    }
  });

  // Reader font-size adjustment with persistence
  var proseEl = document.querySelector(".chapter-body .prose");
  var fontDec = document.getElementById("fontDec");
  var fontInc = document.getElementById("fontInc");
  var fontSizes = [15, 17, 19, 21, 23];

  // Reader typefaces: Inter (default) + three premium serifs.
  // Each scale compensates for the face's natural x-height so every
  // typeface reads at a comparable visual size at the same setting.
  var READER_FONTS = {
    inter:        { scale: 1.00 },
    opendyslexic: { scale: 1.00 },
    cormorant:    { scale: 1.12 },
    newsreader:   { scale: 1.03 },
    spectral:     { scale: 1.05 }
  };

  function currentReaderFont() {
    var f = store.getItem("readerFont");
    return (f && READER_FONTS[f]) ? f : "inter";
  }

  function applyFontSize(size) {
    if (proseEl) {
      var f = currentReaderFont();
      var scale = READER_FONTS[f].scale;
      proseEl.style.fontSize = (Math.round(size * scale * 10) / 10) + "px";
      proseEl.style.lineHeight = (f === "inter") ? (size >= 19 ? "1.9" : "1.95") : "";
      store.setItem("readerFontSize", size);
    }
  }

  function applyReaderFont(key, persist) {
    if (!READER_FONTS[key]) key = "inter";
    document.documentElement.classList.remove("rf-opendyslexic", "rf-cormorant", "rf-newsreader", "rf-spectral");
    if (key !== "inter") document.documentElement.classList.add("rf-" + key);
    if (persist !== false) store.setItem("readerFont", key);
    applyFontSize(parseInt(store.getItem("readerFontSize") || "17", 10));
    var opts = document.querySelectorAll(".font-panel .font-option");
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].getAttribute("data-font") === key) opts[i].classList.add("active");
      else opts[i].classList.remove("active");
    }
  }

  if (proseEl) {
    applyReaderFont(currentReaderFont(), false);

    // Typeface picker ("Aa" button)
    var fpBtn = document.getElementById("fontPickerBtn");
    var fpPanel = document.getElementById("fontPanel");
    if (fpBtn && fpPanel) {
      fpBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = fpPanel.classList.toggle("open");
        fpBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
      function closeFontPanel() {
        fpPanel.classList.remove("open");
        fpBtn.setAttribute("aria-expanded", "false");
      }
      document.addEventListener("click", function (e) {
        if (!fpPanel.contains(e.target) && e.target !== fpBtn) closeFontPanel();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeFontPanel();
      });
      var fpOpts = fpPanel.querySelectorAll(".font-option");
      for (var i = 0; i < fpOpts.length; i++) {
        fpOpts[i].addEventListener("click", function () {
          applyReaderFont(this.getAttribute("data-font"));
          closeFontPanel();
        });
      }
    }

    if (fontDec && fontInc) {
      fontDec.addEventListener("click", function () {
        var current = parseInt(store.getItem("readerFontSize") || "17", 10);
        var idx = fontSizes.indexOf(current);
        if (idx === -1) idx = 1;
        if (idx > 0) applyFontSize(fontSizes[idx - 1]);
      });
      fontInc.addEventListener("click", function () {
        var current = parseInt(store.getItem("readerFontSize") || "17", 10);
        var idx = fontSizes.indexOf(current);
        if (idx === -1) idx = 1;
        if (idx < fontSizes.length - 1) applyFontSize(fontSizes[idx + 1]);
      });
    }
  }


  
  // Anti-theft & copy protection on chapter reader pages
  var readerBody = document.querySelector(".chapter-body");
  if (readerBody) {
    // 1. Disable context menu (right-click) — except in text boxes, where the
    //    menu is how a reader pastes
    document.addEventListener("contextmenu", function (e) {
      if (isField(e.target)) return;
      e.preventDefault();
      return false;
    });

    // 2. Disable text selection and dragging
    document.addEventListener("selectstart", function (e) {
      if (isField(e.target)) return;
      e.preventDefault();
      return false;
    });
    document.addEventListener("dragstart", function (e) {
      if (isField(e.target)) return;
      e.preventDefault();
      return false;
    });

    // 3. Clear and intercept copy / cut
    document.addEventListener("copy", function (e) {
      if (isField(e.target)) return;
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", "");
      }
      return false;
    });
    document.addEventListener("cut", function (e) {
      if (isField(e.target)) return;
      e.preventDefault();
      return false;
    });

    // 4. Keyboard shortcuts are deliberately NOT blocked any more. Ctrl+A/C/S/P/U
    //    and F12 are all reachable from the browser menu, so blocking them only
    //    broke honest use — selecting a name to look it up, quoting a line,
    //    select-to-translate. The visible protection is right-click, selection
    //    and drag on the prose, kept in steps 1–3 above.
  }

  // chapter finder (homepage): filters the list as you type; Enter opens the first match
  var finder = document.getElementById("chapterFilter");
  if (finder) {
    var countOut = document.getElementById("chapterFilterCount");
    var allRows = Array.prototype.slice.call(document.querySelectorAll(".ch-list .ch-row"));
    var queuedRows = allRows.filter(function (r) { return !r.getAttribute("href"); });
    var queuedNums = queuedRows.map(function (r) {
      var n = r.querySelector(".ch-num");
      return (n ? n.textContent : "").trim();
    });
    var shelves = allRows.filter(function (r) { return r.getAttribute("href"); })
      .map(function (r) {
        var n = r.querySelector(".ch-num"), t = r.querySelector(".ch-name");
        return {
          el: r,
          num: (n ? n.textContent : "").trim(),
          hay: ((n ? n.textContent : "") + " " + (t ? t.textContent : "")).toLowerCase()
        };
      });

    function applyFinder() {
      var q = finder.value.trim().toLowerCase();
      var digits = q.replace(/^(chapter|ch)\s*/, "");
      var numeric = /^[0-9]+$/.test(digits);
      var shown = 0, firstHit = null;
      shelves.forEach(function (it) {
        var hit = !q || (numeric ? it.num.indexOf(digits) === 0 : it.hay.indexOf(q) !== -1);
        it.el.hidden = !hit;
        if (hit) { shown++; if (!firstHit) firstHit = it.el; }
      });
      queuedRows.forEach(function (r) { r.hidden = !!q; });
      if (countOut) {
        countOut.textContent = "";
        if (!q) {
          // nothing to say yet
        } else if (shown) {
          countOut.textContent = shown + (shown === 1 ? " chapter" : " chapters") +
            " \u2014 press Enter to open";
        } else if (numeric && queuedNums.indexOf(digits) !== -1) {
          countOut.textContent = "Chapter " + digits +
            " is still at the bench \u2014 not published yet";
        } else {
          // no chapter by that name: offer the whole text
          var phrase = finder.value.trim();
          countOut.appendChild(document.createTextNode("No chapter matches \u201c" + phrase + "\u201d \u2014 "));
          var go = document.createElement("a");
          go.className = "ch-search-fallback";
          go.href = "search?q=" + encodeURIComponent(phrase);
          go.textContent = "search the text for \u201c" + phrase + "\u201d \u2192";
          countOut.appendChild(go);
        }
      }
      return firstHit;
    }

    var firstHit = null;
    finder.addEventListener("input", function () { firstHit = applyFinder(); });
    finder.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var target = firstHit || applyFinder();
        e.preventDefault();
        if (target) {
          window.location.href = target.getAttribute("href");
        } else if (finder.value.trim()) {
          // nothing in the chapter list — send the phrase to the full-text search
          window.location.href = "search?q=" + encodeURIComponent(finder.value.trim());
        }
      } else if (e.key === "Escape") {
        finder.value = ""; firstHit = null; applyFinder();
      }
    });
    applyFinder();
  }

    // codex & resume: remember reading progress and current paragraph position
  var chAttr = document.body.getAttribute("data-chapter");
  if (chAttr) {
    var chNum = parseInt(chAttr, 10);
    var prevCh = parseInt(store.getItem("riProgress") || "0", 10);
    if (chNum > prevCh) store.setItem("riProgress", String(chNum));

    var activeHash = window.location.hash ? window.location.hash.substring(1) : "";
    var saveResumeState = function (paraId) {
      try {
        var state = {
          ch: chNum,
          p: paraId || "",
          t: Date.now()
        };
        store.setItem("ri_resume", JSON.stringify(state));
      } catch (e) {}
    };

    // If user arrived directly without a hash, check if there was a saved paragraph
    if (!activeHash) {
      try {
        var prevResume = JSON.parse(store.getItem("ri_resume") || "null");
        if (prevResume && prevResume.ch === chNum && prevResume.p && prevResume.p !== "p1") {
          var targetEl = document.getElementById(prevResume.p);
          if (targetEl) {
            var pill = document.createElement("a");
            pill.className = "resume-pill";
            pill.href = "#" + prevResume.p;
            pill.innerHTML = '<span class="rp-icon">\u21B4</span> Resume at \u00b6' + prevResume.p.replace(/^p/, '');
            pill.addEventListener("click", function (ev) {
              ev.preventDefault();
              targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
              try { history.replaceState(null, "", "#" + prevResume.p); } catch (e) {}
              pill.classList.add("fade-out");
              setTimeout(function () { if (pill.parentNode) pill.parentNode.removeChild(pill); }, 400);
            });
            document.body.appendChild(pill);

            var dismissTimer = setTimeout(function () {
              pill.classList.add("fade-out");
              setTimeout(function () { if (pill.parentNode) pill.parentNode.removeChild(pill); }, 400);
            }, 9000);

            var onDismissScroll = function () {
              if (window.scrollY > 400) {
                clearTimeout(dismissTimer);
                pill.classList.add("fade-out");
                setTimeout(function () { if (pill.parentNode) pill.parentNode.removeChild(pill); }, 400);
                window.removeEventListener("scroll", onDismissScroll);
              }
            };
            window.addEventListener("scroll", onDismissScroll, { passive: true });
          }
        }
      } catch (e) {}
    }

    // Observe paragraph visibility to record current reading paragraph
    var proseParas = document.querySelectorAll(".prose p[id]");
    if (proseParas.length && "IntersectionObserver" in window) {
      var pObs = new IntersectionObserver(function (entries) {
        for (var pi = 0; pi < entries.length; pi++) {
          var ent = entries[pi];
          if (ent.isIntersecting && ent.target.id) {
            saveResumeState(ent.target.id);
          }
        }
      }, { rootMargin: "0px 0px -70% 0px" });
      for (var pi = 0; pi < proseParas.length; pi++) {
        pObs.observe(proseParas[pi]);
      }
    } else {
      saveResumeState(activeHash || "p1");
    }
  }

  var revealed = document.body.getAttribute("data-revealed");
  if (revealed) {
    var reached = parseInt(store.getItem("riProgress") || "0", 10);
    var prog = document.getElementById("wikiProgress");
    if (prog) prog.textContent = reached ? "You have read to chapter " + reached : "Not started yet";
    if (reached < parseInt(revealed, 10)) {
      var gate = document.getElementById("wikiGate");
      var wbody = document.getElementById("wikiBody");
      var gm = document.getElementById("wikiGateMsg");
      if (gate && wbody) {
        wbody.hidden = true;
        gate.hidden = false;
        if (gm) gm.textContent = "This entry continues past chapter " + revealed +
          ". You have read to chapter " + (reached || 0) + ".";
      }
    }
  }

  // the trace obeys the reader's position as well: marks from chapters you have
  // not reached are not shown, and the count is recomputed from what is left.
  var trace = document.querySelector(".wiki-trace");
  if (trace && revealed) {
    var reachedT = parseInt(store.getItem("riProgress") || "0", 10);
    if (reachedT && reachedT < 2334) {
      var segs = trace.querySelectorAll(".trace-ch");
      var kept = 0, total = 0, firstA = null, lastA = null;
      for (var si = 0; si < segs.length; si++) {
        var seg = segs[si];
        var cnm = seg.getAttribute("data-ch");
        var cnum = cnm === "preface" ? 0 : parseInt(cnm, 10);
        var open = cnum === 0 || cnum <= reachedT;
        var cells = seg.querySelectorAll(".tc");
        for (var ci = 0; ci < cells.length; ci++) {
          var cell = cells[ci];
          if (!open) {
            cell.removeAttribute("title");
            if (cell.tagName === "A") { cell.removeAttribute("href"); }
            continue;
          }
          total++;
          if (cell.className.indexOf("on") !== -1) {
            kept++;
            if (!firstA) firstA = cell;
            lastA = cell;
          }
        }
        if (!open) seg.className += " trace-off";
      }
      var sum = trace.querySelector(".trace-sum");
      if (sum && firstA) {
        var nameOf = function (a) {
          var m = (a.getAttribute("title") || "").match(/^\s*(Chapter \d+|Preface)\s*\u00b6(\d+)/);
          return m ? [m[1], m[2]] : ["", ""];
        };
        var f = nameOf(firstA), l = nameOf(lastA);
        var pct = total ? Math.round(kept * 100 / total) : 0;
        sum.innerHTML = "Written into <strong>" + kept + "</strong> of <strong>" + total +
          "</strong> paragraphs up to chapter " + reachedT + " (" + pct + "%) \u2014 first at " +
          '<a href="' + firstA.getAttribute("href") + '">' + f[0] + ", \u00b6" + f[1] + "</a>, " +
          "most recently at " + '<a href="' + lastA.getAttribute("href") + '">' + l[0] +
          ", \u00b6" + l[1] + "</a>.";
      }
    }
  }

  // Resume reading banner / dynamic CTA on index page & chapter progress markers
  try {
    var resumeRaw = store.getItem("ri_resume");
    var maxRead = parseInt(store.getItem("riProgress") || "0", 10);
    if (resumeRaw || maxRead > 0) {
      var rData = resumeRaw ? JSON.parse(resumeRaw) : null;
      var targetCh = rData && rData.ch ? rData.ch : maxRead;
      var targetP = rData && rData.ch === targetCh && rData.p ? rData.p : "";

      var ctaRow = document.querySelector(".cta-row");
      var primaryBtn = ctaRow ? ctaRow.querySelector(".btn-primary") : null;
      if (primaryBtn && targetCh > 0) {
        var pHash = targetP && targetP !== "p1" ? "#" + targetP : "";
        var pLabel = targetP && targetP !== "p1" ? " \u00b7 \u00b6" + targetP.replace(/^p/, "") : "";
        primaryBtn.href = "/chapter-" + targetCh + pHash;
        primaryBtn.textContent = "Resume Chapter " + targetCh + pLabel + " \u2192";
        primaryBtn.classList.add("btn-resumed");

        var ctaNote = document.querySelector(".cta-note");
        if (ctaNote) {
          ctaNote.innerHTML = '<span>Picking up where you left off. Or <a href="/preface">read the Preface &rarr;</a></span>';
        }
      }

      // Mark chapters in chapter list
      if (targetCh > 0) {
        var chRows = document.querySelectorAll(".ch-row[href]");
        for (var cri = 0; cri < chRows.length; cri++) {
          var row = chRows[cri];
          var href = row.getAttribute("href") || "";
          var m = href.match(/chapter-(\d+)/);
          if (m) {
            var num = parseInt(m[1], 10);
            if (num === targetCh) {
              row.classList.add("ch-current");
              var pill = row.querySelector(".pill");
              if (pill) pill.textContent = "Current";
              var link = row.querySelector(".ch-link");
              if (link) link.textContent = "Resume \u2192";
            } else if (num < targetCh) {
              row.classList.add("ch-read");
              var pillR = row.querySelector(".pill");
              if (pillR) pillR.textContent = "\u2713 Read";
            }
          }
        }
      }
    }
  } catch (e) {}

  // ── Reverend Insanity Community Lab: Webnovel Auth & Real Storage ──────
  var API_BASE = "";
  var TOKEN_KEY = "ri_lab_token";
  var USER_KEY = "ri_lab_user";

  var labState = {
    user: null,
    token: null,
    verifyEmail: "",
    currentCode: "",
    resendInterval: null,
    currentRating: 5.0,
    pendingReviewTriggered: false,
    pendingChapter: "Chapter 1"
  };

  function getStoredToken() {
    try { return store.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function getStoredUser() {
    try {
      var raw = store.getItem(USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function saveSession(user, token) {
    labState.user = user;
    labState.token = token;
    try {
      if (user && token) {
        store.setItem(USER_KEY, JSON.stringify(user));
        store.setItem(TOKEN_KEY, token);
      } else {
        store.removeItem(USER_KEY);
        store.removeItem(TOKEN_KEY);
      }
    } catch (e) {}
    updateNavUI();
    updateReviewModalUser();
  }

  function showToast(msg) {
    var toast = document.createElement("div");
    toast.className = "lab-toast";
    toast.textContent = msg;
    toast.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:999999;background:#1e1e24;color:#ecc768;border:1.5px solid #ecc768;padding:12px 20px;border-radius:10px;font-size:13.5px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,0.5);animation:fadeInUp 0.3s ease;";
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(function() { toast.remove(); }, 300);
    }, 3200);
  }

  // Update navbar user profile / button
  function updateNavUI() {
    var user = getStoredUser();
    var triggerBtn = document.getElementById("authTriggerBtn");
    var btnLabel = document.getElementById("authBtnLabel");
    var popover = document.getElementById("userMenuPopover");
    var umpName = document.getElementById("umpName");
    var umpEmail = document.getElementById("umpEmail");
    var umpAvatar = document.getElementById("umpAvatar");
    var umpProgVal = document.getElementById("umpProgVal");

    var lastCh = store.getItem("ri_last_read_ch") || "Chapter 1";
    if (umpProgVal) umpProgVal.textContent = lastCh;

    if (!user) {
      if (btnLabel) btnLabel.textContent = "Sign In";
      if (triggerBtn) {
        var oldAvatar = triggerBtn.querySelector(".user-avatar-badge");
        if (oldAvatar) oldAvatar.remove();
        var icon = triggerBtn.querySelector(".auth-icon");
        if (icon) icon.style.display = "inline-block";
      }
      if (popover) popover.hidden = true;
    } else {
      var displayName = user.name || (user.email ? user.email.split("@")[0] : "Reader");
      var initial = displayName.charAt(0).toUpperCase();

      if (btnLabel) btnLabel.textContent = displayName;
      if (triggerBtn) {
        var icon2 = triggerBtn.querySelector(".auth-icon");
        if (icon2) icon2.style.display = "none";
        var existingBadge = triggerBtn.querySelector(".user-avatar-badge");
        if (!existingBadge) {
          existingBadge = document.createElement("span");
          existingBadge.className = "user-avatar-badge";
          triggerBtn.insertBefore(existingBadge, btnLabel);
        }
        existingBadge.textContent = initial;
        if (user.avatarBg) existingBadge.style.backgroundColor = user.avatarBg;
      }

      if (umpName) {
        var provBadge = user.provider === "google" ? ' <small class="text-gold">(Google)</small>' : ' <small style="color:#27ae60;">(✓ Verified)</small>';
        umpName.innerHTML = displayName + provBadge;
      }
      if (umpEmail) umpEmail.textContent = user.email || "";
      if (umpAvatar) {
        umpAvatar.textContent = initial;
        if (user.avatarBg) umpAvatar.style.backgroundColor = user.avatarBg;
      }
    }
  }

  function updateReviewModalUser() {
    var user = getStoredUser();
    var userLine = document.getElementById("reviewModalUserLine");
    var nameDisp = document.getElementById("reviewUserNameDisplay");
    if (user && nameDisp) {
      nameDisp.textContent = user.name + (user.emailVerified ? " (✓ Verified Reader)" : "");
      if (userLine) userLine.style.display = "block";
    }
  }

  // Record reading progress on chapter pages
  try {
    var chPathMatch = window.location.pathname.match(/chapter-(\d+)/);
    if (chPathMatch) {
      var currentChNum = chPathMatch[1];
      store.setItem("ri_last_read_ch", "Chapter " + currentChNum);
      labState.pendingChapter = "Chapter " + currentChNum;
    } else if (window.location.pathname.indexOf("preface") !== -1) {
      store.setItem("ri_last_read_ch", "Author's Preface");
      labState.pendingChapter = "Preface";
    }
  } catch (e) {}

  // Initialize Auth state from Server
  var initialToken = getStoredToken();
  if (initialToken) {
    fetch(API_BASE + "/api/auth/me", {
      headers: { "Authorization": "Bearer " + initialToken }
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.ok && data.user) {
          saveSession(data.user, initialToken);
        } else {
          saveSession(null, null);
        }
      })
      .catch(function() {
        // Offline / fallback to localStorage
        updateNavUI();
      });
  } else {
    updateNavUI();
  }

  // Check Database connection status
  fetch(API_BASE + "/api/status")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var statusBadge = document.getElementById("labDbStatus");
      if (statusBadge && data.ok) {
        statusBadge.innerHTML = '<span class="status-dot-pulse"></span> Persistent DB Online (' + data.users_count + ' users, ' + data.reviews_count + ' reviews)';
      }
    })
    .catch(function() {});

  // Lab Reset Button
  var labResetBtn = document.getElementById("labResetBtn");
  if (labResetBtn) {
    labResetBtn.addEventListener("click", function() {
      if (confirm("Reset the Lab test database back to original demo seed data?")) {
        fetch(API_BASE + "/api/lab/reset", { method: "POST" })
          .then(function(r) { return r.json(); })
          .then(function(d) {
            showToast("Database reset to demo state.");
            loadReviews();
          });
      }
    });
  }

  // ── Auth Modal & Navigation Triggers ──────────────────────────────────
  var authTriggerBtn = document.getElementById("authTriggerBtn");
  var userMenuPopover = document.getElementById("userMenuPopover");
  var authModal = document.getElementById("authModal");
  var googleChooserModal = document.getElementById("googleChooserModal");
  var reviewModal = document.getElementById("reviewModal");

  if (authTriggerBtn) {
    authTriggerBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      var user = getStoredUser();
      if (!user) {
        openAuthModal("signin");
      } else {
        if (userMenuPopover) {
          userMenuPopover.hidden = !userMenuPopover.hidden;
        }
      }
    });
  }

  document.addEventListener("click", function(e) {
    if (userMenuPopover && !userMenuPopover.hidden) {
      if (!userMenuPopover.contains(e.target) && e.target !== authTriggerBtn) {
        userMenuPopover.hidden = true;
      }
    }
  });

  // Sign out button
  var umpSignOutBtn = document.getElementById("umpSignOutBtn");
  if (umpSignOutBtn) {
    umpSignOutBtn.addEventListener("click", function() {
      var token = getStoredToken();
      if (token) {
        fetch(API_BASE + "/api/auth/logout", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token }
        }).catch(function() {});
      }
      saveSession(null, null);
      if (userMenuPopover) userMenuPopover.hidden = true;
      showToast("Signed out.");
      loadReviews();
    });
  }

  function openAuthModal(tab) {
    if (!authModal) return;
    authModal.hidden = false;
    // Reset to main screen
    var screenMain = document.getElementById("authScreenMain");
    var screenVerify = document.getElementById("authScreenVerify");
    if (screenMain) screenMain.hidden = false;
    if (screenVerify) screenVerify.hidden = true;
    switchAuthTab(tab || "signin");
  }

  function switchAuthTab(tab) {
    var tabInBtn = document.getElementById("tabSignInBtn");
    var tabUpBtn = document.getElementById("tabSignUpBtn");
    var formIn = document.getElementById("signInForm");
    var formUp = document.getElementById("signUpForm");

    if (tabInBtn) tabInBtn.classList.toggle("active", tab === "signin");
    if (tabUpBtn) tabUpBtn.classList.toggle("active", tab === "signup");
    if (formIn) formIn.hidden = (tab !== "signin");
    if (formUp) formUp.hidden = (tab !== "signup");
  }

  var tabInBtn = document.getElementById("tabSignInBtn");
  var tabUpBtn = document.getElementById("tabSignUpBtn");
  if (tabInBtn) tabInBtn.addEventListener("click", function() { switchAuthTab("signin"); });
  if (tabUpBtn) tabUpBtn.addEventListener("click", function() { switchAuthTab("signup"); });

  // Modal Closers
  var authCloseBtn = document.getElementById("authModalClose");
  var authBackdrop = document.getElementById("authModalBackdrop");
  if (authCloseBtn) authCloseBtn.addEventListener("click", function() { if (authModal) authModal.hidden = true; });
  if (authBackdrop) authBackdrop.addEventListener("click", function() { if (authModal) authModal.hidden = true; });

  var googleChooserClose = document.getElementById("googleChooserClose");
  var googleChooserBackdrop = document.getElementById("googleChooserBackdrop");
  if (googleChooserClose) googleChooserClose.addEventListener("click", function() { if (googleChooserModal) googleChooserModal.hidden = true; });
  if (googleChooserBackdrop) googleChooserBackdrop.addEventListener("click", function() { if (googleChooserModal) googleChooserModal.hidden = true; });

  var reviewModalClose = document.getElementById("reviewModalClose");
  var reviewModalBackdrop = document.getElementById("reviewModalBackdrop");
  if (reviewModalClose) reviewModalClose.addEventListener("click", function() { if (reviewModal) reviewModal.hidden = true; });
  if (reviewModalBackdrop) reviewModalBackdrop.addEventListener("click", function() { if (reviewModal) reviewModal.hidden = true; });

  // ── Step 1: Sign Up -> Sends Verification Code ────────────────────────
  var signUpForm = document.getElementById("signUpForm");
  if (signUpForm) {
    signUpForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var name = (document.getElementById("signUpName").value || "").trim();
      var email = (document.getElementById("signUpEmail").value || "").trim();
      var password = document.getElementById("signUpPassword").value || "";
      var statusEl = document.getElementById("signUpStatus");
      var submitBtn = document.getElementById("signUpSubmitBtn");

      if (!name || !email || !password) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending Verification Code...";
      statusEl.hidden = true;

      fetch(API_BASE + "/api/auth/register-send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, password: password })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Verification Code →";
          if (!data.ok) {
            statusEl.hidden = false;
            statusEl.className = "auth-status error";
            statusEl.textContent = data.error || "Unable to send verification code.";
            return;
          }

          // Transition to Verification Screen
          labState.verifyEmail = email;
          labState.currentCode = data.code_hint || "";

          var screenMain = document.getElementById("authScreenMain");
          var screenVerify = document.getElementById("authScreenVerify");
          var emailDisp = document.getElementById("verifyEmailDisplay");
          var tmbCode = document.getElementById("tmbCodeDisplay");

          if (screenMain) screenMain.hidden = true;
          if (screenVerify) screenVerify.hidden = false;
          if (emailDisp) emailDisp.textContent = email;
          if (tmbCode) tmbCode.textContent = labState.currentCode;

          startOtpTimer(45);
          resetOtpInputs();
        })
        .catch(function(err) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Verification Code →";
          statusEl.hidden = false;
          statusEl.className = "auth-status error";
          statusEl.textContent = "Network error connecting to verification service.";
        });
    });
  }

  // ── Step 2: OTP Input Handling & Verification ─────────────────────────
  var otpInputs = document.querySelectorAll(".otp-digit");
  var otpInputsRow = document.getElementById("otpInputsRow");

  function resetOtpInputs() {
    otpInputs.forEach(function(inp) { inp.value = ""; });
    if (otpInputsRow) otpInputsRow.classList.remove("error");
    if (otpInputs[0]) otpInputs[0].focus();
  }

  otpInputs.forEach(function(inp, idx) {
    inp.addEventListener("input", function(e) {
      var val = inp.value.replace(/[^0-9]/g, "");
      inp.value = val ? val.charAt(0) : "";
      if (val && idx < otpInputs.length - 1) {
        otpInputs[idx + 1].focus();
      }
    });

    inp.addEventListener("keydown", function(e) {
      if (e.key === "Backspace" && !inp.value && idx > 0) {
        otpInputs[idx - 1].focus();
      }
    });

    inp.addEventListener("paste", function(e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "");
      if (pasted.length >= 6) {
        for (var i = 0; i < 6; i++) {
          if (otpInputs[i]) otpInputs[i].value = pasted.charAt(i);
        }
        if (otpInputs[5]) otpInputs[5].focus();
      }
    });
  });

  // Auto-fill button for effortless testing
  var btnAutofill = document.getElementById("btnAutofillOtp");
  if (btnAutofill) {
    btnAutofill.addEventListener("click", function() {
      if (labState.currentCode && labState.currentCode.length === 6) {
        for (var i = 0; i < 6; i++) {
          if (otpInputs[i]) otpInputs[i].value = labState.currentCode.charAt(i);
        }
        if (otpInputs[5]) otpInputs[5].focus();
      }
    });
  }

  function startOtpTimer(seconds) {
    var timerText = document.getElementById("otpTimerText");
    var resendBtn = document.getElementById("btnResendOtp");
    var countdown = document.getElementById("otpCountdown");

    if (resendBtn) resendBtn.hidden = true;
    if (timerText) timerText.hidden = false;
    if (countdown) countdown.textContent = seconds;

    if (labState.resendInterval) clearInterval(labState.resendInterval);

    var remaining = seconds;
    labState.resendInterval = setInterval(function() {
      remaining--;
      if (countdown) countdown.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(labState.resendInterval);
        if (timerText) timerText.hidden = true;
        if (resendBtn) resendBtn.hidden = false;
      }
    }, 1000);
  }

  // Resend code button
  var btnResendOtp = document.getElementById("btnResendOtp");
  if (btnResendOtp) {
    btnResendOtp.addEventListener("click", function() {
      btnResendOtp.disabled = true;
      btnResendOtp.textContent = "Resending...";
      fetch(API_BASE + "/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: labState.verifyEmail })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          btnResendOtp.disabled = false;
          btnResendOtp.textContent = "Resend Code";
          if (data.ok) {
            labState.currentCode = data.code_hint || "";
            var tmbCode = document.getElementById("tmbCodeDisplay");
            if (tmbCode) tmbCode.textContent = labState.currentCode;
            startOtpTimer(45);
            resetOtpInputs();
            showToast("Fresh verification code sent.");
          }
        });
    });
  }

  // Change email button
  var btnChangeEmail = document.getElementById("btnChangeEmail");
  if (btnChangeEmail) {
    btnChangeEmail.addEventListener("click", function() {
      var screenMain = document.getElementById("authScreenMain");
      var screenVerify = document.getElementById("authScreenVerify");
      if (screenMain) screenMain.hidden = false;
      if (screenVerify) screenVerify.hidden = true;
    });
  }

  // Submit Verification OTP Form
  var verifyOtpForm = document.getElementById("verifyOtpForm");
  if (verifyOtpForm) {
    verifyOtpForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var code = "";
      otpInputs.forEach(function(inp) { code += (inp.value || "").trim(); });
      var statusEl = document.getElementById("verifyStatus");
      var submitBtn = document.getElementById("verifySubmitBtn");

      if (code.length < 6) {
        statusEl.hidden = false;
        statusEl.className = "auth-status error";
        statusEl.textContent = "Please enter all 6 digits of your verification code.";
        if (otpInputsRow) {
          otpInputsRow.classList.add("error");
          setTimeout(function() { otpInputsRow.classList.remove("error"); }, 600);
        }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Verifying Code...";
      statusEl.hidden = true;

      fetch(API_BASE + "/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: labState.verifyEmail, code: code })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Verify Code & Create Account";
          if (!data.ok) {
            statusEl.hidden = false;
            statusEl.className = "auth-status error";
            statusEl.textContent = data.error || "Invalid verification code. Please check and try again.";
            if (otpInputsRow) {
              otpInputsRow.classList.add("error");
              setTimeout(function() { otpInputsRow.classList.remove("error"); }, 600);
            }
            return;
          }

          // Verified!
          statusEl.hidden = false;
          statusEl.className = "auth-status success";
          statusEl.textContent = "✓ Email verified! Welcome, " + (data.user.name || "Cultivator") + "!";
          saveSession(data.user, data.token);

          setTimeout(function() {
            if (authModal) authModal.hidden = true;
            showToast("✓ Welcome " + data.user.name + "! Your email is verified.");
            if (labState.pendingReviewTriggered) {
              labState.pendingReviewTriggered = false;
              openReviewModal(labState.pendingChapter);
            }
          }, 800);
        })
        .catch(function(err) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Verify Code & Create Account";
          statusEl.hidden = false;
          statusEl.className = "auth-status error";
          statusEl.textContent = "Verification request failed.";
        });
    });
  }

  // ── Email Sign In Handler ─────────────────────────────────────────────
  var signInForm = document.getElementById("signInForm");
  if (signInForm) {
    signInForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var email = (document.getElementById("signInEmail").value || "").trim();
      var password = document.getElementById("signInPassword").value || "";
      var statusEl = document.getElementById("signInStatus");
      var submitBtn = document.getElementById("signInSubmitBtn");

      if (!email || !password) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Signing In...";
      statusEl.hidden = true;

      fetch(API_BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign In";
          if (!data.ok) {
            statusEl.hidden = false;
            statusEl.className = "auth-status error";
            statusEl.textContent = data.error || "Unable to sign in.";
            return;
          }

          saveSession(data.user, data.token);
          statusEl.hidden = false;
          statusEl.className = "auth-status success";
          statusEl.textContent = "Signed in as " + data.user.name + "!";

          setTimeout(function() {
            if (authModal) authModal.hidden = true;
            showToast("Welcome back, " + data.user.name + "!");
            if (labState.pendingReviewTriggered) {
              labState.pendingReviewTriggered = false;
              openReviewModal(labState.pendingChapter);
            }
          }, 500);
        })
        .catch(function() {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign In";
          statusEl.hidden = false;
          statusEl.className = "auth-status error";
          statusEl.textContent = "Sign in request failed.";
        });
    });
  }

  // ── Webnovel Google Account Chooser ───────────────────────────────────
  var googleLoginBtn = document.getElementById("googleLoginBtn");
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", function() {
      if (authModal) authModal.hidden = true;
      if (googleChooserModal) googleChooserModal.hidden = false;
    });
  }

  function handleGoogleAuth(name, email, avatar) {
    fetch(API_BASE + "/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, email: email, avatar: avatar })
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (googleChooserModal) googleChooserModal.hidden = true;
        if (data.ok && data.user) {
          saveSession(data.user, data.token);
          showToast("✓ Signed in with Google as " + data.user.name);
          if (labState.pendingReviewTriggered) {
            labState.pendingReviewTriggered = false;
            openReviewModal(labState.pendingChapter);
          }
        }
      });
  }

  document.querySelectorAll(".google-acc-item[data-email]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var name = btn.getAttribute("data-name");
      var email = btn.getAttribute("data-email");
      var avatar = btn.getAttribute("data-avatar");
      handleGoogleAuth(name, email, avatar);
    });
  });

  var btnCustomGoogle = document.getElementById("btnCustomGoogleAcc");
  var customGoogleForm = document.getElementById("customGoogleForm");
  if (btnCustomGoogle && customGoogleForm) {
    btnCustomGoogle.addEventListener("click", function() {
      customGoogleForm.hidden = !customGoogleForm.hidden;
      if (!customGoogleForm.hidden) {
        var inp = document.getElementById("customGoogleEmail");
        if (inp) inp.focus();
      }
    });

    customGoogleForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var name = document.getElementById("customGoogleName").value.trim() || "Cultivator";
      var email = document.getElementById("customGoogleEmail").value.trim();
      if (email) {
        handleGoogleAuth(name, email, name.charAt(0).toUpperCase());
      }
    });
  }

  // ── Webnovel Review Modal ─────────────────────────────────────────────
  function openReviewModal(chapter) {
    var user = getStoredUser();
    if (!user) {
      labState.pendingReviewTriggered = true;
      labState.pendingChapter = chapter || "Chapter 1";
      openAuthModal("signin");
      showToast("Please sign in or verify your email to review.");
      return;
    }

    if (!reviewModal) return;
    reviewModal.hidden = false;
    updateReviewModalUser();

    if (chapter) {
      var sel = document.getElementById("reviewChapterSelect");
      if (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value.indexOf(chapter) !== -1) {
            sel.selectedIndex = i;
            break;
          }
        }
      }
    }
  }

  // Wire trigger buttons on homepage & chapters
  var writeTrigger = document.getElementById("btnWriteReviewTrigger");
  if (writeTrigger) {
    writeTrigger.addEventListener("click", function() { openReviewModal("Chapter 1"); });
  }

  document.querySelectorAll(".btn-open-review").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var ch = btn.getAttribute("data-chapter") || "Chapter 1";
      openReviewModal(ch);
    });
  });

  // Overall Rating Star Picker in Review Modal
  var starBtns = document.querySelectorAll("#rpcStars .star-btn");
  var rpcScoreDisplay = document.getElementById("rpcScoreDisplay");

  starBtns.forEach(function(sBtn) {
    sBtn.addEventListener("click", function() {
      var val = parseInt(sBtn.getAttribute("data-val"), 10);
      labState.currentRating = val;
      starBtns.forEach(function(b) {
        var bVal = parseInt(b.getAttribute("data-val"), 10);
        b.classList.toggle("active", bVal <= val);
      });
      if (rpcScoreDisplay) {
        rpcScoreDisplay.textContent = val.toFixed(1) + " / 5.0";
      }
    });
  });

  // Submit Review Form
  var reviewSubmitForm = document.getElementById("reviewSubmitForm");
  if (reviewSubmitForm) {
    reviewSubmitForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var user = getStoredUser();
      var token = getStoredToken();
      if (!user) {
        openAuthModal("signin");
        return;
      }

      var title = (document.getElementById("reviewTitle").value || "").trim();
      var body = (document.getElementById("reviewBody").value || "").trim();
      var chapter = document.getElementById("reviewChapterSelect").value || "Chapter 1";
      var spoiler = document.getElementById("reviewSpoilerCheck").checked;
      var statusEl = document.getElementById("reviewStatus");
      var submitBtn = document.getElementById("btnSubmitReview");

      var categories = {
        story: parseFloat(document.getElementById("dimStory").value || "5.0"),
        characters: parseFloat(document.getElementById("dimCharacters").value || "5.0"),
        world: parseFloat(document.getElementById("dimWorld").value || "5.0"),
        translation: parseFloat(document.getElementById("dimTranslation").value || "5.0")
      };

      submitBtn.disabled = true;
      submitBtn.textContent = "Publishing Review...";
      statusEl.hidden = true;

      fetch(API_BASE + "/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (token || "")
        },
        body: JSON.stringify({
          rating: labState.currentRating,
          categories: categories,
          title: title,
          body: body,
          chapter: chapter,
          spoiler: spoiler,
          userName: user.name,
          userEmail: user.email
        })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Publish Review";
          if (!data.ok) {
            statusEl.hidden = false;
            statusEl.className = "auth-status error";
            statusEl.textContent = data.error || "Failed to publish review.";
            return;
          }

          reviewModal.hidden = true;
          document.getElementById("reviewTitle").value = "";
          document.getElementById("reviewBody").value = "";
          showToast("✓ Review published to Community Lab!");
          loadReviews();

          // Scroll to review section if on homepage
          var revSec = document.getElementById("reviewsSection");
          if (revSec) {
            revSec.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        })
        .catch(function() {
          submitBtn.disabled = false;
          submitBtn.textContent = "Publish Review";
          statusEl.hidden = false;
          statusEl.className = "auth-status error";
          statusEl.textContent = "Error publishing review.";
        });
    });
  }

  // ── Dynamic Reviews Feed & Live Scoring ────────────────────────────────
  function formatStarsString(score) {
    var s = Math.round(score || 5);
    return "★".repeat(Math.max(1, Math.min(5, s)));
  }

  function loadReviews() {
    var feed = document.getElementById("reviewsFeed");
    fetch(API_BASE + "/api/reviews")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.ok) return;

        // 1. Update summary lockup
        var sum = data.summary || {};
        var sumAvgEl = document.getElementById("summaryAvg");
        var sumStarsEl = document.getElementById("summaryStars");
        var sumCountEl = document.getElementById("summaryCount");

        if (sumAvgEl) sumAvgEl.textContent = (sum.avg || 5.0).toFixed(1);
        if (sumStarsEl) sumStarsEl.textContent = formatStarsString(sum.avg);
        if (sumCountEl) sumCountEl.textContent = sum.count || 0;

        // 2. Update category averages
        var cats = sum.categories || {};
        var elStory = document.getElementById("catStoryAvg");
        var elChars = document.getElementById("catCharsAvg");
        var elWorld = document.getElementById("catWorldAvg");
        var elTrans = document.getElementById("catTransAvg");

        if (elStory) elStory.textContent = (cats.story || 5.0).toFixed(1) + " ★";
        if (elChars) elChars.textContent = (cats.characters || 5.0).toFixed(1) + " ★";
        if (elWorld) elWorld.textContent = (cats.world || 5.0).toFixed(1) + " ★";
        if (elTrans) elTrans.textContent = (cats.translation || 5.0).toFixed(1) + " ★";

        // 3. Render Reviews Feed
        if (!feed) return;
        feed.innerHTML = "";
        var list = data.reviews || [];

        if (list.length === 0) {
          feed.innerHTML = '<p class="muted" style="text-align:center;padding:20px;">No reviews yet. Be the first to share your thoughts!</p>';
          return;
        }

        var currentUser = getStoredUser();

        list.forEach(function(rev) {
          var card = document.createElement("div");
          card.className = "rev-card";

          var avatarChar = (rev.userAvatar || (rev.userName ? rev.userName.charAt(0) : "R")).toUpperCase();
          var isOwner = currentUser && (currentUser.id === rev.userId || currentUser.email === rev.userEmail);

          var spoilerHtml = "";
          if (rev.spoiler) {
            spoilerHtml =
              '<div class="rev-spoiler-box">' +
              '  <div class="rev-spoiler-warn">' +
              '    <span>⚠️ This review contains plot spoilers</span>' +
              '    <button type="button" class="btn-show-spoiler" onclick="this.parentElement.nextElementSibling.classList.toggle(\'revealed\'); this.textContent = this.textContent === \'Show\' ? \'Hide\' : \'Show\';">Show</button>' +
              '  </div>' +
              '  <div class="rev-spoiler-content">' +
              '    <p class="rev-body-text">' + escapeHtml(rev.body) + '</p>' +
              '  </div>' +
              '</div>';
          } else {
            spoilerHtml = '<p class="rev-body-text">' + escapeHtml(rev.body) + '</p>';
          }

          var verifiedBadge = rev.verified
            ? '<span class="rev-verified-tag">✓ Verified Reader</span>'
            : '';

          var deleteBtnHtml = isOwner
            ? '<button type="button" class="btn-rev-del" data-id="' + rev.id + '">Delete</button>'
            : '';

          card.innerHTML =
            '<div class="rev-card-top">' +
            '  <div class="rev-user-profile">' +
            '    <div class="rev-avatar" style="background:' + (rev.avatarBg || '#b8860b') + ';">' + avatarChar + '</div>' +
            '    <div class="rev-meta-block">' +
            '      <div class="rev-user-name-line"><span>' + escapeHtml(rev.userName) + '</span> ' + verifiedBadge + '</div>' +
            '      <span class="rev-date-line">' + formatDate(rev.createdAt) + '</span>' +
            '    </div>' +
            '  </div>' +
            '  <div class="rev-rating-badge">' +
            '    <span>★ ' + (rev.rating || 5.0).toFixed(1) + '</span>' +
            '  </div>' +
            '</div>' +
            '<h4 class="rev-title">' + escapeHtml(rev.title) + '</h4>' +
            spoilerHtml +
            '<div class="rev-footer-row">' +
            '  <div class="rev-tags-list">' +
            '    <span class="rev-pill rev-ch-pill">' + escapeHtml(rev.chapter || "Chapter 1") + '</span>' +
            '    <span class="rev-pill">Story: ' + (rev.categories.story || 5.0) + '</span>' +
            '    <span class="rev-pill">World: ' + (rev.categories.world || 5.0) + '</span>' +
            '    <span class="rev-pill">Characters: ' + (rev.categories.characters || 5.0) + '</span>' +
            '    <span class="rev-pill">Translation: ' + (rev.categories.translation || 5.0) + '</span>' +
            '  </div>' +
            '  <div class="rev-actions-block">' +
            '    <button type="button" class="btn-rev-vote" data-id="' + rev.id + '">👍 Helpful (' + (rev.likes || 0) + ')</button>' +
            '    ' + deleteBtnHtml +
            '  </div>' +
            '</div>';

          // Upvote handler
          var voteBtn = card.querySelector(".btn-rev-vote");
          if (voteBtn) {
            voteBtn.addEventListener("click", function() {
              fetch(API_BASE + "/api/reviews/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reviewId: rev.id })
              })
                .then(function(r) { return r.json(); })
                .then(function(d) {
                  if (d.ok) {
                    voteBtn.classList.add("voted");
                    voteBtn.textContent = "👍 Helpful (" + d.likes + ")";
                  }
                });
            });
          }

          // Delete handler
          var delBtn = card.querySelector(".btn-rev-del");
          if (delBtn) {
            delBtn.addEventListener("click", function() {
              if (confirm("Delete your review?")) {
                fetch(API_BASE + "/api/reviews/delete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reviewId: rev.id })
                })
                  .then(function() {
                    showToast("Review deleted.");
                    loadReviews();
                  });
              }
            });
          }

          feed.appendChild(card);
        });
      })
      .catch(function() {});
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatDate(isoStr) {
    if (!isoStr) return "Recently";
    try {
      var d = new Date(isoStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return "Recently";
    }
  }

  // Load reviews on page load
  loadReviews();

  // ── Wiki Notice Interceptor ───────────────────────────────────────────
  function showWikiNotice() {
    var modal = document.getElementById("wikiNoticeModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "wiki-modal";
      modal.id = "wikiNoticeModal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.innerHTML =
        '<div class="wiki-modal-backdrop"></div>' +
        '<div class="wiki-modal-box">' +
        '  <button type="button" class="wiki-modal-close" aria-label="Close message">&times;</button>' +
        '  <div class="wiki-modal-icon">📜</div>' +
        '  <p class="wiki-modal-kicker">Gu World &middot; Codex</p>' +
        '  <h3 class="wiki-modal-title">Wiki is under refinement</h3>' +
        '  <p class="wiki-modal-desc">The character codex and 3D world are currently being refined. They will unlock as more chapters are published.</p>' +
        '  <div class="wiki-modal-actions">' +
        '    <button type="button" class="btn btn-primary wiki-modal-dismiss">Got it</button>' +
        '    <a class="btn btn-ghost" href="/chapter-1">Read Chapter 1 &rarr;</a>' +
        '  </div>' +
        '</div>';
      document.body.appendChild(modal);

      modal.addEventListener("click", function(e) {
        if (e.target.classList.contains("wiki-modal-backdrop") ||
            e.target.classList.contains("wiki-modal-close") ||
            e.target.classList.contains("wiki-modal-dismiss")) {
          modal.hidden = true;
        }
      });

      document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && !modal.hidden) {
          modal.hidden = true;
        }
      });
    }

    modal.hidden = false;
  }

  document.addEventListener("click", function(e) {
    var a = e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href === "wiki" || href === "/wiki" || href === "/wiki/" || href === "../wiki" || href === "../wiki/") {
      e.preventDefault();
      var burger = document.querySelector(".nav-burger");
      var links = document.querySelector(".nav-links");
      if (burger && links && links.classList.contains("open")) {
        links.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
      showWikiNotice();
    }
  });

  // Footer Year
  var y = document.querySelector(".year");
  if (y) y.textContent = new Date().getFullYear();
});
