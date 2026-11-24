// npm test           -> pruebas sin red (respuestas simuladas)
// TONEA_LIVE=1 npm test -> además consulta Internet Archive de verdad
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLicense, credit, search, resolve } = require('./index');
const { parseRuntime } = require('./archive');

const fakeFetch = body => async () => ({ ok: true, status: 200, json: async () => body });

test('parseLicense reconoce las licencias CC y el dominio público', () => {
  assert.deepEqual(
    (({ code, attribution, commercial, derivatives }) => ({ code, attribution, commercial, derivatives }))(parseLicense('https://creativecommons.org/licenses/by-nc-nd/4.0/')),
    { code: 'by-nc-nd', attribution: true, commercial: false, derivatives: false });
  assert.equal(parseLicense('http://creativecommons.org/licenses/by/3.0/').commercial, true);
  assert.equal(parseLicense('https://creativecommons.org/publicdomain/zero/1.0/').code, 'cc0');
  assert.equal(parseLicense('http://creativecommons.org/licenses/publicdomain/').code, 'pd');
  assert.equal(parseLicense('https://creativecommons.org/licenses/by-sa/4.0/').label, 'CC BY-SA 4.0');
});

test('parseLicense no da por buena una licencia desconocida o vacía', () => {
  for (const u of ['', undefined, 'https://example.com/todos-los-derechos', 'All rights reserved']) assert.equal(parseLicense(u).known, false);
});

test('credit incluye título, autor, licencia y enlace', () => {
  const c = credit({ title: 'Canción', artist: 'Ana', pageUrl: 'https://x.test/1', license: parseLicense('https://creativecommons.org/licenses/by/4.0/') });
  assert.match(c, /Canción/); assert.match(c, /Ana/); assert.match(c, /CC BY 4\.0/); assert.match(c, /x\.test/);
});

test('parseRuntime acepta segundos y hh:mm:ss', () => {
  assert.equal(parseRuntime('215.4'), 215); assert.equal(parseRuntime('3:35'), 215); assert.equal(parseRuntime('1:00:05'), 3605); assert.equal(parseRuntime(undefined), 0);
});

test('archive.search descarta resultados sin licencia reconocida', async () => {
  const items = await search('archive', 'jazz', { fetchImpl: fakeFetch({ response: { docs: [
    { identifier: 'a', title: 'Uno', creator: 'Ana', licenseurl: 'https://creativecommons.org/licenses/by/4.0/', runtime: '3:00' },
    { identifier: 'b', title: 'Dos', licenseurl: 'https://example.com/privada' },
    { identifier: 'c', title: ['Tres'], creator: ['X', 'Y'], licenseurl: 'http://creativecommons.org/publicdomain/zero/1.0/' }
  ] } }) });
  assert.deepEqual(items.map(i => i.id), ['a', 'c']);
  assert.equal(items[0].duration, 180); assert.equal(items[1].title, 'Tres'); assert.equal(items[1].artist, 'X, Y');
});

test('archive.resolve prefiere el mejor MP3 y rechaza elementos sin licencia', async () => {
  const meta = { metadata: { licenseurl: 'https://creativecommons.org/licenses/by/4.0/' }, files: [
    { name: 'pista 1.mp3', format: 'VBR MP3', size: '1000', title: 'Pista 1' },
    { name: 'pista 1_64kb.mp3', format: '64Kbps MP3', size: '100' },
    { name: 'foto.jpg', format: 'JPEG' }
  ] };
  const files = await resolve({ source: 'archive', id: 'abc', kind: 'audio' }, { fetchImpl: fakeFetch(meta) });
  assert.equal(files.length, 1); assert.equal(files[0].ext, 'mp3');
  assert.equal(files[0].url, 'https://archive.org/download/abc/pista%201.mp3');
  await assert.rejects(resolve({ source: 'archive', id: 'abc', kind: 'audio' }, { fetchImpl: fakeFetch({ metadata: {}, files: meta.files }) }), /licencia/);
});

test('jamendo.search exige clave y solo ofrece descarga si el artista la permite', async () => {
  await assert.rejects(search('jamendo', 'rock', {}), /clave/);
  const body = { headers: { status: 'success' }, results: [
    { id: 1, name: 'Permitida', artist_name: 'Ana', duration: 200, audio: 'https://s/1', audiodownload: 'https://d/1', audiodownload_allowed: true, license_ccurl: 'https://creativecommons.org/licenses/by-nc/3.0/' },
    { id: 2, name: 'Bloqueada', artist_name: 'Beto', audio: 'https://s/2', audiodownload: 'https://d/2', audiodownload_allowed: false, license_ccurl: 'https://creativecommons.org/licenses/by/3.0/' },
    { id: 3, name: 'SinLicencia', license_ccurl: '' }
  ] };
  const items = await search('jamendo', 'rock', { clientId: 'k', fetchImpl: fakeFetch(body) });
  assert.deepEqual(items.map(i => i.id), ['1', '2']);
  assert.equal(items[0].downloadUrl, 'https://d/1'); assert.equal(items[1].downloadUrl, '');
  await assert.rejects(resolve(items[1]), /no permite/);
  assert.equal((await resolve(items[0]))[0].url, 'https://d/1');
});

test('jamendo.search reintenta cuando la API responde vacío de forma intermitente', async () => {
  const full = { headers: { status: 'success' }, results: [{ id: 9, name: 'Pista', artist_name: 'Ana', audiodownload: 'https://d/9', audiodownload_allowed: true, license_ccurl: 'https://creativecommons.org/licenses/by/3.0/' }] };
  let calls = 0;
  const flaky = async () => ({ ok: true, status: 200, json: async () => (++calls < 3 ? { headers: { status: 'success' }, results: [] } : full) });
  const items = await search('jamendo', 'piano', { clientId: 'k', fetchImpl: flaky, retryDelayMs: 0 });
  assert.equal(items.length, 1); assert.equal(calls, 3);

  let empties = 0;
  const alwaysEmpty = async () => { empties++; return { ok: true, status: 200, json: async () => ({ headers: { status: 'success' }, results: [] }) }; };
  assert.deepEqual(await search('jamendo', 'zzzz', { clientId: 'k', fetchImpl: alwaysEmpty, retryDelayMs: 0 }), []);
  assert.equal(empties, 3);
});

test('fuente desconocida falla con un mensaje claro', () => assert.throws(() => search('youtube', 'x'), /desconocida/));

test('EN VIVO: Internet Archive devuelve audio con licencia y se puede resolver', { skip: !process.env.TONEA_LIVE }, async () => {
  const items = await search('archive', 'jazz', { kind: 'audio', limit: 5 });
  assert.ok(items.length > 0, 'sin resultados');
  assert.ok(items.every(i => i.license.known));
  let ok = 0;
  for (const it of items) { try { const f = await resolve(it); if (f.length && f[0].url.startsWith('https://archive.org/download/')) ok++; } catch { /* sin MP3 */ } }
  assert.ok(ok > 0, 'ningún resultado se pudo resolver a un MP3');
});
