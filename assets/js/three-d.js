/*
 * 3D effects, ported to vanilla JS from three 21st.dev components:
 *  1. Curved Lens Carousel — @kedhareswer/3d-curved-carousel. Its spring / flick /
 *     loop maths (wrap, offsetOf, restFor, springStep) are kept as-is; the lens bend,
 *     edge darkening and chromatic fringe are redrawn with CSS 3D instead of WebGL
 *     so it stays light on phones.
 *  2. Tilt Card — @sh20raj/optimized-tilt-card: perspective tilt toward the pointer,
 *     scale on hover, touch-hold on phones, and a pointer-following light sheen.
 *  3. Container Scroll — @manuarora700 (Aceternity) container-scroll-animation: a
 *     framed film that starts tipped back 20deg and rotates flat as you scroll in.
 * All three respect prefers-reduced-motion.
 */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------------- 1. Curved Lens Carousel ---------------- */
  function wrap(i, n) { return n > 0 ? ((i % n) + n) % n : 0; }
  function offsetOf(i, pos, n) { return n <= 0 ? 0 : wrap(i - pos + n / 2, n) - n / 2; }
  function restFor(pos, velocity, max) { max = max || 3; return Math.round(pos + Math.max(-max, Math.min(max, velocity * 0.18))); }
  function springStep(pos, vel, target, dt, omega) {
    omega = omega || 11;
    var a = (target - pos) * omega * omega - vel * 2 * omega;
    var v = vel + a * dt;
    return [pos + v * dt, v];
  }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  (function lens() {
    var stage = document.querySelector('.lens-stage');
    if (!stage) return;
    var track = stage.querySelector('.lens-track');
    var cards = [].slice.call(track.children);
    var n = cards.length;
    var kickerEl = document.querySelector('.lens-kicker'), titleEl = document.querySelector('.lens-title'), capEl = document.querySelector('.lens-cap'), countEl = document.querySelector('.lens-count');
    var pos = 0, vel = 0, target = 0, raf = 0, last = 0, active = -1;
    var bend = 0.16;

    function spacing() { return cards[0].offsetWidth * (window.innerWidth < 640 ? 0.86 : 0.98); }

    function layout() {
      var sp = spacing();
      for (var i = 0; i < n; i++) {
        var d = offsetOf(i, pos, n), ad = Math.abs(d);
        var c = cards[i];
        if (ad > 3.2) { c.style.visibility = 'hidden'; continue; }
        c.style.visibility = 'visible';
        var x = d * sp * (1 - 0.06 * bend * Math.min(d * d, 4));      // outer cards pulled in slightly
        var rot = -d * 24;                                                   // wrap around the cylinder
        var z = -Math.min(ad, 3) * 120;
        var sy = 1 + bend * Math.min(d * d, 6);                              // lens: outer cards grow taller
        var dim = 1 - 0.42 * Math.min(1, (d * d) / 2.2);
        var fringe = Math.min(4, ad * 1.6 + Math.abs(vel) * 0.6);
        c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,' + z.toFixed(1) + 'px) rotateY(' + rot.toFixed(2) + 'deg) scaleY(' + sy.toFixed(3) + ')';
        c.style.zIndex = String(100 - Math.round(ad * 10));
        c.style.filter = 'brightness(' + dim.toFixed(3) + ')' + (fringe > 0.3 ? ' drop-shadow(' + (-fringe).toFixed(1) + 'px 0 0 rgba(226,69,95,.38)) drop-shadow(' + fringe.toFixed(1) + 'px 0 0 rgba(90,170,255,.30))' : '');
      }
      var a = wrap(Math.round(pos), n);
      if (a !== active) {
        active = a;
        var s = cards[a].dataset;
        kickerEl.textContent = s.kicker || '';
        titleEl.textContent = s.title || '';
        capEl.textContent = s.caption || '';
        countEl.textContent = pad2(a + 1) + ' / ' + pad2(n);
        cards.forEach(function (c, i) { c.setAttribute('aria-hidden', i === a ? 'false' : 'true'); });
      }
    }

    function frame(now) {
      raf = 0;
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now;
      if (!dragging) {
        var r = springStep(pos, vel, target, dt);
        pos = r[0]; vel = r[1];
        if (Math.abs(target - pos) < 0.0005 && Math.abs(vel) < 0.001) { pos = target; vel = 0; layout(); last = 0; return; }
      }
      layout();
      raf = requestAnimationFrame(frame);
    }
    function go() { if (!raf) raf = requestAnimationFrame(frame); }
    function moveTo(t) { target = t; if (reduce) { pos = t; vel = 0; layout(); } else go(); }

    // drag / flick
    var dragging = false, startX = 0, startPos = 0, lastX = 0, lastT = 0, moved = 0;
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true; moved = 0; startX = lastX = e.clientX; startPos = pos; lastT = performance.now(); vel = 0;
      stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var sp = spacing(), now = performance.now(), dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      pos = startPos - dx / sp;
      var dtm = Math.max(1, now - lastT);
      vel = -((e.clientX - lastX) / sp) / (dtm / 1000);
      lastX = e.clientX; lastT = now;
      go();
    });
    function end() {
      if (!dragging) return;
      dragging = false; stage.classList.remove('dragging');
      moveTo(restFor(pos, vel));
    }
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    // a tap on a side card brings it to the centre; a tap on the centre opens WhatsApp enquiry
    cards.forEach(function (c, i) {
      c.addEventListener('click', function (e) {
        if (moved > 6) { e.preventDefault(); return; }
        var d = offsetOf(i, pos, n);
        if (Math.abs(d) > 0.5) { e.preventDefault(); moveTo(Math.round(pos + d)); }
      });
    });
    document.querySelector('.lens-prev').addEventListener('click', function () { moveTo(Math.round(target) - 1); });
    document.querySelector('.lens-next').addEventListener('click', function () { moveTo(Math.round(target) + 1); });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveTo(Math.round(target) - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveTo(Math.round(target) + 1); }
    });
    addEventListener('resize', layout);
    layout();
    // gentle intro spin when it first scrolls into view
    if (!reduce) {
      var seen = false;
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !seen) { seen = true; pos = -1.6; vel = 0; moveTo(0); }
      }, { threshold: 0.35 }).observe(stage);
    }
  })();

  /* ---------------- 2. Tilt cards ---------------- */
  (function tilt() {
    if (reduce) return;
    var MAX = 9, SCALE = 1.03, HOLD = 400;
    var els = [].slice.call(document.querySelectorAll('.piece'));
    if (finePointer) els = els.concat([].slice.call(document.querySelectorAll('.reel')));
    els.forEach(function (el) {
      el.classList.add('tilt');
      var sheen = document.createElement('span'); sheen.className = 'tilt-sheen'; sheen.setAttribute('aria-hidden', 'true');
      el.appendChild(sheen);
      var raf = 0, hideT = 0;
      function apply(px, py, rx, ry, s) {
        el.style.setProperty('--px', px + '%'); el.style.setProperty('--py', py + '%');
        el.style.setProperty('--rx', rx + 'deg'); el.style.setProperty('--ry', ry + 'deg'); el.style.setProperty('--ts', s);
      }
      function from(x, y) {
        var r = el.getBoundingClientRect();
        var px = Math.max(0, Math.min(100, (x - r.left) / r.width * 100));
        var py = Math.max(0, Math.min(100, (y - r.top) / r.height * 100));
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () { apply(px.toFixed(1), py.toFixed(1), ((py - 50) / 50 * -MAX).toFixed(2), ((px - 50) / 50 * MAX).toFixed(2), SCALE); });
      }
      function reset() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { apply(50, 50, 0, 0, 1); }); }
      el.addEventListener('mousemove', function (e) { from(e.clientX, e.clientY); el.classList.add('tilting'); });
      el.addEventListener('mouseleave', function () { reset(); el.classList.remove('tilting'); });
      if (!finePointer) {
        el.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (!t) return; clearTimeout(hideT); from(t.clientX, t.clientY); el.classList.add('tilting'); }, { passive: true });
        el.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) from(t.clientX, t.clientY); }, { passive: true });
        var tend = function () { reset(); hideT = setTimeout(function () { el.classList.remove('tilting'); }, HOLD); };
        el.addEventListener('touchend', tend); el.addEventListener('touchcancel', tend);
      }
    });
  })();

  /* ---------------- 3. Container scroll ---------------- */
  (function containerScroll() {
    var wrapEl = document.querySelector('.cscroll');
    if (!wrapEl) return;
    var card = wrapEl.querySelector('.cscroll-card'), head = wrapEl.querySelector('.cscroll-head');
    if (reduce) { card.style.transform = 'none'; return; }
    var ticking = false;
    function update() {
      ticking = false;
      var r = wrapEl.getBoundingClientRect(), vh = window.innerHeight;
      // 0 when the section's top reaches the bottom of the screen, 1 once it has risen ~85% of the screen
      var p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.85)));
      var mobile = window.innerWidth <= 768;
      var s0 = mobile ? 0.82 : 1.05, s1 = mobile ? 0.96 : 1;
      var rot = 20 * (1 - p), scale = s0 + (s1 - s0) * p, ty = -60 * p;
      card.style.transform = 'rotateX(' + rot.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
      head.style.transform = 'translateY(' + ty.toFixed(1) + 'px)';
      wrapEl.style.setProperty('--glow', (0.25 + 0.75 * p).toFixed(3));
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
    var v = card.querySelector('video');
    var play = wrapEl.querySelector('.cscroll-play');
    if (play && typeof window.openLB === 'function') play.addEventListener('click', function () {
      window.openLB(play.dataset.video, play.dataset.title, play.dataset.story);
    });
    if (v) new IntersectionObserver(function (es) { if (es[0].isIntersecting) v.play().catch(function () {}); else v.pause(); }, { threshold: 0.15 }).observe(v);
  })();
})();
