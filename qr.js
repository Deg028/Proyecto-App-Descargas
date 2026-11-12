// Arranca Tonea visible en la red local y muestra un QR para abrirlo desde el teléfono (en el terminal y en una página).
process.env.HOST = '0.0.0.0';
const os = require('os'), fs = require('fs'), path = require('path'), { exec } = require('child_process');
const QR = require('qrcode');
const { start, PORT, TOKEN } = require('./server');

// Prefiere la interfaz Wi-Fi/Ethernet real y deja al final los adaptadores virtuales (VirtualBox, WSL, Docker…).
const ips = Object.entries(os.networkInterfaces()).flatMap(([name, list]) => list.filter(a => a.family === 'IPv4' && !a.internal).map(a => ({ name, ip: a.address })))
  .sort((a, b) => (/wi-?fi|wlan|ethernet|local/i.test(b.name) ? 1 : 0) - (/wi-?fi|wlan|ethernet|local/i.test(a.name) ? 1 : 0) || (/\.1$/.test(a.ip) ? 1 : 0) - (/\.1$/.test(b.ip) ? 1 : 0));

start().catch(e => { if (e.code !== 'EADDRINUSE') throw e; }).then(async () => {
  if (!ips.length) return console.log('No encontré una red local. Conéctate a una Wi-Fi.');
  const urls = ips.map(i => ({ ...i, url: `http://${i.ip}:${PORT}/?t=${TOKEN}` }));
  console.log('\nEscanea con la cámara del teléfono (misma Wi-Fi que este PC):\n');
  console.log(await QR.toString(urls[0].url, { type: 'terminal', small: true }));
  urls.forEach((u, i) => console.log((i ? '   otra: ' : '   ') + u.url + '  (' + u.name + ')'));
  const cards = await Promise.all(urls.map(async u => `<figure><div>${await QR.toString(u.url, { type: 'svg', margin: 1, width: 280 })}</div><figcaption><b>${u.url}</b><br>${u.name}</figcaption></figure>`));
  const file = path.join(os.tmpdir(), 'tonea-qr.html');
  fs.writeFileSync(file, `<!doctype html><meta charset=utf-8><title>Tonea · QR</title><style>body{font:16px system-ui;background:#191829;color:#f4f1ff;display:flex;flex-direction:column;align-items:center;padding:24px}h1{margin:0 0 4px}div{background:#fff;padding:8px;border-radius:16px}figure{margin:16px;text-align:center}.g{display:flex;flex-wrap:wrap;justify-content:center}p{color:#a9a5c8;max-width:520px;text-align:center}</style><h1>Tonea en tu teléfono</h1><p>Escanea el primer código con la cámara. Si no abre, prueba los otros (cada uno es una red distinta del PC). El teléfono debe estar en la misma Wi-Fi.</p><div class=g style="background:none">${cards.join('')}</div>`);
  exec(`start "" "${file}"`);
  console.log('\nTambién se abrió una página con los códigos. Deja esta ventana abierta mientras pruebas (Ctrl+C para cerrar).');
});
