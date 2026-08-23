(function () {
  "use strict";

  /* Coverflow 封面轮播 — 由 React CoverflowCarousel 原样移植为原生 JS。
     图片与文案对应原演示组件；数据来源：content/site.json 的 carousel 数组。 */

  /* 兜底数据：只用站内已有作品图（本地相对路径，发布时自动转 OSS 直连）。
     正常情况由 content/site.json 的 carousel 数组驱动。 */
  var DEFAULT_CAROUSEL = [
    {
      src: "images/uploads/u_20260818_163038_1728.jpg?v=1787041838",
      alt: "华欣的海风，蓝色的海边少年",
      title: "Tailed",
      subtitle: "date：2026",
      meta: [
        { label: "心动", value: "🌟🌟🌟🌟" },
        { label: "制作人", value: "肘子鱼" }
      ]
    },
    {
      src: "images/uploads/u_20260818_163110_8829.jpg?v=1",
      alt: "涩谷之夜",
      title: "Tokyo",
      subtitle: "date：2026",
      meta: [
        { label: "心动", value: "🌟🌟🌟" },
        { label: "制作人", value: "肘子鱼" }
      ]
    },
    {
      src: "images/uploads/u_20260818_163146_2586.jpg?v=1",
      alt: "亲爱的藤井树小姐 此刻我正在喜欢你",
      title: "北海道",
      subtitle: "date：2026",
      meta: [
        { label: "心动", value: "🌟🌟🌟🌟🌟" },
        { label: "制作人", value: "肘子鱼" }
      ]
    },
    {
      src: "images/uploads/u_20260818_163218_9960.jpg?v=1",
      alt: "迪庆 晚安",
      title: "滇藏",
      subtitle: "date：2025",
      meta: [
        { label: "心动", value: "🌟🌟" },
        { label: "制作人", value: "肘子鱼" }
      ]
    },
    {
      src: "images/uploads/u_20260818_165031_6526.png?v=1",
      alt: "祁连山脉劈开戈壁和草原",
      title: "青甘疆",
      subtitle: "date：2024",
      meta: [
        { label: "心动", value: "🌟🌟🌟" },
        { label: "制作人", value: "肘子鱼" }
      ]
    },
    {
      src: "images/uploads/u_20260818_163342_7298.jpg?v=1",
      alt: "From conflict to peace.",
      title: "大雷山",
      subtitle: "date：2025",
      meta: [
        { label: "心动", value: "🌟🌟🌟🌟" },
        { label: "制作人", value: "肘子鱼" }
      ]
    }
  ];

  var section = document.getElementById("coverflow");
  var frame = document.getElementById("cfFrame");
  var track = document.getElementById("cfTrack");
  var caption = document.getElementById("cfCaption");
  if (!section || !frame || !track || !caption) return;

  /* 进入视口时柔滑显现：RECOMMEND 标题与轮播依次淡入上移 */
  if ("IntersectionObserver" in window) {
    var cfReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!cfReduced) {
      var cfStage = section.querySelector(".cf-stage");
      if (cfStage) {
        var cfIo = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                section.classList.add("cf-in");
                cfIo.disconnect();
              }
            });
          },
          { threshold: 0.9 }
        );
        cfIo.observe(cfStage);
      }
    }
  }

  var CF = {
    rotate: 44,
    depth: 0.6,
    perspective: 3,
    falloff: 0.56,
    fade: 0.1,
    cardWidth: "clamp(148px, 22vw, 260px)",
    gap: 0.05,
    loop: true
  };

  var slides = [];
  var cardEls = [];
  var count = 0;
  var selected = 0;
  var pos = 0; // 小数卡位：当前“正中”位置
  var target = 0; // 本次归位要去的地方
  var width = 0;
  var raf = null;
  var drag = null;
  var justDragged = false; // 拖拽后松开，避免误触发生跳转

  section.style.setProperty("--cf-card", CF.cardWidth);
  frame.style.perspective = "calc(var(--cf-card) * " + CF.perspective + ")";

  function indexAt(p) {
    return ((Math.round(p) % count) + count) % count;
  }

  /* 直接写样式，跟原组件一致：倾斜/后退都随距离衰减，环状折返 */
  function paint() {
    if (!width) return;
    var pitch = width * (1 + CF.gap);
    for (var i = 0; i < count; i++) {
      var card = cardEls[i];
      if (!card) continue;

      var offset = i - pos;
      if (CF.loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      var distance = Math.abs(offset);
      var ramp = Math.pow(distance, CF.falloff);
      var tilt = Math.min(CF.rotate * ramp, 82) * Math.sign(offset);

      card.style.transform =
        "translateX(calc(-50% + " + offset * pitch + "px)) " +
        "translateZ(" + -CF.depth * width * ramp + "px) rotateY(" + -tilt + "deg)";

      var edge = CF.loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - CF.fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    }
  }

  function settle(t) {
    if (raf !== null) cancelAnimationFrame(raf);
    target = t;
    selected = indexAt(t);
    updateCaption();

    var step = function () {
      var remaining = target - pos;
      if (Math.abs(remaining) < 0.0004) {
        pos = target;
        paint();
        raf = null;
        return;
      }
      pos += remaining * 0.16;
      paint();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function clamp(p) {
    return CF.loop ? p : Math.max(0, Math.min(count - 1, p));
  }

  function nudge(by) {
    settle(clamp(Math.round(target) + by));
  }

  /* ---------- 拖拽：横向拖动归我们管，页面保留竖向滚动 ---------- */
  frame.addEventListener("pointerdown", function (event) {
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    frame.classList.add("grabbing");
    target = pos;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      pos: pos,
      v: 0,
      t: performance.now(),
      moved: false
    };
  });

  frame.addEventListener("pointermove", function (event) {
    if (!drag || drag.id !== event.pointerId) return;
    var pitch = width * (1 + CF.gap);
    if (!pitch) return;

    var now = performance.now();
    var previous = pos;
    if (Math.abs(event.clientX - drag.x) > 6) drag.moved = true;
    pos = clamp(drag.pos - (event.clientX - drag.x) / pitch);
    drag.v = ((pos - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    var idx = indexAt(pos);
    if (idx !== selected) {
      selected = idx;
      updateCaption();
    }
    paint();
  });

  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    // 甩动惯性：最多再带两张
    var carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    if (drag.moved) {
      justDragged = true;
      setTimeout(function () { justDragged = false; }, 350);
    }
    drag = null;
    frame.classList.remove("grabbing");
    settle(clamp(Math.round(pos + carried)));
  }

  frame.addEventListener("pointerup", endDrag);
  frame.addEventListener("pointercancel", endDrag);

  /* ---------- 键盘 ---------- */
  frame.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      nudge(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      nudge(1);
    }
  });

  /* ---------- 宽度测量（响应式变化时重画） ---------- */
  if (typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(function () {
      var first = cardEls[0];
      if (!first) return;
      width = first.offsetWidth;
      paint();
    });
    ro.observe(frame);
  }

  /* ---------- 说明区：标题 + 副标题 + 元信息，对应原组件 caption ---------- */
  function updateCaption() {
    var s = slides[selected];
    if (!s) return;
    caption.innerHTML = "";

    if (s.title) {
      var t = document.createElement("p");
      t.className = "cf-title";
      t.textContent = s.title;
      caption.appendChild(t);
    }
    if (s.subtitle) {
      var st = document.createElement("p");
      st.className = "cf-subtitle";
      st.textContent = s.subtitle;
      caption.appendChild(st);
    }
    if (s.meta && s.meta.length) {
      var dl = document.createElement("dl");
      dl.className = "cf-meta";
      s.meta.forEach(function (row) {
        var rowEl = document.createElement("div");
        rowEl.className = "cf-meta-row";
        var dt = document.createElement("dt");
        dt.textContent = row.label;
        var dd = document.createElement("dd");
        dd.textContent = row.value;
        rowEl.appendChild(dt);
        rowEl.appendChild(dd);
        dl.appendChild(rowEl);
      });
      caption.appendChild(dl);
    }

    caption.classList.remove("cf-fade");
    void caption.offsetWidth; // 重新触发淡入
    caption.classList.add("cf-fade");
  }

  function render(data) {
    slides = data;
    count = slides.length;
    selected = 0;
    pos = 0;
    target = 0;
    track.innerHTML = "";
    cardEls = [];

    slides.forEach(function (s, i) {
      var d = document.createElement("div");
      d.className = "cf-card";
      d.setAttribute("role", "group");
      d.setAttribute("aria-roledescription", "slide");
      d.setAttribute("aria-label", "第 " + (i + 1) + " 张，共 " + count + " 张");
      var img = document.createElement("img");
      img.src = s.src;
      img.alt = s.alt || "";
      img.draggable = false;
      d.appendChild(img);
      d.addEventListener("click", function () {
        if (justDragged) return;
        window.location.href = "footprint.html";
      });
      track.appendChild(d);
      cardEls.push(d);
    });

    updateCaption();
    requestAnimationFrame(function () {
      var first = cardEls[0];
      if (first) width = first.offsetWidth;
      paint();
    });
  }

  fetch("content/site.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && Array.isArray(data.carousel) && data.carousel.length) {
        render(data.carousel);
      } else {
        render(DEFAULT_CAROUSEL);
      }
    })
    .catch(function () {
      render(DEFAULT_CAROUSEL);
    });
})();
