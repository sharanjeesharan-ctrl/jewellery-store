/*
 * 3D Card Effect — Aceternity UI (21st.dev), ported from React to vanilla JS.
 * CardContainer: perspective 1000px; on mouse move the card rotates
 *   rotateY((x - w/2) / 25) rotateX((y - h/2) / 25); it resets on leave.
 * CardItem: while the pointer is over the card, each item moves to
 *   translateX/Y/Z + rotateX/Y/Z from its data-* attributes (tx, ty, tz, rx, ry, rz),
 *   and returns to 0 when it leaves. Transitions: 200ms linear.
 * Added for phones (the original is mouse-only): touch drag tilts the card too.
 */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  [].slice.call(document.querySelectorAll('.cc-container')).forEach(function (container) {
    var card = container.querySelector('.cc-card');
    if (!card) return;
    var items = [].slice.call(card.querySelectorAll('.cc-item'));
    function num(el, k) { return parseFloat(el.getAttribute('data-' + k)) || 0; }
    function lift(on) {
      card.classList.toggle('cc-on', on);
      items.forEach(function (el) {
        el.style.transform = on
          ? 'translateX(' + num(el, 'tx') + 'px) translateY(' + num(el, 'ty') + 'px) translateZ(' + num(el, 'tz') + 'px) rotateX(' + num(el, 'rx') + 'deg) rotateY(' + num(el, 'ry') + 'deg) rotateZ(' + num(el, 'rz') + 'deg)'
          : 'translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
      });
    }
    function tilt(cx, cy) {
      var r = card.getBoundingClientRect();
      var x = (cx - r.left - r.width / 2) / 25;
      var y = (cy - r.top - r.height / 2) / 25;
      card.style.transform = 'rotateY(' + x + 'deg) rotateX(' + y + 'deg)';
    }
    function reset() { card.style.transform = 'rotateY(0deg) rotateX(0deg)'; lift(false); }
    card.addEventListener('mouseenter', function () { lift(true); });
    card.addEventListener('mousemove', function (e) { tilt(e.clientX, e.clientY); });
    card.addEventListener('mouseleave', reset);
    card.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) { lift(true); tilt(t.clientX, t.clientY); } }, { passive: true });
    card.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) tilt(t.clientX, t.clientY); }, { passive: true });
    card.addEventListener('touchend', function () { setTimeout(reset, 350); });
  });
})();
