// J&R Diamond Co — Cal.com booking widget (package selector + inline embed)
//
// Cal.com event-type slugs/durations below are tied to the Cal.com account
// structure, not the CMS — if packages are renamed, reordered, or replaced in
// Cal.com, update PACKAGES to match. The index (0-3) is kept aligned with the
// data-package convention already used by services.html/contact.html/
// data/packages.json so all three stay in sync by position.

var CAL_USERNAME = 'caeden-morris-bfrjtx';

var PACKAGES = [
  { slug: 'detail', duration: 120 },
  { slug: 'interior-detailing1', duration: 90 },
  { slug: 'glass-treatment', duration: 45 },
  { slug: 'maintnance-plans', duration: 60 }
];

function calLinkFor(idx) {
  var pkg = PACKAGES[idx];
  return pkg ? CAL_USERNAME + '/' + pkg.slug : null;
}

function slugToIndex(slug) {
  for (var i = 0; i < PACKAGES.length; i++) {
    if (PACKAGES[i].slug === slug) return i;
  }
  return -1;
}

// Standard Cal.com vanilla-JS embed loader (unmodified boilerplate).
function initCalLoader() {
  (function (C, A, L) {
    var p = function (a, ar) { a.q.push(ar); };
    var d = C.document;
    C.Cal = C.Cal || function () {
      var cal = C.Cal;
      var ar = arguments;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        d.head.appendChild(d.createElement('script')).src = A;
        cal.loaded = true;
      }
      if (ar[0] === L) {
        var api = function () { p(api, arguments); };
        var namespace = ar[1];
        api.q = api.q || [];
        if (typeof namespace === 'string') {
          cal.ns[namespace] = cal.ns[namespace] || api;
          p(cal.ns[namespace], ar);
          p(cal, ['initNamespace', namespace]);
        } else {
          p(cal, ar);
        }
        return;
      }
      p(cal, ar);
    };
  })(window, 'https://app.cal.com/embed/embed.js', 'init');

  window.Cal('init', { origin: 'https://cal.com' });
}

function selectPackage(root, idx) {
  var picker = root.querySelector('[data-booking-picker]');
  var prompt = root.querySelector('[data-booking-prompt]');
  var mount = root.querySelector('[data-booking-mount]');
  var link = calLinkFor(idx);
  if (!link || !mount || !picker) return;

  picker.querySelectorAll('[data-select-package]').forEach(function (btn) {
    var isActive = btn.getAttribute('data-select-package') === String(idx);
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  if (prompt) prompt.hidden = true;
  // clear-then-reinit rather than relying on undocumented in-place calLink
  // switching, since Cal.com's docs don't confirm re-calling inline() updates
  // an already-rendered embed live.
  mount.innerHTML = '';
  mount.hidden = false;

  window.Cal('inline', {
    elementOrSelector: mount,
    calLink: link,
    config: { theme: 'dark' }
  });
}

function applyPackageNames(root, packages) {
  if (!packages) return;
  root.querySelectorAll('[data-select-package]').forEach(function (btn) {
    var idx = parseInt(btn.getAttribute('data-select-package'), 10);
    var pkg = packages[idx];
    if (pkg && pkg.name) btn.textContent = pkg.name;
  });
}

function wirePriceRowLinks(root) {
  document.querySelectorAll('.price-row[data-package]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var idx = parseInt(a.getAttribute('data-package'), 10);
      if (isNaN(idx) || !PACKAGES[idx]) return;
      e.preventDefault();
      selectPackage(root, idx);
      history.replaceState(null, '', '?service=' + PACKAGES[idx].slug + '#book');
      var bookSection = document.getElementById('book');
      if (bookSection) bookSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initBookingPicker() {
  var root = document.getElementById('scheduler-embed');
  if (!root) return;

  initCalLoader();

  fetch('data/packages.json', { cache: 'no-cache' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { if (data && data.packages) applyPackageNames(root, data.packages); })
    .catch(function () { /* keep static fallback labels */ });

  root.querySelectorAll('[data-select-package]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(btn.getAttribute('data-select-package'), 10);
      selectPackage(root, idx);
      history.replaceState(null, '', '?service=' + PACKAGES[idx].slug + '#book');
    });
  });

  wirePriceRowLinks(root);

  var params = new URLSearchParams(window.location.search);
  var serviceSlug = params.get('service');
  if (serviceSlug) {
    var idx = slugToIndex(serviceSlug);
    if (idx > -1) selectPackage(root, idx);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  initBookingPicker();
});
