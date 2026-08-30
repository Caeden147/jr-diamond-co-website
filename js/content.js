// J&R Diamond Co — CMS-driven content loader (business location + package data)
// Progressive enhancement: the HTML already contains the current copy as a static
// fallback. If a fetch fails, or a data-* hook has no matching JSON field, the
// existing markup is simply left alone — no flash of empty content.

function applyBusinessData(root, biz) {
  root = root || document;
  if (!biz) return;

  if (typeof biz.cities === 'string') {
    var cityParts = biz.cities.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    root.querySelectorAll('[data-location-cities]').forEach(function (el) {
      el.textContent = cityParts.join(' · ');
    });

    root.querySelectorAll('[data-location-cities-dotted]').forEach(function (el) {
      el.textContent = '';
      cityParts.forEach(function (city, i) {
        el.appendChild(document.createTextNode(city));
        if (i < cityParts.length - 1) {
          el.appendChild(document.createTextNode(' '));
          var dot = document.createElement('span');
          dot.className = 'dot';
          dot.textContent = '·';
          el.appendChild(dot);
          el.appendChild(document.createTextNode(' '));
        }
      });
    });
  }

  if (typeof biz.areaSummary === 'string') {
    root.querySelectorAll('[data-location-summary]').forEach(function (el) {
      el.textContent = biz.areaSummary;
    });
  }
}

function applyPackagesData(root, packages) {
  root = root || document;
  if (!packages || !packages.length) return;

  root.querySelectorAll('[data-package]').forEach(function (el) {
    var idx = parseInt(el.getAttribute('data-package'), 10);
    var pkg = packages[idx];
    if (!pkg) return;

    var nameEl = el.querySelector('[data-package-name]');
    var descEl = el.querySelector('[data-package-description]');
    var priceEl = el.querySelector('[data-package-price]');

    if (nameEl && pkg.name) nameEl.textContent = pkg.name;
    if (descEl && pkg.description) descEl.textContent = pkg.description;
    if (priceEl && pkg.price) priceEl.textContent = pkg.price;
  });
}

function fetchJSON(path) {
  return fetch(path, { cache: 'no-cache' }).then(function (res) {
    return res.ok ? res.json() : null;
  });
}

function initContentData() {
  fetchJSON('data/business.json')
    .then(function (biz) { if (biz) applyBusinessData(document, biz); })
    .catch(function () { /* keep static fallback markup */ });

  fetchJSON('data/packages.json')
    .then(function (data) { if (data && data.packages) applyPackagesData(document, data.packages); })
    .catch(function () { /* keep static fallback markup */ });
}

document.addEventListener('DOMContentLoaded', function () {
  initContentData();
});
