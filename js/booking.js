// J&R Diamond Co — Cal.com booking widget (package/service selector + inline embed)
//
// Cal.com event-type slugs/durations below are tied to the Cal.com account
// structure, not the CMS — if bookable items are renamed or replaced in
// Cal.com, update BOOKABLE to match. The join key is `slug`, matching the
// data-package/data-select-package attributes in the HTML and the `slug`
// field in data/packages.json and data/services.json — array position is
// no longer used as a join key anywhere.

var CAL_USERNAME = 'caeden-morris-bfrjtx';

// PLACEHOLDER — the 4 package event types below (standard-detail,
// basic-interior-detail, full-interior-detail, full-detail) do not exist in
// Cal.com yet and must be created (or an existing event type's slug
// confirmed) by the business owner before launch. Durations are estimates
// and should be confirmed too.
var BOOKABLE = [
  { slug: 'standard-detail', calSlug: 'standard-detail', duration: 90 }, // PLACEHOLDER — create/confirm in Cal.com
  { slug: 'basic-interior-detail', calSlug: 'basic-interior-detail', duration: 60 }, // PLACEHOLDER — create/confirm in Cal.com
  { slug: 'full-interior-detail', calSlug: 'full-interior-detail', duration: 120 }, // PLACEHOLDER — create/confirm in Cal.com
  { slug: 'full-detail', calSlug: 'full-detail', duration: 150 }, // PLACEHOLDER — create/confirm in Cal.com
  { slug: 'glass-treatment', calSlug: 'glass-treatment', duration: 45 }, // unchanged, live Cal.com event
  { slug: 'maintenance-plans', calSlug: 'maintnance-plans', duration: 60 } // unchanged; live Cal.com slug keeps the
  // existing typo ("maintnance-plans") — do not "fix" it unless the Cal.com
  // event itself is renamed too
];

function bookableFor(slug) {
  return BOOKABLE.filter(function (b) { return b.slug === slug; })[0] || null;
}

function calLinkFor(slug) {
  var b = bookableFor(slug);
  return b ? CAL_USERNAME + '/' + b.calSlug : null;
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

function selectPackage(root, slug) {
  var picker = root.querySelector('[data-booking-picker]');
  var prompt = root.querySelector('[data-booking-prompt]');
  var mount = root.querySelector('[data-booking-mount]');
  var link = calLinkFor(slug);
  if (!link || !mount || !picker) return;

  picker.querySelectorAll('[data-select-package]').forEach(function (btn) {
    var isActive = btn.getAttribute('data-select-package') === slug;
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

function applyBookableNames(root, packages, services) {
  var byName = {};
  (packages || []).forEach(function (p) { byName[p.slug] = p.name; });
  (services || []).forEach(function (s) { byName[s.slug] = s.name; });
  root.querySelectorAll('[data-select-package]').forEach(function (btn) {
    var slug = btn.getAttribute('data-select-package');
    if (byName[slug]) btn.textContent = byName[slug];
  });
}

function wirePriceRowLinks(root) {
  document.querySelectorAll('.price-row[data-package]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var slug = a.getAttribute('data-package');
      if (!bookableFor(slug)) return;
      e.preventDefault();
      selectPackage(root, slug);
      history.replaceState(null, '', '?service=' + slug + '#book');
      var bookSection = document.getElementById('book');
      if (bookSection) bookSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initBookingPicker() {
  var root = document.getElementById('scheduler-embed');
  if (!root) return;

  initCalLoader();

  var packagesPromise = fetch('data/packages.json', { cache: 'no-cache' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { return (data && data.packages) || null; })
    .catch(function () { return null; });

  var servicesPromise = fetch('data/services.json', { cache: 'no-cache' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { return (data && data.services) || null; })
    .catch(function () { return null; });

  Promise.all([packagesPromise, servicesPromise]).then(function (results) {
    applyBookableNames(root, results[0], results[1]);
  });

  root.querySelectorAll('[data-select-package]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var slug = btn.getAttribute('data-select-package');
      selectPackage(root, slug);
      history.replaceState(null, '', '?service=' + slug + '#book');
    });
  });

  wirePriceRowLinks(root);

  var params = new URLSearchParams(window.location.search);
  var serviceSlug = params.get('service');
  if (serviceSlug && bookableFor(serviceSlug)) {
    selectPackage(root, serviceSlug);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  initBookingPicker();
});
