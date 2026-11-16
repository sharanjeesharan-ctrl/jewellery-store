/*
 * CSS Box — 21st.dev "css-box" (React + motion) ported to vanilla JS.
 * A width x height x depth cube built from 6 faces:
 *   front  rotateY(0)    translateZ(d/2)   back  rotateY(180) translateZ(d/2)
 *   right  rotateY(90)   translateZ(w/2)   left  rotateY(-90) translateZ(w/2)
 *   top    rotateX(90)   translateZ(h/2)   bottom rotateX(-90) translateZ(h/2)
 * The body is translateZ(-d/2) rotateX(x) rotateY(y), with x/y driven by a spring
 * (stiffness 100, damping 30, mass 1). Dragging sets x = startX - dy/2, y = startY + dx/2.
 * API (like the ref): showFront/Back/Left/Right/Top/Bottom, rotateTo(x, y).
 * Additions: buttons wired to the API, a slow idle spin after 4s untouched (off for
 * reduced motion), touch-action:none on the box so dragging it doesn't scroll the page.
 */
(function () {
  [].slice.call(document.querySelectorAll('[data-cssbox]')).forEach(function (host) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var body = host.querySelector('.cb-body');
    var faces = {};
    ['front', 'back', 'right', 'left', 'top', 'bottom'].forEach(function (k) { faces[k] = host.querySelector('.cb-' + k); });
    var W, H, D;
    function layout() {
      var s = host.getBoundingClientRect().width || 240;
      W = H = D = Math.round(s);
      host.style.height = H + 'px';
      host.style.perspective = (parseFloat(host.getAttribute('data-perspective')) || 600) + 'px';
      var set = function (el, w, h, l, t, tr) { el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.transform = tr; };
      set(faces.front, W, H, 0, 0, 'rotateY(0deg) translateZ(' + D / 2 + 'px)');
      set(faces.back, W, H, 0, 0, 'rotateY(180deg) translateZ(' + D / 2 + 'px)');
      set(faces.right, D, H, (W - D) / 2, 0, 'rotateY(90deg) translateZ(' + W / 2 + 'px)');
      set(faces.left, D, H, (W - D) / 2, 0, 'rotateY(-90deg) translateZ(' + W / 2 + 'px)');
      set(faces.top, W, D, 0, (H - D) / 2, 'rotateX(90deg) translateZ(' + H / 2 + 'px)');
      set(faces.bottom, W, D, 0, (H - D) / 2, 'rotateX(-90deg) translateZ(' + H / 2 + 'px)');
    }
    layout(); addEventListener('resize', layout);

    // spring state
    var tx = -14, ty = 28, x = tx, y = ty, vx = 0, vy = 0;
    var K = 100, C = 30, raf = 0, last = 0, lastTouch = performance.now();
    function frame(now) {
      raf = 0;
      var dt = last ? Math.min(0.032, (now - last) / 1000) : 0.016; last = now;
      if (!dragging && !reduce && now - lastTouch > 4000 && host.dataset.inview === '1') ty += 9 * dt;   // idle spin
      var ax = K * (tx - x) - C * vx, ay = K * (ty - y) - C * vy;
      vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt;
      if (reduce) { x = tx; y = ty; }
      body.style.transform = 'translateZ(-' + D / 2 + 'px) rotateX(' + x.toFixed(2) + 'deg) rotateY(' + y.toFixed(2) + 'deg)';
      var settled = Math.abs(tx - x) < 0.01 && Math.abs(ty - y) < 0.01 && Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01;
      var spinning = !reduce && !dragging && host.dataset.inview === '1';
      if (!settled || dragging || spinning) raf = requestAnimationFrame(frame); else last = 0;
    }
    function go() { if (!raf) raf = requestAnimationFrame(frame); }
    function rotateTo(nx, ny) {
      // take the short way round from wherever the box is now
      var cy = y, cx = x;
      ny = cy + ((((ny - cy) % 360) + 540) % 360) - 180;
      nx = cx + ((((nx - cx) % 360) + 540) % 360) - 180;
      tx = nx; ty = ny; lastTouch = performance.now(); go();
    }
    var api = {
      showFront: function () { rotateTo(0, 0); }, showBack: function () { rotateTo(0, 180); },
      showLeft: function () { rotateTo(0, -90); }, showRight: function () { rotateTo(0, 90); },
      showTop: function () { rotateTo(-90, 0); }, showBottom: function () { rotateTo(90, 0); },
      rotateTo: rotateTo, getCurrentRotation: function () { return { x: tx, y: ty }; }
    };
    host.cssBox = api;

    // drag
    var dragging = false, sx = 0, sy = 0, rx0 = 0, ry0 = 0;
    function start(e) {
      var p = e.touches ? e.touches[0] : e; if (!p) return;
      dragging = true; sx = p.clientX; sy = p.clientY; rx0 = tx; ry0 = ty; lastTouch = performance.now();
      host.classList.add('cb-dragging'); go();
    }
    function move(e) {
      if (!dragging) return;
      var p = e.touches ? e.touches[0] : e; if (!p) return;
      tx = rx0 - (p.clientY - sy) / 2; ty = ry0 + (p.clientX - sx) / 2; lastTouch = performance.now();
    }
    function end() { if (!dragging) return; dragging = false; host.classList.remove('cb-dragging'); lastTouch = performance.now(); go(); }
    host.addEventListener('mousedown', function (e) { e.preventDefault(); start(e); });
    host.addEventListener('touchstart', start, { passive: true });
    addEventListener('mousemove', move); addEventListener('mouseup', end);
    addEventListener('touchmove', move, { passive: true }); addEventListener('touchend', end);

    // face buttons
    var wrap = host.closest('.cb-wrap') || document;
    [].slice.call(wrap.querySelectorAll('[data-cb-show]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-cb-show'); api['show' + k.charAt(0).toUpperCase() + k.slice(1)]();
        [].slice.call(wrap.querySelectorAll('[data-cb-show]')).forEach(function (o) { o.classList.toggle('on', o === b); });
      });
    });

    new IntersectionObserver(function (e) { host.dataset.inview = e[0].isIntersecting ? '1' : '0'; if (e[0].isIntersecting) go(); }).observe(host);
    go();
  });
})();
