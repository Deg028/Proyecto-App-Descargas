// Prepara las herramientas externas: yt-dlp (descarga) y ffmpeg/ffprobe (conversión).
const fs = require('fs');
const path = require('path');

const BIN = path.join(__dirname, 'bin');
const isWin = process.platform === 'win32';
const asset = isWin ? 'yt-dlp.exe' : process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp_linux';
const target = path.join(BIN, isWin ? 'yt-dlp.exe' : 'yt-dlp');
const forceUpdate = process.argv.includes('--update');

async function getYtDlp() {
  if (fs.existsSync(target) && !forceUpdate) return console.log('yt-dlp ya está instalado.');
  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/' + asset;
  console.log('Descargando yt-dlp…');
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('No se pudo descargar yt-dlp (' + res.status + ')');
  fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  if (!isWin) fs.chmodSync(target, 0o755);
  console.log('yt-dlp listo.');
}

function copyTool(name, from) {
  const dest = path.join(BIN, isWin ? name + '.exe' : name);
  if (!from || !fs.existsSync(from)) return console.warn('No se encontró ' + name + ' en node_modules.');
  if (!fs.existsSync(dest)) fs.copyFileSync(from, dest);
  if (!isWin) fs.chmodSync(dest, 0o755);
}

(async () => {
  fs.mkdirSync(BIN, { recursive: true });
  fs.mkdirSync(path.join(__dirname, 'downloads'), { recursive: true });
  copyTool('ffmpeg', (() => { try { return require('ffmpeg-static'); } catch { return null; } })());
  copyTool('ffprobe', (() => { try { return require('ffprobe-static').path; } catch { return null; } })());
  try { await getYtDlp(); } catch (e) { console.warn('Aviso: ' + e.message + '. Ejecuta "npm run setup" con conexión a internet.'); }
})();
