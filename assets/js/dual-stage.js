/*
 * Dual Stage — two clips always playing in a floating showcase that stays on
 * screen across the whole landing page. Every few seconds the back card swaps
 * to the front and the next film loads behind it, cycling through every clip.
 * Tap a card to watch it full screen. It can be minimised to a small pill.
 */
(function () {
  var reels = [].slice.call(document.querySelectorAll('.reel[data-video]'));
  if (reels.length < 2) return;
  var clips = reels.map(function (r) {
    var v = r.querySelector('video');
    return { src: r.dataset.video, title: r.dataset.title, story: r.dataset.story || '', poster: v ? v.getAttribute('poster') : '' };
  });

  var KEY = 'aurum-dual-stage-min';
  function getMin() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function setMin(v) { try { sessionStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }

  var root = document.createElement('aside');
  root.className = 'dstage';
  root.setAttribute('aria-label', 'Now showing: two films from the collection');
  root.innerHTML =
    '<div class="dstage-aura" aria-hidden="true"></div>' +
    '<div class="dstage-cards"></div>' +
    '<div class="dstage-meta"><span class="dstage-live"><i></i>Now showing</span><strong class="dstage-title"></strong></div>' +
    '<button class="dstage-min" type="button" aria-label="Minimise films">&minus;</button>' +
    '<button class="dstage-pill" type="button" aria-label="Show films"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg>2 Films</button>';
  document.body.appendChild(root);

  var cardsEl = root.querySelector('.dstage-cards');
  var titleEl = root.querySelector('.dstage-title');
  var cards = [0, 1].map(function () {
    var c = document.createElement('button');
    c.type = 'button';
    c.className = 'dcard';
    c.innerHTML = '<span class="dcard-ring" aria-hidden="true"></span><span class="dcard-inner"><video muted loop playsinline preload="metadata"></video><span class="dcard-cap"></span></span>';
    cardsEl.appendChild(c);
    return { el: c, video: c.querySelector('video'), cap: c.querySelector('.dcard-cap'), idx: -1 };
  });

  function load(card, i) {
    var clip = clips[i % clips.length];
    card.idx = i % clips.length;
    card.video.poster = clip.poster;
    card.video.src = clip.src;
    card.cap.innerHTML = clip.title;
    card.el.setAttribute('aria-label', 'Play ' + clip.title.replace(/&amp;/g, '&') + ' full screen');
    if (shouldPlay()) card.video.play().catch(function () {});
  }

  var front = 0, next = 2, timer = 0;
  load(cards[0], 0);
  load(cards[1], 1);
  function paint() {
    cards[front].el.classList.add('is-front'); cards[front].el.classList.remove('is-back');
    cards[1 - front].el.classList.add('is-back'); cards[1 - front].el.classList.remove('is-front');
    titleEl.innerHTML = clips[cards[front].idx].title;
  }
  paint();

  function swap() {
    var oldFront = cards[front];
    front = 1 - front;
    root.classList.add('swapping');
    paint();
    setTimeout(function () {
      root.classList.remove('swapping');
      load(oldFront, next); // the card that went behind loads the next film
      next = (next + 1) % clips.length;
    }, 700);
  }

  function shouldPlay() { return !root.classList.contains('min') && document.visibilityState === 'visible' && !document.body.classList.contains('lb-open'); }
  function syncPlayback() {
    var on = shouldPlay();
    cards.forEach(function (c) { if (on) c.video.play().catch(function () {}); else c.video.pause(); });
    clearInterval(timer);
    if (on && !reduce) timer = setInterval(swap, 6500);
  }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  cards.forEach(function (c) {
    c.el.addEventListener('click', function () {
      var clip = clips[c.idx];
      if (typeof window.openLB === 'function') { document.body.classList.add('lb-open'); syncPlayback(); window.openLB(clip.src, clip.title, clip.story); }
    });
  });
  // resume when the full-screen player closes
  var lb = document.getElementById('lightbox');
  if (lb) new MutationObserver(function () {
    if (!lb.classList.contains('open') && document.body.classList.contains('lb-open')) { document.body.classList.remove('lb-open'); syncPlayback(); }
  }).observe(lb, { attributes: true, attributeFilter: ['class'] });

  root.querySelector('.dstage-min').addEventListener('click', function () { root.classList.add('min'); setMin(true); syncPlayback(); });
  root.querySelector('.dstage-pill').addEventListener('click', function () { root.classList.remove('min'); setMin(false); syncPlayback(); });
  if (getMin()) root.classList.add('min');

  // step aside while someone is typing in the enquiry form (phones especially)
  document.addEventListener('focusin', function (e) { if (e.target.matches('input,select,textarea')) root.classList.add('away'); });
  document.addEventListener('focusout', function (e) { if (e.target.matches('input,select,textarea')) root.classList.remove('away'); });

  document.addEventListener('visibilitychange', syncPlayback);
  setTimeout(function () { root.classList.add('ready'); syncPlayback(); }, 80);
})();
