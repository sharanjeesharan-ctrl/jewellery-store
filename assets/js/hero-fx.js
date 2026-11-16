/*
 * Hero video effects — vanilla ports of three 21st.dev components, re-coloured for gold:
 *  1. God Rays    — 21st.dev @paper-design/god-rays (Shader Builder), adapted from
 *                   Paper Shaders (https://shaders.paper.design/god-rays), Apache-2.0.
 *  2. Sparkles    — 21st.dev @lepikhinb/sparkles (tsparticles), re-implemented on a
 *                   plain canvas with the same density / speed / twinkle parameters.
 *  3. Spotlight   — 21st.dev @ruixen.ui/spotlight-background: a soft glow that follows
 *                   the cursor and shrinks while moving, grows when idle.
 * Everything pauses when the hero is off-screen or the tab is hidden, and is skipped
 * entirely for prefers-reduced-motion and Save-Data users.
 */
(function () {
  var hero = document.querySelector('.hero');
  var fx = document.querySelector('.hero-fx');
  if (!hero || !fx) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  if (reduce || saveData) { fx.classList.add('fx-static'); return; }

  var isPhone = window.matchMedia('(max-width: 600px)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var inView = true, visible = document.visibilityState === 'visible';
  var loops = [];
  function running() { return inView && visible; }
  function kick() { loops.forEach(function (l) { l.start(); }); }

  new IntersectionObserver(function (e) { inView = e[0].isIntersecting; if (inView) kick(); }).observe(hero);
  document.addEventListener('visibilitychange', function () { visible = document.visibilityState === 'visible'; if (visible) kick(); });

  /* ---------- 1. God Rays (WebGL) ---------- */
  (function godRays() {
    var canvas = fx.querySelector('.fx-rays');
    var gl = canvas && canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) { if (canvas) canvas.remove(); return; }

    var VERT = 'attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}';
    var FRAG = [
      '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
      'uniform vec3 u_colors[4];',
      'uniform vec4 u_scene;   // res.xy, time, unused',
      'uniform vec4 u_shape;   // scale, intensity, paramA, grain',
      'uniform vec2 u_origin;',
      'float hash21(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}',
      'float grainHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}',
      'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
      ' return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),u.x),mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),u.x),u.y);}',
      'float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17.0,9.2);a*=0.5;}return v;}',
      'vec3 palette(float x){float f=clamp(x,0.0,1.0)*3.0;vec3 col=u_colors[0];',
      ' col=mix(col,u_colors[1],smoothstep(0.0,1.0,clamp(f,0.0,1.0)));',
      ' col=mix(col,u_colors[2],smoothstep(0.0,1.0,clamp(f-1.0,0.0,1.0)));',
      ' col=mix(col,u_colors[3],smoothstep(0.0,1.0,clamp(f-2.0,0.0,1.0)));return col;}',
      'void main(){',
      ' vec2 res=u_scene.xy;float t=u_scene.z;',
      ' vec2 p=(gl_FragCoord.xy-0.5*res)/min(res.x,res.y);',
      ' p*=u_shape.x;',
      ' vec2 q=p-u_origin;',
      ' float angle=atan(q.y,q.x);float radius=length(q);',
      ' float density=5.0+u_shape.y*18.0;',
      ' float n=fbm(vec2(angle*density*0.16+1.0,radius*1.7-t*0.08));',
      ' float rays=pow(max(0.0,sin(angle*density+n*5.0+t*0.16)),5.0);',
      ' rays*=exp(-radius*1.15)*(1.0-smoothstep(0.05,1.1,radius));',
      ' float bloom=exp(-radius*(9.0-u_shape.z*6.0));',
      ' float v=clamp(rays*(0.8+u_shape.y)+bloom*(0.25+u_shape.z),0.0,1.0);',
      ' vec3 col=palette(v);',
      ' col+=(grainHash(gl_FragCoord.xy+vec2(17.0,31.0))-0.5)*u_shape.w;',
      ' gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);',
      '}'
    ].join('\n');

    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Gold palette (black base so it can be screen-blended over the video)
    gl.uniform3fv(gl.getUniformLocation(prog, 'u_colors'), new Float32Array([
      0.0, 0.0, 0.0,
      0.30, 0.17, 0.05,
      0.79, 0.65, 0.42,
      1.0, 0.93, 0.76
    ]));
    gl.uniform4f(gl.getUniformLocation(prog, 'u_shape'), 1.15, 0.35, 0.28, 0.035);
    // light falls from the top, over the necklace (right of centre on desktop)
    gl.uniform2f(gl.getUniformLocation(prog, 'u_origin'), isPhone ? 0.15 : 0.32, 0.62);
    var uScene = gl.getUniformLocation(prog, 'u_scene');

    var budget = isPhone ? 450000 : 1600000, raf = 0, t0 = performance.now();
    function resize() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, r.width * dpr), h = Math.max(1, r.height * dpr);
      var k = Math.min(1, Math.sqrt(budget / (w * h)));
      w = Math.round(w * k); h = Math.round(h * k);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }
    function frame(now) {
      raf = 0; if (!running()) return;
      resize();
      gl.uniform4f(uScene, canvas.width, canvas.height, (now - t0) / 1000 * 0.575, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    loops.push({ start: function () { if (!raf && running()) raf = requestAnimationFrame(frame); } });
    addEventListener('resize', resize);
  })();

  /* ---------- 2. Sparkles (gold dust) ---------- */
  (function sparkles() {
    var canvas = fx.querySelector('.fx-sparkles');
    var ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;
    // Same knobs as the 21st.dev component: density, size, speed, opacity, opacitySpeed
    var opt = { density: isPhone ? 70 : 160, size: 1.6, speed: 0.35, opacity: 1, opacitySpeed: 1.6 };
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, parts = [], raf = 0, last = 0;
    var colors = ['#f3e6c6', '#e7d1a3', '#d8b878', '#ffffff'];
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function make(p) {
      p = p || {};
      p.x = rnd(0, W); p.y = rnd(0, H);
      var a = rnd(0, Math.PI * 2), s = rnd(opt.speed / 10, opt.speed);
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - opt.speed * 0.35; // gentle upward drift
      p.r = rnd(opt.size / 2.5, opt.size) * dpr;
      p.o = rnd(opt.opacity / 10, opt.opacity); p.do = rnd(0.3, 1) * opt.opacitySpeed * (Math.random() < .5 ? -1 : 1);
      p.c = colors[(Math.random() * colors.length) | 0];
      p.star = Math.random() < 0.08; // a few cross-shaped glints
      return p;
    }
    function resize() {
      var r = canvas.getBoundingClientRect();
      W = canvas.width = Math.round(r.width * dpr); H = canvas.height = Math.round(r.height * dpr);
      var n = Math.round(opt.density * (r.width * r.height) / (1440 * 800));
      n = Math.max(40, Math.min(n, 260));
      parts.length = 0; for (var i = 0; i < n; i++) parts.push(make());
    }
    function frame(now) {
      raf = 0; if (!running()) { last = 0; return; }
      var dt = last ? Math.min((now - last) / 16.67, 3) : 1; last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx * dt * dpr; p.y += p.vy * dt * dpr;
        p.o += p.do * 0.01 * dt;
        if (p.o > opt.opacity) { p.o = opt.opacity; p.do = -Math.abs(p.do); }
        if (p.o < 0.05) { p.o = 0.05; p.do = Math.abs(p.do); }
        if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) { make(p); p.y = H + 5; }
        ctx.globalAlpha = p.o;
        ctx.fillStyle = p.c;
        if (p.star) {
          var L = p.r * 4;
          ctx.fillRect(p.x - L, p.y - p.r * 0.25, L * 2, p.r * 0.5);
          ctx.fillRect(p.x - p.r * 0.25, p.y - L, p.r * 0.5, L * 2);
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    resize();
    addEventListener('resize', resize);
    loops.push({ start: function () { if (!raf && running()) raf = requestAnimationFrame(frame); } });
  })();

  /* ---------- 3. Cursor spotlight (desktop only) ---------- */
  (function spotlight() {
    var spot = fx.querySelector('.fx-spot');
    if (!spot) return;
    if (!finePointer) { spot.remove(); return; }
    var timer = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      spot.style.transform = 'translate(' + (e.clientX - r.left) + 'px,' + (e.clientY - r.top) + 'px) translate(-50%,-50%)';
      spot.classList.add('on', 'moving');
      clearTimeout(timer);
      timer = setTimeout(function () { spot.classList.remove('moving'); }, 150);
    });
    hero.addEventListener('pointerleave', function () { spot.classList.remove('on'); });
  })();

  kick();
})();
