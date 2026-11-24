// Jamendo: música con licencia Creative Commons. Necesita un client_id gratuito (devportal.jamendo.com).
// Solo se ofrecen las pistas que el artista permite descargar (audiodownload_allowed).
const { parseLicense } = require('./license');

const API = 'https://api.jamendo.com/v3.0';

// La API de Jamendo a veces responde sin resultados aunque los haya (con la misma petición alterna 0 y N resultados),
// así que una respuesta vacía se reintenta unas veces antes de darla por buena.
const ATTEMPTS = 3;
const wait = ms => new Promise(r => setTimeout(r, ms));

async function search(query, { clientId, limit = 20, page = 1, fetchImpl = fetch, retryDelayMs = 700 } = {}) {
  if (!clientId) throw new Error('Falta la clave de Jamendo (JAMENDO_CLIENT_ID).');
  const q = String(query || '').trim();
  if (!q) return [];
  const params = new URLSearchParams({
    client_id: clientId, format: 'json', limit: String(limit), offset: String((page - 1) * limit),
    search: q, audiodlformat: 'mp32', include: 'licenses', order: 'popularity_total'
  });
  let data;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const res = await fetchImpl(`${API}/tracks/?${params}`);
    if (!res.ok) throw new Error('Jamendo respondió ' + res.status);
    data = await res.json();
    if (data.headers && data.headers.status === 'failed') throw new Error(data.headers.error_message || 'Jamendo rechazó la consulta.');
    if ((data.results || []).length || attempt === ATTEMPTS) break;
    await wait(retryDelayMs);
  }
  return (data.results || []).map(t => ({
    source: 'jamendo', id: String(t.id), kind: 'audio',
    title: t.name, artist: t.artist_name || '', album: t.album_name || '',
    duration: Number(t.duration) || 0, thumbnail: t.image || t.album_image || '',
    pageUrl: t.shareurl || '',
    streamUrl: t.audio || '',                                   // vista previa
    downloadUrl: t.audiodownload_allowed ? t.audiodownload : '', // vacío si el artista no permite descargar
    license: parseLicense(t.license_ccurl)
  })).filter(i => i.license.known);
}

// Jamendo ya entrega un MP3 directo: no hay nada que resolver.
async function resolve(item) {
  if (!item.downloadUrl) throw new Error('El artista no permite descargar esta pista.');
  return [{ name: `${item.artist} - ${item.title}.mp3`, title: item.title, url: item.downloadUrl, size: 0, ext: 'mp3' }];
}

module.exports = { search, resolve };
