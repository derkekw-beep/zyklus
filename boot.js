// Notbremse: Startet die App nicht (z. B. Datei fehlt nach einem Update), nach 6 Sekunden einen Hinweis
// mit „App neu laden“ zeigen. Der Knopf setzt nur den App-Code (Service Worker + Cache) zurück –
// Einträge im localStorage bleiben unangetastet.
(function () {
  setTimeout(function () {
    if (window.__zyklus) return;
    var box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:99;padding:16px;border-radius:16px;background:#2a1d22;color:#fff;font:16px/1.4 -apple-system,system-ui,sans-serif;text-align:center';
    box.textContent = 'Die App ist nicht richtig gestartet. Deine Einträge sind sicher. ';
    var b = document.createElement('button');
    b.textContent = 'App neu laden';
    b.style.cssText = 'display:block;margin:12px auto 0;padding:12px 20px;border:0;border-radius:999px;background:#c8336a;color:#fff;font:700 16px -apple-system,system-ui,sans-serif';
    b.onclick = function () {
      var done = function () { location.reload(); };
      try {
        var p1 = navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }) : Promise.resolve();
        var p2 = window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }) : Promise.resolve();
        Promise.all([p1, p2]).then(done, done);
      } catch (e) { done(); }
    };
    box.appendChild(b);
    document.body.appendChild(box);
  }, 6000);
})();
