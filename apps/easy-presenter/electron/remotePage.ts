// The phone page for the remote — one self-contained HTML document (no framework, small and fast
// on old phones). Live state arrives over Server-Sent Events; the operator page POSTs commands.
// The inline script must not use template literals: this whole file is one.
import type { RemoteRole } from './remote'

const CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:#0b1020;color:#e2e8f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
body{display:flex;flex-direction:column;overscroll-behavior:none}
button{font:inherit;color:inherit;border:0;cursor:pointer}
.bar{display:flex;align-items:center;gap:8px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top));background:#111827;border-bottom:1px solid #1f2937}
.bar b{font-size:15px}.bar .sp{flex:1}
.pill{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:#1f2937;color:#94a3b8}
.pill.live{background:#dc2626;color:#fff}.pill.blank{background:#854d0e;color:#fef3c7}
.dot{width:9px;height:9px;border-radius:50%;background:#ef4444}.dot.on{background:#22c55e}
.clock{font-variant-numeric:tabular-nums;font-weight:700;font-size:15px;color:#cbd5e1}
.off{padding:8px 14px;font-size:12px;background:#7f1d1d;color:#fecaca;display:none}
.off.show{display:block}
/* operator */
.prev{margin:12px;padding:12px;border-radius:12px;background:#000;border:2px solid #1f2937;min-height:96px}
.prev.live{border-color:#dc2626}
.prev small{display:block;color:#64748b;font-size:11px;margin-bottom:4px}
.prev p{margin:0;white-space:pre-line;font-size:15px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
.row{display:grid;gap:8px;margin:0 12px 8px}
.r2{grid-template-columns:1fr 1fr}.r3{grid-template-columns:1.4fr 1fr 1fr}
.btn{padding:16px 8px;border-radius:12px;background:#1e293b;font-weight:700;font-size:16px;border:1px solid #334155}
.btn:active{transform:scale(.97);opacity:.85}
.btn.big{padding:22px 8px;font-size:20px}
.btn.go{background:#2563eb;border-color:#2563eb}.btn.go.on{background:#dc2626;border-color:#dc2626}
.btn.on{background:#854d0e;border-color:#a16207;color:#fef3c7}
.btn.clr.on{background:#7c2d12;border-color:#c2410c;color:#fed7aa}
.tabs{display:flex;gap:6px;margin:6px 12px 0}
.tab{flex:1;padding:10px;border-radius:10px 10px 0 0;background:#111827;color:#64748b;font-weight:600;font-size:14px}
.tab.on{background:#1e293b;color:#fff}
.list{flex:1;overflow:auto;margin:0 12px 12px;padding:8px;background:#1e293b;border-radius:0 0 12px 12px;padding-bottom:max(8px,env(safe-area-inset-bottom))}
.it{display:block;width:100%;text-align:left;padding:11px 12px;margin-bottom:6px;border-radius:10px;background:#0f172a;border:1px solid #1f2937}
.it.act{border-color:#3b82f6}.it.lv{border-color:#dc2626;background:#2a0f12}
.it b{display:block;font-size:13px;color:#93c5fd;margin-bottom:2px}.it.lv b{color:#fca5a5}
.it span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;font-size:14px;color:#cbd5e1}
.it i{font-style:normal;font-size:12px;color:#64748b}
.it.pic{display:flex;align-items:center;gap:10px}
.it.pic img{width:96px;aspect-ratio:16/9;object-fit:contain;background:#000;border-radius:6px;flex-shrink:0}
.empty{color:#64748b;text-align:center;padding:24px 8px;font-size:14px}
.lh{font-size:12px;font-weight:700;color:#94a3b8;margin:2px 2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* speaker */
.mon{margin:10px 12px 0}
.cap{display:flex;justify-content:space-between;gap:8px;font-size:11px;font-weight:700;letter-spacing:.06em;color:#64748b;margin-bottom:4px}
.cap.lv{color:#f87171}.cap span:last-child{color:#94a3b8;letter-spacing:0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.scr{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden;border:2px solid #1f2937;display:flex;align-items:center;justify-content:center}
.scr.on{border-color:#dc2626}
.scr img{width:100%;height:100%;object-fit:contain;display:block}
.scr p{margin:0;padding:5%;white-space:pre-line;text-align:center;font-weight:700;line-height:1.25;color:#fff}
.scr p.dim{color:#475569;font-weight:600;font-size:13px}
.pvw{display:grid;grid-template-columns:1.1fr 1fr;gap:10px;margin:10px 12px 0;align-items:end}
.pvw .scr p{font-size:11px;font-weight:600;color:#cbd5e1;padding:6px;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
.info{font-size:13px;color:#94a3b8;padding-bottom:4px;min-width:0}
.info b{display:block;color:#fde68a;font-size:14px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.info i{font-style:normal;display:block;font-size:20px;font-weight:700;color:#fff}
.btn:disabled{opacity:.35}
.decks{flex:1;overflow:auto;margin:10px 12px 0;padding-bottom:max(12px,env(safe-area-inset-bottom))}
.decks h4{margin:4px 2px 8px;font-size:11px;letter-spacing:.06em;color:#64748b}
.dk{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;margin-bottom:6px;border-radius:10px;background:#111827;border:1px solid #1f2937}
.dk.sel{border-color:#f59e0b;background:#1c1405}.dk.lv{border-color:#dc2626;background:#2a0f12}
.dk span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}
.dk i{font-style:normal;font-size:12px;color:#64748b}
.ticker{background:#fff;color:#000;font-weight:600;padding:6px 14px;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none}
.ticker.show{display:block}
.srch{display:flex;gap:6px;margin-bottom:8px}
.srch input{flex:1;min-width:0;padding:12px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#fff;font-size:16px}
.srch button{padding:0 14px;border-radius:10px;background:#2563eb;font-weight:700}
.vers{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}
.ver{padding:6px 12px;border-radius:999px;background:#0f172a;border:1px solid #334155;font-size:13px;color:#94a3b8}
.ver.on{background:#1d4ed8;border-color:#2563eb;color:#fff}
.res{padding:12px;border-radius:10px;background:#0f172a;border:1px solid #334155}
.res b{display:block;color:#86efac;margin-bottom:6px}
.res p{margin:0 0 10px;white-space:pre-line;font-size:15px;line-height:1.4;color:#e2e8f0}
.err{color:#fca5a5;font-size:14px;padding:8px 2px}
.zoom{display:flex;gap:6px}
.main{flex:1;display:flex;flex-direction:column;min-height:0}
.colA,.colB{display:flex;flex-direction:column;min-height:0}
.colB{flex:1}
.prev img{display:none;width:100%;max-height:160px;object-fit:contain;border-radius:6px;background:#000}
.prev.pic img{display:block}.prev.pic p{display:none}
.md{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:8px 10px;margin-bottom:6px;border-radius:10px;background:#0f172a;border:1px solid #1f2937}
.md.act{border-color:#3b82f6}.md.off{opacity:.45}
.md .th{width:52px;height:30px;border-radius:6px;background:#111827;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:16px}
.md .th img{width:100%;height:100%;object-fit:cover}
.md span{flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.md i{font-style:normal;font-size:11px;color:#64748b;flex-shrink:0}
.note{font-size:12px;color:#64748b;margin:2px 2px 8px}
/* Landscape (default for the remote): two columns */
@media (orientation:landscape){
  .main{flex-direction:row}
  .colA{width:48%;overflow:auto}
  .colB{width:52%}
  .prev{min-height:0;margin:8px}.prev p{-webkit-line-clamp:4;font-size:14px}
  .row{margin:0 8px 6px}.btn{padding:11px 6px;font-size:15px}.btn.big{padding:14px 6px;font-size:17px}
  .tabs{margin:8px 8px 0}.list{margin:0 8px 8px}
  .mon{margin:8px}.speak .colA{width:58%}.speak .colB{width:42%}
  .pvw{margin:8px 8px 0;grid-template-columns:1fr}.pvw .info{display:none}
  .speak .row{margin:8px 8px 0 !important}
  .decks{margin:8px}
}.zoom button{width:34px;height:30px;border-radius:8px;background:#1f2937;font-weight:700}
`

const JS = `
var ROLE = window.__ROLE, KEY = window.__KEY;
var S = null, tab = 'slides', scale = 1;
var B = { v: 'TB', versions: [], q: '', res: null, err: '', busy: false };
var M = { files: null, err: '', opening: '' };
try { scale = parseFloat(localStorage.getItem('ec-scale') || '1') || 1 } catch (e) {}
var $ = function (id) { return document.getElementById(id) };
function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }

function send(cmd) {
  if (navigator.vibrate) navigator.vibrate(15);
  fetch('/command?k=' + encodeURIComponent(KEY), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) })
    .catch(function () {});
}

function status() {
  var p = $('st');
  if (!S || !S.isLive) { p.className = 'pill'; p.textContent = 'STANDBY'; return }
  if (S.isBlank) { p.className = 'pill blank'; p.textContent = 'BLANK'; return }
  p.className = 'pill live'; p.textContent = S.isClear ? 'LIVE · CLEAR' : 'LIVE';
}

function renderOperator() {
  status();
  var live = S && S.isLive && !S.isBlank && S.live;
  $('pv').className = 'prev' + (live ? ' live' : '');
  $('pvl').textContent = live ? (S.live.title + (S.live.label ? ' · ' + S.live.label : '')) : (S && S.isBlank ? 'BLANK' : 'Belum Live');
  $('pvt').textContent = live ? (S.isClear ? '(teks di-clear)' : S.live.text) : '';
  $('go').textContent = S && S.isLive ? '■ Off Air' : '● Go Live';
  $('go').className = 'btn go' + (S && S.isLive ? ' on' : '');
  $('bl').className = 'btn' + (S && S.isBlank ? ' on' : '');
  $('cl').className = 'btn clr' + (S && S.isClear ? ' on' : '');
  $('t1').className = 'tab' + (tab === 'slides' ? ' on' : '');
  $('t2').className = 'tab' + (tab === 'items' ? ' on' : '');
  $('t3').className = 'tab' + (tab === 'bible' ? ' on' : '');
  $('t4').className = 'tab' + (tab === 'media' ? ' on' : '');
  var pim = $('pvim');
  if (live && S.liveImage) { if (pim.getAttribute('data-u') !== S.liveImage) { pim.setAttribute('data-u', S.liveImage); pim.src = imgUrl(S.liveImage) } $('pv').className += ' pic' }
  var list = $('ls');
  // Keep the search box (and the phone keyboard) alone while live updates arrive
  if (tab === 'bible' && list.querySelector('input') === document.activeElement) return;
  list.textContent = '';
  if (tab === 'bible') { renderBible(list); return }
  if (tab === 'media') { renderMedia(list); return }
  if (!S) { list.appendChild(el('div', 'empty', 'Menghubungkan…')); return }
  if (tab === 'slides') {
    if (!S.slides.length) { list.appendChild(el('div', 'empty', 'Belum ada item dipilih')); return }
    list.appendChild(el('div', 'lh', S.activeTitle));
    S.slides.forEach(function (sl, i) {
      var b = el('button', 'it' + (sl.id === S.liveSlideId && S.isLive ? ' lv' : sl.id === S.activeSlideId ? ' act' : ''));
      if (sl.image) {
        b.className += ' pic';
        var im = el('img'); im.loading = 'lazy'; im.alt = ''; im.src = imgUrl(sl.image);
        b.appendChild(im);
        b.appendChild(el('b', null, (i + 1) + '. ' + (sl.label || 'Hal ' + (i + 1))));
      } else {
        b.appendChild(el('b', null, (i + 1) + '. ' + (sl.label || 'Slide')));
        b.appendChild(el('span', null, sl.text || '—'));
      }
      b.onclick = function () { send({ type: 'liveSlide', itemId: S.activeItemId, slideId: sl.id }) };
      list.appendChild(b);
    });
  } else {
    if (!S.items.length) { list.appendChild(el('div', 'empty', 'Urutan Ibadah kosong')); return }
    S.items.forEach(function (it, i) {
      var b = el('button', 'it' + (it.id === S.liveItemId && S.isLive ? ' lv' : it.id === S.activeItemId ? ' act' : ''));
      b.appendChild(el('b', null, (i + 1) + '. ' + it.title));
      b.appendChild(el('i', null, it.kind + (it.subtitle ? ' · ' + it.subtitle : '')));
      b.onclick = function () { send({ type: 'selectItem', id: it.id }); tab = 'slides'; renderOperator() };
      list.appendChild(b);
    });
  }
}

function api(path) {
  return fetch(path + (path.indexOf('?') < 0 ? '?' : '&') + 'k=' + encodeURIComponent(KEY)).then(function (r) { return r.json() });
}

function loadVersions() {
  api('/versions').then(function (d) {
    B.versions = (d && d.versions || []).map(function (x) { return x.code });
    if (B.versions.length && B.versions.indexOf(B.v) < 0) B.v = B.versions[0];
    if (tab === 'bible') render();
  }).catch(function () {});
}

/* q = reference; thenLive = put the result on air right away (verse ◄ / ► buttons) */
function search(q, thenLive) {
  q = (q || '').trim(); if (!q) return;
  B.q = q; B.busy = true; B.err = ''; render();
  api('/bible?q=' + encodeURIComponent(q) + '&v=' + encodeURIComponent(B.v)).then(function (d) {
    B.busy = false;
    if (d && d.found) { B.res = d; if (thenLive) send({ type: 'quick', text: d.text, label: d.label, version: B.v }) }
    else { B.err = (d && d.error) || 'Ayat tidak ditemukan' }
    render();
  }).catch(function () { B.busy = false; B.err = 'Tidak bisa menghubungi PC'; render() });
}

/* "Yohanes 3:16" → "Yohanes 3:17" */
function stepVerse(d) {
  if (!B.res || !B.res.ref || !B.res.ref.verse) return;
  var label = B.res.label, sp = label.lastIndexOf(' ');
  var next = B.res.ref.verse + d; if (next < 1) return;
  search(label.slice(0, sp) + ' ' + B.res.ref.chapter + ':' + next, true);
}

function loadMedia() {
  api('/media').then(function (d) { M.files = (d && d.files) || []; M.err = ''; if (tab === 'media') render() })
    .catch(function () { M.err = 'Tidak bisa memuat media'; render() });
}

function renderMedia(list) {
  list.appendChild(el('div', 'note', 'Ketuk file untuk menambahkannya ke Urutan Ibadah, lalu Go Live. PDF dikonversi dulu di PC (beberapa detik).'));
  if (M.err) list.appendChild(el('div', 'err', M.err));
  if (!M.files) { list.appendChild(el('div', 'empty', 'Memuat…')); loadMedia(); return }
  if (!M.files.length) { list.appendChild(el('div', 'empty', 'Media Library kosong')); return }
  M.files.forEach(function (f) {
    var blocked = f.kind === 'ppt' || f.playable === false;
    var active = S && S.activeItemId === 'lib_' + f.file;
    var b = el('button', 'md' + (blocked ? ' off' : '') + (active ? ' act' : ''));
    var th = el('div', 'th');
    if (f.kind === 'image') { var im = el('img'); im.src = imgUrl(f.url); im.alt = ''; th.appendChild(im) }
    else th.textContent = f.kind === 'video' ? '🎬' : f.kind === 'pdf' ? '📑' : '📊';
    b.appendChild(th);
    b.appendChild(el('span', null, f.name));
    b.appendChild(el('i', null, M.opening === f.file ? 'Membuka…' : blocked ? (f.kind === 'ppt' ? 'Jadikan PDF' : 'Dikonversi') : f.kind.toUpperCase()));
    if (!blocked) b.onclick = function () {
      M.opening = f.file; render();
      send({ type: 'media', file: f.file });
      setTimeout(function () { M.opening = ''; tab = 'slides'; render() }, f.kind === 'pdf' ? 2500 : 600);
    };
    list.appendChild(b);
  });
}

function renderBible(list) {
  var vers = el('div', 'vers');
  (B.versions.length ? B.versions : [B.v]).forEach(function (code) {
    var b = el('button', 'ver' + (code === B.v ? ' on' : ''), code);
    b.onclick = function () { B.v = code; if (B.res) search(B.q, false); else render() };
    vers.appendChild(b);
  });
  list.appendChild(vers);
  var f = el('form', 'srch');
  var inp = el('input'); inp.type = 'search'; inp.placeholder = 'Yoh 3:16 · Mzm 23:1 · Rom 8'; inp.value = B.q;
  inp.setAttribute('autocapitalize', 'words'); inp.setAttribute('enterkeyhint', 'search');
  f.appendChild(inp); f.appendChild(el('button', null, B.busy ? '…' : 'Cari'));
  f.onsubmit = function (e) { e.preventDefault(); inp.blur(); search(inp.value, false) };
  list.appendChild(f);
  if (B.err) list.appendChild(el('div', 'err', B.err));
  if (B.res) {
    var r = el('div', 'res');
    r.appendChild(el('b', null, B.res.label + ' (' + B.v + ')'));
    r.appendChild(el('p', null, B.res.text));
    var row = el('div', 'row r3'); row.style.margin = '0';
    var pv = el('button', 'btn', '◄ Ayat'), lv = el('button', 'btn go', '● Live'), nx = el('button', 'btn', 'Ayat ►');
    pv.onclick = function () { stepVerse(-1) };
    nx.onclick = function () { stepVerse(1) };
    lv.onclick = function () { send({ type: 'quick', text: B.res.text, label: B.res.label, version: B.v }) };
    if (!B.res.ref || !B.res.ref.verse) { pv.disabled = true; nx.disabled = true; pv.style.opacity = nx.style.opacity = '.4' }
    row.appendChild(pv); row.appendChild(lv); row.appendChild(nx);
    r.appendChild(row);
    list.appendChild(r);
  } else if (!B.err) {
    list.appendChild(el('div', 'empty', 'Ketik referensi ayat, mis. Yoh 3:16'));
  }
  if (!B.versions.length) loadVersions();
}

var sel = null;   /* Speaker: chosen deck page waiting in the preview { id, page } */

function deckById(id) { return S && S.decks ? S.decks.filter(function (d) { return d.id === id })[0] : null }
function imgUrl(u) { return '/img?k=' + encodeURIComponent(KEY) + '&u=' + encodeURIComponent(u) }

/* Picture or text in a monitor box; an unchanged picture is left alone (no flicker) */
function showIn(box, img, text, dimText) {
  if (img) {
    var cur = box.firstChild;
    if (cur && cur.tagName === 'IMG' && cur.getAttribute('data-u') === img) return;
    box.textContent = '';
    var i = el('img'); i.setAttribute('data-u', img); i.src = imgUrl(img); i.alt = '';
    box.appendChild(i);
    return;
  }
  box.textContent = '';
  box.appendChild(el('p', text ? '' : 'dim', text || dimText));
}

function fitLive() {
  var box = $('lvs'), p = box.querySelector('p');
  if (!p || p.className === 'dim') return;
  var size = Math.min(box.clientWidth / 9, 72) * scale;
  p.style.fontSize = size + 'px';
  while (size > 9 && (p.scrollHeight > box.clientHeight || p.scrollWidth > box.clientWidth)) { size -= 1; p.style.fontSize = size + 'px' }
}

/* What the preview shows: a chosen page (not live yet), else the page after the live one */
function previewTarget() {
  var ld = S && S.liveDeck;
  if (!sel && !ld && S && S.decks && S.decks.length) sel = { id: S.decks[0].id, page: 0 };
  if (sel && deckById(sel.id) && (!ld || sel.id !== ld.id)) return { deck: deckById(sel.id), page: sel.page, mode: 'sel' };
  if (ld && deckById(ld.id)) return { deck: deckById(ld.id), page: ld.page + 1, mode: 'live' };
  return null;
}

function renderSpeaker() {
  status();
  var live = !!(S && S.isLive && !S.isBlank);
  $('lvs').className = 'scr' + (live ? ' on' : '');
  $('lvl').textContent = live && S.live ? S.live.title + (S.live.label ? ' · ' + S.live.label : '') : '';
  var liveText = live && S.live && !S.isClear ? S.live.text : '';
  showIn($('lvs'), live ? S.liveImage : null, liveText,
    S && S.isBlank ? '— Layar blank —' : S && S.isLive && S.isClear ? '— Teks di-clear —' : '— Belum ada yang tampil —');

  var pt = previewTarget(), info = $('pvi');
  info.textContent = '';
  if (pt) {
    var d = pt.deck, n = d.pages.length;
    if (pt.page >= n) showIn($('pvs'), null, '', '— Akhir presentasi —');
    else if (d.kind === 'video') showIn($('pvs'), null, '🎬 ' + d.name, '');
    else showIn($('pvs'), d.pages[pt.page], '', '');
    info.appendChild(el('b', null, d.name));
    info.appendChild(el('i', null, pt.page < n ? 'Hal ' + (pt.page + 1) + ' / ' + n : 'Selesai'));
    info.appendChild(el('span', null, pt.mode === 'sel' ? 'Belum tampil — tekan Live' : 'Halaman berikutnya'));
    $('pvc').textContent = (pt.page < n ? 'Hal ' + (pt.page + 1) + '/' + n : 'Selesai') + (pt.mode === 'sel' ? ' · belum tampil' : '');
  } else {
    showIn($('pvs'), null, S && S.next ? S.next.text : '', '—');
    info.appendChild(el('b', null, 'Berikutnya'));
    info.appendChild(el('span', null, S && S.next ? S.next.label : 'Pilih presentasi di bawah'));
    $('pvc').textContent = S && S.next ? S.next.label : '';
  }

  var canStep = !!pt, sl = $('sl');
  $('sp').disabled = !canStep || (pt.mode === 'sel' ? pt.page <= 0 : S.liveDeck.page <= 0);
  $('sn').disabled = !canStep || (pt.mode === 'sel' ? pt.page >= pt.deck.pages.length - 1 : pt.page >= pt.deck.pages.length);
  sl.disabled = !pt || pt.mode !== 'sel';
  sl.textContent = pt && pt.mode === 'live' ? '● LIVE' : '● Live';
  $('sh').textContent = pt ? '' : (S && S.decks && S.decks.length ? 'Pilih presentasi di bawah' : 'Belum ada presentasi — minta Operator mencentang ✓ Speaker di Media');
  sl.className = 'btn go' + (pt && pt.mode === 'live' ? ' on' : '');

  var list = $('dl'); list.textContent = '';
  list.appendChild(el('h4', null, 'PRESENTASI SAYA'));
  if (!S || !S.decks || !S.decks.length) {
    list.appendChild(el('div', 'empty', 'Belum ada file. Minta Operator mencentang [v] Speaker pada file di Media.'));
  } else {
    S.decks.forEach(function (d) {
      var isLive = S.liveDeck && S.liveDeck.id === d.id;
      var b = el('button', 'dk' + (isLive ? ' lv' : sel && sel.id === d.id ? ' sel' : ''));
      b.appendChild(el('span', null, (d.kind === 'pdf' ? '📑 ' : d.kind === 'video' ? '🎬 ' : '🖼 ') + d.name));
      b.appendChild(el('i', null, isLive ? 'LIVE' : d.kind === 'pdf' ? d.pages.length + ' hal' : d.kind === 'video' ? 'Video' : 'Gambar'));
      b.onclick = function () { sel = isLive ? null : { id: d.id, page: 0 }; render() };
      list.appendChild(b);
    });
  }

  var tk = $('tk');
  tk.className = 'ticker' + (S && S.runningText ? ' show' : '');
  tk.textContent = S && S.runningText ? S.runningText : '';
  fitLive();
}

function speakerStep(delta) {
  var pt = previewTarget(); if (!pt) return;
  if (pt.mode === 'sel') { sel.page = Math.max(0, Math.min(pt.deck.pages.length - 1, sel.page + delta)); render() }
  else send({ type: 'deckStep', delta: delta });
}

function speakerLive() {
  var pt = previewTarget(); if (!pt || pt.mode !== 'sel') return;
  send({ type: 'deck', id: pt.deck.id, page: pt.page });
  sel = null;
}

function render() { if (ROLE === 'operator') renderOperator(); else renderSpeaker() }

function connect() {
  var es = new EventSource('/events?k=' + encodeURIComponent(KEY));
  es.onopen = function () { $('dot').className = 'dot on'; $('off').className = 'off' };
  es.onerror = function () { $('dot').className = 'dot'; $('off').className = 'off show' };
  es.onmessage = function (e) { try { var d = JSON.parse(e.data); S = d && d.items ? d : null; render() } catch (x) {} };
}

function tick() {
  var d = new Date(), h = d.getHours(), m = d.getMinutes();
  $('ck').textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

window.addEventListener('resize', function () { if (ROLE === 'speaker') fitLive() });
document.addEventListener('DOMContentLoaded', function () {
  if (ROLE === 'operator') {
    $('pr').onclick = function () { send({ type: 'prev' }) };
    $('nx2').onclick = function () { send({ type: 'next' }) };
    $('go').onclick = function () { send({ type: 'live' }) };
    $('bl').onclick = function () { send({ type: 'blank' }) };
    $('cl').onclick = function () { send({ type: 'clear' }) };
    $('t1').onclick = function () { tab = 'slides'; render() };
    $('t2').onclick = function () { tab = 'items'; render() };
    $('t3').onclick = function () { tab = 'bible'; render() };
    $('t4').onclick = function () { tab = 'media'; M.files = null; render() };
  } else {
    $('zm').onclick = function () { scale = Math.max(0.5, scale - 0.1); try { localStorage.setItem('ec-scale', scale) } catch (e) {} fitLive() };
    $('zp').onclick = function () { scale = Math.min(2, scale + 0.1); try { localStorage.setItem('ec-scale', scale) } catch (e) {} fitLive() };
    $('sp').onclick = function () { speakerStep(-1) };
    $('sn').onclick = function () { speakerStep(1) };
    $('sl').onclick = function () { speakerLive() };
  }
  tick(); setInterval(tick, 10000);
  render(); connect();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
  if (window.matchMedia && matchMedia('(display-mode: standalone)').matches && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(function () {});
  }
});
`

const OPERATOR_BODY = `
<div class="bar"><span class="dot" id="dot"></span><b>Operator</b><span class="sp"></span><span class="pill" id="st">STANDBY</span><span class="clock" id="ck"></span></div>
<div class="off" id="off">Terputus dari PC — menyambung ulang… (pastikan HP di Wi-Fi yang sama)</div>
<div class="main"><div class="colA">
<div class="prev" id="pv"><small id="pvl">Belum Live</small><p id="pvt"></p><img id="pvim" alt=""></div>
<div class="row r2"><button class="btn big" id="pr">◄ Prev</button><button class="btn big" id="nx2">Next ►</button></div>
<div class="row r3"><button class="btn go" id="go">● Go Live</button><button class="btn" id="bl">Blank</button><button class="btn clr" id="cl">Clear</button></div>
</div><div class="colB">
<div class="tabs"><button class="tab on" id="t1">Slide</button><button class="tab" id="t2">Urutan</button><button class="tab" id="t3">Alkitab</button><button class="tab" id="t4">Media</button></div>
<div class="list" id="ls"></div>
</div></div>
`

const SPEAKER_BODY = `
<div class="bar"><span class="dot" id="dot"></span><b>Speaker</b><span class="pill" id="st">STANDBY</span><span class="sp"></span>
<span class="zoom"><button id="zm">A−</button><button id="zp">A+</button></span><span class="clock" id="ck"></span></div>
<div class="off" id="off">Terputus dari PC — menyambung ulang… (pastikan HP di Wi-Fi yang sama)</div>
<div class="ticker" id="tk"></div>
<div class="main speak"><div class="colA">
<div class="mon"><div class="cap lv"><span>● LIVE VIEW</span><span id="lvl"></span></div><div class="scr" id="lvs"></div></div>
</div><div class="colB">
<div class="pvw"><div><div class="cap"><span>PREVIEW</span><span id="pvc"></span></div><div class="scr" id="pvs"></div></div><div class="info" id="pvi"></div></div>
<div class="row r3" style="margin:10px 12px 0"><button class="btn" id="sp">◄ Prev</button><button class="btn go" id="sl">● Live</button><button class="btn" id="sn">Next ►</button></div>
<div class="note" id="sh" style="margin:6px 14px 0;color:#f59e0b"></div>
<div class="decks" id="dl"></div>
</div></div>
`

export function remotePage(role: RemoteRole, key: string): string {
  const title = role === 'operator' ? 'EasyChurch Operator' : 'EasyChurch Speaker'
  const manifest = `/manifest.webmanifest?k=${encodeURIComponent(key)}`
  return `<!doctype html>
<html lang="id"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0f172a">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${role === 'operator' ? 'Operator' : 'Speaker'}">
<link rel="manifest" href="${manifest}">
<link rel="icon" href="/icon.png">
<link rel="apple-touch-icon" href="/icon.png">
<title>${title}</title>
<style>${CSS}</style>
</head><body>
${role === 'operator' ? OPERATOR_BODY : SPEAKER_BODY}
<script>window.__ROLE=${JSON.stringify(role)};window.__KEY=${JSON.stringify(key)};</script>
<script>${JS}</script>
</body></html>`
}
