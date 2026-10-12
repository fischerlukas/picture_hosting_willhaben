// LAGER4 – Willhaben-Takt: vorab hochgeladene Anzeigen freischalten + Altanzeigen deaktivieren (Stand 11.10.2026).
// Laeuft auf marktplatz.willhaben.at (Lukas' eingeloggtes Chrome). Ablage: localStorage 'lager4_takt', Aufruf: eval(localStorage.getItem('lager4_takt')).
// Nur .click() per JS – funktioniert auch, wenn Chrome den Tab als "hidden" fuehrt. NIE "Loeschen" anklicken.
window.W = {};
W.org = '735aac69-4ea8-48fd-b6ee-f3675f3e3871';
W.row = function (code) {
  const leaves = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && e.textContent.includes(String(code)));
  for (const l of leaves) { let e = l; while (e && e !== document.body) { const n = e.querySelectorAll('input[type=checkbox][aria-label^="Anzeige ist"]').length; if (n === 1) return e; if (n > 1) break; e = e.parentElement; } }
  return null; };
W.cb = function (code) { const r = W.row(code); return r ? r.querySelector('input[type=checkbox][aria-label^="Anzeige ist"]') : null; };
W.on = function (code) { const c = W.cb(code); if (!c) return 'NOROW ' + code; const l = c.getAttribute('aria-label'); if (l.includes('nicht')) { c.click(); return 'klick ' + code; } return 'schon ' + code; };
W.menu = function (code) { const r = W.row(code); if (!r) return 'NOROW ' + code; const b = r.querySelector('button[aria-label="Weitere Aktionen"]'); if (!b) return 'NOMENU'; b.click(); return 'menu ' + code; };
W.deact = function () { const it = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && e.textContent.trim() === 'Deaktivieren'); if (!it.length) return 'NOITEM'; it[it.length - 1].click(); return 'deakt'; };
W.api = async function (st) { let all = []; for (let p = 1; p < 5; p++) { const j = await fetch('/webapi/myatz/partner/' + W.org + '/ads/shop?pageSize=100&page=' + p + '&status=' + st + '&sort=CHANGED_DATE&sortOrder=DESC&heading=&adId=', { credentials: 'include' }).then(r => r.json()); const a = Object.values(j).find(Array.isArray) || []; all = all.concat(a); if (a.length < 100) break; } return all; };
W.check = async function (codes) { const m = await W.api('IN_STORE_ACTIVE_AD'); const s = await W.api('IN_STORE_ONLY'); const out = {};
  for (const c of codes) { const a = m.find(x => String(x.adId) === String(c)); const b = s.find(x => String(x.adId) === String(c));
    out[c] = a ? ('MARKT ' + new Date(a.lastReviveDate * 1000).toLocaleTimeString('de-AT', { timeZone: 'Europe/Vienna' })) : b ? 'SHOP' : 'WEG/INAKTIV'; }
  return JSON.stringify(out) + ' markt=' + m.length; };
