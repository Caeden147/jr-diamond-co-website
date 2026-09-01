// J&R Diamond Co — CMS-driven content loader (business location, services, packages)
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

function renderPackageTiers(el, pricing) {
  if (!pricing) return;
  ['sedan', 'suv', 'largeSuvTruck'].forEach(function (tier) {
    var tierEl = el.querySelector('[data-package-tier="' + tier + '"]');
    if (tierEl && pricing[tier] != null) tierEl.textContent = '$' + pricing[tier];
  });
}

function renderPackageGroups(el, groups) {
  var container = el.querySelector('[data-package-groups]');
  if (!container || !groups || !groups.length) return;
  container.innerHTML = '';
  groups.forEach(function (group) {
    var wrap = document.createElement('div');
    if (group.label) {
      var label = document.createElement('p');
      label.className = 'package-group-label';
      label.textContent = group.label;
      wrap.appendChild(label);
    }
    var ul = document.createElement('ul');
    ul.className = 'dash-list';
    (group.items || []).forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    container.appendChild(wrap);
  });
}

function applyPackagesData(root, packages) {
  root = root || document;
  if (!packages || !packages.length) return;

  function byslug(slug) {
    return packages.filter(function (p) { return p.slug === slug; })[0];
  }

  root.querySelectorAll('[data-package]').forEach(function (el) {
    var pkg = byslug(el.getAttribute('data-package'));
    if (!pkg) return;

    var nameEl = el.querySelector('[data-package-name]');
    var descEl = el.querySelector('[data-package-description]');

    if (nameEl && pkg.name) nameEl.textContent = pkg.name;
    if (descEl && pkg.description) descEl.textContent = pkg.description;

    renderPackageTiers(el, pkg.pricing);
    renderPackageGroups(el, pkg.groups);
  });

  // Condensed summary rows (e.g. contact.html) that link out to the full
  // Packages section rather than triggering the inline booking picker —
  // kept on a separate attribute so wirePriceRowLinks (booking.js) never
  // intercepts their click.
  root.querySelectorAll('[data-package-summary]').forEach(function (el) {
    var pkg = byslug(el.getAttribute('data-package-summary'));
    if (!pkg) return;

    var nameEl = el.querySelector('[data-package-name]');
    var descEl = el.querySelector('[data-package-description]');
    var fromEl = el.querySelector('[data-package-price-from]');

    if (nameEl && pkg.name) nameEl.textContent = pkg.name;
    if (descEl && pkg.description) descEl.textContent = pkg.description;
    if (fromEl && pkg.pricing && pkg.pricing.sedan != null) fromEl.textContent = 'From $' + pkg.pricing.sedan;
  });
}

function applyServicesData(root, data) {
  root = root || document;
  if (!data) return;

  if (data.services) {
    root.querySelectorAll('[data-service]').forEach(function (el) {
      var slug = el.getAttribute('data-service');
      var svc = data.services.filter(function (s) { return s.slug === slug; })[0];
      if (!svc) return;

      var nameEl = el.querySelector('[data-service-name]');
      var descEl = el.querySelector('[data-service-description]');
      var priceEl = el.querySelector('[data-service-price]');
      var ctaEl = el.querySelector('[data-service-cta]');

      if (nameEl && svc.name) nameEl.textContent = svc.name;
      if (descEl && svc.description) descEl.textContent = svc.description;
      if (priceEl && svc.price) {
        priceEl.textContent = svc.price;
        // a figure reads as a figure; anything without one is a quote line
        priceEl.classList.toggle('is-quote', !/\d/.test(svc.price));
      }
      if (ctaEl && svc.cta) {
        if (svc.cta.label) ctaEl.textContent = svc.cta.label + ' →';
        if (svc.cta.href) ctaEl.setAttribute('href', svc.cta.href);
      }
    });
  }

  if (data.addOns) {
    if (data.addOns.note) {
      root.querySelectorAll('[data-addons-note]').forEach(function (el) {
        el.textContent = data.addOns.note;
      });
    }
    if (data.addOns.items && data.addOns.items.length) {
      root.querySelectorAll('[data-addons-list]').forEach(function (listEl) {
        listEl.innerHTML = '';
        data.addOns.items.forEach(function (item) {
          var row = document.createElement('div');
          row.className = 'info-row';
          var dt = document.createElement('dt');
          dt.textContent = item.name;
          var dd = document.createElement('dd');
          dd.textContent = item.price;
          row.appendChild(dt);
          row.appendChild(dd);
          listEl.appendChild(row);
        });
      });
    }
  }
}

function computePriceFloor(packages, services) {
  var candidates = [];
  (packages || []).forEach(function (pkg) {
    if (pkg.pricing && typeof pkg.pricing.sedan === 'number') candidates.push(pkg.pricing.sedan);
  });
  (services || []).forEach(function (svc) {
    if (svc.placeholder || !svc.price) return;
    var match = String(svc.price).match(/[\d.]+/);
    if (match) candidates.push(parseFloat(match[0]));
  });
  return candidates.length ? Math.min.apply(null, candidates) : null;
}

function applyPriceTeaser(root, min) {
  root = root || document;
  if (min === null || min === undefined) return;
  var display = '$' + (min % 1 === 0 ? min.toFixed(0) : min);
  root.querySelectorAll('[data-price-teaser-amount]').forEach(function (el) {
    el.textContent = display;
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

  var packagesPromise = fetchJSON('data/packages.json').then(function (data) {
    if (data && data.packages) applyPackagesData(document, data.packages);
    return (data && data.packages) || null;
  }).catch(function () { return null; });

  var servicesPromise = fetchJSON('data/services.json').then(function (data) {
    if (data) applyServicesData(document, data);
    return (data && data.services) || null;
  }).catch(function () { return null; });

  Promise.all([packagesPromise, servicesPromise]).then(function (results) {
    var min = computePriceFloor(results[0], results[1]);
    if (min !== null) applyPriceTeaser(document, min);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initContentData();
});
