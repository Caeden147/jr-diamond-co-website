// J&R Diamond Co — shared site interactions (nav, scroll reveal, before/after slider, lightbox)

function initMobileNav() {
  var burger = document.querySelector('[data-nav-burger]');
  var drawer = document.querySelector('[data-mobile-nav]');
  if (!burger || !drawer) return;

  var open = function () {
    drawer.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-locked');
  };
  var close = function () {
    drawer.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-locked');
  };
  var toggle = function () {
    if (drawer.classList.contains('is-open')) close(); else open();
  };

  burger.addEventListener('click', toggle);
  drawer.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', close);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 860) close();
  });
}

function initRevealOnScroll(root) {
  root = root || document;
  var els = root.querySelectorAll('[data-reveal],[data-reveal-group]');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) {
      el.classList.add('is-visible');
      Array.prototype.forEach.call(el.children, function (c) { c.classList.add('is-visible'); });
    });
    return;
  }
  var reveal = function (el) {
    if (el.hasAttribute('data-reveal-group')) {
      Array.prototype.forEach.call(el.children, function (child, i) {
        setTimeout(function () { child.classList.add('is-visible'); }, i * 70);
      });
    } else {
      el.classList.add('is-visible');
    }
  };
  var pending = [];
  var done = function (el) {
    var i = pending.indexOf(el);
    if (i > -1) pending.splice(i, 1);
    io.unobserve(el);
    reveal(el);
    if (!pending.length) window.removeEventListener('scroll', onScroll);
  };

  // threshold must stay 0: a percentage threshold is unreachable for any element
  // taller than (1 / threshold) viewports — the single-column masonry is ~11000px,
  // so the old 16% threshold could never be met and the whole grid stayed invisible.
  // rootMargin supplies the slight delay the threshold used to give.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) done(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -80px 0px' });

  // IntersectionObserver only reports state *changes*. Something that goes from
  // below the viewport to above it in a single jump — anchor link, browser scroll
  // restoration, fast flick — never intersects, so no callback ever fires and it
  // would stay hidden for good. This sweep catches anything we blew past.
  var ticking = false;
  var sweep = function () {
    ticking = false;
    pending.slice().forEach(function (el) {
      if (el.getBoundingClientRect().bottom < 0) done(el);
    });
  };
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(sweep);
  }

  els.forEach(function (el) {
    var rect = el.getBoundingClientRect();
    // already scrolled past, or already on screen at load — reveal without waiting
    if (rect.bottom < 0 || rect.top < window.innerHeight) { reveal(el); return; }
    pending.push(el);
    io.observe(el);
  });
  if (pending.length) window.addEventListener('scroll', onScroll, { passive: true });
}

function initBeforeAfter(root) {
  root = root || document;
  root.querySelectorAll('[data-ba]').forEach(function (el) {
    var before = el.querySelector('[data-ba-before]');
    var handle = el.querySelector('[data-ba-handle]');
    if (!before || !handle) return;
    var pct = 50, dragging = false;
    var setPct = function (p) {
      pct = Math.min(100, Math.max(0, p));
      before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
      handle.style.left = pct + '%';
      handle.setAttribute('aria-valuenow', String(Math.round(pct)));
    };
    setPct(50);
    var move = function (clientX) {
      var r = el.getBoundingClientRect();
      setPct(((clientX - r.left) / r.width) * 100);
    };
    el.addEventListener('pointerdown', function (e) { dragging = true; move(e.clientX); e.preventDefault(); });
    window.addEventListener('pointermove', function (e) { if (dragging) move(e.clientX); });
    window.addEventListener('pointerup', function () { dragging = false; });
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 4;
      if (e.key === 'ArrowLeft') { setPct(pct - step); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setPct(pct + step); e.preventDefault(); }
      else if (e.key === 'Home') { setPct(0); e.preventDefault(); }
      else if (e.key === 'End') { setPct(100); e.preventDefault(); }
    });
  });
}

function initLightbox(root) {
  root = root || document;
  var items = Array.prototype.slice.call(root.querySelectorAll('[data-lightbox-item]'));
  if (!items.length) return;

  var overlay = document.getElementById('jr-lightbox');
  var imgEl = overlay.querySelector('[data-lb-img]');
  var capEl = overlay.querySelector('[data-lb-cap]');
  var idx = 0;

  var show = function (i) {
    idx = (i + items.length) % items.length;
    var it = items[idx];
    var innerImg = it.querySelector('img');
    var src = it.getAttribute('data-lightbox-src') || (innerImg && innerImg.src) || '';
    var alt = it.getAttribute('data-lightbox-alt') || (innerImg && innerImg.alt) || '';
    var cap = it.getAttribute('data-lightbox-caption') || '';
    imgEl.src = src; imgEl.alt = alt; capEl.textContent = cap;
  };
  var open = function (i) {
    show(i);
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var closeBtn = overlay.querySelector('[data-lb-close]');
    if (closeBtn) closeBtn.focus();
  };
  var close = function () {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  items.forEach(function (it, i) {
    it.addEventListener('click', function () { open(i); });
  });

  var closeBtn = overlay.querySelector('[data-lb-close]');
  var prevBtn = overlay.querySelector('[data-lb-prev]');
  var nextBtn = overlay.querySelector('[data-lb-next]');
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (prevBtn) prevBtn.addEventListener('click', function () { show(idx - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { show(idx + 1); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'ArrowLeft') show(idx - 1);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initMobileNav();
  initRevealOnScroll();
  initBeforeAfter();
  initLightbox();
});
