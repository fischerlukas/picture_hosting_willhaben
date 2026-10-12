// LAGER4 – Willhaben-Einspielhelfer (Stand 22.09.2026, im Rollout 60/60 bewaehrt)
// Laeuft im Browser-Kontext von marktplatz.willhaben.at (Chrome, eingeloggter Haendler-Account).
// Ablage im localStorage: 'lager4_lib' (dieser Code), 'lager4_tail' (konstanter Textschluss als HTML),
// 'lager4_std' (Standardbilder a1/a2/a3, mid[6], h1/h2/h3), 'lager4_ad' (aktuelle Anzeige: {i,t,p,ref,hero,a,hb,hv}).
// Aufruf pro Anzeige (Seite /anzeigenaufgabe), Reihenfolge und Wartezeiten sind wichtig:
//   eval(localStorage.getItem('lager4_lib')); L4.pre(); L4.s1()   // Bilder-Download starten, Titel+Preis
//   wait 3  -> L4.s2()   // Kategorie-Vorschlag (Radio) anklicken
//   wait 2  -> L4.s3()   // Zustand Neu, Selbstabholung+Versand, Link 1, Artikelnummer, "+ Weiteren Link"
//   wait 2  -> L4.s4()   // Link 2
//   wait 5  -> L4.s5()   // Bilder in imagePicker setzen (verkleinert, max 2000 px, JPEG 0.9)
//   wait 6  -> L4.s6()   // erst wenn 9 Vorschauen da: Beschreibung per Paste-Event; 'already' = schon drin
//   wait 5  -> L4.s6()   // zweiter Versuch, falls Vorschauen langsam
//   L4.commit(); wait 2; L4.commit(); wait 2   // Beschreibung direkt in Formik schreiben (Editor-Events reichen nicht)
//   L4.pubIfOk()          // prueft Formularwerte und klickt "Anzeige veroeffentlichen"
//   wait 8  -> L4.done()  // liefert adId; bei 60/60 landet die Anzeige "Nur im Shop"
// Lehren: Kategorie-Wahl und Bildverarbeitung leeren den Quill-Editor -> Beschreibung immer zuletzt.
//         Per JS eingefuegter Editor-Text erreicht das Formular nur ueber onIntermediateSave (Formik) -> L4.commit.
//         Async-JS liefert im Chrome-Tool {} -> Ergebnis in window.__* ablegen und im Folgeschritt lesen.

window.L4 = {};
L4.setV = function (el, v) {
  const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  s.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
};
L4.ad = function () { return JSON.parse(localStorage.getItem('lager4_ad')); };
L4.s1 = function () {
  const A = L4.ad();
  L4.setV(document.getElementById('heading'), A.t);
  L4.setV(document.getElementById('price'), String(A.p));
  return 's1';
};
L4.s2 = function () {
  const r = document.getElementById('category-suggestion-0');
  if (!r) return 'NO RADIO';
  r.click();
  return r.parentElement.parentElement.innerText.replace(/\n/g, ' > ').slice(0, 100);
};
L4.s3 = function () {
  const A = L4.ad();
  const z = document.getElementById('Zustand');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(z, 'Zustand\\neu');
  z.dispatchEvent(new Event('change', { bubbles: true }));
  for (const id of ['Uebergabe\\PICKUP', 'Uebergabe\\Versand']) {
    const c = document.getElementById(id);
    if (c && !c.checked) c.click();
  }
  L4.setV(document.getElementById('infoLink1Text'), 'Hier gehts in unseren WhatsApp Chat');
  L4.setV(document.getElementById('infoLink1Url'), 'https://wa.me/+436706556860');
  L4.setV(document.getElementById('advertiserRef'), A.ref);
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Weiteren Link'));
  if (b) b.click();
  return 's3';
};
L4.s4 = function () {
  const A = L4.ad() || {};   // Weitspann (12.10.2026): eigener Link 2 in den Anzeigendaten (l2t/l2u)
  L4.setV(document.getElementById('infoLink2Text'), A.l2t || 'Hier finden Sie alle Varianten unserer Palettenregale');
  L4.setV(document.getElementById('infoLink2Url'), A.l2u || 'https://lager4.com/collections/palettenregale');
  return 's4';
};
L4.pre = function () {
  const A = L4.ad(), S = JSON.parse(localStorage.getItem('lager4_std'));
  const list = [A.hero, S[A.a], ...S.mid, S[A.hb]];
  window.__imglog = 'pending'; window.__dt = null;
  (async () => {
    const base = 'https://raw.githubusercontent.com/fischerlukas/picture_hosting/main/';
    const dt = new DataTransfer(); const log = []; const fs = [];
    await Promise.all(list.map(async (s, i) => {
      const r = await fetch(base + s);
      if (!r.ok) { log.push('ERR' + r.status + ' ' + s); return; }
      let b = await r.blob(); let name = s.split('/').pop();
      if (b.size > 1200000) {  // Produktfotos sind 2-10 MB -> auf 2000 px / JPEG 0.9 verkleinern (Willhaben rechnet ohnehin runter)
        const bm = await createImageBitmap(b);
        const sc = Math.min(1, 2000 / Math.max(bm.width, bm.height));
        const c = document.createElement('canvas'); c.width = Math.round(bm.width * sc); c.height = Math.round(bm.height * sc);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bm, 0, 0, c.width, c.height);
        b = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.9));
        name = name.replace(/\.png$/i, '.jpg');
      }
      fs[i] = new File([b], name, { type: b.type });
    }));
    for (const f of fs) { if (f) dt.items.add(f); }
    window.__dt = dt;
    window.__imglog = log.length ? log.join(';') : 'ok ' + dt.files.length;
  })();
  return 'pre ' + list.length;
};
L4.s5 = function () {
  if (!window.__dt) return 'NOTREADY ' + window.__imglog;
  const inp = document.getElementById('imagePicker');
  inp.files = window.__dt.files;
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.dispatchEvent(new Event('change', { bubbles: true }));
  return 's5 ' + inp.files.length + ' ' + window.__imglog;
};
L4.blobs = function () { return document.querySelectorAll('img[src^=blob]').length; };
L4.s6 = function () {
  const n = L4.blobs();
  if (n !== 9) return 'BLOBS ' + n + ' ' + window.__imglog;
  if (document.querySelector('.ql-editor').innerText.length > 1500) return 'already';
  const A = L4.ad(); const html = A.hv + localStorage.getItem('lager4_tail');
  const ed = document.querySelector('.ql-editor');
  ed.focus(); document.execCommand('selectAll'); document.execCommand('delete');
  const dt = new DataTransfer(); dt.setData('text/html', html); dt.setData('text/plain', ed.innerText);
  ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  const norm = s => s.replace(/&quot;/g, '"').replace(/\s+/g, ' ');
  document.getElementById('advertiserRef').scrollIntoView({ block: 'center' });
  return JSON.stringify({ same: norm(ed.innerHTML) === norm(html), ps: ed.querySelectorAll('p').length, blobs: n });
};
L4.form = function () {  // liest die Formik-Werte ueber die React-Fiber des Editors
  const ed = document.querySelector('.ql-editor'); const el = ed.parentElement;
  const k = Object.keys(el).find(k => k.startsWith('__reactFiber'));
  let f = el[k]; for (let i = 0; i < 15; i++) f = f.return;
  const v = f.memoizedProps.formSpecificFieldProps.formProps.values;
  let g = el[k]; for (let i = 0; i < 6; i++) g = g.return;
  return JSON.stringify({ descLen: (v.description || '').length, state: g.memoizedProps.state, h: v.heading.length, p: v.price, ref: v.advertiserRef,
    cat: (v.categoryPath || {}).codePath, l1: v.infoLink1Url, l2: v.infoLink2Url,
    attrs: (v.attributeValueCodes || []).map(x => x.codePath).filter(x => /Uebergabe|Zustand/.test(x)).join(','), blobs: L4.blobs() });
};
L4.commit = function () {  // Beschreibung direkt ins Formular (Wrapper-Props: text/setText/onIntermediateSave)
  const ed = document.querySelector('.ql-editor'); const el = ed.parentElement;
  const k = Object.keys(el).find(k => k.startsWith('__reactFiber'));
  let g = el[k]; for (let i = 0; i < 7; i++) g = g.return;
  const p = g.memoizedProps; if (!p.onIntermediateSave) return 'NO SAVE';
  const html = ed.innerHTML; p.setText(html); p.onIntermediateSave(html);
  return 'committed ' + html.length;
};
L4.pubIfOk = function () {
  const f = JSON.parse(L4.form());
  if (f.descLen > 1500 && f.blobs === 9 && f.state !== 'error' && f.l2 && f.ref) {
    [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'Anzeige veröffentlichen').click();
    return 'pub';
  }
  return 'SKIP ' + L4.form();
};
L4.done = function () {
  return JSON.stringify({ url: location.href, adId: (location.href.match(/adId=(\d+)/) || [])[1],
    shop: document.body.innerText.includes('nicht auf Marktplatz veröffentlicht'), kont: document.body.innerText.includes('Kontingent aufgebraucht') });
};

// Listen-Seite (marktplatz.willhaben.at/?pageSize=100):
//   Zeile finden: Blatt-Element mit dem willhaben-Code, dann hochlaufen bis "Detaillierte Statistik" im Text.
//   Marktplatz-Schalter: input[type=checkbox][aria-label^="Anzeige ist"] in der Zeile (click).
//   Deaktivieren: Button aria-label "Weitere Aktionen" -> Blatt-Element mit Text "Deaktivieren" (letztes) klicken.
//   Reaktivieren: Button "Aktivieren im Shop" -> kurz "In Warteschlange" -> "Nur im Shop" -> dann Schalter.

// ---- Ergaenzung 26.09.2026: Hero-Bild einer bestehenden Anzeige tauschen (anzeige-bearbeiten?adId=...) ----
// Ablauf: L4.preFix(heroUrl,a,hb) -> 9x L4.rm() mit je 1 s Abstand -> L4.s5() -> wait 8 -> L4.save() -> Seite springt auf "/".
// heroUrl = Dropbox-Temp-Link (download_link, einmalig, 15 min) oder GitHub-Raw-URL; a = a1/a2/a3, hb = h1/h2/h3.
L4.preFix = function (heroUrl, a, hb) {
  const S = JSON.parse(localStorage.getItem('lager4_std'));
  const base = 'https://raw.githubusercontent.com/fischerlukas/picture_hosting/main/';
  const list = [heroUrl, ...[S[a], ...S.mid, S[hb]].map(s => base + s)];
  window.__imglog = 'pending'; window.__dt = null;
  (async () => {
    const dt = new DataTransfer(); const log = []; const fs = [];
    await Promise.all(list.map(async (u, i) => {
      const r = await fetch(u); if (!r.ok) { log.push('ERR' + r.status + ' ' + i); return; }
      let b = await r.blob(); let name = (i === 0 ? 'hero.png' : u.split('/').pop());
      if (b.size > 1200000) {
        const bm = await createImageBitmap(b); const sc = Math.min(1, 2000 / Math.max(bm.width, bm.height));
        const c = document.createElement('canvas'); c.width = Math.round(bm.width * sc); c.height = Math.round(bm.height * sc);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bm, 0, 0, c.width, c.height);
        b = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.9)); name = name.replace(/\.png$/i, '.jpg');
      }
      fs[i] = new File([b], name, { type: b.type });
    }));
    for (const f of fs) { if (f) dt.items.add(f); }
    window.__dt = dt; window.__imglog = log.length ? log.join(';') : 'ok ' + dt.files.length;
  })();
  return 'pre ' + list.length;
};
L4.rm = function () { const b = document.querySelector('button[aria-label="Bild 1 entfernen"]'); if (b) { b.click(); return 'rm'; } return 'none'; };
L4.nImgs = function () { return [...document.querySelectorAll('img')].filter(i => /cache|blob/.test(i.src)).length; };
L4.save = function () { const b = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Speichern'); if (L4.blobs() !== 9) return 'NOT9 ' + L4.blobs(); b.click(); return 'saved'; };
// Job-Warteschlange im localStorage 'lager4_fix' = [[adId, heroUrl, a, hb], ...]
L4.job = function () { return JSON.parse(localStorage.getItem('lager4_fix'))[0]; };
L4.jobDone = function () { const j = JSON.parse(localStorage.getItem('lager4_fix')); const d = j.shift(); localStorage.setItem('lager4_fix', JSON.stringify(j)); return 'done ' + d[0] + ' left ' + j.length; };

// ---- Ergaenzung 11.10.2026: Neueinstellung nach Takt-Plan (tool/willhaben/takt.py) ----
// Unterschiede zu oben: Bilder als volle URLs (out/willhaben-2026-10/willhaben.json -> image_sources, 10 Stueck:
// Titelbild 4:5 + Original + 8 Detailbilder), **keine Verkleinerung** (Regel Lukas: nur Originalqualitaet),
// Beschreibung komplett aus description_html. localStorage 'lager4_ad' = {t, p, ref, html, urls}.
// Ablauf: L4.preUrls() -> L4.s1() -> wait 3 -> L4.s2() -> wait 2 -> L4.s3() -> wait 2 -> L4.s4() -> warten bis
// window.__dt da -> L4.s5() -> warten bis L4.blobs() == Anzahl -> L4.s6n() -> L4.commit() 2x -> L4.pubIfOkN() -> L4.done().
L4.preUrls = function () {
  const A = L4.ad(); window.__n = A.urls.length; window.__imglog = 'pending'; window.__dt = null;
  (async () => {
    const dt = new DataTransfer(); const log = []; const fs = [];
    await Promise.all(A.urls.map(async (u, i) => {
      const r = await fetch(u); if (!r.ok) { log.push('ERR' + r.status + ' ' + i); return; }
      const b = await r.blob(); const name = (i === 0 ? 'titel_' : '') + decodeURIComponent(u.split('/').pop());
      fs[i] = new File([b], name, { type: b.type || 'image/png' });
    }));
    for (const f of fs) { if (f) dt.items.add(f); }
    window.__dt = dt; window.__mb = Math.round(fs.reduce((s, f) => s + (f ? f.size : 0), 0) / 1e5) / 10;
    window.__imglog = log.length ? log.join(';') : 'ok ' + dt.files.length + ' (' + window.__mb + ' MB)';
  })();
  return 'preUrls ' + A.urls.length;
};
L4.s6n = function () {
  const n = L4.blobs(); if (n !== window.__n) return 'BLOBS ' + n + '/' + window.__n;
  if (document.querySelector('.ql-editor').innerText.length > 1500) return 'already';
  const A = L4.ad(); const html = A.html; const ed = document.querySelector('.ql-editor');
  ed.focus(); document.execCommand('selectAll'); document.execCommand('delete');
  const dt = new DataTransfer(); dt.setData('text/html', html); dt.setData('text/plain', ed.innerText);
  ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  const norm = s => s.replace(/&quot;/g, '"').replace(/\s+/g, ' ');
  return JSON.stringify({ same: norm(ed.innerHTML) === norm(html), ps: ed.querySelectorAll('p').length, blobs: n });
};
L4.pubIfOkN = function () {
  const f = JSON.parse(L4.form()); const A = L4.ad();
  if (f.descLen > 1500 && f.blobs === window.__n && f.state !== 'error' && f.l2 && f.ref === A.ref && String(f.p) === String(A.p)) {
    [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'Anzeige veröffentlichen').click();
    return 'pub';
  }
  return 'SKIP ' + JSON.stringify(f);
};
// Anzeigendaten je SKU aus dem Repo picture_hosting_willhaben laden (keine Texte/URLs abtippen).
// v = Commit-Kennung oder Zeitstempel gegen den ~5-min-Zwischenspeicher von raw.githubusercontent.com.
L4.load = async function (sku, v) {
  const u = 'https://raw.githubusercontent.com/fischerlukas/picture_hosting_willhaben/main/daten/willhaben-2026-10.json?v=' + (v || Date.now());
  const d = await fetch(u, { cache: 'no-store' }).then(r => r.json()); const a = d[sku]; if (!a) return 'SKU FEHLT';
  localStorage.setItem('lager4_ad', JSON.stringify(a)); return 'geladen ' + a.ref + ' ' + a.p + ' EUR, ' + a.urls.length + ' Bilder';
};
// Bild 2 einer bestehenden Anzeige entfernen (11.10.2026: doppeltes Querformat): nur wenn Bild 1 hochkant und Bild 2 quer ist.
// Danach Formik-Werte pruefen (Beschreibung > 1500, Preis, SKU) und "Speichern".

// ---- Ergaenzung 11.10.2026 (nachmittags): 57 Anzeigen vorab "Nur im Shop" hochgeladen ----
// Neue Anzeigen landen ohne Schalter-Klick automatisch "Nur im Shop"; der 48-h-Takt startet erst beim Marktplatz-Schalter.
// Zuordnung SKU -> Termin -> neuer Code: willhaben/takt/vorab_2026-10.csv.
// Robuster Ablauf je Anzeige (keine setTimeout-Ketten in der Seite – Chrome drosselt den Tab, sobald er als
// "hidden" gilt, auf ~1 Timer/Minute; Wartezeiten nur ueber das Tool-"wait"):
//   navigate /anzeigenaufgabe -> L4.pick(sku) + L4.preUrls() + L4.s1()
//   -> heading.focus() per JS, dann ECHTE Tasten: End, " ", BackSpace, Tab  (sonst kommt der Kategorie-Vorschlag
//      im gedrosselten Tab oft nie) -> wait 5 -> L4.s1() erneut + Titel == Soll pruefen -> L4.s2()
//   -> s3 -> s4 -> wait 4 -> s5 -> wait 18 -> s6n -> commit 2x -> pubIfOkN -> wait 15 -> adId aus der URL.
// L4.pick(sku) liest aus localStorage 'lager4_all' (einmal per fetch aus picture_hosting_willhaben/daten geladen).
// Abbruchsicher: ohne Kategorie wirft s3 (Zustand-Select fehlt), ohne 9 Vorschauen/Beschreibung verweigert pubIfOkN.

// ---- Ergaenzung 12.10.2026: Weitspann (daten/weitspann-2026-10.json, je SKU {t,p,ref,html,urls,l2t,l2u}) ----
// L4.loadAll('weitspann-2026-10', v) einmal je Seite laden -> L4.pick(sku) legt die Anzeige in 'lager4_ad'. Ablauf sonst wie oben (preUrls/s1.../pubIfOkN).
L4.loadAll = async function (name, v) {
  const u = 'https://raw.githubusercontent.com/fischerlukas/picture_hosting_willhaben/main/daten/' + name + '.json?v=' + (v || Date.now());
  const d = await fetch(u, { cache: 'no-store' }).then(r => r.json()); localStorage.setItem('lager4_all', JSON.stringify(d));
  return 'geladen ' + Object.keys(d).length;
};
L4.pick = function (sku) {
  const a = JSON.parse(localStorage.getItem('lager4_all') || '{}')[sku]; if (!a) return 'SKU FEHLT';
  localStorage.setItem('lager4_ad', JSON.stringify(a)); return 'pick ' + a.ref + ' ' + a.p + ' EUR ' + a.urls.length + ' Bilder';
};
