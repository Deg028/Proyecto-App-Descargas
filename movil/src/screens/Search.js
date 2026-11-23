import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { search, resolve } from '../../../shared/providers';
import { downloadFile } from '../downloader';
import { C, fmtDur, fmtSize } from '../theme';

const SOURCES = [
  { id: 'archive', kind: 'audio', label: 'Audio · Internet Archive' },
  { id: 'archive', kind: 'video', label: 'Video · Internet Archive' },
  { id: 'jamendo', kind: 'audio', label: 'Música · Jamendo' }
];

export default function Search({ settings, onDownloaded, onOpenSettings }) {
  const [src, setSrc] = useState(SOURCES[0]), [q, setQ] = useState('');
  const [items, setItems] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [busy, setBusy] = useState({}), [picker, setPicker] = useState(null), [msg, setMsg] = useState('');
  const needsKey = src.id === 'jamendo' && !settings.jamendoKey;

  async function run() {
    if (!q.trim() || needsKey) return;
    setLoading(true); setError(''); setMsg(''); setItems(null);
    try { setItems(await search(src.id, q, { kind: src.kind, clientId: settings.jamendoKey })); }
    catch (e) { setError(e.message || 'No se pudo buscar.'); }
    finally { setLoading(false); }
  }

  async function saveOne(item, file) {
    const key = item.source + item.id + file.name;
    setBusy(b => ({ ...b, [key]: true })); setError('');
    try { onDownloaded(await downloadFile(item, file)); setMsg('Guardado en la Biblioteca: ' + (file.title || item.title)); }
    catch (e) { setError('No se pudo descargar: ' + (e.message || 'error desconocido')); }
    finally { setBusy(b => ({ ...b, [key]: false })); }
  }

  async function start(item) {
    const key = item.source + item.id;
    setBusy(b => ({ ...b, [key]: true })); setError(''); setMsg('');
    try {
      const files = await resolve(item);
      if (files.length > 1) setPicker({ item, files }); else await saveOne(item, files[0]);
    } catch (e) { setError(e.message || 'No se pudo preparar la descarga.'); }
    finally { setBusy(b => ({ ...b, [key]: false })); }
  }

  const canDownload = it => it.source !== 'jamendo' || !!it.downloadUrl;

  return (
    <View style={s.fill}>
      <Text style={s.h1} accessibilityRole="header">Buscar</Text>
      <Text style={s.note}>Solo contenido con licencia Creative Commons o dominio público.</Text>

      <View style={s.chips}>
        {SOURCES.map(o => {
          const on = o.label === src.label;
          return (
            <Pressable key={o.label} onPress={() => { setSrc(o); setItems(null); setError(''); setMsg(''); }} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={[s.chip, on && s.chipOn]}><Text style={[s.chipT, on && s.chipTOn]}>{o.label}</Text></Pressable>
          );
        })}
      </View>

      <View style={s.row}>
        <TextInput style={s.input} value={q} onChangeText={setQ} placeholder="Busca música o video" placeholderTextColor={C.muted}
          returnKeyType="search" onSubmitEditing={run} autoCorrect={false} accessibilityLabel="Texto a buscar" />
        <Pressable style={s.go} onPress={run} accessibilityRole="button" accessibilityLabel="Buscar"><Text style={s.goT}>Buscar</Text></Pressable>
      </View>

      {needsKey && (
        <View style={s.box}>
          <Text style={s.p}>Para buscar en Jamendo necesitas una clave gratuita.</Text>
          <Pressable style={s.btn} onPress={onOpenSettings} accessibilityRole="button"><Text style={s.btnT}>Añadir clave en Ajustes</Text></Pressable>
        </View>
      )}
      {!!error && <Text style={s.err} accessibilityLiveRegion="polite">{error}</Text>}
      {!!msg && <Text style={s.ok} accessibilityLiveRegion="polite">{msg}</Text>}
      {loading && <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 24 }} />}

      <FlatList
        data={items || []} keyExtractor={it => it.source + it.id} contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={!loading && items ? <Text style={s.empty}>No encontramos resultados con licencia que permita descargarlos.</Text> : null}
        renderItem={({ item }) => {
          const working = !!busy[item.source + item.id];
          return (
            <View style={s.item}>
              {item.thumbnail ? <Image source={{ uri: item.thumbnail }} style={s.thumb} accessibilityIgnoresInvertColors /> : <View style={s.thumb} />}
              <View style={s.txt}>
                <Text style={s.t} numberOfLines={2}>{item.title}</Text>
                {!!item.artist && <Text style={s.m} numberOfLines={1}>{item.artist}</Text>}
                <Text style={s.m}>{[fmtDur(item.duration), item.license.label].filter(Boolean).join(' · ')}</Text>
                <Text style={s.m}>{[item.license.attribution ? 'Requiere crédito' : 'Sin crédito obligatorio', item.license.commercial ? '' : 'No comercial', item.license.derivatives ? '' : 'Sin derivadas'].filter(Boolean).join(' · ')}</Text>
              </View>
              {canDownload(item)
                ? <Pressable style={[s.dl, working && { opacity: 0.5 }]} disabled={working} onPress={() => start(item)} accessibilityRole="button" accessibilityLabel={'Descargar ' + item.title}>
                    {working ? <ActivityIndicator color={C.accentInk} /> : <Text style={s.dlT}>Bajar</Text>}
                  </Pressable>
                : <Text style={s.no}>No descargable</Text>}
            </View>
          );
        }}
      />

      <Modal visible={!!picker} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={s.sheetWrap}>
          <View style={s.sheet}>
            <Text style={s.h2} accessibilityRole="header">{picker && picker.item.title}</Text>
            <Text style={s.note}>Este elemento tiene {picker && picker.files.length} archivos. Elige cuáles guardar.</Text>
            <FlatList data={picker ? picker.files : []} keyExtractor={f => f.name} style={{ maxHeight: 360 }}
              renderItem={({ item: f }) => {
                const key = picker.item.source + picker.item.id + f.name;
                return (
                  <View style={s.track}>
                    <View style={s.txt}><Text style={s.t} numberOfLines={2}>{f.title}</Text><Text style={s.m}>{fmtSize(f.size)}</Text></View>
                    <Pressable style={[s.dl, busy[key] && { opacity: 0.5 }]} disabled={!!busy[key]} onPress={() => saveOne(picker.item, f)} accessibilityRole="button" accessibilityLabel={'Descargar ' + f.title}>
                      {busy[key] ? <ActivityIndicator color={C.accentInk} /> : <Text style={s.dlT}>Bajar</Text>}
                    </Pressable>
                  </View>
                );
              }} />
            <Pressable style={s.btn} onPress={() => setPicker(null)} accessibilityRole="button"><Text style={s.btnT}>Cerrar</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 20 },
  h1: { color: C.ink, fontSize: 30, fontWeight: '800', marginTop: 12 }, h2: { color: C.ink, fontSize: 20, fontWeight: '700' },
  note: { color: C.muted, fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent }, chipT: { color: C.ink, fontSize: 14, fontWeight: '600' }, chipTOn: { color: C.accentInk },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 52, borderRadius: 26, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, paddingHorizontal: 20, color: C.ink, fontSize: 16 },
  go: { minHeight: 52, minWidth: 84, borderRadius: 26, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, goT: { color: C.accentInk, fontWeight: '700', fontSize: 16 },
  box: { backgroundColor: C.surface, borderRadius: 18, padding: 16, gap: 12, marginTop: 16 }, p: { color: C.ink, fontSize: 15, lineHeight: 22 },
  btn: { minHeight: 48, borderRadius: 24, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 8 }, btnT: { color: C.ink, fontWeight: '700', fontSize: 15 },
  err: { color: C.danger, marginTop: 12, fontSize: 14, lineHeight: 20 }, ok: { color: C.success, marginTop: 12, fontSize: 14, lineHeight: 20 },
  empty: { color: C.muted, textAlign: 'center', marginTop: 32, fontSize: 15, lineHeight: 22 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: C.surface2 }, txt: { flex: 1, gap: 2 },
  t: { color: C.ink, fontSize: 15, fontWeight: '700' }, m: { color: C.muted, fontSize: 12.5 },
  dl: { minHeight: 48, minWidth: 64, borderRadius: 24, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }, dlT: { color: C.accentInk, fontWeight: '800', fontSize: 14 },
  no: { color: C.muted, fontSize: 12, maxWidth: 70, textAlign: 'center' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,7,18,.66)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 8 },
  track: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }
});
