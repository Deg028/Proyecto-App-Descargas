const express = require('express');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const BIN = path.join(ROOT, 'bin');
const DL = path.join(ROOT, 'downloads');
const DATA = path.join(ROOT, 'data');

// Carga opcional de variables desde .env (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBLIC_URL, PORT, HOST)
try {
  for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* sin .env */ }

const EXE = process.platform === 'win32' ? '.exe' : '';
const YTDLP = path.join(BIN, 'yt-dlp' + EXE);
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const MAX_PARALLEL = 2;

fs.mkdirSync(DL, { recursive: true });

const app = express();
app.use(express.json({ limit: '300kb' })); // las listas envían hasta 200 elementos

// ---------- cuentas (inicio de sesión con Google) ----------
const PUBLIC_URL = (process.env.PUBLIC_URL || 'http://localhost:' + PORT).replace(/\/$/, '');
const G = { id: process.env.GOOGLE_CLIENT_ID || '', secret: process.env.GOOGLE_CLIENT_SECRET || '' };
const REDIRECT = PUBLIC_URL + '/auth/google/callback';
const SESS_FILE = path.join(DATA, 'sessions.json');
const SESSION_TTL = 30 * 24 * 3600 * 1000;
const b64u = b => Buffer.from(b).toString('base64url');
let sessions = {};
try { sessions = JSON.parse(fs.readFileSync(SESS_FILE, 'utf8')); } catch { /* primera vez */ }
const saveSessions = () => { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(SESS_FILE, JSON.stringify(sessions)); } catch { /* sin disco */ } };
const pending = new Map(); // state -> { pair, verifier, created }
const pairs = new Map();   // pair -> { sid, created }

function readCookie(req, name) {
  const c = (req.headers.cookie || '').split(/;\s*/).find(x => x.startsWith(name + '='));
  return c ? decodeURIComponent(c.slice(name.length + 1)) : null;
}
function getUser(req) {
  const sid = readCookie(req, 'tonea_sid'), s = sid && sessions[sid];
  if (!s) return null;
  if (Date.now() - s.created > SESSION_TTL) { delete sessions[sid]; saveSessions(); return null; }
  return s.user;
}
// Cada usuario con sesión tiene su propia carpeta; sin sesión se usa la carpeta común (invitado).
function userDir(req) {
  const u = getUser(req);
  if (!u) return DL;
  const d = path.join(DL, 'u_' + u.id);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const ownerOf = req => { const u = getUser(req); return u ? u.id : 'guest'; };
const htmlEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const msgPage = (title, msg) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEsc(title)}</title><body style="font-family:system-ui,sans-serif;background:#191829;color:#f2eef6;display:grid;place-items:center;min-height:100vh;margin:0"><div style="max-width:420px;padding:24px;text-align:center"><h1 style="margin:0 0 8px">${htmlEsc(title)}</h1><p style="color:#aeabc6;line-height:1.5">${htmlEsc(msg)}</p></div></body>`;

// ---------- acceso desde la red ----------
// Con HOST distinto de localhost (p. ej. 0.0.0.0 para el móvil), quien no venga de este PC necesita la clave de acceso.
// La clave sale de TONEA_TOKEN o se genera una vez y se guarda en data/token.txt. Se entrega con ?t=CLAVE y queda en una cookie.
const LOOPBACK = ['127.0.0.1', '::1', 'localhost'];
const EXPOSED = !LOOPBACK.includes(HOST);
const TOKEN_FILE = path.join(DATA, 'token.txt');
function loadToken() {
  if (process.env.TONEA_TOKEN) return process.env.TONEA_TOKEN;
  try { const t = fs.readFileSync(TOKEN_FILE, 'utf8').trim(); if (t) return t; } catch { /* primera vez */ }
  const t = b64u(crypto.randomBytes(18));
  try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(TOKEN_FILE, t); } catch { /* sin disco: la clave dura hasta reiniciar */ }
  return t;
}
const TOKEN = EXPOSED ? loadToken() : '';
const sameToken = v => { const a = Buffer.from(String(v || '')), b = Buffer.from(TOKEN); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const isLocal = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
const PUBLIC_PATHS = /^\/(manifest\.webmanifest|icon[^/]*)$/;
app.use((req, res, next) => {
  if (!EXPOSED || isLocal(req) || PUBLIC_PATHS.test(req.path)) return next();
  if (sameToken(readCookie(req, 'tonea_key'))) return next();
  if (sameToken(req.query.t)) {
    res.setHeader('Set-Cookie', `tonea_key=${encodeURIComponent(TOKEN)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`);
    return req.method === 'GET' && !req.path.startsWith('/api/') ? res.redirect(req.path) : next();
  }
  if (req.path.startsWith('/api/') || req.path.startsWith('/files/')) return res.status(401).json({ error: 'Falta la clave de acceso de Tonea.' });
  res.status(401).send(msgPage('Acceso protegido', 'Abre Tonea con el enlace o el código QR que muestra el PC (npm run qr), o añade ?t=TU_CLAVE a la dirección.'));
});

app.get('/api/auth/status', (req, res) => res.json({ configured: !!G.id, redirectUri: REDIRECT, user: getUser(req) }));

app.post('/api/auth/pair', (req, res) => {
  const pair = b64u(crypto.randomBytes(16));
  pairs.set(pair, { sid: null, created: Date.now() });
  res.json({ pair });
});

app.get('/auth/google', (req, res) => {
  if (!G.id) return res.status(503).send(msgPage('Inicio de sesión no configurado', 'Falta GOOGLE_CLIENT_ID. Mira el README para crear las credenciales de Google.'));
  const pair = String(req.query.pair || '');
  if (!pairs.has(pair)) return res.status(400).send(msgPage('Solicitud caducada', 'Vuelve a Tonea y pulsa de nuevo "Iniciar sesión con Google".'));
  const state = b64u(crypto.randomBytes(16)), verifier = b64u(crypto.randomBytes(32));
  pending.set(state, { pair, verifier, created: Date.now() });
  const q = new URLSearchParams({
    client_id: G.id, redirect_uri: REDIRECT, response_type: 'code', scope: 'openid email profile', state,
    code_challenge: b64u(crypto.createHash('sha256').update(verifier).digest()), code_challenge_method: 'S256', prompt: 'select_account'
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + q);
});

app.get('/auth/google/callback', async (req, res) => {
  const st = pending.get(String(req.query.state || ''));
  pending.delete(String(req.query.state || ''));
  if (!st || Date.now() - st.created > 600000) return res.status(400).send(msgPage('Solicitud caducada', 'Vuelve a Tonea e inténtalo de nuevo.'));
  if (req.query.error || !req.query.code) return res.send(msgPage('No se inició sesión', 'Cancelaste el inicio de sesión o Google lo rechazó. Puedes cerrar esta pestaña.'));
  try {
    const body = new URLSearchParams({ code: String(req.query.code), client_id: G.id, redirect_uri: REDIRECT, grant_type: 'authorization_code', code_verifier: st.verifier });
    if (G.secret) body.set('client_secret', G.secret);
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const t = await r.json();
    if (!r.ok || !t.id_token) throw new Error(t.error_description || t.error || 'Google rechazó el inicio de sesión.');
    const p = JSON.parse(Buffer.from(t.id_token.split('.')[1], 'base64url').toString());
    if (p.aud !== G.id || !/^(https:\/\/)?accounts\.google\.com$/.test(p.iss) || p.exp * 1000 < Date.now()) throw new Error('La respuesta de Google no es válida.');
    const user = { id: crypto.createHash('sha256').update(String(p.sub)).digest('hex').slice(0, 16), name: p.name || p.email, email: p.email, picture: p.picture || '' };
    const sid = b64u(crypto.randomBytes(32));
    sessions[sid] = { user, created: Date.now() }; saveSessions();
    const pr = pairs.get(st.pair); if (pr) pr.sid = sid;
    res.send(msgPage('¡Listo!', 'Ya iniciaste sesión. Puedes cerrar esta pestaña y volver a Tonea.'));
  } catch (e) { res.status(400).send(msgPage('No pudimos iniciar sesión', e.message)); }
});

// La app consulta aquí hasta que el navegador termine el inicio de sesión; entonces recibe su cookie.
app.get('/api/auth/pair/:id', (req, res) => {
  const p = pairs.get(req.params.id);
  if (!p || Date.now() - p.created > 600000) { pairs.delete(req.params.id); return res.json({ done: false, expired: true }); }
  if (!p.sid) return res.json({ done: false });
  pairs.delete(req.params.id);
  res.setHeader('Set-Cookie', `tonea_sid=${p.sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}`);
  res.json({ done: true, user: sessions[p.sid].user });
});

app.post('/api/auth/logout', (req, res) => {
  const sid = readCookie(req, 'tonea_sid');
  if (sid && sessions[sid]) { delete sessions[sid]; saveSessions(); }
  res.setHeader('Set-Cookie', 'tonea_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pending) if (now - v.created > 600000) pending.delete(k);
  for (const [k, v] of pairs) if (now - v.created > 600000) pairs.delete(k);
}, 60000).unref();

// ---------- utilidades ----------
const AUDIO_EXT = ['mp3', 'm4a', 'opus', 'wav', 'ogg', 'aac', 'flac'];
const VIDEO_EXT = ['mp4', 'webm', 'mkv', 'mov'];

function parseUrl(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch { return null; }
}

// Traduce los errores de yt-dlp a mensajes comprensibles; si no reconoce el error, conserva el original.
const ERRORS = [
  [/Requested format is not available/i, 'Esa calidad o formato no está disponible para este enlace. Prueba con otra calidad.'],
  [/HTTP Error 404/i, 'No se encontró el contenido (error 404). Revisa el enlace.'],
  [/Unsupported URL/i, 'Este enlace o sitio no está soportado.'],
  [/Private video/i, 'El video es privado.'],
  [/Video unavailable|This video is (?:not available|unavailable)|has been removed/i, 'El video no está disponible.'],
  [/not available in your country|geo.?restrict/i, 'El contenido no está disponible en tu país.'],
  [/Sign in to confirm|confirm your age|age.?restricted|\blog ?in\b|login required/i, 'El sitio exige iniciar sesión o verificar la edad.'],
  [/HTTP Error 403/i, 'El sitio rechazó la descarga (error 403). Prueba más tarde.'],
  [/HTTP Error 429|Too Many Requests/i, 'Demasiadas solicitudes al sitio: espera unos minutos.'],
  [/Unable to download webpage|getaddrinfo|Temporary failure|timed out|Network is unreachable|Connection (?:refused|reset)/i, 'No se pudo conectar con el sitio. Revisa tu conexión.'],
  [/ffmpeg|ffprobe|Postprocessing/i, 'Falló la conversión del archivo (ffmpeg).'],
  [/live event|is live|will begin in/i, 'Es una transmisión en vivo y todavía no se puede descargar.']
];
function friendlyError(raw) {
  const msg = String(raw || '').replace(/^ERROR:\s*/, '').replace(/^\[[^\]]+\]\s*/, '').trim();
  const hit = ERRORS.find(([re]) => re.test(raw));
  return hit ? hit[1] : (msg ? 'No se pudo completar: ' + msg.slice(0, 160) : 'No se pudo completar la descarga.');
}

// ---------- yt-dlp: intérprete de JavaScript, cookies y actualización ----------
// YouTube exige un intérprete de JavaScript para descifrar sus enlaces (sin él faltan formatos). Se usa Node.js.
function findJsRuntime() {
  if (process.env.JS_RUNTIME) return { path: process.env.JS_RUNTIME, env: {} };
  if (!process.versions.electron) return { path: process.execPath, env: {} };
  // En Electron, process.execPath es electron.exe: se busca el Node del sistema y, si no hay, Electron hace de Node.
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['node'], { encoding: 'utf8', windowsHide: true });
  const found = (r.stdout || '').split(/\r?\n/).map(l => l.trim()).find(Boolean);
  return found ? { path: found, env: {} } : { path: process.execPath, env: { ELECTRON_RUN_AS_NODE: '1' } };
}
const JS = findJsRuntime();

// Cookies (opcionales, para sitios que exigen sesión como Instagram): data/cookies.txt o COOKIES_FROM_BROWSER=firefox|edge|chrome.
const COOKIES_FILE = path.join(DATA, 'cookies.txt');
function cookieArgs() {
  if (fs.existsSync(COOKIES_FILE)) return ['--cookies', COOKIES_FILE];
  if (process.env.COOKIES_FROM_BROWSER) return ['--cookies-from-browser', process.env.COOKIES_FROM_BROWSER];
  return [];
}
const cookieSource = () => (fs.existsSync(COOKIES_FILE) ? 'archivo' : process.env.COOKIES_FROM_BROWSER ? 'navegador: ' + process.env.COOKIES_FROM_BROWSER : '');
const spawnYtdlp = args => spawn(YTDLP, ['--js-runtimes', 'node:' + JS.path, ...cookieArgs(), ...args], { windowsHide: true, env: { ...process.env, ...JS.env } });

function ytdlpVersion() {
  if (!fs.existsSync(YTDLP)) return '';
  const r = spawnSync(YTDLP, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 20000 });
  return (r.stdout || '').trim();
}
let YTDLP_VERSION = ytdlpVersion();

// Los sitios cambian a menudo y yt-dlp se queda viejo: se actualiza solo (una vez al día al arrancar, y cuando una descarga
// falla con un error típico de versión antigua). Una sola actualización a la vez.
const UPDATE_STAMP = path.join(DATA, 'ytdlp-update.json');
let updating = null;
function updateYtdlp() {
  if (updating) return updating;
  updating = new Promise(resolve => {
    if (!fs.existsSync(YTDLP)) return resolve({ ok: false, changed: false, version: '', message: 'Falta yt-dlp. Ejecuta "npm run setup".' });
    const before = YTDLP_VERSION;
    const p = spawn(YTDLP, ['-U'], { windowsHide: true });
    let out = '';
    p.stdout.on('data', d => (out += d)); p.stderr.on('data', d => (out += d));
    p.on('error', e => resolve({ ok: false, changed: false, version: before, message: e.message }));
    p.on('close', code => {
      YTDLP_VERSION = ytdlpVersion() || before;
      try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(UPDATE_STAMP, JSON.stringify({ checked: Date.now() })); } catch { /* sin disco */ }
      const changed = !!YTDLP_VERSION && YTDLP_VERSION !== before;
      resolve({ ok: code === 0, changed, version: YTDLP_VERSION, message: changed ? 'yt-dlp actualizado a ' + YTDLP_VERSION : code === 0 ? 'yt-dlp ya está al día (' + YTDLP_VERSION + ')' : 'No se pudo actualizar: ' + out.trim().split('\n').pop() });
    });
  }).finally(() => { updating = null; });
  return updating;
}
function autoUpdateDaily() {
  if (process.env.TONEA_NO_AUTOUPDATE) return;
  let last = 0;
  try { last = JSON.parse(fs.readFileSync(UPDATE_STAMP, 'utf8')).checked || 0; } catch { /* nunca */ }
  if (Date.now() - last > 24 * 3600 * 1000) updateYtdlp().then(r => console.log(r.message));
}
// Errores que suelen arreglarse actualizando yt-dlp (no los de enlace roto, privado o sin conexión).
const OUTDATED = /Unable to extract|nsig|n challenge|signature|Requested format is not available|HTTP Error 403|please report this issue/i;

// Listas de reproducción: se leen sin abrir cada video (rápido) y como máximo PLAYLIST_MAX elementos.
const PLAYLIST_MAX = 200;
const isPlaylistUrl = u => /[?&]list=/.test(u) || /\/playlist\b/.test(u);
const isPlaylistOnly = u => isPlaylistUrl(u) && !/[?&]v=/.test(u) && !/youtu\.be\/[\w-]+/.test(u);
function summarizePlaylist(p) {
  if (!p || !Array.isArray(p.entries)) return null;
  const entries = p.entries.filter(e => e && e.id).map(e => ({
    url: e.url && /^https?:/.test(e.url) ? e.url : 'https://www.youtube.com/watch?v=' + e.id,
    title: e.title || e.id, duration: e.duration || 0,
    thumbnail: (e.thumbnails && e.thumbnails.length ? e.thumbnails[e.thumbnails.length - 1].url : '') || ''
  }));
  return entries.length ? { id: p.id || '', title: p.title || 'Lista', channel: p.uploader || p.channel || '', count: entries.length, entries } : null;
}

function runJson(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(YTDLP)) return reject(new Error('Falta yt-dlp. Ejecuta "npm run setup".'));
    const p = spawnYtdlp(args);
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error('Tiempo de espera agotado analizando el enlace.')); }, timeoutMs);
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.on('error', e => { clearTimeout(timer); reject(e); });
    p.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) {
        const line = err.trim().split('\n').filter(Boolean).pop() || 'No se pudo leer ese enlace.';
        return reject(new Error(friendlyError(line)));
      }
      try { resolve(JSON.parse(out)); } catch { reject(new Error('Respuesta inesperada de yt-dlp.')); }
    });
  });
}

function killTree(p) {
  if (!p || p.killed) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { windowsHide: true });
  else p.kill('SIGTERM');
}

// ---------- análisis y búsqueda ----------
app.get('/api/info', async (req, res) => {
  const url = parseUrl(req.query.url);
  if (!url) return res.status(400).json({ error: 'Pega un enlace válido (http o https).' });
  try {
    const plPromise = isPlaylistUrl(url)
      ? runJson(['-J', '--flat-playlist', '--yes-playlist', '--no-warnings', '--playlist-end', String(PLAYLIST_MAX), '--', url], 120000).then(summarizePlaylist).catch(() => null)
      : Promise.resolve(null);
    if (isPlaylistOnly(url)) {
      const pl = await plPromise;
      if (!pl) return res.status(422).json({ error: 'No se pudo leer esa lista de reproducción (puede ser privada).' });
      return res.json({
        url, id: pl.id, title: pl.title, channel: pl.channel, duration: pl.entries.reduce((t, e) => t + (e.duration || 0), 0),
        thumbnail: pl.entries[0].thumbnail, site: 'Lista', heights: [144, 240, 360, 480, 720, 1080], sizes: {}, hasVideo: true,
        isLive: false, playlist: pl, playlistOnly: true
      });
    }
    const d = await runJson(['-J', '--no-playlist', '--no-warnings', '--', url]);
    const formats = d.formats || [];
    const bestAudio = formats.filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
      .reduce((m, f) => Math.max(m, f.filesize || f.filesize_approx || 0), 0);
    const sizes = {};
    for (const f of formats) {
      if (!f.vcodec || f.vcodec === 'none' || !f.height) continue;
      const size = (f.filesize || f.filesize_approx || 0) + (f.acodec && f.acodec !== 'none' ? 0 : bestAudio);
      if (!sizes[f.height] || (size && size > sizes[f.height])) sizes[f.height] = size || sizes[f.height] || 0;
    }
    const heights = Object.keys(sizes).map(Number).filter(h => h >= 144).sort((a, b) => a - b);
    res.json({
      url: d.webpage_url || url,
      id: d.id,
      title: d.title,
      channel: d.uploader || d.channel || '',
      duration: d.duration || 0,
      thumbnail: d.thumbnail || '',
      site: d.extractor_key || '',
      heights,
      sizes,
      hasVideo: heights.length > 0 || formats.some(f => f.vcodec !== 'none' && VIDEO_EXT.includes(f.ext)), // enlaces directos sin altura declarada
      isLive: !!d.is_live,
      playlist: await plPromise
    });
  } catch (e) { res.status(422).json({ error: e.message }); }
});

const isoSecs = s => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || '') || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
async function ytApiSearch(q) {
  const key = encodeURIComponent(process.env.YOUTUBE_API_KEY);
  const get = async u => { const r = await fetch(u); const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status); return j; };
  const s = await get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(q)}&key=${key}`);
  const ids = s.items.map(i => i.id.videoId).filter(Boolean);
  if (!ids.length) return [];
  const v = await get(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids.join(',')}&key=${key}`);
  const dur = Object.fromEntries(v.items.map(i => [i.id, isoSecs(i.contentDetails.duration)]));
  return s.items.filter(i => i.id.videoId).map(i => ({
    id: i.id.videoId, title: i.snippet.title.replace(/&amp;|&#39;|&quot;/g, m => ({ '&amp;': '&', '&#39;': "'", '&quot;': '"' }[m])),
    channel: i.snippet.channelTitle, duration: dur[i.id.videoId] || 0,
    thumbnail: 'https://i.ytimg.com/vi/' + i.id.videoId + '/mqdefault.jpg', url: 'https://www.youtube.com/watch?v=' + i.id.videoId
  }));
}
app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (!q) return res.status(400).json({ error: 'Escribe qué quieres buscar.' });
  try {
    if (process.env.YOUTUBE_API_KEY) { // API oficial de YouTube si hay clave; si falla, se usa yt-dlp
      try { return res.json({ results: await ytApiSearch(q), source: 'api' }); } catch (e) { console.warn('YouTube API:', e.message); }
    }
    const d = await runJson(['--flat-playlist', '-J', '--no-warnings', 'ytsearch12:' + q]);
    const results = (d.entries || []).filter(e => e && e.id).map(e => ({
      id: e.id,
      title: e.title,
      channel: e.channel || e.uploader || '',
      duration: e.duration || 0,
      thumbnail: (e.thumbnails && e.thumbnails.length ? e.thumbnails[e.thumbnails.length - 1].url : '') || 'https://i.ytimg.com/vi/' + e.id + '/mqdefault.jpg',
      url: e.url && /^https?:/.test(e.url) ? e.url : 'https://www.youtube.com/watch?v=' + e.id
    }));
    res.json({ results });
  } catch (e) { res.status(422).json({ error: e.message }); }
});

// ---------- descargas ----------
const jobs = new Map();
const queue = [];
let running = 0;

function buildArgs(job) {
  const base = [
    '--no-playlist', '--no-warnings', '--color', 'never', '--newline', '--progress',
    '--progress-template', 'download:TNP|%(info.format_id)s|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
    '--progress-template', 'postprocess:TNPP|%(progress.status)s',
    '--ffmpeg-location', BIN, '-P', job.dir, '-o', `%(title).110B [%(id)s] (${job.kind === 'audio' ? (job.format === 'wav' ? 'wav' : job.quality + 'k') : job.quality === 'best' ? 'max' : job.quality + 'p'}).%(ext)s`,
    '--windows-filenames', '--no-mtime', '--embed-metadata', '--print', 'after_move:filepath'
  ];
  if (job.kind === 'audio') {
    const args = ['-x', '--audio-format', job.format];
    if (job.format === 'mp3' || job.format === 'm4a' || job.format === 'opus') args.push('--audio-quality', job.quality + 'K');
    return [...base, ...args, '--', job.url];
  }
  const h = job.quality === 'best' ? '' : '[height<=?' + job.quality + ']'; // "<=?" tolera sitios que no declaran la altura
  let f;
  if (job.format === 'mp4') f = `bv*${h}[vcodec^=avc1]+ba[acodec^=mp4a]/bv*${h}+ba/b${h}`;
  else if (job.format === 'webm') f = `bv*${h}[ext=webm]+ba[ext=webm]/bv*${h}+ba/b${h}`;
  else f = `bv*${h}+ba/b${h}`;
  // --remux-video también cubre los archivos que ya vienen en un solo flujo (no pasan por la mezcla de video y audio)
  const remux = job.format === 'mp4' || job.format === 'mkv' ? ['--remux-video', job.format] : [];
  return [...base, '-f', f, '--merge-output-format', job.format, ...remux, '--', job.url];
}

function pump() {
  while (running < MAX_PARALLEL && queue.length) {
    const job = queue.shift();
    if (job.status === 'canceled') continue;
    running++;
    runJob(job).finally(() => { running--; pump(); });
  }
}

function runJob(job) {
  return new Promise(resolve => {
    if (!fs.existsSync(YTDLP)) { job.status = 'error'; job.error = 'Falta yt-dlp. Ejecuta "npm run setup".'; return resolve(); }
    job.status = 'downloading';
    const p = spawnYtdlp(buildArgs(job));
    job.proc = p;
    let buf = '', errTail = '';
    const onLine = raw => {
      const line = raw.trim();
      if (!line) return;
      if (line.startsWith('TNPP|')) {
        if (line.includes('started')) { job.status = 'converting'; job.percent = 99; job.speed = ''; job.eta = ''; }
      } else if (line.startsWith('TNP|')) {
        // yt-dlp informa cada flujo (video y audio) por separado: se combinan en un solo porcentaje.
        const [, fid, pct, speed, eta] = line.split('|');
        if (fid !== job.fid) { if (job.fid && job.streamMax >= 90) job.stream++; job.fid = fid; job.streamMax = 0; }
        const n = parseFloat(pct);
        if (!Number.isNaN(n) && (n < 100 || job.streamMax > 0)) job.streamMax = Math.max(job.streamMax, n);
        const total = job.kind === 'video' ? 2 : 1;
        if (job.status === 'downloading') job.percent = Math.min(99, ((job.stream + job.streamMax / 100) / total) * 100);
        job.speed = (speed || '').trim().replace(/^Unknown.*/, '');
        job.eta = (eta || '').trim().replace(/^Unknown.*/, '');
      } else if (fs.existsSync(line)) {
        job.file = path.basename(line);
      }
    };
    p.stdout.on('data', d => { buf += d; const parts = buf.split(/\r?\n/); buf = parts.pop(); parts.forEach(onLine); });
    p.stderr.on('data', d => { errTail = (errTail + d).slice(-600); });
    p.on('error', e => { job.status = 'error'; job.error = e.message; resolve(); });
    p.on('close', code => {
      if (buf) onLine(buf);
      job.proc = null;
      if (job.status === 'canceled') return resolve();
      if (code === 0 && job.file) { job.status = 'done'; job.percent = 100; job.speed = ''; job.eta = ''; }
      else {
        const last = errTail.trim().split('\n').filter(Boolean).pop() || 'La descarga falló.';
        job.error = friendlyError(last);
        if (!job.autoUpdated && OUTDATED.test(errTail)) {
          // Puede ser que el sitio cambió: se actualiza yt-dlp y, si había versión nueva, se reintenta una vez.
          job.autoUpdated = true; job.status = 'updating';
          updateYtdlp().then(r => {
            if (!jobs.has(job.id) || job.status !== 'updating') return;
            if (r.changed) { Object.assign(job, { status: 'queued', percent: 0, speed: '', eta: '', file: null, error: null, fid: null, stream: 0, streamMax: 0 }); queue.push(job); pump(); }
            else job.status = 'error';
          });
        } else job.status = 'error';
      }
      resolve();
    });
  });
}

const FORMATS = { video: ['mp4', 'webm', 'mkv'], audio: ['mp3', 'm4a', 'opus', 'wav'] };

app.post('/api/download', (req, res) => {
  const b = req.body || {};
  // Un solo enlace ({ url, title, thumbnail }) o varios a la vez ({ items: [...] }, p. ej. una lista de reproducción).
  const many = Array.isArray(b.items);
  const list = (many ? b.items.slice(0, PLAYLIST_MAX) : [b]).map(it => ({ url: parseUrl(it && it.url), title: it && it.title, thumbnail: it && it.thumbnail })).filter(it => it.url);
  const kind = b.kind === 'audio' ? 'audio' : 'video';
  const format = String(b.format || '').toLowerCase();
  if (!list.length) return res.status(400).json({ error: 'Enlace no válido.' });
  if (!FORMATS[kind].includes(format)) return res.status(400).json({ error: 'Formato no permitido.' });
  let quality;
  if (kind === 'audio') quality = [128, 192, 256, 320].includes(Number(b.quality)) ? Number(b.quality) : 192;
  else quality = b.quality === 'best' ? 'best' : [144, 240, 360, 480, 720, 1080, 1440, 2160].includes(Number(b.quality)) ? Number(b.quality) : 720;

  const owner = ownerOf(req), dir = userDir(req), now = Date.now();
  const created = list.map((it, i) => {
    const job = {
      id: crypto.randomUUID(), url: it.url, kind, format, quality,
      title: String(it.title || it.url).slice(0, 200), thumbnail: String(it.thumbnail || ''),
      status: 'queued', percent: 0, speed: '', eta: '', file: null, error: null, created: now - i, proc: null, // -i: conserva el orden de la lista
      fid: null, stream: 0, streamMax: 0, owner, dir
    };
    jobs.set(job.id, job);
    queue.push(job);
    return job;
  });
  pump();
  res.status(201).json(many ? created.map(publicJob) : publicJob(created[0]));
});

const publicJob = j => ({ id: j.id, title: j.title, thumbnail: j.thumbnail, kind: j.kind, format: j.format, quality: j.quality, status: j.status, percent: j.percent, speed: j.speed, eta: j.eta, file: j.file, error: j.error, created: j.created });

app.get('/api/jobs', (req, res) => {
  const me = ownerOf(req);
  res.json([...jobs.values()].filter(j => j.owner === me).sort((a, b) => b.created - a.created).map(publicJob));
});

app.post('/api/jobs/:id/retry', (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j || j.owner !== ownerOf(req)) return res.status(404).json({ error: 'No existe esa descarga.' });
  if (j.status !== 'error') return res.status(409).json({ error: 'Solo se pueden reintentar las descargas con error.' });
  Object.assign(j, { status: 'queued', percent: 0, speed: '', eta: '', file: null, error: null, fid: null, stream: 0, streamMax: 0, created: Date.now() });
  queue.push(j);
  pump();
  res.json(publicJob(j));
});

app.delete('/api/jobs/:id', (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j || j.owner !== ownerOf(req)) return res.status(404).json({ error: 'No existe esa descarga.' });
  if (['queued', 'downloading', 'converting', 'updating'].includes(j.status)) { j.status = 'canceled'; killTree(j.proc); }
  else jobs.delete(j.id);
  res.json({ ok: true });
});

// ---------- biblioteca ----------
function safeName(req, name) {
  const dir = userDir(req);
  const n = path.basename(String(name || ''));
  const full = path.join(dir, n);
  return n && full.startsWith(dir + path.sep) && fs.existsSync(full) && fs.statSync(full).isFile() ? { n, full } : null;
}

app.get('/api/files', (req, res) => {
  const dir = userDir(req);
  const files = fs.readdirSync(dir).filter(f => !/\.(part|ytdl|temp)$/i.test(f) && !f.includes('.part-') && fs.statSync(path.join(dir, f)).isFile()).map(f => {
    const st = fs.statSync(path.join(dir, f));
    const ext = path.extname(f).slice(1).toLowerCase();
    return { name: f, ext, size: st.size, mtime: st.mtimeMs, kind: AUDIO_EXT.includes(ext) ? 'audio' : VIDEO_EXT.includes(ext) ? 'video' : 'other' };
  }).filter(f => f.kind !== 'other').sort((a, b) => b.mtime - a.mtime);
  res.json(files);
});

app.get('/files/:name', (req, res) => {
  const f = safeName(req, req.params.name);
  if (!f) return res.status(404).end();
  if (req.query.dl) return res.download(f.full, f.n);
  res.sendFile(f.full);
});

app.delete('/api/files/:name', (req, res) => {
  const f = safeName(req, req.params.name);
  if (!f) return res.status(404).json({ error: 'Archivo no encontrado.' });
  fs.unlinkSync(f.full);
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({
  ytdlp: fs.existsSync(YTDLP), ffmpeg: fs.existsSync(path.join(BIN, 'ffmpeg' + EXE)),
  ytdlpVersion: YTDLP_VERSION, jsRuntime: path.basename(JS.path), cookies: cookieSource(), updating: !!updating
}));
app.post('/api/ytdlp/update', async (req, res) => res.json(await updateYtdlp()));

app.use(express.static(path.join(ROOT, 'public')));

function start() {
  return new Promise((resolve, reject) => {
    const srv = app.listen(PORT, HOST, () => {
      console.log('Tonea lista en http://localhost:' + PORT + (G.id ? ' (inicio de sesión con Google activo)' : ' (sin Google: define GOOGLE_CLIENT_ID para activarlo)'));
      if (EXPOSED) console.log('Accesible desde tu red local. Clave de acceso (para ?t=): ' + TOKEN);
      console.log('yt-dlp ' + (YTDLP_VERSION || 'no instalado') + ' · JavaScript: ' + JS.path + (cookieSource() ? ' · cookies: ' + cookieSource() : ''));
      setTimeout(autoUpdateDaily, 3000).unref();
      resolve(srv);
    });
    srv.on('error', reject);
  });
}
module.exports = { start, PORT, TOKEN };
if (require.main === module) start();
