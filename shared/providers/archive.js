// Internet Archive: audio y video de dominio público o con licencia Creative Commons. No necesita clave.
// OJO: la licencia la declara quien subió el archivo; Tonea la muestra tal cual y solo ofrece lo que tenga una licencia reconocida.
const { parseLicense } = require('./license');

const HOST = 'https://archive.org';
const AUDIO_FORMATS = ['VBR MP3', 'MP3', '128Kbps MP3', '64Kbps MP3'];       // por orden de preferencia
const VIDEO_FORMATS = ['h.264', 'MPEG4', '512Kb MPEG4'];

async function getJson(url, fetchImpl) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error('Internet Archive respondió ' + res.status);
  return res.json();
}

// kind: 'audio' | 'video'
async function search(query, { kind = 'audio', limit = 20, page = 1, fetchImpl = fetch } = {}) {
  const q = String(query || '').trim().replace(/[()"]/g, ' ');
  if (!q) return [];
  const params = new URLSearchParams();
  params.set('q', `${q} AND mediatype:(${kind === 'video' ? 'movies' : 'audio'}) AND licenseurl:(*creativecommons.org*)`);
  for (const f of ['identifier', 'title', 'creator', 'licenseurl', 'runtime']) params.append('fl[]', f);
  params.set('sort[]', 'downloads desc');
  params.set('rows', String(limit)); params.set('page', String(page)); params.set('output', 'json');
  const data = await getJson(`${HOST}/advancedsearch.php?${params}`, fetchImpl);
  return ((data.response && data.response.docs) || []).map(d => ({
    source: 'archive', id: d.identifier, kind,
    title: Array.isArray(d.title) ? d.title[0] : d.title || d.identifier,
    artist: Array.isArray(d.creator) ? d.creator.join(', ') : d.creator || '',
    duration: parseRuntime(d.runtime),
    thumbnail: `${HOST}/services/img/${encodeURIComponent(d.identifier)}`,
    pageUrl: `${HOST}/details/${encodeURIComponent(d.identifier)}`,
    license: parseLicense(d.licenseurl)
  })).filter(i => i.license.known);
}

function parseRuntime(r) {
  if (!r) return 0;
  const s = String(Array.isArray(r) ? r[0] : r);
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
  return s.split(':').reverse().reduce((t, v, i) => t + (Number(v) || 0) * 60 ** i, 0);
}

// Devuelve los archivos descargables del elemento: [{ name, title, url, size, ext }]
async function resolve(item, { fetchImpl = fetch } = {}) {
  const meta = await getJson(`${HOST}/metadata/${encodeURIComponent(item.id)}`, fetchImpl);
  const license = parseLicense(meta.metadata && meta.metadata.licenseurl);
  if (!license.known) throw new Error('Este elemento no declara una licencia que permita descargarlo.');
  const wanted = item.kind === 'video' ? VIDEO_FORMATS : AUDIO_FORMATS;
  const files = (meta.files || []).filter(f => f.source !== 'metadata');
  const format = wanted.find(w => files.some(f => f.format === w));
  if (!format) throw new Error('No hay un archivo de ' + (item.kind === 'video' ? 'video' : 'audio') + ' descargable.');
  return files.filter(f => f.format === format).map(f => ({
    name: f.name, title: f.title || f.name.replace(/\.[^.]+$/, ''),
    url: `${HOST}/download/${encodeURIComponent(item.id)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
    size: Number(f.size) || 0, ext: (f.name.split('.').pop() || '').toLowerCase()
  }));
}

module.exports = { search, resolve, parseRuntime };
