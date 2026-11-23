import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, fmtDur, fmtSize } from '../theme';

export default function Library({ library, onPlay, onDelete }) {
  const confirmDelete = e => Alert.alert('Eliminar', '¿Eliminar «' + e.title + '» del teléfono?', [
    { text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(e) }
  ]);
  const showCredit = e => Alert.alert('Crédito y licencia', e.credit + (e.attribution ? '\n\nEsta licencia exige dar crédito al autor si compartes o reutilizas la obra.' : '') + (e.commercial ? '' : '\n\nNo se permite el uso comercial.'));

  return (
    <View style={s.fill}>
      <Text style={s.h1} accessibilityRole="header">Biblioteca</Text>
      <Text style={s.note}>{library.length ? library.length + (library.length === 1 ? ' archivo' : ' archivos') + ' en este teléfono' : ''}</Text>
      <FlatList
        data={library} keyExtractor={e => e.id} contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={s.empty}>Aún no has descargado nada. Busca música o video con licencia en la pestaña Buscar.</Text>}
        renderItem={({ item: e }) => (
          <View style={s.item}>
            <View style={s.txt}>
              <Text style={s.t} numberOfLines={2}>{e.title}</Text>
              <Text style={s.m} numberOfLines={1}>{[e.artist, e.kind === 'video' ? 'Video' : 'Audio', fmtDur(e.duration), fmtSize(e.size)].filter(Boolean).join(' · ')}</Text>
              <Text style={s.m}>{e.license}</Text>
            </View>
            <View style={s.actions}>
              <Pressable style={s.play} onPress={() => onPlay(e)} accessibilityRole="button" accessibilityLabel={'Reproducir ' + e.title}><Text style={s.playT}>Reproducir</Text></Pressable>
              <View style={s.small}>
                <Pressable style={s.ghost} onPress={() => showCredit(e)} accessibilityRole="button" accessibilityLabel="Ver crédito y licencia"><Text style={s.ghostT}>Crédito</Text></Pressable>
                <Pressable style={s.ghost} onPress={() => confirmDelete(e)} accessibilityRole="button" accessibilityLabel={'Eliminar ' + e.title}><Text style={[s.ghostT, { color: C.danger }]}>Eliminar</Text></Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 20 },
  h1: { color: C.ink, fontSize: 30, fontWeight: '800', marginTop: 12 }, note: { color: C.muted, fontSize: 14, marginTop: 4, marginBottom: 8 },
  empty: { color: C.muted, textAlign: 'center', marginTop: 40, fontSize: 15, lineHeight: 22 },
  item: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 }, txt: { gap: 2 },
  t: { color: C.ink, fontSize: 16, fontWeight: '700' }, m: { color: C.muted, fontSize: 13 },
  actions: { gap: 8 }, small: { flexDirection: 'row', gap: 8 },
  play: { minHeight: 48, borderRadius: 24, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }, playT: { color: C.accentInk, fontWeight: '800', fontSize: 15 },
  ghost: { flex: 1, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }, ghostT: { color: C.ink, fontWeight: '600', fontSize: 14 }
});
