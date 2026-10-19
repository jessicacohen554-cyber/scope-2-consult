/* Shared behaviour: nav highlight + progress, reveal, scrolly steps, tabs,
   segmented toggles, steppers, matrix cells. No dependencies. */
(function () {
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // current page in nav
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === here || (here === '' && href === 'index.html')) a.setAttribute('aria-current', 'page');
  });
  var cur = document.querySelector('.nav-links a[aria-current="page"]');
  if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }

  // reading progress
  var bar = document.querySelector('.progress');
  function prog() {
    if (!bar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + '%';
  }
  window.addEventListener('scroll', prog, { passive: true }); prog();

  // reveal
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { threshold: 0.08 });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else { revealEls.forEach(function (el) { el.classList.add('in'); }); }

  // scrolly: activate step nearest viewport centre; sync figure via data-step
  document.querySelectorAll('.scrolly').forEach(function (sc) {
    var steps = Array.prototype.slice.call(sc.querySelectorAll('.step'));
    var fig = sc.querySelector('.scrolly-figure');
    if (!steps.length) return;
    function setStep(i) {
      steps.forEach(function (s, j) { s.classList.toggle('is-active', i === j); });
      if (fig) {
        fig.setAttribute('data-active', String(i));
        fig.querySelectorAll('[data-step]').forEach(function (el) {
          var spec = el.getAttribute('data-step'); // "2" or "1-3" or "0,2"
          var on = false;
          spec.split(',').forEach(function (p) {
            p = p.trim();
            if (p.indexOf('-') > 0) { var r = p.split('-'); if (i >= +r[0] && i <= +r[1]) on = true; }
            else if (+p === i) on = true;
          });
          el.classList.toggle('dim', !on);
          el.style.opacity = on ? '' : '';
        });
        fig.querySelectorAll('[data-show]').forEach(function (el) {
          var spec = el.getAttribute('data-show'); var on = false;
          spec.split(',').forEach(function (p) {
            p = p.trim();
            if (p.indexOf('-') > 0) { var r = p.split('-'); if (i >= +r[0] && i <= +r[1]) on = true; }
            else if (+p === i) on = true;
          });
          el.style.visibility = on ? 'visible' : 'hidden';
        });
        var ev; try { ev = new CustomEvent('scrollystep', { detail: { index: i } }); } catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('scrollystep', true, true, { index: i }); }
        sc.dispatchEvent(ev);
      }
    }
    var active = 0; setStep(0);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { var i = steps.indexOf(e.target); if (i !== active) { active = i; setStep(i); } } });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      steps.forEach(function (s) { io.observe(s); });
    }
  });


  // wide figures on narrow screens: let the drawing keep a readable scale and scroll sideways
  function wideFigs() {
    document.querySelectorAll('figure svg[viewBox]').forEach(function (svg) {
      var vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      var w = vb[2] || 0, fig = svg.closest('figure'); if (!fig || !w) return;
      var cw = fig.clientWidth;
      if (w >= 520 && cw < 440) {
        var wrap = svg.parentNode;
        if (!wrap.classList || !wrap.classList.contains('fig-scroll')) {
          wrap = document.createElement('div'); wrap.className = 'fig-scroll';
          svg.parentNode.insertBefore(wrap, svg); wrap.appendChild(svg);
        }
        svg.style.minWidth = Math.min(w, 600) + 'px';
      } else { svg.style.minWidth = ''; }
    });
  }
  wideFigs(); window.addEventListener('resize', wideFigs);

  // tabs
  document.querySelectorAll('.tabs').forEach(function (tabs) {
    var btns = tabs.querySelectorAll('button[role="tab"]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { o.setAttribute('aria-selected', o === b ? 'true' : 'false'); var p = document.getElementById(o.getAttribute('aria-controls')); if (p) p.hidden = o !== b; });
      });
    });
  });

  // segmented toggles: buttons with data-value; container has data-target (element whose data-mode is set)
  document.querySelectorAll('.seg').forEach(function (seg) {
    var btns = seg.querySelectorAll('button');
    var targetSel = seg.getAttribute('data-target');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        var v = b.getAttribute('data-value');
        if (targetSel) document.querySelectorAll(targetSel).forEach(function (t) {
          t.setAttribute('data-mode', v);
          t.querySelectorAll('[data-mode-show]').forEach(function (el) { el.hidden = el.getAttribute('data-mode-show').split(',').indexOf(v) < 0; });
        });
        var ev; try { ev = new CustomEvent('segchange', { detail: { value: v } }); } catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('segchange', true, true, { value: v }); }
        seg.dispatchEvent(ev);
      });
    });
  });

  // steppers: .stepper[data-target] with .prev/.next; target gets data-frame=N, children [data-frame] shown when matching
  document.querySelectorAll('.stepper').forEach(function (st) {
    var target = document.querySelector(st.getAttribute('data-target'));
    if (!target) return;
    var frames = target.querySelectorAll('[data-frame]');
    var n = 0; frames.forEach(function (f) { var v = +f.getAttribute('data-frame').split('-')[0]; if (v + 1 > n) n = v + 1; });
    var max = +(st.getAttribute('data-frames') || n);
    var i = 0, count = st.querySelector('.count'), prev = st.querySelector('.prev'), next = st.querySelector('.next');
    function render() {
      target.setAttribute('data-frame', String(i));
      frames.forEach(function (f) {
        var spec = f.getAttribute('data-frame'); var on = false;
        spec.split(',').forEach(function (p) { p = p.trim(); if (p.indexOf('-') > 0) { var r = p.split('-'); if (i >= +r[0] && i <= +r[1]) on = true; } else if (+p === i) on = true; });
        f.style.visibility = on ? 'visible' : 'hidden';
      });
      target.querySelectorAll('[data-frame-text]').forEach(function (el) { var t = el.getAttribute('data-frame-text').split('|'); el.textContent = t[Math.min(i, t.length - 1)] || ''; });
      var caps = st.parentNode.querySelectorAll('[data-frame-caption]');
      caps.forEach(function (c) { c.hidden = +c.getAttribute('data-frame-caption') !== i; });
      if (count) count.textContent = (i + 1) + ' / ' + max;
      if (prev) prev.disabled = i === 0; if (next) next.disabled = i === max - 1;
      var ev; try { ev = new CustomEvent('frame', { detail: { index: i } }); } catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('frame', true, true, { index: i }); }
      st.dispatchEvent(ev);
    }
    if (prev) prev.addEventListener('click', function () { if (i > 0) { i--; render(); } });
    if (next) next.addEventListener('click', function () { if (i < max - 1) { i++; render(); } });
    render();
  });

  // matrix cells: .matrix .cell[data-detail] -> shows #id inside .matrix-detail
  document.querySelectorAll('.matrix').forEach(function (m) {
    var cells = m.querySelectorAll('.cell');
    var detail = m.parentNode.querySelector('.matrix-detail');
    cells.forEach(function (c) {
      c.addEventListener('click', function () {
        cells.forEach(function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
        if (detail) detail.querySelectorAll('[data-detail-for]').forEach(function (d) { d.hidden = d.getAttribute('data-detail-for') !== c.getAttribute('data-detail'); });
      });
    });
    var first = m.querySelector('.cell[aria-pressed="true"]') || cells[0];
    if (first) first.click();
  });
})();
