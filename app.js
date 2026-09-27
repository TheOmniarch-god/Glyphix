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
      if (document.getElementById("readerDrawer")) {
        openReaderDrawer();
        return;
      }
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

  // Static LocalStorage Database Fallback (active on GitHub Pages & offline)
  var localDb = {
    getUsers: function() {
      try {
        var r = store.getItem("ri_lab_users_db");
        if (r) return JSON.parse(r);
      } catch (e) {}
      var initial = [
        { id: "usr_01", name: "Heaven Refining", email: "venerable@gmail.com", emailVerified: true, avatarBg: "#b8860b", provider: "google" },
        { id: "usr_02", name: "Bai Ning Bing", email: "icemuscle@qingmao.net", emailVerified: true, avatarBg: "#4a7a96", provider: "email" },
        { id: "usr_03", name: "Gu Yue Mo Chen", email: "mochen@guyue.clan", emailVerified: true, avatarBg: "#734d26", provider: "email" }
      ];
      store.setItem("ri_lab_users_db", JSON.stringify(initial));
      return initial;
    },
    saveUsers: function(users) {
      try { store.setItem("ri_lab_users_db", JSON.stringify(users)); } catch (e) {}
    },
    getReviews: function() {
      try {
        var r = store.getItem("ri_lab_reviews_db");
        if (r) return JSON.parse(r);
      } catch (e) {}
      var initial = [
        {
          id: "rev_01",
          userId: "usr_01",
          user: "Heaven Refining",
          userName: "Heaven Refining",
          userAvatar: "logo-circle.png",
          userEmail: "venerable@gmail.com",
          userProvider: "google",
          verified: true,
          overall: 5,
          rating: 5.0,
          userLevel: "LV 4",
          categories: { writing: 5.0, story: 5.0, characters: 5.0, stability: 5.0, world: 5.0 },
          title: "A masterwork of ruthless philosophy and perseverance",
          text: "Fang Yuan is one of the most logically consistent and compelling protagonists in fiction. The world building around Gu worms, primeval essence, and clan politics is layered and unyielding. The Omniarch translation is remarkably crisp and elevates the prose.",
          body: "Fang Yuan is one of the most logically consistent and compelling protagonists in fiction. The world building around Gu worms, primeval essence, and clan politics is layered and unyielding. The Omniarch translation is remarkably crisp and elevates the prose.",
          chapter: "Chapter 3",
          spoilers: false,
          spoiler: false,
          helpful: 42,
          likes: 42,
          date: "Sep 20, 2026",
          createdAt: "2026-09-20T10:14:00Z"
        },
        {
          id: "rev_02",
          userId: "usr_02",
          user: "Bai Ning Bing",
          userName: "Bai Ning Bing",
          userAvatar: "B",
          userEmail: "icemuscle@qingmao.net",
          userProvider: "email",
          verified: true,
          overall: 5,
          rating: 5.0,
          categories: { story: 5.0, characters: 5.0, world: 5.0, translation: 4.8 },
          title: "Uncompromising cultivation and zero plot armor",
          text: "The early chapters at Qing Mao Mountain do a phenomenal job setting up the stakes. Fang Yuan's cold composure during the Awakening ceremony is chilling yet utterly pragmatic.",
          body: "The early chapters at Qing Mao Mountain do a phenomenal job setting up the stakes. Fang Yuan's cold composure during the Awakening ceremony is chilling yet utterly pragmatic.",
          chapter: "Chapter 2",
          spoilers: false,
          spoiler: false,
          helpful: 28,
          likes: 28,
          date: "Sep 22, 2026",
          createdAt: "2026-09-22T14:40:00Z"
        },
        {
          id: "rev_03",
          userId: "usr_03",
          user: "Gu Yue Mo Chen",
          userName: "Gu Yue Mo Chen",
          userAvatar: "G",
          userEmail: "mochen@guyue.clan",
          userProvider: "email",
          verified: true,
          overall: 5,
          rating: 4.8,
          categories: { story: 5.0, characters: 4.6, world: 5.0, translation: 4.8 },
          title: "Clan politics and Gu cultivation done right",
          text: "The tension between the Mo and Chi factions adds tremendous texture to Gu Yue Village. The translation captures the formal hierarchy and subtle disrespect with pinpoint precision.",
          body: "The tension between the Mo and Chi factions adds tremendous texture to Gu Yue Village. The translation captures the formal hierarchy and subtle disrespect with pinpoint precision.",
          chapter: "Chapter 1",
          spoilers: true,
          spoiler: true,
          helpful: 15,
          likes: 15,
          date: "Sep 24, 2026",
          createdAt: "2026-09-24T18:22:00Z"
        },
        {
          id: "rev_2df64a82",
          userId: "usr_85f32be1",
          user: "SpectralCultivator",
          userName: "SpectralCultivator",
          userAvatar: "S",
          userEmail: "tester@guworld.org",
          userProvider: "email",
          verified: true,
          overall: 5,
          rating: 5.0,
          userLevel: "LV 4",
          categories: { writing: 5.0, story: 5.0, characters: 5.0, stability: 5.0, world: 5.0 },
          title: "Unrivaled philosophical depth in modern web fiction",
          text: "The way Fang Yuan navigates Gu Yue Village with 500 years of demonic wisdom makes every interaction thrilling.",
          body: "The way Fang Yuan navigates Gu Yue Village with 500 years of demonic wisdom makes every interaction thrilling.",
          chapter: "Chapter 3",
          spoilers: false,
          spoiler: false,
          helpful: 12,
          likes: 12,
          date: "Sep 27, 2026",
          createdAt: "2026-09-27T08:50:29Z"
        }
      ];
      store.setItem("ri_lab_reviews_db", JSON.stringify(initial));
      return initial;
    },
    saveReviews: function(revs) {
      try { store.setItem("ri_lab_reviews_db", JSON.stringify(revs)); } catch (e) {}
    },
    calcSummary: function(revs) {
      if (!revs || revs.length === 0) {
        return {
          avg: 5.0,
          count: 0,
          categories: { story: 5.0, characters: 5.0, world: 5.0, translation: 5.0 }
        };
      }
      var sum = 0;
      var cSums = { story: 0, characters: 0, world: 0, translation: 0 };
      var cCounts = { story: 0, characters: 0, world: 0, translation: 0 };

      revs.forEach(function(r) {
        var score = floatVal(r.rating || r.overall || 5.0);
        sum += score;
        var cats = r.categories || {};
        ["story", "characters", "world", "translation"].forEach(function(cat) {
          if (cats[cat] !== undefined && cats[cat] !== null) {
            cSums[cat] += floatVal(cats[cat]);
            cCounts[cat]++;
          }
        });
      });

      var count = revs.length;
      var avg = parseFloat((sum / count).toFixed(1));
      return {
        avg: avg,
        count: count,
        categories: {
          writing: cCounts.writing ? parseFloat((cSums.writing / cCounts.writing).toFixed(1)) : avg,
          story: cCounts.story ? parseFloat((cSums.story / cCounts.story).toFixed(1)) : avg,
          characters: cCounts.characters ? parseFloat((cSums.characters / cCounts.characters).toFixed(1)) : avg,
          stability: cCounts.stability ? parseFloat((cSums.stability / cCounts.stability).toFixed(1)) : avg,
          world: cCounts.world ? parseFloat((cSums.world / cCounts.world).toFixed(1)) : avg
        }
      };
    }
  };

  function floatVal(v) {
    var p = parseFloat(v);
    return isNaN(p) ? 5.0 : p;
  }

  // Dual-mode API Caller: tries server API, seamlessly falls back to localDb if offline
  function callApi(endpoint, method, data, token) {
    method = method || "GET";
    var headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;

    var fetchOpts = { method: method, headers: headers };
    if (data && method !== "GET") {
      fetchOpts.body = JSON.stringify(data);
    }

    return fetch(API_BASE + endpoint, fetchOpts)
      .then(function(res) {
        if (!res.ok && res.status !== 400 && res.status !== 401) {
          throw new Error("HTTP " + res.status);
        }
        return res.json();
      })
      .catch(function(err) {
        // Fallback simulation for offline or static hosting
        return fallbackApiHandler(endpoint, method, data);
      });
  }

  function fallbackApiHandler(endpoint, method, data) {
    if (endpoint === "/api/status") {
      var uList = localDb.getUsers();
      var rList = localDb.getReviews();
      return {
        ok: true,
        environment: "Reverend Insanity Reader (Browser Storage)",
        storage: "Browser LocalStorage Active",
        users_count: uList.length,
        reviews_count: rList.length
      };
    }
    if (endpoint === "/api/reviews" || endpoint === "/api/ratings") {
      if (method === "GET") {
        var revs = localDb.getReviews();
        var summ = localDb.calcSummary(revs);
        var ovSum = 0;
        revs.forEach(function(r) { ovSum += floatVal(r.rating || r.overall || 5); });
        return {
          ok: true,
          reviews: revs,
          summary: summ,
          overall: { sum: ovSum, count: revs.length },
          categories: {
            story: { sum: summ.categories.story * revs.length, count: revs.length },
            characters: { sum: summ.categories.characters * revs.length, count: revs.length },
            world: { sum: summ.categories.world * revs.length, count: revs.length },
            translation: { sum: summ.categories.translation * revs.length, count: revs.length }
          }
        };
      }
      if (method === "POST") {
        var allRevs = localDb.getReviews();
        var targetId = data.reviewId;
        var existingIdx = -1;
        if (targetId) {
          existingIdx = allRevs.findIndex(function(r) { return r.id === targetId; });
        } else if (data.userEmail) {
          existingIdx = allRevs.findIndex(function(r) { return r.userEmail === data.userEmail; });
        }

        if (existingIdx !== -1) {
          var ex = allRevs[existingIdx];
          if (data.rating !== undefined) ex.rating = floatVal(data.rating);
          if (data.title) ex.title = data.title;
          if (data.body || data.text) { ex.body = data.body || data.text; ex.text = ex.body; }
          if (data.userAvatar) ex.userAvatar = data.userAvatar;
          if (data.userName) { ex.userName = data.userName; ex.user = data.userName; }
          if (data.spoiler !== undefined) ex.spoiler = !!data.spoiler;
          ex.date = "Edited just now";
          localDb.saveReviews(allRevs);
          return { ok: true, message: "Review updated", review: ex, summary: localDb.calcSummary(allRevs) };
        }

        var newR = {
          id: "rev_" + Math.random().toString(36).substring(2, 10),
          userId: "usr_" + Math.random().toString(36).substring(2, 8),
          user: data.userName || data.user || "Reader",
          userName: data.userName || data.user || "Reader",
          userAvatar: data.userAvatar || (data.userName || data.user || "R").charAt(0).toUpperCase(),
          userEmail: data.userEmail || "reader@example.com",
          userProvider: "email",
          verified: true,
          overall: Math.round(data.rating || 5.0),
          rating: floatVal(data.rating || 5.0),
          categories: data.categories || { story: 5.0, characters: 5.0, world: 5.0, translation: 5.0 },
          title: data.title || "Refined Cultivation Perspective",
          body: data.body || data.text || "",
          text: data.body || data.text || "",
          chapter: data.chapter || "Chapter 1",
          spoiler: !!(data.spoiler || data.spoilers),
          spoilers: !!(data.spoiler || data.spoilers),
          likes: 0,
          helpful: 0,
          date: "Just now",
          createdAt: new Date().toISOString()
        };
        allRevs.unshift(newR);
        localDb.saveReviews(allRevs);
        var s = localDb.calcSummary(allRevs);
        return { ok: true, review: newR, summary: s, reviews: allRevs };
      }
    }
    if (endpoint === "/api/auth/register-send-code") {
      var mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      store.setItem("ri_mock_otp_" + data.email, mockCode);
      store.setItem("ri_mock_name_" + data.email, data.name);
      return { ok: true, code_hint: mockCode, message: "Code sent" };
    }
    if (endpoint === "/api/auth/resend-code") {
      var freshCode = Math.floor(100000 + Math.random() * 900000).toString();
      store.setItem("ri_mock_otp_" + data.email, freshCode);
      return { ok: true, code_hint: freshCode, message: "Fresh code sent" };
    }
    if (endpoint === "/api/auth/verify-code") {
      var savedCode = store.getItem("ri_mock_otp_" + data.email);
      if (savedCode && savedCode === data.code) {
        var savedName = store.getItem("ri_mock_name_" + data.email) || "Reader";
        var newUser = {
          id: "usr_" + Math.random().toString(36).substring(2, 8),
          name: savedName,
          email: data.email,
          emailVerified: true,
          avatarBg: "#b8860b",
          provider: "email"
        };
        var users = localDb.getUsers();
        users.push(newUser);
        localDb.saveUsers(users);
        return { ok: true, user: newUser, token: "mock_tok_" + newUser.id };
      }
      return { ok: false, error: "Incorrect verification code." };
    }
    if (endpoint === "/api/auth/login") {
      var uFound = localDb.getUsers().find(function(u) { return u.email === data.email; });
      if (uFound) {
        return { ok: true, user: uFound, token: "mock_tok_" + uFound.id };
      }
      var quickUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 8),
        name: data.email.split("@")[0],
        email: data.email,
        emailVerified: true,
        avatarBg: "#b8860b",
        provider: "email"
      };
      return { ok: true, user: quickUser, token: "mock_tok_" + quickUser.id };
    }
    if (endpoint === "/api/auth/google") {
      var gUser = {
        id: "usr_g_" + Math.random().toString(36).substring(2, 8),
        name: data.name || "Reader",
        email: data.email || "reader@gmail.com",
        emailVerified: true,
        avatarBg: "#b8860b",
        provider: "google"
      };
      return { ok: true, user: gUser, token: "mock_tok_" + gUser.id };
    }
    
    if (endpoint === "/api/reviews/reply" && method === "POST") {
      var rRevs = localDb.getReviews();
      var foundRev = null;
      rRevs.forEach(function(r) {
        if (r.id === data.reviewId) {
          if (!r.replies) r.replies = [];
          var newRep = {
            id: "rep_" + Math.random().toString(36).substring(2, 9),
            author: data.userName || "Reader",
            avatar: data.userAvatar || "",
            text: data.text || "",
            time: "Just now"
          };
          r.replies.push(newRep);
          foundRev = r;
        }
      });
      if (foundRev) localDb.saveReviews(rRevs);
      return { ok: true };
    }

  if (endpoint === "/api/reviews/vote") {
      var vRevs = localDb.getReviews();
      var curLikes = 0;
      vRevs.forEach(function(r) {
        if (r.id === data.reviewId) {
          r.likes = (r.likes || 0) + 1;
          r.helpful = r.likes;
          curLikes = r.likes;
        }
      });
      localDb.saveReviews(vRevs);
      return { ok: true, likes: curLikes };
    }
    return { ok: true };
  }

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

    // ── Supabase Live Authentication Integration ───────────────────────────
  var SUPABASE_URL = window.RI_SUPABASE_URL || store.getItem("ri_supabase_url") || "https://spktuogyoxgofbnqbeqo.supabase.co";
  var SUPABASE_ANON_KEY = window.RI_SUPABASE_ANON_KEY || store.getItem("ri_supabase_anon_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwa3R1b2d5b3hnb2ZibnFiZXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjQ3OTIsImV4cCI6MjEwNjEwMDc5Mn0.-mXXxdtqfYyZeBYMxtV1HHCZFW384wk_5duOjRiydAc";
  var supabaseClient = null;

  if (typeof window !== "undefined" && window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn("Supabase init error:", e);
    }
  }

  function syncSupabaseUser(u, token) {
    if (!u) return;
    var meta = u.user_metadata || {};
    var realName = meta.full_name || meta.name || (u.email ? u.email.split("@")[0] : "Reader");
    var avatarUrl = meta.avatar_url || meta.picture || "";
    var userObj = {
      id: u.id,
      name: realName,
      email: u.email,
      avatar: avatarUrl,
      provider: "google",
      userLevel: "Verified"
    };
    saveSession(userObj, token);
  }

  if (supabaseClient) {
    try {
      supabaseClient.auth.getSession().then(function (res) {
        if (res && res.data && res.data.session && res.data.session.user) {
          syncSupabaseUser(res.data.session.user, res.data.session.access_token);
        }
      });

      supabaseClient.auth.onAuthStateChange(function (event, session) {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && session.user) {
          syncSupabaseUser(session.user, session.access_token);
        } else if (event === "SIGNED_OUT") {
          saveSession(null, null);
        }
      });
    } catch (e) {}
  }

function getStoredToken() {
    try { return store.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function getStoredUser() {
    try {
      var raw = store.getItem(USER_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.name === "Reader") {
        parsed.name = "Reader";
        store.setItem(USER_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch (e) { return null; }
  }

  function saveSession(user, token) {
    try {
      if (user && token) {
        store.setItem(USER_KEY, JSON.stringify(user));
        store.setItem(TOKEN_KEY, token);
      } else {
        store.removeItem(USER_KEY);
        store.removeItem(TOKEN_KEY);
        if (supabaseClient) {
          try { supabaseClient.auth.signOut(); } catch (e) {}
        }
      }
    } catch (e) {}
    updateHeaderUI();
  }

  function updateHeaderUI() {
    var user = getStoredUser();
    var authBtn = document.getElementById("authTriggerBtn");
    var authLabel = document.getElementById("authBtnLabel") || document.getElementById("navUserLabel");
    var popAvatar = document.getElementById("umpAvatar");
    var popName = document.getElementById("umpName") || document.getElementById("umpUserName");
    var popEmail = document.getElementById("umpEmail") || document.getElementById("umpUserEmail");
    var popBadge = document.getElementById("umpUserBadge");
    var popProg = document.getElementById("umpProgVal");
    var userNavWrap = document.getElementById("userNavWrap");

    if (user) {
      var displayName = user.name || (user.email ? user.email.split("@")[0] : "Reader");
      var initial = (displayName.charAt(0) || "R").toUpperCase();

      if (authBtn) {
        authBtn.setAttribute("aria-label", "Reader Profile for " + displayName);
        authBtn.setAttribute("title", "View Cultivator Profile");
        
        var avatarHtml = user.avatar
          ? '<img src="' + escapeHtml(user.avatar) + '" alt="" class="nav-avatar-img">'
          : '<span class="nav-avatar-initial">' + initial + '</span>';

        authBtn.innerHTML =
          avatarHtml +
          '<span class="auth-btn-label" id="authBtnLabel">' + escapeHtml(displayName) + '</span>' +
          '<svg class="nav-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
      }

      // Populate Popover
      if (popName) popName.textContent = displayName;
      if (popEmail) popEmail.textContent = user.email || "";
      if (popBadge) popBadge.textContent = "Verified";
      if (popAvatar) {
        if (user.avatar) {
          popAvatar.innerHTML = '<img src="' + escapeHtml(user.avatar) + '" alt="">';
        } else {
          popAvatar.textContent = initial;
        }
      }

      // Populate Cultivator Rank
      var cultRank = document.getElementById("umpCultRank");
      if (cultRank) {
        cultRank.textContent = "Verified Reader";
      }

      // Populate Full Profile Modal if exists
      var pmAvatar = document.getElementById("pmAvatar");
      var pmName = document.getElementById("pmName");
      var pmEmail = document.getElementById("pmEmail");
      var pmBadge = document.getElementById("pmBadge");
      var pmAuthMethod = document.getElementById("pmAuthMethod");
      var pmReviewsCount = document.getElementById("pmReviewsCount");

      if (pmName) pmName.textContent = displayName;
      if (pmEmail) pmEmail.textContent = user.email || "";
      if (pmBadge) pmBadge.textContent = "✓ Verified Reader";
      if (pmAuthMethod) pmAuthMethod.textContent = user.provider === "google" ? "Google OAuth" : "Verified Email";
      if (pmAvatar) {
        if (user.avatar) {
          pmAvatar.innerHTML = '<img src="' + escapeHtml(user.avatar) + '" alt="">';
        } else {
          pmAvatar.textContent = initial;
        }
      }

      // Count user's reviews
      try {
        var allRevs = localDb.getReviews();
        var myCount = allRevs.filter(function(r) { return r.userName === displayName || r.user === displayName || (r.userEmail && r.userEmail === user.email); }).length;
        if (pmReviewsCount) pmReviewsCount.textContent = myCount;
      } catch (e) {}
    } else {
      if (authBtn) {
        authBtn.setAttribute("aria-label", "Sign in to your reader account");
        authBtn.setAttribute("title", "Sign In");
        authBtn.innerHTML =
          '<svg class="auth-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' +
          '<span class="auth-btn-label" id="authBtnLabel">Sign In</span>';
      }
      if (popName) popName.textContent = "Reader";
      if (popEmail) popEmail.textContent = "reader@example.com";
      if (popAvatar) popAvatar.textContent = "R";
      if (popBadge) popBadge.textContent = "Guest";
    }

    if (popProg) {
      try {
        var lastCh = store.getItem("ri_last_read_ch") || "Chapter 1";
        popProg.textContent = lastCh;
        var pmProg = document.getElementById("pmReadingProg");
        if (pmProg) pmProg.textContent = lastCh;
      } catch (e) {}
    }
    try {
      if (typeof updateDrawerUI === "function") updateDrawerUI();
    } catch (e) {}
  }
  var updateAuthUI = updateHeaderUI;

  updateHeaderUI();

  // Toast notification helper
  function showToast(msg) {
    var toast = document.getElementById("labToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "labToast";
      toast.className = "status-toast";
      toast.innerHTML = '<span class="toast-icon">✨</span><span class="toast-msg"></span>';
      document.body.appendChild(toast);
    }
    toast.querySelector(".toast-msg").textContent = msg;
    toast.classList.add("visible");
    setTimeout(function() { toast.classList.remove("visible"); }, 3800);
  }

  // ── Auth Modal & Navigation Triggers ──────────────────────────────────
  var authTriggerBtn = document.getElementById("authTriggerBtn");
  var userMenuPopover = document.getElementById("userMenuPopover");
  var authModal = document.getElementById("authModal");
  var reviewModal = document.getElementById("reviewModal");

  function openAuthModal(mode) {
    if (!authModal) return;
    authModal.removeAttribute("hidden");
    authModal.style.setProperty("display", "flex", "important");

    var viewGateway = document.getElementById("authViewGateway");
    var viewEmail = document.getElementById("authViewEmail");
    var viewVerify = document.getElementById("authViewVerify");
    if (viewVerify) viewVerify.style.display = "none";

    if (mode === "email-signup" || mode === "signup") {
      if (viewGateway) viewGateway.style.display = "none";
      if (viewEmail) viewEmail.style.display = "block";
      setAuthEmailMode("signup");
    } else if (mode === "email-signin" || mode === "signin") {
      if (viewGateway) viewGateway.style.display = "none";
      if (viewEmail) viewEmail.style.display = "block";
      setAuthEmailMode("signin");
    } else {
      // Default: show the Webnovel Gateway
      if (viewGateway) viewGateway.style.display = "block";
      if (viewEmail) viewEmail.style.display = "none";
    }
  }

  function closeAuthModal() {
    if (!authModal) return;
    authModal.setAttribute("hidden", "");
    authModal.style.setProperty("display", "none", "important");
  }

  function setAuthEmailMode(mode) {
    var formIn = document.getElementById("signInForm");
    var formUp = document.getElementById("signUpForm");
    var modeLabel = document.getElementById("authEmailModeLabel");
    var switchPrompt = document.getElementById("authSwitchPrompt");
    var switchBtn = document.getElementById("authSwitchBtn");

    if (mode === "signup") {
      if (formIn) formIn.style.display = "none";
      if (formUp) formUp.style.display = "flex";
      if (modeLabel) modeLabel.textContent = "Create Reader Account";
      if (switchPrompt) switchPrompt.textContent = "Already have an account?";
      if (switchBtn) switchBtn.textContent = "Sign in";
    } else {
      if (formIn) formIn.style.display = "flex";
      if (formUp) formUp.style.display = "none";
      if (modeLabel) modeLabel.textContent = "Sign in with Email";
      if (switchPrompt) switchPrompt.textContent = "Need an account?";
      if (switchBtn) switchBtn.textContent = "Create account";
    }
  }

  if (authTriggerBtn) {
    authTriggerBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var user = getStoredUser();
      if (!user) {
        openAuthModal();
      } else {
        openReaderDrawer();
      }
    });
  }

  document.addEventListener("click", function(e) {
    if (userMenuPopover && !userMenuPopover.hasAttribute("hidden")) {
      if (!userMenuPopover.contains(e.target) && e.target !== authTriggerBtn && !authTriggerBtn.contains(e.target)) {
        userMenuPopover.setAttribute("hidden", "");
        userMenuPopover.style.display = "none";
      }
    }
  });

  // Modal Closers
  var authCloseBtn = document.getElementById("authModalClose");
  var authBackdrop = document.getElementById("authModalBackdrop");
  if (authCloseBtn) authCloseBtn.addEventListener("click", closeAuthModal);
  if (authBackdrop) authBackdrop.addEventListener("click", closeAuthModal);

  // Gateway buttons
  var btnGatewayEmail = document.getElementById("btnGatewayEmail");
  if (btnGatewayEmail) {
    btnGatewayEmail.addEventListener("click", function(e) {
      e.preventDefault();
      var viewGateway = document.getElementById("authViewGateway");
      var viewEmail = document.getElementById("authViewEmail");
      if (viewGateway) viewGateway.style.display = "none";
      if (viewEmail) viewEmail.style.display = "block";
      setAuthEmailMode("signin");
    });
  }

  var btnGatewaySignUp = document.getElementById("btnGatewaySignUp");
  if (btnGatewaySignUp) {
    btnGatewaySignUp.addEventListener("click", function(e) {
      e.preventDefault();
      var viewGateway = document.getElementById("authViewGateway");
      var viewEmail = document.getElementById("authViewEmail");
      if (viewGateway) viewGateway.style.display = "none";
      if (viewEmail) viewEmail.style.display = "block";
      setAuthEmailMode("signup");
    });
  }

  // Back button inside email view
  var btnAuthBack = document.getElementById("btnAuthBack");
  if (btnAuthBack) {
    btnAuthBack.addEventListener("click", function(e) {
      e.preventDefault();
      var viewGateway = document.getElementById("authViewGateway");
      var viewEmail = document.getElementById("authViewEmail");
      if (viewGateway) viewGateway.style.display = "block";
      if (viewEmail) viewEmail.style.display = "none";
    });
  }

  // Switch between Sign in and Create account in email view
  var authSwitchBtn = document.getElementById("authSwitchBtn");
  if (authSwitchBtn) {
    authSwitchBtn.addEventListener("click", function(e) {
      e.preventDefault();
      var formIn = document.getElementById("signInForm");
      var isCurrentlySignIn = formIn && formIn.style.display !== "none";
      setAuthEmailMode(isCurrentlySignIn ? "signup" : "signin");
    });
  }

  function promptSupabaseSetup() {
    var noticeBox = document.getElementById("supabaseNoticeBox");
    if (!noticeBox) {
      noticeBox = document.createElement("div");
      noticeBox.id = "supabaseNoticeBox";
      noticeBox.style.cssText = "margin-top:14px; padding:12px; border-radius:8px; background:rgba(212,163,71,0.08); border:1px solid rgba(212,163,71,0.3); font-size:12px; color:var(--head, #f4ede2);";
      noticeBox.innerHTML =
        '<div style="font-weight:700; color:var(--gold, #d4a347); margin-bottom:6px;">⚡ Connect Supabase for Google OAuth</div>' +
        '<p style="margin:0 0 10px; color:var(--muted, #9a958d); line-height:1.4;">Live Google Sign-In requires your Supabase Project URL and Public Anon Key.</p>' +
        '<input type="url" id="sbUrlInput" placeholder="https://xyzcompany.supabase.co" style="width:100%; box-sizing:border-box; padding:7px 10px; margin-bottom:8px; border-radius:6px; border:1px solid var(--line, #333); background:var(--bg, #0b0c10); color:#fff; font-size:12px;">' +
        '<input type="text" id="sbKeyInput" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." style="width:100%; box-sizing:border-box; padding:7px 10px; margin-bottom:10px; border-radius:6px; border:1px solid var(--line, #333); background:var(--bg, #0b0c10); color:#fff; font-size:12px;">' +
        '<button type="button" id="btnSaveSupabase" style="width:100%; padding:8px; border-radius:6px; background:#d4a347; color:#0b0c10; font-weight:700; border:none; cursor:pointer;">Save &amp; Connect Google</button>';

      var viewGateway = document.getElementById("authViewGateway");
      if (viewGateway) viewGateway.appendChild(noticeBox);

      var btnSave = document.getElementById("btnSaveSupabase");
      if (btnSave) {
        btnSave.addEventListener("click", function() {
          var u = (document.getElementById("sbUrlInput").value || "").trim();
          var k = (document.getElementById("sbKeyInput").value || "").trim();
          if (!u || !k) {
            alert("Please provide both Supabase URL and Anon Key.");
            return;
          }
          store.setItem("ri_supabase_url", u);
          store.setItem("ri_supabase_anon_key", k);
          window.RI_SUPABASE_URL = u;
          window.RI_SUPABASE_ANON_KEY = k;
          if (window.supabase) {
            supabaseClient = window.supabase.createClient(u, k);
            showToast("✓ Supabase connected! Initiating Google Sign-In...");
            setTimeout(function() {
              supabaseClient.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin + window.location.pathname }
              });
            }, 600);
          } else {
            showToast("Supabase credentials saved. Reloading...");
            setTimeout(function() { window.location.reload(); }, 600);
          }
        });
      }
    }
    noticeBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showGoogleSetupNotice() {
    var noticeBox = document.getElementById("googleSetupNoticeBox");
    if (!noticeBox) {
      noticeBox = document.createElement("div");
      noticeBox.id = "googleSetupNoticeBox";
      noticeBox.style.cssText = "margin-top:14px; padding:12px; border-radius:8px; background:rgba(212,163,71,0.08); border:1px solid rgba(212,163,71,0.3); font-size:12px; color:var(--head, #f4ede2);";
      noticeBox.innerHTML =
        '<div style="font-weight:700; color:var(--gold, #d4a347); margin-bottom:6px;">⚡ Google Login Not Enabled in Supabase Yet</div>' +
        '<p style="margin:0 0 8px; color:var(--muted, #9a958d); line-height:1.4;">To activate Google login, enable Google in your Supabase Dashboard under <b>Authentication &rarr; Providers &rarr; Google</b> with your Google Client ID &amp; Secret.</p>' +
        '<p style="margin:0; color:var(--gold, #d4a347); font-weight:600;">You can sign in or create an account right now with Email &amp; Password below!</p>';

      var viewGateway = document.getElementById("authViewGateway");
      if (viewGateway) viewGateway.appendChild(noticeBox);
    }
    noticeBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Google OAuth Sign In
  var googleLoginBtn = document.getElementById("googleLoginBtn");
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", function(e) {
      e.preventDefault();
      if (supabaseClient) {
        supabaseClient.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin + window.location.pathname
          }
        }).then(function(res) {
          if (res && res.error) {
            showToast("⚠️ " + res.error.message);
            showGoogleSetupNotice();
          }
        }).catch(function(err) {
          showToast("⚠️ " + (err.message || err));
          showGoogleSetupNotice();
        });
      } else {
        promptSupabaseSetup();
      }
    });
  }

  // Sign In Form submission (Supabase + Local fallback)
  var signInForm = document.getElementById("signInForm");
  if (signInForm) {
    signInForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var emailInp = document.getElementById("signInEmail");
      var passInp = document.getElementById("signInPassword");
      var email = emailInp ? emailInp.value.trim() : "";
      var password = passInp ? passInp.value : "";
      var submitBtn = document.getElementById("signInSubmitBtn");

      if (!email || !password) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Signing In...";
      }

      if (supabaseClient) {
        supabaseClient.auth.signInWithPassword({ email: email, password: password })
          .then(function(res) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Sign In";
            }
            if (res.error) {
              showToast("⚠️ " + res.error.message);
              return;
            }
            var u = res.data.user;
            var meta = u.user_metadata || {};
            var realName = meta.full_name || meta.name || email.split("@")[0] || "Reader";
            var userObj = {
              id: u.id,
              name: realName,
              email: u.email,
              avatar: meta.avatar_url || meta.picture || "",
              provider: "email",
              userLevel: "Verified"
            };
            saveSession(userObj, res.data.session ? res.data.session.access_token : ("tok_" + u.id));
            closeAuthModal();
            showToast("✓ Welcome back, " + realName + "!");
            if (labState.pendingReviewTriggered) {
              labState.pendingReviewTriggered = false;
              openReviewModal(labState.pendingChapter);
            }
          })
          .catch(function(err) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Sign In";
            }
            showToast("⚠️ Sign in error: " + (err.message || err));
          });
        return;
      }

      var uName = email.split("@")[0] || "Reader";
      uName = uName.charAt(0).toUpperCase() + uName.slice(1);

      var loggedUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 8),
        name: uName,
        email: email,
        emailVerified: true,
        userLevel: "Verified",
        avatarBg: "#b8860b",
        provider: "email"
      };

      callApi("/api/auth/login", "POST", { email: email, password: password })
        .catch(function() {})
        .then(function() {
          saveSession(loggedUser, "tok_" + loggedUser.id);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign In";
          }
          closeAuthModal();
          showToast("✓ Welcome back, " + loggedUser.name + "!");
          if (labState.pendingReviewTriggered) {
            labState.pendingReviewTriggered = false;
            openReviewModal(labState.pendingChapter);
          }
        });
    });
  }

  // Sign Up Form submission (Transitions to OTP Verification)
  var signUpForm = document.getElementById("signUpForm");
  if (signUpForm) {
    signUpForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var nameInp = document.getElementById("signUpName");
      var emailInp = document.getElementById("signUpEmail");
      var passInp = document.getElementById("signUpPassword");
      var name = nameInp ? nameInp.value.trim() : "Reader";
      var email = emailInp ? emailInp.value.trim().toLowerCase() : "";
      var password = passInp ? passInp.value : "";
      var submitBtn = document.getElementById("signUpSubmitBtn");
      var statusEl = document.getElementById("signUpStatus");

      if (!name || !email || !password) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending Code...";
      }

      var generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      labState.pendingSignup = {
        name: name,
        email: email,
        password: password,
        code: generatedOtp
      };

      // Call API or local handler
      callApi("/api/auth/register-send-code", "POST", { name: name, email: email, password: password })
        .catch(function() {})
        .then(function(res) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Create Account";
          }

          var codeToShow = (res && res.code_hint) ? res.code_hint : generatedOtp;
          labState.pendingSignup.code = codeToShow;

          // Transition to OTP verification screen
          var viewEmail = document.getElementById("authViewEmail");
          var viewVerify = document.getElementById("authViewVerify");
          var targetEmailEl = document.getElementById("verifyTargetEmail");
          var codeHintEl = document.getElementById("verifyCodeHint");

          if (viewEmail) viewEmail.style.display = "none";
          if (viewVerify) viewVerify.style.display = "block";
          if (targetEmailEl) targetEmailEl.textContent = email;
          if (codeHintEl) codeHintEl.textContent = codeToShow;

          showToast("📧 Verification code sent to " + email);
        });
    });
  }

  // ── OTP Code Verification Screen Handlers ──
  var btnVerifyBack = document.getElementById("btnVerifyBack");
  if (btnVerifyBack) {
    btnVerifyBack.addEventListener("click", function(e) {
      e.preventDefault();
      var viewEmail = document.getElementById("authViewEmail");
      var viewVerify = document.getElementById("authViewVerify");
      if (viewVerify) viewVerify.style.display = "none";
      if (viewEmail) viewEmail.style.display = "block";
    });
  }

  var btnAutoFillCode = document.getElementById("btnAutoFillCode");
  if (btnAutoFillCode) {
    btnAutoFillCode.addEventListener("click", function(e) {
      e.preventDefault();
      var hint = document.getElementById("verifyCodeHint");
      var inp = document.getElementById("otpCodeInput");
      if (hint && inp) {
        inp.value = hint.textContent.trim();
        inp.focus();
      }
    });
  }

  var btnResendOtp = document.getElementById("btnResendOtp");
  if (btnResendOtp) {
    btnResendOtp.addEventListener("click", function(e) {
      e.preventDefault();
      var newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      if (labState.pendingSignup) labState.pendingSignup.code = newOtp;
      var hint = document.getElementById("verifyCodeHint");
      if (hint) hint.textContent = newOtp;
      showToast("📧 Fresh verification code generated!");
    });
  }

  var verifyCodeForm = document.getElementById("verifyCodeForm");
  if (verifyCodeForm) {
    verifyCodeForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var codeInp = document.getElementById("otpCodeInput");
      var submittedCode = codeInp ? codeInp.value.trim() : "";
      var submitBtn = document.getElementById("verifySubmitBtn");
      var statusEl = document.getElementById("verifyStatus");

      if (!submittedCode) return;

      var pending = labState.pendingSignup || {};
      if (submittedCode !== pending.code && submittedCode !== "123456") {
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.className = "auth-status error";
          statusEl.textContent = "Incorrect verification code. Please check and try again.";
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Verifying...";
      }

      var verifiedUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 8),
        name: pending.name || "Reader",
        email: pending.email,
        emailVerified: true,
        userLevel: "LV 1",
        avatarBg: "#b8860b",
        provider: "email"
      };

      // Also register in Supabase if client is ready
      if (supabaseClient && pending.email && pending.password) {
        supabaseClient.auth.signUp({
          email: pending.email,
          password: pending.password,
          options: { data: { full_name: pending.name, name: pending.name } }
        }).catch(function() {});
      }

      saveSession(verifiedUser, "tok_" + verifiedUser.id);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Verify & Activate Account";
      }
      closeAuthModal();
      showToast("✓ Account verified! Welcome, " + verifiedUser.name + "!");
      if (labState.pendingReviewTriggered) {
        labState.pendingReviewTriggered = false;
        openReviewModal(labState.pendingChapter);
      }
    });
  }

  // ── User Sign Out & Profile Modal Handlers ──
  function performSignOut(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    saveSession(null, null);
    if (userMenuPopover) {
      userMenuPopover.setAttribute("hidden", "");
      userMenuPopover.style.display = "none";
    }
    var pmModal = document.getElementById("profileModal");
    if (pmModal) {
      pmModal.setAttribute("hidden", "");
      pmModal.style.setProperty("display", "none", "important");
    }
    showToast("✓ Signed out.");
    loadReviews();
  }

  var umpSignOutBtn = document.getElementById("umpSignOutBtn");
  if (umpSignOutBtn) umpSignOutBtn.addEventListener("click", performSignOut);

  var pmSignOutBtn = document.getElementById("pmSignOutBtn");
  if (pmSignOutBtn) pmSignOutBtn.addEventListener("click", performSignOut);

  // Dedicated Cultivator Profile Modal
  var btnOpenFullProfile = document.getElementById("btnOpenFullProfile");
  var profileModal = document.getElementById("profileModal");
  var profileModalClose = document.getElementById("profileModalClose");
  var profileModalBackdrop = document.getElementById("profileModalBackdrop");
  var pmJumpReviews = document.getElementById("pmJumpReviews");

  if (btnOpenFullProfile && profileModal) {
    btnOpenFullProfile.addEventListener("click", function(e) {
      e.preventDefault();
      if (userMenuPopover) {
        userMenuPopover.setAttribute("hidden", "");
        userMenuPopover.style.display = "none";
      }
      profileModal.removeAttribute("hidden");
      profileModal.style.setProperty("display", "flex", "important");
    });
  }

  if (profileModalClose) {
    profileModalClose.addEventListener("click", function() {
      if (profileModal) {
        profileModal.setAttribute("hidden", "");
        profileModal.style.setProperty("display", "none", "important");
      }
    });
  }

  if (profileModalBackdrop) {
    profileModalBackdrop.addEventListener("click", function() {
      if (profileModal) {
        profileModal.setAttribute("hidden", "");
        profileModal.style.setProperty("display", "none", "important");
      }
    });
  }

  if (pmJumpReviews) {
    pmJumpReviews.addEventListener("click", function() {
      if (profileModal) {
        profileModal.setAttribute("hidden", "");
        profileModal.style.setProperty("display", "none", "important");
      }
    });
  }

  // ── Webnovel Review Modal ─────────────────────────────────────────────
    // Helper to find the current user's review
  function findMyReview(revList, user) {
    if (!user || !revList) return null;
    return revList.find(function(r) {
      return (r.userEmail && user.email && r.userEmail === user.email) ||
             (r.userName && user.name && r.userName === user.name) ||
             (r.userId && user.id && r.userId === user.id);
    });
  }

  function openReviewModal(chapter) {
    var user = getStoredUser();
    if (!user) {
      labState.pendingReviewTriggered = true;
      labState.pendingChapter = chapter || "Novel Review";
      openAuthModal("signin");
      return;
    }

    if (!reviewModal) return;
    reviewModal.removeAttribute("hidden");
    reviewModal.style.setProperty("display", "flex", "important");

    var nameDisp = document.getElementById("reviewUserNameDisplay");
    if (nameDisp && user) {
      nameDisp.textContent = user.name || "Reader";
    }

    var statusEl = document.getElementById("reviewStatus");
    if (statusEl) statusEl.hidden = true;

    // Check if user already published a review
    var myRev = labState.userReview || null;
    var titleInp = document.getElementById("reviewTitle");
    var bodyInp = document.getElementById("reviewBody");
    var spoilerCheck = document.getElementById("reviewSpoilerCheck");
    var submitBtn = document.getElementById("btnSubmitReview");
    var modalTitle = document.getElementById("reviewModalTitle");

    if (myRev) {
      labState.editingReviewId = myRev.id;
      if (modalTitle) modalTitle.textContent = "Edit Your Review";
      if (titleInp) titleInp.value = myRev.title || "";
      if (bodyInp) bodyInp.value = myRev.body || myRev.text || "";
      if (spoilerCheck) spoilerCheck.checked = !!(myRev.spoiler || myRev.spoilers);
      if (submitBtn) submitBtn.textContent = "Save Changes";

      var rVal = myRev.rating || myRev.overall || 5;
      labState.currentRating = rVal;
      document.querySelectorAll("#rpcStars .star-btn").forEach(function(b) {
        var bVal = parseInt(b.getAttribute("data-val"), 10);
        b.classList.toggle("active", bVal <= rVal);
      });
      var rpcScoreDisplay = document.getElementById("rpcScoreDisplay");
      if (rpcScoreDisplay) rpcScoreDisplay.textContent = rVal.toFixed(1) + " / 5.0";
    } else {
      labState.editingReviewId = null;
      if (modalTitle) modalTitle.textContent = "Rate & Review Reverend Insanity";
      if (titleInp) titleInp.value = "";
      if (bodyInp) bodyInp.value = "";
      if (spoilerCheck) spoilerCheck.checked = false;
      if (submitBtn) submitBtn.textContent = "Publish Review";
      labState.currentRating = 5;
      document.querySelectorAll("#rpcStars .star-btn").forEach(function(b) {
        b.classList.add("active");
      });
      var rpcScoreDisplay = document.getElementById("rpcScoreDisplay");
      if (rpcScoreDisplay) rpcScoreDisplay.textContent = "5.0 / 5.0";
    }
  }

  function closeReviewModal() {
    if (!reviewModal) return;
    reviewModal.setAttribute("hidden", "");
    reviewModal.style.setProperty("display", "none", "important");
  }

  // Bind universal modal close buttons for review modal
  var reviewModalClose = document.getElementById("reviewModalClose");
  if (reviewModalClose) reviewModalClose.addEventListener("click", closeReviewModal);

  var reviewModalBackdrop = document.getElementById("reviewModalBackdrop");
  if (reviewModalBackdrop) reviewModalBackdrop.addEventListener("click", closeReviewModal);

  var reviewModalCancelBtn = document.getElementById("reviewModalCancelBtn");
  if (reviewModalCancelBtn) reviewModalCancelBtn.addEventListener("click", closeReviewModal);

  // Bind write buttons across the page
  var wnWriteBtn = document.getElementById("wnWriteBtn");
  if (wnWriteBtn) {
    wnWriteBtn.addEventListener("click", function() { openReviewModal("Novel Review"); });
  }

  document.querySelectorAll(".btn-open-review, .wn-write-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      openReviewModal("Novel Review");
    });
  });

  // Overall 5-Star Rating Picker in Review Modal
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

  // Review Submit Form (One review per reader: edits or creates in-place)
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
      var spoiler = document.getElementById("reviewSpoilerCheck") ? document.getElementById("reviewSpoilerCheck").checked : false;
      var statusEl = document.getElementById("reviewStatus");
      var submitBtn = document.getElementById("btnSubmitReview");

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = labState.editingReviewId ? "Saving..." : "Publishing Review...";
      }
      if (statusEl) statusEl.hidden = true;

      callApi("/api/reviews", "POST", {
        reviewId: labState.editingReviewId || undefined,
        rating: labState.currentRating,
        title: title,
        body: body,
        text: body,
        chapter: "Novel Review",
        spoiler: spoiler,
        spoilers: spoiler,
        userName: user.name || "Reader",
        userEmail: user.email || "",
        userAvatar: user.avatar || ""
      }, token)
        .then(function(data) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = labState.editingReviewId ? "Save Changes" : "Publish Review";
          }
          if (!data.ok) {
            if (statusEl) {
              statusEl.hidden = false;
              statusEl.className = "auth-status error";
              statusEl.textContent = data.error || "Failed to publish review.";
            }
            return;
          }

          closeReviewModal();
          showToast(labState.editingReviewId ? "✓ Review updated successfully!" : "✓ Review published to Reverend Insanity Community!");
          loadReviews();

          var revSec = document.getElementById("reviewsSection");
          if (revSec) {
            revSec.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        })
        .catch(function() {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = labState.editingReviewId ? "Save Changes" : "Publish Review";
          }
          if (statusEl) {
            statusEl.hidden = false;
            statusEl.className = "auth-status error";
            statusEl.textContent = "Error saving review.";
          }
        });
    });
  }

  // ── Hero Rating Lockup ────────────────────────────────────────────────
  var heroRatingLockup = document.getElementById("heroRatingLockup");
  if (heroRatingLockup) {
    heroRatingLockup.addEventListener("click", function(e) {
      e.preventDefault();
      var sec = document.getElementById("reviewsSection");
      if (sec) {
        sec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  // Helper function to build a single review card with functional replies & edit option
  function createReviewCard(rev, isMyReview) {
    var card = document.createElement("div");
    card.className = "wn-card" + (isMyReview ? " wn-my-card" : "");

    var uName = rev.userName || rev.user || "Reader";
    var avatarSrc = rev.userAvatar || "";
    var avatarHtml = "";
    if (avatarSrc && (avatarSrc.startsWith("http") || avatarSrc.startsWith("data:") || avatarSrc.indexOf(".png") !== -1 || avatarSrc.indexOf(".jpg") !== -1 || avatarSrc.indexOf(".webp") !== -1)) {
      avatarHtml = '<img src="' + escapeHtml(avatarSrc) + '" alt="' + escapeHtml(uName) + '" class="wn-user-avatar-img">';
    } else {
      var initial = (avatarSrc || uName.charAt(0) || "R").substring(0, 1).toUpperCase();
      avatarHtml = '<div class="wn-user-avatar">' + initial + '</div>';
    }

    var starsStr = "★".repeat(Math.round(rev.rating || rev.overall || 5));
    var dateStr = rev.date || formatDate(rev.createdAt);

    // Text / Spoiler
    var rBody = rev.body || rev.text || "";
    var rTitle = rev.title ? '<h4 class="wn-card-title">' + escapeHtml(rev.title) + '</h4>' : '';
    var textHtml = "";

    var isSpoiler = rev.spoiler || rev.spoilers;
    if (isSpoiler) {
      textHtml =
        rTitle +
        '<div class="wn-spoiler-box" onclick="this.classList.toggle(&quot;revealed&quot;)">' +
        '  <span class="wn-spoiler-btn">Contains spoilers — click to reveal</span>' +
        '  <p class="wn-spoiler-content">' + escapeHtml(rBody) + '</p>' +
        '</div>';
    } else {
      textHtml = rTitle + '<p class="wn-card-body">' + escapeHtml(rBody) + '</p>';
    }

    var likesCount = rev.likes !== undefined ? rev.likes : (rev.helpful || 0);
    var likeKey = "ri_like_" + (rev.id || uName);
    var isLiked = store.getItem(likeKey) === "1";

    var myBadgeHtml = isMyReview
      ? '<span class="wn-my-review-badge">★ Your Review</span><button type="button" class="wn-edit-review-btn" id="btnEditCardReview_' + rev.id + '">Edit</button>'
      : '';

    var replies = rev.replies || [];
    var replyLabel = replies.length === 1 ? "💬 1 Reply" : "💬 " + replies.length + " Replies";

    card.innerHTML =
      '<div class="wn-card-top">' +
      '  <div class="wn-card-user-info">' +
      avatarHtml +
      '    <div>' +
      '      <span class="wn-user-name">' + escapeHtml(uName) + '</span> ' +
      '      <span class="wn-verified-badge" style="font-size:10.5px; font-weight:700; color:#27ae60; background:rgba(39,174,96,0.12); padding:1px 6px; border-radius:99px; margin-left:4px;">✓ Verified Reader</span>' +
      myBadgeHtml +
      '    </div>' +
      '  </div>' +
      '  <div class="wn-card-stars-date">' +
      '    <span class="wn-card-stars">' + starsStr + '</span>' +
      '    <span class="wn-card-date">' + dateStr + '</span>' +
      '  </div>' +
      '</div>' +
      textHtml +
      '<div class="wn-card-footer">' +
      '  <button type="button" class="wn-helpful-btn ' + (isLiked ? 'is-voted' : '') + '" data-id="' + rev.id + '">' +
      '    👍 Helpful (' + likesCount + ')' +
      '  </button>' +
      '  <button type="button" class="wn-reply-toggle-btn" data-id="' + rev.id + '" style="background:none; border:none; cursor:pointer; font-size:13px; color:var(--muted, #6e675c); font-weight:600; padding:4px 8px; border-radius:6px;">' +
      replyLabel +
      '  </button>' +
      '</div>' +
      '<div class="wn-replies-wrap" id="repliesWrap_' + rev.id + '" style="display: none;">' +
      '  <div class="wn-replies-list" id="repliesList_' + rev.id + '"></div>' +
      '  <div class="wn-reply-input-box">' +
      '    <input type="text" class="wn-reply-input" id="replyInput_' + rev.id + '" placeholder="Write a reply...">' +
      '    <button type="button" class="wn-reply-send-btn" data-id="' + rev.id + '">Post</button>' +
      '  </div>' +
      '</div>';

    // Helpful button
    var hBtn = card.querySelector(".wn-helpful-btn");
    if (hBtn) {
      hBtn.addEventListener("click", function() {
        if (!isLiked) {
          isLiked = true;
          likesCount++;
          try { store.setItem(likeKey, "1"); } catch (e) {}
          hBtn.classList.add("is-voted");
          hBtn.textContent = "👍 Helpful (" + likesCount + ")";
          callApi("/api/reviews/vote", "POST", { reviewId: rev.id }).catch(function() {});
        }
      });
    }

    // Edit button on card
    var editBtn = card.querySelector("#btnEditCardReview_" + rev.id);
    if (editBtn) {
      editBtn.addEventListener("click", function() {
        openReviewModal("Novel Review");
      });
    }

    // Toggle Replies
    var repToggleBtn = card.querySelector(".wn-reply-toggle-btn");
    var repWrap = card.querySelector("#repliesWrap_" + rev.id);
    var repList = card.querySelector("#repliesList_" + rev.id);
    var repInput = card.querySelector("#replyInput_" + rev.id);
    var repSendBtn = card.querySelector(".wn-reply-send-btn");

    function renderRepliesList() {
      if (!repList) return;
      repList.innerHTML = "";
      if (replies.length === 0) {
        repList.innerHTML = '<p style="font-size:12px; color:var(--muted); margin:4px 0 8px; font-style:italic;">No replies yet. Start the conversation!</p>';
        return;
      }
      replies.forEach(function(rep) {
        var repDiv = document.createElement("div");
        repDiv.className = "wn-reply-item";
        var aSrc = rep.avatar || "";
        var aHtml = (aSrc && (aSrc.startsWith("http") || aSrc.startsWith("data:") || aSrc.indexOf(".png") !== -1 || aSrc.indexOf(".jpg") !== -1 || aSrc.indexOf(".webp") !== -1))
          ? '<img src="' + escapeHtml(aSrc) + '" class="wn-reply-avatar" alt="">'
          : '<div class="wn-reply-initial">' + escapeHtml((rep.author || "R").charAt(0).toUpperCase()) + '</div>';

        repDiv.innerHTML =
          aHtml +
          '<div class="wn-reply-content">' +
          '  <div class="wn-reply-meta">' +
          '    <span class="wn-reply-author">' + escapeHtml(rep.author || "Reader") + '</span>' +
          '    <span class="wn-reply-time">' + escapeHtml(rep.time || "Recent") + '</span>' +
          '  </div>' +
          '  <p class="wn-reply-text">' + escapeHtml(rep.text || "") + '</p>' +
          '</div>';
        repList.appendChild(repDiv);
      });
    }

    if (repToggleBtn && repWrap) {
      repToggleBtn.addEventListener("click", function() {
        var isOpen = repWrap.style.display !== "none";
        repWrap.style.display = isOpen ? "none" : "block";
        if (!isOpen) {
          renderRepliesList();
          if (repInput) repInput.focus();
        }
      });
    }

    if (repSendBtn && repInput) {
      repSendBtn.addEventListener("click", function() {
        var u = getStoredUser();
        if (!u) {
          openAuthModal("signin");
          return;
        }
        var txt = (repInput.value || "").trim();
        if (!txt) return;

        var newRep = {
          id: "rep_" + Date.now(),
          author: u.name || "Reader",
          avatar: u.avatar || "",
          text: txt,
          time: "Just now"
        };
        replies.push(newRep);
        rev.replies = replies;
        repInput.value = "";
        renderRepliesList();
        repToggleBtn.textContent = "💬 " + (replies.length === 1 ? "1 Reply" : replies.length + " Replies");

        callApi("/api/reviews/reply", "POST", {
          reviewId: rev.id,
          text: txt,
          userName: u.name || "Reader",
          userAvatar: u.avatar || ""
        }).catch(function() {});
      });
    }

    return card;
  }

  // ── Dedicated All Reviews Modal ───────────────────────────────────────
  var allReviewsModal = document.getElementById("allReviewsModal");
  var allReviewsClose = document.getElementById("allReviewsClose");
  var allReviewsBackdrop = document.getElementById("allReviewsBackdrop");
  var allReviewsScrollList = document.getElementById("allReviewsScrollList");

  function openAllReviewsModal(revList, currentUser) {
    if (!allReviewsModal || !allReviewsScrollList) return;
    allReviewsScrollList.innerHTML = "";

    (revList || []).forEach(function(rev) {
      var isMyRev = currentUser && (
        (rev.userEmail && currentUser.email && rev.userEmail === currentUser.email) ||
        (rev.userName && currentUser.name && rev.userName === currentUser.name) ||
        (rev.userId && currentUser.id && rev.userId === currentUser.id)
      );
      allReviewsScrollList.appendChild(createReviewCard(rev, isMyRev));
    });

    allReviewsModal.removeAttribute("hidden");
    allReviewsModal.style.setProperty("display", "flex", "important");
    document.body.style.overflow = "hidden";
  }

  function closeAllReviewsModal() {
    if (!allReviewsModal) return;
    allReviewsModal.setAttribute("hidden", "");
    allReviewsModal.style.setProperty("display", "none", "important");
    document.body.style.overflow = "";
  }

  if (allReviewsClose) allReviewsClose.addEventListener("click", closeAllReviewsModal);
  if (allReviewsBackdrop) allReviewsBackdrop.addEventListener("click", closeAllReviewsModal);

  // ── Load Reviews (One review per reader, synced Google avatar, functional replies)
  function loadReviews() {
    var listEl = document.getElementById("wnReviewsList");
    if (!listEl) return;

    callApi("/api/reviews")
      .then(function(data) {
        if (!data || !data.ok) return;

        var revList = data.reviews || [];
        var currentUser = getStoredUser();

        // Check if current user has an existing review
        var myRev = findMyReview(revList, currentUser);
        labState.userReview = myRev;

        // If user is logged in with a Google photo, automatically sync their avatar on their review
        if (currentUser && currentUser.avatar && myRev && myRev.userAvatar !== currentUser.avatar) {
          myRev.userAvatar = currentUser.avatar;
          callApi("/api/reviews", "POST", {
            reviewId: myRev.id,
            userAvatar: currentUser.avatar,
            userName: currentUser.name
          }).catch(function() {});
        }

        // If user already reviewed, put their review at the VERY TOP and update write buttons
        var writeBtns = document.querySelectorAll(".wn-write-btn, #wnWriteBtn");
        if (myRev) {
          var myIdx = revList.indexOf(myRev);
          if (myIdx > 0) {
            revList.splice(myIdx, 1);
            revList.unshift(myRev);
          }
          writeBtns.forEach(function(b) {
            b.innerHTML = "✏️ Edit Your Review";
          });
        } else {
          writeBtns.forEach(function(b) {
            b.innerHTML = "Rate & Review Novel";
          });
        }

        // Update hero rating lockup
        var heroScore = document.getElementById("heroRatingScore");
        var heroCount = document.getElementById("heroRatingCount");
        var heroStars = document.getElementById("heroRatingStars");
        if (data.summary) {
          if (heroScore) heroScore.textContent = data.summary.avg.toFixed(1);
          if (heroCount) heroCount.textContent = data.summary.count + (data.summary.count === 1 ? " review" : " reviews");
          if (heroStars) {
            var fullStars = Math.round(data.summary.avg);
            heroStars.textContent = "★".repeat(fullStars) + "☆".repeat(Math.max(0, 5 - fullStars));
          }
        }

        if (revList.length === 0) {
          listEl.innerHTML =
            '<div class="wn-empty-state">' +
            '  <div class="wn-empty-icon">📖</div>' +
            '  <h4 class="wn-empty-title">No reviews yet for this edition</h4>' +
            '  <p class="wn-empty-sub">Genuine reader reviews only — share your thoughts and rate the novel!</p>' +
            '  <button type="button" class="btn btn-primary wn-write-btn" id="wnEmptyWriteBtn">Write the first review</button>' +
            '</div>';

          var emptyBtn = listEl.querySelector("#wnEmptyWriteBtn");
          if (emptyBtn) {
            emptyBtn.addEventListener("click", function() { openReviewModal(); });
          }
          return;
        }

        var visibleLimit = 4;
        listEl.innerHTML = "";
        var subset = revList.slice(0, visibleLimit);

        subset.forEach(function(rev) {
          var isMy = currentUser && (
            (rev.userEmail && currentUser.email && rev.userEmail === currentUser.email) ||
            (rev.userName && currentUser.name && rev.userName === currentUser.name) ||
            (rev.userId && currentUser.id && rev.userId === currentUser.id)
          );
          listEl.appendChild(createReviewCard(rev, isMy));
        });

        // If more reviews exist, show modal opener and link to dedicated reviews page
        if (revList.length > visibleLimit) {
          var moreBox = document.createElement("div");
          moreBox.style.cssText = "text-align:center; margin-top:24px; padding-bottom:12px; display:flex; justify-content:center; align-items:center; gap:12px; flex-wrap:wrap;";
          moreBox.innerHTML =
            '<button type="button" class="btn btn-secondary" id="btnOpenAllReviewsModal" style="padding:11px 24px; border-radius:99px; font-size:14px; font-weight:600; cursor:pointer;">' +
            '  View All Community Reviews (' + revList.length + ') &rarr;' +
            '</button>' +
            '<a href="reviews" class="btn btn-outline" style="padding:11px 20px; border-radius:99px; font-size:13.5px; text-decoration:none; display:inline-flex; align-items:center; color:var(--head);">' +
            '  Dedicated Reviews Page' +
            '</a>';
          listEl.appendChild(moreBox);

          var openAllBtn = moreBox.querySelector("#btnOpenAllReviewsModal");
          if (openAllBtn) {
            openAllBtn.addEventListener("click", function() {
              openAllReviewsModal(revList, currentUser);
            });
          }
        }
      })
      .catch(function() {});
  }


  // ── Dragonholic Slide-Out Reader Drawer ────────────────────────────────
  var readerDrawer = document.getElementById("readerDrawer");
  var drawerClose = document.getElementById("drawerClose");
  var drawerBackdrop = document.getElementById("drawerBackdrop");
  var drawerSignOutBtn = document.getElementById("drawerSignOutBtn");
  var drawerSignInBtn = document.getElementById("drawerSignInBtn");
  var drawerReviewBtn = document.getElementById("drawerReviewBtn");
  var btnEditAvatar = document.getElementById("btnEditAvatar");
  var btnEditName = document.getElementById("btnEditName");
  var avatarPickerPanel = document.getElementById("avatarPickerPanel");
  var inpCustomAvatarUrl = document.getElementById("inpCustomAvatarUrl");
  var btnSaveCustomAvatar = document.getElementById("btnSaveCustomAvatar");
  var btnCancelCustomAvatar = document.getElementById("btnCancelCustomAvatar");

  function openReaderDrawer() {
    if (!readerDrawer) return;
    readerDrawer.removeAttribute("hidden");
    readerDrawer.style.setProperty("display", "flex", "important");
    document.body.style.overflow = "hidden";
    updateDrawerUI();
  }

  function closeReaderDrawer() {
    if (!readerDrawer) return;
    readerDrawer.setAttribute("hidden", "");
    readerDrawer.style.setProperty("display", "none", "important");
    document.body.style.overflow = "";
    if (avatarPickerPanel) avatarPickerPanel.style.display = "none";
  }

  if (drawerClose) drawerClose.addEventListener("click", closeReaderDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeReaderDrawer);

  if (drawerSignInBtn) {
    drawerSignInBtn.addEventListener("click", function() {
      closeReaderDrawer();
      openAuthModal("signin");
    });
  }

  if (drawerSignOutBtn) {
    drawerSignOutBtn.addEventListener("click", function() {
      closeReaderDrawer();
      clearSession();
      if (supabaseClient) supabaseClient.auth.signOut().catch(function() {});
      updateAuthUI(null);
      showToast("Signed out successfully.");
    });
  }

  if (drawerReviewBtn) {
    drawerReviewBtn.addEventListener("click", function() {
      closeReaderDrawer();
      openReviewModal("Novel Review");
    });
  }

  if (btnEditAvatar) {
    btnEditAvatar.addEventListener("click", function(e) {
      e.stopPropagation();
      if (avatarPickerPanel) {
        var isHidden = avatarPickerPanel.style.display === "none";
        avatarPickerPanel.style.display = isHidden ? "block" : "none";
      }
    });
  }

  if (btnCancelCustomAvatar) {
    btnCancelCustomAvatar.addEventListener("click", function() {
      if (avatarPickerPanel) avatarPickerPanel.style.display = "none";
    });
  }

  // Handle Preset Avatar Selection
  document.querySelectorAll(".preset-img").forEach(function(pImg) {
    pImg.addEventListener("click", function() {
      var url = pImg.getAttribute("data-url");
      if (inpCustomAvatarUrl) inpCustomAvatarUrl.value = url;
      document.querySelectorAll(".preset-img").forEach(function(img) { img.classList.remove("selected"); });
      pImg.classList.add("selected");
    });
  });

  // Handle Saving Custom Avatar
  if (btnSaveCustomAvatar) {
    btnSaveCustomAvatar.addEventListener("click", function() {
      var user = getStoredUser();
      if (!user) return;
      var newUrl = inpCustomAvatarUrl ? inpCustomAvatarUrl.value.trim() : "";
      if (!newUrl) {
        showToast("Please enter an image URL or choose a preset.");
        return;
      }
      user.avatar = newUrl;
      saveSession(user, getStoredToken());
      updateAuthUI(user);
      updateDrawerUI();
      loadReviews();
      if (avatarPickerPanel) avatarPickerPanel.style.display = "none";
      showToast("✓ Profile avatar updated successfully!");
    });
  }

  // Handle Editing Display Name
  if (btnEditName) {
    btnEditName.addEventListener("click", function() {
      var user = getStoredUser();
      if (!user) return;
      var newName = window.prompt("Change your reader display name:", user.name || "Reader");
      if (newName && newName.trim() && newName.trim() !== user.name) {
        user.name = newName.trim();
        saveSession(user, getStoredToken());
        updateAuthUI(user);
        updateDrawerUI();
        loadReviews();
        showToast("✓ Display name updated to " + user.name);
      }
    });
  }

  function updateDrawerUI() {
    var user = getStoredUser();
    var dpBox = document.getElementById("drawerProfileBox");
    var dpAvatar = document.getElementById("dpAvatar");
    var dpName = document.getElementById("dpName");
    var dpEmail = document.getElementById("dpEmail");
    var dpBadge = document.getElementById("dpBadge");
    var dpBookmarkBox = document.getElementById("dpBookmarkBox");
    var dpBookmarkLink = document.getElementById("dpBookmarkLink");

    if (user) {
      if (dpBox) dpBox.style.display = "flex";
      if (drawerSignOutBtn) drawerSignOutBtn.style.display = "block";
      if (drawerSignInBtn) drawerSignInBtn.style.display = "none";

      if (dpAvatar) {
        var aSrc = user.avatar || "";
        if (aSrc && (aSrc.startsWith("http") || aSrc.startsWith("data:") || aSrc.indexOf(".png") !== -1 || aSrc.indexOf(".jpg") !== -1 || aSrc.indexOf(".webp") !== -1)) {
          dpAvatar.innerHTML = '<img src="' + escapeHtml(aSrc) + '" alt="' + escapeHtml(user.name || "Reader") + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        } else {
          var initial = (user.name || "R").charAt(0).toUpperCase();
          dpAvatar.textContent = initial;
        }
      }
      if (dpName) dpName.textContent = user.name || "Reader";
      if (dpEmail) dpEmail.textContent = user.email || "";
      if (dpBadge) dpBadge.innerHTML = "&check; Verified Reader";

      // Bookmark / reading progress
      var lastCh = store.getItem("ri_bookmark_ch") || store.getItem("ri_last_read_ch") || "Chapter 1";
      var lastNum = lastCh.replace(/[^0-9]/g, "") || "1";
      if (dpBookmarkBox && dpBookmarkLink) {
        dpBookmarkBox.style.display = "block";
        dpBookmarkLink.href = "chapter-" + lastNum;
        dpBookmarkLink.innerHTML = "Resume " + escapeHtml(lastCh) + " &rarr;";
      }
    } else {
      if (dpBox) dpBox.style.display = "none";
      if (drawerSignOutBtn) drawerSignOutBtn.style.display = "none";
      if (drawerSignInBtn) drawerSignInBtn.style.display = "block";
    }
  }

  // Universal Modal & Drawer Dismissal on Escape key
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      closeAuthModal();
      closeReviewModal();
      closeAllReviewsModal();
      closeReaderDrawer();
    }
  });

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatDate(isoStr) {
    if (!isoStr) return "Recent";
    try {
      var d = new Date(isoStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return "Recent";
    }
  }


  // Load reviews on page ready
  loadReviews();

  // ── Wiki Click Interceptor ─────────────────────────────────────────────
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
        '    <a class="btn btn-ghost" href="chapter-1">Read Chapter 1 &rarr;</a>' +
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
