'use strict';
/* ============ utilidades ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('tonea.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tonea.' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isUrl = s => /^https?:\/\/\S+$/i.test(String(s).trim());
const fmtDur = s => { s = Math.round(s || 0); if (!s) return ''; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const fmtSize = b => !b ? '' : b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : b >= 1048576 ? Math.round(b / 1048576) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const cleanName = n => n.replace(/\.[^.]+$/, '').replace(/\s\[[\w-]{6,}\](\s\([^)]*\))?$/, '$1');
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }

async function api(path, opts) {
  const res = await fetch(path, opts);
  let data = null; try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) throw new Error((data && data.error) || 'Algo salió mal. Inténtalo de nuevo.');
  return data;
}

/* ============ iconos ============ */
const ICONS = {
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.2-1.7-.4-1 .3-2.3 1.6-2.3H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-2 5-5 1 2-5z"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  forward: '<path d="M9 6l6 6-6 6"/>',
  reload: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3.5"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
};
function paintIcons(root = document) {
  $$('i[data-icon]', root).forEach(el => {
    if (el.dataset.done) return;
    el.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[el.dataset.icon] || '') + '</svg>';
    el.dataset.done = '1';
  });
}
const ic = n => '<i data-icon="' + n + '"></i>';

/* ============ temas ============ */
const THEMES = [
  { id: 'coral', name: 'Coral nocturno', desc: 'Oscuro con acento coral', c: ['#191829', '#232238', '#D08A78'] },
  { id: 'luz', name: 'Luz', desc: 'Claro y limpio', c: ['#F5F6F8', '#FFFFFF', '#3B5BFF'] },
  { id: 'medianoche', name: 'Medianoche', desc: 'Oscuro azulado', c: ['#0B0D12', '#151922', '#7C9BFF'] },
  { id: 'amoled', name: 'Negro puro', desc: 'AMOLED, ahorra batería', c: ['#000000', '#101113', '#3DDC97'] },
  { id: 'atardecer', name: 'Atardecer', desc: 'Claro y cálido', c: ['#FBF6F1', '#FFFFFF', '#C2410C'] },
  { id: 'lavanda', name: 'Lavanda', desc: 'Claro con toque violeta', c: ['#F6F4FB', '#FFFFFF', '#6A3DF0'] },
  { id: 'indigo', name: 'Índigo eléctrico', desc: 'Violeta profundo con acento cian', c: ['#2A1D86', '#3C2CAB', '#22CCF5'] },
  { id: 'carbon', name: 'Carbón y durazno', desc: 'Gris cálido con acento durazno', c: ['#2B2B2D', '#363639', '#F7B98A'] },
  { id: 'marino', name: 'Marino', desc: 'Casi negro con acento azul', c: ['#101217', '#171A21', '#4A9BF0'] },
  { id: 'cielo', name: 'Cielo índigo', desc: 'Claro azulado con acento índigo', c: ['#DDE9F7', '#F4F8FD', '#4B3FC4'] }
];
const ACCENTS = [['#4C6FFF', 'Azul'], ['#2DD4A0', 'Menta'], ['#FF7A45', 'Naranja'], ['#8B5CF6', 'Violeta'], ['#F0527C', 'Rosa']];
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const inkFor = acc => (ratio('#FFFFFF', acc) >= 4.5 ? '#FFFFFF' : '#0B0D12');

const theme = { id: store.get('theme', 'coral'), accent: store.get('accent', null) };
function applyTheme() {
  const root = document.documentElement;
  if (!THEMES.some(t => t.id === theme.id)) theme.id = 'coral';
  root.dataset.theme = theme.id;
  if (theme.accent) { root.style.setProperty('--accent', theme.accent); root.style.setProperty('--accent-ink', inkFor(theme.accent)); }
  else { root.style.removeProperty('--accent'); root.style.removeProperty('--accent-ink'); }
  const meta = $('meta[name="theme-color"]'); if (meta) meta.content = getComputedStyle(root).getPropertyValue('--bg').trim();
  store.set('theme', theme.id); store.set('accent', theme.accent);
}
function renderThemeSheet() {
  $('#themeList').innerHTML = THEMES.map(t => `
    <button class="theme ${t.id === theme.id ? 'on' : ''}" data-theme="${t.id}" aria-pressed="${t.id === theme.id}">
      <span class="dots">${t.c.map(c => `<span style="background:${c}"></span>`).join('')}</span>
      <span class="txt"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></span>
      ${t.id === theme.id ? '<span class="ck">' + ic('check') + '</span>' : ''}
    </button>`).join('');
  const base = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const defaultAcc = theme.accent ? null : base;
  $('#accentList').innerHTML =
    `<button class="accent ${!theme.accent ? 'on' : ''}" data-accent="" aria-label="Color del tema" aria-pressed="${!theme.accent}" style="background:${defaultAcc || getThemeAccent()};color:${inkFor(defaultAcc || getThemeAccent())}">A</button>` +
    ACCENTS.map(([c, n]) => `<button class="accent ${theme.accent === c ? 'on' : ''}" data-accent="${c}" aria-label="${n}" aria-pressed="${theme.accent === c}" style="background:${c}"></button>`).join('');
  paintIcons($('#sheetTheme'));
}
function getThemeAccent() { return (THEMES.find(t => t.id === theme.id) || THEMES[0]).c[2]; }
const SHEETS = { theme: ['#sheetTheme', '#btnCloseTheme', '#btnTheme'], account: ['#sheetAccount', '#btnCloseAccount', '#btnAccount'] };
function openSheet(which, open) {
  for (const k of Object.keys(SHEETS)) $(SHEETS[k][0]).hidden = !(open && k === which);
  $('#overlay').hidden = !open;
  if (open) { if (which === 'theme') renderThemeSheet(); else renderAccount(); $(SHEETS[which][1]).focus(); }
  else $(SHEETS[which || 'theme'][2]).focus();
}
const closeSheets = () => { if (!$('#sheetTheme').hidden) openSheet('theme', false); else if (!$('#sheetAccount').hidden) openSheet('account', false); };

/* ============ navegación ============ */
let currentView = 'home', booted = false;
function show(view) {
  if (view === 'options' && currentView !== 'options') state.from = currentView;
  currentView = view;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  if (view !== 'watch') stopWatch();
  const tab = ['browser', 'watch'].includes(view) ? 'explore' : view === 'options' ? (['browser', 'explore', 'watch'].includes(state.from) ? 'explore' : 'home') : view;
  $$('.tabbar button').forEach(b => { const on = b.dataset.view === tab; b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
  moveTabInd();
  window.scrollTo({ top: 0 });
  if (booted) { const h = $('#view-' + view + ' h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } else $('#main').focus({ preventScroll: true }); }
  // pinta al instante con lo que ya se conoce y actualiza en segundo plano
  if (view === 'downloads') { renderJobs(); loadJobs(); }
  if (view === 'library') { renderFiles(); loadFiles(); }
  if (view === 'browser') fitBrowser();
}

function moveTabInd() {
  const on = $('.tabbar button.on'), ind = $('#tabInd'); if (!on || !ind) return;
  ind.style.setProperty('--x', on.offsetLeft + 'px'); ind.style.setProperty('--y', on.offsetTop + 'px');
  ind.style.setProperty('--w', on.offsetWidth + 'px'); ind.style.setProperty('--h', on.offsetHeight + 'px');
}
addEventListener('resize', moveTabInd);

/* ============ inicio / análisis ============ */
const state = { info: null, kind: 'video', vf: 'mp4', vq: 720, af: 'mp3', aq: 192, filter: 'all', files: [], jobs: [], from: 'home' };

function homeError(msg) { const e = $('#homeError'); e.textContent = msg || ''; e.hidden = !msg; }
function setBusy(b) {
  $('#formUrl').classList.toggle('busy', b);
  const btn = $('#btnAnalyze'); btn.disabled = b; $('#btnPaste').disabled = b;
  btn.innerHTML = b ? '<span class="spin"></span>Analizando…' : ic('search') + 'Analizar'; paintIcons(btn);
}
function getRecent() { return store.get('recent', []); }
function saveRecent(info) {
  const list = getRecent().filter(r => r.url !== info.url);
  list.unshift({ url: info.url, title: info.title, channel: info.channel, thumbnail: info.thumbnail });
  store.set('recent', list.slice(0, 6)); renderRecent();
}
function renderRecent() {
  const list = getRecent();
  $('#recentWrap').hidden = !list.length;
  $('#recentList').innerHTML = list.map((r, i) => `
    <button class="item" data-recent="${i}">
      <span class="thumb">${r.thumbnail ? `<img src="${esc(r.thumbnail)}" alt="" loading="lazy">` : ic('video')}</span>
      <span class="txt"><span class="t">${esc(r.title)}</span><span class="m">${esc(r.channel || '')}</span></span>
    </button>`).join('');
  paintIcons($('#recentList'));
}

async function analyze(url, from) {
  url = String(url || '').trim();
  const quiet = ['explore', 'browser', 'watch'].includes(from);   // desde estas pantallas los errores salen como aviso
  if (!isUrl(url)) { const m = 'Pega un enlace que empiece por http:// o https://'; quiet ? toast(m) : homeError(m); return; }
  homeError(''); setBusy(true);
  const fab = $('#brDownload'); if (from === 'browser') { fab.disabled = true; brBusy = true; updateBrowserButton(); }
  try {
    const info = await api('/api/info?url=' + encodeURIComponent(url));
    state.info = info; saveRecent(info);
    state.kind = info.heights.length ? state.kind : 'audio';
    pickDefaults(); renderOptions(); pauseBrowserMedia(); show('options');
  } catch (e) {
    if (quiet) toast(e.message); else { show('home'); homeError(e.message); }
  } finally { setBusy(false); fab.disabled = false; brBusy = false; updateBrowserButton(); }
}

/* ============ opciones ============ */
const VIDEO_FMTS = ['mp4', 'webm', 'mkv'], AUDIO_FMTS = ['mp3', 'm4a', 'opus', 'wav'], AUDIO_Q = [128, 192, 256, 320];
function pickDefaults() {
  const hs = state.info.heights;
  if (hs.length) state.vq = hs.filter(h => h <= 720).pop() || hs[0];
}
const hLabel = h => (h === 2160 ? '4K' : h === 4320 ? '8K' : h + 'p');
function renderOptions() {
  const i = state.info, video = state.kind === 'video';
  $('#optThumb').src = i.thumbnail || ''; $('#optThumb').hidden = !i.thumbnail;
  $('#optDur').textContent = fmtDur(i.duration); $('#optDur').hidden = !i.duration;
  $('#optTitle').textContent = i.title; $('#optChannel').textContent = [i.channel, i.site].filter(Boolean).join(' · ');
  $('#tabVideo').classList.toggle('on', video); $('#tabAudio').classList.toggle('on', !video);
  $('#tabVideo').setAttribute('aria-selected', video); $('#tabAudio').setAttribute('aria-selected', !video);
  $('#tabVideo').disabled = !i.heights.length;

  const fmts = video ? VIDEO_FMTS : AUDIO_FMTS, cur = video ? state.vf : state.af;
  $('#fmtChips').innerHTML = fmts.map(f => `<button class="chip-btn ${f === cur ? 'on' : ''}" data-fmt="${f}" aria-pressed="${f === cur}">${f.toUpperCase()}</button>`).join('');

  const qs = $('#qualityTiles'); $('#qualityLabel').textContent = video ? 'Calidad' : 'Calidad del audio';
  if (video) {
    const shown = i.heights.slice(-6);
    qs.innerHTML = shown.map(h => `<button class="tile ${h === state.vq ? 'on' : ''}" data-q="${h}" aria-pressed="${h === state.vq}">${hLabel(h)}<small>${i.sizes[h] ? '≈ ' + fmtSize(i.sizes[h]) : '&nbsp;'}</small></button>`).join('');
  } else if (state.af === 'wav') {
    qs.innerHTML = '<button class="tile on" disabled style="grid-column:1/-1">Sin pérdida<small>El WAV no usa tasa de bits</small></button>';
  } else {
    qs.innerHTML = AUDIO_Q.map(k => `<button class="tile ${k === state.aq ? 'on' : ''}" data-q="${k}" aria-pressed="${k === state.aq}">${k} kbps<small>${i.duration ? '≈ ' + fmtSize(i.duration * k * 125) : '&nbsp;'}</small></button>`).join('');
  }
  const q = video ? hLabel(state.vq) : (state.af === 'wav' ? 'sin pérdida' : state.aq + ' kbps');
  $('#ctaText').textContent = `Descargar ${(video ? state.vf : state.af).toUpperCase()} · ${q}`;
  $('#optNote').textContent = i.isLive ? 'Es una transmisión en vivo: puede que no se pueda descargar.' : (video ? 'Los tamaños son aproximados.' : 'Se extrae el audio y se convierte al formato elegido.');
}

async function startDownload() {
  const i = state.info, video = state.kind === 'video', btn = $('#btnDownload');
  btn.disabled = true;
  try {
    await api('/api/download', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: i.url, kind: state.kind, format: video ? state.vf : state.af, quality: video ? state.vq : state.aq, title: i.title, thumbnail: i.thumbnail })
    });
    toast('Descarga iniciada'); show('downloads'); loadJobs();
  } catch (e) { toast(e.message); } finally { btn.disabled = false; }
}

/* ============ descargas ============ */
const STATUS = { queued: 'En cola', downloading: 'Descargando…', converting: 'Convirtiendo…', done: 'Completada', error: 'Error', canceled: 'Cancelada' };
let prevStatus = {};
async function loadJobs() {
  if (document.hidden) return;
  try {
    const jobs = await api('/api/jobs'); state.jobs = jobs;
    for (const j of jobs) {
      if (prevStatus[j.id] && prevStatus[j.id] !== 'done' && j.status === 'done') { toast('Listo: ' + j.title); loadFiles(); }
      prevStatus[j.id] = j.status;
    }
    $('#navDot').hidden = !jobs.some(j => ['queued', 'downloading', 'converting'].includes(j.status));
    if ($('#view-downloads').classList.contains('active')) renderJobs();
  } catch { /* servidor no disponible */ }
}
function renderJobs() {
  const jobs = state.jobs.filter(j => j.status !== 'canceled');
  $('#jobEmpty').hidden = jobs.length > 0;
  $('#jobList').innerHTML = jobs.map(j => {
    const active = ['queued', 'downloading', 'converting'].includes(j.status);
    const q = j.kind === 'audio' ? (j.format === 'wav' ? '' : ' · ' + j.quality + ' kbps') : ' · ' + (j.quality === 'best' ? 'máxima' : hLabel(j.quality));
    const pct = j.status === 'converting' ? 100 : Math.round(j.percent);
    const extra = j.status === 'downloading' ? [j.speed, j.eta ? 'quedan ' + j.eta : ''].filter(Boolean).join(' · ') : '';
    return `<div class="item job ${j.status === 'error' ? 'err' : ''}" data-job="${j.id}">
      <div class="head">
        <span class="thumb">${j.thumbnail ? `<img src="${esc(j.thumbnail)}" alt="" loading="lazy">` : ic(j.kind === 'audio' ? 'music' : 'video')}</span>
        <span class="txt"><span class="t">${esc(j.title)}</span><span class="m">${j.format.toUpperCase()}${q}</span></span>
      </div>
      ${j.status === 'error' ? `<p class="error">${esc(j.error || 'La descarga falló.')}</p>` : `
      <div><div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${j.status === 'done' ? 100 : pct}%"></div></div>
      <div class="stat"><span>${STATUS[j.status]}${extra ? ' · ' + esc(extra) : ''}</span><b>${j.status === 'done' ? '100' : pct}%</b></div></div>`}
      <div class="actions">
        ${active ? `<button class="btn outline" data-act="cancel">Cancelar</button>` : ''}
        ${j.status === 'done' && j.file ? `<a class="btn primary" href="/files/${encodeURIComponent(j.file)}?dl=1" download>${ic('download')}Guardar</a><button class="btn secondary" data-act="play" data-file="${esc(j.file)}">${ic('play')}Reproducir</button>` : ''}
        ${!active ? `<button class="btn secondary" data-act="remove">Quitar</button>` : ''}
      </div></div>`;
  }).join('');
  paintIcons($('#jobList'));
}

/* ============ biblioteca ============ */
async function loadFiles() {
  try { state.files = await api('/api/files'); renderFiles(); } catch { /* sin servidor */ }
}
function renderFiles() {
  const all = state.files, list = all.filter(f => state.filter === 'all' || f.kind === state.filter);
  $('#libEmpty').hidden = all.length > 0;
  $('#libInfo').textContent = all.length ? `${all.length} archivo${all.length === 1 ? '' : 's'} · ${fmtSize(all.reduce((s, f) => s + f.size, 0))}` : '';
  $('#libList').innerHTML = list.map(f => `
    <div class="item file" data-file="${esc(f.name)}">
      <span class="thumb">${ic(f.kind === 'audio' ? 'music' : 'video')}</span>
      <span class="txt"><span class="t">${esc(cleanName(f.name))}</span><span class="m">${f.ext.toUpperCase()} · ${fmtSize(f.size)} · ${new Date(f.mtime).toLocaleDateString('es-ES')}</span></span>
      <button class="round-btn fill" data-act="play" data-file="${esc(f.name)}" aria-label="Reproducir">${ic('play')}</button>
      <a class="round-btn" href="/files/${encodeURIComponent(f.name)}?dl=1" download aria-label="Guardar">${ic('download')}</a>
      <button class="round-btn ghost" data-act="delete" data-file="${esc(f.name)}" aria-label="Eliminar">${ic('trash')}</button>
    </div>`).join('');
  paintIcons($('#libList'));
}
function play(name) {
  const f = state.files.find(x => x.name === name), kind = f ? f.kind : (/\.(mp3|m4a|opus|wav|ogg|aac|flac)$/i.test(name) ? 'audio' : 'video');
  const src = '/files/' + encodeURIComponent(name);
  $('#playerTitle').textContent = cleanName(name);
  $('#playerBody').innerHTML = kind === 'audio' ? `<div class="cover">${ic('music')}</div><audio controls autoplay src="${src}"></audio>` : `<video controls autoplay playsinline src="${src}"></video>`;
  paintIcons($('#playerBody')); $('#player').hidden = false; $('#btnClosePlayer').focus();
}
function closePlayer() { $('#playerBody').innerHTML = ''; $('#player').hidden = true; }

/* ============ explorar ============ */
const SITES = [['Vimeo', 'https://vimeo.com'], ['TikTok', 'https://www.tiktok.com'], ['Instagram', 'https://www.instagram.com'], ['Facebook', 'https://www.facebook.com'], ['SoundCloud', 'https://soundcloud.com'], ['X', 'https://x.com'], ['Twitch', 'https://www.twitch.tv']];
let searchResults = [];
async function search(q) {
  const err = $('#searchError'); err.hidden = true;
  $('#searchResults').innerHTML = '<div class="empty"><span class="spin"></span><p>Buscando…</p></div>';
  try {
    const { results } = await api('/api/search?q=' + encodeURIComponent(q)); searchResults = results;
    $('#searchResults').innerHTML = results.length ? results.map((r, i) => `
      <article class="vcard">
        <button class="vthumb" data-watch="${i}" aria-label="Ver ${esc(r.title)}">
          <img src="${esc(r.thumbnail)}" alt="" loading="lazy">${r.duration ? `<span class="vdur">${fmtDur(r.duration)}</span>` : ''}<span class="vplay">${ic('play')}</span>
        </button>
        <div class="vmeta"><span class="t">${esc(r.title)}</span><span class="m">${esc(r.channel)}</span></div>
        <button class="round-btn" data-search="${i}" aria-label="Elegir formato y descargar">${ic('download')}</button>
      </article>`).join('') : '<div class="empty"><p>No encontramos resultados.</p></div>';
    paintIcons($('#searchResults'));
  } catch (e) { $('#searchResults').innerHTML = ''; err.textContent = e.message; err.hidden = false; }
}
const CATS = ['Música', 'Videojuegos', 'Cine y tráilers', 'Noticias', 'Deportes', 'Cocina', 'Tecnología', 'Podcasts'];
function runCat(q) { $('#inpSearch').value = ''; $$('#cats .chip-btn').forEach(b => b.classList.toggle('on', b.dataset.cat === q)); search(q); }

/* ============ reproductor propio (YouTube IFrame Player API, sin la interfaz de YouTube) ============ */
let yt = null, ytReady = null, wTimer = 0, wCur = null, wDur = 0;
function loadYT() {
  if (ytReady) return ytReady;
  return ytReady = new Promise((ok, fail) => {
    if (window.YT && YT.Player) return ok();
    window.onYouTubeIframeAPIReady = ok;
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => { ytReady = null; fail(new Error('Sin conexión con YouTube')); };
    document.head.appendChild(s);
  });
}
const fmtClock = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
function wState(msg) { const e = $('#wpState'); e.hidden = !msg; e.innerHTML = msg || ''; }
function wPaint() {
  if (!yt || !yt.getCurrentTime) return;
  const t = yt.getCurrentTime(), d = wDur = yt.getDuration() || wDur;
  if (document.activeElement !== $('#wpSeek')) $('#wpSeek').value = d ? Math.round(t / d * 1000) : 0;
  $('#wpSeek').style.setProperty('--p', (d ? t / d * 100 : 0) + '%');
  $('#wpTime').textContent = fmtClock(t) + ' / ' + fmtClock(d);
  $('#wpSeek').setAttribute('aria-valuetext', fmtClock(t) + ' de ' + fmtClock(d));
}
function wIcon() {
  const playing = yt && yt.getPlayerState && yt.getPlayerState() === 1;
  const b = $('#wpPlay'); b.innerHTML = ic(playing ? 'pause' : 'play'); b.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir'); paintIcons(b);
  $('#wp').classList.toggle('paused', !playing);
}
function wMuteIcon() { const m = yt && yt.isMuted(); const b = $('#wpMute'); b.innerHTML = ic(m ? 'mute' : 'volume'); paintIcons(b); }
async function watch(r) {
  wCur = r; $('#inpUrl').value = r.url;
  $('#wTitle').textContent = r.title; $('#wChannel').textContent = r.channel || '';
  show('watch'); wState('<span class="spin"></span>Cargando…'); $('#wpSeek').value = 0; $('#wpTime').textContent = '0:00 / ' + fmtClock(r.duration);
  loadRelated(r);
  try { await loadYT(); } catch (e) { return wState('No se pudo conectar con YouTube. Revisa tu conexión o descarga el video para verlo desde la biblioteca.'); }
  if (wCur !== r) return;
  if (yt && yt.loadVideoById) { yt.loadVideoById(r.id); return; }
  yt =new YT.Player('ytHost', {
    videoId: r.id, width: '100%', height: '100%',
    playerVars: { controls: 0, rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1, fs: 0, iv_load_policy: 3, autoplay: 1, origin: location.origin },
    events: {
      onReady: e => { e.target.setVolume(+$('#wpVol').value); wState(''); wTimer = setInterval(wPaint, 250); wIcon(); },
      onStateChange: e => { wState(e.data === 3 ? '<span class="spin"></span>' : ''); wIcon(); },
      onError: e => wState(([101, 150, 152, 153].includes(e.data) ? 'Este video no permite reproducirse fuera de YouTube.' : 'No se pudo reproducir este video.') + '<br>Puedes descargarlo y verlo desde tu biblioteca.')
    }
  });
}
function stopWatch() {
  if (yt && yt.pauseVideo) { try { yt.pauseVideo(); } catch { /* aún cargando */ } }
}
async function loadRelated(r) {
  const box = $('#wRelated'); box.innerHTML = '<div class="empty"><span class="spin"></span></div>';
  try {
    const { results } = await api('/api/search?q=' + encodeURIComponent(r.title.replace(/[\[\(].*?[\]\)]/g, '').slice(0, 60)));
    searchResults = results.filter(x => x.id !== r.id);
    box.innerHTML = searchResults.map((x, i) => `
      <button class="item" data-watch="${i}"><span class="thumb"><img src="${esc(x.thumbnail)}" alt="" loading="lazy"></span>
        <span class="txt"><span class="t">${esc(x.title)}</span><span class="m">${esc(x.channel)}${x.duration ? ' · ' + fmtDur(x.duration) : ''}</span></span></button>`).join('');
  } catch { box.innerHTML = ''; }
}
$('#wp').addEventListener('keydown', e => {
  if (!yt || e.target.matches('input')) return;
  const k = e.key, t = yt.getCurrentTime();
  if (k === 'ArrowRight') yt.seekTo(t + 5, true); else if (k === 'ArrowLeft') yt.seekTo(t - 5, true);
  else if (k === 'f') $('#wpFull').click(); else if (k === 'm') $('#wpMute').click(); else return;
  e.preventDefault(); wPaint();
});
$('#wpPlay').addEventListener('click', () => { if (!yt) return; yt.getPlayerState() === 1 ? yt.pauseVideo() : yt.playVideo(); });
$('#wpShield').addEventListener('click', () => $('#wpPlay').click());
$('#wpSeek').addEventListener('input', e => { if (yt && wDur) { yt.seekTo(e.target.value / 1000 * wDur, true); wPaint(); } });
$('#wpVol').addEventListener('input', e => { if (yt) { yt.setVolume(+e.target.value); if (+e.target.value) yt.unMute(); wMuteIcon(); } });
$('#wpMute').addEventListener('click', () => { if (!yt) return; yt.isMuted() ? yt.unMute() : yt.mute(); wMuteIcon(); });
$('#wpFull').addEventListener('click', () => { const w = $('#wp'); document.fullscreenElement ? document.exitFullscreen() : w.requestFullscreen && w.requestFullscreen(); });
$('#btnWatchBack').addEventListener('click', () => show('explore'));
$('#btnWatchDl').addEventListener('click', () => { if (wCur) analyze(wCur.url, 'watch'); });

/* ============ navegador integrado (solo app de escritorio) ============ */
const desktop = !!(window.tonea && window.tonea.isElectron);
let wv = null, wvReady = false;
const SITE_START = 'https://www.youtube.com';
const VIDEO_URL = /(youtube\.com\/(watch|shorts|live)|youtu\.be\/|vimeo\.com\/\d|tiktok\.com\/.*\/video\/|instagram\.com\/(reel|p|tv)\/|facebook\.com\/.*\/(videos|watch)|twitch\.tv\/(videos|\w+\/clip)|dailymotion\.com\/video|soundcloud\.com\/[^/]+\/[^/]+|x\.com\/.*\/status|twitter\.com\/.*\/status)/i;
function normalizeAddress(v) {
  v = v.trim(); if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v) && !/\s/.test(v)) return 'https://' + v;
  return 'https://www.google.com/search?q=' + encodeURIComponent(v);
}
let brBusy = false;
function updateBrowserButton() {
  const url = wv && wvReady ? wv.getURL() : '', ok = VIDEO_URL.test(url);
  $('#brDownloadText').textContent = brBusy ? 'Analizando…' : ok ? 'Descargar este video' : 'Descargar de esta página';
}
function pauseBrowserMedia() {   // evita que el video siga sonando al salir del navegador
  if (wv && wvReady) wv.executeJavaScript('document.querySelectorAll("video,audio").forEach(m=>m.pause())').catch(() => {});
}
function updateNavState() {
  if (!wv || !wvReady) return;
  $('#brBack').disabled = !wv.canGoBack(); $('#brFwd').disabled = !wv.canGoForward();
  const url = wv.getURL(); if (document.activeElement !== $('#brUrl')) $('#brUrl').value = url === 'about:blank' ? '' : url;
  updateBrowserButton();
}
function ensureWebview(startUrl) {
  if (wv) return wv;
  wv = document.createElement('webview');
  wv.setAttribute('partition', 'persist:tonea-browser');
  wv.setAttribute('src', startUrl);
  wv.addEventListener('dom-ready', () => {
    wvReady = true;
    if (pendingNav) { const u = pendingNav; pendingNav = null; if (wv.getURL() !== u) wv.loadURL(u).catch(() => {}); }
    updateNavState();
  });
  ['did-navigate', 'did-navigate-in-page', 'did-stop-loading'].forEach(e => wv.addEventListener(e, updateNavState));
  wv.addEventListener('did-start-loading', () => $('#brReload').classList.add('on'));
  wv.addEventListener('did-stop-loading', () => $('#brReload').classList.remove('on'));
  wv.addEventListener('did-fail-load', ev => { if (ev.errorCode !== -3 && ev.isMainFrame) toast('No se pudo cargar la página.'); });
  $('#brFrame').appendChild(wv);
  return wv;
}
let pendingUrl = null, pendingNav = null;
function openSite(url) {
  if (!desktop) { show('browser'); return; }
  const existed = !!wv;
  pendingUrl = url; show('browser'); $('#brUrl').value = url;
  if (existed) { if (wvReady) wv.loadURL(url).catch(() => {}); else pendingNav = url; }   // -3 = carga interrumpida por otra: es normal
}
function fitBrowser() {
  $('#brNote').hidden = desktop; $('#brFrame').hidden = !desktop;
  $('#brDownload').hidden = !desktop; $('.browser-bar').hidden = !desktop;
  if (desktop && !wv) ensureWebview(pendingUrl || SITE_START);
  pendingUrl = null;
  paintIcons($('#view-browser'));
}

/* ============ cuenta (Google) ============ */
const account = { user: null, configured: false, redirectUri: '', waiting: false };
const G_LOGO = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.7 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
function paintAccountButton() {
  const b = $('#btnAccount');
  if (account.user && account.user.picture) b.innerHTML = `<img src="${esc(account.user.picture)}" alt="" referrerpolicy="no-referrer">`;
  else { b.innerHTML = ic('user'); paintIcons(b); }
  b.setAttribute('aria-label', account.user ? 'Cuenta de ' + account.user.name : 'Iniciar sesión');
}
function renderAccount() {
  const u = account.user, el = $('#accountBody');
  if (u) {
    el.innerHTML = `<div class="acct">
      <div class="acct-card"><span class="avatar">${u.picture ? `<img class="avatar" src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : ic('user')}</span>
        <span><div class="t">${esc(u.name)}</div><div class="m">${esc(u.email)}</div></span></div>
      <p class="muted small">Tu biblioteca y tus descargas son privadas: solo las ves con esta cuenta.</p>
      <button class="btn outline" id="btnLogout">Cerrar sesión</button></div>`;
  } else {
    el.innerHTML = `<div class="acct">
      <p class="muted">Inicia sesión para tener tu propia biblioteca. Sin cuenta usas la biblioteca de invitado, compartida en este equipo.</p>
      <button class="gbtn" id="btnGoogle" ${account.configured && !account.waiting ? '' : 'disabled'}>${account.waiting ? '<span class="spin"></span>Esperando a Google…' : G_LOGO + 'Continuar con Google'}</button>
      ${account.waiting ? '<p class="muted small">Termina el inicio de sesión en el navegador que se abrió y vuelve aquí.</p>' : ''}
      ${account.configured ? '' : `<div class="warn">El inicio de sesión con Google aún no está configurado. Crea un <b>ID de cliente OAuth</b> en Google Cloud, ponlo en <code>.env</code> como <code>GOOGLE_CLIENT_ID</code> y registra este URI de redirección: <code>${esc(account.redirectUri)}</code>. Los pasos están en el README.</div>`}</div>`;
  }
  paintIcons(el);
}
async function loadAccount() {
  try { const s = await api('/api/auth/status'); account.user = s.user; account.configured = s.configured; account.redirectUri = s.redirectUri; } catch { /* sin servidor */ }
  paintAccountButton();
}
async function googleLogin() {
  try {
    const { pair } = await api('/api/auth/pair', { method: 'POST' });
    window.open('/auth/google?pair=' + encodeURIComponent(pair), '_blank', 'noopener');
    account.waiting = true; renderAccount();
    const t0 = Date.now();
    const timer = setInterval(async () => {
      try {
        const r = await api('/api/auth/pair/' + pair);
        if (r.done) { clearInterval(timer); account.waiting = false; account.user = r.user; paintAccountButton(); renderAccount(); toast('Hola, ' + r.user.name.split(' ')[0]); loadFiles(); loadJobs(); }
        else if (r.expired || Date.now() - t0 > 600000) { clearInterval(timer); account.waiting = false; renderAccount(); }
      } catch { clearInterval(timer); account.waiting = false; renderAccount(); }
    }, 1500);
  } catch (e) { toast(e.message); }
}
async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ya cerrada */ }
  account.user = null; paintAccountButton(); renderAccount(); toast('Sesión cerrada'); state.files = []; loadFiles(); loadJobs();
}

/* ============ eventos ============ */
document.addEventListener('click', async ev => {
  const t = ev.target.closest('button, a, [data-go], [data-open]'); if (!t) return;
  if (t.dataset.open) return openSite(t.dataset.open);
  if (t.id === 'btnGoogle') return googleLogin();
  if (t.id === 'btnLogout') return logout();
  if (t.dataset.go) { show(t.dataset.go); if (t.dataset.focus === 'sites') { $('#sitesBlock').hidden = false; $('#sitesBlock').scrollIntoView({ behavior: 'smooth' }); } else if (t.dataset.go === 'explore') $('#inpSearch').focus(); return; }
  if (t.dataset.view) return show(t.dataset.view);
  if (t.dataset.recent !== undefined) { const r = getRecent()[+t.dataset.recent]; if (r) { $('#inpUrl').value = r.url; return analyze(r.url); } }
  if (t.dataset.watch !== undefined) { const r = searchResults[+t.dataset.watch]; if (r) return watch(r); }
  if (t.dataset.cat) return runCat(t.dataset.cat);
  if (t.dataset.search !== undefined) { const r = searchResults[+t.dataset.search]; if (r) { $('#inpUrl').value = r.url; return analyze(r.url, 'explore'); } }
  if (t.dataset.fmt) { state[state.kind === 'video' ? 'vf' : 'af'] = t.dataset.fmt; return renderOptions(); }
  if (t.dataset.q) { state[state.kind === 'video' ? 'vq' : 'aq'] = Number(t.dataset.q); return renderOptions(); }
  if (t.dataset.theme) { theme.id = t.dataset.theme; theme.accent = null; applyTheme(); return renderThemeSheet(); }
  if (t.classList.contains('accent')) { theme.accent = t.dataset.accent || null; applyTheme(); return renderThemeSheet(); }
  if (t.dataset.f) { state.filter = t.dataset.f; $$('#libFilters .chip-btn').forEach(b => b.classList.toggle('on', b === t)); return renderFiles(); }
  const act = t.dataset.act;
  if (act === 'play') return play(t.dataset.file);
  if (act === 'delete') {
    if (!confirm('¿Eliminar este archivo del disco?')) return;
    try { await api('/api/files/' + encodeURIComponent(t.dataset.file), { method: 'DELETE' }); toast('Archivo eliminado'); loadFiles(); } catch (e) { toast(e.message); }
    return;
  }
  if (act === 'cancel' || act === 'remove') {
    const id = t.closest('[data-job]').dataset.job;
    try { await api('/api/jobs/' + id, { method: 'DELETE' }); loadJobs(); } catch (e) { toast(e.message); }
  }
});

$('#btnTheme').addEventListener('click', () => openSheet('theme', true));
$('#btnAccount').addEventListener('click', () => openSheet('account', true));
$('#btnCloseTheme').addEventListener('click', () => openSheet('theme', false));
$('#btnCloseAccount').addEventListener('click', () => openSheet('account', false));
$('#overlay').addEventListener('click', closeSheets);
$('#btnClosePlayer').addEventListener('click', closePlayer);
$('#player').addEventListener('click', e => { if (e.target.id === 'player') closePlayer(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#player').hidden) closePlayer(); else closeSheets(); } });
$('#btnOptBack').addEventListener('click', () => show(state.from && state.from !== 'options' ? state.from : 'home'));

// navegador integrado
$('#brBack').addEventListener('click', () => wv && wv.canGoBack() && wv.goBack());
$('#brFwd').addEventListener('click', () => wv && wv.canGoForward() && wv.goForward());
$('#brReload').addEventListener('click', () => wv && wvReady && wv.reload());
$('#brClose').addEventListener('click', () => show('explore'));
$('#brForm').addEventListener('submit', e => { e.preventDefault(); const u = normalizeAddress($('#brUrl').value); if (u) { $('#brUrl').blur(); openSite(u); } });
$('#brDownload').addEventListener('click', () => { const u = wv && wvReady ? wv.getURL() : ''; if (!u || u === 'about:blank') return toast('Abre primero la página del video.'); analyze(u, 'browser'); });
$('#brOpenExternal').addEventListener('click', () => window.open(SITE_START, '_blank', 'noopener'));

$('#tabVideo').addEventListener('click', () => { state.kind = 'video'; renderOptions(); });
$('#tabAudio').addEventListener('click', () => { state.kind = 'audio'; renderOptions(); });
$('#btnDownload').addEventListener('click', startDownload);

const inp = $('#inpUrl');
// onda del campo: barras que respiran en reposo y suben al escribir o analizar
const WAVE = Array.from({ length: 44 }, (_, i) => (0.35 + 0.65 * Math.abs(Math.sin(i * 0.62) * Math.cos(i * 0.21 + 1))).toFixed(2));
$('#wave').innerHTML = WAVE.map((a, i) => '<span style="--a:' + a + ';--d:' + ((i * 83) % 1400) + 'ms"></span>').join('');
let typingT;
function bumpWave() { const f = $('#formUrl'); f.classList.add('typing'); clearTimeout(typingT); typingT = setTimeout(() => f.classList.remove('typing'), 450); }
inp.addEventListener('input', () => { $('#btnClear').hidden = !inp.value; homeError(''); bumpWave(); checkClip(); });
// ofrece el enlace copiado (si el navegador deja leer el portapapeles sin preguntar)
let clipUrl = '';
async function checkClip() {
  const chip = $('#pasteChip');
  try {
    if (currentView !== 'home' || document.hidden) return;
    const t = (await navigator.clipboard.readText()).trim();
    const u = /^https?://S+$/i.test(t) ? new URL(t) : null;
    if (!u || t === inp.value.trim()) { chip.hidden = true; return; }
    clipUrl = t; $('#pasteHost').textContent = u.hostname.replace(/^www./, ''); chip.hidden = false;
  } catch { chip.hidden = true; }
}
$('#pasteChip').addEventListener('click', () => { inp.value = clipUrl; $('#btnClear').hidden = false; $('#pasteChip').hidden = true; analyze(clipUrl); });
addEventListener('focus', checkClip); document.addEventListener('visibilitychange', checkClip);
$('#btnClear').addEventListener('click', () => { inp.value = ''; $('#btnClear').hidden = true; inp.focus(); });
$('#formUrl').addEventListener('submit', e => { e.preventDefault(); analyze(inp.value); });
$('#btnPaste').addEventListener('click', async () => {
  try {
    const txt = (await navigator.clipboard.readText()).trim();
    if (!txt) return homeError('El portapapeles está vacío. Copia primero un enlace.');
    inp.value = txt; $('#btnClear').hidden = false; analyze(txt);
  } catch { homeError('No pude leer el portapapeles. Pega el enlace en el campo (Ctrl+V o mantén pulsado).'); inp.focus(); }
});
$('#btnClearRecent').addEventListener('click', () => { store.set('recent', []); renderRecent(); });
$('#formSearch').addEventListener('submit', e => { e.preventDefault(); const q = $('#inpSearch').value.trim(); if (q) { $$('#cats .chip-btn').forEach(b => b.classList.remove('on')); search(q); } });
$('#cats').innerHTML = CATS.map((c, i) => `<button class="chip-btn${i ? '' : ' on'}" data-cat="${c}">${c}</button>`).join('');
search(CATS[0]);   // el feed inicial de Explorar

/* ============ arranque ============ */
$('#sitesGrid').innerHTML = SITES.map(([n, u]) => `<button class="site" data-open="${u}" style="background:none;border:0;padding:0"><b>${n[0]}</b>${n}</button>`).join('');
if (!desktop) $('#sitesHint').textContent = 'Abre el sitio, copia el enlace del video y pégalo en Inicio. (Para abrirlos dentro de Tonea usa la app de escritorio.)';
applyTheme(); paintIcons(); renderRecent(); loadAccount(); booted = true; moveTabInd(); checkClip();
if (document.fonts) document.fonts.ready.then(moveTabInd);
setInterval(loadJobs, 1200); loadJobs(); loadFiles();
const startView = location.hash.slice(1);
if (['home', 'explore', 'downloads', 'library', 'browser'].includes(startView) && !(startView === 'browser' && !desktop)) show(startView);
fetch('/api/health').then(r => r.json()).then(h => { if (!h.ytdlp || !h.ffmpeg) toast('Faltan herramientas: ejecuta "npm run setup".'); }).catch(() => {});
