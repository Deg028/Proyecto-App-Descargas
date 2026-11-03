// Tonea de escritorio (Electron): ventana de la app + navegador integrado para YouTube y otros sitios.
const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

process.env.HOST = '127.0.0.1';
// Una carga interrumpida por otra (ERR_ABORTED, -3) es normal al navegar rápido: no debe tumbar la app.
process.on('unhandledRejection', e => console.warn('aviso:', e && e.message ? e.message : e));
const arg = n => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=').slice(1).join('=') : ''; };
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const isHttp = u => /^https?:\/\//i.test(u);

if (!app.requestSingleInstanceLock()) app.quit();

// Todo lo que se abra dentro del navegador integrado se queda en la app (sin ventanas nuevas).
app.on('web-contents-created', (_e, contents) => {
  if (contents.getType() !== 'webview') return;
  contents.setWindowOpenHandler(({ url }) => { if (isHttp(url)) contents.loadURL(url); return { action: 'deny' }; });
  contents.on('will-navigate', (ev, url) => { if (!isHttp(url)) ev.preventDefault(); });
});

async function createWindow() {
  const { start, PORT } = require('./server');
  try { await start(); } catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
  const origin = 'http://127.0.0.1:' + PORT;

  session.fromPartition('persist:tonea-browser').setUserAgent(CHROME_UA);

  const win = new BrowserWindow({
    width: Number(arg('size').split('x')[0]) || 1180, height: Number(arg('size').split('x')[1]) || 860, minWidth: 380, minHeight: 600, backgroundColor: '#191829', autoHideMenuBar: true, title: 'Tonea',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, webviewTag: true, backgroundThrottling: !arg('shot') }
  });
  // El inicio de sesión de Google se hace en el navegador del sistema (Google no permite iniciar sesión en vistas incrustadas).
  win.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith(origin + '/auth/')) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origin)) e.preventDefault(); });
  win.webContents.on('will-attach-webview', (e, prefs, params) => {
    delete prefs.preload; prefs.nodeIntegration = false; prefs.contextIsolation = true;
    params.partition = 'persist:tonea-browser';
    if (params.src && !isHttp(params.src) && params.src !== 'about:blank') e.preventDefault();
  });

  if (process.argv.includes('--debug')) win.webContents.openDevTools({ mode: 'detach' });   // depuración: consola y red de la app
  const shot = arg('shot');
  if (shot) {
    win.webContents.once('did-finish-load', () => setTimeout(async () => {
      if (arg('runfile')) console.log('RUN ' + await win.webContents.executeJavaScript(fs.readFileSync(arg('runfile'), 'utf8'))); // pruebas: guion a ejecutar
      await new Promise(r => setTimeout(r, 1500)); // deja repintar antes de capturar
      win.webContents.invalidate();
      fs.writeFileSync(shot, (await win.webContents.capturePage()).toPNG());
      if (arg('probe')) { // diagnóstico: estado y captura del navegador integrado
        const info = await win.webContents.executeJavaScript(`(() => { const w = document.querySelector('webview'); if (!w) return null; try { return { id: w.getWebContentsId(), url: w.getURL(), title: w.getTitle(), loading: w.isLoading() }; } catch (e) { return { error: String(e) }; } })()`);
        console.log('PROBE ' + JSON.stringify(info));
        if (info && info.id) { const { webContents } = require('electron'); fs.writeFileSync(shot.replace(/\.png$/, '-guest.png'), (await webContents.fromId(info.id).capturePage()).toPNG()); }
      }
      app.quit();
    }, Number(arg('wait')) || 3000));
  }
  win.loadURL(origin + (arg('view') ? '#' + arg('view') : ''));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
