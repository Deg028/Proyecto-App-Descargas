import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../theme';

export default function Settings({ settings, onSave, onOpenPc }) {
  const [key, setKey] = useState(settings.jamendoKey), [saved, setSaved] = useState(false);
  useEffect(() => { setKey(settings.jamendoKey); }, [settings.jamendoKey]);

  const save = async () => { await onSave({ ...settings, jamendoKey: key.trim() }); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <ScrollView style={s.fill} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <Text style={s.h1} accessibilityRole="header">Ajustes</Text>

      <Text style={s.h2} accessibilityRole="header">Clave de Jamendo</Text>
      <Text style={s.p}>Jamendo es un catálogo de música con licencia Creative Commons. Su búsqueda necesita un «client_id» gratuito:</Text>
      <Text style={s.p}>1. Crea una cuenta en devportal.jamendo.com.{'\n'}2. Crea una aplicación (uso no comercial).{'\n'}3. Copia el client_id y pégalo aquí.</Text>
      <Pressable onPress={() => Linking.openURL('https://devportal.jamendo.com/')} accessibilityRole="link" style={s.link}><Text style={s.linkT}>Abrir el portal de Jamendo</Text></Pressable>
      <TextInput style={s.input} value={key} onChangeText={setKey} placeholder="client_id de Jamendo" placeholderTextColor={C.muted}
        autoCapitalize="none" autoCorrect={false} accessibilityLabel="client_id de Jamendo" />
      <Pressable style={s.btn} onPress={save} accessibilityRole="button"><Text style={s.btnT}>{saved ? 'Guardada ✓' : 'Guardar clave'}</Text></Pressable>
      <Text style={s.note}>La clave se guarda solo en este teléfono.</Text>

      <Text style={[s.h2, { marginTop: 28 }]} accessibilityRole="header">Tonea del PC</Text>
      <Text style={s.p}>Usa Tonea de tu PC (misma Wi-Fi) para descargar de YouTube y otros sitios con yt-dlp. Lo que guardes se copia del PC a la Biblioteca de este teléfono. Uso personal.</Text>
      <Pressable style={s.ghost} onPress={onOpenPc} accessibilityRole="button"><Text style={s.ghostT}>Conectar con Tonea del PC</Text></Pressable>

      <Text style={[s.h2, { marginTop: 28 }]} accessibilityRole="header">Sobre el contenido</Text>
      <Text style={s.p}>Tonea solo ofrece archivos que su fuente declara con licencia Creative Commons o de dominio público. La licencia la indica quien subió el archivo y Tonea no puede verificarla: respeta siempre las condiciones de cada obra (crédito al autor, uso no comercial, sin derivadas). El crédito de cada descarga se guarda en la Biblioteca.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 20 }, h1: { color: C.ink, fontSize: 30, fontWeight: '800', marginTop: 12, marginBottom: 12 },
  h2: { color: C.ink, fontSize: 18, fontWeight: '700', marginBottom: 6 }, p: { color: C.muted, fontSize: 14.5, lineHeight: 22, marginBottom: 10 },
  note: { color: C.muted, fontSize: 12.5, marginTop: 8 },
  input: { minHeight: 52, borderRadius: 26, borderWidth: 1.5, borderColor: C.accent, paddingHorizontal: 20, color: C.ink, fontSize: 16, marginTop: 4 },
  btn: { minHeight: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, btnT: { color: C.accentInk, fontWeight: '800', fontSize: 16 },
  ghost: { minHeight: 52, borderRadius: 26, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }, ghostT: { color: C.ink, fontWeight: '700', fontSize: 15 },
  link: { minHeight: 44, justifyContent: 'center' }, linkT: { color: C.accent, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' }
});
