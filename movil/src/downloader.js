import { Directory, File, Paths } from 'expo-file-system';
import { credit } from '../../shared/providers';

const safe = s => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'archivo';

function libraryDir() {
  const dir = new Directory(Paths.document, 'tonea');
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

// Descarga un archivo de un resultado de búsqueda y guarda, junto a él, un .txt con el crédito y la licencia.
// Devuelve la ficha para la biblioteca.
export async function downloadFile(item, file) {
  const dir = libraryDir();
  const name = safe((item.artist ? item.artist + ' - ' : '') + (file.title || item.title)) + '.' + (file.ext || 'mp3');
  const dest = new File(dir, name);
  await File.downloadFileAsync(file.url, dest, { idempotent: true });

  const text = credit(item);
  try {
    const note = new File(dir, name + '.txt');
    if (!note.exists) note.create();
    await note.write(text);
  } catch { /* el crédito también queda en la ficha de la biblioteca */ }

  return {
    id: `${item.source}:${item.id}:${file.name}`, name, uri: dest.uri, size: dest.size || file.size || 0,
    title: file.title || item.title, artist: item.artist || '', kind: item.kind, source: item.source,
    license: item.license.label, licenseUrl: item.license.url, attribution: item.license.attribution, commercial: item.license.commercial,
    credit: text, pageUrl: item.pageUrl, thumbnail: item.thumbnail || '', duration: item.duration || 0, added: Date.now()
  };
}

// Copia al teléfono un archivo descargado por Tonea del PC (url = /files/NOMBRE?dl=1&t=CLAVE). Uso personal: no hay licencia que mostrar.
const AUDIO_EXT = ['mp3', 'm4a', 'opus', 'wav', 'ogg', 'aac', 'flac'];
export async function downloadFromPc(url, fileName) {
  const dir = libraryDir();
  const ext = (fileName.split('.').pop() || 'mp4').toLowerCase();
  const name = safe(fileName.replace(/\.[^.]+$/, '')) + '.' + ext;
  const dest = new File(dir, name);
  await File.downloadFileAsync(url, dest, { idempotent: true });
  return {
    id: 'pc:' + name, name, uri: dest.uri, size: dest.size || 0,
    title: fileName.replace(/\.[^.]+$/, '').replace(/\s\[[\w-]{6,}\]/, ''), artist: '', kind: AUDIO_EXT.includes(ext) ? 'audio' : 'video', source: 'pc',
    license: 'Descargado con Tonea del PC', licenseUrl: '', attribution: false, commercial: true,
    credit: 'Archivo descargado con Tonea en tu PC, para uso personal.', pageUrl: '', thumbnail: '', duration: 0, added: Date.now()
  };
}

export function deleteEntry(entry) {
  for (const uri of [entry.uri, entry.uri + '.txt']) { try { const f = new File(uri); if (f.exists) f.delete(); } catch { /* ya no existe */ } }
}
