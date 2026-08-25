(function () {
  "use strict";

  /* 默认站点内容：请求 content/site.json 失败时兜底（例如直接双击打开页面） */
  var DEFAULT_SITE = {
    heroImage: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/home/hero.jpg?v=1785977859",
    heroTitle: "肘子鱼",
    heroSubtitle: "用镜头收藏世界的每个瞬间",
    aboutPhilosophy:
      "我相信摄影不是记录，而是选择——选择光线、角度与瞬间，把喧闹的世界裁成一张安静的画。",
    aboutExperience:
      "资深摄影爱好者，足迹遍布东京、北海道、泰国等地；长期从事商业摄影与影像创作。",
    aboutImage: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/commercial/photo/02.jpg?v=1785977896",
    contactEmail: "litera0429@gmail.com",
    footerXhs: "待补充",
    home: {
      scroll01: [],
      hero07: {}
    }
  };

  /* ---------- 日/夜主题：默认 06:00–17:00 浅色，其余深色；SWITCH 可手动切换并记住偏好 ---------- */
  function currentTheme() {
    var pref = null;
    try { pref = localStorage.getItem("zzTheme"); } catch (e) {}
    if (pref === "light" || pref === "dark") return pref;
    var h = new Date().getHours();
    return h >= 6 && h < 17 ? "light" : "dark";
  }
  function syncTheme() {
    document.documentElement.setAttribute("data-theme", currentTheme());
  }
  syncTheme();
  window.setInterval(syncTheme, 60 * 1000);

  /* ---------- 共享：作品默认数据 / 工具（请求 content/works.json 失败时兜底） ---------- */
  var DEFAULT_WORKS = [
    { title: "涩谷的夜", group: "adventure", category: "东京", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/tokyo/01.jpg?v=1785977863", images: ["https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/tokyo/01.jpg?v=1785977863", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/tokyo/02.jpg?v=1785977869", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/tokyo/03.jpg?v=1785996931"], description: "霓虹与人群交织的十字路口。" },
    { title: "浅草清晨", group: "adventure", category: "东京", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/tokyo/02.jpg?v=1785977869", images: ["https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/tokyo/04.jpg?v=1785996937", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/tokyo/05.jpg?v=1785996941", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/tokyo/06.jpg?v=1785996947"], description: "晨光里安静下来的老街。" },
    { title: "雪国列车", group: "adventure", category: "北海道", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/hokkaido/01.jpg?v=1785977873", images: ["https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/hokkaido/01.jpg?v=1785977873", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/hokkaido/02.jpg?v=1785977877", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/hokkaido/03.jpg?v=1785996951"], description: "窗外是一望无际的白色旷野。" },
    { title: "小樽运河", group: "adventure", category: "北海道", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/hokkaido/02.jpg?v=1785977877", images: ["https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/hokkaido/04.jpg?v=1785996957", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/hokkaido/05.jpg?v=1785996961", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/hokkaido/06.jpg?v=1785996968"], description: "入夜后的运河与灯火。" },
    { title: "清迈的午后", group: "adventure", category: "泰国", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/thailand/01.jpg?v=1785977883", images: ["https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/thailand/01.jpg?v=1785977883", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/thailand/02.jpg?v=1785977887", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/thailand/03.jpg?v=1785996972"], description: "热带阳光下缓慢流动的时间。" },
    { title: "曼谷天际线", group: "adventure", category: "泰国", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/thailand/02.jpg?v=1785977887", images: ["https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/thailand/04.jpg?v=1785996978", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/thailand/05.jpg?v=1785996982", "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/adventure/thailand/06.jpg?v=1785996988"], description: "黄昏把城市染成一片金色。" },
    { title: "腕表静物", group: "business", category: "photo", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/commercial/photo/01.jpg?v=1785977892", description: "商业产品摄影 · 腕表系列。" },
    { title: "棚拍人像", group: "business", category: "photo", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/commercial/photo/02.jpg?v=1785977896", description: "商业人像 · 影棚拍摄。" },
    { title: "MV · 城市夜景", group: "business", category: "视频mv", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/commercial/video/01.jpg?v=1785977899", description: "音乐录像带 · 城市夜景片段。" },
    { title: "MV · 海风", group: "business", category: "视频mv", image: "https://zjy0429-1471879169.cos.ap-shanghai.myqcloud.com/images/commercial/video/02.jpg?v=1785977903", description: "音乐录像带 · 海边片段。" }
  ];

  var worksPromise = null;
  function loadWorks(cb) {
    if (!worksPromise) {
      worksPromise = fetch("content/works.json", { cache: "no-store" })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          return data && Array.isArray(data.works) ? data.works : DEFAULT_WORKS;
        })
        .catch(function () {
          return DEFAULT_WORKS;
        });
    }
    worksPromise.then(cb);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------- 返回顶部 ---------- */
  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.id = "toTop";
  toTop.setAttribute("aria-label", "返回顶部");
  toTop.innerHTML = "&#8593;";
  document.body.appendChild(toTop);

  function onScrollTop() {
    toTop.classList.toggle("show", window.scrollY > 480);
  }
  window.addEventListener("scroll", onScrollTop, { passive: true });
  onScrollTop();
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  var footerTopLink = document.getElementById("footerTop");
  if (footerTopLink) {
    footerTopLink.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 页脚年份 ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 图片保护：禁用右键、拖拽 ---------- */
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
  document.addEventListener("dragstart", function (e) {
    e.preventDefault();
  });
  document.addEventListener("drop", function (e) {
    e.preventDefault();
  });

  /* ---------- 页头滚动状态 ---------- */
  var header = document.getElementById("siteHeader");
  function onScroll() {
    if (!header) return;
    var isHome = document.body.classList.contains("home");
    var threshold = isHome ? window.innerHeight * 0.7 : 30;
    header.classList.toggle("scrolled", window.scrollY > threshold);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* 封面滚动显现：首屏只显示视频，下滑时“肘子鱼”丝滑浮现 */
  var heroCopy = document.querySelector(".hero-copy");
  if (heroCopy) {
    var heroOverlay = document.querySelector(".hero-overlay");
    var heroLinkEl = document.querySelector(".hero-link");
    var copyEls = heroCopy.querySelectorAll(
      ".hero-kicker, .hero-title, .hero-subtitle, .hero-link"
    );
    var reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function showCopy() {
      heroCopy.style.opacity = "1";
      heroCopy.style.transform = "none";
      heroCopy.style.filter = "none";
      if (heroOverlay) heroOverlay.style.opacity = "0.4";
      copyEls.forEach(function (el) {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    }

    if (reduceMotion) {
      showCopy();
    } else {
      /* 滚动 0 → 约半屏 完成显现 */
      var revealDistance = window.innerHeight * 0.5;
      var revealPending = false;

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function updateReveal() {
        var p = Math.min(window.scrollY / revealDistance, 1);
        var e = easeOutCubic(p);
        if (heroOverlay) heroOverlay.style.opacity = String((e * 0.4).toFixed(3));
        heroCopy.style.opacity = String(e);
        heroCopy.style.transform =
          "translateY(" + Math.round(64 * (1 - e)) + "px)";
        heroCopy.style.filter = "blur(" + (8 * (1 - e)).toFixed(2) + "px)";
        copyEls.forEach(function (el, i) {
          var d = Math.min(Math.max((p - i * 0.12) / 0.64, 0), 1);
          var de = easeOutCubic(d);
          el.style.opacity = String(de);
          el.style.transform =
            "translateY(" + Math.round(24 * (1 - de)) + "px)";
        });
        if (heroLinkEl) {
          if (e >= 1) heroLinkEl.classList.add("hero-link--breathe");
          else heroLinkEl.classList.remove("hero-link--breathe");
        }
      }

      function onRevealScroll() {
        if (revealPending) return;
        revealPending = true;
        window.requestAnimationFrame(function () {
          updateReveal();
          revealPending = false;
        });
      }

      window.addEventListener("scroll", onRevealScroll, { passive: true });
      window.addEventListener("resize", function () {
        revealDistance = window.innerHeight * 0.5;
        updateReveal();
      });
      updateReveal();
    }
  }

  /* ---------- 移动端菜单 ---------- */
  var navToggle = document.getElementById("navToggle");
  var siteNav = document.getElementById("siteNav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var open = siteNav.classList.toggle("open");
      navToggle.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("nav-open", open);
    });
    siteNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        siteNav.classList.remove("open");
        navToggle.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      });
    });
  }

  /* 图片工具：响应式 srcset（COS 预生成变体）、低质量占位图（LQIP） */
  function zzVariant(src, w) {
    if (!src) return src;
    var m = src.match(/^(.+?)(\.(?:webp|jpe?g|png|gif))(\?v=\d+)?$/i);
    if (!m) return src;
    return m[1] + "." + w + ".webp" + (m[3] || "");
  }

  function zzSrcset(src, widths) {
    if (!src) return "";
    var out = [];
    (widths || [480, 800, 1200]).forEach(function (w) {
      var v = zzVariant(src, w);
      if (v !== src) out.push(v + " " + w + "w");
    });
    return out.join(", ");
  }

  function zzLqip(src) {
    if (!src) return "";
    var m = src.match(/^(.+?)(\?v=\d+)?$/);
    return m[1].replace(/\.(webp|jpe?g|png|gif)$/i, ".lqip.webp") + (m[2] || "");
  }

  function zzLqipStyle(src) {
    var lq = zzLqip(src);
    return lq
      ? 'background-image:url("' + lq + '");background-size:cover;background-position:center;'
      : "";
  }

  /* ---------- 从 site.json 注入站点内容 ---------- */
  function applySite(site) {
    var heroImg = document.getElementById("heroImage");
    if (heroImg && site.heroImage) {
      heroImg.src = site.heroImage;
      heroImg.setAttribute("fetchpriority", "high");
      heroImg.setAttribute("style", zzLqipStyle(site.heroImage));
    }

    var heroVideo = document.querySelector(".hero-video");
    if (heroVideo && site.heroImage) heroVideo.poster = site.heroImage;

    /* 首屏关键图预加载 */
    if (site.heroImage) {
      var pl = document.createElement("link");
      pl.rel = "preload";
      pl.as = "image";
      pl.href = site.heroImage;
      document.head.appendChild(pl);
    }

    var heroTitle = document.getElementById("heroTitle");
    if (heroTitle && site.heroTitle) heroTitle.textContent = site.heroTitle;

    var heroSub = document.getElementById("heroSubtitle");
    if (heroSub && site.heroSubtitle) heroSub.textContent = site.heroSubtitle;

    var ph = document.getElementById("aboutPhilosophy");
    if (ph && site.aboutPhilosophy) ph.textContent = site.aboutPhilosophy;

    var ex = document.getElementById("aboutExperience");
    if (ex && site.aboutExperience) ex.textContent = site.aboutExperience;

    var aboutImg = document.getElementById("aboutImage");
    if (aboutImg && site.aboutImage) aboutImg.src = site.aboutImage;

    if (site.contactEmail) {
      ["footerMail", "aboutMail"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.textContent = site.contactEmail;
          el.href = "mailto:" + site.contactEmail;
        }
      });
    }

    var xhs = document.getElementById("footerXhs");
    if (xhs && site.footerXhs) xhs.textContent = site.footerXhs;
    applyHomeComponents(site);
  }

  /* 首页组件（scroll01 滚动叙事 / hero07 摄影理念）：从 site.json 填入图片与文字 */
  function applyHomeComponents(site) {
    var home = site.home || {};
    var slides = Array.isArray(home.scroll01) ? home.scroll01 : [];

    if (slides.length) {
      var imgs = document.querySelectorAll(".zz-scroll01-img");
      var items = document.querySelectorAll(".zz-scroll01-item");
      var cards = document.querySelectorAll(".zz-scroll01-card");
      slides.forEach(function (s, i) {
        if (!s) return;
        if (imgs[i] && s.image) {
          imgs[i].src = s.image;
          imgs[i].srcset = zzSrcset(s.image, [480, 800, 1200]);
          imgs[i].sizes = "(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw";
          imgs[i].setAttribute("style", zzLqipStyle(s.image));
        }
        if (items[i]) {
          var t = items[i].querySelector(".zz-scroll01-title");
          if (t && s.title) t.textContent = s.title;
          var d = items[i].querySelector(".zz-scroll01-desc");
          if (d && s.description != null) d.textContent = s.description;
        }
        if (cards[i]) {
          var ci = cards[i].querySelector(".zz-scroll01-card-img");
          if (ci && s.image) {
            ci.src = s.image;
            ci.srcset = zzSrcset(s.image, [480, 800, 1200]);
            ci.sizes = "(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw";
            ci.setAttribute("style", zzLqipStyle(s.image));
          }
          var ct = cards[i].querySelector(".zz-scroll01-title");
          if (ct && s.title) ct.textContent = s.title;
          var cd = cards[i].querySelector(".zz-scroll01-desc");
          if (cd && s.description != null) cd.textContent = s.description;
        }
      });
    }

    var h = home.hero07 || {};
    var hImg = document.querySelector(".zz-hero07-img");
    if (hImg && h.image) {
      hImg.src = h.image;
      hImg.srcset = zzSrcset(h.image, [480, 800, 1200]);
      hImg.sizes = "(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw";
      hImg.setAttribute("style", zzLqipStyle(h.image));
    }
    var tag = document.querySelector(".zz-hero07-tagline");
    if (tag && h.tagline != null) tag.textContent = h.tagline;
    var ht = document.querySelector(".zz-hero07-title");
    if (ht && h.title != null) {
      /* 标题含标点时前端默认在标点后换行 */
      ht.innerHTML = escapeHtml(String(h.title)).replace(
        /([，。！？；、：])/g,
        "$1<br>"
      );
    }
    var hd = document.querySelector(".zz-hero07-desc");
    if (hd && h.description != null) hd.textContent = h.description;
  }

  fetch("content/site.json", { cache: "no-store" })
    .then(function (r) {
      return r.json();
    })
    .then(applySite)
    .catch(function () {
      applySite(DEFAULT_SITE);
    });

  /* ---------- 网格画廊（portfolio.html / business.html） ---------- */
  function initGallery() {
    var PAGE_GROUP = document.body.dataset.group || "adventure";
    var GROUP_LABEL = PAGE_GROUP === "business" ? "商业" : "冒险";

    var gallery = document.getElementById("gallery");
    var filterBar = document.getElementById("filterBar");
    var emptyState = document.getElementById("emptyState");
    if (!gallery) return;

    var groupWorks = [];
    var currentCat = "全部";

    function filteredWorks() {
      if (currentCat === "全部") return groupWorks;
      return groupWorks.filter(function (w) {
        return w.category === currentCat;
      });
    }

    function renderFilters(cats) {
      if (!filterBar) return;
      filterBar.innerHTML = "";
      cats.forEach(function (cat, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter-btn" + (i === 0 ? " active" : "");
        btn.textContent = cat;
        btn.addEventListener("click", function () {
          currentCat = cat;
          filterBar.querySelectorAll(".filter-btn").forEach(function (b) {
            b.classList.toggle("active", b === btn);
          });
          renderGallery(filteredWorks());
        });
        filterBar.appendChild(btn);
      });
    }

    function workImages(w) {
      return Array.isArray(w.images) && w.images.length ? w.images : [w.image];
    }

    function renderGallery(list) {
      gallery.innerHTML = "";
      if (PAGE_GROUP === "business") {
        gallery.classList.add("biz-flow");
        if (!list.length) {
          if (emptyState) emptyState.hidden = false;
          return;
        }
        if (emptyState) emptyState.hidden = true;
        /* 先读取封面尺寸：photo 分类 5/4 交替 + 横图占 3 格；其他分类 4/3 交替 + 横图占 2 格 */
        var srcs = list.map(function (w) { return workImages(w)[0] || ""; });
        preloadImages(srcs, function (dims) {
          if (currentCat === "photo") {
            renderBizGalleryPhoto(list, dims);
          } else {
            renderBizGallery(list, dims);
          }
        });
        return;
      }
      if (!list.length) {
        if (emptyState) emptyState.hidden = false;
        return;
      }
      if (emptyState) emptyState.hidden = true;

      list.forEach(function (work, i) {
        var imgs = workImages(work);
        var card = document.createElement("figure");
        card.className = "work-card fade-in";

        card.innerHTML =
          '<img class="work-thumb" src="' +
          work.image +
          '" srcset="' +
          zzSrcset(work.image, [480, 800, 1200]) +
          '" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" style="' +
          zzLqipStyle(work.image) +
          '" alt="' +
          escapeHtml(work.title) +
          '" loading="lazy" draggable="false">' +
          "<figcaption>" +
          '<div class="work-title">' +
          escapeHtml(work.title) +
          "</div>" +
          '<div class="work-meta">' +
          escapeHtml(work.category) +
          "</div>" +
          "</figcaption>";

        card.addEventListener("click", function () {
          openLightbox(i, list);
        });
        gallery.appendChild(card);
      });
      observeFade();
    }

    function preloadImages(srcs, cb) {
      var results = [];
      var remaining = srcs.length;
      if (!remaining) { cb(results); return; }
      var finished = false;
      var timer = window.setTimeout(function () {
        if (finished) return;
        finished = true;
        cb(results);
      }, 2500);
      function done() {
        if (finished) return;
        remaining -= 1;
        if (remaining === 0) {
          finished = true;
          window.clearTimeout(timer);
          cb(results);
        }
      }
      srcs.forEach(function (src, i) {
        if (!src) { results[i] = null; done(); return; }
        var img = new Image();
        img.onload = function () {
          results[i] = { w: img.naturalWidth || 0, h: img.naturalHeight || 0 };
          done();
        };
        img.onerror = function () {
          results[i] = null;
          done();
        };
        img.src = zzVariant(src, 800);
      });
    }

    /* 两张横图同排：2+3（较宽的占 3 格）与 2+2 自动交替；
       作品里可写 pairSpan: "2+3" 或 "2+2" 强制这一对用哪种排法 */
    function makeHorizPairRow(a, b, dims, state, list) {
      var wa = list[a] || {};
      var wb = list[b] || {};
      var forced = wa.pairSpan || wb.pairSpan;
      var use23 = forced ? forced === "2+3" : state.pairMode === "2+3";
      state.pairMode = use23 ? "2+2" : "2+3";
      if (!use23) {
        return {
          cap: 4,
          cards: [
            { i: a, span: 2, lvl: 0 },
            { i: b, span: 2, lvl: 0 }
          ]
        };
      }
      var ra = dims[a] && dims[a].w && dims[a].h ? dims[a].w / dims[a].h : 1.5;
      var rb = dims[b] && dims[b].w && dims[b].h ? dims[b].w / dims[b].h : 1.5;
      var wide = a;
      if (rb - ra > 0.15) {
        wide = b;
      } else if (ra - rb > 0.15) {
        wide = a;
      } else {
        /* 比例接近时：3 格图左右交替，保持节奏 */
        if (state.wideSide === "right") {
          wide = b;
        }
        state.wideSide = state.wideSide === "left" ? "right" : "left";
      }
      return {
        cap: 5,
        cards:
          wide === a
            ? [
                { i: a, span: 3, lvl: 0 },
                { i: b, span: 2, lvl: 0 }
              ]
            : [
                { i: a, span: 2, lvl: 0 },
                { i: b, span: 3, lvl: 0 }
              ]
      };
    }

    /* 竖图 4/3 交替成排（棋盘错落）+ 横图占 2 格，与竖图左右配对、左右交替 */
    function renderBizGallery(list, dims) {
      gallery.innerHTML = "";
      var rows = [];
      var consumed = {};
      var vertCap = 4; /* 竖图行容量：4 张一排 → 3 张一排交替 */
      var vertCards = [];
      var vertCount = 0;
      var pairState = { pairMode: "2+3", wideSide: "left" };

      function isHorizontal(i) {
        var d = dims[i];
        return !!(d && d.w && d.h && d.w / d.h > 1.15);
      }

      function flushVertRow() {
        if (vertCards.length) {
          rows.push({ cap: vertCap, cards: vertCards });
          vertCards = [];
          vertCount = 0;
          vertCap = vertCap === 4 ? 3 : 4; /* 4 → 3 → 4 → 3 */
        }
      }

      var horizSide = "right"; /* 第一次横图靠右，下一次靠左，左右交替 */
      var i = 0;
      while (i < list.length) {
        if (consumed[i]) {
          i += 1;
          continue;
        }
        if (isHorizontal(i)) {
          flushVertRow();
          /* 下一张也是横图：两张横图合成一排（2+3 或 2+2 交替） */
          var h2 = i + 1;
          while (h2 < list.length && consumed[h2]) h2 += 1;
          if (h2 < list.length && isHorizontal(h2)) {
            rows.push(makeHorizPairRow(i, h2, dims, pairState, list));
            consumed[h2] = true;
            vertCap = 4; /* 配对行之后的竖图行从 4 张一排重新开始 */
            i = h2 + 1;
            continue;
          }
          /* 找这张横图后面最近的竖图来配对 */
          var j = i + 1;
          while (j < list.length && (consumed[j] || isHorizontal(j))) j += 1;
          if (j < list.length) {
            var pair = [];
            if (horizSide === "right") {
              pair.push({ i: j, span: 1, lvl: 0, noStagger: true, pair: true });
              pair.push({ i: i, span: 2, lvl: 0 });
              horizSide = "left";
            } else {
              pair.push({ i: i, span: 2, lvl: 0 });
              pair.push({ i: j, span: 1, lvl: 0, noStagger: true, pair: true });
              horizSide = "right";
            }
            rows.push({ cap: 3, cards: pair });
            consumed[j] = true;
            vertCap = 4; /* 配对行之后的竖图行从 4 张一排重新开始 */
            i += 1;
            continue;
          }
          /* 后面没有竖图可配对：横图单独占 2 格 */
          rows.push({ cap: 3, cards: [{ i: i, span: 2, lvl: 0 }] });
          i += 1;
          continue;
        }
        /* 竖图：4 张一排与 3 张一排交替，棋盘式上下错落 */
        if (vertCount + 1 > vertCap) flushVertRow();
        vertCards.push({ i: i, span: 1 });
        vertCount += 1;
        i += 1;
      }
      flushVertRow();
      renderBizRows(rows, list);
    }

    /* photo 分类专用：4 张 → 3 张 → 5 张循环交替；横图在 5 格行占 3 格、其余占 2 格，左右交替 */
    function renderBizGalleryPhoto(list, dims) {
      gallery.innerHTML = "";
      var rows = [];
      var consumed = {};
      var vertCaps = [4, 3, 5]; /* 4 张一排 → 3 张一排 → 5 张一排循环 */
      var capIdx = 0;
      var vertCards = [];
      var vertCount = 0;
      var pairState = { pairMode: "2+3", wideSide: "left" };

      function isHorizontal(i) {
        var d = dims[i];
        return !!(d && d.w && d.h && d.w / d.h > 1.15);
      }

      function flushVertRow() {
        if (vertCards.length) {
          rows.push({ cap: vertCaps[capIdx], cards: vertCards });
          vertCards = [];
          vertCount = 0;
          capIdx = (capIdx + 1) % 3;
        }
      }

      var horizSide = "left"; /* 第一次横图靠左，下一次靠右，左右交替 */
      var i = 0;
      while (i < list.length) {
        if (consumed[i]) {
          i += 1;
          continue;
        }
        if (isHorizontal(i)) {
          flushVertRow();
          /* 下一张也是横图：两张横图合成一排（2+3 或 2+2 交替） */
          var h2 = i + 1;
          while (h2 < list.length && consumed[h2]) h2 += 1;
          if (h2 < list.length && isHorizontal(h2)) {
            rows.push(makeHorizPairRow(i, h2, dims, pairState, list));
            consumed[h2] = true;
            capIdx = (capIdx + 1) % 3;
            i = h2 + 1;
            continue;
          }
          var cap = vertCaps[capIdx];
          /* 5 格行横图占 3 格；4/3 格行横图占 2 格 */
          var span = cap === 5 ? 3 : 2;
          var need = cap - span; /* 其余格放竖图（5 格行 2 张、4 格行 2 张、3 格行 1 张） */
          var fillers = [];
          var k = i + 1;
          while (fillers.length < need && k < list.length) {
            if (!consumed[k] && !isHorizontal(k)) fillers.push(k);
            k += 1;
          }
          var rowCap;
          if (fillers.length === need) {
            rowCap = cap;
          } else if (fillers.length >= 2) {
            rowCap = 4;
            span = 2; /* 5 格行竖图不够时退成 4 格行，横图改占 2 格 */
          } else if (fillers.length === 1) {
            rowCap = 3;
            span = 2;
          } else {
            rowCap = 3;
            span = 2; /* 后面没有竖图：横图单独占 2 格 */
          }
          var use = fillers.slice(0, rowCap - span);
          var cards = [];
          if (horizSide === "right") {
            use.forEach(function (fi) {
              cards.push({ i: fi, span: 1, lvl: 0, noStagger: true, pair: true });
            });
            cards.push({ i: i, span: span, lvl: 0 });
            horizSide = "left";
          } else {
            cards.push({ i: i, span: span, lvl: 0 });
            use.forEach(function (fi) {
              cards.push({ i: fi, span: 1, lvl: 0, noStagger: true, pair: true });
            });
            horizSide = "right";
          }
          use.forEach(function (fi) { consumed[fi] = true; });
          rows.push({ cap: rowCap, cards: cards });
          capIdx = (capIdx + 1) % 3;
          i += 1;
          continue;
        }
        /* 竖图：4 张一排 → 3 张一排 → 5 张一排循环，棋盘式上下错落 */
        if (vertCount + 1 > vertCaps[capIdx]) flushVertRow();
        vertCards.push({ i: i, span: 1 });
        vertCount += 1;
        i += 1;
      }
      flushVertRow();
      renderBizRows(rows, list);
    }

    function renderBizRows(rows, list) {
      rows.forEach(function (r, ri) {
        var rowEl = document.createElement("div");
        rowEl.className = "biz-row wf-" + r.cap;
        r.cards.forEach(function (c, ci) {
          var lvl = c.lvl || 0;
          if (c.span === 1 && !c.noStagger) {
            /* 上下上下：相邻照片交替高低（棋盘式错落） */
            lvl = (ri + ci) % 2;
          }
          rowEl.appendChild(makeBizCard(list[c.i], c.i, list, c.span, lvl, c.pair));
        });
        gallery.appendChild(rowEl);
      });
      observeFade();
    }

    function makeBizCard(work, i, list, span, lvl, pair) {
      var imgs = workImages(work);
      var card = document.createElement("figure");
      card.className = "work-card fade-in work-folder-card span-" + span + " lvl-" + lvl + (pair ? " pair-v" : "");

      var folder = document.createElement("div");
      folder.className = "work-folder";
      var tab = document.createElement("span");
      tab.className = "work-folder-tab";
      tab.setAttribute("aria-hidden", "true");
      var body = document.createElement("div");
      body.className = "work-folder-body";
      var cover = document.createElement("img");
      cover.className = "work-thumb";
      cover.src = imgs[0] || "";
      if (imgs[0]) {
        cover.srcset = zzSrcset(imgs[0], [480, 800, 1200]);
        cover.sizes = "(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw";
        cover.setAttribute("style", zzLqipStyle(imgs[0]));
      }
      cover.alt = work.title || "作品";
      cover.loading = "lazy";
      cover.draggable = false;
      body.appendChild(cover);
      if (imgs.length > 1 && imgs[1]) {
        var stack = document.createElement("div");
        stack.className = "work-folder-stack";
        var back = document.createElement("img");
        back.className = "wfs-back";
        back.src = imgs.length > 2 && imgs[2] ? imgs[2] : imgs[1];
        back.setAttribute("style", zzLqipStyle(back.src));
        back.alt = "";
        back.loading = "lazy";
        back.draggable = false;
        var front = document.createElement("img");
        front.className = "wfs-front";
        front.src = imgs[1];
        front.srcset = zzSrcset(imgs[1], [480, 800, 1200]);
        front.sizes = "(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw";
        front.setAttribute("style", zzLqipStyle(imgs[1]));
        front.alt = "";
        front.loading = "lazy";
        front.draggable = false;
        stack.appendChild(back);
        stack.appendChild(front);
        body.appendChild(stack);
      }
      var count = document.createElement("span");
      count.className = "work-folder-count";
      count.textContent = imgs.length + " 张";
      body.appendChild(count);
      folder.appendChild(tab);
      folder.appendChild(body);
      card.appendChild(folder);
      var fig = document.createElement("figcaption");
      fig.innerHTML =
        '<div class="work-title">' +
        escapeHtml(work.title || "未命名作品") +
        "</div>" +
        '<div class="work-meta">' +
        escapeHtml(work.category) +
        "</div>";
      card.appendChild(fig);
      card.addEventListener("click", function () {
        openLightbox(i, list);
      });
      return card;
    }

    /* 滚动淡入 */
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    function observeFade() {
      gallery.querySelectorAll(".fade-in").forEach(function (el) {
        io.observe(el);
      });
    }

    /* 全屏滑动查看（lightbox） */
    var lb = document.getElementById("lightbox");
    var lbImg = document.getElementById("lbImg");
    var lbTitle = document.getElementById("lbTitle");
    var lbMeta = document.getElementById("lbMeta");
    var lbCount = document.getElementById("lbCount");
    var lbList = [];
    var lbIndex = 0;
    var touchX = 0;

    function openLightbox(index, list) {
      if (!lb) return;
      lbList = [];
      list.forEach(function (w) {
        var imgs = workImages(w);
        imgs.forEach(function (src) {
          lbList.push({
            src: src,
            title: w.title,
            category: w.category,
            description: w.description
          });
        });
      });
      var start = 0;
      for (var k = 0; k < index; k++) {
        start += workImages(list[k]).length;
      }
      lbIndex = start;
      setLightbox(false);
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      if (!lb) return;
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    function setLightbox(animate) {
      var work = lbList[lbIndex];
      if (!work) return;
      if (animate) lbImg.classList.add("leaving");
      window.setTimeout(
        function () {
          lbImg.src = work.src;
          lbImg.alt = work.title;
          if (lbTitle) lbTitle.textContent = work.title;
          if (lbMeta) {
            var meta = GROUP_LABEL + " · " + work.category;
            if (work.description) meta += " · " + work.description;
            lbMeta.textContent = meta;
          }
          if (lbCount) lbCount.textContent = lbIndex + 1 + " / " + lbList.length;
          lbImg.classList.remove("leaving");
        },
        animate ? 200 : 0
      );
    }

    function step(delta) {
      if (!lbList.length) return;
      var next = (lbIndex + delta + lbList.length) % lbList.length;
      if (next === lbIndex) return;
      lbIndex = next;
      setLightbox(true);
    }

    var lbClose = document.getElementById("lbClose");
    var lbPrev = document.getElementById("lbPrev");
    var lbNext = document.getElementById("lbNext");
    if (lbClose) lbClose.addEventListener("click", closeLightbox);
    if (lbPrev) lbPrev.addEventListener("click", function () { step(-1); });
    if (lbNext) lbNext.addEventListener("click", function () { step(1); });

    if (lb) {
      lb.addEventListener("click", function (e) {
        if (e.target === lb) closeLightbox();
      });
      lb.addEventListener("touchstart", function (e) {
        touchX = e.changedTouches[0].clientX;
      }, { passive: true });
      lb.addEventListener("touchend", function (e) {
        var dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 42) step(dx < 0 ? 1 : -1);
      }, { passive: true });
    }

    document.addEventListener("keydown", function (e) {
      if (!lb || !lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });

    loadWorks(function (data) {
      groupWorks = data.filter(function (w) {
        return w.group === PAGE_GROUP;
      });
      var cats = [];
      groupWorks.forEach(function (w) {
        if (cats.indexOf(w.category) === -1) cats.push(w.category);
      });
      if (PAGE_GROUP === "business") {
        /* 商业页：不显示「全部」，photo 排在最前作为默认分类 */
        var photoAt = cats.indexOf("photo");
        if (photoAt > 0) {
          cats.splice(photoAt, 1);
          cats.unshift("photo");
        }
        if (!cats.length) cats.push("全部");
      } else {
        cats.unshift("全部");
      }
      currentCat = cats[0];
      renderFilters(cats);
      renderGallery(filteredWorks());
    });
  }

  /* ---------- 沉浸浏览（首页 index.html #immersive：左侧目录 + 右侧大幅作品） ---------- */
  function initHomeImmersive() {
    var menu = document.getElementById("imMenu");
    var content = document.getElementById("imContent");
    if (!menu || !content) return;

    var works = [];
    var sections = [];

    /* 首页画廊点击放大（大图查看，与参考站一致） */
    var lb = document.getElementById("lightbox");
    var lbImg = document.getElementById("lbImg");
    var lbTitle = document.getElementById("lbTitle");
    var lbMeta = document.getElementById("lbMeta");
    var lbCount = document.getElementById("lbCount");
    var lbList = [];
    var lbIndex = 0;
    var lbWorkTitle = "";
    var lbWorkCat = "";
    var lbWorkDesc = "";

    var moreModal = document.getElementById("imMoreModal");
    var moreGrid = document.getElementById("imMoreGrid");
    var moreTitle = document.getElementById("imMoreTitle");
    var moreCount = document.getElementById("imMoreCount");
    var moreClose = document.getElementById("imMoreClose");

    function homeSetLightbox() {
      if (!lbImg || !lbList.length) return;
      lbImg.src = lbList[lbIndex];
      lbImg.alt = lbWorkTitle;
      if (lbTitle) lbTitle.textContent = lbWorkTitle;
      if (lbMeta) {
        lbMeta.textContent = lbWorkCat + (lbWorkDesc ? " · " + lbWorkDesc : "");
      }
      if (lbCount) lbCount.textContent = lbIndex + 1 + " / " + lbList.length;
    }

    function homeOpenLightbox(list, index, work) {
      if (!lb) return;
      lbList = list;
      lbIndex = index;
      lbWorkTitle = work.title || "";
      lbWorkCat = work.category || "";
      lbWorkDesc = work.description || "";
      homeSetLightbox();
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function homeCloseLightbox() {
      if (!lb) return;
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      if (!moreModal || !moreModal.classList.contains("open")) {
        document.body.style.overflow = "";
      }
    }

    function homeStep(delta) {
      if (!lbList.length) return;
      lbIndex = (lbIndex + delta + lbList.length) % lbList.length;
      homeSetLightbox();
    }

    function homeOpenMore(list, work) {
      if (!moreModal || !moreGrid) return;
      moreGrid.innerHTML = "";
      list.forEach(function (src, j) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "imm-item";
        btn.setAttribute("aria-label", "查看大图 " + (j + 1));
        var img = document.createElement("img");
        img.src = src;
        img.alt = work.title + " " + (j + 1);
        img.loading = "lazy";
        img.draggable = false;
        btn.appendChild(img);
        btn.addEventListener("click", function () {
          homeOpenLightbox(list, j, work);
        });
        moreGrid.appendChild(btn);
      });
      if (moreTitle) moreTitle.textContent = (work.title || "") + " · 更多照片";
      if (moreCount) moreCount.textContent = list.length + " 张";
      moreModal.classList.add("open");
      moreModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function homeCloseMore() {
      if (!moreModal) return;
      moreModal.classList.remove("open");
      moreModal.setAttribute("aria-hidden", "true");
      if (!lb || !lb.classList.contains("open")) {
        document.body.style.overflow = "";
      }
    }

    var lbClose = document.getElementById("lbClose");
    var lbPrev = document.getElementById("lbPrev");
    var lbNext = document.getElementById("lbNext");
    if (lbClose) lbClose.addEventListener("click", homeCloseLightbox);
    if (lbPrev) lbPrev.addEventListener("click", function () { homeStep(-1); });
    if (lbNext) lbNext.addEventListener("click", function () { homeStep(1); });
    if (lb) {
      lb.addEventListener("click", function (e) {
        if (e.target === lb) homeCloseLightbox();
      });
    }
    if (moreClose) moreClose.addEventListener("click", homeCloseMore);
    if (moreModal) {
      moreModal.addEventListener("click", function (e) {
        if (e.target === moreModal) homeCloseMore();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (lb && lb.classList.contains("open")) {
        if (e.key === "Escape") homeCloseLightbox();
        if (e.key === "ArrowLeft") homeStep(-1);
        if (e.key === "ArrowRight") homeStep(1);
        return;
      }
      if (moreModal && moreModal.classList.contains("open") && e.key === "Escape") {
        homeCloseMore();
      }
    });

    function setActive(i) {
      menu.querySelectorAll(".im-menu-item").forEach(function (btn, idx) {
        btn.classList.toggle("active", idx === i);
      });
    }

    function renderMenu() {
      menu.innerHTML = "";
      works.forEach(function (work, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "im-menu-item" + (i === 0 ? " active" : "");
        btn.innerHTML =
          '<span class="im-dot">&bull;</span>' +
          '<span class="im-menu-title">' +
          escapeHtml(work.title) +
          "</span>";
        btn.addEventListener("click", function () {
          if (sections[i]) {
            sections[i].scrollIntoView({ behavior: "smooth", block: "start" });
          }
          setActive(i);
        });
        menu.appendChild(btn);
      });
    }

    function renderContent() {
      content.innerHTML = "";
      sections = [];
      works.forEach(function (work, i) {
        var sec = document.createElement("section");
        sec.className = "im-proj";
        sec.id = "proj-" + i;

        var imgs = work.images && work.images.length ? work.images : [work.image];
        var cover = imgs[0] || "";
        var imgsHtml = imgs
          .map(function (src, j) {
            return (
              '<img class="im-track-img" src="' +
              src +
              '" alt="' +
              escapeHtml(work.title) +
              " " +
              (j + 1) +
              '" loading="lazy" draggable="false">'
            );
          })
          .join("");

        sec.innerHTML =
          '<div class="im-proj-head">' +
          '<h3 class="im-proj-title">' +
          escapeHtml(work.title) +
          "</h3>" +
          '<p class="im-proj-meta">' +
          escapeHtml(work.category) +
          "</p>" +
          (work.description
            ? '<p class="im-proj-desc">' + escapeHtml(work.description) + "</p>"
            : "") +
          "</div>" +
          '<figure class="im-proj-figure">' +
          '<div class="im-track-wrap">' +
          '<div class="im-track">' +
          imgsHtml +
          '<button class="im-more" type="button" aria-label="查看更多：' +
          escapeHtml(work.title) +
          '">' +
          '<img class="im-more-img" src="' +
          cover +
          '" alt="" loading="lazy" draggable="false">' +
          '<span class="im-more-shade" aria-hidden="true"></span>' +
          '<span class="im-more-label">+ 查看更多</span>' +
          "</button>" +
          "</div>" +
          '<button class="im-track-btn im-track-prev" type="button" aria-label="上一张">&#8249;</button>' +
          '<button class="im-track-btn im-track-next" type="button" aria-label="下一张">&#8250;</button>' +
          "</div>" +
          "</figure>";
        content.appendChild(sec);
        sections.push(sec);

        sec.querySelectorAll(".im-track-img").forEach(function (img, j) {
          img.addEventListener("click", function () {
            homeOpenLightbox(imgs, j, work);
          });
        });

        var moreBtn = sec.querySelector(".im-more");
        if (moreBtn) {
          moreBtn.addEventListener("click", function () {
            var moreList =
              Array.isArray(work.more) && work.more.length ? work.more : imgs;
            homeOpenMore(moreList, work);
          });
        }

        var track = sec.querySelector(".im-track");
        var trackItems = Array.prototype.slice.call(
          track.querySelectorAll(".im-track-img, .im-more")
        );

        function trackLeftOf(item) {
          return (
            item.getBoundingClientRect().left -
            track.getBoundingClientRect().left +
            track.scrollLeft
          );
        }

        function snapPositions() {
          var maxLeft = track.scrollWidth - track.clientWidth;
          return trackItems.map(function (item, idx) {
            var count = trackItems.length;
            if (idx === 0) return 0;
            if (idx === count - 1) return maxLeft;
            var left = trackLeftOf(item);
            if (idx === count - 2) {
              /* 最后一张照片贴右端（首尾不居中） */
              return Math.max(
                0,
                Math.min(maxLeft, left + item.offsetWidth - track.clientWidth)
              );
            }
            return Math.max(
              0,
              Math.min(maxLeft, left + item.offsetWidth / 2 - track.clientWidth / 2)
            );
          });
        }

        /* 点击定位：等目标照片（及首图）加载出真实宽度，避免懒加载时宽度为 0 导致不居中 */
        function waitItemsReady(items, cb) {
          var pending = items.filter(function (it) {
            return (
              it &&
              it.tagName === "IMG" &&
              !(it.complete && it.naturalWidth > 0)
            );
          });
          if (!pending.length) {
            cb();
            return;
          }
          var tries = 0;
          function check() {
            pending = pending.filter(function (it) {
              return !(it.complete && it.naturalWidth > 0);
            });
            if (!pending.length || tries >= 40) {
              cb();
              return;
            }
            tries += 1;
            window.setTimeout(check, 100);
          }
          check();
        }

        function scrollTrackTo(left) {
          var maxLeft = track.scrollWidth - track.clientWidth;
          var target = Math.max(0, Math.min(maxLeft, left));
          /* 滚动期间临时关掉 scroll-snap，避免浏览器把图片“吸回”左侧 */
          track.style.scrollSnapType = "none";
          try {
            track.scrollTo({ left: target, behavior: "smooth" });
          } catch (err) {
            track.scrollLeft = target;
          }
          window.clearTimeout(track._zzSnapTimer);
          track._zzSnapTimer = window.setTimeout(function () {
            track.style.scrollSnapType = "";
          }, 850);
        }

        function stepTrack(delta) {
          var positions = snapPositions();
          var cur = track.scrollLeft;
          var best = 0;
          var bestDist = Infinity;
          positions.forEach(function (pos, idx) {
            var dist = Math.abs(pos - cur);
            if (dist < bestDist) {
              bestDist = dist;
              best = idx;
            }
          });
          var target = Math.max(0, Math.min(positions.length - 1, best + delta));
          waitItemsReady([trackItems[0], trackItems[target]], function () {
            var pos2 = snapPositions();
            scrollTrackTo(pos2[target]);
          });
        }

        sec.querySelector(".im-track-prev").addEventListener("click", function () {
          stepTrack(-1);
        });
        sec.querySelector(".im-track-next").addEventListener("click", function () {
          stepTrack(1);
        });

        /* 首图竖图时，整组比例放大 */
        var firstImg = sec.querySelector(".im-track-img");
        function markPortrait() {
          if (
            firstImg &&
            firstImg.naturalWidth &&
            firstImg.naturalHeight &&
            firstImg.naturalHeight > firstImg.naturalWidth
          ) {
            sec.classList.add("im-proj--portrait");
          }
        }
        if (firstImg) {
          if (firstImg.complete) markPortrait();
          else firstImg.addEventListener("load", markPortrait);
        }
      });
    }

    /* 滚动时高亮当前作品（参考站 scroll-spy） */
    var ticking = false;
    function updateActive() {
      var best = 0;
      var bestDist = Infinity;
      sections.forEach(function (sec, i) {
        var top = sec.getBoundingClientRect().top;
        var dist = Math.abs(top - window.innerHeight * 0.3);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActive(best);
    }
    function onScrollSpy() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        updateActive();
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScrollSpy, { passive: true });

    loadWorks(function (data) {
      works = data.filter(function (w) {
        return w.group === "adventure";
      });
      renderMenu();
      renderContent();
      updateActive();
    });
  }

  /* ---------- 封面 IMMERSIVE：本页丝滑下滑到下一屏（不跳转） ---------- */
  function initHeroScroll() {
    var heroLink = document.querySelector(".hero-link");
    if (!heroLink) return;
    heroLink.addEventListener("click", function (e) {
      var targetId = heroLink.getAttribute("href");
      if (!targetId || targetId.charAt(0) !== "#") return;
      var target = document.querySelector(targetId);
      if (!target) return;
      var reduce =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      e.preventDefault();
      if (reduce) {
        target.scrollIntoView();
        return;
      }
      var startY = window.pageYOffset;
      var endY = target.getBoundingClientRect().top + startY;
      var duration = 1100;
      var start = null;
      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        window.scrollTo({
          top: startY + (endY - startY) * easeInOutCubic(p),
          behavior: "instant"
        });
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });
  }

  /* ---------- 启动 ---------- */
  initGallery();
  initHomeImmersive();
  initHeroScroll();
})();
