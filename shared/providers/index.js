// Fuentes de contenido con licencia. Mismo formato de resultado para PC y móvil.
//   const { search, resolve } = require('./shared/providers');
//   const items = await search('archive', 'jazz', { kind: 'audio' });
//   const files = await resolve(items[0]);
const archive = require('./archive');
const jamendo = require('./jamendo');
const { parseLicense, credit } = require('./license');

const SOURCES = {
  jamendo: { label: 'Jamendo', kinds: ['audio'], needsKey: true, mod: jamendo },
  archive: { label: 'Internet Archive', kinds: ['audio', 'video'], needsKey: false, mod: archive }
};

const sources = () => Object.entries(SOURCES).map(([id, s]) => ({ id, label: s.label, kinds: s.kinds, needsKey: s.needsKey }));

function pick(source) {
  const s = SOURCES[source];
  if (!s) throw new Error('Fuente desconocida: ' + source);
  return s.mod;
}

const search = (source, query, opts) => pick(source).search(query, opts);
const resolve = (item, opts) => pick(item.source).resolve(item, opts);

module.exports = { sources, search, resolve, parseLicense, credit };
