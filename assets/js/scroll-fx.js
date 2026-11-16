/*
 * Scroll animations, ported to vanilla JS from 21st.dev components:
 *  1. Hero frame-down — the clip-path-on-scroll technique from 21st.dev "Smooth Scroll Hero"
 *     (@uniquesonu/modern-hero): as the hero scrolls away, the video closes into a rounded,
 *     gold-edged frame.
 *  2. Zoom Parallax — @efferd/zoom-parallax: a 300vh pinned stage; 7 tiles scale from 1x to
 *     4x/5x/6x/5x/6x/8x/9x across the scroll, so the centre clip ends up filling the screen.
 *  3. Scroll Velocity Text — @cnippet-dev/scroll-velocity-text: two marquee rows run in
 *     opposite directions; speed = base * (1 + min(5, |scroll velocity| / 1000 * 5)) and
 *     scrolling up flips their direction.
 *  4. Text Reveal by word — @dillionverma (Magic UI) text-reveal: a 200vh pinned statement;
 *     word i lights up over scroll range [i/n, (i+1)/n].
 *  5. Parallax images — @pulkitxm/parallax-image: craft and bridal media drift on scroll.
 * Reduced-motion users get every section in its finished, static state.
 */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  if (reduce) { root.classList.add('sfx-static'); }

  var vh = window.innerHeight;
  addEventListener('resize', function () { vh = window.innerHeight; tick(); });

  /* ---------- 1. hero frame-down ---------- */
  var hero = document.querySelector('.hero');
  var heroLayers = hero ? [hero.querySelector('.hero-media'), hero.querySelector('.hero-fx')].filter(Boolean) : [];
  function heroFrame() {
    if (!hero || reduce) return;
    var h = hero.offsetHeight || 1;
    var s = Math.max(0, Math.min(1, window.scrollY / (h * 0.85)));
    var e = s * s * (3 - 2 * s);                                   // smoothstep
    var clip = 'inset(' + (e * 7).toFixed(2) + '% ' + (e * 5).toFixed(2) + '% ' + (e * 7).toFixed(2) + '% ' + (e * 5).toFixed(2) + '% round ' + (e * 30).toFixed(1) + 'px)';
    heroLayers.forEach(function (l) { l.style.clipPath = clip; l.style.webkitClipPath = clip; });
    hero.style.setProperty('--frame', e.toFixed(3));
  }

  /* ---------- 2. zoom parallax ---------- */
  var zp = document.querySelector('.zp');
  var zpTiles = zp ? [].slice.call(zp.querySelectorAll('.zp-tile')) : [];
  var SCALES = [4, 5, 6, 5, 6, 8, 9];
  var zpCaption = zp ? zp.querySelector('.zp-caption') : null;
  function zoomParallax() {
    if (!zp || reduce) return;
    var r = zp.getBoundingClientRect();
    var total = zp.offsetHeight - vh;
    var p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;  // offset ['start start','end end']
    if (r.bottom < 0 || r.top > vh) return;
    zpTiles.forEach(function (t, i) {
      var sc = 1 + (SCALES[i % SCALES.length] - 1) * p;
      t.style.transform = 'scale(' + sc.toFixed(4) + ')';
    });
    if (zpCaption) {
      zpCaption.style.opacity = String(Math.max(0, 1 - p * 3.2).toFixed(3));
      zpCaption.style.transform = 'translateY(' + (-p * 120).toFixed(1) + 'px)';
    }
    zp.style.setProperty('--zp', p.toFixed(3));
    var v = zp.querySelector('video');
    if (v) { if (r.top < vh && r.bottom > 0) v.play().catch(function () {}); else v.pause(); }
  }

  /* ---------- 4. text reveal by word ---------- */
  var tr = document.querySelector('.treveal');
  var trWords = [];
  if (tr) {
    var p = tr.querySelector('.treveal-text');
    var words = p.textContent.trim().split(/\s+/);
    p.setAttribute('aria-label', p.textContent.trim());
    p.innerHTML = words.map(function (w) {
      var gold = /^(promise|hands|family|generations|inherit\.?|heirloom)/i.test(w) ? ' tw-gold' : '';
      return '<span class="tw' + gold + '" aria-hidden="true"><span class="tw-ghost">' + w + '</span><span class="tw-ink">' + w + '</span></span>';
    }).join(' ');
    trWords = [].slice.call(p.querySelectorAll('.tw-ink'));
  }
  function textReveal() {
    if (!tr || reduce) return;
    var r = tr.getBoundingClientRect();
    var total = tr.offsetHeight - vh;
    if (r.bottom < 0 || r.top > vh) return;
    var prog = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 1;
    var n = trWords.length;
    for (var i = 0; i < n; i++) {
      var o = Math.max(0, Math.min(1, (prog - i / n) * n));       // useTransform(progress,[i/n,(i+1)/n],[0,1])
      trWords[i].style.opacity = o.toFixed(3);
    }
  }

  /* ---------- 5. parallax images ---------- */
  var plx = [].slice.call(document.querySelectorAll('[data-parallax]'));
  function parallax() {
    if (reduce) return;
    plx.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var k = parseFloat(el.getAttribute('data-parallax')) || 0.12;
      var off = ((r.top + r.height / 2) - vh / 2) * -k;
      el.style.setProperty('--plx', off.toFixed(1) + 'px');
    });
  }

  var ticking = false;
  function tick() { ticking = false; heroFrame(); zoomParallax(); textReveal(); parallax(); }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
  tick();
  setTimeout(tick, 300);

  /* ---------- 3. scroll velocity marquee ---------- */
  var rows = [].slice.call(document.querySelectorAll('.svt-row'));
  if (!rows.length) return;
  var lastY = window.scrollY, lastT = performance.now(), vel = 0, smooth = 0;
  var state = rows.map(function (row) {
    var track = row.querySelector('.svt-track');
    var block = track.firstElementChild;
    // copies so the row never runs out: max(3, ceil(container / block) + 2)
    var copies = Math.max(3, Math.ceil(row.offsetWidth / Math.max(1, block.scrollWidth)) + 2);
    for (var c = 1; c < copies; c++) { var cl = block.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); track.appendChild(cl); }
    var dir = parseFloat(row.getAttribute('data-dir')) || 1;
    return { row: row, track: track, block: block, x: 0, base: parseFloat(row.getAttribute('data-speed')) || 3, baseDir: dir, dir: dir, inView: true };
  });
  state.forEach(function (s) {
    new IntersectionObserver(function (e) { s.inView = e[0].isIntersecting; }).observe(s.row);
  });
  var prev = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    var y = window.scrollY, t = now;
    var instant = (y - lastY) / Math.max(0.001, (t - lastT) / 1000);
    lastY = y; lastT = t;
    vel = instant;
    smooth += (vel - smooth) * Math.min(1, dt * 12);                 // spring-ish smoothing
    var factor = Math.min(5, (Math.abs(smooth) / 1000) * 5);
    state.forEach(function (s) {
      if (!s.inView || document.visibilityState !== 'visible') return;
      if (factor > 0.1) s.dir = s.baseDir * (smooth >= 0 ? 1 : -1);
      var bw = s.block.scrollWidth || 1;
      var pps = (bw * s.base) / 100;
      var mult = reduce ? 1 : 1 + factor;
      s.x += s.dir * pps * mult * dt;
      var w = ((s.x % bw) + bw) % bw;
      s.track.style.transform = 'translate3d(' + (-w).toFixed(2) + 'px,0,0)';
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
