// Modo «Tonea del PC»: muestra el servidor de Tonea que corre en tu PC dentro de un WebView y recuerda su dirección.
import { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tonea.server', BG = '#191829', ACCENT = '#e08d79', INK = '#f4f1ff', MUTED = '#a9a5c8';
// Acepta "192.168.1.5", "192.168.1.5:3000" o el enlace completo del QR (con ?t=CLAVE).
const normalize = v => { let [b, q] = v.trim().split('?'); b = b.replace(/\/+$/, ''); if (!b) return ''; if (!/^https?:\/\//i.test(b)) b = 'http://' + b; if (!/:\d+$/.test(b)) b += ':3000'; return q ? b + '/?' + q : b; };

export default function PcWebView({ onBack }) {
  const [server, setServer] = useState(null), [draft, setDraft] = useState(''), [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false), [canBack, setCanBack] = useState(false);
  const web = useRef(null);

  useEffect(() => { AsyncStorage.getItem(KEY).then(v => { if (v) { setServer(v); setDraft(v); } setLoaded(true); }); }, []);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (canBack && web.current) { web.current.goBack(); return true; } onBack(); return true; });
    return () => sub.remove();
  }, [canBack]);

  const connect = useCallback(async () => {
    const url = normalize(draft); if (!url) return;
    await AsyncStorage.setItem(KEY, url); setFailed(false); setServer(url);
  }, [draft]);
  const change = () => { setServer(null); setFailed(false); };

  if (!loaded) return <View style={s.fill} />;

  if (!server || failed) {
    return (
      <SafeAreaView style={s.fill}>
        <StatusBar style="light" />
        <View style={s.box}>
          <Text style={s.logo} accessibilityRole="header">Tonea</Text>
          <Text style={s.p}>{failed ? 'No se pudo conectar con el servidor.' : 'Conecta con Tonea en tu PC.'}</Text>
          <Text style={s.small}>1. En el PC ejecuta: $env:HOST="0.0.0.0"; npm start{'\n'}2. Pega aquí el enlace que muestra el PC con npm run qr (incluye la clave ?t=…){'\n'}3. El teléfono y el PC deben estar en la misma Wi-Fi.</Text>
          <Text style={s.label} nativeID="lbl">Dirección del servidor</Text>
          <TextInput accessibilityLabelledBy="lbl" style={s.input} value={draft} onChangeText={setDraft} placeholder="192.168.1.182:3000/?t=clave" placeholderTextColor={MUTED}
            autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="go" onSubmitEditing={connect} />
          <Pressable accessibilityRole="button" onPress={onBack} style={s.back}><Text style={s.backT}>← Volver a Tonea</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={connect} style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}>
            <Text style={s.btnT}>Conectar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.fill}>
      <StatusBar style="light" />
      <Pressable accessibilityRole="button" onPress={onBack} style={s.bar}><Text style={s.backT}>← Volver a Tonea</Text></Pressable>
      <WebView
        ref={web} source={{ uri: server }} style={s.fill} containerStyle={{ backgroundColor: BG }}
        javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} allowsFullscreenVideo
        setSupportMultipleWindows={false} originWhitelist={['http://*', 'https://*']}
        onNavigationStateChange={n => setCanBack(n.canGoBack)}
        onError={() => setFailed(true)} onHttpError={e => { if (e.nativeEvent.statusCode >= 500) setFailed(true); }}
        startInLoadingState renderLoading={() => <View style={[s.fill, s.center]}><ActivityIndicator color={ACCENT} size="large" /></View>}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Cambiar servidor" onLongPress={change} delayLongPress={900} style={s.hidden} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: BG }, center: { alignItems: 'center', justifyContent: 'center' },
  box: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  logo: { color: INK, fontSize: 36, fontWeight: '700' }, p: { color: INK, fontSize: 18, fontWeight: '600' },
  small: { color: MUTED, fontSize: 15, lineHeight: 22 }, label: { color: INK, fontSize: 15, fontWeight: '600', marginTop: 6 },
  input: { minHeight: 52, borderRadius: 26, borderWidth: 1.5, borderColor: ACCENT, paddingHorizontal: 20, color: INK, fontSize: 17 },
  btn: { minHeight: 52, borderRadius: 26, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }, btnT: { color: '#2a1612', fontSize: 17, fontWeight: '700' },
  back: { minHeight: 48, alignItems: 'center', justifyContent: 'center' }, backT: { color: MUTED, fontSize: 15, fontWeight: '600' },
  bar: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  hidden: { position: "absolute", top: 48, left: 0, width: 110, height: 40 }
});
