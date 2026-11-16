/*
 * Hero upgrade.
 *  - Curtain intro: two gold-seamed panels part to reveal the hero (first visit per session).
 *  - Depth Parallax Words — 21st.dev @educalvolpz/depth-parallax-words: each word arrives
 *    from its own depth (blur 3px, scale .92, y 18px -> rest, 0.7s, 70ms stagger,
 *    ease [0.22,1,0.36,1]).
 *  - Liquid Metal (gold, text-clipped mode) — 21st.dev @educalvolpz/liquid-metal: the
 *    gold gradient sweeps through "hold a story." every 9s and shifts with the pointer.
 *  - Depth parallax: video, effects and text move at different depths with the pointer
 *    (desktop) and with scroll (all devices), so the hero reads as layered 3D space.
 */
(function () {
  var hero = document.querySelector('.hero');
  if (!hero) return;
  document.documentElement.classList.add('hero-ready');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var media = hero.querySelector('.hero-media');
  var fx = hero.querySelector('.hero-fx');
  var content = hero.querySelector('.hero-content');
  var gold = hero.querySelector('.liquid-gold');
  var shade = hero.querySelector('.hero-shade');

  if (reduce) { document.documentElement.classList.add('hero-static'); if (gold) gold.classList.add('lg-on'); return; }

  /* ---- curtain intro (once per session) ---- */
  var seen = !document.documentElement.classList.contains('intro'); // decided by the inline <head> script
  var curtain = document.querySelector('.hero-curtain');
  var wordDelay = 150;
  if (curtain && !seen) {
    wordDelay = 1050;
    document.documentElement.classList.add('intro-running');
    curtain.classList.add('hc-play');
    setTimeout(function () { document.documentElement.classList.remove('intro-running'); }, 1500);
    setTimeout(function () { curtain.classList.add('hc-open'); }, 520);
    setTimeout(function () { curtain.remove(); }, 2100);
  } else if (curtain) { curtain.remove(); }

  /* ---- depth parallax words ---- */
  var words = [].slice.call(hero.querySelectorAll('.dpw .w'));
  words.forEach(function (w, i) { w.style.animationDelay = (wordDelay + i * 70) + 'ms'; });
  var lines = [].slice.call(hero.querySelectorAll('.dpl'));
  lines.forEach(function (l, i) { l.style.animationDelay = (wordDelay + words.length * 70 + 120 + i * 110) + 'ms'; });
  hero.classList.add('dpw-go');
  // settle everything in its final state even if animations are throttled (background tab, low-power mode)
  setTimeout(function () { hero.classList.add('dpw-done'); }, wordDelay + words.length * 70 + lines.length * 110 + 1400);
  // switch the gold words to liquid metal once they have landed
  setTimeout(function () { if (gold) gold.classList.add('lg-on'); }, wordDelay + words.length * 70 + 750);

  /* ---- liquid gold sweep + pointer ---- */
  var ptrX = 0, ptrY = 0, tx = 0, ty = 0, inView = true, raf = 0, t0 = performance.now();
  new IntersectionObserver(function (e) { inView = e[0].isIntersecting; if (inView) kick(); }).observe(hero);
  if (fine) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; kick(); });
  }
  addEventListener('scroll', kick, { passive: true });

  function frame(now) {
    raf = 0;
    if (!inView || document.visibilityState !== 'visible') return;
    ptrX += (tx - ptrX) * 0.08; ptrY += (ty - ptrY) * 0.08;
    var h = hero.offsetHeight || 1;
    var s = Math.max(0, Math.min(1, window.scrollY / h));       // 0 at top, 1 when hero has scrolled away

    if (media) media.style.transform = 'translate3d(' + (-ptrX * 18).toFixed(2) + 'px,' + (-ptrY * 12 + s * h * 0.28).toFixed(2) + 'px,0) scale(' + (1.06 + s * 0.1).toFixed(4) + ')';
    if (fx) fx.style.transform = 'translate3d(' + (-ptrX * 8).toFixed(2) + 'px,' + (-ptrY * 6 + s * h * 0.18).toFixed(2) + 'px,0)';
    if (content) {
      content.style.transform = 'translate3d(' + (ptrX * 10).toFixed(2) + 'px,' + (ptrY * 6 - s * 90).toFixed(2) + 'px,0)';
      content.style.opacity = String(Math.max(0, 1 - s * 1.35).toFixed(3));
    }
    if (shade) shade.style.opacity = (s * 0.75).toFixed(3);

    if (gold && gold.classList.contains('lg-on')) {
      var cycle = (((now - t0) / 1000) / 9) % 1;
      gold.style.backgroundPosition = (cycle * 100 + ptrX * 18).toFixed(2) + '% 50%';
    }
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', kick);
  kick();
})();
